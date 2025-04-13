import axios from 'axios';
import { ClassData, CalendarEvent } from '../types/types';
import { toast } from 'react-toastify';

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
    // Filter out class events and only keep task/study events
    const taskEvents = events.filter(event => event.category !== 'class');
    
    // Group events by title (assume events with same title are part of same assignment)
    const assignmentMap = new Map<string, CalendarEvent[]>();
    
    taskEvents.forEach(event => {
      const title = event.title;
      if (!assignmentMap.has(title)) {
        assignmentMap.set(title, []);
      }
      assignmentMap.get(title)?.push(event);
    });
    
    // Convert grouped events to assignments
    return Array.from(assignmentMap.entries()).map(([title, events]) => {
      // Sort events by date
      const sortedEvents = events.sort((a, b) => a.start.getTime() - b.start.getTime());
      
      // Get start date from earliest event
      const startDate = sortedEvents[0].start;
      
      // Get due date from latest event
      const dueDate = sortedEvents[sortedEvents.length - 1].end;
      
      // Calculate progress based on completed events
      const completedEvents = events.filter(event => event.status === 'completed').length;
      const progress = events.length > 0 ? (completedEvents / events.length) * 100 : 0;
      
      // Create a unique ID based on title
      const _id = title.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 9);
      
      return {
        _id,
        title,
        description: events[0].description || '',
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
        progress,
        completed: progress >= 100
      };
    });
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
      
      return combinedEvents;
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
   * Convert calendar events to assignments for Tracker
   * @param events Array of calendar events
   * @returns Array of assignments
   */
  eventsToAssignments(events: CalendarEvent[]): Assignment[] {
    if (!Array.isArray(events)) {
      return [];
    }
    
    // Filter out class events and convert study events to assignments
    const assignments = events
      .filter(event => event.category !== 'class')
      .map(event => {
        // Calculate progress based on completed status or time elapsed
        let progress = 0;
        if (event.completed) {
          progress = 100;
        } else {
          const now = new Date();
          const start = new Date(event.start);
          const end = new Date(event.end);
          
          // If start date is in the future, progress is 0
          if (start > now) {
            progress = 0;
          } 
          // If due date has passed, progress is 100 (auto-complete)
          else if (end < now) {
            progress = 100;
          } 
          // Otherwise, calculate progress based on time elapsed
          else {
            const totalDuration = end.getTime() - start.getTime();
            const elapsedDuration = now.getTime() - start.getTime();
            progress = Math.min(Math.round((elapsedDuration / totalDuration) * 100), 100);
          }
        }
        
        return {
          _id: event.id,
          title: event.title,
          description: event.description || '',
          startDate: event.start.toISOString(),
          dueDate: event.end.toISOString(),
          progress: progress,
          completed: event.completed || progress === 100,
          courseCode: event.courseCode || event.resource?.courseCode || ''
        };
      });
    
    return assignments;
  },
  
  /**
   * Calculate progress statistics for assignments
   * @param events Array of calendar events
   * @returns Progress statistics
   */
  calculateProgressStats(events: CalendarEvent[]): ProgressStats {
    // Convert events to assignments
    const assignments = this.eventsToAssignments(events);
    
    // Calculate stats
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => a.completed).length;
    
    // Calculate overall progress as average of all assignment progress values
    let overallProgress = 0;
    if (totalAssignments > 0) {
      const totalProgress = assignments.reduce((sum, assignment) => sum + assignment.progress, 0);
      overallProgress = Math.round(totalProgress / totalAssignments);
    }
    
    // Calculate time remaining for incomplete assignments (in days)
    const now = new Date();
    let totalRemainingTime = 0;
    
    assignments
      .filter(a => !a.completed)
      .forEach(a => {
        const dueDate = new Date(a.dueDate);
        if (dueDate > now) {
          const timeDiff = dueDate.getTime() - now.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          totalRemainingTime += daysDiff;
        }
      });
    
    // Count upcoming deadlines (due in next 7 days)
    const upcomingDeadlines = assignments.filter(a => {
      if (a.completed) return false;
      
      const dueDate = new Date(a.dueDate);
      if (dueDate < now) return false;
      
      const timeDiff = dueDate.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      return daysDiff <= 7;
    }).length;
    
    return {
      totalAssignments,
      completedAssignments,
      overallProgress,
      timeRemaining: totalRemainingTime,
      upcomingDeadlines
    };
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
