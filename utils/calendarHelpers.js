/**
 * Utility functions for working with calendar events
 */

/**
 * Convert schedule data from API to calendar-compatible events
 * @param {Array} scheduleData - Study schedule data from API
 * @returns {Array} - Calendar-compatible events
 */
export function convertScheduleToEvents(scheduleData) {
  if (!Array.isArray(scheduleData)) {
    console.warn('Schedule data is not an array:', scheduleData);
    return [];
  }
  
  if (scheduleData.length === 0) {
    console.warn('Schedule data array is empty');
    return [];
  }
  
  console.log(`Converting ${scheduleData.length} schedule items to calendar events`);

  return scheduleData.map((item, index) => {
    try {
      // Validate required date fields
      if (!item.start && !item.startTime) {
        console.warn(`Item #${index} missing start time:`, item);
        // Generate a fallback date in the near future
        const fallbackDate = new Date();
        fallbackDate.setDate(fallbackDate.getDate() + 3); // 3 days from now
        item.start = fallbackDate;
      }
      
      // Ensure start and end are Date objects
      const start = new Date(item.start || item.startTime);
      
      // If end time is missing, create a default 1-hour event
      const end = item.end || item.endTime ? 
        new Date(item.end || item.endTime) : 
        new Date(start.getTime() + 60 * 60 * 1000);

      return {
        id: item.id || `event-${Math.random().toString(36).substring(2)}`,
        title: item.title || 'Study Session',
        start: start,
        end: end,
        allDay: item.allDay || false,
        category: item.category || 'study',
        priority: item.priority || 'medium',
        description: item.description || '',
        courseCode: item.courseCode || '',
        location: item.location || '',
        resource: {
          type: 'study',
          sourceFile: item.sourceFile || null,
          ...item.resource
        }
      };
    } catch (error) {
      console.error(`Error converting item #${index} to event:`, error, item);
      return null;
    }
  }).filter(Boolean); // Remove any null items from failed conversions
}

/**
 * Debug schedule data to identify any format issues
 * @param {Array} scheduleData - Schedule data to debug
 */
export function debugScheduleData(scheduleData) {
  if (!Array.isArray(scheduleData)) {
    console.error('Schedule data is not an array:', scheduleData);
    return;
  }
  
  if (scheduleData.length === 0) {
    console.warn('Schedule data array is empty');
    return;
  }
  
  console.log(`Analyzing ${scheduleData.length} schedule items`);
  
  // Check for missing required fields
  const missingStartCount = scheduleData.filter(item => !item.start && !item.startTime).length;
  const missingEndCount = scheduleData.filter(item => !item.end && !item.endTime).length;
  const missingTitleCount = scheduleData.filter(item => !item.title).length;
  
  console.log('Field completeness check:', {
    missingStart: missingStartCount,
    missingEnd: missingEndCount,
    missingTitle: missingTitleCount
  });
  
  // Sample the first few items for detailed inspection
  const sampleSize = Math.min(3, scheduleData.length);
  console.log(`Sample of ${sampleSize} items:`, scheduleData.slice(0, sampleSize));
}

/**
 * Ensures that all event start and end properties are proper Date objects
 * This fixes the "d[("get" + method)] is not a function" error in react-big-calendar
 * 
 * @param {Array} events - Array of calendar events
 * @returns {Array} - Array of events with guaranteed Date objects for start/end
 */
export function ensureDateObjects(events) {
  if (!Array.isArray(events)) {
    console.warn('Events is not an array:', events);
    return [];
  }
  
  return events.map(event => {
    if (!event) return null;
    
    try {
      // Create a copy of the event to avoid mutating the original
      const fixedEvent = { ...event };
      
      // Ensure start is a Date object
      if (fixedEvent.start) {
        // Check if it's already a proper Date object
        if (!(fixedEvent.start instanceof Date) || isNaN(fixedEvent.start.getTime())) {
          // Try to convert to a Date object
          fixedEvent.start = new Date(fixedEvent.start);
          
          // If still not valid, create a fallback
          if (isNaN(fixedEvent.start.getTime())) {
            console.warn('Invalid start date in event, using fallback:', event);
            fixedEvent.start = new Date();
          }
        }
      } else {
        // No start date at all, use current date
        fixedEvent.start = new Date();
      }
      
      // Ensure end is a Date object
      if (fixedEvent.end) {
        // Check if it's already a proper Date object
        if (!(fixedEvent.end instanceof Date) || isNaN(fixedEvent.end.getTime())) {
          // Try to convert to a Date object
          fixedEvent.end = new Date(fixedEvent.end);
          
          // If still not valid, create a fallback 1 hour after start
          if (isNaN(fixedEvent.end.getTime())) {
            console.warn('Invalid end date in event, using fallback:', event);
            fixedEvent.end = new Date(fixedEvent.start.getTime() + 60 * 60 * 1000);
          }
        }
      } else {
        // No end date, set to 1 hour after start
        fixedEvent.end = new Date(fixedEvent.start.getTime() + 60 * 60 * 1000);
      }
      
      return fixedEvent;
    } catch (error) {
      console.error('Error fixing event dates:', error, event);
      return null;
    }
  }).filter(Boolean); // Remove any null events
}
