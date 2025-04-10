import { authService } from './authService';

const API_URL = 'http://localhost:5000';

export interface NotificationCheckResult {
  checked: number;
  created: number;
  reminders: any[];
}

export const notificationService = {
  /**
   * Check for upcoming assignments and create reminders if needed
   */
  async checkUpcomingAssignments(): Promise<NotificationCheckResult> {
    try {
      if (!authService.isLoggedIn()) {
        throw new Error('User not authenticated');
      }
      
      const authAxios = authService.getAuthAxios();
      const response = await authAxios.get(`${API_URL}/api/check-upcoming-assignments`);
      
      return response.data;
    } catch (error) {
      console.error('Error checking upcoming assignments:', error);
      authService.handleAuthError(error);
      throw error;
    }
  },
  
  /**
   * Schedule periodic checks for upcoming assignments
   * @param intervalMinutes How often to check (in minutes)
   * @returns Cleanup function to stop checking
   */
  schedulePeriodicChecks(intervalMinutes = 60): () => void {
    // First check
    this.checkUpcomingAssignments().catch(err => 
      console.error('Error during periodic assignment check:', err)
    );
    
    // Schedule periodic checks
    const intervalId = setInterval(() => {
      this.checkUpcomingAssignments().catch(err => 
        console.error('Error during periodic assignment check:', err)
      );
    }, intervalMinutes * 60 * 1000);
    
    // Return cleanup function
    return () => clearInterval(intervalId);
  }
};
