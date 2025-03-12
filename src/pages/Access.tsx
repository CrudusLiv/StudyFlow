import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import '../styles/pages/Access.css';
import { AccessGoogleButton } from '../components/AccessGoogleButton';
import { useAuth } from '../contexts/AuthContext';

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
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userKey = params.get('userKey');
    const userRole = params.get('userRole');
    
    if (token && userKey) {
      console.log("Access page: Found token in URL");
      try {
        // Log the user in through the auth context
        login(token, userKey, userRole || 'user');
        
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Navigate after a small delay to ensure state updates
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 100);
      } catch (error) {
        console.error('Error processing authentication:', error);
        setError('Failed to process authentication');
      }
    }
  }, [navigate, login]);

  const handleGoogleAuth = useCallback(() => {
    try {
      window.location.href = 'http://localhost:5000/auth/google';
    } catch (err) {
      console.error('Google auth error:', err);
      setError("Authentication failed. Please try again.");
    }
  }, []);

  const handleGoogleCalendarAccess = async (accessToken: string) => {
    try {
      // Store the access token
      localStorage.setItem('googleAccessToken', accessToken);
      setMessage('Google Calendar connected successfully');
    } catch (err) {
      setError('Failed to connect Google Calendar');
    }
  };

  const togglePassword = () => {
    setShowPassword(prev => !prev);
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
    } catch (err) {
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
              {message && <div className="success-message">{message}</div>}

              {!isLogin && (
                <div className="input-group">
                  <label className="input-label">Username</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                    placeholder="Alice"
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
                  placeholder="user@gmail.com"
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
                    placeholder="••••••••••••"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={togglePassword}
                    className="toggle-password"
                  >
                    {showPassword ? 'Hide' : 'Show'}
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
                <button 
                  onClick={handleGoogleAuth}
                  className="google-auth-button"
                >
                  Sign in with Google
                </button>
              </div>

              <AccessGoogleButton
                onSuccess={handleGoogleCalendarAccess}
                onError={() => setError('Failed to connect Google Calendar')}
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