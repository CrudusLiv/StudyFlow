import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BsGoogle, BsMicrosoft } from 'react-icons/bs';
import { signInWithMicrosoft, handleRedirectResult } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import '../styles/pages/Access.css';

export function AuthForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const processAuth = async () => {
      // Only process if we have an auth in progress
      if (!localStorage.getItem('authInProgress')) {
        return;
      }

      setLoading(true);
      try {
        const result = await handleRedirectResult();
        if (result?.user) {
          const idToken = await result.user.getIdToken();
          const response = await axios.post('http://localhost:5000/auth/microsoft', {
            token: idToken,
            email: result.user.email,
            name: result.user.displayName
          });

          if (response.data.token) {
            login(response.data.token, response.data.userKey);
            navigate('/schedule');
          }
        }
      } catch (err) {
        console.error('Auth processing error:', err);
        setError('Authentication failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    processAuth();
  }, [navigate, login]);

  const handleGoogleAuth = () => {
    try {
      window.location.href = 'http://localhost:5000/auth/google';
    } catch (err) {
      console.error('Google auth error:', err);
      setError("Authentication failed. Please try again.");
    }
  };

  const handleMicrosoftAuth = async () => {
    try {
      setError(null);
      setLoading(true);
      await signInWithMicrosoft();
    } catch (err) {
      console.error('Microsoft auth error:', err);
      setError('Failed to start authentication');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-content">
          <div className="form-section">
            <h1 className="form-title">Welcome to StudyFlow</h1>

            {error && <div className="error-message">{error}</div>}

            <div className="auth-buttons">
              <button
                onClick={handleGoogleAuth}
                className="auth-button google-button"
              >
                <BsGoogle />
                Sign in with Google
              </button>

              <button
                onClick={handleMicrosoftAuth}
                className="auth-button microsoft-button"
                disabled={loading}
              >
                <BsMicrosoft />
                {loading ? 'Signing in...' : 'Sign in with Microsoft'}
              </button>
            </div>
          </div>

          <div className="info-section">
            <h2 className="info-title">Join StudyFlow</h2>
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

// Add default export
const Access = () => {
  return <AuthForm />;
};

export default Access;
