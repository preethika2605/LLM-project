import { useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatPage from "./pages/ChatPage";
import SettingsModal from "./components/SettingsModal";
import Login from "./pages/Login";
import "./App.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [darkMode, setDarkMode] = useState(true);

  // 🔐 IF NOT LOGGED IN → SHOW LOGIN PAGE
  if (!isLoggedIn) {
  return (
    <Login
      onLogin={(user) => {
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
          />
        )}

        <div className="main-content">
          <ChatPage />
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
