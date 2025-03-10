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
    // First, clean up markdown and code block artifacts
    let cleaned = jsonString
      .replace(/```json\s*,?/g, '') // Remove ```json and any trailing comma
      .replace(/```\s*/g, '')
      .replace(/^[,\s]+/, '') // Remove leading commas and whitespace
      .trim();

    // If we have multiple JSON objects (due to markdown blocks), take the first valid one
    const jsonMatches = cleaned.match(/({[\s\S]*?})/g);
    if (jsonMatches) {
      // Try each potential JSON block
      for (const match of jsonMatches) {
        try {
          JSON.parse(match);
          cleaned = match;
          break;
        } catch (e) {
          continue;
        }
      }
    }

    // Extract the JSON content between outermost braces
    const startBrace = cleaned.indexOf('{');
    const endBrace = cleaned.lastIndexOf('}');
    
    if (startBrace === -1 || endBrace === -1) {
      cleaned = reconstructMalformedJson(cleaned);
    } else {
      cleaned = cleaned.slice(startBrace, endBrace + 1);
    }

    // Enhanced cleanup process
    cleaned = cleaned
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/([{,]\s*)(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '$1"$3":')
      .replace(/:\s*'([^']*)'/g, ':"$1"')
      .replace(/\s+/g, ' ')
      .replace(/\.{3,}|…/g, '')
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([{\[,])\s*([}\]])/g, '$1null$2')
      .replace(/,\s*,/g, ',null,')
      .replace(/\n|\r/g, '')
      .replace(/\\\\/g, '\\')
      .replace(/\\""/g, '\\"')
      .replace(/([{\[,]\s*)(```\s*)/g, '$1') // Remove any remaining code block markers
      .replace(/,+\s*([}\]])/g, '$1'); // Remove multiple trailing commas
      
    // Apply array-specific repairs
    cleaned = repairArrayStructure(cleaned);
    
    try {
      JSON.parse(cleaned);
      return cleaned;
    } catch (e) {
      if (e.message.includes('after array element')) {
        // Try one more time with aggressive array repair
        cleaned = cleaned.replace(/}(?!\s*[},\]])/g, '},');
        cleaned = cleaned.replace(/\](?!\s*[},\]])/g, '],');
        return cleaned;
      }
      throw e;
    }
  } catch (error) {
    console.log('Initial cleanup failed, attempting deep recovery...', error);
    return attemptDeepRecovery(jsonString);
  }
}

function attemptDeepRecovery(jsonString) {
  // New function to handle severely malformed JSON
  try {
    // First attempt: Fix missing quotes around property names
    let fixed = jsonString.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
    
    // Second attempt: Fix unmatched brackets
    let openBraces = 0, openBrackets = 0;
    let chars = fixed.split('');
    
    for (let i = 0; i < chars.length; i++) {
      if (chars[i] === '{') openBraces++;
      if (chars[i] === '}') openBraces--;
      if (chars[i] === '[') openBrackets++;
      if (chars[i] === ']') openBrackets--;
      
      // Fix negative counts (too many closing brackets)
      if (openBraces < 0) {
        chars.splice(i, 1); // Remove extra closing brace
        openBraces++;
        i--;
      }
      if (openBrackets < 0) {
        chars.splice(i, 1); // Remove extra closing bracket
        openBrackets++;
        i--;
      }
    }
    
    // Add missing closing brackets
    while (openBraces > 0) {
      chars.push('}');
      openBraces--;
    }
    while (openBrackets > 0) {
      chars.push(']');
      openBrackets--;
    }
    
    fixed = chars.join('');
    
    // Third attempt: Fix trailing commas and missing values
    fixed = fixed
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([{\[,])\s*([}\]])/g, '$1null$2');
    
    // Validate the fixed JSON
    try {
      JSON.parse(fixed);
      return fixed;
    } catch (e) {
      // If still invalid, try one last time with a more aggressive approach
      return reconstructMalformedJson(fixed);
    }
  } catch (error) {
    console.error('Deep recovery failed:', error);
    throw new Error('Unable to recover malformed JSON');
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
  return {
    weeklySchedule: Array(weeks).fill(null).map((_, weekIndex) => ({
      week: `Week ${weekIndex + 1}`,
      days: Array(7).fill(null).map((_, dayIndex) => ({
        day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex],
        date: new Date(Date.now() + ((weekIndex * 7) + dayIndex) * 24 * 60 * 60 * 1000)
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
export function parseAIResponse(rawResponse, preferences = {}) {
  if (!rawResponse) {
    return createDefaultScheduleStructure(preferences.weeksAvailable || 4);
  }
  
  try {
    const extractedJson = extractJsonFromResponse(rawResponse);
    const parsed = JSON.parse(extractedJson);
    return validateScheduleStructure(parsed, preferences);
  } catch (error) {
    console.error('All parsing methods failed:', error);
    return createDefaultScheduleStructure(preferences.weeksAvailable || 4);
  }
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
    // Check specific error codes and types
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
          options.baseDelay * Math.pow(2, attempt - 1) * (1 + Math.random() * 0.1), // Add jitter
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
    return {
      time: '09:00 - 10:00',
      title: 'Untitled Task',
      details: '',
      status: 'pending',
      priority: 'medium',
      duration: 60
    };
  }

  return {
    time: task.time || '09:00 - 10:00',
    title: task.title || 'Untitled Task',
    details: task.details || '',
    status: task.status || 'pending',
    priority: task.priority || 'medium',
    duration: task.duration || 60,
    ...(task.pdfReference && { pdfReference: task.pdfReference })
  };
}

function validateScheduleStructure(schedule, preferences) {
  // First ensure we have a valid schedule object
  if (!schedule || typeof schedule !== 'object') {
    return createDefaultScheduleStructure(preferences.weeksAvailable || 4);
  }

  try {
    // Handle both single week and multi-week formats
    if (!Array.isArray(schedule.weeklySchedule)) {
      if (Array.isArray(schedule.days)) {
        schedule = {
          weeklySchedule: [{
            week: 'Week 1',
            days: schedule.days
          }]
        };
      } else {
        schedule = createDefaultScheduleStructure(preferences.weeksAvailable || 4);
      }
    }

    const requiredWeeks = preferences.weeksAvailable || 4;
    const startDate = new Date();

    // Normalize and validate the schedule structure
    schedule.weeklySchedule = schedule.weeklySchedule.map((week, weekIndex) => {
      // Ensure week has proper structure
      if (!week || !Array.isArray(week.days)) {
        week = {
          week: `Week ${weekIndex + 1}`,
          days: []
        };
      }

      // Normalize each day's data
      const normalizedDays = Array(7).fill(null).map((_, dayIndex) => {
        const existingDay = week.days[dayIndex] || {};
        return {
          day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex],
          date: existingDay.date || new Date(startDate.getTime() + ((weekIndex * 7) + dayIndex) * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0],
          tasks: Array.isArray(existingDay.tasks) 
            ? existingDay.tasks
                .filter(task => task && (task.time || task.title)) // Filter out empty tasks
                .map(normalizeTask)
                .filter(task => {
                  const [startTime] = (task.time || '').split(' - ');
                  return startTime >= (preferences.wakeTime || '07:00') && 
                         startTime <= (preferences.sleepTime || '23:00');
                })
            : []
        };
      });

      return {
        week: week.week || `Week ${weekIndex + 1}`,
        days: normalizedDays
      };
    });

    // Ensure we have the correct number of weeks
    while (schedule.weeklySchedule.length < requiredWeeks) {
      const weekIndex = schedule.weeklySchedule.length;
      schedule.weeklySchedule.push({
        week: `Week ${weekIndex + 1}`,
        days: Array(7).fill(null).map((_, dayIndex) => ({
          day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex],
          date: new Date(startDate.getTime() + ((weekIndex * 7) + dayIndex) * 24 * 60 * 60 * 1000)
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
