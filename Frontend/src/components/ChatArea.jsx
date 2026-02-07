import { useEffect, useRef } from 'react'

const ChatArea = ({ messages }) => {
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div className="chat-area">
      {messages.length === 0 ? (
        <div className="chat-header">
          <h1 className="system-title">SYSTEM OVERVIEW</h1>
          <p className="system-subtitle">READY TO ASSIST</p>
        </div>
      ) : (
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`message ${message.sender}`}
            >
              <div className="message-sender">
                {message.sender === 'user' ? '' : ''}
              </div>
              <div className="message-content">
                <div className="message-text">{message.text}</div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  )
}

export default ChatArea