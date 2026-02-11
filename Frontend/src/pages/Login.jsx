import { useState, useEffect } from "react";
import { loginUser, registerUser, testBackendConnection } from "../services/api";
import "./Login.css";

export default function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isConnected, setIsConnected] = useState(null);

  useEffect(() => {
    // Test backend connection on mount
    const testConnection = async () => {
      try {
        const connected = await testBackendConnection();
        setIsConnected(connected);
      } catch (err) {
        setIsConnected(false);
        console.error('Backend connection test failed:', err.message);
      }
    };
    testConnection();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Username and password are required");
      return;
    }
    if (isSignup && !email) {
      setError("Email is required for signup");
      return;
    }

    try {
      let user;
      if (isSignup) {
        user = await registerUser({ username, email, password });
      } else {
        user = await loginUser({ username, password });
      }
      onLogin(user);
    } catch (err) {
      setError(err.message || "An error occurred");
      console.error('Auth error:', err);
    }
  };

  return (
    <div className="login-container">
      <form className="login-box" onSubmit={handleSubmit}>
        <h2>Local LLM</h2>
        <p className="login-subtitle">
          {isSignup
            ? "Create your AI workspace"
            : "Sign in to your AI workspace"}
        </p>

        {/* Connection Status */}
        <div style={{
          padding: '8px 12px',
          marginBottom: '12px',
          borderRadius: '4px',
          fontSize: '12px',
          backgroundColor: isConnected === true ? '#d4edda' : isConnected === false ? '#f8d7da' : '#e7f3ff',
          color: isConnected === true ? '#155724' : isConnected === false ? '#721c24' : '#004085',
          border: `1px solid ${isConnected === true ? '#c3e6cb' : isConnected === false ? '#f5c6cb' : '#b8daff'}`
        }}>
          {isConnected === true && '✓ Backend connected'}
          {isConnected === false && '✗ Cannot connect to backend (port 8080)'}
          {isConnected === null && '⏳ Testing backend connection...'}
        </div>

        {error && (
          <div style={{
            padding: '8px 12px',
            marginBottom: '12px',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            whiteSpace: 'pre-wrap'
          }}>
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        {isSignup && (
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        )}

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={isConnected === false}>
          {isSignup ? "Create Account" : "Login"}
        </button>

        <p className="login-toggle">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <span onClick={() => { setIsSignup(false); setError(""); }}>Login</span>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <span onClick={() => { setIsSignup(true); setError(""); }}>Sign up</span>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
