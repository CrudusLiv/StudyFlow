import axios from 'axios';

const API_URL = 'http://localhost:5000';

export const reminderService = {
  /**
   * Fetches all active reminders for the current user
   */
  async getReminders() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.get(`${API_URL}/api/reminders`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Reminders fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching reminders:', error);
      throw error;
    }
  },

  /**
   * Marks a reminder as read
   * @param id The ID of the reminder to mark as read
   */
  async markAsRead(id: string) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.put(`${API_URL}/api/reminders/${id}/mark-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return response.data;
    } catch (error) {
      console.error('Error marking reminder as read:', error);
      throw error;
    }
  }
};
