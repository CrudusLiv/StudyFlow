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
