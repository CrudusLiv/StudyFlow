/**
 * Extracts JSON content from raw AI response text that may include explanations
 * or markdown formatting
 * 
 * @param {string} rawResponse - The raw response from the AI
 * @returns {string} - Cleaned JSON string
 */
const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
const PRIORITY_LEVELS = ['high', 'medium', 'low'];
const COMPLEXITY_LEVELS = ['high', 'medium', 'low'];
const VALID_STATUSES = ['pending', 'in-progress', 'completed'];

function validateTimeFormat(time) {
  if (!time) return false;
  const [start, end] = time.split(' - ');
  return TIME_REGEX.test(start) && TIME_REGEX.test(end);
}

function validateTaskTiming(task, preferences) {
  if (!task.time) return false;
  const [startTime, endTime] = task.time.split(' - ');
  const [startHour] = startTime.split(':').map(Number);
  const [endHour] = endTime.split(':').map(Number);
  const [wakeHour] = (preferences.wakeTime || "07:00").split(':').map(Number);
  const [sleepHour] = (preferences.sleepTime || "23:00").split(':').map(Number);
  return startHour >= wakeHour && endHour <= sleepHour;
}

function reconstructMalformedJson(jsonString) {
  const lines = jsonString.split('\n');
  let depth = 0;
  let result = '';
  let inString = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"' && line[j - 1] !== '\\') {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '{' || char === '[') {
          depth++;
        } else if (char === '}' || char === ']') {
          depth--;
        }
      }
      
      result += char;
    }
    
    // Add comma if needed
    if (i < lines.length - 1 && !line.endsWith(',') && !line.endsWith('{') && !line.endsWith('[')) {
      const nextLine = lines[i + 1].trim();
      if (nextLine && !nextLine.startsWith('}') && !nextLine.startsWith(']')) {
        result += ',';
      }
    }
  }
  
  // Close any unclosed structures
  while (depth > 0) {
    result += ']}';
    depth--;
  }
  
  return result;
}

function repairArrayStructure(jsonString) {
  let inString = false;
  let inArray = 0;
  let lastValidChar = '';
  let result = '';
  
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    const nextChar = jsonString[i + 1] || '';
    
    // Handle string content
    if (char === '"' && lastValidChar !== '\\') {
      inString = !inString;
    }
    
    // Track array nesting
    if (!inString) {
      if (char === '[') inArray++;
      if (char === ']') inArray--;
      
      // Fix missing commas between array elements
      if (lastValidChar && char !== ',' && char !== ']' && char !== '[' && 
          lastValidChar !== '[' && lastValidChar !== ',') {
        if (nextChar === '{' || nextChar === '[') {
          result += ',';
        }
      }
    }
    
    result += char;
    if (char.trim()) lastValidChar = char;
  }
  
  // Fix unclosed arrays
  while (inArray > 0) {
    result += ']';
    inArray--;
  }
  
  return result;
}

function cleanupJson(jsonString) {
  try {
    // First attempt: Find content between curly braces
    let matches = jsonString.match(/\{[\s\S]*\}/g);
    if (matches) {
      for (const match of matches) {
        try {
          JSON.parse(match);
          return match;
        } catch (e) {
          console.log('Failed to parse JSON match, continuing...');
        }
      }
    }

    // Second attempt: Look for specific schedule structure
    const scheduleMatch = jsonString.match(/("weeklySchedule"|weeklySchedule)\s*:\s*(\[[\s\S]*\])/);
    if (scheduleMatch) {
      const content = `{"weeklySchedule":${scheduleMatch[2]}}`;
      try {
        JSON.parse(content);
        return content;
      } catch (e) {
        console.log('Failed to parse schedule structure, attempting repair...');
      }
    }

    // Third attempt: Extract and repair JSON-like content
    const jsonLike = jsonString.replace(/```json\s*|\s*```/g, '')
                              .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
                              .replace(/:\s*'([^']*)'/g, ':"$1"');

    try {
      JSON.parse(jsonLike);
      return jsonLike;
    } catch (e) {
      console.log('Failed to repair JSON-like content');
    }

    throw new Error('No valid JSON structure found');
  } catch (error) {
    console.error('Initial cleanup failed:', error);
    return attemptDeepRecovery(jsonString);
  }
}

function attemptDeepRecovery(jsonString) {
  try {
    // Extract schedule structure, handle both array and object formats
    const scheduleMatch = jsonString.match(/weeklySchedule"?\s*:?\s*(\[[\s\S]*?\]|\{[\s\S]*?\})/i);
    
    if (!scheduleMatch) {
      console.log('No schedule structure found, attempting to extract any array');
      // Try to find any array structure
      const arrayMatch = jsonString.match(/\[([\s\S]*?)\]/);
      if (arrayMatch) {
        let content = arrayMatch[1].trim();
        content = repairArrayStructure(`[${content}]`);
        return `{"weeklySchedule":${content}}`;
      }
      return JSON.stringify(createDefaultScheduleStructure());
    }

    let content = scheduleMatch[1].trim();
    
    // Fix common JSON issues
    content = content
      .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3')
      .replace(/:\s*'([^']*)'/g, ':"$1"')
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/([{\[,])\s*([}\]])/g, '$1null$2')
      .replace(/"\s*,\s*([}\]])/g, '"$1')
      .replace(/(\{|\[)\s*,\s*/g, '$1')
      .replace(/\s*,\s*(\}|\])/g, '$1');

    // Ensure we have a complete array
    if (!content.startsWith('[')) content = '[' + content;
    if (!content.endsWith(']')) content += ']';

    // Try to parse the repaired content
    try {
      const structure = `{"weeklySchedule":${content}}`;
      JSON.parse(structure); // Validate
      return structure;
    } catch (e) {
      console.log('Deep recovery failed, attempting final repairs');
      // One last attempt with array repair
      const repaired = repairArrayStructure(content);
      return `{"weeklySchedule":${repaired}}`;
    }
  } catch (error) {
    console.error('Deep recovery failed completely:', error);
    return JSON.stringify(createDefaultScheduleStructure());
  }
}

function trimIncompleteArrays(jsonString) {
  let depth = 0;
  let lastCompleteArray = 0;

  for (let i = 0; i < jsonString.length; i++) {
    if (jsonString[i] === '[') {
      depth++;
    } else if (jsonString[i] === ']') {
      depth--;
      if (depth === 0) {
        lastCompleteArray = i;
      }
    }
  }

  // If we have unclosed arrays, trim to the last complete one
  if (depth > 0) {
    return jsonString.substring(0, lastCompleteArray + 1) + 
           ']}'; // Close any remaining object
  }

  return jsonString;
}

function createDefaultScheduleStructure(weeks = 4) {
  // Start date is tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return {
    weeklySchedule: Array(weeks).fill(null).map((_, weekIndex) => ({
      week: `Week ${weekIndex + 1}`,
      days: Array(7).fill(null).map((_, dayIndex) => ({
        day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex],
        date: new Date(tomorrow.getTime() + ((weekIndex * 7) + dayIndex) * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0],
        tasks: []
      }))
    }))
  };
}

function validateJsonStructure(jsonString) {
  try {
    // Pre-validate cleanup
    if (typeof jsonString !== 'string') {
      throw new Error('Input must be a string');
    }

    // Remove any remaining markdown artifacts
    jsonString = jsonString.replace(/^[\s,]*```[a-z]*[\s,]*/g, '');

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseError) {
      // Create a default structure if parsing fails completely
      if (parseError.message.includes('Unexpected end of JSON input')) {
        return JSON.stringify(createDefaultScheduleStructure());
      }
      
      // Try to recover partial structure
      if (parseError.message.includes('after array element') || 
          parseError.message.includes('Unexpected token')) {
        const repaired = repairArrayStructure(jsonString);
        try {
          parsed = JSON.parse(repaired);
        } catch {
          const recovered = attemptDeepRecovery(jsonString);
          try {
            parsed = JSON.parse(recovered);
          } catch {
            // If all recovery attempts fail, return default structure
            return JSON.stringify(createDefaultScheduleStructure());
          }
        }
      } else {
        const recovered = attemptDeepRecovery(jsonString);
        try {
          parsed = JSON.parse(recovered);
        } catch {
          return JSON.stringify(createDefaultScheduleStructure());
        }
      }
    }
    
    // Ensure weeklySchedule exists and is an array
    if (!parsed.weeklySchedule || !Array.isArray(parsed.weeklySchedule)) {
      if (parsed.time || parsed.tasks) {
        // We have a partial task structure, wrap it in proper schedule format
        const defaultSchedule = createDefaultScheduleStructure(1);
        if (Array.isArray(parsed.tasks)) {
          defaultSchedule.weeklySchedule[0].days[0].tasks = parsed.tasks;
        } else if (parsed.time) {
          defaultSchedule.weeklySchedule[0].days[0].tasks.push(parsed);
        }
        parsed = defaultSchedule;
      } else {
        parsed = createDefaultScheduleStructure();
      }
    }

    // Deep cleanup of all values
    const cleanValue = (value) => {
      if (Array.isArray(value)) {
        return value.filter(v => v != null).map(cleanValue);
      }
      if (value && typeof value === 'object') {
        const cleaned = {};
        for (const [key, val] of Object.entries(value)) {
          if (val != null) {
            cleaned[key] = cleanValue(val);
          }
        }
        return cleaned;
      }
      if (typeof value === 'string') {
        return value.replace(/"{2,}/g, '"').trim();
      }
      return value;
    };

    const normalized = cleanValue(parsed);
    return JSON.stringify(normalized);
  } catch (error) {
    console.error('JSON validation error:', error);
    console.error('Problematic JSON:', jsonString.substring(0, 200) + '...');
    // Return default structure as last resort
    return JSON.stringify(createDefaultScheduleStructure());
  }
}

export function extractJsonFromResponse(rawResponse) {
  if (!rawResponse) return '';
  
  try {
    const cleaned = cleanupJson(rawResponse);
    const validated = validateJsonStructure(cleaned);
    return validated;
  } catch (error) {
    console.error('Error extracting JSON:', error);
    throw new Error(`Failed to extract valid JSON: ${error.message}`);
  }
}

/**
 * Attempts multiple strategies to parse JSON from AI response
 * 
 * @param {string} rawResponse - The raw response from the AI
 * @returns {object} - Parsed JSON object
 */
export function parseAIResponse(rawResponse, preferences) {
  try {
    console.log('Parsing AI response, length:', rawResponse?.length);
    const extractedJson = extractJsonFromResponse(rawResponse);
    const parsed = JSON.parse(extractedJson);
    
    if (!parsed.weeklySchedule || !Array.isArray(parsed.weeklySchedule)) {
      console.warn('No weeklySchedule array found, creating default schedule');
      return createDefaultScheduleStructure(preferences.weeksAvailable || 4);
    }

    // Normalize and validate the schedule
    const normalizedSchedule = {
      weeklySchedule: parsed.weeklySchedule.map((week, weekIndex) => {
        if (!week || !week.days || !Array.isArray(week.days)) {
          console.warn(`Invalid week at index ${weekIndex}, creating default week`);
          return createDefaultWeek(weekIndex);
        }

        return {
          week: `Week ${weekIndex + 1}`,
          days: week.days.map((day, dayIndex) => {
            const tasks = Array.isArray(day?.tasks) ? day.tasks : [];
            console.log(`Week ${weekIndex + 1}, Day ${dayIndex + 1}: ${tasks.length} tasks found`);
            
            return {
              day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex],
              date: normalizeDate(day.date) || getDateForWeekDay(weekIndex, dayIndex),
              tasks: tasks
                .filter(task => task && typeof task === 'object')
                .map(task => ({
                  time: task.time || '09:00 - 10:00',
                  title: task.title || task.name || 'Untitled Task',
                  details: task.details || '',
                  status: task.status || 'pending',
                  priority: task.priority || 'medium',
                  category: task.category || 'study',
                  pdfReference: task.pdfReference || null
                }))
                .filter(task => task.title && task.title !== 'Untitled Task')
            };
          })
        };
      })
    };

    // Count total tasks
    const totalTasks = normalizedSchedule.weeklySchedule.reduce((acc, week) => 
      acc + week.days.reduce((dayAcc, day) => 
        dayAcc + (day.tasks ? day.tasks.length : 0), 0), 0);

    console.log(`Total tasks in normalized schedule: ${totalTasks}`);
    
    if (totalTasks === 0) {
      throw new Error('No valid tasks found in schedule');
    }

    return normalizedSchedule;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw error;
  }
}

function getDateForWeekDay(weekIndex, dayIndex) {
  const date = new Date();
  date.setDate(date.getDate() + (weekIndex * 7) + dayIndex);
  return date.toISOString().split('T')[0];
}

function createDefaultWeek(weekIndex, preferences) {
  return {
    week: `Week ${weekIndex + 1}`,
    days: Array(7).fill(null).map((_, dayIndex) => ({
      day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex],
      date: getDateForWeekDay(weekIndex, dayIndex),
      tasks: []
    }))
  };
}

/**
 * Normalizes time-based schedule format to array-based tasks
 */
function normalizeTimeBasedSchedule(weekData) {
  const normalized = {};
  
  for (const [weekKey, weekValue] of Object.entries(weekData)) {
    normalized[weekKey] = {};
    for (const [day, daySchedule] of Object.entries(weekValue)) {
      const tasks = [];
      for (const [time, activity] of Object.entries(daySchedule)) {
        tasks.push({
          time,
          title: activity,
          details: '',
          status: 'pending'
        });
      }
      normalized[weekKey][day] = {
        day,
        tasks: tasks
      };
    }
  }
  return normalized;
}

function fixMalformedJson(jsonString) {
  let curlyStack = 0;
  let squareStack = 0;
  let validEndIndex = -1;

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    if (char === '{') {
      curlyStack++;
    } else if (char === '}') {
      curlyStack--;
      if (curlyStack === 0 && squareStack === 0) {
        validEndIndex = i;
      }
    } else if (char === '[') {
      squareStack++;
    } else if (char === ']') {
      squareStack--;
      if (curlyStack === 0 && squareStack === 0) {
        validEndIndex = i;
      }
    }
  }

  return validEndIndex !== -1
    ? jsonString.substring(0, validEndIndex + 1)
    : jsonString;
}

const RETRY_DELAYS = [1000, 2000, 4000]; // Retry delays in milliseconds

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Handle rate limiting with retries
 * @param {Function} apiCall - The API call to retry
 * @param {Object} options - Retry configuration options
 * @param {number} options.maxAttempts - Maximum number of retry attempts
 * @param {number} options.baseDelay - Base delay between retries in ms
 * @param {number} options.maxDelay - Maximum delay between retries in ms
 * @returns {Promise} - Result of the API call
 */
async function withRetry(apiCall, options = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 4000
}) {
  let lastError;
  
  const shouldRetry = (error) => {
    const retryableErrors = [
      'UND_ERR_HEADERS_TIMEOUT',
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED'
    ];
    
    return (
      error.code && retryableErrors.includes(error.code) ||
      error.cause?.code && retryableErrors.includes(error.cause.code) ||
      error.statusCode === 429 ||
      error.message.includes('timeout') ||
      error.message.includes('fetch failed') ||
      error.cause?.message?.includes('Headers Timeout Error')
    );
  };
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, {
        message: error.message,
        code: error.code,
        causeCode: error.cause?.code,
        causeMessage: error.cause?.message
      });
      
      if (attempt < options.maxAttempts && shouldRetry(error)) {
        const delay = Math.min(
          options.baseDelay * Math.pow(2, attempt - 1) * (1 + Math.random() * 0.1),
          options.maxDelay
        );
        
        console.log(`Retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

function normalizeTask(task) {
  if (!task || typeof task !== 'object') {
    return null; // Return null instead of default task to be filtered out later
  }

  // Only create a task if we have at least a title or time
  if (!task.title && !task.time) {
    return null;
  }

  // Keep original values when available, only fill in missing ones
  return {
    time: task.time || '09:00 - 10:00',
    title: task.title || task.name || task.description || null, // Try multiple possible title fields
    details: task.details || task.description || task.pdfReference?.quote || '',
    status: task.status || 'pending',
    priority: task.priority || 'medium',
    duration: task.duration || 60,
    category: task.category || 'study',
    ...(task.pdfReference && { pdfReference: task.pdfReference }),
    source: task.source || task.pdfReference?.page || ''
  };
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  try {
    // Handle different date formats
    const date = dateStr.includes(',') 
      ? new Date(dateStr) // Handle "March 11, 2025" format
      : new Date(dateStr); // Handle ISO format
    
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    return null;
  }
}

function validateScheduleStructure(schedule, preferences) {
  // First ensure we have a valid schedule object
  if (!schedule || typeof schedule !== 'object') {
    return createDefaultScheduleStructure(preferences.weeksAvailable || 4);
  }

  try {
    // Handle both single week and multi-week formats
    if (!schedule.weeklySchedule) {
      schedule = {
        weeklySchedule: Array.isArray(schedule) ? schedule : [schedule]
      };
    }

    const requiredWeeks = preferences.weeksAvailable || 4;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Ensure weeklySchedule is an array
    if (!Array.isArray(schedule.weeklySchedule)) {
      schedule.weeklySchedule = [schedule.weeklySchedule];
    }

    // Normalize and validate the schedule structure
    schedule.weeklySchedule = schedule.weeklySchedule
      .filter(week => week && typeof week === 'object')
      .map((week, weekIndex) => ({
        week: `Week ${weekIndex + 1}`,
        days: Array(7).fill(null).map((_, dayIndex) => {
          const existingDay = week.days?.[dayIndex] || {};
          return {
            day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex],
            date: normalizeDate(existingDay.date) || 
                  new Date(tomorrow.getTime() + ((weekIndex * 7) + dayIndex) * 24 * 60 * 60 * 1000)
                    .toISOString().split('T')[0],
            tasks: Array.isArray(existingDay.tasks) 
              ? existingDay.tasks
                  .map(normalizeTask)
                  .filter(task => task !== null && task.title && task.time)
              : []
          };
        })
      }));

    // Ensure we have the correct number of weeks
    while (schedule.weeklySchedule.length < requiredWeeks) {
      const weekIndex = schedule.weeklySchedule.length;
      schedule.weeklySchedule.push({
        week: `Week ${weekIndex + 1}`,
        days: Array(7).fill(null).map((_, dayIndex) => ({
          day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex],
          date: new Date(tomorrow.getTime() + ((weekIndex * 7) + dayIndex) * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0],
          tasks: []
        }))
      });
    }

    // Trim to required number of weeks
    schedule.weeklySchedule = schedule.weeklySchedule.slice(0, requiredWeeks);

    return schedule;
  } catch (error) {
    console.error('Error validating schedule structure:', error);
    return createDefaultScheduleStructure(preferences.weeksAvailable || 4);
  }
}

export { withRetry };
