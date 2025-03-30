import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/pages/Reminders.css';
import { 
  pageVariants, 
  containerVariants, 
  listVariants, 
  listItemVariants,
  fadeIn
} from '../utils/animationConfig';
import { Reminder } from '../types/types';

const Reminders: React.FC = () => {
  // State management for reminders, loading state, errors, and notifications
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Utility function to show temporary notifications
  const showNotification = (message: string, type: 'success' | 'error') => {
    console.log(`📣 Showing notification: ${message} (${type})`);
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Fetch reminders from the server when component mounts
  useEffect(() => {
    const fetchReminders = async () => {
      console.log('🔄 Starting to fetch reminders...');
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        console.log('🔑 Token status:', token ? 'Found' : 'Not found');
        console.log('🔑 Token value:', token); // Log actual token value
        
        if (!token) {
          throw new Error('No authentication token found. Please log in again.');
        }

        // Make API request with detailed logging
        console.log('🌐 Making API request...');
        const response = await axios.get('http://localhost:5000/api/reminders', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 5000,
          validateStatus: (status) => {
            console.log('📡 Response status:', status);
            return status >= 200 && status < 300;
          }
        });

        console.log('📦 Response headers:', response.headers);
        console.log('📦 Response data:', response.data);

        if (!response.data) {
          throw new Error('No data received from server');
        }

        if (Array.isArray(response.data)) {
          setReminders(response.data);
          showNotification(`Loaded ${response.data.length} reminders`, 'success');
        } else {
          throw new Error('Invalid data format received');
        }

      } catch (error: any) {
        console.error('🚨 Full error object:', error);
        console.error('🚨 Error response:', error.response);
        console.error('🚨 Error request:', error.request);
        console.error('🚨 Error config:', error.config);
        
        const errorMessage = error.response?.data?.error 
          || error.response?.data?.message 
          || error.message 
          || 'An unexpected error occurred';
        
        setError(errorMessage);
        showNotification(`Failed to fetch reminders: ${errorMessage}`, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();
  }, []);

  // Function to mark a reminder as read
  const markAsRead = async (id: string) => {
    console.log(`📌 Marking reminder as read: ${id}`);
    try {
      setReminders(reminders.map(r => {
        if (r._id === id) {
          console.log(`✓ Found and updating reminder: ${r.title}`);
          return { ...r, isRead: true };
        }
        return r;
      }));
      showNotification('Marked as read', 'success');
    } catch (error: any) {
      console.error('❌ Error marking as read:', error);
      showNotification(error.response?.data?.error || 'Failed to mark reminder as read', 'error');
    }
  };

  console.log('🔄 Current state:', {
    remindersCount: reminders.length,
    isLoading: loading,
    error: error,
    hasNotification: !!notification
  });

  // Update error display
  if (error) {
    return (
      <motion.div 
        className="reminders-container error-page"
        variants={fadeIn}
      >
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <h2>Error Loading Reminders</h2>
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </motion.div>
    );
  }

  // Show loading state while fetching data
  if (loading) {
    return <div className="reminders-container">Loading...</div>;
  }

  // Render the main component
  return (
    <motion.div 
      className="reminders-container"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageVariants}
    >
      <AnimatePresence>
        {notification && (
          <motion.div 
            className={`notification ${notification.type}`}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.header variants={containerVariants}>
        <h1 className="reminders-title">
          <span>📅</span> Your Reminders
        </h1>
      </motion.header>
      
      <motion.main 
        className="reminders-list"
        variants={containerVariants}
      >
        {reminders.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={listVariants}
          >
            {reminders.map(reminder => (
              <motion.article
                key={reminder._id}
                className={`reminder-item ${!reminder.isRead ? 'unread' : ''}`}
                variants={listItemVariants}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="reminder-content">
                  <div className="reminder-info">
                    <div className="reminder-header">
                      <h3 className="reminder-title">
                        {reminder.assignmentId ? `${reminder.assignmentId.title}: ` : ''}{reminder.title}
                      </h3>
                    </div>
                    <p className="reminder-message">{reminder.message}</p>
                    <footer className="reminder-meta">
                      <time>
                        <span>📅 Due:</span> {new Date(reminder.dueDate).toLocaleDateString()}
                      </time>
                      <time>
                        <span>⏰ Reminder:</span> {new Date(reminder.reminderDate).toLocaleDateString()}
                      </time>
                      <span className="reminder-course">
                        <span>📚 Course:</span> {reminder.assignmentId?.title}
                      </span>
                    </footer>
                  </div>
                  {!reminder.isRead && (
                    <button
                      onClick={() => markAsRead(reminder._id)}
                      className="mark-read-button"
                    >
                      ✓ Mark as read
                    </button>
                  )}
                </div>
              </motion.article>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            className="empty-state"
            variants={fadeIn}
          >
            <span className="empty-icon">📌</span>
            <h2>No Reminders</h2>
            <p>You're all caught up! Check back later for new reminders.</p>
          </motion.div>
        )}
      </motion.main>
    </motion.div>
  );
};

export default Reminders;
