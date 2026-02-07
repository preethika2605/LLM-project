// Make sure this file is named exactly api.js and placed in src/services/

const BASE_URL = "http://localhost:8080"; // backend URL

export async function sendMessageToBackend(message) {
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }), // send { message: "text" }
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Backend error: ${text}`);
    }

    const data = await res.json(); // { response: "bot reply" }
    return data;
  } catch (err) {
    console.error("API Error:", err);
    throw err;
  }
}
