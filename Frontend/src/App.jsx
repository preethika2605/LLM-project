import { useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatPage from "./pages/ChatPage";
import SettingsModal from "./components/SettingsModal";
import Login from "./pages/Login";
import "./App.css";

function App() {
  // Initialize from LocalStorage
  let savedUser = null;
  try {
    const stored = localStorage.getItem("user");
    if (stored) {
      savedUser = JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to parse user from local storage", e);
    localStorage.removeItem("user");
  }

  const [isLoggedIn, setIsLoggedIn] = useState(!!savedUser);
  const [username, setUsername] = useState(savedUser?.username || "");

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [selectedModel, setSelectedModel] = useState("qwen3:1.7b");

  // 🔐 IF NOT LOGGED IN → SHOW LOGIN PAGE
  if (!isLoggedIn) {
    return (
      <Login
        onLogin={(user) => {
          localStorage.setItem("user", JSON.stringify(user)); // Save to LS
          setUsername(user.username);
          setIsLoggedIn(true);
        }}
      />
    );
  }



  // ✅ AFTER LOGIN → YOUR EXISTING APP
  return (
    <div className={`app ${darkMode ? "dark-mode" : "light-mode"}`}>
      <div className="header">
        <div className="app-title">
          <span
            className="menu-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? "✕" : "☰"}
          </span>
        </div>
      </div>

      <div className="main-container">
        {isSidebarOpen && (
          <Sidebar
            username={username}
            onSettingsClick={() => setIsSettingsOpen(true)}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        )}

        <div className="main-content">
          <ChatPage selectedModel={selectedModel} />
        </div>
      </div>

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          username={username}
          onUsernameChange={setUsername}
          darkMode={darkMode}
          onDarkModeChange={setDarkMode}
        />
      )}
    </div>
  );
}

export default App;
