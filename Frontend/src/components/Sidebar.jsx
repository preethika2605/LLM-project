import { useState, useEffect } from 'react'
import { getAvailableModels } from '../services/api'

const Sidebar = ({ username, onSettingsClick, selectedModel, onModelChange, onSelectHistory, onLogout, chatHistories = [], onDeleteHistory }) => {
  // Remove default history
  const [history, setHistory] = useState([])
  const [aiModels, setAiModels] = useState([])

  useEffect(() => {
    const loadModels = async () => {
      try {
        const data = await getAvailableModels()
        const models = data.models.map(model => ({
          value: model,
          label: model
        }))
        setAiModels(models)
      } catch (err) {
        console.error('Failed to load models:', err)
        // Fallback to default models
        setAiModels([
          { value: 'qwen2.5:1.5b', label: 'Qwen 2.5 (1.5B)' },
          { value: 'deepseek-coder:latest', label: 'DeepSeek Coder (latest)' },
          { value: 'granite3.2:2b', label: 'Granite 3.2 (2B)' },
          { value: 'llama3.2:1b', label: 'Llama 3.2 (1B)' }
        ])
      }
    }
    loadModels()
  }, [])

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
              <span className="history-name" onClick={() => onSelectHistory(item.id)}>{item.title || item.keyword || item.name || 'Chat'}</span>
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
