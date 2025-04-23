import axios from 'axios';
import { ClassData, CalendarEvent } from '../types/types';
import { toast } from 'react-toastify';
import { ensureDateObjects } from '../utils/calendarHelpers';

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

// Add progress stats interface for tracker
export interface ProgressStats {
  totalAssignments: number;
  completedAssignments: number;
  overallProgress: number;
  timeRemaining: number;
  upcomingDeadlines: number;
}

// Add assignment interface for tracker
export interface Assignment {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  dueDate: string;
  progress: number;
  completed: boolean;
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
      
      console.log('Fetched classes raw response:', response);
      console.log('Fetched classes response type:', typeof response.data);
      
      // If the response itself is an array, return it directly
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      // Sometimes the API might wrap the array in a data property
      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      // If response.data is an object with classes property
      if (response.data && Array.isArray(response.data.classes)) {
        return response.data.classes;
      }
      
      // If it's a single class object, wrap it in an array
      if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        // Check if it looks like a class object
        if (response.data.courseName || response.data.day || response.data._id) {
          return [response.data];
        }
      }
      
      // If we reach here, we couldn't extract classes from the response
      console.warn('Unexpected response format from fetchClasses:', response.data);
      return [];
    } catch (error) {
      console.error('Error fetching classes:', error);
      // Return empty array instead of null to prevent errors
      return [];
    }
  },

  /**
   * Fetch all saved schedules for the current user
   * @returns Promise with saved schedules metadata
   */
  async fetchSavedSchedules(): Promise<SavedSchedule[]> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.get(`${API_URL}/schedule/schedules`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Sort by creation date, newest first
      return response.data.schedules.sort((a: SavedSchedule, b: SavedSchedule) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error fetching saved schedules:', error);
      return [];
    }
  },

  // Add a function to cache the schedule
  cacheSchedule(schedule: any) {
    try {
      localStorage.setItem('currentSchedule', JSON.stringify(schedule));
    } catch (error) {
      console.error('Error caching schedule:', error);
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

      // First, get system-wide semester dates
      const semesterDates = await this.getSemesterDates();
      if (!semesterDates) {
        toast.warning('Semester dates not set. Please set semester dates first.');
        throw new Error('Semester dates not set');
      }

      // Include semester dates in the class data
      const classDataWithDates = {
        ...classData,
        // No need to add semesterDates here, the backend will use the system-wide dates
      };

      const response = await axios.post(`${API_URL}/classes`, classDataWithDates, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Trigger a custom event for updating schedule
      window.dispatchEvent(new CustomEvent('scheduleUpdated'));
      
      return response.data;
    } catch (error) {
      console.error('Error adding class:', error);
      throw error;
    }
  },

  /**
   * Update an existing class
   * @param {ClassData} classData - The class data to update
   * @returns {Promise<Object>} The response including the updated class
   */
  async updateClass(classData: ClassData) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.put(`${API_URL}/classes/${classData._id}`, classData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Trigger a custom event for updating schedule
      window.dispatchEvent(new CustomEvent('scheduleUpdated'));
      
      return response.data;
    } catch (error) {
      console.error('Error updating class:', error);
      throw error;
    }
  },

  /**
   * Get the current semester dates
   * @returns {Promise<{startDate: string, endDate: string} | null>} The semester dates
   */
  async getSemesterDates() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return null;
      }

      const response = await axios.get(`${API_URL}/semester-dates`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data.semesterDates;
    } catch (error) {
      console.error('Error fetching semester dates:', error);
      return null;
    }
  },

  /**
   * Set the semester dates
   * @param {string} startDate - The start date in ISO format
   * @param {string} endDate - The end date in ISO format
   * @returns {Promise<Object>} The response
   */
  async setSemesterDates(startDate: string, endDate: string) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(`${API_URL}/semester-dates`, 
        { startDate, endDate },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Trigger a custom event for updating schedule and tracker
      window.dispatchEvent(new CustomEvent('scheduleUpdated'));
      window.dispatchEvent(new CustomEvent('semesterDatesUpdated', { 
        detail: { startDate, endDate } 
      }));
      
      return response.data;
    } catch (error) {
      console.error('Error setting semester dates:', error);
      throw error;
    }
  },

  /**
   * Fetch most recent schedule
   * @returns {Promise<Object>} The most recent schedule
   */
  async fetchMostRecentSchedule() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${API_URL}/schedules/recent`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching recent schedule:', error);
      return null;
    }
  },

  /**
   * Fetch schedule by ID
   * @param {string} scheduleId - The ID of the schedule to fetch
   * @returns {Promise<Object>} The schedule
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

      // Convert string dates back to Date objects in schedule items
      if (response.data.schedule && Array.isArray(response.data.schedule)) {
        response.data.schedule = response.data.schedule.map(item => ({
          ...item,
          start: item.start ? new Date(item.start) : undefined,
          end: item.end ? new Date(item.end) : undefined
        }));
      }

      return response.data;
    } catch (error) {
      console.error(`Error fetching schedule ${scheduleId}:`, error);
      return null;
    }
  },

  /**
   * Get user preferences
   */
  async getUserPreferences() {
    try {
      // First check for cached preferences in localStorage
      const cachedPrefs = this.getCachedPreferences();
      if (cachedPrefs) {
        console.log('Using cached preferences from localStorage');
        return cachedPrefs;
      }

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
        
        // Cache these preferences for future use
        localStorage.setItem('userPreferences', JSON.stringify(response.data.preferences));
        
        return response.data.preferences;
      } else {
        // If no preferences in response, check cache one more time
        const cachedPrefs = this.getCachedPreferences();
        if (cachedPrefs) {
          console.log('No preferences in response, using cached preferences');
          return cachedPrefs;
        }
        
        console.log('No preferences in response or cache, using defaults');
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
      
      // Try to get preferences from localStorage as fallback
      const cachedPrefs = this.getCachedPreferences();
      if (cachedPrefs) {
        console.log('Error fetching from server, using cached preferences');
        return cachedPrefs;
      }
      
      // Fall back to default preferences as last resort
      console.log('No cached preferences found, using defaults');
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
      
      // Ensure dates are properly formatted before saving
      const preferencesToSave = { ...preferences };
      
      // Format semester dates as ISO strings if they exist
      if (preferencesToSave.semesterDates) {
        if (preferencesToSave.semesterDates.startDate) {
          // Make sure startDate is a proper Date object before converting to ISO string
          const startDate = new Date(preferencesToSave.semesterDates.startDate);
          if (!isNaN(startDate.getTime())) {
            preferencesToSave.semesterDates.startDate = startDate.toISOString();
          }
        }
        
        if (preferencesToSave.semesterDates.endDate) {
          // Make sure endDate is a proper Date object before converting to ISO string
          const endDate = new Date(preferencesToSave.semesterDates.endDate);
          if (!isNaN(endDate.getTime())) {
            preferencesToSave.semesterDates.endDate = endDate.toISOString();
          }
        }
      }

      // Always store preferences locally first as a backup
      localStorage.setItem('userPreferences', JSON.stringify(preferencesToSave));
      console.log('Preferences saved locally as backup', preferencesToSave);
      
      // If no token, just return the locally saved preferences
      if (!token) {
        console.warn('No authentication token found, saving preferences locally only');
        return preferencesToSave;
      }

      console.log('Updating preferences on server:', preferencesToSave);
      
      // Make a shallow copy to avoid modifying the original object
      const preferencesToSend = { ...preferencesToSave };
      
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
          // Update the local storage with server response to ensure consistency
          localStorage.setItem('userPreferences', JSON.stringify(response.data.preferences));
          return response.data.preferences;
        }
        
        // If server doesn't return preferences, return the local ones
        return preferencesToSave;
      } catch (err: any) {
        // Handle auth errors gracefully
        console.error('Error updating preferences on server:', err.response?.data?.error || err.message);
        console.log('Using locally saved preferences instead');
        
        // Return locally saved preferences instead of throwing error
        return preferencesToSave;
      }
    } catch (error) {
      console.error('Error in updateUserPreferences:', error);
      // Return local preferences as fallback
      return preferences;
    }
  },

  /**
   * Get cached preferences
   */
  getCachedPreferences() {
    try {
      const prefsString = localStorage.getItem('userPreferences');
      return prefsString ? JSON.parse(prefsString) : null;
    } catch (error) {
      console.warn('Error parsing cached preferences:', error);
      return null;
    }
  },

  /**
   * Convert calendar events to assignments for the tracker
   * @param events Calendar events to convert
   * @returns Array of assignments for tracking
   */
  eventsToAssignments(events: CalendarEvent[]): Assignment[] {
    if (!Array.isArray(events) || events.length === 0) {
      console.log('No events to convert to assignments');
      return [];
    }
    
    console.log(`Converting ${events.length} events to assignments`);
    
    // Filter to get assignment-related events and exclude class events
    const assignmentEvents = events.filter(event => 
      event.category !== 'class' && (
        // Include events that are directly marked as assignments
        event.category === 'assignment' || 
        // Or events that are study sessions related to assignments
        (event.resource?.documentType === 'assignment' || 
         event.resource?.type === 'assignment' ||
         event.title?.includes('Assignment'))
      )
    );
    
    // If no assignment events were found, try to use all non-class events
    const eventsToProcess = assignmentEvents.length > 0 
      ? assignmentEvents 
      : events.filter(event => event.category !== 'class');
    
    console.log(`Found ${eventsToProcess.length} potential assignment events`);
    
    // Create a Map to track unique assignments by ID or other identifier
    const assignmentMap = new Map<string, Assignment>();
    
    // Process all assignment-related events
    eventsToProcess.forEach(event => {
      try {
        // Skip events without proper dates
        if (!event.start || !event.end) {
          console.warn('Skipping event without proper dates:', event.title);
          return;
        }
        
        // Extract course code
        const courseCode = event.courseCode || event.resource?.courseCode || '';
        
        // Try to get a unique identifier for the assignment
        const assignmentId = event.resource?.assignmentId || 
                            event.resource?._id || 
                            event.id ||
                            `${courseCode}-${event.title}`.toLowerCase().replace(/\s+/g, '-');
        
        // Extract simple assignment title
        const title = this.extractSimpleAssignmentTitle(event, courseCode);
        
        // If this is the first event for this assignment, create an entry
        if (!assignmentMap.has(assignmentId)) {
          const dueDate = event.resource?.dueDate ? new Date(event.resource.dueDate) : event.end;
          
          assignmentMap.set(assignmentId, {
            _id: assignmentId,
            title: title,
            description: event.description || event.resource?.description || '',
            courseCode: courseCode,
            startDate: event.start.toISOString(),
            dueDate: dueDate.toISOString(),
            progress: event.resource?.progress || event.progress || 0,
            completed: event.resource?.completed || event.completed || false,
            priority: event.priority || 'medium'
          });
        }
        
        // If we already have this assignment, update the progress calculation
        // based on related study sessions
        else if (event.resource?.sessionNumber && event.resource?.totalSessions) {
          const assignment = assignmentMap.get(assignmentId)!;
          const totalSessions = event.resource.totalSessions;
          const isCompleted = event.status === 'completed' || event.completed;
          
          // Count this session toward progress if completed
          if (isCompleted) {
            // Increment progress based on completed sessions
            const progressIncrement = 100 / totalSessions;
            assignment.progress = Math.min(100, assignment.progress + progressIncrement);
            assignment.completed = assignment.progress >= 100;
          }
          
          // Update the assignment in the map
          assignmentMap.set(assignmentId, assignment);
        }
      } catch (error) {
        console.error('Error processing event to assignment:', error, event);
      }
    });
    
    console.log(`Created ${assignmentMap.size} unique assignments`);
    
    // Get the assignments as an array and sort by due date
    return Array.from(assignmentMap.values())
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  },

  /**
   * Extract a simple, clean assignment title from an event
   * @param event The calendar event
   * @param courseCode Optional course code
   * @returns A simple assignment title
   */
  extractSimpleAssignmentTitle(event: CalendarEvent, courseCode?: string): string {
    // First try to extract course code and assignment number from source file if available
    if (event.resource?.sourceDetails?.fileName || event.resource?.sourceFile) {
      const fileName = event.resource.sourceDetails?.fileName || event.resource.sourceFile;
      
      // Extract course code from filename first - looking for patterns like DIP103
      const courseCodeFromFile = fileName?.match(/([A-Z]{2,}\d{3})/i);
      const extractedCourseCode = courseCodeFromFile ? courseCodeFromFile[1].toUpperCase() : null;
      
      // Use the most specific course code available
      const bestCourseCode = extractedCourseCode || 
                            courseCode || 
                            event.courseCode || 
                            event.resource?.courseCode;
      
      // Enhanced pattern to detect format like "DIP103_Assignment_1"
      const filePatternMatch = fileName?.match(/([A-Z]{2,}\d{3})_Assignment_(\d+)/i);
      if (filePatternMatch) {
        // This handles the specific case of "DIP103_Assignment_1" format
        const courseCodeFromPattern = filePatternMatch[1].toUpperCase();
        const assignmentNumber = filePatternMatch[2];
        return `${courseCodeFromPattern} - Assignment ${assignmentNumber}`;
      }
      
      // Try other filename patterns if the specific pattern didn't match
      const fileNameMatch = fileName?.match(/assignment[_\s]*(\d+)/i) ||
                           fileName?.match(/a(\d+)[_\.]?/i) ||
                           fileName?.match(/hw(\d+)/i) ||
                           fileName?.match(/(\d+)[_\s]*assignment/i);
      
      if (fileNameMatch && fileNameMatch[1]) {
        const assignmentNumber = fileNameMatch[1];
        
        if (bestCourseCode) {
          return `${bestCourseCode} - Assignment ${assignmentNumber}`;
        } else {
          return `Assignment ${assignmentNumber}`;
        }
      }
    }
    
    // If no match from filename, check if assignment number is directly in resource
    if (event.resource?.assignmentNumber) {
      const eventCourseCode = courseCode || event.courseCode || event.resource?.courseCode;
      if (eventCourseCode) {
        return `${eventCourseCode} - Assignment ${event.resource.assignmentNumber}`;
      } else {
        return `Assignment ${event.resource.assignmentNumber}`;
      }
    }
    
    // Extract from extracted text if available
    if (event.resource?.extractedText) {
      const assignmentNoMatch = event.resource.extractedText.match(/Assignment\s*No\s*:\s*(\d+)/i);
      if (assignmentNoMatch && assignmentNoMatch[1]) {
        const eventCourseCode = courseCode || event.courseCode || event.resource?.courseCode;
        if (eventCourseCode) {
          return `${eventCourseCode} - Assignment ${assignmentNoMatch[1]}`;
        } else {
          return `Assignment ${assignmentNoMatch[1]}`;
        }
      }
    }
    
    // Fall back to extracting from title
    let assignmentNumber = '';
    let title = event.title || '';
    
    // Enhanced pattern matching for assignment numbers in titles
    const numberMatch = title.match(/assignment\s*(?:number|num|#)?\s*(\d+)/i) || 
                        title.match(/\bassignment\s*(\d+)/i) ||
                        title.match(/\ba(\d+)\b/i) ||  // Match patterns like "A2"
                        title.match(/\bhw\s*(\d+)\b/i); // Match patterns like "HW 2"
    
    if (numberMatch && numberMatch[1]) {
      assignmentNumber = numberMatch[1];
    }
    
    // If we found an assignment number, format title consistently
    if (assignmentNumber) {
      if (courseCode) {
        return `${courseCode} - Assignment ${assignmentNumber}`;
      } else {
        return `Assignment ${assignmentNumber}`;
      }
    }
    
    // If no assignment number but we have course code, still use simplified format
    if (courseCode && !title.includes(courseCode)) {
      // If title is too long, truncate it
      const maxLength = 30;
      if (title.length > maxLength) {
        // Clean up the title first
        title = title
          .replace(/\s*\(Session \d+\/\d+\)\s*/, '')
          .replace(/\s*-\s*[A-Za-z\s]+(draft|review|research|requirements|final).*$/, '');
        
        // Use course code with shortened title
        return `${courseCode} - ${title.substring(0, maxLength)}...`;
      }
      
      return `${courseCode} - ${title}`;
    }
    
    // Clean up the title as fallback
    return title
      .replace(/\s*\(Session \d+\/\d+\)\s*/, '')
      .replace(/\s*-\s*[A-Za-z\s]+(draft|review|research|requirements|final).*$/, '')
      .trim();
  },

  /**
   * Calculate progress stats from calendar events
   * @param events Calendar events to analyze
   * @returns Progress statistics
   */
  calculateProgressStats(events: CalendarEvent[]): ProgressStats {
    const assignments = this.eventsToAssignments(events);
    const now = new Date().getTime();
    
    // Calculate stats
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => a.completed).length;
    
    let overallProgress = 0;
    if (totalAssignments > 0) {
      overallProgress = assignments.reduce((sum, assignment) => sum + assignment.progress, 0) / totalAssignments;
    }
    
    // Calculate time remaining (in days)
    const remainingAssignments = assignments.filter(a => !a.completed);
    let avgTimeRemaining = 0;
    if (remainingAssignments.length > 0) {
      const totalRemainingTime = remainingAssignments.reduce((sum, assignment) => {
        const dueDate = new Date(assignment.dueDate).getTime();
        return sum + Math.max(0, dueDate - now);
      }, 0);
      avgTimeRemaining = totalRemainingTime / (remainingAssignments.length * 24 * 60 * 60 * 1000); // Convert to days
    }
    
    // Count assignments due in the next 3 days
    const upcomingDeadlines = assignments.filter(a => {
      if (a.completed) return false;
      const dueDate = new Date(a.dueDate).getTime();
      const threeDaysFromNow = now + (3 * 24 * 60 * 60 * 1000);
      return dueDate <= threeDaysFromNow && dueDate >= now;
    }).length;
    
    return {
      totalAssignments,
      completedAssignments,
      overallProgress,
      timeRemaining: avgTimeRemaining,
      upcomingDeadlines
    };
  },

  /**
   * Fetch and combine both class schedules and study schedules
   * @returns Promise with combined calendar events
   */
  async fetchCombinedSchedule(): Promise<CalendarEvent[]> {
    try {
      // Fetch classes
      const classes = await this.fetchClasses();
      console.log(`Fetched ${classes.length} classes for combined schedule:`, classes);
      
      // Convert classes to calendar events
      const classEvents = this.classesToEvents(classes);
      console.log(`Converted to ${classEvents.length} class events`);
      
      // Get study events from localStorage or recent schedule
      let studyEvents: CalendarEvent[] = [];
      
      try {
        // First try to get cached study events
        const cachedStudySchedule = localStorage.getItem('generatedStudySchedule');
        if (cachedStudySchedule) {
          const parsedStudySchedule = JSON.parse(cachedStudySchedule);
          studyEvents = this.tasksToEvents(parsedStudySchedule);
          console.log(`Found ${studyEvents.length} study events in local cache`);
        } else {
          // If no cache, try to fetch the most recent schedule
          const recentSchedule = await this.fetchMostRecentSchedule();
          if (recentSchedule && recentSchedule.schedule) {
            // Only include non-class events to avoid duplication
            studyEvents = recentSchedule.schedule.filter(event => event.category !== 'class');
            console.log(`Found ${studyEvents.length} study events in recent schedule`);
          }
        }
      } catch (error) {
        console.error('Error loading study events:', error);
      }
      
      // Combine both types of events
      const combinedEvents = [...classEvents, ...studyEvents];
      console.log(`Returning ${combinedEvents.length} combined events (${classEvents.length} class + ${studyEvents.length} study)`);
      
      // Ensure all events have proper Date objects before returning
      return ensureDateObjects(combinedEvents);
    } catch (error) {
      console.error('Error fetching combined schedule:', error);
      return [];
    }
  },
  
  /**
   * Convert class data to calendar events
   * @param classes Array of class data
   * @returns Array of calendar events
   */
  classesToEvents(classes: any[]): CalendarEvent[] {
    if (!Array.isArray(classes) || classes.length === 0) {
      console.warn('classesToEvents received empty or non-array input:', classes);
      return [];
    }
    
    console.log('Converting classes to events, input:', JSON.stringify(classes).substring(0, 200) + '...');
    
    const events: CalendarEvent[] = [];
    let eventCounter = 0;
    
    classes.forEach((classData, index) => {
      if (!classData) {
        console.warn(`Skipping null or undefined class at index ${index}`);
        return;
      }
      
      // Add default semester dates if missing
      if (!classData.semesterDates) {
        console.warn(`Class is missing semesterDates, adding defaults: ${classData.courseName || 'Unknown class'}`);
        const today = new Date();
        const threeMonthsLater = new Date(today);
        threeMonthsLater.setMonth(today.getMonth() + 3);
        
        classData.semesterDates = {
          startDate: today.toISOString().split('T')[0],
          endDate: threeMonthsLater.toISOString().split('T')[0]
        };
      }
      
      try {
        const startDate = new Date(classData.semesterDates.startDate);
        const endDate = new Date(classData.semesterDates.endDate);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.warn('Invalid semester dates for class:', classData);
          return;
        }
        
        let currentDate = new Date(startDate);
        
        // Make sure we have the day property
        if (!classData.day) {
          console.warn('Class is missing day property, skipping:', classData);
          return;
        }
        
        // Make sure we have time properties
        if (!classData.startTime || !classData.endTime) {
          console.warn('Class is missing time properties, skipping:', classData);
          return;
        }
        
        while (currentDate <= endDate) {
          if (currentDate.toLocaleString('en-us', { weekday: 'long' }) === classData.day) {
            try {
              const [startHours, startMinutes] = classData.startTime.split(':');
              const [endHours, endMinutes] = classData.endTime.split(':');
              
              const eventStart = new Date(currentDate);
              eventStart.setHours(parseInt(startHours), parseInt(startMinutes), 0);
              
              const eventEnd = new Date(currentDate);
              eventEnd.setHours(parseInt(endHours), parseInt(endMinutes), 0);
              
              const uniqueId = `class-${classData._id || Math.random().toString(36).substring(2)}-${eventCounter++}`;
              
              events.push({
                id: uniqueId,
                title: `${classData.courseName || 'Untitled Class'} ${classData.courseCode ? `(${classData.courseCode})` : ''}`,
                start: eventStart,
                end: eventEnd,
                allDay: false,
                category: 'class',
                courseCode: classData.courseCode,
                location: classData.location,
                resource: {
                  type: 'class',
                  courseCode: classData.courseCode,
                  location: classData.location,
                  recurring: true,
                  day: classData.day,
                  startTime: classData.startTime,
                  endTime: classData.endTime,
                  details: {
                    courseName: classData.courseName,
                    professor: classData.professor
                  }
                }
              });
            } catch (err) {
              console.error('Error creating event for class:', err, classData);
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } catch (err) {
        console.error('Error processing class:', err, classData);
      }
    });
    
    console.log(`Generated ${events.length} class events`);
    return events;
  },
  
  /**
   * Convert tasks/studies to calendar events
   * @param tasks Array of tasks or studies
   * @returns Array of calendar events
   */
  tasksToEvents(tasks: any[]): CalendarEvent[] {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return [];
    }
    
    return tasks.map(task => {
      // Ensure dates are Date objects
      const startDate = task.start instanceof Date ? task.start : new Date(task.start);
      const endDate = task.end instanceof Date ? task.end : new Date(task.end);
      
      return {
        id: task.id || Math.random().toString(36).substring(2),
        title: task.title,
        start: startDate,
        end: endDate,
        allDay: task.allDay || false,
        category: task.category || 'study',
        courseCode: task.courseCode,
        description: task.description,
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        resource: task.resource || {
          type: 'study-session',
          sessionNumber: task.sessionNumber,
          totalSessions: task.totalSessions,
          stage: task.stage
        }
      };
    });
  },

  /**
   * Auto-mark tasks as completed if their due date has passed
   * @param events Array of calendar events
   * @returns Updated array of events
   */
  autoMarkCompletedTasks(events: CalendarEvent[]): CalendarEvent[] {
    const now = new Date();
    const updatedEvents = events.map(event => {
      // Skip class events and already completed events
      if (event.category === 'class' || event.completed === true) {
        return event;
      }
      
      // For tasks/study events, check if due date has passed
      if (event.end < now) {
        return {
          ...event,
          completed: true,
          // Add visual indication that this was auto-completed
          title: `✓ ${event.title}`,
          resource: {
            ...event.resource,
            autoCompleted: true
          }
        };
      }
      
      return event;
    });
    
    return updatedEvents;
  },
  
  
  
  /**
   * Update the completed status of an event
   * @param eventId ID of the event to update
   * @param completed New completed status
   * @returns {Promise<boolean>} Success status
   */
  async updateEventCompletionStatus(eventId: string, completed: boolean): Promise<boolean> {
    try {
      // First update local storage
      const cachedEvents = localStorage.getItem('scheduleEvents');
      if (cachedEvents) {
        const events = JSON.parse(cachedEvents);
        const updatedEvents = events.map((event: any) => {
          if (event.id === eventId) {
            return {
              ...event,
              completed: completed,
              title: completed ? `✓ ${event.title.replace(/^✓ /, '')}` : event.title.replace(/^✓ /, '')
            };
          }
          return event;
        });
        
        localStorage.setItem('scheduleEvents', JSON.stringify(updatedEvents));
      }
      
      // Then update on server
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.post(
        `${API_URL}/events/${eventId}/status`, 
        { completed },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Dispatch events to update both Schedule and Tracker
      window.dispatchEvent(new CustomEvent('scheduleUpdated'));
      
      return true;
    } catch (error) {
      console.error('Error updating event completion status:', error);
      toast.error('Failed to update task status');
      return false;
    }
  }
};
