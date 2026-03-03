import { useState, useEffect } from 'react'

const SettingsModal = ({ 
  onClose, 
  username: initialUsername, 
  onUsernameChange,
  darkMode: initialDarkMode,
  onDarkModeChange,
  onModelChange,
  onClearChatHistory
}) => {
  const [username, setUsername] = useState(initialUsername)
  const [darkMode, setDarkMode] = useState(initialDarkMode)

  const handleSave = () => {
    onUsernameChange(username)
    onDarkModeChange(darkMode)
    const settings = { 
      username, 
      darkMode
    }
    localStorage.setItem('ai-chat-settings', JSON.stringify(settings))
    onClose()
  }

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
      onClearChatHistory()
      onClose()
    }
  }

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Settings</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          {/* Profile Section */}
          <div className="modal-section">
            <h3 className="section-header">👤 Profile</h3>
            <div className="setting-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="setting-input"
              />
            </div>
          </div>

          {/* Appearance Section */}
          <div className="modal-section">
            <h3 className="section-header">🎨 Appearance</h3>
            
            <div className="setting-group">
              <label className="toggle-label">
                <span>Dark Mode</span>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                    className="toggle-input"
                  />
                  <span className="toggle-slider"></span>
                </div>
              </label>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="modal-section danger-zone">
            <h3 className="section-header">⚠️ Danger Zone</h3>
            <button className="danger-btn" onClick={handleClearHistory}>
              🗑️ Clear All Chat History
            </button>
          </div>

          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="save-btn" onClick={handleSave}>
              ✓ Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal