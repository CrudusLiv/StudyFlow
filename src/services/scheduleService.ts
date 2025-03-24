import axios from 'axios';
import { ClassData } from '../types/types';

const BASE_URL = 'http://localhost:5000/api/schedule';

export const scheduleService = {
  async fetchClasses() {
    try {
      const token = localStorage.getItem('token');
      
      // Show we're fetching data
      console.log('Fetching classes from server...');
      
      const response = await axios.get(`${BASE_URL}/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Fetched classes:', response.data);
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Cache timestamp to know when we last updated
        localStorage.setItem('scheduleLastUpdated', new Date().toISOString());
      }
      
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching classes:', error);
      
      // If we have cached classes, return those instead
      const cachedRawClasses = localStorage.getItem('scheduleRawClasses');
      if (cachedRawClasses) {
        console.log('Using cached classes due to fetch error');
        return JSON.parse(cachedRawClasses);
      }
      
      return [];
    }
  },

  async addClass(classData: ClassData) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${BASE_URL}/classes`, classData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Added class response:', response.data);
      
      // Update the cache with the new data
      if (response.data.allClasses) {
        localStorage.setItem('scheduleRawClasses', JSON.stringify(response.data.allClasses));
        localStorage.setItem('scheduleLastUpdated', new Date().toISOString());
      }
      
      return {
        newClass: response.data.class,
        allClasses: response.data.allClasses || []
      };
    } catch (error) {
      console.error('Error adding class:', error);
      throw error;
    }
  },
  
  // Clear all schedule-related cache
  clearCache() {
    localStorage.removeItem('scheduleEvents');
    localStorage.removeItem('scheduleRawClasses');
    localStorage.removeItem('scheduleClassesByDay');
    localStorage.removeItem('scheduleLastUpdated');
    console.log('Schedule cache cleared from service');
  },

  /**
   * Process uploaded PDF files and generate a study schedule
   */
  async processUploadedPDFs(files: File[], options: any = {}) {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      // Add files to form data with assignment tag
      files.forEach((file, index) => {
        formData.append('files', file);
        // Add file metadata including document type
        formData.append(`fileMetadata[${index}]`, JSON.stringify({
          name: file.name,
          documentType: file.documentType || 'assignment'
        }));
      });

      // Add user preferences to form data
      try {
        const preferences = options.preferences || 
                           JSON.parse(localStorage.getItem('userPreferences') || '{}');
        formData.append('preferences', JSON.stringify(preferences));
      } catch (error) {
        console.warn('Error adding preferences to form data:', error);
      }
      
      // Include class schedule data if available
      try {
        const classSchedule = localStorage.getItem('scheduleRawClasses');
        if (classSchedule) {
          formData.append('classSchedule', classSchedule);
          
          // Add class tag information
          const classes = JSON.parse(classSchedule);
          classes.forEach((cls: any, index: number) => {
            if (cls._id) {
              formData.append(`classMetadata[${index}]`, JSON.stringify({
                id: cls._id,
                documentType: 'class',
                courseCode: cls.courseCode || '',
                courseName: cls.courseName || ''
              }));
            }
          });
        }
      } catch (error) {
        console.warn('Error adding class schedule to form data:', error);
      }

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
   * Get user preferences for study schedule generation
   */
  async getUserPreferences() {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.preferences) {
        // Cache preferences
        localStorage.setItem('userPreferences', JSON.stringify(response.data.preferences));
        return response.data.preferences;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      
      // Try to get from localStorage if API fails
      try {
        const cachedPreferences = localStorage.getItem('userPreferences');
        if (cachedPreferences) {
          return JSON.parse(cachedPreferences);
        }
      } catch (e) {
        console.warn('Error reading cached preferences:', e);
      }
      
      return null;
    }
  },

  /**
   * Update user preferences for study schedule generation
   */
  async updateUserPreferences(preferences: any) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${BASE_URL}/preferences`, preferences, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.preferences) {
        // Update cached preferences
        localStorage.setItem('userPreferences', JSON.stringify(response.data.preferences));
        return response.data.preferences;
      }
      
      return null;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }
};
