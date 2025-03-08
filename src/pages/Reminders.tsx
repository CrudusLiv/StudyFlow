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

  // Add this mock data for testing purposes
  const exampleReminders: Reminder[] = [
    {
      _id: '1',
      title: 'Complete Math Assignment',
      message: 'Don\'t forget to submit your calculus homework',
      dueDate: '2024-02-15T23:59:59',
      reminderDate: '2024-02-14T18:00:00',
      isRead: false,
      assignmentId: {
        _id: 'math101',
        title: 'Calculus Chapter 5'
      }
    },
    {
      _id: '2',
      title: 'Physics Lab Report',
      message: 'Write up the results from today\'s experiment',
      dueDate: '2024-02-16T23:59:59',
      reminderDate: '2024-02-15T10:00:00',
      isRead: true,
      assignmentId: {
        _id: 'phys202',
        title: 'Wave Motion Lab'
      }
    },
    {
      _id: '3',
      title: 'Group Project Meeting',
      message: 'Team meeting for final presentation prep',
      dueDate: '2024-02-17T15:00:00',
      reminderDate: '2024-02-16T09:00:00',
      isRead: false,
      assignmentId: {
        _id: 'proj303',
        title: 'Final Presentation'
      }
    }
  ];

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        // Comment out or remove the API call for testing with mock data
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/reminders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReminders(response.data);
        
        // Use example data for testing purposes
        setReminders(exampleReminders);

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
                    {reminder.assignmentId.title}: {reminder.title}
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
                    <span>📚 Course:</span> {reminder.assignmentId.title}
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
