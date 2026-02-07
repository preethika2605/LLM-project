import { useState } from 'react'

const MessageInput = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSendMessage({ sender: "user", text: message })
      setMessage('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="message-input-container">
      <input
        type="text"
        className="message-input"
        placeholder="Type a message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={isLoading}
      />
      <div className="input-actions">
        <button 
          className="action-btn" 
          title="Attach file"
          disabled={isLoading}
        >
          📎
        </button>
        <button 
          className="action-btn" 
          title="Web search"
          disabled={isLoading}
        >
          🔍
        </button>
        <button 
          className="action-btn primary" 
          onClick={handleSend}
          disabled={isLoading || !message.trim()}
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}

export default MessageInput