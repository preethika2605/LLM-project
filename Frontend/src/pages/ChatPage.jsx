import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MessageInput from "../components/MessageInput";
import { sendMessageToBackend, getChatHistory } from "../services/api";

const ChatPage = ({ selectedModel }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const history = await getChatHistory();
        const formattedHistory = history.flatMap(chat => [
          { sender: "user", text: chat.userMessage },
          { sender: "bot", text: chat.aiResponse }
        ]);
        setMessages(formattedHistory);
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };

    loadChatHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (msg) => {
    setIsLoading(true);
    setMessages((prev) => [...prev, msg]);

    if (msg.sender === "user") {
      try {
        const data = await sendMessageToBackend(msg.text, selectedModel);
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: data.response },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: `Error: ${err.message}` },
        ]);
        console.error(err);
      }
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
