import axios from 'axios';
import { authService } from './authService';
import { scheduleService } from './scheduleService';

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

/**
 * Fetch assignments from API
 */
export const fetchAssignments = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get('http://localhost:5000/assignments', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }
};

/**
 * Fetch assignments from schedule data
 */
export const fetchAssignmentsFromSchedule = async () => {
  try {
    // First try to fetch the most recent schedule
    const recentSchedule = await scheduleService.fetchMostRecentSchedule();
    
    if (recentSchedule && recentSchedule.schedule && recentSchedule.schedule.length > 0) {
      console.log(`Found ${recentSchedule.schedule.length} schedule events to convert to assignments`);
      
      // Filter events that can be considered assignments (tasks, assignments, studies)
      const assignmentEvents = recentSchedule.schedule.filter(event => 
        ['task', 'study', 'assignment'].includes(event.category) ||
        (event.resource && ['task', 'study', 'assignment'].includes(event.resource.type))
      );
      
      console.log(`Filtered ${assignmentEvents.length} assignment-like events`);
      
      // Transform events to assignment format
      return assignmentEvents.map(event => ({
        _id: event.id || `event-${Math.random().toString(36).substring(2)}`,
        title: event.title,
        description: event.description || 
                    (event.resource && event.resource.description) || 
                    `Task related to ${event.courseCode || 'course'}`,
        startDate: typeof event.start === 'string' ? event.start : new Date(event.start).toISOString(),
        dueDate: typeof event.end === 'string' ? event.end : new Date(event.end).toISOString(),
        progress: calculateProgressFromEvent(event),
        completed: event.status === 'completed' || 
                  (event.resource && event.resource.status === 'completed')
      }));
    }
    
    // If no schedule found, try to fetch classes
    const classes = await scheduleService.fetchClasses();
    
    if (classes && classes.length > 0) {
      console.log(`Found ${classes.length} classes to convert to assignments`);
      
      // Transform classes to assignment format (as course milestones)
      return classes.map((cls, index) => ({
        _id: cls._id || `class-${index}-${Math.random().toString(36).substring(2)}`,
        title: `${cls.courseCode || 'Course'} - Complete Module ${index + 1}`,
        description: `Track your progress in ${cls.courseName || 'this course'}`,
        startDate: cls.semesterDates?.startDate || new Date().toISOString(),
        dueDate: cls.semesterDates?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        progress: 0,
        completed: false,
        courseCode: cls.courseCode
      }));
    }
    
    // If no data found, return empty array
    return [];
  } catch (error) {
    console.error('Error fetching assignments from schedule:', error);
    return []; // Return empty array, tracker will use example data
  }
};

/**
 * Calculate progress percentage for an event
 */
function calculateProgressFromEvent(event) {
  // If the event has explicit progress, use it
  if (typeof event.progress === 'number') {
    return event.progress;
  }
  
  if (event.resource && typeof event.resource.progress === 'number') {
    return event.resource.progress;
  }
  
  // If the event is completed, return 100%
  if (event.status === 'completed' || 
      (event.resource && event.resource.status === 'completed')) {
    return 100;
  }
  
  // If the event is in progress, return 50%
  if (event.status === 'in-progress' || 
      (event.resource && event.resource.status === 'in-progress')) {
    return 50;
  }
  
  // Calculate progress based on time elapsed
  try {
    const now = new Date().getTime();
    const start = new Date(event.start).getTime();
    const end = new Date(event.end).getTime();
    
    // If the event is in the future, return 0%
    if (now < start) return 0;
    
    // If the event is in the past, return 90% (not fully complete without confirmation)
    if (now > end) return 90;
    
    // Calculate progress as percentage of time elapsed
    const totalDuration = end - start;
    const elapsed = now - start;
    return Math.min(90, Math.round((elapsed / totalDuration) * 100));
  } catch (error) {
    console.warn('Error calculating progress:', error);
    return 0; // Default to 0% if calculation fails
  }
}
