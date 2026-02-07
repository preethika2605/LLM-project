import { useState } from "react";
import { loginUser, registerUser } from "../services/api";
import "./Login.css";

export default function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) return;
    if (isSignup && !email) return;

    try {
      let user;
      if (isSignup) {
        user = await registerUser({ username, email, password });
      } else {
        user = await loginUser({ username, password });
      }
      onLogin(user);
    } catch (err) {
      alert(err.message);
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

        <button type="submit">
          {isSignup ? "Create Account" : "Login"}
        </button>

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
