/**
 * Extracts JSON content from raw AI response text that may include explanations
 * or markdown formatting
 * 
 * @param {string} rawResponse - The raw response from the AI
 * @returns {string} - Cleaned JSON string
 */
export function extractJsonFromResponse(rawResponse) {
  if (!rawResponse) return '';
  
  try {
    // Remove markdown code block indicators
    let cleaned = rawResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Find content between opening and closing curly braces (most outer pair)
    const jsonMatch = cleaned.match(/(\{[\s\S]*\})/);
    if (jsonMatch && jsonMatch[0]) {
      cleaned = jsonMatch[0];
    }
    
    // Remove any non-JSON text before opening brace
    const openBraceIndex = cleaned.indexOf('{');
    if (openBraceIndex > 0) {
      cleaned = cleaned.substring(openBraceIndex);
    }
    
    // Remove any non-JSON text after closing brace
    const closeBraceIndex = cleaned.lastIndexOf('}');
    if (closeBraceIndex < cleaned.length - 1) {
      cleaned = cleaned.substring(0, closeBraceIndex + 1);
    }
    
    // Truncate to last balanced brace to handle partial JSON
    cleaned = fixMalformedJson(cleaned);

    // Validate that this is valid JSON
    JSON.parse(cleaned); // This will throw if invalid
    
    return cleaned;
  } catch (error) {
    console.error('Error extracting JSON from response:', error);
    throw new Error(`Failed to extract valid JSON: ${error.message}`);
  }
}

/**
 * Attempts multiple strategies to parse JSON from AI response
 * 
 * @param {string} rawResponse - The raw response from the AI
 * @returns {object} - Parsed JSON object
 */
export function parseAIResponse(rawResponse) {
  if (!rawResponse) {
    throw new Error('Empty response received');
  }
  
  try {
    const extractedJson = extractJsonFromResponse(rawResponse);
    const parsed = JSON.parse(extractedJson);
    
    // Handle study_schedule format
    if (parsed.study_schedule) {
      const weeks = {};
      
      Object.entries(parsed.study_schedule).forEach(([weekKey, weekData]) => {
        weeks[weekKey] = {
          week: weekKey,
          days: Object.entries(weekData).map(([dayName, dayData]) => ({
            day: dayName,
            date: dayData.date || new Date().toISOString().split('T')[0],
            tasks: dayData.tasks.map(task => ({
              time: `${task.start_time} - ${task.end_time}`,
              title: task.task,
              details: task.details || '',
              status: 'pending'
            }))
          }))
        };
      });

      return {
        weeklySchedule: Object.values(weeks)
      };
    }
    
    // If we get a schedule with time-based tasks
    if (parsed.schedule) {
      const weeks = {};
      
      // Convert time-based schedule to our format
      Object.entries(parsed.schedule).forEach(([weekKey, weekData]) => {
        weeks[weekKey] = {
          week: weekKey,
          days: Object.entries(weekData).map(([dayName, daySchedule]) => ({
            day: dayName,
            date: new Date().toISOString().split('T')[0], // placeholder date
            tasks: Object.entries(daySchedule).map(([time, activity]) => ({
              time: time,
              title: activity,
              details: '',
              status: 'pending'
            }))
          }))
        };
      });

      return {
        weeklySchedule: Object.values(weeks)
      };
    }
    
    // If we already have the correct format, return as is
    if (parsed.weeklySchedule) {
      return parsed;
    }

    // If we got a bare array, wrap it
    if (Array.isArray(parsed)) {
      return { weeklySchedule: parsed };
    }

    // Default case - wrap whatever we got in a schedule structure
    return {
      weeklySchedule: [{
        week: 'week_1',
        days: [parsed]
      }]
    };
    
  } catch (error) {
    if (error.statusCode === 429) {
      throw new Error('Rate limit exceeded. Please try again in a few moments.');
    }
    console.error('All parsing methods failed:', error);
    throw new Error(`Failed to parse AI response: ${error.message}`);
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
 * @returns {Promise} - Result of the API call
 */
async function withRetry(apiCall) {
  let lastError;
  
  for (let i = 0; i < RETRY_DELAYS.length; i++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      if (error.statusCode === 429) { // Rate limit error
        console.log(`Rate limited, retrying in ${RETRY_DELAYS[i]}ms...`);
        await sleep(RETRY_DELAYS[i]);
        continue;
      }
      throw error;
    }
  }
  
  throw lastError;
}

export { withRetry };
