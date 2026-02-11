import { useState } from 'react'

const Sidebar = ({ username, onSettingsClick, selectedModel, onModelChange, onSelectHistory, onLogout, chatHistories = [], onDeleteHistory }) => {
  // Remove default history
  const [history, setHistory] = useState([])

  const aiModels = [
    { value: 'qwen2.5:1.5b', label: 'Qwen 2.5 (1.5B)' },
    { value: 'deepseek-coder:latest', label: 'DeepSeek Coder (latest)' }
  ]

  const handleNewChat = () => {
    const newChat = {
      id: Date.now(),
      name: `Chat ${history.length + 1}`,
      active: true
    }

    setHistory(prev =>
      prev.map(item => ({ ...item, active: false }))
        .concat([newChat])
    )

    // signal parent to start a fresh/new chat (use null to indicate new)
    if (onSelectHistory) onSelectHistory(null)
  }

  const selectHistory = (id) => {
    setHistory(history.map(item => ({
      ...item,
      active: item.id === id
    })))
    if (onSelectHistory) onSelectHistory(id)
  }

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <div className="section-title">Local LLM</div>
        <button className="new-chat-btn" onClick={() => onSelectHistory && onSelectHistory(null)}>
          <span className="plus-icon">+</span> NEW CHAT
        </button>

        {/* AI Model Selector */}
        <div className="model-selector">
          <label className="model-label">Select Model</label>
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="model-dropdown"
          >
            {aiModels.map(model => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="section-title">HISTORY</div>
        <div className="history-list">
          {chatHistories.map(item => (
            <div
              key={item.id}
              className={`history-item ${item.active ? 'active' : ''}`}
            >
              <span className="history-icon" onClick={() => onSelectHistory(item.id)}>💬</span>
              <span className="history-name" onClick={() => onSelectHistory(item.id)}>{item.keyword || item.name || 'Chat'}</span>
              <button
                className="delete-history-btn"
                title="Delete chat"
                onClick={e => { e.stopPropagation(); onDeleteHistory && onDeleteHistory(item.id); }}
                style={{ marginLeft: 8, color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* User Profile Section */}
      <div className="user-profile">
        <div className="user-info">
          <div className="user-avatar">
            {(username || 'U').charAt(0).toUpperCase()
          }
          </div>
          <div className="user-details">
            <div className="user-name">{username || 'User'}</div>
          </div>
        </div>
        <div className="profile-actions">
          <button
            className="settings-btn"
            onClick={onSettingsClick}
            title="Settings"
          >
            ⚙️
          </button>
          <button
            className="logout-btn"
            onClick={() => onLogout && onLogout()}
            title="Logout"
          >
            �
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar