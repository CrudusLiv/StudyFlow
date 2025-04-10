import { useState, useEffect } from 'react';
import axios from 'axios';

interface Reminder {
  _id: string;
  title: string;
  message: string;
  reminderDate: string;
  isRead: boolean;
}

/**
 * A custom hook to fetch and track reminders
 */
const useReminderCount = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchReminders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setReminders([]);
        setCount(0);
        setLoading(false);
        return;
      }
      
      const response = await axios.get('http://localhost:5000/api/reminders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Set reminders and count based on the response
      const fetchedReminders = response.data || [];
      setReminders(fetchedReminders);
      setCount(fetchedReminders.length);
      setError(null);
    } catch (err) {
      console.error('Error fetching reminders:', err);
      setError('Failed to fetch reminders');
      setReminders([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };
  
  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      await axios.put(`http://localhost:5000/api/reminders/${id}/mark-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setReminders(prev => prev.filter(r => r._id !== id));
      setCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking reminder as read:', err);
    }
  };
  
  // Fetch on mount and set up polling
  useEffect(() => {
    fetchReminders();
    
    // Set up polling every minute
    const intervalId = setInterval(fetchReminders, 60000); // 1 minute
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, []);
  
  return { 
    reminders,
    count, 
    loading, 
    error, 
    refresh: fetchReminders,
    markAsRead 
  };
};

export default useReminderCount;
