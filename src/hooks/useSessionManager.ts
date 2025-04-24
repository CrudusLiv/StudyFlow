import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useSessionManager = () => {
  const { logout } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Default session duration - 3 hours
  const DEFAULT_SESSION_DURATION = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
  // Threshold to show warning before logout (5 minutes)
  const WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

  useEffect(() => {
    // Initialize the session timeout when component mounts
    const initializeSession = () => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Get token expiry time
      const tokenExpiry = localStorage.getItem('tokenExpiry');
      if (!tokenExpiry) {
        // If no expiry is set, set it now (3 hours)
        const newExpiryTime = new Date().getTime() + DEFAULT_SESSION_DURATION;
        localStorage.setItem('tokenExpiry', newExpiryTime.toString());
        return;
      }

      const expiryTime = parseInt(tokenExpiry);
      const currentTime = new Date().getTime();
      
      // Calculate remaining time
      const remainingTime = expiryTime - currentTime;
      
      // If token is already expired, log out immediately
      if (remainingTime <= 0) {
        logout();
        return;
      }

      // Set timeout to log out when token expires
      timeoutRef.current = setTimeout(() => {
        logout();
        timeoutRef.current = null;
      }, remainingTime);
    };

    initializeSession();

    // Add event listeners for user activity
    const resetTimeout = () => {
      // When there's user activity, extend the session
      if (localStorage.getItem('token')) {
        const currentTime = new Date().getTime();
        const tokenExpiry = localStorage.getItem('tokenExpiry');
        
        if (tokenExpiry && parseInt(tokenExpiry) - currentTime < WARNING_THRESHOLD) {
          // If less than warning threshold remaining, extend the session
          const newExpiryTime = currentTime + DEFAULT_SESSION_DURATION;
          localStorage.setItem('tokenExpiry', newExpiryTime.toString());
          
          // Reset the timeout
          initializeSession();
        }
      }
    };

    // Listen for user activity
    window.addEventListener('click', resetTimeout);
    window.addEventListener('keypress', resetTimeout);
    window.addEventListener('scroll', resetTimeout);
    window.addEventListener('mousemove', resetTimeout);

    // Clean up on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      window.removeEventListener('click', resetTimeout);
      window.removeEventListener('keypress', resetTimeout);
      window.removeEventListener('scroll', resetTimeout);
      window.removeEventListener('mousemove', resetTimeout);
    };
  }, [logout]); // Only re-run if logout changes
};
