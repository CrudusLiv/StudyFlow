import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { GoogleLogin } from "@react-oauth/google";
import '../styles/pages/Access.css';

interface GoogleCredentialResponse {
  credential?: string;
}

interface UserResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    name: string;
    uniqueKey: string;
  };
}

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleGoogleAuth = async (credentialResponse: GoogleCredentialResponse) => {
    if (!credentialResponse.credential) {
      setError("Google authentication failed");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post<UserResponse>(
        'http://localhost:5000/auth/google/callback',
        { credential: credentialResponse.credential }
      );
      localStorage.setItem("token", response.data.token);
      localStorage.setItem('userKey', response.data.user.uniqueKey);
      navigate("/");
    } catch (error) {
      setError("Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const endpoint = isLogin ? "login" : "signup";
      const payload = isLogin 
        ? { email, password } 
        : { email, password, name, role: 'user' };

      const response = await axios.post<UserResponse>(
        `http://localhost:5000/${endpoint}`, 
        payload
      );
      localStorage.setItem("token", response.data.token);
      localStorage.setItem('userKey', response.data.user.uniqueKey);
      navigate("/");
    } catch (error) {
      setError("Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-content">
          <div className="form-section">
            <form onSubmit={handleSubmit} className="auth-form">
              <h1 className="form-title">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h1>

              {error && <div className="error-message">{error}</div>}

              {!isLogin && (
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="toggle-password"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className={`submit-button ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : (isLogin ? "Sign In" : "Create Account")}
              </button>

              <div className="divider">
                <span>Or continue with</span>
              </div>

              <GoogleLogin
                onSuccess={handleGoogleAuth}
                onError={() => setError("Google login failed")}
                auto_select={true}
              />

              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="toggle-auth"
              >
                {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </form>
          </div>

          <div className="info-section">
            <h2 className="info-title">
              {isLogin ? "Welcome Back" : "Join StudyFlow"}
            </h2>
            <ul className="feature-list">
              <li>Track your progress</li>
              <li>Manage your schedule</li>
              <li>Connect with peers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="auth-page">
      <AuthForm />
    </div>
  );
}