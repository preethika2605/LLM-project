import { useState } from "react";
import "./Login.css";

export default function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isSignup && !username) return;
    if (!email || !password) return;

    // For now: frontend-only auth
    const userData = {
      username: username || email.split("@")[0],
      email
    };

    onLogin(userData);
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

        {/* Username (Sign up only) */}
        {isSignup && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}

        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">
          {isSignup ? "Create Account" : "Login"}
        </button>

        {/* Toggle */}
        <p className="login-toggle">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <span onClick={() => setIsSignup(false)}>Login</span>
            </>
          ) : (
            <>
              Don’t have an account?{" "}
              <span onClick={() => setIsSignup(true)}>Sign up</span>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
