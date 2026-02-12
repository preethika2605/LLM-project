import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MessageInput from "../components/MessageInput";
import { sendMessageToBackend } from "../services/api";

const ChatPage = ({ selectedModel, currentChatId, chatHistories = [], onChatIdUpdate, onMessageSent }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (currentChatId === null || !currentChatId) {
      setMessages([]);
      setKeyword("");
      return;
    }

    // Find the chat in chatHistories
    const selectedChat = chatHistories.find(chat => chat.id === currentChatId);
    if (selectedChat && selectedChat.messages) {
      // Convert all messages from the chat to display format
      const displayMessages = selectedChat.messages.flatMap(item => [
        { sender: "user", text: item.userMessage, timestamp: item.timestamp },
        { sender: "bot", text: item.aiResponse, timestamp: item.timestamp }
      ]).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setMessages(displayMessages);
      setKeyword(selectedChat.keyword || selectedChat.title || "");
    } else {
      setMessages([]);
    }
  }, [currentChatId, chatHistories]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (msg) => {
    setIsLoading(true);
    const userMessage = { ...msg, timestamp: new Date().toISOString() };
    const thinkingMessage = { sender: "bot", text: "Thinking...", timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage, thinkingMessage]);
    try {
      // For new chats, use the message as keyword
      let messageKeyword = keyword;
      if (!currentChatId || currentChatId.startsWith('temp-')) {
        messageKeyword = msg.text;
        setKeyword(msg.text);
      }
      const backendConversationId =
        currentChatId && !currentChatId.startsWith('temp-') ? currentChatId : null;

      const data = await sendMessageToBackend(
        msg.text,
        selectedModel,
        backendConversationId,
        messageKeyword
      );

      const resolvedConversationId =
        data.conversationId ||
        backendConversationId ||
        currentChatId ||
        `temp-${Date.now()}`;

      setMessages(prev => prev.slice(0, -1).concat({ sender: "bot", text: data.response, timestamp: new Date().toISOString() }));

      if (resolvedConversationId !== currentChatId) {
        onChatIdUpdate(resolvedConversationId);
      }

      // Update parent chat histories
      onMessageSent(resolvedConversationId, msg.text, data.response, new Date().toISOString());
    } catch (err) {
      setMessages(prev => prev.slice(0, -1).concat({ sender: "bot", text: `Error: ${err.message}`, timestamp: new Date().toISOString() }));
    }
    setIsLoading(false);
  };

  return (
    <div className="chat-page">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.sender === "user" ? "user" : "bot"}`}
          >
            <div className="message-content">
              {msg.sender === "bot" ? (
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.text
              )}
              <div className="message-time">
                {msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatPage;
