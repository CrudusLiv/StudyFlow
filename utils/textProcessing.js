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
        const assignment = {
          number: match[1],
          title: extractTitle(section),
          dueDate: extractDueDate(section),
          weight: extractWeight(section),
          requirements: extractRequirements(section),
          deliverables: extractDeliverables(section),
          type: determineAssignmentType(section),
          priority: calculatePriority(section)
        };

        assignments.push(assignment);
        break; // Found an assignment in this section
      }
    }
  });

  console.log(`Found ${assignments.length} assignments:`, 
    assignments.map(a => ({title: a.title, dueDate: a.dueDate})));
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
  console.log('Generating enhanced schedule with assignments:', assignments.slice(0, 2));

  // Convert date strings to Date objects
  const processedAssignments = assignments.map(assignment => {
    // Normalize assignment structure and fill in missing data
    return {
      ...assignment,
      dueDate: parseDateString(assignment.dueDate),
      courseCode: assignment.courseCode || metadata.courseCode || '',
      title: assignment.title || 'Untitled Assignment',
      type: assignment.type || determineAssignmentType(assignment.title || ''),
      priority: assignment.priority || calculatePriority(assignment.title || '', assignment.dueDate),
      // Estimate workload based on complexity
      estimatedHours: assignment.estimatedHours || estimateComplexity(assignment)
    };
  });

  // Sort assignments by due date and priority (null dates at the end)
  const sortedAssignments = processedAssignments.sort((a, b) => {
    // First sort by priority (high to low)
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const priorityDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then sort by due date (earlier to later)
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  const events = sortedAssignments.map(assignment => {
    const totalHours = calculateRequiredHours(assignment);
    const daysNeeded = Math.ceil(totalHours / 3); // Max 3 hours per day
    const startDate = calculateStartDate(assignment.dueDate, daysNeeded);

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
      daysNeeded,
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

  // Pass the class schedule from metadata if available
  const classSchedule = metadata.userPreferences?.classSchedule || null;
  return distributeEventsOptimally(events, classSchedule);
}

// Estimate complexity based on various factors
function estimateComplexity(assignment) {
  let complexity = 2; // Base complexity

  // Check title and description for complexity indicators
  const complexityIndicators = [
    'research', 'analysis', 'project', 'paper', 'essay', 'report', 
    'presentation', 'complex', 'difficult', 'comprehensive'
  ];
  
  const text = `${assignment.title} ${assignment.description || ''}`.toLowerCase();
  
  complexityIndicators.forEach(indicator => {
    if (text.includes(indicator)) {
      complexity += 1;
    }
  });
  
  // Adjust for assignment type
  if (assignment.type === 'essay' || assignment.type === 'report') complexity += 2;
  if (assignment.type === 'project' || assignment.type === 'presentation') complexity += 3;
  if (assignment.type === 'quiz' || assignment.type === 'homework') complexity += 1;
  
  return Math.min(complexity, 8); // Cap at 8 hours
}

function calculateRequiredHours(assignment) {
  // Start with either provided estimate or complexity-based estimate
  let hours = assignment.estimatedHours || 3;

  // Adjust based on detailed requirements
  if (assignment.details) {
    if (assignment.details.wordCount) {
      hours += Math.ceil(assignment.details.wordCount / 400); // ~400 words per hour
    }
    if (assignment.details.pageCount) {
      hours += assignment.details.pageCount * 1.5; // 1.5 hours per page
    }
    if (assignment.details.groupWork) {
      hours *= 0.7; // Reduce hours for group work
    }
  }

  // Adjust for assignment weight
  if (assignment.weight) {
    hours *= (1 + assignment.weight / 100);
  }

  return Math.max(1, Math.min(12, Math.round(hours)));
}

function calculateStartDate(dueDate, daysNeeded) {
  const today = new Date();

  if (!dueDate) {
    // If no due date, start from tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow;
  }

  // Calculate ideal start date based on days needed
  const idealStart = new Date(dueDate);
  idealStart.setDate(dueDate.getDate() - (daysNeeded + 2)); // +2 days buffer
  idealStart.setHours(10, 0, 0, 0);

  // If ideal start is in the past, start from tomorrow
  if (idealStart < today) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow;
  }

  return idealStart;
}

function distributeEventsOptimally(events, providedClassSchedule = null) {
  // Get class schedule from cached data (if available) or use provided schedule
  let classSchedule = [];
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      const cachedClasses = localStorage.getItem('scheduleRawClasses');
      if (cachedClasses) {
        classSchedule = JSON.parse(cachedClasses);
        console.log('Using cached class schedule for study time distribution');
      }
    } else if (providedClassSchedule) {
      // Use the provided class schedule when in server environment
      classSchedule = providedClassSchedule;
      console.log('Using provided class schedule for study time distribution');
    } else {
      console.warn('No class schedule available - proceeding without class conflict checking');
    }
  } catch (error) {
    console.warn('Could not access class schedule:', error);
  }

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

  // Distribute across available days, avoiding overload and class times
  const MAX_HOURS_PER_DAY = 4;
  const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const scheduledEvents = [];
  const dayLoads = new Map();
  
  // Helper function to check if a time slot conflicts with classes
  const conflictsWithClass = (date, duration) => {
    if (!classSchedule || classSchedule.length === 0) return false;
    
    const dayName = DAYS_OF_WEEK[date.getDay()];
    const startHour = date.getHours();
    const endHour = startHour + duration;
    
    // Check for conflicts with classes on this day
    return classSchedule.some(cls => {
      if (cls.day !== dayName) return false;
      
      const classStartHour = parseInt(cls.startTime.split(':')[0], 10);
      const classEndHour = parseInt(cls.endTime.split(':')[0], 10);
      
      // Check if there's overlap
      return (startHour < classEndHour && endHour > classStartHour);
    });
  };

  for (const event of sortedEvents) {
    // Create multiple study sessions for each event based on totalHours
    const totalSessions = Math.ceil(event.totalHours / 2); // 2 hours per session max
    let hoursRemaining = event.totalHours;
    const startDate = new Date(event.start);
    
    // Distribute across multiple days
    for (let i = 0; i < totalSessions && hoursRemaining > 0; i++) {
      const sessionHours = Math.min(hoursRemaining, 2); // Max 2 hours per session
      let sessionDate = new Date(startDate);
      sessionDate.setDate(startDate.getDate() + i);
      
      // Find a good time slot on this day
      let foundSlot = false;
      const timeSlots = [10, 13, 16, 19]; // Try different start times: 10am, 1pm, 4pm, 7pm
      
      for (const startHour of timeSlots) {
        sessionDate.setHours(startHour, 0, 0, 0);
        
        // Skip if this slot conflicts with a class
        if (conflictsWithClass(sessionDate, sessionHours)) {
          continue;
        }
        
        // Check if day isn't overloaded
        const dayKey = sessionDate.toDateString();
        const currentLoad = dayLoads.get(dayKey) || 0;
        
        if (currentLoad + sessionHours <= MAX_HOURS_PER_DAY) {
          // Create study session event
          const sessionEnd = new Date(sessionDate);
          sessionEnd.setHours(sessionDate.getHours() + sessionHours);
          
          scheduledEvents.push({
            ...event,
            id: `${event.id}-session-${i+1}`,
            title: `Study: ${event.title}`,
            start: new Date(sessionDate),
            end: sessionEnd,
            sessionNumber: i + 1,
            totalSessions
          });
          
          // Update day load
          dayLoads.set(dayKey, currentLoad + sessionHours);
          hoursRemaining -= sessionHours;
          foundSlot = true;
          break;
        }
      }
      
      // If no slot found on this day, try the next day
      if (!foundSlot) {
        i--; // Try again for this session
        startDate.setDate(startDate.getDate() + 1); // Move to next day
      }
    }
  }

  return scheduledEvents;
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

// Modified version of distributeEventsOptimally
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

function extractTitle(text) {
  // Try multiple patterns to find the most likely title
  const patterns = [
    /(?:assignment|assessment|project|task):?\s*([^.!?\n]+)/i,
    /title:?\s*([^.!?\n]+)/i,
    /(\d\.\s*[^.!?\n]+)/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
  }

  // Fallback: take first line or sentence
  return text.split(/[.!?\n]/)[0].trim();
}


