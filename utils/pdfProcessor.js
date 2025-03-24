import fs from 'fs';
import pdfParse from 'pdf-parse';
import { extractAssignments, extractDates, generateSchedule } from './textProcessing.js';

/**
 * Process a PDF buffer and extract structured content
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<Object>} Extracted content object
 */
export async function processPDF(buffer) {
  try {
    console.log('Starting enhanced PDF content extraction...');
    const data = await pdfParse(buffer);
    const text = data.text;
    console.log('PDF text extracted successfully');

    let documentContent = {
      headers: [],
      sections: {},
      assignments: [],
      dates: [],
      deadlines: [],
      syllabus: {
        courseCode: '',
        courseTitle: '',
        semester: '',
        instructor: '',
        assessments: []
      },
      rawText: text,
      parsedContent: []
    };

    // Split text into lines for processing
    const lines = text.split('\n').filter(line => line.trim());

    // Process each line
    lines.forEach((line, index) => {
      const lineText = line.trim();
      
      if (lineText) {
        // Course code detection
        const courseCodeMatch = lineText.match(/([A-Z]{2,}\d{3,}[A-Z0-9]*)/);
        if (courseCodeMatch && !documentContent.syllabus.courseCode) {
          documentContent.syllabus.courseCode = courseCodeMatch[1];
        }

        // Semester detection
        const semesterMatch = lineText.match(/semester\s*[:\s]?\s*(\d+)\s*,?\s*(\d{4})/i);
        if (semesterMatch && !documentContent.syllabus.semester) {
          documentContent.syllabus.semester = `Semester ${semesterMatch[1]}, ${semesterMatch[2]}`;
        }

        // Assignment detection
        const assignmentPatterns = [
          /assignment\s*(?:no\.?|number)?[\s:]*(\d+)/i,
          /assessment\s*(?:no\.?|number)?[\s:]*(\d+)/i,
          /project\s*(?:no\.?|number)?[\s:]*(\d+)/i
        ];

        for (const pattern of assignmentPatterns) {
          const match = lineText.match(pattern);
          if (match) {
            documentContent.assignments.push({
              type: 'assignment',
              number: match[1],
              title: lineText,
              details: extractAssignmentDetails(lineText)
            });
          }
        }

        // Store content with metadata
        documentContent.parsedContent.push({
          text: lineText,
          isHeader: /^[A-Z\d][\w\s-]{0,50}$/.test(lineText) && lineText.length < 100
        });
      }
    });

    // Post-process the extracted content
    processExtractedContent(documentContent);

    console.log('Extraction complete:', {
      courseCode: documentContent.syllabus.courseCode,
      semester: documentContent.syllabus.semester,
      assignmentsFound: documentContent.assignments.length,
      datesFound: documentContent.dates.length
    });

    return documentContent;
  } catch (error) {
    console.error('Error in PDF processing:', error);
    throw error;
  }
}

function processExtractedContent(content) {
  // Analyze content structure and relationships
  content.parsedContent.forEach((item, index, array) => {
    // Identify section headers
    if (item.isHeader) {
      content.headers.push({
        text: item.text,
        page: item.page,
        level: determineHeaderLevel(item, array)
      });

      // Check if header contains course title
      const titleMatch = item.text.match(/course\s*title\s*:\s*(.+)/i);
      if (titleMatch && !content.syllabus.courseTitle) {
        content.syllabus.courseTitle = titleMatch[1].trim();
      }
    }

    // Group content into sections
    const currentHeader = content.headers[content.headers.length - 1]?.text || 'General';
    if (!content.sections[currentHeader]) {
      content.sections[currentHeader] = [];
    }
    content.sections[currentHeader].push(item);
  });

  // Extract deadlines from dates and context
  content.dates.forEach(date => {
    if (/due|deadline|submit/i.test(date.context)) {
      content.deadlines.push({
        date: date.date,
        context: date.context,
        page: date.page
      });
    }
  });
}

// ...rest of existing helper functions...

function extractAssignmentDetails(text) {
  return {
    dueDate: extractDate(text),
    weight: extractWeight(text),
    requirements: extractRequirements(text),
    deliverables: extractDeliverables(text)
  };
}

function extractDate(text) {
  // Enhanced date extraction patterns
  const patterns = [
    /(?:due|deadline|submit by|submission)[\s:]*([a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4})/i,
    /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/,
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractWeight(text) {
  // Look for percentage or weight indicators
  const weightPatterns = [
    /(?:worth|weight|marks?|points?)\s*:?\s*(\d+)%/i,
    /(\d+)%\s*(?:of|worth|weight)/i,
    /(\d+)\s*marks?/i,
    /(\d+)\s*points?/i
  ];

  for (const pattern of weightPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      return isNaN(value) ? null : value;
    }
  }
  return null;
}

function extractRequirements(text) {
  const requirements = [];

  // Look for requirement sections
  const sections = text.split(/\n+/);
  let inRequirements = false;

  for (const section of sections) {
    // Check if this section starts requirements
    if (/requirements?|specifications?|tasks?|objectives?/i.test(section)) {
      inRequirements = true;
      continue;
    }

    // If we're in requirements section and line starts with a bullet or number
    if (inRequirements && /^[\s•\-\d\.*]\s*\w+/.test(section)) {
      const requirement = section.replace(/^[\s•\-\d\.*]\s*/, '').trim();
      if (requirement) {
        requirements.push(requirement);
      }
    }

    // Stop collecting if we hit another major section
    if (inRequirements && /^(?:submission|delivery|deadline|grading|marking)/i.test(section)) {
      inRequirements = false;
    }
  }

  return requirements;
}

function extractDeliverables(text) {
  const deliverables = [];

  // Look for deliverable sections
  const sections = text.split(/\n+/);
  let inDeliverables = false;

  for (const section of sections) {
    // Check if this section starts deliverables
    if (/deliverables?|submit|submission|provide|include/i.test(section)) {
      inDeliverables = true;
      continue;
    }

    // If we're in deliverables section and line starts with a bullet or number
    if (inDeliverables && /^[\s•\-\d\.*]\s*\w+/.test(section)) {
      const deliverable = section.replace(/^[\s•\-\d\.*]\s*/, '').trim();
      if (deliverable) {
        deliverables.push(deliverable);
      }
    }

    // Stop collecting if we hit another major section
    if (inDeliverables && /^(?:grading|marking|requirements?|assessment)/i.test(section)) {
      inDeliverables = false;
    }
  }

  return deliverables;
}

function determineHeaderLevel(item, array) {
  // Determine header level based on font size and position
  const fontSize = item.fontSize || 0;
  if (fontSize > 16) return 1;
  if (fontSize > 14) return 2;
  if (fontSize > 12) return 3;
  return 4;
}

/**
 * Process uploaded PDF documents and generate a study schedule
 * @param {string[]} filePaths - Array of paths to uploaded PDF files
 * @param {string} userId - User ID for personalization
 * @param {Object} options - Additional options like classSchedule
 * @returns {Object[]} - Generated weekly schedule
 */
export async function processDocuments(filePaths, userId, options = {}) {
  try {
    console.log('Starting enhanced document processing...', { numberOfFiles: filePaths.length });
    let allText = '';
    let allStructuredContent = {
      assignments: [],
      dates: [],
      deadlines: [],
      metadata: {
        courseTitle: '',
        courseCode: '',
        instructor: ''
      }
    };

    // Load user preferences if available
    let userPreferences = {
      studyHoursPerDay: 4,
      breakDuration: 15,
      weekendStudy: true,
      preferredStudyTimes: ['morning', 'evening']
    };
    
    try {
      // Attempt to retrieve user preferences from localStorage
      const storedPreferences = localStorage.getItem('userPreferences');
      if (storedPreferences) {
        userPreferences = {...userPreferences, ...JSON.parse(storedPreferences)};
        console.log('Using stored user preferences:', userPreferences);
      }
    } catch (error) {
      console.warn('Could not load user preferences:', error);
    }

    for (const filePath of filePaths) {
      console.log('Processing file:', filePath);
      const dataBuffer = fs.readFileSync(filePath);

      // Use our enhanced PDF processor for better structure extraction
      const extractedData = await processPDF(dataBuffer);
      allText += extractedData.rawText + '\n\n';

      // Merge structured content
      if (extractedData.structuredContent) {
        allStructuredContent.assignments.push(...(extractedData.structuredContent.assignments || []));
        allStructuredContent.dates.push(...(extractedData.structuredContent.dates || []));
        allStructuredContent.deadlines.push(...(extractedData.structuredContent.deadlines || []));

        // Use the first non-empty metadata we find
        if (!allStructuredContent.metadata.courseTitle && extractedData.structuredContent.syllabus?.courseTitle) {
          allStructuredContent.metadata.courseTitle = extractedData.structuredContent.syllabus.courseTitle;
        }
        if (!allStructuredContent.metadata.courseCode && extractedData.structuredContent.syllabus?.courseCode) {
          allStructuredContent.metadata.courseCode = extractedData.structuredContent.syllabus.courseCode;
        }
        if (!allStructuredContent.metadata.instructor && extractedData.structuredContent.syllabus?.instructor) {
          allStructuredContent.metadata.instructor = extractedData.structuredContent.syllabus.instructor;
        }
      }

      // Delete the temporary file after processing
      fs.unlinkSync(filePath);
    }

    console.log('Extracting assignments and dates from structured content...');

    // Use both the structured assignments and run text-based extraction as fallback
    let textExtractedAssignments = extractAssignments(allText);

    // Combine assignments from structured extraction and text extraction
    const assignments = allStructuredContent.assignments.length > 0 ?
      allStructuredContent.assignments :
      textExtractedAssignments;

    // Get all dates including from structured content
    const dates = allStructuredContent.dates.length > 0 ?
      allStructuredContent.dates :
      extractDates(allText);

    console.log('Extracted data:', {
      numberOfAssignments: assignments.length,
      numberOfDates: dates.length,
      assignmentsSample: assignments.slice(0, 2),
      datesSample: dates.slice(0, 2),
      metadata: allStructuredContent.metadata
    });

    // Get class schedule from options or create empty array
    let classSchedule = options.classSchedule || [];
    try {
      // Only try localStorage if we're in a browser environment
      if (typeof window !== 'undefined' && window.localStorage) {
        const cachedClasses = localStorage.getItem('scheduleRawClasses');
        if (cachedClasses) {
          classSchedule = JSON.parse(cachedClasses);
          console.log('Using cached class schedule for optimal study times');
        }
      } else if (!classSchedule.length) {
        console.warn('No class schedule provided and not in browser environment');
      }
    } catch (error) {
      console.warn('Error accessing class schedule:', error);
    }

    // Add class schedule to the user context
    userPreferences.classSchedule = classSchedule;

    console.log('Generating optimized schedule with user preferences...');
    const schedule = generateSchedule(
      assignments, 
      dates, 
      userId, 
      { ...allStructuredContent.metadata, userPreferences }
    );

    console.log('Enhanced schedule generated:', {
      numberOfEvents: schedule.length,
      firstEvent: schedule[0],
      lastEvent: schedule[schedule.length - 1]
    });

    return schedule;
  } catch (error) {
    console.error('Error processing PDFs:', error);
    throw new Error('Failed to process PDF documents');
  }
}

// Enhanced assignment extraction for better complexity assessment
function isAssignmentText(text) {
  const text_lower = text.toLowerCase();
  const assignmentKeywords = [
    'assignment', 'task', 'project', 'exercise', 'homework',
    'report', 'paper', 'essay', 'presentation', 'quiz', 'exam',
    'assessment', 'submission', 'deliverable'
  ];
  
  return assignmentKeywords.some(keyword => text_lower.includes(keyword));
}

// More comprehensive due date extraction
function extractDueDate(text) {
  const patterns = [
    // "Due by" or "Due on" followed by date
    /due\s*(?:by|on|:)?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/i,
    
    // Specific deadline mentions
    /deadline:?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/i,
    
    // Submit by format
    /submit\s*(?:by|on|before):?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// More sophisticated work hour estimation
function estimateWorkHours(text) {
  // Base hours based on text length
  const words = text.split(/\s+/).length;
  let baseHours = Math.ceil(words / 200); // ~200 words per hour of work
  
  // Adjust for complexity indicators
  const complexityKeywords = [
    'research', 'analyze', 'create', 'develop', 'implement', 'design',
    'evaluate', 'review', 'investigate', 'comprehensive', 'detailed'
  ];
  
  const complexityScore = complexityKeywords.reduce((score, keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = text.match(regex) || [];
    return score + matches.length;
  }, 0);
  
  // Adjust for assignment type
  if (/essay|paper|report/i.test(text)) baseHours += 3;
  if (/presentation|project/i.test(text)) baseHours += 4;
  if (/research/i.test(text)) baseHours += 2;
  
  // Adjust for word count requirements
  const wordCountMatch = text.match(/(\d+)\s*(?:to|-)\s*(\d+)\s*words/i) || text.match(/(\d+)\s*words/i);
  if (wordCountMatch) {
    const wordCount = parseInt(wordCountMatch[2] || wordCountMatch[1], 10);
    if (!isNaN(wordCount)) {
      baseHours += Math.ceil(wordCount / 500); // ~500 words per hour
    }
  }
  
  // Add complexity bonus
  baseHours += Math.min(complexityScore, 5);
  
  return Math.max(1, Math.min(12, baseHours));
}
