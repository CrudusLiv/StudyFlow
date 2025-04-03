import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiClock, FiAlertCircle, FiCheck, FiFile, FiCalendar } from 'react-icons/fi';
import { reminderService } from '../services/reminderService';
import { pageVariants, containerVariants, listItemVariants } from '../utils/animationConfig';
import '../styles/pages/Reminders.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Reminder interface defines the structure of a reminder object
interface Reminder {
  _id: string;          // Unique identifier for the reminder
  title: string;        // Title of the reminder
  message: string;      // Detailed message of the reminder
  dueDate: string;      // Due date of the associated assignment
  reminderDate: string; // Date when the reminder should be shown
  isRead: boolean;      // Whether the reminder has been read
  assignmentId?: {
    title: string;
  };
}

const Reminders: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch reminders on component mount
  useEffect(() => {
    fetchReminders();
  }, []);

  // Function to fetch reminders using our new service
  const fetchReminders = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching reminders...');
      const data = await reminderService.getReminders();
      
      console.log('Reminders data received:', data);
      
      if (Array.isArray(data)) {
        setReminders(data);
        console.log('Reminders state updated with', data.length, 'items');
      } else {
        console.error('Unexpected response format:', data);
        setReminders([]);
        setError('Failed to load reminders: Invalid data format');
      }
    } catch (err) {
      console.error('Error fetching reminders:', err);
      setError('Failed to load reminders. Please try again later.');
      setReminders([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to mark a reminder as read
  const markAsRead = async (id: string) => {
    try {
      await reminderService.markAsRead(id);
      
      // Update the local state
      setReminders(prevReminders => 
        prevReminders.map(reminder => 
          reminder._id === id ? { ...reminder, isRead: true } : reminder
        )
      );
      
      toast.success('Reminder marked as read');
    } catch (err) {
      console.error('Error marking reminder as read:', err);
      toast.error('Failed to update reminder');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div 
      className="reminders-container"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageVariants}
    >
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading reminders...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <FiAlertCircle className="error-icon" />
          <p>{error}</p>
          <button onClick={fetchReminders} className="retry-button">
            Try Again
          </button>
        </div>
      ) : reminders.length === 0 ? (
        <div className="empty-reminders">
          <FiClock className="empty-icon" />
          <h3>No Active Reminders</h3>
          <p>You don't have any active reminders at the moment.</p>
        </div>
      ) : (
        <motion.div 
          className="reminders-list"
          variants={containerVariants}
        >
          {reminders.map(reminder => (
            <motion.div 
              key={reminder._id} 
              className={`reminder-card ${reminder.isRead ? 'read' : ''}`}
              variants={listItemVariants}
            >
              <div className="reminder-header">
                <h3>{reminder.title}</h3>
                {!reminder.isRead && (
                  <span className="unread-badge">New</span>
                )}
              </div>
              <p className="reminder-message">{reminder.message}</p>
              
              {reminder.assignmentId && (
                <div className="reminder-assignment">
                  <FiFile className="assignment-icon" />
                  <div className="assignment-details">
                    <span className="assignment-title">{reminder.assignmentId.title}</span>
                    <span className="assignment-due">
                      Due: {formatDate(reminder.dueDate)}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="reminder-dates">
                <div className="reminder-date">
                  <FiCalendar className="date-icon" />
                  <span>Reminded: {formatDate(reminder.reminderDate)}</span>
                </div>
                <div className="reminder-date">
                  <FiClock className="date-icon" />
                  <span>Due: {formatDate(reminder.dueDate)}</span>
                </div>
              </div>
              
              {!reminder.isRead && (
                <button 
                  className="mark-read-button"
                  onClick={() => markAsRead(reminder._id)}
                >
                  <FiCheck className="check-icon" />
                  Mark as Read
                </button>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

export default Reminders;
