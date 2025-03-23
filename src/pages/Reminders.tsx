import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/pages/Reminders.css';

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
  // State management for reminders, loading state, errors, and notifications
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // // Sample data for testing
  // const sampleReminders: Reminder[] = [
  //   {
  //     _id: '67dfa998d76d0a5200239d9f',
  //     title: 'Submit Wed Dev Assignment',
  //     message: 'Submit the final project for web development.',
  //     dueDate: '2025-06-10T00:00:00.000+00:00',
  //     reminderDate: '2025-06-10T00:00:00.000+00:00',
  //     isRead: false
  //   }
  // ];

  // Utility function to show temporary notifications
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Fetch reminders from the server when component mounts
  useEffect(() => {
    const fetchReminders = async () => {
      try {
        // Reset states before fetching
        setLoading(true);
        setError(null);

        // Use sample data instead of API call for testing
        // setReminders(sampleReminders);
        
        /* Uncomment this block when ready to use real API*/
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Make API request to fetch reminders
        const response = await axios.get('http://localhost:5000/api/reminders', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Validate and set reminders data
        if (response.data && Array.isArray(response.data)) {
          setReminders(response.data);
          showNotification('Reminders fetched successfully', 'success');
        } else {
          setReminders([]);
          showNotification('Reminders fetched unsuccessfull', 'unsuccess');
        }
        
      } catch (error: any) {
        console.error('Error fetching reminders:', error);
        setError(error.response?.data?.error || 'Failed to fetch reminders');
        showNotification('Failed to fetch reminders', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();
  }, []);

  // Function to mark a reminder as read
  const markAsRead = async (id: string) => {
    try {
      // For testing with sample data
      setReminders(reminders.map(r => 
        r._id === id ? { ...r, isRead: true } : r
      ));
      showNotification('Marked as read', 'success');

      /* Uncomment this block when ready to use real API
      const token = localStorage.getItem('token');
      // Make API request to update reminder status
      await axios.put(`http://localhost:5000/api/reminders/${id}/mark-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      */
    } catch (error: any) {
      console.error('Error marking reminder as read:', error);
      showNotification(error.response?.data?.error || 'Failed to mark reminder as read', 'error');
    }
  };

  // Show error state if there's an error
  if (error) {
    return (
      <div className="reminders-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  // Show loading state while fetching data
  if (loading) {
    return <div className="reminders-container">Loading...</div>;
  }

  // Render the main component
  return (
  <div className="reminders-container">
    {notification && (
      <div className={`notification ${notification.type}`}>
        {notification.message}
      </div>
    )}
    <header>
      <h1 className="reminders-title">
        <span>📅</span> Your Reminders
      </h1>
    </header>
    
    <main className="reminders-list">
      {reminders.length > 0 ? (
        reminders.map(reminder => (
          <article
            key={reminder._id}
            className={`reminder-item ${!reminder.isRead ? 'unread' : ''}`}
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
          </article>
        ))
      ) : (
        <div className="empty-state">
          <span className="empty-icon">📌</span>
          <h2>No Reminders</h2>
          <p>You're all caught up! Check back later for new reminders.</p>
        </div>
      )}
    </main>
  </div>
);

};

export default Reminders;
