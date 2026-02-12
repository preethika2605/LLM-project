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
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatHistories, setChatHistories] = useState([]);

  const buildChatTitle = (text) => {
    if (!text) return "New Chat";
    const trimmed = text.trim();
    if (!trimmed) return "New Chat";
    return trimmed.length > 30 ? `${trimmed.slice(0, 30)}...` : trimmed;
  };

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('ai-chat-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.model) {
          setSelectedModel(settings.model);
        }
        if (settings.darkMode !== undefined) {
          setDarkMode(settings.darkMode);
        }
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
  }, []);

  // Save selectedModel to localStorage when it changes
  useEffect(() => {
    const savedSettings = localStorage.getItem('ai-chat-settings') || '{}';
    let settings;
    try {
      settings = JSON.parse(savedSettings);
    } catch (e) {
      settings = {};
    }
    settings.model = selectedModel;
    localStorage.setItem('ai-chat-settings', JSON.stringify(settings));
  }, [selectedModel]);

  useEffect(() => {
    // Load chat history from backend on mount
    const loadHistories = async () => {
      try {
        const history = await getChatHistory();
        // Group by conversationId
        const conversationMap = new Map();

        history.forEach((item) => {
          const conversationId = item.conversationId || item.id;
          if (!conversationId) return;

          if (!conversationMap.has(conversationId)) {
            conversationMap.set(conversationId, {
              id: conversationId,
              title: buildChatTitle(item.userMessage),
              messages: [],
              active: false
            });
          }
          conversationMap.get(conversationId).messages.push(item);
        });

        const chats = Array.from(conversationMap.values())
          .map((chat) => {
            const sortedMessages = (chat.messages || []).sort(
              (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
            );
            const lastTimestamp = sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1].timestamp : null;
            return {
              ...chat,
              messages: sortedMessages,
              lastTimestamp
            };
          })
          .sort((a, b) => {
            const aLast = a.lastTimestamp || 0;
            const bLast = b.lastTimestamp || 0;
            return new Date(bLast) - new Date(aLast);
          });

        setChatHistories(chats);
      } catch (e) {
        console.error('Failed to load chat history:', e);
        setChatHistories([]);
      }
    };
    loadHistories();
  }, []);

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
    if (id === null) {
      // New chat
      const newChatId = 'temp-' + Date.now().toString();
      const newChat = {
        id: newChatId,
        title: 'New Chat',
        messages: []
      };
      setChatHistories(prev => [newChat, ...prev]);
      setCurrentChatId(newChatId);
    } else {
      setCurrentChatId(id);
    }
  }

  const handleChatIdUpdate = (newId) => {
    if (currentChatId && currentChatId.startsWith('temp-')) {
      // Update the temp chat id to the real conversationId
      setChatHistories(prev => prev.map(chat =>
        chat.id === currentChatId ? { ...chat, id: newId } : chat
      ));
    }
    setCurrentChatId(newId);
  }

  const handleMessageSent = (conversationId, userMessage, aiResponse, timestamp) => {
    const safeConversationId = conversationId || `temp-${Date.now()}`;
    const newMessage = { userMessage, aiResponse, timestamp };

    setChatHistories(prev => {
      const existing = prev.find(chat => chat.id === safeConversationId);

      if (!existing) {
        return [{
          id: safeConversationId,
          title: buildChatTitle(userMessage),
          messages: [newMessage]
        }, ...prev];
      }

      return prev.map(chat =>
        chat.id === safeConversationId ? {
          ...chat,
          messages: [...(chat.messages || []), newMessage],
          title: chat.title === 'New Chat' ? buildChatTitle(userMessage) : chat.title
        } : chat
      );
    });
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
          <ChatPage selectedModel={selectedModel} currentChatId={currentChatId} chatHistories={chatHistories} onChatIdUpdate={handleChatIdUpdate} onMessageSent={handleMessageSent} />
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
