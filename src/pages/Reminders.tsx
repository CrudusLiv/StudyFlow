import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Reminders</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {reminders.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {reminders.map(reminder => (
              <div
                key={reminder._id}
                className={`p-4 transition-colors ${
                  !reminder.isRead 
                    ? 'bg-yellow-50 dark:bg-yellow-900/20' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-grow">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {reminder.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {reminder.message}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400 space-x-4">
                      <span>Due: {new Date(reminder.dueDate).toLocaleDateString()}</span>
                      <span>Reminder: {new Date(reminder.reminderDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {!reminder.isRead && (
                    <button
                      onClick={() => markAsRead(reminder._id)}
                      className="ml-4 px-3 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No reminders available
          </div>
        )}
      </div>
    </div>
  );
};

export default Reminders;
