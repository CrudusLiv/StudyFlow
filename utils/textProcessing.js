/**
 * Extract assignments from text content
 * @param {string} text - Raw text content
 * @returns {Array} Array of assignment objects
 */
export function extractAssignments(text) {
  console.log('Starting enhanced assignment extraction...');
  const assignments = [];
  const sections = text.split(/\n\s*\n/);

  sections.forEach(section => {
    // Enhanced patterns for finding assignments
    const assignmentPatterns = [
      /assignment\s*(?:no\.?|number)?[\s:]*(\d+)/i,
      /assessment\s*(?:no\.?|number)?[\s:]*(\d+)/i,
      /project\s*(?:no\.?|number)?[\s:]*(\d+)/i,
      /task\s*(?:no\.?|number)?[\s:]*(\d+)/i,
      /deliverable\s*(?:no\.?|number)?[\s:]*(\d+)/i
    ];

    for (const pattern of assignmentPatterns) {
      const match = section.match(pattern);
      if (match) {
        const title = extractTitle(section);
        const dueDate = extractDueDate(section);
        
        // Create assignment with enhanced fallbacks for missing data
        const assignment = {
          number: match[1],
          title: title || `Assignment ${match[1]}`,
          dueDate: dueDate,
          weight: extractWeight(section),
          requirements: extractRequirements(section),
          deliverables: extractDeliverables(section),
          type: 'assignment',
          // Add fallback due date for scheduling if none found
          fallbackDueDate: generateFallbackDueDate(match[1])
        };

        assignments.push(assignment);
        break; // Found an assignment in this section
      }
    }
  });

  // Add additional logging for debugging
  console.log(`Found ${assignments.length} assignments:`, 
    assignments.map(a => ({
      title: a.title, 
      dueDate: a.dueDate,
      hasFallbackDate: !!a.fallbackDueDate
    })));
  
  return assignments;
}

// Generate a fallback due date for assignments without explicit dates
function generateFallbackDueDate(assignmentNumber) {
  // Create dates relative to today, spreading assignments throughout semester
  const today = new Date();
  const assignmentNum = parseInt(assignmentNumber) || 1;
  
  // Assume typical semester length (about 4 months)
  // Add 2-4 weeks per assignment number to get a reasonable spread
  const daysToAdd = 14 + (assignmentNum * 14);
  
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + daysToAdd);
  
  return dueDate;
}

// Extract title from section text
function extractTitle(section) {
  // Try to find a title line (usually after "Assignment X:" pattern)
  const titlePatterns = [
    /(?:assignment|project|task|assessment|deliverable)[^:]*:\s*([^\n]+)/i,
    /(?:title|topic):\s*([^\n]+)/i,
    /^([^\n]+)(?=\n)/i // First line as fallback
  ];

  for (const pattern of titlePatterns) {
    const match = section.match(pattern);
    if (match && match[1]) {
      return cleanTitle(match[1].trim());
    }
  }
  
  // If no patterns match, use first non-empty line
  const lines = section.split('\n');
  for (const line of lines) {
    if (line.trim().length > 0) {
      return cleanTitle(line.trim());
    }
  }
  
  return "Untitled Assignment";
}

// Extract due date from section text
function extractDueDate(section) {
  // Common date formats
  const dueDatePatterns = [
    /\bdue\s*(?:date|by|on)?[:]*\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
    /\bdue\s*(?:date|by|on)?[:]*\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i,
    /\bsubmission\s*(?:date|deadline)?[:]*\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
    /\bdeadline[:]*\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
    /\bdeadline[:]*\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i
  ];

  for (const pattern of dueDatePatterns) {
    const match = section.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Look for any date pattern in the text
  const datePatterns = [
    /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
    /([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i
  ];

  for (const pattern of datePatterns) {
    const match = section.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Extract weight/points from section text
function extractWeight(section) {
  const weightPatterns = [
    /\b(?:worth|value|weight|grade)[:]*\s*(\d+)%/i,
    /\b(?:worth|value|weight|grade)[:]*\s*(\d+)\s*(?:percent|points|marks)/i,
    /\b(\d+)%\s*(?:of|worth|value|weight|grade)/i,
    /\b(\d+)\s*(?:percent|points|marks)\b/i
  ];

  for (const pattern of weightPatterns) {
    const match = section.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Extract requirements from section text
function extractRequirements(section) {
  const requirementsPatterns = [
    /\b(?:requirements|specs|specifications)[:]*\s*([^\n]+(?:\n[^\n]+)*)/i,
    /\byou(?:'re| are)?\s+required\s+to\s+([^\n]+(?:\n[^\n]+)*)/i,
    /\bmust\s+include\s+([^\n]+(?:\n[^\n]+)*)/i
  ];

  for (const pattern of requirementsPatterns) {
    const match = section.match(pattern);
    if (match && match[1]) {
      return match[1].trim().split('\n').map(r => r.trim()).filter(r => r.length > 0);
    }
  }

  // Try to extract bullet points or numbered lists
  const bulletItems = [];
  const bulletPattern = /(?:^|\n)(?:\s*[•\-*]\s*|\s*\d+\.\s*)([^\n]+)/g;
  let bulletMatch;
  
  while ((bulletMatch = bulletPattern.exec(section)) !== null) {
    bulletItems.push(bulletMatch[1].trim());
  }

  if (bulletItems.length > 0) {
    return bulletItems;
  }

  return [];
}

// Extract deliverables from section text
function extractDeliverables(section) {
  const deliverablesPatterns = [
    /\b(?:deliverables|submit|submission|turn in|deliver)[:]*\s*([^\n]+(?:\n[^\n]+)*)/i,
    /\byou(?:'re| are)?\s+(?:to\s+)?submit\s+([^\n]+(?:\n[^\n]+)*)/i
  ];

  for (const pattern of deliverablesPatterns) {
    const match = section.match(pattern);
    if (match && match[1]) {
      return match[1].trim().split('\n').map(d => d.trim()).filter(d => d.length > 0);
    }
  }

  return [];
}

// Enhance the parseDateString function to handle more formats
function parseDateString(dateString) {
  if (!dateString) return null;
  
  try {
    // Clean up the date string to handle common issues
    const cleaned = dateString.replace(/\bdates?\b/i, '')
                             .replace(/\bdue\b/i, '')
                             .replace(/\bdeadline\b/i, '')
                             .replace(/\bby\b/i, '')
                             .trim();
    
    // Handle various date formats
    // MM/DD/YYYY or DD/MM/YYYY
    const slashMatch = cleaned.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (slashMatch) {
      // Try both MM/DD/YYYY and DD/MM/YYYY interpretations
      const month1 = parseInt(slashMatch[1]) - 1; // JavaScript months are 0-indexed
      const day1 = parseInt(slashMatch[2]);
      const year = parseInt(slashMatch[3]);
      
      const date1 = new Date(year, month1, day1);
      
      // If the result seems valid, use it
      if (!isNaN(date1.getTime()) && date1.getMonth() === month1) {
        return date1;
      }
      
      // Try alternative interpretation
      const month2 = parseInt(slashMatch[2]) - 1;
      const day2 = parseInt(slashMatch[1]);
      const date2 = new Date(year, month2, day2);
      
      if (!isNaN(date2.getTime()) && date2.getMonth() === month2) {
        return date2;
      }
    }
    
    // YYYY-MM-DD
    const isoMatch = cleaned.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1;
      const day = parseInt(isoMatch[3]);
      
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Month name format (e.g., "January 15, 2023")
    const monthNameMatch = cleaned.match(/([A-Za-z]+)\s+(\d{1,2})(?:,|\s+)?\s*(\d{4})/);
    if (monthNameMatch) {
      const monthName = monthNameMatch[1];
      const day = parseInt(monthNameMatch[2]);
      const year = parseInt(monthNameMatch[3]);
      
      const months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      
      const monthIndex = months.findIndex(m => m.toLowerCase().includes(monthName.toLowerCase()));
      if (monthIndex !== -1) {
        const date = new Date(year, monthIndex, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    // Try to use Date.parse() as fallback for other formats
    const timestamp = Date.parse(cleaned);
    if (!isNaN(timestamp)) {
      return new Date(timestamp);
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing date string:', dateString, error);
    return null;
  }
}

// Parse semester format dates (e.g., "Semester 2, 2025")
function parseSemesterDate(dateString) {
  if (!dateString) return null;
  
  const semesterPattern = /semester\s*(\d+)(?:\s*,\s*|\s+)(\d{4})/i;
  const match = dateString.match(semesterPattern);
  
  if (match) {
    const semesterNum = parseInt(match[1]);
    const year = parseInt(match[2]);
    
    // Create approximate dates based on semester number
    // Semester 1 typically ends in May/June, Semester 2 in Nov/Dec
    const date = new Date();
    date.setFullYear(year);
    
    if (semesterNum === 1) {
      date.setMonth(5); // June
      date.setDate(15);
    } else if (semesterNum === 2) {
      date.setMonth(11); // December
      date.setDate(15);
    } else {
      // Default to end of year for unknown semester numbers
      date.setMonth(11);
      date.setDate(15);
    }
    
    return date;
  }
  
  return null;
}

// Calculate required hours for an assignment
function calculateRequiredHours(assignment) {
  // Start with a base estimate
  let hours = 3;

  // Adjust based on type
  if (assignment.type) {
    switch (assignment.type.toLowerCase()) {
      case 'exam': hours = 6; break;
      case 'project': hours = 8; break;
      case 'presentation': hours = 5; break;
      case 'report': hours = 4; break;
      case 'quiz': hours = 2; break;
      case 'homework': hours = 2; break;
      default: hours = 3;
    }
  }

  // Adjust based on weight if available
  if (assignment.weight) {
    const weight = parseInt(assignment.weight);
    if (!isNaN(weight)) {
      // Assignments worth more need more time
      if (weight >= 30) hours *= 1.5;
      else if (weight >= 20) hours *= 1.3;
      else if (weight >= 10) hours *= 1.1;
    }
  }

  // Adjust based on requirements complexity
  if (Array.isArray(assignment.requirements)) {
    hours += assignment.requirements.length * 0.5;
  }

  return Math.max(1, hours); // Minimum 1 hour
}

// Calculate days needed between start and due date
function calculateDaysNeeded(totalHours, preferences = {}) {
  // Default preferences
  const maxDailyHours = preferences.maxDailyStudyHours || 3;
  const minDays = preferences.minimumDaysBetweenSessions || 2;
  
  // Calculate based on total hours and max daily hours
  let days = Math.ceil(totalHours / maxDailyHours);
  
  // Ensure we have at least the minimum number of days
  days = Math.max(days, minDays);
  
  // Add buffer days for larger tasks
  if (totalHours > 10) {
    days += 2;
  } else if (totalHours > 5) {
    days += 1;
  }
  
  return days;
}

// Calculate start date based on due date and days needed
function calculateStartDate(dueDate, daysNeeded) {
  if (!dueDate || !(dueDate instanceof Date)) {
    return new Date(); // Default to today if no valid due date
  }

  const startDate = new Date(dueDate);
  startDate.setDate(startDate.getDate() - daysNeeded);
  
  return startDate;
}

// Estimate assignment complexity
function estimateComplexity(assignment) {
  // Base complexity is 1.0
  let complexity = 1.0;
  
  // Adjust based on assignment type
  if (assignment.type) {
    switch (assignment.type.toLowerCase()) {
      case 'exam': complexity *= 1.4; break;
      case 'project': complexity *= 1.3; break;
      case 'report': complexity *= 1.2; break;
      case 'presentation': complexity *= 1.1; break;
    }
  }
  
  // Adjust based on requirements complexity
  if (Array.isArray(assignment.requirements)) {
    // Look for complex requirement indicators
    const complexityIndicators = [
      /analys[ie]s/i, /research/i, /design/i, /develop/i, /implement/i,
      /evaluate/i, /create/i, /synthesi[sz]e/i, /critique/i, /investigate/i,
      /complex/i, /advanced/i, /challenging/i, /difficult/i
    ];
    
    let complexityMatches = 0;
    for (const req of assignment.requirements) {
      for (const indicator of complexityIndicators) {
        if (indicator.test(req)) {
          complexityMatches++;
          break; // Count each requirement only once
        }
      }
    }
    
    // Adjust complexity based on matches (up to +50%)
    complexity *= (1 + (complexityMatches * 0.1));
  }
  
  // Adjust based on deliverables
  if (Array.isArray(assignment.deliverables) && assignment.deliverables.length > 2) {
    complexity *= 1.1; // More deliverables = more complex
  }
  
  // Cap complexity between 0.5 and 2.0
  return Math.max(0.5, Math.min(2.0, complexity));
}

function cleanTitle(text) {
  // Remove common prefixes and clean up the title
  return text
    .replace(/^(?:assignment|homework|project|task|exercise)[\s:]*\d*[\s:]*/i, '')
    .replace(/\bdue\s*(?:date|by|on)?[:]*\s*\d{1,2}[-/]\d{1,2}[-/]\d{4}\b.*/i, '')
    .trim();
}

function estimateWorkHoursEnhanced(text) {
  let baseHours = 2; // Default base hours

  // Adjust based on specific keywords
  if (/\b(?:report|paper|essay|research)\b/i.test(text)) baseHours += 2;
  if (/\b(?:presentation|project)\b/i.test(text)) baseHours += 3;
  if (/\b(?:group|team)\b/i.test(text)) baseHours += 1;

  // Adjust based on complexity indicators
  const complexityKeywords = text.match(/\b(?:analyze|research|create|develop|implement|design|evaluate)\b/gi) || [];
  baseHours += complexityKeywords.length;

  return Math.max(1, Math.min(8, baseHours));
}

function extractDetails(text) {
  const details = [];

  // Extract page numbers
  const pageMatch = text.match(/page(?:s)?\s*(?::|=)?\s*(\d+(?:\s*-\s*\d+)?)/i);
  if (pageMatch) details.push(`Pages: ${pageMatch[1]}`);

  // Extract word count
  const wordMatch = text.match(/(\d+)\s*words/i);
  if (wordMatch) details.push(`Word count: ${wordMatch[1]}`);

  // Extract submission method
  const submitMatch = text.match(/submit\s+(?:via|through|on)\s+([^.,]+)/i);
  if (submitMatch) details.push(`Submit via: ${submitMatch[1].trim()}`);

  return details.join(' | ');
}

/**
 * Parse various date formats into a standardized date object
 * @param {string} dateStr - The date string to parse
 * @returns {Date|null} - Parsed date or null if invalid
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;
  
  console.log(`Attempting to parse date: "${dateStr}"`);
  
  // Try standard JavaScript Date parsing first
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    console.log(`Successfully parsed standard date format: ${date.toISOString()}`);
    return date;
  }
  
  // Handle "2nd July 2025" format
  const britishFormat = /(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{4})/i;
  const britishMatch = dateStr.match(britishFormat);
  if (britishMatch) {
    const day = parseInt(britishMatch[1], 10);
    const monthStr = britishMatch[2].toLowerCase();
    const year = parseInt(britishMatch[3], 10);
    
    const monthMap = {
      "january": 0, "jan": 0,
      "february": 1, "feb": 1,
      "march": 2, "mar": 2,
      "april": 3, "apr": 3,
      "may": 4,
      "june": 5, "jun": 5,
      "july": 6, "jul": 6,
      "august": 7, "aug": 7,
      "september": 8, "sep": 8,
      "october": 9, "oct": 9,
      "november": 10, "nov": 10,
      "december": 11, "dec": 11
    };
    
    const monthIndex = monthMap[monthStr];
    if (monthIndex !== undefined && day >= 1 && day <= 31 && year >= 2000) {
      date = new Date(year, monthIndex, day);
      console.log(`Successfully parsed British date format: ${date.toISOString()}`);
      return date;
    }
  }
  
  // Try DD/MM/YYYY format
  const ddmmyyyy = /(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/;
  const ddmmyyyyMatch = dateStr.match(ddmmyyyy);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1; // JS months are 0-indexed
    const year = parseInt(ddmmyyyyMatch[3], 10);
    
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      date = new Date(year, month, day);
      console.log(`Successfully parsed DD/MM/YYYY format: ${date.toISOString()}`);
      return date;
    }
  }
  
  // If we get here, we couldn't parse the date
  console.log(`Could not parse date: "${dateStr}"`);
  return null;
}

// Map of file names to fixed due dates (YYYY-MM-DD format)
const FILE_NAME_DUE_DATES = {
  'DIP102_Assignment_1': '2025-05-28',
  'DIP102_Assignment_2': '2025-07-02',
  'DIP103_Assignment_1': '2025-05-05',
  'DIP103_Assignment_2': '2025-07-13',
  'DIP105_Assignment_1': '2025-06-22',
  'DIP105_Assignment_2': '2025-07-20',
  'DIP211_Assignment_1': '2025-05-30',
  'DIP211_Assignment_2': '2025-07-30'
};

// Store persistent semester dates across function calls
let persistentSemesterDates = null;

/**
 * Create a due date based on file name or fallback to semester dates
 * @param {string} assignmentTitle - The title of the assignment or document content
 * @param {Array} classSchedule - User's class schedule data (used for semester dates)
 * @param {Object} preferences - User preferences (used for semester dates)
 * @param {string} fileName - File name to check for fixed due dates
 * @returns {Date} - Due date for the assignment
 */
export function createFallbackDueDate(assignmentTitle, classSchedule = [], preferences = {}, fileName = '') {
  // PRIORITY: Check if we have a fixed due date for this file name
  if (fileName) {
    // Remove file extension and clean up the name
    const cleanFileName = fileName.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_');
    console.log(`Looking for due date for file: "${cleanFileName}"`);
    
    // Check for exact matches in our defined dates
    if (FILE_NAME_DUE_DATES[cleanFileName]) {
      console.log(`Found exact match in fixed due dates: ${cleanFileName} -> ${FILE_NAME_DUE_DATES[cleanFileName]}`);
      const fixedDueDate = new Date(FILE_NAME_DUE_DATES[cleanFileName]);
      fixedDueDate.setHours(23, 59, 0, 0);
      return fixedDueDate;
    }
    
    // Check for pattern matches (partial matches)
    for (const [filePattern, dueDate] of Object.entries(FILE_NAME_DUE_DATES)) {
      if (cleanFileName.includes(filePattern) || filePattern.includes(cleanFileName)) {
        console.log(`Found pattern match in fixed due dates: ${cleanFileName} matches ${filePattern} -> ${dueDate}`);
        const fixedDueDate = new Date(dueDate);
        fixedDueDate.setHours(23, 59, 0, 0);
        return fixedDueDate;
      }
    }
    
    // Try to extract course code and assignment number from file name
    const courseCodeMatch = fileName.match(/([A-Z]{2,}\d{3})/i);
    const assignmentMatch = fileName.match(/assignment[_\s]*(\d+)/i) || 
                           fileName.match(/a(\d+)[_\.]/i) ||
                           fileName.match(/(\d+)[_\s]*assignment/i);
    
    if (courseCodeMatch && assignmentMatch) {
      const courseCode = courseCodeMatch[1].toUpperCase();
      const assignmentNumber = parseInt(assignmentMatch[1], 10);
      
      console.log(`Extracted from filename: ${courseCode} Assignment ${assignmentNumber}`);
      
      // Look for a matching pattern in FILE_NAME_DUE_DATES
      const potentialPattern = `${courseCode}_Assignment_${assignmentNumber}`;
      console.log(`Looking for pattern match: ${potentialPattern}`);
      
      for (const [filePattern, dueDate] of Object.entries(FILE_NAME_DUE_DATES)) {
        if (filePattern.includes(courseCode) && filePattern.includes(`Assignment_${assignmentNumber}`)) {
          const fixedDueDate = new Date(dueDate);
          console.log(`Found course code + assignment number match: ${courseCode} Assignment ${assignmentNumber} = ${filePattern} -> ${dueDate}`);
          
          // Set time to end of day (11:59 PM)
          fixedDueDate.setHours(23, 59, 0, 0);
          return fixedDueDate;
        }
      }
    }
  }

  // Extract assignment information from title for logging purposes only
  const courseCodeMatch = assignmentTitle.match(/\b([A-Z]{2,}[-\s]?[A-Z0-9]*\d{3}[A-Z0-9]*)\b/i);
  const courseCode = courseCodeMatch ? courseCodeMatch[1].toUpperCase().replace(/[-\s]/g, '') : null;
  
  const assignmentNumberMatch = assignmentTitle.match(/(?:assignment|project|homework|hw|lab)\s*(?:no\.?|number|#)?\s*(\d+)|(?:^|\s+)a(\d+)\b/i);
  const assignmentNumber = assignmentNumberMatch 
    ? parseInt(assignmentNumberMatch[1] || assignmentNumberMatch[2], 10) 
    : 1;
  
  // ADDITIONAL ATTEMPT: Try to match course code and assignment number from title with our fixed dates
  if (courseCode && assignmentNumber) {
    const potentialKey = `${courseCode}_Assignment_${assignmentNumber}`;
    console.log(`Trying potential key from title: ${potentialKey}`);
    
    if (FILE_NAME_DUE_DATES[potentialKey]) {
      console.log(`Found match from title-derived key: ${potentialKey} -> ${FILE_NAME_DUE_DATES[potentialKey]}`);
      const fixedDueDate = new Date(FILE_NAME_DUE_DATES[potentialKey]);
      fixedDueDate.setHours(23, 59, 0, 0);
      return fixedDueDate;
    }
    
    // Check for partial matches too
    for (const [filePattern, dueDate] of Object.entries(FILE_NAME_DUE_DATES)) {
      if (filePattern.includes(courseCode) && filePattern.includes(`Assignment_${assignmentNumber}`)) {
        const fixedDueDate = new Date(dueDate);
        console.log(`Found course code + assignment number match from title: ${courseCode} Assignment ${assignmentNumber} = ${filePattern} -> ${dueDate}`);
        fixedDueDate.setHours(23, 59, 0, 0);
        return fixedDueDate;
      }
    }
  }
  
  console.log(`No file name match found for: ${courseCode || 'Unknown'} Assignment ${assignmentNumber}, using semester date calculation`);
  
  // FALLBACK: Use semester dates approach
  let semesterStart, semesterEnd;
  let foundSemesterDates = false;
  
  // Use persistent semester dates if available
  if (persistentSemesterDates) {
    console.log('Using persistent semester dates');
    semesterStart = new Date(persistentSemesterDates.startDate);
    semesterEnd = new Date(persistentSemesterDates.endDate);
    foundSemesterDates = true;
  } else {
    // Try to get semester dates from class schedule
    if (classSchedule && classSchedule.length > 0) {
      // Try to find a class with semester dates
      const classWithDates = classSchedule.find(cls => cls.semesterDates?.startDate && cls.semesterDates?.endDate);
      
      if (classWithDates) {
        try {
          semesterStart = new Date(classWithDates.semesterDates.startDate);
          semesterEnd = new Date(classWithDates.semesterDates.endDate);
          foundSemesterDates = true;
          
          // Store these for future use
          persistentSemesterDates = {
            startDate: semesterStart,
            endDate: semesterEnd
          };
          console.log(`Saved semester dates from class: ${semesterStart.toISOString()} to ${semesterEnd.toISOString()}`);
        } catch (error) {
          console.warn('Invalid semester dates from class, using defaults');
        }
      } else {
        // If no matching class, use the first class with semester dates
        const anyClassWithDates = classSchedule.find(cls => cls.semesterDates?.startDate && cls.semesterDates?.endDate);
        if (anyClassWithDates) {
          try {
            semesterStart = new Date(anyClassWithDates.semesterDates.startDate);
            semesterEnd = new Date(anyClassWithDates.semesterDates.endDate);
            foundSemesterDates = true;
            
            // Store these for future use
            persistentSemesterDates = {
              startDate: semesterStart,
              endDate: semesterEnd
            };
            console.log(`Saved semester dates from another class: ${semesterStart.toISOString()} to ${semesterEnd.toISOString()}`);
          } catch (error) {
            console.warn('Invalid semester dates from alternative class, using defaults');
          }
        }
      }
    }
  }
  
  // If no semester dates were found, create default dates
  if (!foundSemesterDates) {
    // Default semester: current date to current date + 4 months
    semesterStart = new Date();
    semesterEnd = new Date();
    semesterEnd.setMonth(semesterEnd.getMonth() + 4);
    console.log(`Using default semester dates: ${semesterStart.toISOString()} to ${semesterEnd.toISOString()}`);
  }
  
  // Calculate total semester duration in days
  const semesterDuration = Math.floor((semesterEnd.getTime() - semesterStart.getTime()) / (24 * 60 * 60 * 1000));
  
  // Position assignment based on number (1st = 25%, 2nd = 50%, 3rd = 75%, etc.)
  let assignmentPosition;
  if (assignmentNumber === 1) {
    assignmentPosition = 0.25; // 25% into semester
  } else if (assignmentNumber === 2) {
    assignmentPosition = 0.5;  // 50% into semester
  } else if (assignmentNumber === 3) {
    assignmentPosition = 0.75; // 75% into semester
  } else {
    // For 4th assignment and beyond, position in the last quarter
    const remainingPosition = 0.75 + ((assignmentNumber - 3) / 8) * 0.25;
    assignmentPosition = Math.min(remainingPosition, 0.95); // Cap at 95% of semester
  }
  
  const daysFromStart = Math.floor(semesterDuration * assignmentPosition);
  const fallbackDate = new Date(semesterStart);
  fallbackDate.setDate(semesterStart.getDate() + daysFromStart);
  
  // Ensure date is not in the past
  const now = new Date();
  if (fallbackDate < now) {
    fallbackDate.setTime(now.getTime() + (assignmentNumber * 14 * 24 * 60 * 60 * 1000));
  }
  
  // Set time to end of day (11:59 PM)
  fallbackDate.setHours(23, 59, 0, 0);
  
  console.log(`Created generated due date for "${courseCode || 'Unknown'} Assignment ${assignmentNumber}": ${fallbackDate.toISOString()}`);
  
  return fallbackDate;
}

/**
 * Set persistent semester dates manually (can be called by class setup)
 * @param {Object} dates - Object with startDate and endDate
 */
export function setSemesterDates(dates) {
  if (dates && dates.startDate && dates.endDate) {
    try {
      const startDate = new Date(dates.startDate);
      const endDate = new Date(dates.endDate);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        persistentSemesterDates = {
          startDate: startDate,
          endDate: endDate
        };
        console.log(`Semester dates manually set: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        return true;
      }
    } catch (error) {
      console.error('Invalid semester dates provided:', error);
    }
  }
  return false;
}

/**
 * Get current persistent semester dates
 * @returns {Object|null} - Current semester dates or null
 */
export function getCurrentSemesterDates() {
  return persistentSemesterDates;
}

/**
 * Extract dates from text content
 * @param {string} text - Raw text content
 * @returns {Array} Array of date strings
 */
export function extractDates(text) {
  const dateRegex = /(?:\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b)/gi;
  return text.match(dateRegex) || [];
}

/**
 * Generate study schedule from assignments and dates
 * @param {Array} assignments - Array of assignments
 * @param {Array} dates - Array of dates
 * @param {String} userId - User ID
 * @param {Object} metadata - Additional metadata
 * @returns {Array} Study schedule
 */
export function generateSchedule(assignments, dates, userId, metadata = {}) {
  console.log('Generating enhanced schedule with user preferences:', Object.keys(metadata.userPreferences || {}));
  
  // Get semester dates early for better distribution
  const semesterDates = getCurrentSemesterDates() || {
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 4))
  };
  
  console.log('Using semester dates for schedule generation:', {
    start: new Date(semesterDates.startDate).toISOString().split('T')[0],
    end: new Date(semesterDates.endDate).toISOString().split('T')[0]
  });
  
  // Ensure assignments is an array with fallback dates
  const processedAssignments = assignments.map(assignment => {
    const classSchedule = metadata.userPreferences?.classSchedule || [];
    
    const assignmentWithMetadata = {
      ...assignment,
      dueDate: assignment.dueDate || createFallbackDueDate(assignment.title || '', classSchedule, metadata.userPreferences || {})
    };
    
    // Add basic complexity value instead of complex calculation
    if (!assignmentWithMetadata.complexity) {
      assignmentWithMetadata.complexity = {
        overall: assignment.complexity || 5, // Default to medium complexity (5/10)
        conceptual: 4,
        procedural: 3
      };
    }
    
    // Add course code if available
    if (!assignmentWithMetadata.courseCode && metadata.courseCode) {
      assignmentWithMetadata.courseCode = metadata.courseCode;
    }
    
    return assignmentWithMetadata;
  });
  
  // Sort assignments by due date
  const sortedAssignments = [...processedAssignments].sort((a, b) => {
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
  
  // Generate rich events with basic complexity
  const enrichedEvents = [];
  
  for (const assignment of sortedAssignments) {
    // Skip if no due date
    if (!assignment.dueDate) continue;
    
    // Log the due date for debugging
    console.log(`Using due date for assignment "${assignment.title}": ${new Date(assignment.dueDate).toISOString()}`);
    
    // Calculate basic cognitive load
    const cognitiveLoad = assignment.complexity?.overall || 5;
    
    // Determine priority based on due date and weight
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    
    const priority = determinePriority(daysUntilDue, assignment.weight);
    
    // All items are assignments now
    const category = 'assignment';
    
    // Calculate optimal study hours based on complexity and user preferences
    const totalHours = calculateStudyHours(assignment, metadata.userPreferences || {});
    
    // Calculate optimal number of study sessions based on user preferences
    const userPreferences = metadata.userPreferences || {};
    const preferredSessionLength = userPreferences.studySessionLength || 120; // 2 hours default
    const numberOfSessions = Math.ceil(totalHours * 60 / preferredSessionLength);
    
    // Generate learning stages for this assignment
    const learningStages = generateLearningStages('assignment', numberOfSessions);
    
    // Create the enriched event with all metadata
    enrichedEvents.push({
      title: assignment.title,
      start: new Date(), // Will be calculated properly in the next step
      end: dueDate,
      complexity: assignment.complexity || { overall: 5 },
      cognitiveLoad,
      priority,
      category,
      courseCode: assignment.courseCode || '',
      totalHours,
      numberOfSessions,
      learningStages,
      resource: {
        ...assignment,
        documentType: 'assignment',
        courseCode: assignment.courseCode || '',
        details: {
          totalHours,
          numberOfSessions,
          complexity: assignment.complexity?.overall || 5,
          learningStages
        }
      }
    });
  }
  
  console.log('Generated enhanced events:', {
    totalEvents: enrichedEvents.length,
    firstEvent: enrichedEvents[0] ? enrichedEvents[0].title : 'none',
    lastEvent: enrichedEvents.length > 0 ? enrichedEvents[enrichedEvents.length - 1].title : 'none'
  });
  
  // Generate actual study sessions with collision avoidance
  const studySessions = distributeStudySessions(
    enrichedEvents, 
    metadata.userPreferences?.classSchedule || [], 
    metadata.userPreferences || {},
    semesterDates
  );
  
  return studySessions;
}

/**
 * Distribute study sessions across available days, avoiding conflicts with classes
 * @param {Array} assignments - Array of enriched assignment events
 * @param {Array} classSchedule - User's class schedule
 * @param {Object} preferences - User preferences
 * @param {Object} semesterDates - Start and end dates for the semester
 * @returns {Array} Study sessions with start and end times
 */
function distributeStudySessions(assignments, classSchedule = [], preferences = {}, semesterDates = null) {
  const studySessions = [];
  
  // Create a map of all class times to avoid scheduling conflicts
  const classTimesMap = createClassTimesMap(classSchedule);
  
  // Extract user preferences
  const preferredStudyDays = preferences.preferredStudyDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const preferredStudyTimeStart = preferences.preferredStudyTimeStart || '09:00';
  const preferredStudyTimeEnd = preferences.preferredStudyTimeEnd || '18:00';
  const preferredSessionLength = preferences.studySessionLength || 120; // 2 hours default in minutes
  const breaksBetweenSessions = preferences.breaksBetweenSessions || 30; // 30 minutes default
  const spacingPreference = preferences.spacingPreference || 'moderate'; // 'compressed', 'moderate', 'spaced'
  const productiveTimeOfDay = preferences.productiveTimeOfDay || 'morning'; // 'morning', 'afternoon', 'evening'
  const maxDailyStudyHours = preferences.maxDailyStudyHours || 4; // Max study hours per day
  const weekendPreference = preferences.weekendStudy || 'if-necessary'; // 'never', 'if-necessary', 'always'
  
  // Convert preferred times to minutes for easier comparison
  const preferredStart = timeStringToMinutes(preferredStudyTimeStart);
  const preferredEnd = timeStringToMinutes(preferredStudyTimeEnd);
  
  // Use semester start date if available, otherwise use current date
  let earliestPossibleStartDate = new Date();
  
  if (semesterDates && semesterDates.startDate) {
    const semesterStart = new Date(semesterDates.startDate);
    const today = new Date();
    
    // Use the later of semester start or today
    earliestPossibleStartDate = semesterStart > today ? semesterStart : today;
    
    console.log(`Using semester start date (${semesterStart.toISOString().split('T')[0]}) for scheduling`);
  } else {
    console.log('No semester dates available, using current date for scheduling');
  }
  
  // Process each assignment to create study sessions
  for (const assignment of assignments) {
    console.log(`Creating study sessions for "${assignment.title.substring(0, 30)}..." - ${assignment.numberOfSessions} sessions needed`);
    
    const dueDate = new Date(assignment.end);
    
    // Calculate the total days available for study
    // Use the later of earliest possible start date or assignment release date (if specified)
    let startDate = earliestPossibleStartDate;
    
    // Look for release date in assignment title
    const releaseDateMatch = assignment.title.match(/Release Date\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (releaseDateMatch) {
      const releaseDateParts = releaseDateMatch[1].split('/');
      // Format is DD/MM/YYYY
      const releaseDate = new Date(
        parseInt(releaseDateParts[2]), // Year
        parseInt(releaseDateParts[1]) - 1, // Month (0-indexed)
        parseInt(releaseDateParts[0]) // Day
      );
      
      // Use release date if it's later than our earliest start date
      if (releaseDate > earliestPossibleStartDate) {
        startDate = releaseDate;
        console.log(`Using release date ${releaseDate.toISOString().split('T')[0]} from assignment title`);
      }
    }
    
    const totalDaysAvailable = Math.max(
      1, 
      Math.ceil((dueDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
    );
    
    // Determine session spacing based on user preference and available time
    let daysPerSession;
    if (spacingPreference === 'compressed') {
      // Use closer spacing, focus more on immediate study
      daysPerSession = Math.max(1, Math.floor(totalDaysAvailable / (assignment.numberOfSessions * 2)));
    } else if (spacingPreference === 'spaced') {
      // Space out evenly with maximum spacing
      daysPerSession = Math.max(1, Math.floor(totalDaysAvailable / assignment.numberOfSessions));
    } else {
      // Moderate spacing
      daysPerSession = Math.max(1, Math.floor(totalDaysAvailable / (assignment.numberOfSessions * 1.5)));
    }
    
    // Distribute study sessions evenly with padding before due date
    const paddingDays = 1; // Days to leave before the due date
    const availableDays = totalDaysAvailable - paddingDays;
    const sessionSpacing = Math.max(1, Math.floor(availableDays / assignment.numberOfSessions));
    
    // Create each study session
    for (let i = 0; i < assignment.numberOfSessions; i++) {
      // Position this session in the available time
      const sessionPosition = i / assignment.numberOfSessions;
      const daysFromStart = Math.floor(sessionPosition * availableDays);
      
      // Calculate target date for this session
      const targetDate = new Date(startDate);
      targetDate.setDate(startDate.getDate() + daysFromStart);
      
      // Find a suitable time slot on this day or the next available day
      const sessionInfo = findAvailableTimeSlot(
        targetDate,
        classTimesMap,
        preferredStudyDays,
        preferredStart,
        preferredEnd,
        preferredSessionLength,
        productiveTimeOfDay,
        weekendPreference,
        maxDailyStudyHours * 60, // Convert to minutes
        studySessions
      );
      
      if (!sessionInfo) {
        console.log(`Warning: Couldn't find a suitable time slot for session ${i+1} of "${assignment.title.substring(0, 30)}..."`);
        continue;
      }
      
      // Get appropriate learning stage description for this session
      const stageIndex = Math.min(i, assignment.learningStages.length - 1);
      const stageDescription = assignment.learningStages[stageIndex];
      
      // Create the study session
      const sessionStart = new Date(sessionInfo.date);
      sessionStart.setHours(0, sessionInfo.startMinute, 0, 0);
      
      const sessionEnd = new Date(sessionInfo.date);
      sessionEnd.setHours(0, sessionInfo.startMinute + preferredSessionLength, 0, 0);
      
      // Create a descriptive title
      const sessionNumber = i + 1;
      const sessionTitle = `${assignment.courseCode} - ${stageDescription} (Session ${sessionNumber}/${assignment.numberOfSessions})`;
      
      // Add the session
      studySessions.push({
        title: sessionTitle,
        start: sessionStart,
        end: sessionEnd,
        allDay: false,
        category: 'study',
        courseCode: assignment.courseCode || '',
        type: 'study-session',
        priority: assignment.priority,
        description: `Study session for ${assignment.title.substring(0, 50)}: ${stageDescription}`,
        resource: {
          ...assignment.resource,
          sessionNumber,
          totalSessions: assignment.numberOfSessions,
          stage: stageDescription,
          type: 'study-session'
        }
      });
    }
    
    // Always add a final reminder session on the day before the due date
    const dayBeforeDue = new Date(dueDate);
    dayBeforeDue.setDate(dayBeforeDue.getDate() - 1);
    
    // Find a suitable time for the final reminder
    const reminderInfo = findAvailableTimeSlot(
      dayBeforeDue,
      classTimesMap,
      preferredStudyDays,
      preferredStart,
      preferredEnd,
      60, // Just 1 hour for the reminder
      productiveTimeOfDay,
      'always', // Use any day for the reminder
      maxDailyStudyHours * 60,
      studySessions
    );
    
    if (reminderInfo) {
      const reminderStart = new Date(reminderInfo.date);
      reminderStart.setHours(0, reminderInfo.startMinute, 0, 0);
      
      const reminderEnd = new Date(reminderInfo.date);
      reminderEnd.setHours(0, reminderInfo.startMinute + 60, 0, 0);
      
      studySessions.push({
        title: `${assignment.courseCode} - Final Review Before Deadline`,
        start: reminderStart,
        end: reminderEnd,
        allDay: false,
        category: 'reminder',
        courseCode: assignment.courseCode || '',
        type: 'reminder',
        priority: 'high',
        description: `Final review session before the deadline for ${assignment.title.substring(0, 50)}`,
        resource: {
          ...assignment.resource,
          sessionNumber: assignment.numberOfSessions + 1,
          totalSessions: assignment.numberOfSessions,
          stage: 'Final Review',
          type: 'reminder'
        }
      });
    }
  }
  
  // Sort sessions by start time
  studySessions.sort((a, b) => a.start.getTime() - b.start.getTime());
  
  console.log(`Generated ${studySessions.length} study sessions across all assignments`);
  return studySessions;
}

/**
 * Creates a map of all class times to avoid scheduling conflicts
 * @param {Array} classSchedule - Array of class schedule objects
 * @returns {Object} Map of busy times by date
 */
function createClassTimesMap(classSchedule) {
  const classTimesMap = {};
  
  if (!Array.isArray(classSchedule) || classSchedule.length === 0) {
    return classTimesMap;
  }
  
  // Process class schedule to create a map of busy times
  for (const classItem of classSchedule) {
    if (!classItem.day) continue;
    
    // Extract the day name
    const day = String(classItem.day).trim();
    
    if (!classTimesMap[day]) {
      classTimesMap[day] = [];
    }
    
    // Extract start and end times in minutes
    let startMinute = 0;
    let endMinute = 0;
    
    if (classItem.startTime && classItem.endTime) {
      startMinute = timeStringToMinutes(classItem.startTime);
      endMinute = timeStringToMinutes(classItem.endTime);
    }
    
    // Add buffer before and after class
    const bufferMinutes = 15;
    startMinute = Math.max(0, startMinute - bufferMinutes);
    endMinute = Math.min(24 * 60, endMinute + bufferMinutes);
    
    // Add to the map
    classTimesMap[day].push({
      start: startMinute,
      end: endMinute,
      courseCode: classItem.courseCode || '',
      name: classItem.courseName || 'Class'
    });
  }
  
  // Sort busy times in each day
  for (const day in classTimesMap) {
    classTimesMap[day].sort((a, b) => a.start - b.start);
  }
  
  return classTimesMap;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  
  // Handle different time formats
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
  }
  
  return 0;
}

/**
 * Find an available time slot for a study session
 * @param {Date} startDate - Initial date to check
 * @param {Object} classTimesMap - Map of busy class times
 * @param {Array} preferredDays - User's preferred study days
 * @param {Number} preferredStartMinute - Preferred start time in minutes
 * @param {Number} preferredEndMinute - Preferred end time in minutes
 * @param {Number} sessionLength - Length of session in minutes
 * @param {String} productiveTimeOfDay - User's most productive time
 * @param {String} weekendPreference - Weekend study preference
 * @param {Number} maxDailyMinutes - Maximum study minutes per day
 * @param {Array} existingSessions - Already scheduled sessions
 * @returns {Object|null} Available time slot or null if none found
 */
function findAvailableTimeSlot(
  startDate,
  classTimesMap,
  preferredDays,
  preferredStartMinute,
  preferredEndMinute,
  sessionLength,
  productiveTimeOfDay,
  weekendPreference,
  maxDailyMinutes,
  existingSessions
) {
  // Try up to 14 days to find a suitable slot
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + dayOffset);
    
    // Format the date as a string for comparison
    const dateString = currentDate.toISOString().split('T')[0];
    
    // Get the day of the week
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Check if this is a weekend
    const isWeekend = (dayName === 'Saturday' || dayName === 'Sunday');
    
    // Skip weekends based on preference
    if (isWeekend && weekendPreference === 'never') {
      continue;
    }
    
    // Skip non-preferred days unless we've searched for a while
    if (!preferredDays.includes(dayName) && dayOffset < 7) {
      continue;
    }
    
    // Get class times for this day
    const classTimes = classTimesMap[dayName] || [];
    
    // Get already scheduled study sessions for this day
    const dayStudySessions = existingSessions.filter(session => {
      const sessionDate = session.start.toISOString().split('T')[0];
      return sessionDate === dateString;
    });
    
    // Calculate total study minutes already scheduled for this day
    const existingStudyMinutes = dayStudySessions.reduce((total, session) => {
      const sessionStart = session.start;
      const sessionEnd = session.end;
      const sessionMinutes = (sessionEnd.getTime() - sessionStart.getTime()) / (60 * 1000);
      return total + sessionMinutes;
    }, 0);
    
    // Skip this day if it already has the maximum study time
    if (existingStudyMinutes >= maxDailyMinutes) {
      continue;
    }
    
    // Determine remaining study minutes for this day
    const remainingMinutes = maxDailyMinutes - existingStudyMinutes;
    
    // Skip if not enough time remaining
    if (remainingMinutes < sessionLength) {
      continue;
    }
    
    // Determine optimal time range based on productive time of day
    let optimalStartMinute, optimalEndMinute;
    
    if (productiveTimeOfDay === 'morning') {
      optimalStartMinute = Math.max(preferredStartMinute, 8 * 60); // 8:00 AM
      optimalEndMinute = Math.min(preferredEndMinute, 12 * 60); // 12:00 PM
    } else if (productiveTimeOfDay === 'afternoon') {
      optimalStartMinute = Math.max(preferredStartMinute, 12 * 60); // 12:00 PM
      optimalEndMinute = Math.min(preferredEndMinute, 17 * 60); // 5:00 PM
    } else if (productiveTimeOfDay === 'evening') {
      optimalStartMinute = Math.max(preferredStartMinute, 17 * 60); // 5:00 PM
      optimalEndMinute = Math.min(preferredEndMinute, 22 * 60); // 10:00 PM
    } else {
      // Default to the user's entire preferred range
      optimalStartMinute = preferredStartMinute;
      optimalEndMinute = preferredEndMinute;
    }
    
    // Make sure we still have enough time in the optimal range
    if (optimalEndMinute - optimalStartMinute < sessionLength) {
      // Fall back to the entire preferred range if optimal is too narrow
      optimalStartMinute = preferredStartMinute;
      optimalEndMinute = preferredEndMinute;
    }
    
    // Create busy time blocks from classes
    const busyBlocks = [...classTimes];
    
    // Add existing study sessions as busy blocks
    for (const session of dayStudySessions) {
      const sessionStartTime = session.start.getHours() * 60 + session.start.getMinutes();
      const sessionEndTime = session.end.getHours() * 60 + session.end.getMinutes();
      
      busyBlocks.push({
        start: sessionStartTime,
        end: sessionEndTime,
        name: session.title
      });
    }
    
    // Sort busy blocks by start time
    busyBlocks.sort((a, b) => a.start - b.start);
    
    // Find available slots within the optimal time range
    let slotStart = optimalStartMinute;
    let availableSlot = null;
    
    while (slotStart <= optimalEndMinute - sessionLength) {
      const slotEnd = slotStart + sessionLength;
      
      // Check if this slot conflicts with any busy blocks
      let hasConflict = false;
      for (const block of busyBlocks) {
        // Check for overlap
        if (!(slotEnd <= block.start || slotStart >= block.end)) {
          hasConflict = true;
          // Move to after this block
          slotStart = block.end;
          break;
        }
      }
      
      if (!hasConflict) {
        // Found an available slot
        availableSlot = {
          date: currentDate,
          dayName,
          startMinute: slotStart,
          endMinute: slotEnd
        };
        break;
      }
    }
    
    if (availableSlot) {
      return availableSlot;
    }
    
    // If we couldn't find a slot in the optimal range,
    // try the entire preferred range as a fallback
    if (optimalStartMinute !== preferredStartMinute || optimalEndMinute !== preferredEndMinute) {
      slotStart = preferredStartMinute;
      
      while (slotStart <= preferredEndMinute - sessionLength) {
        const slotEnd = slotStart + sessionLength;
        
        // Check if this slot conflicts with any busy blocks
        let hasConflict = false;
        for (const block of busyBlocks) {
          // Check for overlap
          if (!(slotEnd <= block.start || slotStart >= block.end)) {
            hasConflict = true;
            // Move to after this block
            slotStart = block.end;
            break;
          }
        }
        
        if (!hasConflict) {
          // Found an available slot
          return {
            date: currentDate,
            dayName,
            startMinute: slotStart,
            endMinute: slotEnd
          };
        }
      }
    }
  }
  
  // If no slot found after trying all days
  return null;
}

/**
 * Calculate appropriate study hours based on assignment
 */
function calculateStudyHours(assignment, preferences = {}) {
  // Base hours based on complexity (1-10 scale)
  const complexity = assignment.complexity?.overall || 5;
  
  // Base calculation: 1 hour per complexity point
  let baseHours = complexity;
  
  // Adjust for assignment type - all are assignments now
  const loadFactor = preferences.cognitiveLoadFactors?.assignment || 1.0;
  baseHours = baseHours * loadFactor;
  
  // Adjust for weight/value of the assignment if available
  if (assignment.weight) {
    const weightPercentage = parseFloat(assignment.weight) || 0;
    if (weightPercentage > 0) {
      // Increase hours for higher-weighted assignments
      baseHours = baseHours * (1 + (weightPercentage / 100));
    }
  }
  
  // Round to nearest half hour and ensure minimum of 1 hour
  return Math.max(1, Math.round(baseHours * 2) / 2);
}

/**
 * Determine priority level based on days until due and assignment weight
 */
function determinePriority(daysUntilDue, weight) {
  const weightValue = parseFloat(weight) || 0;
  
  if (daysUntilDue <= 3 || weightValue >= 30) {
    return 'high';
  } else if (daysUntilDue <= 7 || weightValue >= 15) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Generate learning stages for different types of assignments
 */
function generateLearningStages(assignmentType, numberOfSessions = 4) {
  // Always use assignment stages
  const assignmentStages = ['Understanding requirements', 'Research', 'First draft', 'Review and refine'];
  
  // If we need more or fewer stages than the default list
  if (numberOfSessions > assignmentStages.length) {
    // Add more detailed intermediate stages
    const expandedStages = [];
    const stageRatio = numberOfSessions / assignmentStages.length;
    
    for (let i = 0; i < assignmentStages.length; i++) {
      const currentStage = assignmentStages[i];
      
      // Add the current stage
      expandedStages.push(currentStage);
      
      // Add intermediate stages if needed
      const intermediateStagesNeeded = Math.floor(stageRatio) - 1;
      for (let j = 0; intermediateStagesNeeded && expandedStages.length < numberOfSessions - 1; j++) {
        expandedStages.push(`${currentStage} - continued (${j+1})`);
      }
    }
    
    // Ensure we have exactly the right number of stages
    while (expandedStages.length < numberOfSessions) {
      expandedStages.push('Final review');
    }
    
    return expandedStages;
  } else if (numberOfSessions < assignmentStages.length) {
    // Combine stages if we need fewer
    return assignmentStages.slice(0, numberOfSessions);
  }
  
  return assignmentStages;
}



