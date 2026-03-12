export const BASE_URL = "http://localhost:8080";

const TOKEN_KEY = "jwt_token";
const USER_KEY = "user_data";
const LEGACY_USER_KEY = "user";

export const saveToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
};

export const isTokenExpired = () => {
  const token = getToken();
  if (!token) {
    console.warn('JWT: No token found in localStorage');
    return true;
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.error('JWT: Invalid token format - expected 3 parts, got', parts.length);
      return true;
    }
    
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) {
      console.warn('JWT: Token has no expiration claim');
      return false;
    }
    
    const expiration = payload.exp * 1000;
    const isExpired = Date.now() >= expiration;
    console.log('JWT Token Status:', {
      expiresAt: new Date(expiration).toISOString(),
      currentTime: new Date().toISOString(),
      isExpired: isExpired,
      expiresIn: Math.round((expiration - Date.now()) / 1000) + 's'
    });
    return isExpired;
  } catch (e) {
    console.error('JWT: Error parsing token:', e.message);
    return true;
  }
};

export const saveUserData = (userData) => {
  localStorage.setItem(USER_KEY, JSON.stringify(userData));
};

export const getUserData = () => {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};

const fetchOptions = (method = "GET", body = null, includeToken = false) => {
  const opts = {
    method,
    mode: "cors",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  };

  if (includeToken) {
    const token = getToken();
    if (token) {
      opts.headers.Authorization = `Bearer ${token}`;
    }
  }

  if (body) {
    opts.body = JSON.stringify(body);
  }

  return opts;
};

const parseErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data.error || `HTTP ${response.status}: ${response.statusText}`;
  } catch (_e) {
    try {
      const text = await response.text();
      return text || `HTTP ${response.status}: ${response.statusText}`;
    } catch (_e2) {
      return `HTTP ${response.status}: ${response.statusText}`;
    }
  }
};

export async function testBackendConnection() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/test`, fetchOptions("GET"));
    return res.ok;
  } catch (_err) {
    throw new Error(
      `Cannot connect to backend at ${BASE_URL}. Make sure the backend is running on port 8080.`
    );
  }
}

export async function registerUser(user) {
  try {
    const res = await fetch(
      `${BASE_URL}/api/auth/register`,
      fetchOptions("POST", user, false)
    );

    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res);
      throw new Error(errorMsg);
    }

    const data = await res.json();
    if (data.token) {
      saveToken(data.token);
      saveUserData({
        id: data.id,
        username: data.username,
        email: data.email
      });
    }

    return data;
  } catch (err) {
    if (err.message.includes("Failed to fetch") || err.message.includes("fetch")) {
      throw new Error(
        `Cannot connect to backend at ${BASE_URL}. Make sure:\n1. Backend is running\n2. MongoDB is accessible\n3. Ollama is running`
      );
    }
    throw err;
  }
}

export async function loginUser(credentials) {
  try {
    const res = await fetch(
      `${BASE_URL}/api/auth/login`,
      fetchOptions("POST", credentials, false)
    );

    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res);
      throw new Error(errorMsg);
    }

    const data = await res.json();
    if (data.token) {
      saveToken(data.token);
      saveUserData({
        id: data.id,
        username: data.username,
        email: data.email
      });
    }

    return data;
  } catch (err) {
    if (err.message.includes("Failed to fetch") || err.message.includes("fetch")) {
      throw new Error(
        `Cannot connect to backend at ${BASE_URL}. Make sure:\n1. Backend is running\n2. MongoDB is accessible\n3. Ollama is running`
      );
    }
    throw err;
  }
}

export async function logoutUser() {
  removeToken();
}

export async function getChatHistory(userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const token = getToken();
    if (!token || isTokenExpired()) {
      removeToken();
      throw new Error("Session expired. Please login again.");
    }

    const res = await fetch(
      `${BASE_URL}/api/chat?userId=${encodeURIComponent(userId)}`,
      fetchOptions("GET", null, true)
    );

    if (!res.ok) {
      if (res.status === 401) {
        console.error('getChatHistory: Backend returned 401 - clearing token');
        removeToken();
        throw new Error("Session expired. Please login again.");
      }
      const text = await res.text();
      throw new Error(text || "Failed to load history");
    }

    return res.json();
  } catch (err) {
    throw err;
  }
}

export async function sendMessageToBackend(
  message,
  model,
  userId,
  conversationId = null,
  keyword = null,
  imageData = null,
  fileData = null,
  fileName = null,
  fileType = null,
  fileSize = null
) {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const token = getToken();
    if (!token || isTokenExpired()) {
      console.warn('No JWT token found - user may need to login');
      removeToken();
      throw new Error("Session expired. Please login again.");
    }

    const body = { message, model, userId, imageData };
    if (conversationId) body.conversationId = conversationId;
    if (keyword) body.keyword = keyword;
    if (fileData) body.file = fileData;
    if (fileName) body.fileName = fileName;
    if (fileType) body.fileType = fileType;
    if (fileSize !== null && fileSize !== undefined) body.fileSize = fileSize;

    console.log('Sending message to backend:', {
      model,
      messageLength: message.length,
      hasImage: !!imageData,
      hasFile: !!fileData,
      fileName,
      fileType,
      fileSize
    });
    const res = await fetch(
      `${BASE_URL}/api/chat`,
      fetchOptions("POST", body, true)
    );

    if (!res.ok) {
      const text = await res.text();
      
      if (res.status === 401) {
        console.error('Backend returned 401 Unauthorized - token may be invalid');
        removeToken();
        throw new Error("Session expired. Please login again.");
      }

      throw new Error(`Backend error (${res.status}): ${text}`);
    }

    const result = await res.json();
    console.log('Backend response received:', { status: result.status, responseLength: result.response?.length });
    return result;
  } catch (err) {
    if (err?.message?.includes("Failed to fetch") || err?.message?.includes("NetworkError")) {
      throw new Error(
        `Cannot connect to chat service at ${BASE_URL}. Check that backend is running and CORS/JWT auth is configured correctly.`
      );
    }
    throw err;
  }
}

const parseSseEvents = (buffer) => {
  const events = [];
  let remaining = buffer.replace(/\r\n/g, "\n");

  let boundaryIndex;
  while ((boundaryIndex = remaining.indexOf("\n\n")) !== -1) {
    const rawEvent = remaining.slice(0, boundaryIndex);
    remaining = remaining.slice(boundaryIndex + 2);

    const lines = rawEvent.split("\n");
    let eventName = "message";
    const dataLines = [];

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim() || "message";
      } else if (line.startsWith("data:")) {
        // Preserve exact token spacing; leading spaces can be meaningful.
        const value = line.slice(5);
        dataLines.push(value);
      }
    }

    if (dataLines.length) {
      events.push({ event: eventName, data: dataLines.join("\n") });
    }
  }

  return { events, remaining };
};

export async function sendMessageToBackendStream(
  message,
  model,
  userId,
  conversationId = null,
  keyword = null,
  imageData = null,
  fileData = null,
  fileName = null,
  fileType = null,
  fileSize = null,
  onToken = null
) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const token = getToken();
  if (!token || isTokenExpired()) {
    console.warn("No JWT token found - user may need to login");
    removeToken();
    throw new Error("Session expired. Please login again.");
  }

  const body = { message, model, userId, imageData };
  if (conversationId) body.conversationId = conversationId;
  if (keyword) body.keyword = keyword;
  if (fileData) body.file = fileData;
  if (fileName) body.fileName = fileName;
  if (fileType) body.fileType = fileType;
  if (fileSize !== null && fileSize !== undefined) body.fileSize = fileSize;

  const streamOptions = fetchOptions("POST", body, true);
  streamOptions.headers = {
    ...streamOptions.headers,
    Accept: "text/event-stream"
  };

  const res = await fetch(`${BASE_URL}/api/chat/stream`, streamOptions);

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      removeToken();
      throw new Error("Session expired. Please login again.");
    }
    throw new Error(`Backend error (${res.status}): ${text}`);
  }

  if (!res.body) {
    throw new Error("Streaming not supported in this browser.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullResponse = "";
  let resolvedConversationId = conversationId;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseEvents(buffer);
    buffer = parsed.remaining;

    for (const evt of parsed.events) {
      if (evt.event === "meta") {
        try {
          const meta = JSON.parse(evt.data);
          if (meta?.conversationId) {
            resolvedConversationId = meta.conversationId;
          }
        } catch (_e) {}
      } else if (evt.event === "token") {
        fullResponse += evt.data;
        if (typeof onToken === "function") {
          onToken(evt.data, fullResponse);
        }
      } else if (evt.event === "error") {
        throw new Error(evt.data || "Streaming error");
      }
    }
  }

  return { response: fullResponse, conversationId: resolvedConversationId };
}

export async function getAvailableModels() {
  try {
    const token = getToken();
    if (!token) {
      console.warn('No token available - returning default models');
      return {
        models: [
          "granite3.2:2b",
          "llama3.2:1b",
          "deepseek-coder:latest",
          "qwen2.5:1.5b"
        ]
      };
    }

    const res = await fetch(
      `${BASE_URL}/api/chat/models`,
      fetchOptions("GET", null, true)
    );

    if (!res.ok) {
      if (res.status === 401) {
        console.error('getAvailableModels: Backend returned 401 - clearing token');
        removeToken();
        throw new Error("Session expired. Please login again.");
      }
      throw new Error("Failed to fetch models");
    }

    return res.json();
  } catch (_err) {
    return {
      models: [
        "granite3.2:2b",
        "llama3.2:1b",
        "deepseek-coder:latest",
        "qwen2.5:1.5b"
      ]
    };
  }
}

export async function getModelInfo(modelName) {
  try {
    const token = getToken();
    if (!token || isTokenExpired()) {
      removeToken();
      throw new Error("Session expired. Please login again.");
    }

    const res = await fetch(
      `${BASE_URL}/api/chat/models/${encodeURIComponent(modelName)}`,
      fetchOptions("GET", null, true)
    );

    if (!res.ok) {
      if (res.status === 401) {
        console.error('getModelInfo: Backend returned 401 - clearing token');
        removeToken();
        throw new Error("Session expired. Please login again.");
      }
      throw new Error("Failed to fetch model info");
    }

    return res.json();
  } catch (err) {
    throw err;
  }
}
