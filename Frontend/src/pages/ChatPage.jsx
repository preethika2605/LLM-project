import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MessageInput from "../components/MessageInput";
import { sendMessageToBackend, sendMessageToBackendStream } from "../services/api";

const buildFileDownloadHref = (file) => {
  if (!file || typeof file.data !== "string" || !file.data) {
    return null;
  }

  if (file.data.startsWith("data:")) {
    return file.data;
  }

  const mimeType = file.type || "application/octet-stream";
  return `data:${mimeType};base64,${file.data}`;
};

const estimateSizeFromDataUrl = (data) => {
  if (!data || typeof data !== "string") {
    return null;
  }

  const base64 = data.includes(",") ? data.split(",")[1] : data;
  if (!base64) {
    return null;
  }

  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
};

const formatFileSize = (sizeInBytes) => {
  if (!Number.isFinite(sizeInBytes) || sizeInBytes <= 0) {
    return "";
  }

  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }
  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }
  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
};

const normalizeFileAttachment = (item) => {
  if (item?.file && typeof item.file === "object" && item.file.data) {
    return {
      name: item.file.name || "Attachment",
      data: item.file.data,
      type: item.file.type || "",
      size: item.file.size ?? estimateSizeFromDataUrl(item.file.data)
    };
  }

  if (item?.fileData) {
    return {
      name: item.fileName || "Attachment",
      data: item.fileData,
      type: item.fileType || "",
      size: item.fileSize ?? estimateSizeFromDataUrl(item.fileData)
    };
  }

  return null;
};

const sanitizeFileName = (value) => {
  if (!value || typeof value !== "string") {
    return "chatgpt-document";
  }

  const cleaned = value
    .replace(/^#+\s*/, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .slice(0, 60)
    .replace(/^-|-$/g, "");

  return cleaned || "chatgpt-document";
};

const DOCUMENT_DOWNLOAD_PATTERNS = [
  /\bresearch\s+paper\b/i,
  /\bsurvey\s+paper\b/i,
  /\bliterature\s+review\b/i,
  /\bthesis\b/i,
  /\bwhite\s*paper\b/i,
  /\b(project\s+)?report\b/i,
  /\bproposal\b/i,
  /\bdocument\b/i,
  /\b(reference|references|citation|citations)\b.*\bpaper\b/i,
  /\bpaper\b.*\b(reference|references|citation|citations)\b/i,
  /\breferences?\b.*\bproject\b/i,
  /\bproject\b.*\breferences?\b/i,
  /\b(write|generate|create|draft|prepare)\b.*\b(paper|document|report|proposal)\b/i,
  /\b(paper|document|report|proposal)\b.*\b(write|generate|create|draft|prepare)\b/i
];

const shouldEnableDocumentDownload = (prompt) => {
  if (!prompt || typeof prompt !== "string") {
    return false;
  }
  return DOCUMENT_DOWNLOAD_PATTERNS.some((pattern) => pattern.test(prompt));
};

const findPairedUserPrompt = (messages, botIndex) => {
  for (let cursor = botIndex - 1; cursor >= 0; cursor -= 1) {
    if (messages[cursor]?.sender === "user") {
      return messages[cursor]?.text || "";
    }
  }
  return "";
};

const ChatPage = ({
  selectedModel,
  currentChatId,
  chatHistories = [],
  currentUser,
  onChatIdUpdate,
  onMessageSent,
  onSessionExpired
}) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [downloadedIndex, setDownloadedIndex] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const messagesEndRef = useRef(null);

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownload = (text, index) => {
    const normalizedText = typeof text === "string" ? text.trim() : "";
    if (!normalizedText) {
      return;
    }

    const firstMeaningfulLine = normalizedText.split("\n").find((line) => line.trim()) || "document";
    const baseFileName = sanitizeFileName(firstMeaningfulLine);
    const fileName = `${baseFileName}.md`;
    const blob = new Blob([normalizedText], { type: "text/markdown;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);

    const downloadLink = document.createElement("a");
    downloadLink.href = objectUrl;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(objectUrl);

    setDownloadedIndex(index);
    setTimeout(() => setDownloadedIndex(null), 2000);
  };

  const updateLastBotMessage = (text) => {
    setMessages((prev) => {
      if (!prev.length) return prev;
      const updated = [...prev];
      const lastIndex = updated.length - 1;
      if (updated[lastIndex]?.sender === "bot") {
        updated[lastIndex] = { ...updated[lastIndex], text };
      } else {
        updated.push({ sender: "bot", text, timestamp: new Date().toISOString() });
      }
      return updated;
    });
  };

  const buildSimpleKeyword = (text) => {
    if (!text) return "New Chat";

    const normalized = text
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized) return "New Chat";

    const lower = normalized.toLowerCase();
    if (lower.includes("analyze this image")) {
      return "Image Analysis";
    }

    const stopWords = new Set([
      "the", "a", "an", "and", "or", "to", "for", "of", "in", "on", "at",
      "is", "are", "was", "were", "be", "this", "that", "it", "with",
      "about", "please", "can", "you", "me", "my", "i"
    ]);

    const words = normalized.split(" ");
    const meaningfulWords = words.filter(
      (word) => word.length > 2 && !stopWords.has(word.toLowerCase())
    );
    const selectedWords = (meaningfulWords.length ? meaningfulWords : words).slice(0, 4);

    return selectedWords
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  useEffect(() => {
    if (currentChatId === null || !currentChatId) {
      setMessages([]);
      setKeyword("");
      return;
    }

    const selectedChat = chatHistories.find((chat) => chat.id === currentChatId);
    if (selectedChat && selectedChat.messages) {
      const displayMessages = selectedChat.messages
        .flatMap((item) => [
          {
            sender: "user",
            text: item.userMessage || "",
            timestamp: item.timestamp,
            image: item.imageData || item.image || null,
            file: normalizeFileAttachment(item)
          },
          { sender: "bot", text: item.aiResponse || "", timestamp: item.timestamp }
        ])
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      setMessages(displayMessages);
      setKeyword(selectedChat.keyword || selectedChat.title || "");
    } else {
      setMessages([]);
    }
  }, [currentChatId, chatHistories]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setPreviewImage(null);
      }
    };

    if (previewImage) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewImage]);

  const handleSendMessage = async (msg) => {
    setIsLoading(true);

    let messageText = msg.text || "";
    if (msg.image && !messageText.trim()) {
      messageText = "Analyze this image and describe what you see in detail.";
    }
    if (msg.file && !messageText.trim()) {
      messageText = `Analyze this file and provide key information: ${msg.file.name || "Attachment"}.`;
    }

    const userMessage = {
      ...msg,
      text: messageText,
      timestamp: new Date().toISOString(),
      image: msg.image || null,
      file: msg.file || null
    };

    const thinkingMessage = {
      sender: "bot",
      text: "Thinking...",
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);

    try {
      let messageKeyword = keyword && keyword !== "New Chat" ? keyword : buildSimpleKeyword(messageText);
      if (!currentChatId || currentChatId.startsWith("temp-")) {
        messageKeyword = buildSimpleKeyword(messageText || "Document Analysis");
        setKeyword(messageKeyword);
      }

      const backendConversationId =
        currentChatId && !currentChatId.startsWith("temp-") ? currentChatId : null;

      if (!currentUser?.id) {
        throw new Error("User ID is missing");
      }

      let streamedResponse = "";
      let resolvedConversationId = backendConversationId || currentChatId || `temp-${Date.now()}`;

      try {
        const streamResult = await sendMessageToBackendStream(
          messageText,
          selectedModel,
          currentUser.id,
          backendConversationId,
          messageKeyword,
          msg.image || null,
          msg.file?.data || null,
          msg.file?.name || null,
          msg.file?.type || null,
          msg.file?.size ?? null,
          (_token, fullText) => {
            streamedResponse = fullText;
            updateLastBotMessage(fullText);
          }
        );
        streamedResponse = streamResult.response;
        resolvedConversationId = streamResult.conversationId || resolvedConversationId;
      } catch (streamErr) {
        console.warn("Streaming failed, falling back to non-streaming:", streamErr?.message);
        const data = await sendMessageToBackend(
          messageText,
          selectedModel,
          currentUser.id,
          backendConversationId,
          messageKeyword,
          msg.image || null,
          msg.file?.data || null,
          msg.file?.name || null,
          msg.file?.type || null,
          msg.file?.size ?? null
        );

        if (data.error) {
          console.error("Backend error:", data.error);
          setMessages((prev) => prev.slice(0, -1).concat({
            sender: "bot",
            text: `Error: ${data.error}`,
            timestamp: new Date().toISOString()
          }));
          setIsLoading(false);
          return;
        }

        if (!data.response) {
          console.error("No response from backend:", data);
          setMessages((prev) => prev.slice(0, -1).concat({
            sender: "bot",
            text: "Error: No response from backend. Check browser console and backend logs.",
            timestamp: new Date().toISOString()
          }));
          setIsLoading(false);
          return;
        }

        streamedResponse = data.response;
        resolvedConversationId =
          data.conversationId ||
          resolvedConversationId;

        setMessages((prev) => prev.slice(0, -1).concat({
          sender: "bot",
          text: data.response,
          timestamp: new Date().toISOString()
        }));
      }

      if (resolvedConversationId !== currentChatId) {
        onChatIdUpdate(resolvedConversationId);
      }

      onMessageSent(
        resolvedConversationId,
        messageText,
        streamedResponse,
        new Date().toISOString(),
        msg.image || null,
        msg.file || null,
        messageKeyword
      );
    } catch (err) {
      if (err?.message?.includes("Session expired")) {
        onSessionExpired?.();
        setIsLoading(false);
        return;
      }

      setMessages((prev) => prev.slice(0, -1).concat({
        sender: "bot",
        text: `Error: ${err.message}`,
        timestamp: new Date().toISOString()
      }));
    }

    setIsLoading(false);
  };

  return (
    <div className="chat-page">
      <div className="chat-messages">
        {messages.map((msg, index) => {
          const fileHref = buildFileDownloadHref(msg.file);
          const fileName = msg.file?.name || "Attachment";
          const fileSizeText = formatFileSize(msg.file?.size);
          const pairedUserPrompt = msg.sender === "bot" ? findPairedUserPrompt(messages, index) : "";
          const showDownloadButton =
            msg.sender === "bot" &&
            msg.text !== "Thinking..." &&
            shouldEnableDocumentDownload(pairedUserPrompt);

          return (
            <div
              key={index}
              className={`message ${msg.sender === "user" ? "user" : "bot"}`}
            >
              <div className="message-content">
                {msg.sender === "bot" ? (
                  <>
                    <div className="markdown-body">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ node, ...props }) => (
                            <a {...props} target="_blank" rel="noopener noreferrer" />
                          )
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                    <div className="message-actions">
                      <button
                        className="copy-button"
                        onClick={() => handleCopy(msg.text, index)}
                        title="Copy message"
                      >
                        {copiedIndex === index ? "Copied" : "Copy"}
                      </button>
                      {showDownloadButton && (
                        <button
                          className="copy-button download-button"
                          onClick={() => handleDownload(msg.text, index)}
                          title="Download document"
                        >
                          {downloadedIndex === index ? "Downloaded" : "Download"}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {msg.image && (
                      <div className="message-image">
                        <button
                          type="button"
                          className="message-image-button"
                          onClick={() => setPreviewImage(msg.image)}
                          title="Open image"
                        >
                          <img src={msg.image} alt="User shared" className="clickable-message-image" />
                        </button>
                      </div>
                    )}

                    {msg.file && (
                      <div className="message-file">
                        {fileHref ? (
                          <a
                            className="file-badge file-link"
                            href={fileHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={fileName}
                          >
                            <span className="file-label">{fileName}</span>
                            {fileSizeText && <span className="file-size">{fileSizeText}</span>}
                          </a>
                        ) : (
                          <span className="file-badge">
                            <span className="file-label">{fileName}</span>
                            {fileSizeText && <span className="file-size">{fileSizeText}</span>}
                          </span>
                        )}
                      </div>
                    )}

                    {msg.text}
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {previewImage && (
        <div
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            className="image-lightbox-close"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewImage(null);
            }}
            aria-label="Close image preview"
            title="Close"
          >
            X
          </button>
          <img
            src={previewImage}
            alt="Expanded view"
            className="image-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <MessageInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        selectedModel={selectedModel}
      />
    </div>
  );
};

export default ChatPage;
