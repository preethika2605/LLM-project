import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatPage from "./pages/ChatPage";
import SettingsModal from "./components/SettingsModal";
import Login from "./pages/Login";
import { getChatHistory, getToken, isTokenExpired, removeToken } from "./services/api";
import "./App.css";

function App() {
  const [initialSession] = useState(() => {
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

    const token = getToken();
    const hasValidToken = !!token && !isTokenExpired();

    if (!savedUser || !hasValidToken) {
      return { isLoggedIn: false, currentUser: null, username: "" };
    }

    return {
      isLoggedIn: true,
      currentUser: savedUser,
      username: savedUser?.username || ""
    };
  });

  const [isLoggedIn, setIsLoggedIn] = useState(initialSession.isLoggedIn);
  const [currentUser, setCurrentUser] = useState(initialSession.currentUser);
  const [username, setUsername] = useState(initialSession.username);

  useEffect(() => {
    if (!initialSession.isLoggedIn) {
      removeToken();
    }
  }, [initialSession.isLoggedIn]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [selectedModel, setSelectedModel] = useState("llama3.2:1b");
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatHistories, setChatHistories] = useState([]);

  const handleSessionExpired = () => {
    removeToken();
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setCurrentUser(null);
    setUsername("");
    setChatHistories([]);
    setCurrentChatId(null);
  };

  const buildChatKeyword = (text) => {
    if (!text) return "New Chat";

    const normalized = text
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized) return "New Chat";

    const lower = normalized.toLowerCase();
    if (lower.includes("analyze this image")) {
      return "Image Analysis";
    }

    const stopWords = new Set([
      "the", "a", "an", "and", "or", "to", "for", "of", "in", "on", "at",
      "is", "are", "was", "were", "be", "this", "that", "it", "with",
      "about", "please", "can", "you", "me", "my", "i"
    ]);

    const words = normalized.split(" ");
    const meaningfulWords = words.filter(
      (word) => word.length > 2 && !stopWords.has(word.toLowerCase())
    );
    const selectedWords = (meaningfulWords.length ? meaningfulWords : words).slice(0, 4);

    return selectedWords
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
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
    // Load chat history from backend when logged in
    if (isLoggedIn && currentUser?.id) {
      const loadHistories = async () => {
        try {
          const history = await getChatHistory(currentUser.id);
          // Group by conversationId
          const conversationMap = new Map();

          history.forEach((item) => {
            const conversationId = item.conversationId || item.id;
            if (!conversationId) return;

            const historyKeyword = item.keyword || buildChatKeyword(item.userMessage);

            if (!conversationMap.has(conversationId)) {
              conversationMap.set(conversationId, {
                id: conversationId,
                title: historyKeyword,
                keyword: historyKeyword,
                messages: [],
                active: false
              });
            }

            const conversation = conversationMap.get(conversationId);
            conversation.messages.push(item);
            if ((!conversation.keyword || conversation.keyword === "New Chat") && historyKeyword) {
              conversation.keyword = historyKeyword;
              conversation.title = historyKeyword;
            }
          });

          const chats = Array.from(conversationMap.values())
            .map((chat) => {
              const sortedMessages = (chat.messages || []).sort(
                (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
              );
              const lastTimestamp = sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1].timestamp : null;
              const chatKeyword =
                sortedMessages[0]?.keyword ||
                chat.keyword ||
                buildChatKeyword(sortedMessages[0]?.userMessage);

              return {
                ...chat,
                title: chatKeyword || "New Chat",
                keyword: chatKeyword || "New Chat",
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
          if (e?.message?.includes("Session expired")) {
            handleSessionExpired();
            return;
          }
          console.error('Failed to load chat history:', e);
          setChatHistories([]);
        }
      };
      loadHistories();
    }
  }, [isLoggedIn, currentUser?.id]);

  // 🔐 IF NOT LOGGED IN → SHOW LOGIN PAGE
  if (!isLoggedIn) {
    return (
      <Login
        onLogin={(user) => {
          localStorage.setItem("user", JSON.stringify(user)); // Save to LS
          setCurrentUser(user);
          setUsername(user.username);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  const handleLogout = () => {
    handleSessionExpired();
  }

  const handleClearChatHistory = () => {
    localStorage.removeItem('chatHistories');
    setChatHistories([]);
    setCurrentChatId(null);
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

  const handleMessageSent = (
    conversationId,
    userMessage,
    aiResponse,
    timestamp,
    imageData = null,
    fileAttachment = null,
    keyword = null
  ) => {
    const safeConversationId = conversationId || `temp-${Date.now()}`;
    const resolvedKeyword = keyword || buildChatKeyword(userMessage);
    const newMessage = {
      userMessage,
      aiResponse,
      timestamp,
      imageData: imageData || null,
      fileData: fileAttachment?.data || null,
      fileName: fileAttachment?.name || null,
      fileType: fileAttachment?.type || null,
      fileSize: fileAttachment?.size || null,
      keyword: resolvedKeyword
    };

    setChatHistories(prev => {
      const existing = prev.find(chat => chat.id === safeConversationId);

      if (!existing) {
        return [{
          id: safeConversationId,
          title: resolvedKeyword,
          keyword: resolvedKeyword,
          messages: [newMessage]
        }, ...prev];
      }

      return prev.map(chat =>
        chat.id === safeConversationId ? {
          ...chat,
          messages: [...(chat.messages || []), newMessage],
          keyword: chat.keyword && chat.keyword !== "New Chat" ? chat.keyword : resolvedKeyword,
          title: chat.keyword && chat.keyword !== "New Chat" ? chat.keyword : resolvedKeyword
        } : chat
      );
    });
  }

  const handleDeleteHistory = (id) => {
    setChatHistories(prev => prev.filter(chat => chat.id !== id));
    // Optionally, you can also call a backend API to delete the chat from the database
    if (currentChatId === id) setCurrentChatId(null);
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
            onSelectHistory={handleSelectHistory}
            onLogout={handleLogout}
            chatHistories={chatHistories.map(h => ({ ...h, active: h.id === currentChatId }))}
            onDeleteHistory={handleDeleteHistory}
          />
        )}

        <div className="main-content">
          <ChatPage
            selectedModel={selectedModel}
            currentChatId={currentChatId}
            chatHistories={chatHistories}
            currentUser={currentUser}
            onChatIdUpdate={handleChatIdUpdate}
            onMessageSent={handleMessageSent}
            onSessionExpired={handleSessionExpired}
          />
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
          onClearChatHistory={handleClearChatHistory}
        />
      )}
    </div>
  );
}

export default App;
