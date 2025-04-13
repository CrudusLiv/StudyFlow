import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {  BsGoogle } from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  containerVariants, 
  fadeIn
} from '../utils/animationConfig';
import '../styles/pages/Access.css';

const buttonLoadingVariants = {
  loading: {
    scale: 0.98,
    opacity: 0.8,
    transition: {
      repeat: Infinity,
      repeatType: "reverse",
      duration: 0.5
    }
  },
  idle: {
    scale: 1,
    opacity: 1
  }
};

const Access: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any previous auth attempts
    localStorage.removeItem('authInProgress');
    
    // Check if we're returning from an OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userKey = params.get('userKey');
    const userRole = params.get('userRole');
    
    if (token && userKey) {
      login(token, userKey, userRole || 'user');
      navigate('/schedule');
    }
  }, [navigate, login]);

  const handleGoogleAuth = () => {
    try {
      window.location.href = 'http://localhost:5000/auth/google';
    } catch (err) {
      console.error('Google auth error:', err);
      setError("Authentication failed. Please try again.");
    }
  };


  return (
    <motion.div 
      className="access-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="auth-card"
        variants={containerVariants}
      >
        <motion.div 
          className="auth-content"
          variants={fadeIn}
        >
          <div className="form-section">
            <motion.h1 
              className="form-title"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Welcome to StudyFlow
            </motion.h1>

            {error && (
              <motion.div 
                className="error-message"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {error}
              </motion.div>
            )}

            <motion.div 
              className="auth-buttons"
              variants={containerVariants}
            >
              <motion.button
                onClick={handleGoogleAuth}
                className="auth-button google-button"
                animate={loading ? "loading" : "idle"}
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
              >
                <motion.div
                  animate={{ rotate: loading ? 360 : 0 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <BsGoogle className="auth-icon" />
                </motion.div>
                Sign in with Google
              </motion.button>


            </motion.div>
          </div>

          <motion.div 
            className="info-section"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="info-title">Join StudyFlow</h2>
            <ul className="feature-list">
              <motion.li 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Track your progress
              </motion.li>
              <motion.li 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                Manage your schedule
              </motion.li>
              <motion.li 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                Connect with peers
              </motion.li>
            </ul>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Access;
