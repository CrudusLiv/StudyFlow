import axios from 'axios';
import { ClassData } from '../types/types';

const BASE_URL = 'http://localhost:5000/api/schedule';

export const scheduleService = {
  /**
   * Fetch all classes for the current user
   * @returns {Promise<Array>} The array of class objects
   */
  async fetchClasses() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${BASE_URL}/classes`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Raw API response from fetchClasses:', response.data);
      
      // Return the array directly - the server is already returning the correct format
      return response.data;
    } catch (error) {
      console.error('Error fetching classes:', error);
      // Return empty array on error instead of throwing
      return [];
    }
  },

  /**
   * Add a new class
   * @param {ClassData} classData - The class data to add
   * @returns {Promise<Object>} The response including the new class and all classes
   */
  async addClass(classData: ClassData) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(`${BASE_URL}/classes`, classData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error adding class:', error);
      throw error;
    }
  },
  
  /**
   * Process uploaded PDF files
   * @param {File[]} files - Array of PDF files to process
   * @param {Object} options - Additional options like preferences
   * @returns {Promise<Array>} Generated schedule
   */
  async processUploadedPDFs(files, options = {}) {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      // Add files to form data - all files are assignments
      files.forEach((file, index) => {
        formData.append('files', file);
        // Add file metadata with assignment type for all files
        formData.append(`fileMetadata[${index}]`, JSON.stringify({
          name: file.name,
          documentType: 'assignment' // Always set as assignment
        }));
      });

      // Add enhanced user preferences for cognitive optimization
      try {
        const cachedPrefs = this.getCachedPreferences();
        const preferences = options.preferences || cachedPrefs || this.getDefaultPreferences();
        
        // Enhance with cognitive factors if not present
        if (!preferences.cognitiveLoadFactors) {
          preferences.cognitiveLoadFactors = {
            exam: 1.5,
            project: 1.3,
            assignment: 1.0,
            reading: 0.8,
            homework: 1.1,
            presentation: 1.3,
            lab: 1.2
          };
        }
        
        if (!preferences.spacingPreference) {
          preferences.spacingPreference = 'moderate';
        }
        
        if (!preferences.productiveTimeOfDay) {
          // Use morning as default if not specified
          preferences.productiveTimeOfDay = 'morning';
        }
        
        if (!preferences.procrastinationProfile) {
          preferences.procrastinationProfile = 'moderate';
        }
        
        formData.append('preferences', JSON.stringify(preferences));
        console.log('Using enhanced cognitive preferences for schedule generation');
      } catch (error) {
        console.warn('Error adding preferences to form data:', error);
      }
      
      // Include class schedule data for conflict avoidance
      try {
        const classSchedule = localStorage.getItem('scheduleRawClasses');
        if (classSchedule) {
          formData.append('classSchedule', classSchedule);
        }
      } catch (error) {
        console.warn('Error adding class schedule to form data:', error);
      }

      // Add document type and cognitive optimization flags
      formData.append('documentType', 'assignment');
      formData.append('enableCognitiveOptimization', 'true');

      const response = await axios.post(`${BASE_URL}/process-pdfs`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data && response.data.studySchedule) {
        // Cache the generated schedule
        localStorage.setItem('generatedStudySchedule', JSON.stringify(response.data.studySchedule));
        return response.data.studySchedule;
      }
      
      throw new Error('No study schedule returned from server');
    } catch (error) {
      console.error('Error processing PDFs:', error);
      throw error;
    }
  },

  /**
   * Get user preferences
   */
  async getUserPreferences() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, returning default preferences');
        return this.getDefaultPreferences();
      }

      // Add token debug logging (only for development, remove in production)
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        console.log('Token payload for debug:', {
          hasId: !!tokenPayload.id,
          hasUserId: !!tokenPayload.userId,
          has_id: !!tokenPayload._id,
          fields: Object.keys(tokenPayload).join(', ')
        });
      } catch (e) {
        console.warn('Could not decode token for debug:', e);
      }

      const response = await axios.get(`${BASE_URL}/preferences`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // If we have preferences from the server, return them
      if (response.data && response.data.preferences) {
        console.log('Successfully loaded user preferences from server');
        return response.data.preferences;
      } else {
        // If no preferences in response, return defaults
        console.log('No preferences in response, using defaults');
        return this.getDefaultPreferences();
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      
      // On authentication error, try clearing the token
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.warn('Authentication error (401) when fetching preferences, token may be invalid');
        // Optionally refresh the token or redirect to login
        // window.location.href = '/login';
      }
      
      // Fall back to default preferences
      return this.getDefaultPreferences();
    }
  },

  /**
   * Get default user preferences
   */
  getDefaultPreferences() {
    return {
      studyHoursPerDay: 4,
      preferredStudyTimes: ['morning', 'evening'],
      breakDuration: 15,
      longBreakDuration: 30,
      sessionsBeforeLongBreak: 4,
      weekendStudy: true,
      preferredSessionLength: 2,
      wakeUpTime: '08:00',
      sleepTime: '23:00',
      preferredStudyDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      minimumDaysBetweenSessions: 1,
      preferSpacedRepetition: true
    };
  },

  /**
   * Update user preferences for study schedule generation
   */
  async updateUserPreferences(preferences: any) {
    try {
      const token = localStorage.getItem('token');
      
      // Always store preferences locally first as a backup
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      console.log('Preferences saved locally as backup');
      
      // If no token, just return the locally saved preferences
      if (!token) {
        console.warn('No authentication token found, saving preferences locally only');
        return preferences;
      }

      console.log('Updating preferences on server:', preferences);
      
      // Make a shallow copy to avoid modifying the original object
      const preferencesToSend = { ...preferences };
      
      // Remove any undefined or null values
      Object.keys(preferencesToSend).forEach(key => {
        if (preferencesToSend[key] === undefined || preferencesToSend[key] === null) {
          delete preferencesToSend[key];
        }
      });

      try {
        const response = await axios.post(`${BASE_URL}/preferences`, preferencesToSend, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Preferences updated on server successfully');
        if (response.data && response.data.preferences) {
          return response.data.preferences;
        }
        
        // If server doesn't return preferences, return the local ones
        return preferences;
      } catch (err: any) {
        // Handle auth errors gracefully
        console.error('Error updating preferences on server:', err.response?.data?.error || err.message);
        console.log('Using locally saved preferences instead');
        
        // Return locally saved preferences instead of throwing error
        return preferences;
      }
    } catch (error) {
      console.error('Error in updateUserPreferences:', error);
      // Return local preferences as fallback
      return preferences;
    }
  }
};
