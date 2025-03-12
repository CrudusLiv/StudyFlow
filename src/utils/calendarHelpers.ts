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
export const tasksToEvents = (weeklySchedule: any[]): CalendarEvent[] => {
  const events: CalendarEvent[] = [];
  
  if (!Array.isArray(weeklySchedule) || !weeklySchedule.length) {
    return events;
  }
  
  weeklySchedule.forEach(week => {
    if (!week.days || !Array.isArray(week.days)) return;
    
    week.days.forEach(day => {
      if (!day.date || !day.tasks || !Array.isArray(day.tasks)) return;
      
      day.tasks.forEach(task => {
        if (!task.time || !task.title) return;
        
        const timeRange = parseTimeRange(task.time, day.date);
        if (!timeRange) return;
        
        events.push({
          id: `${day.date}-${task.time}-${Math.random().toString(36).substring(2, 7)}`,
          title: task.title,
          start: timeRange.start,
          end: timeRange.end,
          description: task.details || '',
          allDay: false,
          priority: task.priority || 'medium',
          status: task.status || 'pending',
          category: task.category || 'study',
          resource: task
        });
      });
    });
  });
  
  return events;
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
