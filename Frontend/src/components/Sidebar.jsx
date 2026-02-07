import { useState } from 'react'

const Sidebar = ({ username, onSettingsClick }) => {
  const [history, setHistory] = useState([
    { id: 1, name: 'Project Discussion', active: false },
    { id: 2, name: 'Code Review', active: false },
    { id: 3, name: 'New Chat', active: true }
  ])

  const [selectedModel, setSelectedModel] = useState('deepseek-custom')

  const aiModels = [
    { value: 'deepseek-custom', label: 'DeepSeek Custom' },
    { value: 'qwen', label: 'Qwen' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'llama3', label: 'Llama 3' }
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
  }

  const selectHistory = (id) => {
    setHistory(history.map(item => ({
      ...item,
      active: item.id === id
    })))
  }

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <div className="section-title">Local LLM</div>
        <button className="new-chat-btn" onClick={handleNewChat}>
          <span className="plus-icon">+</span> NEW CHAT
        </button>

        {/* AI Model Selector */}
        <div className="model-selector">
          <label className="model-label">Select Model</label>
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
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
          {history.map(item => (
            <div 
              key={item.id}
              className={`history-item ${item.active ? 'active' : ''}`}
              onClick={() => selectHistory(item.id)}
            >
              <span className="history-icon">💬</span>
              <span className="history-name">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* User Profile Section */}
      <div className="user-profile">
        <div className="user-info">
          <div className="user-avatar">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <div className="user-name">{username}</div>
          </div>
        </div>
        <button 
          className="settings-btn"
          onClick={onSettingsClick}
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </div>
  )
}

export default Sidebar