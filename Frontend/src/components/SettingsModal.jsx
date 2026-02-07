import { useState } from 'react'

const SettingsModal = ({ 
  onClose, 
  username: initialUsername, 
  onUsernameChange,
  darkMode: initialDarkMode,
  onDarkModeChange
}) => {
  const [username, setUsername] = useState(initialUsername)
  const [darkMode, setDarkMode] = useState(initialDarkMode)
  const [model, setModel] = useState('gpt-4')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1000)
  const [typingSpeed, setTypingSpeed] = useState('medium') // New setting

  const handleSave = () => {
    onUsernameChange(username)
    onDarkModeChange(darkMode)
    // In a real app, you would save these settings to local storage or backend
    const settings = { username, darkMode, model, temperature, maxTokens, typingSpeed }
    console.log('Settings saved:', settings)
    localStorage.setItem('ai-chat-settings', JSON.stringify(settings))
    alert('Settings saved successfully!')
    onClose()
  }

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          <div className="setting-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="setting-input"
            />
          </div>

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

          

          <div className="setting-group">
            <label>Response Speed</label>
            <select 
              value={typingSpeed} 
              onChange={(e) => setTypingSpeed(e.target.value)}
              className="setting-select"
            >
              <option value="slow">Slow (Realistic)</option>
              <option value="medium">Medium</option>
              <option value="fast">Fast</option>
              <option value="instant">Instant</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Creativity: {temperature.toFixed(1)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="setting-range"
            />
            <div className="range-labels">
              <span>Precise</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>

          <div className="setting-group">
            <label>Response Length: {maxTokens} tokens</label>
            <input
              type="range"
              min="100"
              max="4000"
              step="100"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="setting-range"
            />
            <div className="range-labels">
              <span>Short</span>
              <span>Medium</span>
              <span>Long</span>
            </div>
          </div>

          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="save-btn" onClick={handleSave}>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal