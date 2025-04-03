import axios from 'axios';
import { authService } from './authService';

const API_URL = 'http://localhost:5000';

export interface Assignment {
  _id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  progress: number;
}

export interface NewAssignment {
  title: string;
  description: string;
  dueDate: string;
}

export const assignmentService = {
  /**
   * Get all assignments
   */
  async getAssignments() {
    try {
      if (!authService.isLoggedIn()) {
        throw new Error('User not authenticated');
      }
      
      const authAxios = authService.getAuthAxios();
      const response = await authAxios.get(`${API_URL}/assignments`);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching assignments:', error);
      authService.handleAuthError(error);
      throw error;
    }
  },
  
  /**
   * Create a new assignment
   */
  async createAssignment(assignment: NewAssignment) {
    try {
      if (!authService.isLoggedIn()) {
        throw new Error('User not authenticated');
      }
      
      const authAxios = authService.getAuthAxios();
      
      // Create the assignment
      const response = await authAxios.post(`${API_URL}/assignments`, assignment);
      
      // Check if the assignment is due within a week, and create a reminder if so
      const dueDate = new Date(assignment.dueDate);
      const today = new Date();
      const oneWeekFromNow = new Date(today);
      oneWeekFromNow.setDate(today.getDate() + 7);
      
      if (dueDate <= oneWeekFromNow) {
        try {
          // Create a reminder for this assignment
          await authAxios.post(`${API_URL}/api/reminders`, {
            assignmentId: response.data._id,
            title: `Upcoming: ${assignment.title}`,
            message: `Your assignment "${assignment.title}" is due soon`,
            dueDate: assignment.dueDate,
            reminderDate: new Date().toISOString(),
          });
          
          // Add notification
          this.sendNotification(`New assignment due ${this.formatRelativeDate(assignment.dueDate)}`, assignment.title);
        } catch (reminderError) {
          console.error('Error creating reminder for assignment:', reminderError);
          // Continue even if reminder creation fails
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Error creating assignment:', error);
      authService.handleAuthError(error);
      throw error;
    }
  },
  
  // Helper function to format relative date for notifications
  formatRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'tomorrow';
    } else {
      // Calculate days difference
      const diffTime = Math.abs(date.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `in ${diffDays} days`;
    }
  },
  
  // Function to send a notification to the notification system
  async sendNotification(title: string, body: string) {
    try {
      const authAxios = authService.getAuthAxios();
      await authAxios.post(`${API_URL}/api/notifications`, {
        title,
        body,
        type: 'assignment'
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      // Continue even if notification fails
    }
  },
  
  /**
   * Update an existing assignment
   */
  async updateAssignment(id: string, assignment: Partial<Assignment>) {
    try {
      if (!authService.isLoggedIn()) {
        throw new Error('User not authenticated');
      }
      
      const authAxios = authService.getAuthAxios();
      const response = await authAxios.put(`${API_URL}/assignments/${id}`, assignment);
      
      return response.data;
    } catch (error) {
      console.error('Error updating assignment:', error);
      authService.handleAuthError(error);
      throw error;
    }
  },
  
  /**
   * Delete an assignment
   */
  async deleteAssignment(id: string) {
    try {
      if (!authService.isLoggedIn()) {
        throw new Error('User not authenticated');
      }
      
      const authAxios = authService.getAuthAxios();
      const response = await authAxios.delete(`${API_URL}/assignments/${id}`);
      
      return response.data;
    } catch (error) {
      console.error('Error deleting assignment:', error);
      authService.handleAuthError(error);
      throw error;
    }
  },
  
  /**
   * Toggle assignment completion status
   */
  async toggleComplete(assignment: Assignment) {
    try {
      if (!authService.isLoggedIn()) {
        throw new Error('User not authenticated');
      }
      
      const updatedAssignment = {
        ...assignment,
        completed: !assignment.completed,
        progress: assignment.completed ? 0 : 100
      };
      
      const authAxios = authService.getAuthAxios();
      const response = await authAxios.put(
        `${API_URL}/assignments/${assignment._id}`,
        updatedAssignment
      );
      
      return response.data;
    } catch (error) {
      console.error('Error toggling assignment completion:', error);
      authService.handleAuthError(error);
      throw error;
    }
  }
};
