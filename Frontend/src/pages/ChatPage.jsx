import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MessageInput from "../components/MessageInput";
import { sendMessageToBackend } from "../services/api";

const ChatPage = ({ selectedModel, currentChatId, chatHistories = [] }) => {
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
      ]);
      setMessages(displayMessages);
      setKeyword(selectedChat.keyword || "");
    } else {
      setMessages([]);
    }
  }, [currentChatId, chatHistories]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (msg) => {
    setIsLoading(true);
    setMessages([{ ...msg, timestamp: new Date().toISOString() }, { sender: "bot", text: "Thinking...", timestamp: new Date().toISOString() }]);
    setKeyword(msg.text.slice(0, 30));
    try {
      const data = await sendMessageToBackend(msg.text, selectedModel);
      setMessages([
        { sender: "user", text: msg.text, timestamp: new Date().toISOString() },
        { sender: "bot", text: data.response, timestamp: new Date().toISOString() }
      ]);
    } catch (err) {
      setMessages([
        { sender: "user", text: msg.text, timestamp: new Date().toISOString() },
        { sender: "bot", text: `Error: ${err.message}`, timestamp: new Date().toISOString() }
      ]);
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
                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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
