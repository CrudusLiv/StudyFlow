import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const pdfService = {
  /**
   * Upload and parse a PDF file
   */
  async uploadAndParsePDF(file: File) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await axios.post(
        `${API_URL}/parse-pdf`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error uploading PDF:', error);
      throw error;
    }
  },
  
  /**
   * Get all PDF documents for the current user
   */
  async getPDFDocuments() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await axios.get(
        `${API_URL}/pdf-documents`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching PDF documents:', error);
      throw error;
    }
  },
  
  /**
   * Get a specific PDF document by ID
   */
  async getPDFDocument(documentId: string) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await axios.get(
        `${API_URL}/pdf-documents/${documentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching PDF document:', error);
      throw error;
    }
  },
  
  /**
   * Generate a schedule from PDF files
   */
  async generateSchedule(files: File[]) {
    try {
      // Log the files being sent
      console.log(`Sending ${files.length} PDF files for processing:`, 
        files.map(f => ({ name: f.name, size: f.size }))
      );

      const formData = new FormData();
      
      // Ensure all files are appended with the same key name
      files.forEach((file, index) => {
        formData.append('files', file);
        console.log(`Added file ${index + 1}/${files.length}: ${file.name} (${file.size} bytes)`);
      });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Get user preferences to send with request
      const userPreferences = localStorage.getItem('userPreferences');
      const preferences = userPreferences ? JSON.parse(userPreferences) : {};
      
      // Add preferences to form data if available
      if (Object.keys(preferences).length > 0) {
        formData.append('preferences', JSON.stringify(preferences));
        console.log('Added user preferences to request');
      }
      
      console.log('Sending PDF files for processing with preferences');
      
      // Updated endpoint to match the backend route
      const response = await axios.post(
        `${API_URL}/schedule/process-pdfs`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
          // Add longer timeout for multiple files
          timeout: 120000 // 2 minutes
        }
      );
      
      // Log successful response for debugging
      console.log('Schedule generation successful:', {
        status: response.status,
        hasStudySchedule: !!response.data?.studySchedule,
        eventsCount: response.data?.studySchedule?.length || 0,
        filesProcessed: response.data?.message
      });
      
      return {
        success: true,
        schedule: response.data.studySchedule || [],
        message: response.data.message || 'Schedule generated successfully'
      };
    } catch (error: any) {
      console.error('Error generating schedule:', error);
      
      // Return structured error response
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        message: 'Failed to generate schedule from PDFs'
      };
    }
  },
  
  /**
   * Convert server schedule format to calendar events
   */
  convertScheduleToEvents(schedule: any[]) {
    if (!Array.isArray(schedule) || schedule.length === 0) {
      console.warn('No schedule data to convert to events');
      return [];
    }
    
    return schedule.map(item => {
      // Ensure start and end are Date objects
      const start = new Date(item.start || item.startTime);
      const end = new Date(item.end || item.endTime || start.getTime() + 60*60*1000);
      
      return {
        id: item.id || `event-${Math.random().toString(36).substring(2)}`,
        title: item.title || 'Study Session',
        start,
        end,
        allDay: item.allDay || false,
        category: item.category || 'study',
        priority: item.priority || 'medium',
        description: item.description || '',
        courseCode: item.courseCode || '',
        location: item.location || '',
        resource: item.resource || {}
      };
    });
  }
};
