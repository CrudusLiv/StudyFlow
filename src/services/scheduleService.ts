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
      
      // Ensure we always return an array, even if the API returns an object with a data property
      if (response.data && Array.isArray(response.data)) {
        return response.data; // Return direct array
      } else if (response.data && Array.isArray(response.data.data)) {
        return response.data.data; // Return the data array property
      } else {
        console.warn('Unexpected format in API response:', response.data);
        return []; // Return empty array as fallback
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      throw error;
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
   * @returns {Promise<Object>} User preferences
   */
  async getUserPreferences() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        return this.getDefaultPreferences();
      }

      console.log('Fetching user preferences from:', `${BASE_URL}/preferences`);
      const response = await axios.get(`${BASE_URL}/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Preferences response:', response.data);
      if (response.data && response.data.preferences) {
        // Enhance preferences with cognitive factors
        const enhancedPreferences = {
          ...response.data.preferences,
          cognitiveLoadFactors: response.data.preferences.cognitiveLoadFactors || {
            exam: 1.5,
            project: 1.3,
            assignment: 1.0,
            reading: 0.8,
            homework: 1.1,
            presentation: 1.3,
            lab: 1.2
          },
          spacingPreference: response.data.preferences.spacingPreference || 'moderate',
          productiveTimeOfDay: response.data.preferences.productiveTimeOfDay || 'morning',
          procrastinationProfile: response.data.preferences.procrastinationProfile || 'moderate'
        };
        
        // Cache enhanced preferences
        localStorage.setItem('userPreferences', JSON.stringify(enhancedPreferences));
        return enhancedPreferences;
      }
      
      return this.getDefaultPreferences();
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      
      // Get cached preferences if available
      const cachedPrefs = this.getCachedPreferences();
      if (cachedPrefs) {
        return cachedPrefs;
      }
      
      // Return default preferences as fallback
      return this.getDefaultPreferences();
    }
  },

  // Helper to get cached preferences
  getCachedPreferences() {
    try {
      const cachedPreferences = localStorage.getItem('userPreferences');
      if (cachedPreferences) {
        console.log('Using cached preferences');
        return JSON.parse(cachedPreferences);
      }
    } catch (e) {
      console.warn('Error reading cached preferences:', e);
    }
    return null;
  },

  // Helper to get default preferences with cognitive optimization factors
  getDefaultPreferences() {
    return {
      studySessionLength: 60,
      breaksEnabled: true,
      breakLength: 15,
      maxDailyStudyHours: 4,
      preferredStudyDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      preferredStudyTimeStart: '09:00',
      preferredStudyTimeEnd: '18:00',
      spacingPreference: 'moderate',
      productiveTimeOfDay: 'morning',
      procrastinationProfile: 'moderate',
      cognitiveLoadFactors: {
        exam: 1.5,
        project: 1.3,
        assignment: 1.0,
        reading: 0.8,
        homework: 1.1,
        presentation: 1.3,
        lab: 1.2
      },
      maxDailyCognitiveLoad: 5,
      learningStyle: 'balanced',
      weekendPreference: 'minimal'
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
