// Make sure this file is named exactly api.js and placed in src/services/

export const BASE_URL = "http://localhost:8080"; // backend URL

const fetchOptions = (method = 'GET', body = null) => {
  const opts = {
    method,
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  return opts;
}

const parseErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data.error || `HTTP ${response.status}: ${response.statusText}`;
  } catch (e) {
    try {
      const text = await response.text();
      return text || `HTTP ${response.status}: ${response.statusText}`;
    } catch (e2) {
      return `HTTP ${response.status}: ${response.statusText}`;
    }
  }
}

// Test backend connectivity
export async function testBackendConnection() {
  try {
    console.log(`Testing backend connection to ${BASE_URL}...`);
    const res = await fetch(`${BASE_URL}/api/auth/test`, fetchOptions('GET'));
    console.log(`Backend test response: ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error('Backend connection test failed:', err.message);
    throw new Error(`Cannot connect to backend at ${BASE_URL}. Make sure the backend is running on port 8080.`);
  }
}

export async function registerUser(user) {
  try {
    console.log('Attempting registration for user:', user.username);
    const res = await fetch(`${BASE_URL}/api/auth/register`, fetchOptions('POST', user));
    console.log('Registration response status:', res.status);
    
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res);
      throw new Error(errorMsg);
    }
    const data = await res.json();
    console.log('Registration successful');
    return data;
  } catch (err) {
    console.error('registerUser error:', err);
    if (err.message.includes('Failed to fetch') || err.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend at ${BASE_URL}. Make sure:\n1. Backend is running\n2. MongoDB is accessible\n3. Ollama is running`);
    }
    throw err;
  }
}

export async function loginUser(credentials) {
  try {
    console.log('Attempting login for user:', credentials.username);
    const res = await fetch(`${BASE_URL}/api/auth/login`, fetchOptions('POST', credentials));
    console.log('Login response status:', res.status);
    
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res);
      throw new Error(errorMsg);
    }
    const data = await res.json();
    console.log('Login successful');
    return data;
  } catch (err) {
    console.error('loginUser error:', err);
    if (err.message.includes('Failed to fetch') || err.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend at ${BASE_URL}. Make sure:\n1. Backend is running\n2. MongoDB is accessible\n3. Ollama is running`);
    }
    throw err;
  }
}

export async function getChatHistory() {
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, fetchOptions('GET'));
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to load history');
    }
    return res.json();
  } catch (err) {
    console.error('getChatHistory error:', err);
    throw err;
  }
}

export async function sendMessageToBackend(message, model, conversationId = null, keyword = null) {
  try {
    const body = { message, model };
    if (conversationId) {
      body.conversationId = conversationId;
    }
    if (keyword) {
      body.keyword = keyword;
    }
    const res = await fetch(`${BASE_URL}/api/chat`, fetchOptions('POST', body));

    if (!res.ok) {
      const text = await res.text();
      console.error('Backend error response:', text);
      throw new Error(`Backend error: ${text}`);
    }

    const data = await res.json(); // { response: "bot reply", conversationId: "..." }
    return data;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}
export async function getAvailableModels() {
  try {
    const res = await fetch(`${BASE_URL}/api/chat/models`, fetchOptions('GET'));
    if (!res.ok) {
      throw new Error('Failed to fetch models');
    }
    return res.json();
  } catch (err) {
    console.error('getAvailableModels error:', err);
    // Return default models if API fails
    return {
      models: [
        'granite3.2:2b',
        'llama3.2:1b',
        'deepseek-coder:latest',
        'qwen2.5:1.5b'
      ]
    };
  }
}

export async function getModelInfo(modelName) {
  try {
    const res = await fetch(`${BASE_URL}/api/chat/models/${encodeURIComponent(modelName)}`, fetchOptions('GET'));
    if (!res.ok) {
      throw new Error('Failed to fetch model info');
    }
    return res.json();
  } catch (err) {
    console.error('getModelInfo error:', err);
    throw err;
  }
}