import { authService } from './authService';

const API_URL = 'http://localhost:5000';

export interface Reminder {
  _id: string;
  assignmentId: string;
  title: string;
  message: string;
  dueDate: string;
  reminderDate: string;
  isRead: boolean;
}

export const reminderService = {
  /**
   * Get all reminders for the current user
   */
  async getReminders() {
    try {
      if (!authService.isLoggedIn()) {
        throw new Error('User not authenticated');
      }
      
      const authAxios = authService.getAuthAxios();
      const response = await authAxios.get(`${API_URL}/api/reminders`);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching reminders:', error);
      authService.handleAuthError(error);
      throw error;
    }
  },
  
  /**
   * Mark a reminder as read
   */
  async markAsRead(id: string) {
    try {
      if (!authService.isLoggedIn()) {
        throw new Error('User not authenticated');
      }
      
      const authAxios = authService.getAuthAxios();
      const response = await authAxios.put(`${API_URL}/api/reminders/${id}/mark-read`, {});
      
      return response.data;
    } catch (error) {
      console.error('Error marking reminder as read:', error);
      authService.handleAuthError(error);
      throw error;
    }
  },
  
  /**
   * Create a new reminder
   */
  async createReminder(reminder: {
    assignmentId: string;
    title: string;
    message: string;
    dueDate: string;
    reminderDate: string;
  }) {
    try {
      if (!authService.isLoggedIn()) {
        throw new Error('User not authenticated');
      }
      
      const authAxios = authService.getAuthAxios();
      const response = await authAxios.post(`${API_URL}/api/reminders`, reminder);
      
      return response.data;
    } catch (error) {
      console.error('Error creating reminder:', error);
      authService.handleAuthError(error);
      throw error;
    }
  },
  
  /**
   * Generate automatic reminders for assignments due within a week
   */
  async generateRemindersForUpcomingAssignments(assignments: any[]) {
    try {
      if (!authService.isLoggedIn()) {
        throw new Error('User not authenticated');
      }
      
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
      
      // Filter assignments due within a week
      const upcomingAssignments = assignments.filter(assignment => {
        if (assignment.completed) return false;
        
        const dueDate = new Date(assignment.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return dueDate >= today && dueDate <= oneWeekFromNow;
      });
      
      // Create reminders for each upcoming assignment
      const createPromises = upcomingAssignments.map(assignment => 
        this.createReminder({
          assignmentId: assignment._id,
          title: `Upcoming: ${assignment.title}`,
          message: `Your assignment "${assignment.title}" is due soon`,
          dueDate: assignment.dueDate,
          reminderDate: new Date().toISOString(),
        }).catch(err => {
          console.error(`Failed to create reminder for assignment ${assignment._id}:`, err);
          return null;
        })
      );
      
      await Promise.all(createPromises);
      
      return upcomingAssignments.length;
    } catch (error) {
      console.error('Error generating reminders for upcoming assignments:', error);
      authService.handleAuthError(error);
      throw error;
    }
  }
};
