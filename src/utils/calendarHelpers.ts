import { ScheduleTask, CalendarEvent } from '../types/types';

/**
 * Generates a unique color based on task title for visual identification
 */
export const getTaskColor = (task: ScheduleTask): string => {
  let hash = 0;

  // Generate a consistent hash from the task title
  for (let i = 0; i < task.title.length; i++) {
    hash = task.title.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert the hash to a hue value (0-359)
  const hue = hash % 360;

  // Return HSL color with fixed saturation and lightness
  return `hsl(${hue}, 70%, 85%)`;
};

/**
 * Parse time string to Date object
 */
export const parseTime = (timeString: string): Date | null => {
  try {
    // Handle different formats like "9:00", "09:00", "9"
    let hours = 0;
    let minutes = 0;

    if (timeString.includes(':')) {
      [hours, minutes] = timeString.split(':').map(part => parseInt(part.trim(), 10));
    } else {
      hours = parseInt(timeString.trim(), 10);
      minutes = 0;
    }

    if (isNaN(hours) || isNaN(minutes)) {
      return null;
    }

    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
  } catch (error) {
    console.error('Error parsing time:', error);
    return null;
  }
};

/**
 * Format Date to time string (HH:MM)
 */
export const formatTime = (date: Date | null): string => {
  if (!date) return '00:00';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

/**
 * Converts task time range to start and end Date objects
 * Handles various formats like "9:00 - 10:30", "9-10:30", etc.
 */
export const parseTimeRange = (timeRange: string, dateStr: string): { start: Date, end: Date } | null => {
  try {
    // Replace any spaces around the dash
    const cleanedRange = timeRange.replace(/\s*-\s*/g, '-');
    const [startStr, endStr] = cleanedRange.split('-');

    if (!startStr || !endStr) {
      return null;
    }

    const baseDate = new Date(dateStr);
    if (isNaN(baseDate.getTime())) {
      return null;
    }

    const startTime = parseTime(startStr);
    const endTime = parseTime(endStr);

    if (!startTime || !endTime) {
      return null;
    }

    const start = new Date(baseDate);
    start.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

    const end = new Date(baseDate);
    end.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

    return { start, end };
  } catch (error) {
    console.error('Error parsing time range:', error, timeRange, dateStr);
    return null;
  }
};

/**
 * Convert schedule tasks to calendar events
 */
export const tasksToEvents = (studyData: any[]): CalendarEvent[] => {
  console.log('Converting study data to events with enhanced distribution:', studyData.slice(0, 2));

  if (!Array.isArray(studyData)) {
    console.warn('Study data is not an array');
    return [];
  }

  // Enhanced task to event conversion with better distribution
  const events: CalendarEvent[] = studyData.map(task => {
    // Ensure start and end dates are proper Date objects
    let start = task.start instanceof Date ? task.start : new Date(task.start);
    let end = task.end instanceof Date ? task.end : new Date(task.end);

    // Handle invalid dates
    if (isNaN(start.getTime())) {
      console.warn('Invalid start date for task:', task.title);
      start = new Date();
      start.setHours(10, 0, 0, 0);
    }

    if (isNaN(end.getTime())) {
      console.warn('Invalid end date for task:', task.title);
      end = new Date(start);
      end.setHours(start.getHours() + (task.totalHours || 2));
    }

    // Determine priority based on due date proximity if not specified
    const priority = task.priority || determinePriority(end);

    return {
      id: task.id || `task-${Math.random().toString(36).substr(2, 9)}`,
      title: task.title,
      start: start,
      end: end,
      description: task.description || '',
      priority: priority,
      status: task.status || 'pending',
      category: task.category || 'task',
      courseCode: task.courseCode || '',
      location: task.location || '',
      resource: {
        ...task.resource || {},
        type: task.resource?.type || 'task',
        details: {
          ...(task.resource?.details || {}),
          sessionNumber: task.sessionNumber,
          totalSessions: task.totalSessions
        }
      }
    };
  });

  console.log('Generated events with better distribution:', events.slice(0, 2));
  return events;
};

/**
 * Helper function to determine priority based on due date proximity
 */
const determinePriority = (dueDate: Date): 'high' | 'medium' | 'low' => {
  const now = new Date();
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDue <= 3) return 'high';
  if (daysUntilDue <= 7) return 'medium';
  return 'low';
};

/**
 * Convert university classes to calendar events
 */
export const classesToEvents = (classes: any[]): CalendarEvent[] => {
  console.log('Converting classes to events. Input:', classes);
  
  if (!Array.isArray(classes)) {
    console.warn('Classes is not an array:', classes);
    return [];
  }

  if (classes.length === 0) {
    console.log('No classes to convert');
    return [];
  }

  const events: CalendarEvent[] = [];

  classes.forEach(classItem => {
    if (!classItem.courseName || !classItem.startTime || !classItem.endTime || !classItem.day) {
      console.warn('Invalid class data:', classItem);
      return;
    }

    try {
      const startDate = classItem.semesterDates?.startDate 
        ? new Date(classItem.semesterDates.startDate)
        : new Date();
      const endDate = classItem.semesterDates?.endDate
        ? new Date(classItem.semesterDates.endDate)
        : new Date(startDate.getTime() + (12 * 7 * 24 * 60 * 60 * 1000));

      let currentDay = new Date(startDate);
      
      while (currentDay <= endDate) {
        if (currentDay.toLocaleDateString('en-us', { weekday: 'long' }) === classItem.day) {
          const eventStart = new Date(currentDay);
          const [startHours, startMinutes] = classItem.startTime.split(':');
          eventStart.setHours(parseInt(startHours, 10), parseInt(startMinutes, 10), 0);

          const eventEnd = new Date(currentDay);
          const [endHours, endMinutes] = classItem.endTime.split(':');
          eventEnd.setHours(parseInt(endHours, 10), parseInt(endMinutes, 10), 0);

          events.push({
            id: `class-${classItem._id}-${currentDay.toISOString()}`,
            title: `${classItem.courseName} (${classItem.courseCode})`,
            start: eventStart,
            end: eventEnd,
            courseCode: classItem.courseCode,
            location: classItem.location,
            category: 'class',
            resource: {
              type: 'class',
              courseCode: classItem.courseCode,
              location: classItem.location,
              recurring: true,
              day: classItem.day,
              details: {
                courseName: classItem.courseName,
                professor: classItem.professor
              }
            }
          });
        }
        currentDay.setDate(currentDay.getDate() + 1);
      }
    } catch (error) {
      console.error('Error processing class:', classItem, error);
    }
  });

  console.log('Generated events:', events.length, 'First event:', events[0]);
  return events;
};

export function convertClassesToEvents(classes: any) {
  console.log("Converting classes to events. Input: ", classes);

  // Accept both arrays and objects with weeklySchedule
  if (Array.isArray(classes)) {
    // ...existing code...
  } else if (classes && Array.isArray(classes.weeklySchedule)) {
    // Treat classes.weeklySchedule as the actual array of classes
    classes = classes.weeklySchedule;
    // ...existing code...
  } else {
    console.log("Classes is not an array: ", classes);
    return [];
  }


}

const getDayName = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

/**
 * Validates if a weekly schedule has proper date and time formats
 * Returns detailed validation report
 */
export const validateScheduleData = (schedule: any): {
  valid: boolean;
  errors: string[];
  stats: {
    totalWeeks: number;
    totalDays: number;
    totalTasks: number;
    tasksWithValidTime: number;
  };
} => {
  const errors: string[] = [];
  let totalDays = 0;
  let totalTasks = 0;
  let tasksWithValidTime = 0;

  if (!schedule || !Array.isArray(schedule)) {
    errors.push('Schedule is not an array');
    return {
      valid: false,
      errors,
      stats: { totalWeeks: 0, totalDays: 0, totalTasks: 0, tasksWithValidTime: 0 }
    };
  }

  schedule.forEach((week, weekIdx) => {
    if (!week.days || !Array.isArray(week.days)) {
      errors.push(`Week ${weekIdx + 1} has no days array`);
      return;
    }

    week.days.forEach((day: any, dayIdx: number) => {
      totalDays++;

      if (!day.date) {
        errors.push(`Week ${weekIdx + 1}, Day ${dayIdx + 1} has no date`);
      }

      if (!day.tasks || !Array.isArray(day.tasks)) {
        errors.push(`Week ${weekIdx + 1}, Day ${dayIdx + 1} has no tasks array`);
        return;
      }

      day.tasks.forEach((task: any, taskIdx: number) => {
        totalTasks++;

        if (!task.title) {
          errors.push(`Week ${weekIdx + 1}, Day ${dayIdx + 1}, Task ${taskIdx + 1} has no title`);
        }

        if (!task.time) {
          errors.push(`Week ${weekIdx + 1}, Day ${dayIdx + 1}, Task ${taskIdx + 1} has no time`);
          return;
        }

        // Check time format (should be like "09:00-10:00" or "09:00 - 10:00")
        const timeString = task.time.replace(/\s+/g, '');
        const timeParts = timeString.split('-');

        if (timeParts.length !== 2) {
          errors.push(`Week ${weekIdx + 1}, Day ${dayIdx + 1}, Task "${task.title}" has invalid time format: ${task.time}`);
          return;
        }

        tasksWithValidTime++;
      });
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    stats: {
      totalWeeks: schedule.length,
      totalDays,
      totalTasks,
      tasksWithValidTime
    }
  };
};

// Add a function to fix common time format issues
export const normalizeTimeFormat = (time: string): string => {
  if (!time) return '';

  // Remove all spaces
  let normalized = time.replace(/\s+/g, '');

  // If there's no hyphen, it's not a range
  if (!normalized.includes('-')) {
    // Assume it's a start time and add a 1-hour duration
    const startTime = normalized;
    let [hours, minutes = '00'] = startTime.split(':').map(p => p.trim());

    if (!minutes) minutes = '00';

    let endHour = parseInt(hours, 10) + 1;
    if (endHour > 23) endHour = 23;

    normalized = `${hours.padStart(2, '0')}:${minutes}-${endHour.toString().padStart(2, '0')}:${minutes}`;
  }

  // Ensure both parts have proper HH:MM format
  const parts = normalized.split('-');
  if (parts.length !== 2) return normalized;

  const [start, end] = parts;

  // Format start time
  let formattedStart = start;
  if (!formattedStart.includes(':')) {
    formattedStart = `${formattedStart.padStart(2, '0')}:00`;
  }

  // Format end time
  let formattedEnd = end;
  if (!formattedEnd.includes(':')) {
    formattedEnd = `${formattedEnd.padStart(2, '0')}:00`;
  }

  return `${formattedStart}-${formattedEnd}`;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Replace the useCallback version with a regular function
const processEvents = (studyData: any[], classData: any) => {
  console.log('Processing events with:', {
    date: formatDate(new Date()),
    studyData: studyData?.slice(0, 2),
    classData: classData ? 'present' : 'absent'
  });

  try {
    // Process class events
    const classEvents = classData ? classesToEvents(classData) : [];
    console.log('Processed class events:', classEvents.slice(0, 2));

    // Process study events
    const studyEvents = studyData ? tasksToEvents(studyData) : [];
    console.log('Processed study events:', studyEvents.slice(0, 2));

    // Combine all events
    const combinedEvents = [...classEvents, ...studyEvents].map(event => ({
      ...event,
      id: event.id || `event-${Math.random().toString(36).substr(2, 9)}`,
      title: event.title || 'Untitled Event'
    }));

    console.log('Combined events:', combinedEvents.slice(0, 2));
    return combinedEvents;
  } catch (error) {
    console.error('Error processing events:', error);
    return [];
  }
};

// ...rest of existing code...
