import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatPage from "./pages/ChatPage";
import SettingsModal from "./components/SettingsModal";
import Login from "./pages/Login";
import { getChatHistory } from "./services/api";
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
  const [selectedModel, setSelectedModel] = useState("qwen2.5:1.5b");
  const [currentChatId, setCurrentChatId] = useState('ALL');
  const [chatHistories, setChatHistories] = useState([]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('ai-chat-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.model) {
          setSelectedModel(settings.model);
        }
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Load chat history from backend on mount or when new chat is created
    const loadHistories = async () => {
      try {
        const history = await getChatHistory();
        // Group by keyword (first user message or custom)
        const chats = [];
        let current = null;
        history.forEach((item, idx) => {
          if (!current || item.keyword !== current.keyword) {
            if (current) chats.push(current);
            current = {
              id: idx + 1,
              keyword: item.userMessage ? item.userMessage.slice(0, 30) : 'Chat',
              messages: [item],
              active: false
            };
          } else {
            current.messages.push(item);
          }
        });
        if (current) chats.push(current);
        setChatHistories(chats);
      } catch (e) {
        setChatHistories([]);
      }
    };
    loadHistories();
  }, [currentChatId]);

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

  const handleLogout = () => {
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUsername('');
  }

  const handleSelectHistory = (id) => {
    setCurrentChatId(id);
  }

  const handleDeleteHistory = (id) => {
    setChatHistories(prev => prev.filter(chat => chat.id !== id));
    // Optionally, you can also call a backend API to delete the chat from the database
    if (currentChatId === id) setCurrentChatId(null);
  }

  // Ensure New Chat clears the chat area
  useEffect(() => {
    if (currentChatId === null) {
      // Optionally, you can also reset other chat-related state here if needed
    }
  }, [currentChatId]);

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
            onSelectHistory={handleSelectHistory}
            onLogout={handleLogout}
            chatHistories={chatHistories.map(h => ({ ...h, active: h.id === currentChatId }))}
            onDeleteHistory={handleDeleteHistory}
          />
        )}

        <div className="main-content">
          <ChatPage selectedModel={selectedModel} currentChatId={currentChatId} chatHistories={chatHistories} />
        </div>
      </div>

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          username={username}
          onUsernameChange={setUsername}
          darkMode={darkMode}
          onDarkModeChange={setDarkMode}
          onModelChange={setSelectedModel}
        />
      )}
    </div>
  );
}

export default App;
