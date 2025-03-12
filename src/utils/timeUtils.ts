/**
 * Utility functions for working with time and date in the schedule
 */

/**
 * Parses a time string into a properly formatted time
 * @param timeStr Time string in various formats (e.g., "9", "9:30", "09:00")
 * @returns Formatted time string in HH:MM format
 */
export const parseTimeString = (timeStr: string): string => {
  if (!timeStr) return '00:00';
  
  // Remove any non-alphanumeric characters
  const cleaned = timeStr.trim();
  
  // Check if it's already in HH:MM format
  if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
    const [hours, minutes] = cleaned.split(':').map(Number);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // Handle single number (assume it's hours)
  if (/^\d{1,2}$/.test(cleaned)) {
    const hours = parseInt(cleaned, 10);
    return `${hours.toString().padStart(2, '0')}:00`;
  }
  
  // Default fallback
  return '00:00';
};

/**
 * Formats a time range string consistently
 * @param timeRange Time range string in various formats (e.g., "9-10", "9:30-10:45")
 * @returns Properly formatted time range "HH:MM-HH:MM"
 */
export const formatTimeRange = (timeRange: string): string => {
  if (!timeRange) return '09:00-10:00';
  
  // Remove all whitespace
  const cleaned = timeRange.replace(/\s+/g, '');
  
  // Check if it contains a hyphen
  if (!cleaned.includes('-')) {
    // It's a single time, add 1 hour for end time
    const formattedStart = parseTimeString(cleaned);
    const [hours, minutes] = formattedStart.split(':').map(Number);
    const endHours = Math.min(hours + 1, 23);
    return `${formattedStart}-${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // Split by hyphen and format both parts
  const [startStr, endStr] = cleaned.split('-');
  const formattedStart = parseTimeString(startStr);
  const formattedEnd = parseTimeString(endStr);
  
  return `${formattedStart}-${formattedEnd}`;
};

/**
 * Creates a Date object from a date string and time string
 * @param dateStr Date in YYYY-MM-DD format
 * @param timeStr Time in HH:MM format
 * @returns JavaScript Date object
 */
export const createDateWithTime = (dateStr: string, timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

/**
 * Parses a time range with a date to create start and end Date objects
 * @param dateStr Date in YYYY-MM-DD format
 * @param timeRange Time range in HH:MM-HH:MM format
 * @returns Object with start and end Date objects
 */
export const parseTimeRangeWithDate = (dateStr: string, timeRange: string): { start: Date, end: Date } | null => {
  try {
    const formattedTimeRange = formatTimeRange(timeRange);
    const [startTimeStr, endTimeStr] = formattedTimeRange.split('-');
    
    const start = createDateWithTime(dateStr, startTimeStr);
    const end = createDateWithTime(dateStr, endTimeStr);
    
    return { start, end };
  } catch (error) {
    console.error('Error parsing time range:', error);
    return null;
  }
};

/**
 * Fixes issues in a weekly schedule's time formats
 * @param schedule Weekly schedule array
 * @returns Fixed schedule with proper time formats
 */
export const fixScheduleTimeFormats = (schedule: any[]): any[] => {
  if (!Array.isArray(schedule)) return [];
  
  return schedule.map(week => ({
    ...week,
    days: Array.isArray(week.days) ? week.days.map(day => ({
      ...day,
      tasks: Array.isArray(day.tasks) ? day.tasks.map(task => ({
        ...task,
        time: task.time ? formatTimeRange(task.time) : '09:00-10:00'
      })) : []
    })) : []
  }));
};

/**
 * Generates dates for a week starting from a base date
 * @param baseDate Starting date for the week
 * @param startDayOfWeek 0 for Sunday, 1 for Monday, etc.
 * @returns Array of date strings in YYYY-MM-DD format
 */
export const generateWeekDates = (baseDate: Date = new Date(), startDayOfWeek = 1): string[] => {
  const dates: string[] = [];
  const currentDay = baseDate.getDay();
  const diff = baseDate.getDate() - currentDay + (currentDay === 0 ? -6 : startDayOfWeek);
  
  const weekStart = new Date(baseDate);
  weekStart.setDate(diff);
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
};
