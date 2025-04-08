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
      
      // Extract course codes from filenames and PDF content
      const extractedCourseCodes = files.map(file => {
        const courseCodeMatch = file.name.match(/\b([A-Z]{2,}[-\s]?[A-Z0-9]*\d{3}[A-Z0-9]*)\b/i);
        return courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null;
      }).filter(Boolean);
      
      if (extractedCourseCodes.length > 0) {
        console.log('Extracted course codes from filenames:', extractedCourseCodes);
        formData.append('courseCodes', JSON.stringify(extractedCourseCodes));
      }
      
      // Get class schedule data for better due date estimation
      try {
        const classScheduleJson = localStorage.getItem('scheduleRawClasses');
        if (classScheduleJson) {
          const classSchedule = JSON.parse(classScheduleJson);
          console.log('Adding class schedule data for due date estimation');
          formData.append('classSchedule', JSON.stringify(classSchedule));
        }
      } catch (e) {
        console.error('Error parsing class schedule:', e);
      }
      
      // Add PDF metadata with extracted assignment details
      formData.append('extractAssignmentDetails', 'true');
      
      // Get user preferences to send with request
      const userPreferences = localStorage.getItem('userPreferences');
      const preferences = userPreferences ? JSON.parse(userPreferences) : {};
      
      // Add user preferences if they exist
      const preferenceJson = localStorage.getItem('userPreferences');
      if (preferenceJson) {
        const preferences = JSON.parse(preferenceJson);
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
        console.log('Added user preferences to request');
      }
      
      console.log('Sending PDF files for processing with preferences and extracted course codes');
      
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
      
      // Save the generated schedule explicitly to the document
      if (response.data.studySchedule && response.data.documentId) {
        try {
          await this.saveScheduleToDocument(response.data.documentId, response.data.studySchedule);
          console.log('Schedule successfully saved to document:', response.data.documentId);
        } catch (saveError) {
          console.error('Error saving schedule to document:', saveError);
        }
      }
      
      // Standardize the response format
      return {
        success: true,
        schedule: response.data.studySchedule || [], 
        message: response.data.message || 'Schedule generated successfully',
        documentId: response.data.documentId
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
   * Generate a schedule from a stored PDF document
   */
  async generateScheduleFromStoredPDF(documentId: string) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await axios.post(
        `${API_URL}/pdf-documents/${documentId}/generate-schedule`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      return {
        success: true,
        schedule: response.data.schedule || [],
        documentId: response.data.documentId,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error generating schedule from stored PDF:', error);
      
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to generate schedule',
        message: 'Error generating schedule from stored PDF'
      };
    }
  },
  
  /**
   * Download a stored PDF document
   */
  async downloadPDF(documentId: string) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await axios.get(`${API_URL}/parse/pdf/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `document-${documentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return true;
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },
  
  /**
   * Save generated schedule to a PDF document
   */
  async saveScheduleToDocument(documentId: string, schedule: any[]) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Ensure we have a valid document ID
      if (!documentId) {
        throw new Error('Document ID is required');
      }
      
      console.log(`Saving schedule with ${schedule.length} events to document ${documentId}`);
      
      // Create a copy of the schedule with dates converted to ISO strings
      // to avoid date serialization issues
      const preparedSchedule = schedule.map(item => ({
        ...item,
        start: item.start instanceof Date ? item.start.toISOString() : item.start,
        end: item.end instanceof Date ? item.end.toISOString() : item.end
      }));

      // Check if payload is larger than 1MB
      const estimatedSize = JSON.stringify(preparedSchedule).length;
      if (estimatedSize > 1000000) { // 1MB
        console.log(`Large schedule detected (${Math.round(estimatedSize/1024)}KB). Using optimized saving method.`);
        
        // Remove verbose data to reduce payload size
        const lightweightSchedule = preparedSchedule.map(item => ({
          id: item.id,
          title: item.title,
          start: item.start,
          end: item.end,
          category: item.category,
          priority: item.priority,
          courseCode: item.courseCode,
          // Include only essential resource data
          resource: item.resource ? {
            type: item.resource.type,
            courseCode: item.resource.courseCode,
            stage: item.resource.stage,
            sourceFile: item.resource.sourceFile
          } : {}
        }));
        
        // Send to separate PDF document endpoint to avoid route conflicts
        const response = await axios.post(
          `${API_URL}/pdf-documents/${documentId}/schedule-optimized`,
          { schedule: lightweightSchedule },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        console.log('Schedule saved successfully (optimized):', response.data);
        return response.data;
      } else {
        // Send to separate PDF document endpoint to avoid route conflicts
        const response = await axios.post(
          `${API_URL}/pdf-documents/${documentId}/schedule`,
          { schedule: preparedSchedule },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        console.log('Schedule saved successfully:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('Error saving schedule to document:', error);
      
      // Handle specific error cases
      if (axios.isAxiosError(error) && error.response?.status === 413) {
        console.error('Payload too large. Try reducing the schedule size or use the optimized endpoint.');
        // Fallback to local storage if server can't handle it
        try {
          localStorage.setItem(`schedule_${documentId}`, JSON.stringify(schedule));
          return { 
            message: 'Schedule saved locally due to size limitations',
            localOnly: true,
            documentId 
          };
        } catch (localError) {
          console.error('Failed to save schedule locally:', localError);
        }
      }
      
      throw error;
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
    
    console.log('Converting schedule to events format, count:', schedule.length);
    
    return schedule.map(item => {
      // Ensure start and end are Date objects
      let start, end;
      try {
        start = new Date(item.start || item.startTime);
        // If end time is missing, create a default 1-hour event
        end = item.end || item.endTime ? 
          new Date(item.end || item.endTime) : 
          new Date(start.getTime() + 60 * 60 * 1000);
      } catch (e) {
        console.error('Error parsing dates for item:', item, e);
        // Use fallback dates
        start = new Date();
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }
      
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
        resource: {
          ...item.resource,
          pdfDetails: item.pdfDetails || item.resource?.pdfDetails,
          assignmentData: item.assignmentData || item.resource?.assignmentData,
          sourceFile: item.sourceFile || item.resource?.sourceFile,
          assignmentTitle: item.assignmentTitle || item.resource?.assignmentTitle,
          dueDate: item.dueDate || item.resource?.dueDate,
          extractedContent: item.extractedContent || item.resource?.extractedContent,
          pageReference: item.pageReference || item.resource?.pageReference
        }
      };
    });
  }
};
