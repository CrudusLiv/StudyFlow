/**
 * Extract assignments from text content
 * @param {string} text - Raw text content
 * @returns {Array} Array of assignment objects
 */
export function extractAssignments(text) {
  console.log('Starting assignment extraction from text...');
  const assignments = [];
  const paragraphs = text.split(/\n\s*\n/); // Split by paragraph breaks

  // Enhanced patterns for assignment detection
  const assignmentPatterns = [
    /\b(?:assignment|homework|project|task|exercise|lab work)\s*(?:no\.?|number)?:?\s*\d*/i,
    /due\s*(?:date|by|on|:)/i,
    /submit\s*(?:by|before|until)/i,
    /deadline\s*:/i
  ];

  const dueDatePatterns = [
    // More comprehensive date patterns
    /(?:due|submit|deadline|by)\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})/i,
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/
  ];

  paragraphs.forEach(paragraph => {
    const lines = paragraph.split('\n');

    lines.forEach(line => {
      const isAssignment = assignmentPatterns.some(pattern => pattern.test(line));

      if (isAssignment) {
        // Extract due date using multiple patterns
        let dueDate = null;
        for (const pattern of dueDatePatterns) {
          const match = line.match(pattern);
          if (match) {
            dueDate = match[1];
            break;
          }
        }

        // Extract course code if present
        const courseCode = line.match(/([A-Z]{2,}\d{3,})/)?.[1] || '';

        // Calculate priority based on due date proximity and keywords
        const priority = calculatePriority(line, dueDate);

        // Estimate work hours more accurately
        const workHours = estimateWorkHoursEnhanced(line);

        assignments.push({
          title: cleanTitle(line),
          dueDate,
          courseCode,
          estimatedHours: workHours,
          priority,
          type: determineAssignmentType(line),
          details: extractDetails(line)
        });
      }
    });
  });

  console.log(`Found ${assignments.length} assignments with details:`,
    assignments.slice(0, 2));
  return assignments;
}

function cleanTitle(text) {
  // Remove common prefixes and clean up the title
  return text
    .replace(/^(?:assignment|homework|project|task|exercise)[\s:]*\d*[\s:]*/i, '')
    .replace(/\bdue\s*(?:date|by|on)?[:]*\s*\d{1,2}[-/]\d{1,2}[-/]\d{4}\b.*/i, '')
    .trim();
}

function calculatePriority(text, dueDate) {
  let score = 0;

  // Priority keywords
  if (/\b(?:urgent|important|critical|mandatory)\b/i.test(text)) score += 3;
  if (/\b(?:final|exam|assessment)\b/i.test(text)) score += 2;

  // Due date proximity
  if (dueDate) {
    const due = new Date(dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 3) score += 3;
    else if (daysUntilDue <= 7) score += 2;
    else if (daysUntilDue <= 14) score += 1;
  }

  return score >= 3 ? 'high' : score >= 2 ? 'medium' : 'low';
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

function determineAssignmentType(text) {
  const types = {
    'report': /\b(?:report|paper|essay|write-up)\b/i,
    'project': /\b(?:project|development|implementation)\b/i,
    'presentation': /\b(?:presentation|slides|powerpoint)\b/i,
    'quiz': /\b(?:quiz|test|exam)\b/i,
    'homework': /\b(?:homework|exercise|problem set)\b/i
  };

  for (const [type, pattern] of Object.entries(types)) {
    if (pattern.test(text)) return type;
  }
  return 'task';
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
 * Extract dates from text content
 * @param {string} text - Raw text content
 * @returns {Array} Array of date strings
 */
export function extractDates(text) {
  const dateRegex = /(?:\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b)/gi;
  return text.match(dateRegex) || [];
}

/**
 * Generate a study schedule based on assignments and dates
 * @param {Array} assignments - Array of assignment objects
 * @param {Array} dates - Array of date strings
 * @param {string} userId - User ID for personalization
 * @param {Object} metadata - Additional metadata for assignments
 * @returns {Array} Generated schedule
 */
export function generateSchedule(assignments, dates, userId, metadata = {}) {
  console.log('Generating schedule with enhanced assignments:', assignments.slice(0, 2));

  // Convert date strings to Date objects
  const processedAssignments = assignments.map(assignment => {
    // Normalize assignment structure and fill in missing data
    return {
      ...assignment,
      dueDate: parseDateString(assignment.dueDate),
      courseCode: assignment.courseCode || metadata.courseCode || '',
      title: assignment.title || 'Untitled Assignment',
      type: assignment.type || determineAssignmentType(assignment.title || ''),
      priority: assignment.priority || calculatePriority(assignment.title || '', assignment.dueDate)
    };
  });

  // Sort assignments by due date (null dates at the end)
  const sortedAssignments = processedAssignments.sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  const events = sortedAssignments.map(assignment => {
    const totalHours = calculateRequiredHours(assignment);
    const startDate = calculateStartDate(assignment.dueDate, totalHours);

    return {
      id: `task-${Math.random().toString(36).substr(2, 9)}`,
      title: assignment.title,
      start: startDate,
      end: assignment.dueDate || new Date(startDate.getTime() + totalHours * 3600000),
      description: assignment.description || '',
      location: assignment.courseCode || '',
      priority: assignment.priority || 'medium',
      category: assignment.type || 'task',
      courseCode: assignment.courseCode || metadata.courseCode || '',
      totalHours,
      resource: {
        ...assignment,
        details: {
          ...(assignment.details || {}),
          source: 'pdf',
          courseInfo: metadata
        }
      }
    };
  });

  console.log('Generated events:', {
    totalEvents: events.length,
    firstEvent: events[0],
    lastEvent: events[events.length - 1]
  });

  return distributeEventsOptimally(events);
}

// Helper function to parse various date formats
function parseDateString(dateStr) {
  if (!dateStr) return null;

  // Try parsing with built-in Date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;

  // Try MM/DD/YYYY format
  const mmddyyyy = dateStr.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (mmddyyyy) {
    return new Date(`${mmddyyyy[1]}/${mmddyyyy[2]}/${mmddyyyy[3]}`);
  }

  // Try Month DD, YYYY format
  const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const monthDdYyyy = dateStr.match(/([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i);
  if (monthDdYyyy) {
    const month = monthNames.findIndex(m => m.startsWith(monthDdYyyy[1].toLowerCase())) + 1;
    if (month > 0) {
      return new Date(`${month}/${monthDdYyyy[2]}/${monthDdYyyy[3]}`);
    }
  }

  return null;
}

function calculateRequiredHours(assignment) {
  let hours = assignment.estimatedHours || 2;

  // Adjust based on detailed requirements
  if (assignment.details) {
    if (assignment.details.wordCount) {
      hours += Math.ceil(assignment.details.wordCount / 500); // ~500 words per hour
    }
    if (assignment.details.pageCount) {
      hours += assignment.details.pageCount * 2; // 2 hours per page
    }
    if (assignment.details.groupWork) {
      hours *= 0.7; // Reduce hours for group work
    }
  }

  // Adjust for assignment weight
  if (assignment.weight) {
    hours *= (1 + assignment.weight / 100);
  }

  return Math.max(1, Math.min(8, Math.round(hours)));
}

function calculateStartDate(dueDate, totalHours) {
  const today = new Date();

  if (!dueDate) {
    // If no due date, start from tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }

  // Calculate ideal start date based on total hours needed
  const daysNeeded = Math.ceil(totalHours / 4); // Max 4 hours per day
  const idealStart = new Date(dueDate);
  idealStart.setDate(dueDate.getDate() - daysNeeded);
  idealStart.setHours(9, 0, 0, 0);

  // If ideal start is in the past, start from tomorrow
  if (idealStart < today) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }

  return idealStart;
}

function distributeEventsOptimally(events) {
  // Sort events by priority and due date
  const sortedEvents = events.sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const priorityDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);

    if (priorityDiff !== 0) return priorityDiff;
    if (!a.end && !b.end) return 0;
    if (!a.end) return 1;
    if (!b.end) return -1;
    return a.end.getTime() - b.end.getTime();
  });

  // Distribute across available days, avoiding overload
  const MAX_HOURS_PER_DAY = 4;
  const scheduledEvents = [];
  const dayLoads = new Map();

  for (const event of sortedEvents) {
    const startDate = new Date(event.start);
    let scheduledStart = null;

    // Find the best day for this event
    while (!scheduledStart) {
      const dayKey = startDate.toDateString();
      const currentLoad = dayLoads.get(dayKey) || 0;

      if (currentLoad + event.totalHours <= MAX_HOURS_PER_DAY) {
        scheduledStart = new Date(startDate);
        scheduledStart.setHours(9 + currentLoad); // Start at 9 AM + current load
        dayLoads.set(dayKey, currentLoad + event.totalHours);
      } else {
        startDate.setDate(startDate.getDate() + 1);
      }
    }

    const scheduledEnd = new Date(scheduledStart);
    scheduledEnd.setHours(scheduledStart.getHours() + event.totalHours);

    scheduledEvents.push({
      ...event,
      start: scheduledStart,
      end: scheduledEnd
    });
  }

  return scheduledEvents;
}

// Helper functions
function isAssignmentText(text) {
  const text_lower = text.toLowerCase();
  return (
    text_lower.includes('assignment') ||
    text_lower.includes('task') ||
    text_lower.includes('project') ||
    text_lower.includes('exercise') ||
    text_lower.includes('homework')
  );
}

function extractDueDate(text) {
  return text.match(
    /due\s*(?:by|on|:)?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{4})/i
  );
}

function estimateWorkHours(text) {
  const words = text.split(/\s+/).length;
  const complexity = (text.match(/analyze|research|create|develop|implement/gi) || []).length;
  const baseHours = Math.ceil(words / 100);
  const complexityHours = complexity * 2;
  return Math.max(1, Math.min(8, baseHours + complexityHours));
}

function distributeEvents(events) {
  // Simple distribution - one event per day
  return events.map((event, index) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + index);
    startDate.setHours(9, 0, 0, 0); // Start at 9 AM

    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + event.totalHours);

    return {
      title: event.title,
      start: startDate,
      end: endDate,
      userId: event.userId
    };
  });
}
