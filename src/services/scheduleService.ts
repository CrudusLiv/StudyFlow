import axios from 'axios';
import { ClassData } from '../types/types';

const BASE_URL = 'http://localhost:5000/api/schedule';
const API_URL = 'http://localhost:5000/api';

// Add schedule interface
interface SavedSchedule {
  id: string;
  createdAt: string;
  title: string;
  assignmentCount: number;
  classCount: number;
  fileCount: number;
}

// Add schedule data interface
interface ScheduleData {
  id: string;
  userId: string;
  schedule: any[];
  metadata: any;
}

/**
 * Fetch the most recent saved schedule
 */
export async function fetchMostRecentSchedule() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.get('http://localhost:5000/api/schedules/recent', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching recent schedule:', error);
    
    // Try to load from localStorage as fallback
    try {
      const localSchedule = localStorage.getItem('recentSchedule');
      if (localSchedule) {
        return JSON.parse(localSchedule);
      }
    } catch (localError) {
      console.error('Error loading local schedule:', localError);
    }
    
    return null;
  }
}

export const scheduleService = {
  /**
   * Fetch class schedules for the current user
   * @returns Promise with class schedule data
   */
  async fetchClasses(): Promise<any[]> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.get(`${API_URL}/schedule/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Fetched classes response:', response.data);
      
      // If the response itself is an array, return it directly
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      // Sometimes the API might wrap the array in a data property
      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      // Otherwise, the response itself is what we want
      return response.data;
    } catch (error) {
      console.error('Error fetching classes:', error);
      // Return empty array instead of null to prevent errors
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
   * Fetch all saved schedules for the current user
   * @returns Promise with array of saved schedules
   */
  async fetchSavedSchedules(): Promise<SavedSchedule[]> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.get(`${API_URL}/schedule/schedules`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Fetched saved schedules:', response.data);
      return response.data.schedules || [];
    } catch (error) {
      console.error('Error fetching saved schedules:', error);
      return [];
    }
  },

  /**
   * Fetch a specific schedule by ID
   * @param scheduleId The ID of the schedule to fetch
   * @returns Promise with schedule data
   */
  async fetchScheduleById(scheduleId: string): Promise<ScheduleData | null> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.get(`${API_URL}/schedule/schedules/${scheduleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Add debug logging to see what's in the response
      console.log(`Schedule data received for ID ${scheduleId}:`, {
        hasData: !!response.data,
        hasSchedule: !!response.data?.schedule,
        itemCount: response.data?.schedule?.length || 0
      });

      // Convert string dates back to Date objects in schedule items
      if (response.data.schedule && Array.isArray(response.data.schedule)) {
        response.data.schedule = response.data.schedule.map(item => ({
          ...item,
          start: item.start ? new Date(item.start) : undefined,
          end: item.end ? new Date(item.end) : undefined,
          // Make sure resource properties are preserved
          resource: item.resource ? {
            ...item.resource,
            // Fix any dates in resource
            dueDate: item.resource.dueDate ? new Date(item.resource.dueDate) : undefined,
            // Make sure these critical properties are preserved
            taskDetails: item.resource.taskDetails || {},
            pdfDetails: item.resource.pdfDetails || {},
            sourceFile: item.resource.sourceFile || ''
          } : {}
        }));
      }

      // Save this fetched schedule to localStorage for redundancy
      if (response.data && response.data.schedule) {
        console.log('Saving fetched schedule to localStorage');
        localStorage.setItem('lastFetchedSchedule', JSON.stringify(response.data));
      }

      return response.data;
    } catch (error) {
      console.error(`Error fetching schedule ${scheduleId}:`, error);
      
      // Try to retrieve from localStorage as backup
      try {
        const cachedSchedule = localStorage.getItem('lastFetchedSchedule');
        if (cachedSchedule) {
          const parsedSchedule = JSON.parse(cachedSchedule);
          console.log('Retrieved schedule from localStorage backup');
          return parsedSchedule;
        }
      } catch (cacheError) {
        console.error('Error retrieving cached schedule:', cacheError);
      }
      
      return null;
    }
  },

  /**
   * Fetch the most recent schedule
   * @returns Promise with the most recent schedule
   */
  async fetchMostRecentSchedule(): Promise<ScheduleData | null> {
    try {
      const schedules = await this.fetchSavedSchedules();
      
      if (!schedules || schedules.length === 0) {
        return null;
      }
      
      // Get first schedule (should be the most recent)
      const mostRecentId = schedules[0].id;
      console.log('Fetching most recent schedule with ID:', mostRecentId);
      
      return await this.fetchScheduleById(mostRecentId);
    } catch (error) {
      console.error('Error fetching most recent schedule:', error);
      return null;
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
  },
  
  // Add the standalone fetchMostRecentSchedule function to the object
  fetchMostRecentSchedule
};
