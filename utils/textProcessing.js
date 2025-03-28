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
          type: determineAssignmentType(section),
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

// Fix the determineAssignmentType function
function determineAssignmentType(text) {
  const types = {
    'report': /\b(?:report|paper|essay|write-up)\b/i,
    'project': /\b(?:project|development|implementation)\b/i,
    'presentation': /\b(?:presentation|slides|powerpoint)\b/i,
    'quiz': /\b(?:quiz|test|exam)\b/i,
    'homework': /\b(?:homework|exercise|problem set)\b/i
  };

  for (const [type, pattern] of Object.entries(types)) {
    if (pattern.test(text)) {
      return type; // Return the type when pattern matches
    }
  }
  return 'task'; // Default type
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

/**
 * Create a better fallback date when a due date is missing
 * @param {string} assignmentTitle - The title of the assignment
 * @returns {Date} - A reasonable fallback date
 */
export function createFallbackDueDate(assignmentTitle) {
  // Extract course code for better fallback date estimation
  const courseCodeMatch = assignmentTitle.match(/\b([A-Z]{2,}\d{3}[A-Z0-9]*)\b/);
  const courseCode = courseCodeMatch ? courseCodeMatch[1] : null;
  
  // Check if assignment mentions which assignment number it is
  const assignmentNumberMatch = assignmentTitle.match(/assignment\s*(?:no\.?|number)?\s*[:#]?\s*(\d+)/i);
  const assignmentNumber = assignmentNumberMatch ? parseInt(assignmentNumberMatch[1], 10) : 1;
  
  // Create date based on current date plus offset
  const now = new Date();
  
  // If assignment 1, schedule for 4 weeks, assignment 2 for 8 weeks, etc.
  const weeksOffset = 4 * assignmentNumber;
  
  // Create the fallback date
  const fallbackDate = new Date();
  fallbackDate.setDate(now.getDate() + weeksOffset * 7);
  
  console.log(`Created fallback date for "${assignmentTitle.substring(0, 30)}...": ${fallbackDate.toISOString()}, based on assignment number ${assignmentNumber}`);
  
  return fallbackDate;
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
  
  // Ensure assignments is an array with fallback dates
  const processedAssignments = assignments.map(assignment => {
    const assignmentWithMetadata = {
      ...assignment,
      dueDate: assignment.dueDate || generateFallbackDueDate(assignment, dates)
    };
    
    // Add basic complexity value instead of complex calculation
    if (!assignmentWithMetadata.complexity) {
      assignmentWithMetadata.complexity = {
        overall: assignment.complexity || 5, // Default to medium complexity (5/10)
        conceptual: assignment.type === 'essay' || assignment.type === 'report' ? 6 : 4,
        procedural: assignment.type === 'project' || assignment.type === 'lab' ? 7 : 3
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
    
    // Add fallback date for logging
    console.log(`Using fallback date for assignment "${assignment.title}": ${assignment.dueDate}`);
    
    // Calculate basic cognitive load
    const cognitiveLoad = assignment.complexity?.overall || 5;
    
    // Determine priority based on due date and weight
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    
    const priority = determinePriority(daysUntilDue, assignment.weight);
    
    // Determine category based on assignment type
    const category = assignment.type || determineAssignmentType(assignment.title || '', '');
    
    // Calculate optimal study hours
    const totalHours = calculateBasicStudyHours(assignment);
    
    // Calculate days needed for studying
    const daysNeeded = Math.ceil(totalHours / 2); // Assuming 2 hours of study per day
    
    // Calculate optimal start date
    const startDate = calculateBasicStartDate(dueDate, daysNeeded);
    
    // Generate learning stages
    const learningStages = generateBasicLearningStages(assignment.type || category);
    
    // Create the enriched event with all metadata
    enrichedEvents.push({
      title: assignment.title,
      start: startDate,
      end: dueDate,
      complexity: assignment.complexity || { overall: 5 },
      cognitiveLoad,
      priority,
      category,
      courseCode: assignment.courseCode || '',
      totalHours,
      daysNeeded,
      learningStages,
      resource: {
        ...assignment,
        fallbackDueDate: assignment.fallbackDueDate,
        documentType: metadata.documentType || 'assignment',
        courseCode: assignment.courseCode || '',
        details: {
          totalHours,
          daysNeeded,
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
  
  // Generate actual study sessions
  const studySessions = distributeStudySessions(enrichedEvents, 
    metadata.userPreferences?.classSchedule || [], 
    metadata.userPreferences || {}
  );
  
  // Add progression-based descriptions to each session
  const enhancedSessions = addStudySessionDescriptions(studySessions);
  
  // Generate supplementary learning activities
  const supplementaryActivities = generateSupplementaryActivities(enrichedEvents, metadata);
  
  // Generate topic-based study sessions
  const topicSessions = generateTopicStudySessions(enrichedEvents, metadata);
  
  // Generate knowledge check sessions
  const knowledgeChecks = generateKnowledgeChecks(enhancedSessions);
  
  // Combine all sessions into a comprehensive schedule
  return [
    ...enhancedSessions,
    ...supplementaryActivities,
    ...topicSessions,
    ...knowledgeChecks
  ];
}

/**
 * Determine priority based on days until due and assignment weight
 */
function determinePriority(daysUntilDue, weight) {
  const weightValue = parseInt(weight) || 0;
  
  // High priority for urgent or high-weight assignments
  if (daysUntilDue <= 7 || weightValue >= 25) {
    return 'high';
  }
  
  // Low priority for far future, low weight assignments
  if (daysUntilDue >= 21 && weightValue < 15) {
    return 'low';
  }
  
  // Medium priority as default
  return 'medium';
}

/**
 * Calculate basic study hours based on assignment type and available metadata
 */
function calculateBasicStudyHours(assignment) {
  // Base hours by assignment type
  const typeHours = {
    'essay': 10,
    'report': 12,
    'project': 15,
    'presentation': 8,
    'exam': 20,
    'quiz': 4,
    'homework': 5,
    'lab': 6
  };
  
  const type = assignment.type || determineAssignmentType(assignment.title || '', '');
  let hours = typeHours[type.toLowerCase()] || 8; // Default to 8 hours
  
  // Adjust for weight if available
  if (assignment.weight) {
    hours = hours * (1 + (assignment.weight / 100));
  }
  
  // Adjust for word count if available
  if (assignment.wordCount) {
    hours = hours * (1 + (assignment.wordCount / 2000));
  }
  
  // Adjust for estimated hours if explicitly provided
  if (assignment.estimatedHours) {
    hours = assignment.estimatedHours;
  }
  
  return Math.ceil(hours);
}

/**
 * Calculate basic start date based on due date and days needed
 */
function calculateBasicStartDate(dueDate, daysNeeded) {
  const startDate = new Date(dueDate);
  startDate.setDate(startDate.getDate() - daysNeeded);
  
  // Default to starting in the morning
  startDate.setHours(9, 0, 0, 0);
  
  return startDate;
}

/**
 * Generate basic learning stages based on assignment type
 */
function generateBasicLearningStages(type) {
  const commonStages = [
    { name: 'Understand Requirements', percentage: 10 },
    { name: 'Research and Planning', percentage: 30 },
    { name: 'Development', percentage: 40 },
    { name: 'Review and Revise', percentage: 15 },
    { name: 'Finalize', percentage: 5 }
  ];
  
  const typeSpecificStages = {
    'essay': [
      { name: 'Outline Creation', percentage: 15 },
      { name: 'Draft Writing', percentage: 30 },
      { name: 'Revising', percentage: 20 },
      { name: 'Editing and Proofreading', percentage: 15 }
    ],
    'report': [
      { name: 'Data Collection', percentage: 20 },
      { name: 'Analysis', percentage: 25 },
      { name: 'Report Writing', percentage: 30 },
      { name: 'Review and Finalize', percentage: 15 }
    ],
    'project': [
      { name: 'Project Planning', percentage: 15 },
      { name: 'Design Phase', percentage: 20 },
      { name: 'Implementation', percentage: 40 },
      { name: 'Testing', percentage: 15 },
      { name: 'Documentation', percentage: 10 }
    ],
    'presentation': [
      { name: 'Research Content', percentage: 25 },
      { name: 'Create Slides', percentage: 30 },
      { name: 'Practice Delivery', percentage: 25 },
      { name: 'Finalize Materials', percentage: 10 }
    ],
    'exam': [
      { name: 'Material Review', percentage: 40 },
      { name: 'Practice Questions', percentage: 30 },
      { name: 'Concept Mastery', percentage: 20 },
      { name: 'Final Review', percentage: 10 }
    ]
  };
  
  return typeSpecificStages[type.toLowerCase()] || commonStages;
}

/**
 * Distribute study sessions for assignments
 */
function distributeStudySessions(events, classSchedule = [], preferences = {}) {
  const studySessions = [];
  
  // Process each assignment
  events.forEach(event => {
    const { totalHours, daysNeeded, learningStages } = event;
    
    // Calculate hours per day
    const hoursPerDay = Math.min(4, Math.ceil(totalHours / daysNeeded));
    
    // Create sessions across the available days
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    
    // Calculate total days available for study
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    // Create study sessions with appropriate distribution
    for (let i = 0; i < daysNeeded; i++) {
      // Distribute across available days, more towards beginning and end
      let dayOffset;
      
      if (daysNeeded <= 3) {
        // For short assignments, spread evenly
        dayOffset = Math.round(i * (totalDays / daysNeeded));
      } else {
        // For longer assignments, use a more sophisticated distribution
        const progress = i / (daysNeeded - 1);
        
        // Create a U-shaped distribution with more sessions at start and end
        if (progress < 0.3) {
          // Front-loaded (beginning 30%)
          dayOffset = Math.round(progress * 0.4 * totalDays);
        } else if (progress > 0.7) {
          // End-loaded (final 30%)
          dayOffset = Math.round((0.6 + (progress - 0.7) * 1.3) * totalDays);
        } else {
          // Middle period - more sparse
          dayOffset = Math.round((0.4 + (progress - 0.3) * 0.2) * totalDays);
        }
      }
      
      // Ensure dayOffset is within bounds
      dayOffset = Math.min(totalDays - 1, Math.max(0, dayOffset));
      
      // Calculate session date
      const sessionDate = new Date(startDate);
      sessionDate.setDate(sessionDate.getDate() + dayOffset);
      
      // Set a reasonable time (9 AM, 1 PM, 4 PM, or 7 PM)
      const hourOptions = [9, 13, 16, 19];
      const hourIndex = i % hourOptions.length;
      sessionDate.setHours(hourOptions[hourIndex], 0, 0, 0);
      
      // Determine which learning stage this session belongs to
      const sessionIndex = i;
      const stageIndex = determineStageForSession(sessionIndex, daysNeeded, learningStages);
      const stage = learningStages[stageIndex] || { name: 'Study Session' };
      
      // Calculate session duration (1.5 to 2.5 hours)
      const sessionHours = Math.min(2.5, Math.max(1.5, hoursPerDay));
      const sessionEndDate = new Date(sessionDate);
      sessionEndDate.setHours(sessionDate.getHours() + Math.floor(sessionHours));
      sessionEndDate.setMinutes((sessionHours % 1) * 60);
      
      // Create session with descriptive title
      studySessions.push({
        id: `study-${event.title}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${stage.name}: ${event.title}`,
        start: sessionDate,
        end: sessionEndDate,
        allDay: false,
        category: 'study',
        priority: event.priority,
        courseCode: event.courseCode,
        resource: {
          type: 'study',
          parentEventId: event.id,
          originalEvent: event,
          stage: stage.name,
          sessionNumber: i + 1,
          totalSessions: daysNeeded
        }
      });
    }
  });
  
  return studySessions;
}

/**
 * Determine which learning stage a session belongs to
 */
function determineStageForSession(sessionIndex, totalSessions, stages) {
  const progress = sessionIndex / (totalSessions - 1 || 1);
  let cumulativePercentage = 0;
  
  for (let i = 0; i < stages.length; i++) {
    cumulativePercentage += stages[i].percentage / 100;
    if (progress <= cumulativePercentage) {
      return i;
    }
  }
  
  return stages.length - 1;
}

/**
 * Add descriptive content to study sessions
 */
function addStudySessionDescriptions(sessions) {
  return sessions.map(session => {
    const stage = session.resource?.stage || 'Study Session';
    const totalSessions = session.resource?.totalSessions || 1;
    const sessionNumber = session.resource?.sessionNumber || 1;
    const progress = sessionNumber / totalSessions;
    
    // Different descriptions based on stage and progress
    let description;
    
    if (stage.includes('Understand') || stage.includes('Research')) {
      description = `Focus on understanding requirements and initial research for ${session.title.split(':')[1].trim()}`;
    } else if (stage.includes('Plan')) {
      description = `Create detailed plan and outline for ${session.title.split(':')[1].trim()}`;
    } else if (stage.includes('Develop') || stage.includes('Implement') || stage.includes('Draft') || stage.includes('Write')) {
      description = `Focus on developing key components for ${session.title.split(':')[1].trim()}`;
    } else if (stage.includes('Review') || stage.includes('Revise') || stage.includes('Edit')) {
      description = `Review and improve your work on ${session.title.split(':')[1].trim()}`;
    } else if (stage.includes('Finalize')) {
      description = `Complete final touches and prepare for submission of ${session.title.split(':')[1].trim()}`;
    } else {
      description = `Study session for ${session.title.split(':')[1].trim()}`;
    }
    
    // Add progress indicator
    if (progress < 0.3) {
      description += ` (Early stage)`;
    } else if (progress > 0.7) {
      description += ` (Final stage)`;
    } else {
      description += ` (Middle stage)`;
    }
    
    return {
      ...session,
      description
    };
  });
}

/**
 * Generate supplementary learning activities
 */
function generateSupplementaryActivities(events, metadata) {
  const activities = [];
  
  events.forEach(event => {
    // Only generate for assignments with longer study periods
    const daysBetween = Math.ceil((new Date(event.end) - new Date(event.start)) / (1000 * 60 * 60 * 24));
    if (daysBetween < 4) return;
    
    // Add a review session 2-3 days before deadline
    const reviewDate = new Date(event.end);
    reviewDate.setDate(reviewDate.getDate() - 2 - Math.floor(Math.random() * 2));
    reviewDate.setHours(16, 0, 0, 0);
    
    const reviewEndDate = new Date(reviewDate);
    reviewEndDate.setHours(reviewDate.getHours() + 2);
    
    activities.push({
      id: `review-${event.title}-${Math.random().toString(36).substr(2, 9)}`,
      title: `Final Review: ${event.title}`,
      start: reviewDate,
      end: reviewEndDate,
      allDay: false,
      category: 'revision',
      priority: 'high',
      courseCode: event.courseCode,
      description: `Comprehensive review of all work for ${event.title}`,
      resource: {
        type: 'revision',
        parentEventId: event.id,
        originalEvent: event
      }
    });
    
    // For longer assignments (>7 days), add a milestone check
    if (daysBetween > 7) {
      const milestoneDate = new Date(event.start);
      milestoneDate.setDate(milestoneDate.getDate() + Math.floor(daysBetween / 2));
      milestoneDate.setHours(10, 0, 0, 0);
      
      const milestoneEndDate = new Date(milestoneDate);
      milestoneEndDate.setHours(milestoneDate.getHours() + 1);
      
      activities.push({
        id: `milestone-${event.title}-${Math.random().toString(36).substr(2, 9)}`,
        title: `Progress Check: ${event.title}`,
        start: milestoneDate,
        end: milestoneEndDate,
        allDay: false,
        category: 'milestone',
        priority: 'medium',
        courseCode: event.courseCode,
        description: `Check progress on ${event.title} and adjust plan if needed`,
        resource: {
          type: 'milestone',
          parentEventId: event.id,
          originalEvent: event,
          checklistItems: [
            'Review current progress',
            'Identify any blockers or issues',
            'Adjust plan if needed',
            'Set goals for the remaining time'
          ]
        }
      });
    }
  });
  
  return activities;
}

/**
 * Generate topic-based study sessions
 */
function generateTopicStudySessions(events, metadata) {
  const topicSessions = [];
  
  // Extract topics from metadata
  const topics = metadata.topics || [];
  if (topics.length === 0) return [];
  
  // Sort topics by importance
  const sortedTopics = [...topics].sort((a, b) => (b.importance || 0) - (a.importance || 0));
  
  // Generate study sessions for the most important topics
  sortedTopics.slice(0, Math.min(5, sortedTopics.length)).forEach((topic, index) => {
    // Find earliest assignment event
    const earliestEvent = events[0];
    if (!earliestEvent) return;
    
    // Create session 1-3 days after start
    const sessionDate = new Date(earliestEvent.start);
    sessionDate.setDate(sessionDate.getDate() + 1 + index);
    sessionDate.setHours(14, 0, 0, 0);
    
    const sessionEndDate = new Date(sessionDate);
    sessionEndDate.setHours(sessionDate.getHours() + 2);
    
    topicSessions.push({
      id: `topic-${index}-${Math.random().toString(36).substr(2, 9)}`,
      title: `Study: ${topic.title || topic.name}`,
      start: sessionDate,
      end: sessionEndDate,
      allDay: false,
      category: 'topic-study',
      priority: 'medium',
      courseCode: metadata.courseCode || events[0].courseCode,
      description: `Focus on understanding the key concept: ${topic.title || topic.name}`,
      resource: {
        type: 'topic-study',
        topic: topic.title || topic.name,
        importance: topic.importance || 3
      }
    });
  });
  
  return topicSessions;
}

/**
 * Generate knowledge check sessions
 */
function generateKnowledgeChecks(sessions) {
  if (sessions.length < 4) return [];
  
  const knowledgeChecks = [];
  
  // Group sessions by original event
  const sessionsByEvent = new Map();
  
  sessions.forEach(session => {
    const eventId = session.resource?.originalEvent?.id;
    if (!eventId) return;
    
    if (!sessionsByEvent.has(eventId)) {
      sessionsByEvent.set(eventId, []);
    }
    
    sessionsByEvent.get(eventId).push(session);
  });
  
  // Create knowledge checks for each group
  sessionsByEvent.forEach((eventSessions, eventId) => {
    if (eventSessions.length < 3) return; // Only for longer study sequences
    
    // Sort sessions by date
    const sortedSessions = [...eventSessions].sort(
      (a, b) => new Date(a.start) - new Date(b.start)
    );
    
    // Add knowledge check after every few sessions
    const interval = Math.max(2, Math.floor(sortedSessions.length / 3));
    
    for (let i = interval; i < sortedSessions.length; i += interval) {
      const session = sortedSessions[i];
      const checkDate = new Date(session.end);
      checkDate.setDate(checkDate.getDate() + 1);
      checkDate.setHours(15, 0, 0, 0);
      
      const checkEndDate = new Date(checkDate);
      checkEndDate.setMinutes(checkEndDate.getMinutes() + 30);
      
      knowledgeChecks.push({
        id: `check-${eventId}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        title: `Knowledge Check: ${session.resource?.originalEvent?.title}`,
        start: checkDate,
        end: checkEndDate,
        allDay: false,
        category: 'knowledge-check',
        priority: session.priority,
        courseCode: session.courseCode,
        description: `Quick check to reinforce learning on ${session.resource?.originalEvent?.title}`,
        resource: {
          type: 'knowledge-check',
          parentEventId: eventId,
          originalEvent: session.resource?.originalEvent,
          questions: [
            { 
              questionText: `Recall the key concepts covered so far in ${session.resource?.originalEvent?.title}`,
              questionType: 'recall'
            },
            {
              questionText: `What aspects do you find most challenging and need more focus?`,
              questionType: 'reflection'
            }
          ]
        }
      });
    }
  });
  
  return knowledgeChecks;
}



