// Make sure this file is named exactly api.js and placed in src/services/

export const BASE_URL = "http://localhost:8080"; // backend URL

export async function registerUser(user) {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error("Registration failed");
  return res.json();
}

export async function loginUser(credentials) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) throw new Error("Login failed");
  return res.json();
}

export async function getChatHistory() {
  const res = await fetch(`${BASE_URL}/api/chat`);
  if (!res.ok) throw new Error("Failed to load history");
  return res.json();
}

export async function sendMessageToBackend(message, model) {
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, model }), // send { message, model }
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Backend error response:", text);
      throw new Error(`Backend error: ${text}`);
    }

    const data = await res.json(); // { response: "bot reply" }
    return data;
  } catch (err) {
    console.error("API Error:", err);
    throw err;
  }
}
