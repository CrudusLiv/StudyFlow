import { CalendarEvent } from '../types/types';

/**
 * Convert tasks to calendar events
 * @param tasks Array of tasks or study sessions
 * @returns Array of calendar events
 */
export function tasksToEvents(tasks: any): CalendarEvent[] {
  // Safety check if tasks is not an array
  if (!Array.isArray(tasks)) {
    console.warn('tasksToEvents received non-array input:', typeof tasks);
    return []; // Return empty array instead of failing
  }

  // Handle empty array case
  if (tasks.length === 0) {
    return [];
  }

  console.log('Converting tasks to events, first task:', tasks[0]);
  
  try {
    return tasks.map((task: any) => {
      // Check if task already has start/end properties
      if (task.start && task.end) {
        return {
          ...task,
          start: new Date(task.start),
          end: new Date(task.end),
          title: task.title || 'Untitled Task',
          allDay: task.allDay || false
        };
      }
      
      // Handle case where task.dueDate is already a Date object
      let dueDate;
      if (task.dueDate instanceof Date) {
        dueDate = task.dueDate;
      } else if (typeof task.dueDate === 'string') {
        dueDate = new Date(task.dueDate);
      } else {
        // Fallback to a future date if no valid date found
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14); // Two weeks from now
      }

      // Calculate sensible start time based on task properties
      const startDate = task.startDate ? new Date(task.startDate) : 
                       (task.start ? new Date(task.start) : calculateStartDate(dueDate, task));

      return {
        id: task.id || `task-${Math.random().toString(36).substring(2, 9)}`,
        title: task.title || 'Untitled Task',
        start: startDate,
        end: dueDate,
        allDay: false,
        category: task.category || task.type || 'task',
        courseCode: task.courseCode || '',
        priority: task.priority || 'medium',
        description: task.description || '',
        resource: { ...task }
      };
    });
  } catch (error) {
    console.error('Error in tasksToEvents:', error);
    return []; // Return empty array on error
  }
}

/**
 * Helper function to calculate start date based on due date and task properties
 */
function calculateStartDate(dueDate: Date, task: any): Date {
  try {
    // Start with a date 3 days before due date by default
    const startDate = new Date(dueDate);
    const daysOffset = task.daysNeeded || 3;
    startDate.setDate(startDate.getDate() - daysOffset);
    
    // Set a reasonable time for the start date
    startDate.setHours(10, 0, 0, 0); // Default to 10 AM
    
    return startDate;
  } catch (error) {
    console.error('Error calculating start date:', error);
    // Fallback to 3 days before due date
    const fallback = new Date(dueDate);
    fallback.setDate(fallback.getDate() - 3);
    return fallback;
  }
}

/**
 * Convert classes to calendar events
 * @param {any} classes - Array of class schedules or object containing classes
 * @returns {CalendarEvent[]} - Array of calendar events
 */
export function classesToEvents(classes: any): CalendarEvent[] {
  console.log('Converting classes to events, input type:', typeof classes);
  
  // Check if input is null or undefined
  if (!classes) {
    console.warn('classesToEvents received null or undefined input');
    return [];
  }
  
  // Handle different input formats: direct array, object with data property, or nested weeklySchedule
  let classArray: any[] = [];
  
  if (Array.isArray(classes)) {
    classArray = classes;
  } else if (classes.data && Array.isArray(classes.data)) {
    // Handle response object with data property
    classArray = classes.data;
  } else if (classes.weeklySchedule && Array.isArray(classes.weeklySchedule)) {
    // Handle university schedule format with weeklySchedule property
    classArray = classes.weeklySchedule.flatMap((day: any) => {
      if (!day.classes || !Array.isArray(day.classes)) return [];
      
      return day.classes.map((cls: any) => ({
        ...cls,
        day: day.day,
        documentType: 'class'
      }));
    });
  } else {
    console.warn('classesToEvents received unknown format, trying to access data property', classes);
    // Additional fallback: try to extract .data.data if that exists
    if (classes.data?.data && Array.isArray(classes.data.data)) {
      classArray = classes.data.data;
    } else {
      console.error('Unable to extract class array from input:', classes);
      return [];
    }
  }
  
  console.log('Normalized class array length:', classArray.length);
  
  // Process each class into recurring events
  const events: CalendarEvent[] = [];
  const currentDate = new Date();
  const semesterStart = new Date();
  semesterStart.setDate(currentDate.getDate() - 14); // 2 weeks ago
  
  const semesterEnd = new Date();
  semesterEnd.setMonth(currentDate.getMonth() + 3); // 3 months in the future
  
  // Process each class
  classArray.forEach(classItem => {
    try {
      // Get semesterDates if available or use defaults
      const startDate = classItem.semesterDates?.startDate 
        ? new Date(classItem.semesterDates.startDate) 
        : semesterStart;
        
      const endDate = classItem.semesterDates?.endDate
        ? new Date(classItem.semesterDates.endDate)
        : semesterEnd;
        
      // Get the day name from the class
      const dayName = classItem.day || '';
      if (!dayName) {
        console.warn('Class missing day name:', classItem);
        return;
      }
      
      // Create events for each occurrence of this class
      let currentRecurringDate = new Date(startDate);
      while (currentRecurringDate <= endDate) {
        // Check if current day matches class day
        if (currentRecurringDate.toLocaleDateString('en-us', { weekday: 'long' }) === dayName) {
          // Skip if missing critical time values
          if (!classItem.startTime || !classItem.endTime) {
            console.warn('Missing time values in class item:', classItem);
            break;
          }
          
          try {
            // Extract hours and minutes
            const [startHour, startMinute] = classItem.startTime.split(':').map(Number);
            const [endHour, endMinute] = classItem.endTime.split(':').map(Number);
            
            // Create event start and end dates
            const eventStart = new Date(currentRecurringDate);
            eventStart.setHours(startHour || 9, startMinute || 0, 0, 0);
            
            const eventEnd = new Date(currentRecurringDate);
            eventEnd.setHours(endHour || 10, endMinute || 0, 0, 0);
            
            // Generate a unique ID
            const eventId = `class-${classItem._id || Math.random().toString(36).substring(2)}-${currentRecurringDate.toISOString()}`;
            
            // Log this event to verify correct creation
            console.log(`Creating class event: ${classItem.courseName || 'Unnamed Class'} on ${dayName} at ${classItem.startTime}-${classItem.endTime}`);
            
            // Create event with full data
            events.push({
              id: eventId,
              title: classItem.courseName || classItem.title || `Class on ${dayName}`,
              start: eventStart,
              end: eventEnd,
              allDay: false,
              category: 'class', // Use consistent category name 
              courseCode: classItem.courseCode || '',
              location: classItem.location || '',
              resource: {
                type: 'class',
                courseCode: classItem.courseCode || '',
                location: classItem.location || '',
                recurring: true,
                day: dayName,
                details: {
                  courseName: classItem.courseName || '',
                  professor: classItem.professor || ''
                }
              }
            });
          } catch (err) {
            console.error('Error creating event for class:', err, classItem);
          }
        }
        
        // Move to next day
        currentRecurringDate.setDate(currentRecurringDate.getDate() + 1);
      }
    } catch (error) {
      console.error('Error processing class:', classItem, error);
    }
  });
  
  console.log(`Generated ${events.length} class events`);
  return events;
}