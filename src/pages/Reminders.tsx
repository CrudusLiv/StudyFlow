import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/pages/Reminders.css';

interface Reminder {
  _id: string;
  title: string;
  message: string;
  dueDate: string;
  reminderDate: string;
  isRead: boolean;
  assignmentId: {
    _id: string;
    title: string;
  };
}

const Reminders: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/reminders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReminders(response.data);
      } catch (error) {
        console.error('Error fetching reminders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/reminders/${id}/mark-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReminders(reminders.map(r => 
        r._id === id ? { ...r, isRead: true } : r
      ));
    } catch (error) {
      console.error('Error marking reminder as read:', error);
    }
  };

  if (loading) {
    return <div className="reminders-container">Loading...</div>;
  }

  return (
    <div className="reminders-container">
      <h1 className="reminders-title">Reminders</h1>
      
      <div className="reminders-list">
        {reminders.length > 0 ? (
          reminders.map(reminder => (
            <div
              key={reminder._id}
              className={`reminder-item ${!reminder.isRead ? 'unread' : ''}`}
            >
              <div className="reminder-content">
                <div className="reminder-info">
                  <h3 className="reminder-title">{reminder.title}</h3>
                  <p className="reminder-message">{reminder.message}</p>
                  <div className="reminder-meta">
                    <span>Due: {new Date(reminder.dueDate).toLocaleDateString()}</span>
                    <span>Reminder: {new Date(reminder.reminderDate).toLocaleDateString()}</span>
                  </div>
                </div>
                {!reminder.isRead && (
                  <button
                    onClick={() => markAsRead(reminder._id)}
                    className="mark-read-button"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            No reminders available
          </div>
        )}
      </div>
    </div>
  );
};

export default Reminders;
