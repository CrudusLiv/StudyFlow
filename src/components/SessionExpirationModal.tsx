import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalVariants } from '../utils/animationConfig';
import { useAuth } from '../contexts/AuthContext';

const SessionExpirationModal: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const { logout } = useAuth();

  useEffect(() => {
    // Check if token is about to expire (less than 5 minutes left)
    const checkTokenExpiration = () => {
      const tokenExpiry = localStorage.getItem('tokenExpiry');
      if (tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry);
        const currentTime = new Date().getTime();
        const timeRemaining = Math.floor((expiryTime - currentTime) / 1000); // Convert to seconds
        
        // If less than 5 minutes remaining, show the warning
        if (timeRemaining > 0 && timeRemaining < 300) {
          setTimeLeft(timeRemaining);
          setShowModal(true);
        } else {
          setShowModal(false);
        }
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkTokenExpiration, 30000);
    
    // Initial check
    checkTokenExpiration();
    
    return () => clearInterval(interval);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (showModal && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (timeLeft <= 0) {
      logout();
    }
  }, [timeLeft, showModal, logout]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Extend session by 3 more hours
  const extendSession = () => {
    const newExpiryTime = new Date().getTime() + (3 * 60 * 60 * 1000);
    localStorage.setItem('tokenExpiry', newExpiryTime.toString());
    setShowModal(false);
  };

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="modal-content session-expiration-modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <h2>Session Expiring Soon</h2>
            <p>Your session will expire in {formatTime(timeLeft)}.</p>
            <div className="modal-actions">
              <button onClick={extendSession} className="primary-button">
                Keep Me Signed In
              </button>
              <button onClick={logout} className="secondary-button">
                Log Out Now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SessionExpirationModal;
