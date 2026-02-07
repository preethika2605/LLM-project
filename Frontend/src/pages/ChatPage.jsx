import { useState, useEffect, useRef } from "react";
import MessageInput from "../components/MessageInput";
import { sendMessageToBackend } from "../services/api";

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/chat");
        if (response.ok) {
          const history = await response.json();
          const formattedHistory = history.flatMap(chat => [
            { sender: "user", text: chat.userMessage },
            { sender: "bot", text: chat.aiResponse }
          ]);
          setMessages(formattedHistory);
        }
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
        const data = await sendMessageToBackend(msg.text);
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: data.response },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "Error: Could not get response" },
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
            <div className="message-content">{msg.text}</div>
          </div>
        ))}
      </div>
      <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatPage;
