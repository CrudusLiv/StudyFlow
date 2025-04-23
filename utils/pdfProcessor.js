import fs from 'fs';
import pdfParse from 'pdf-parse';
import { extractAssignments, extractDates, generateSchedule, createFallbackDueDate } from './textProcessing.js';
import { saveSchedule } from './fileStorage.js';

/**
 * Enhanced PDF processing with deeper semantic understanding
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<Object>} Structured content from the PDF
 */
export async function processPDF(buffer) {
  try {
    console.log('Starting advanced PDF content extraction...');
    const data = await pdfParse(buffer);
    const text = data.text;
    console.log('PDF text extracted successfully, length:', text.length);

    // Comprehensive document structure for better semantic understanding
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
      parsedContent: [],
      keywords: [],
      complexity: 0,
      structuredContent: {
        assignments: [],
        dates: [],
        deadlines: [],
        topics: [],
        tasks: [],
        deliverables: []
      }
    };

    // Text preprocessing to handle PDF formatting issues
    const cleanedText = preProcessText(text);
    
    // Split into logical sections for semantic understanding
    const sections = splitIntoSections(cleanedText);
    const lines = cleanedText.split('\n').filter(line => line.trim());
    
    // Deep analysis of document structure
    analyzeDocumentStructure(lines, sections, documentContent);
    
    // Add task extraction to the document content
    const { tasks, deliverables } = extractTasksAndDeliverables(cleanedText);
    documentContent.structuredContent.tasks = tasks;
    documentContent.structuredContent.deliverables = deliverables;
    
    console.log('Advanced extraction complete:', {
      courseCode: documentContent.syllabus.courseCode,
      assignmentsFound: documentContent.assignments.length,
      datesFound: documentContent.dates.length,
      topicsFound: documentContent.structuredContent.topics.length,
      tasksFound: tasks.length,
      deliverablesFound: deliverables.length
    });

    return documentContent;
  } catch (error) {
    console.error('Error in PDF processing:', error);
    throw error;
  }
}

/**
 * Preprocess text to fix common PDF extraction issues
 */
function preProcessText(text) {
  // Fix broken lines that should be together
  let processed = text.replace(/(\w)-\n(\w)/g, '$1$2');
  
  // Normalize whitespace
  processed = processed.replace(/\s+/g, ' ');
  
  // Re-insert paragraph breaks
  processed = processed.replace(/\.\s+([A-Z])/g, '.\n$1');
  
  // Fix common PDF issues with bullet points
  processed = processed.replace(/•/g, '\n• ');
  
  return processed;
}

/**
 * Split text into logical sections based on semantic structure
 */
function splitIntoSections(text) {
  // Enhanced section detection with semantic understanding
  const sectionDividers = [
    /\n\s*\n+/g, // Multiple line breaks
    /\n[-=_]{3,}\n/g, // Separator lines
    /\n\s*(?:SECTION|PART|CHAPTER|UNIT|MODULE)\s*\d+\s*[:.-]\s*/gi, // Explicit section markers
    /\n\s*(?:Assignment|Homework|Project|Lab)\s*\d+\s*[:.-]\s*/gi, // Assignment sections
    /\n\s*(?:Lecture|Week|Topic)\s*\d+\s*[:.-]\s*/gi // Course content sections
  ];
  
  let processedText = text;
  for (const divider of sectionDividers) {
    processedText = processedText.replace(divider, '\n§SECTION_BREAK§\n');
  }
  
  return processedText.split('§SECTION_BREAK§')
    .map(section => section.trim())
    .filter(section => section.length > 0);
}

/**
 * Analyze document structure with deep content understanding
 */
function analyzeDocumentStructure(lines, sections, documentContent) {
  // Enhanced patterns for metadata detection
  const courseCodePatterns = [
    /([A-Z]{2,}\d{3,}[A-Z0-9]*)/,  // Standard course codes like CS101, BIO-240
    /Course\s*(?:Code|Number|ID)[:.]?\s*([A-Z]{2,}[- ]?\d{3,}[A-Z0-9]*)/i, // Explicit course code labels
    /([A-Z]{2,})[- ](\d{3,})/i // Split course code components
  ];
  
  // Topic detection for better content understanding
  const topicPatterns = [
    /Topic\s*\d*\s*[:.-]?\s*(.+)/i,
    /Lecture\s*\d*\s*[:.-]?\s*(.+)/i,
    /Chapter\s*\d*\s*[:.-]?\s*(.+)/i,
    /Module\s*\d*\s*[:.-]?\s*(.+)/i
  ];
  
  // Process each line for enriched metadata
  lines.forEach((line, index) => {
    const lineText = line.trim();
    
    if (lineText) {
      // Enhanced course code detection
      for (const pattern of courseCodePatterns) {
        const match = lineText.match(pattern);
        if (match && !documentContent.syllabus.courseCode) {
          documentContent.syllabus.courseCode = match[1].replace(/\s+/g, '');
          break;
        }
      }

      // Enhanced course title detection
      const courseTitleMatch = lineText.match(/(?:course|class)\s*(?:title|name|subject)[:.]?\s*(.+)/i);
      if (courseTitleMatch && !documentContent.syllabus.courseTitle) {
        documentContent.syllabus.courseTitle = courseTitleMatch[1].trim();
      }

      // Enhanced instructor detection
      const instructorMatch = lineText.match(/(?:instructor|professor|lecturer|teacher|taught by)[:.]?\s*(.+)/i);
      if (instructorMatch && !documentContent.syllabus.instructor) {
        documentContent.syllabus.instructor = instructorMatch[1].trim();
      }

      // Enhanced semester detection
      const semesterMatch = lineText.match(/(?:semester|term|quarter|session)[:.]?\s*(.+)/i);
      if (semesterMatch && !documentContent.syllabus.semester) {
        documentContent.syllabus.semester = semesterMatch[1].trim();
      }

      // Enriched assignment detection
      const assignmentPatterns = [
        /(?:assignment|homework)\s*(?:no\.?|number)?[\s:]*(\d+)/i,
        /(?:project|lab)\s*(?:no\.?|number)?[\s:]*(\d+)/i,
        /(?:task|problem\s*set)\s*(?:no\.?|number)?[\s:]*(\d+)/i,
        /(?:final\s*project|term\s*paper|research\s*paper)/i,
        /(?:quiz|exam|test|midterm|final)\s*(?:no\.?|number)?[\s:]*(\d+)?/i,
        /(?:due\s*date|deadline)[:.]?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})/i
      ];

      for (const pattern of assignmentPatterns) {
        const match = lineText.match(pattern);
        if (match) {
          // Get comprehensive context by including lines before and after
          const assignmentContext = lines.slice(Math.max(0, index - 5), Math.min(lines.length, index + 15)).join('\n');
          const assignmentDetails = extractAssignmentsFromText(assignmentContext);
          
          documentContent.assignments.push({
            type: determineAssignmentType(lineText),
            number: match[1] || '',
            title: extractTitle(lineText, assignmentContext),
            details: assignmentDetails,
            complexity: calculateComplexity(assignmentContext),
            description: extractDescription(assignmentContext),
            objectives: extractObjectives(assignmentContext)
          });
          
          // Add to structured content with enriched metadata
          documentContent.structuredContent.assignments.push({
            title: extractTitle(lineText, assignmentContext),
            description: extractDescription(assignmentContext),
            dueDate: assignmentDetails.dueDate,
            weight: assignmentDetails.weight,
            complexity: calculateComplexity(assignmentContext),
            estimatedHours: estimateWorkHours(assignmentContext),
            objectives: extractObjectives(assignmentContext),
            topics: extractTopics(assignmentContext)
          });
          
          break;
        }
      }

      // Topic detection for better content organization
      for (const pattern of topicPatterns) {
        const match = lineText.match(pattern);
        if (match && match[1]) {
          documentContent.structuredContent.topics.push({
            title: match[1].trim(),
            context: lines.slice(Math.max(0, index - 2), Math.min(lines.length, index + 10)).join('\n'),
            importance: calculateTopicImportance(match[1], lines.slice(index, Math.min(lines.length, index + 20)).join('\n'))
          });
        }
      }

      // Store content with semantic metadata
      documentContent.parsedContent.push({
        text: lineText,
        isHeader: isHeaderLine(lineText, index, lines),
        lineNumber: index,
        isAssignment: isAssignmentLine(lineText),
        isDate: isDateLine(lineText),
        isTopic: isTopicLine(lineText)
      });
    }
  });
  
  // Process sections to extract dates with semantic context
  sections.forEach(section => {
    const dateMatches = extractDatesFromText(section);
    documentContent.dates.push(...dateMatches);
    
    // Add to structured content
    documentContent.structuredContent.dates.push(...dateMatches);
    
    // Calculate semantic complexity for better study time estimates
    const complexity = calculateComplexity(section);
    documentContent.complexity += complexity;
    
    // Note: We're using fixed due dates instead of extracting deadlines
    // If we find a section that mentions deadlines, just log the information
    if (/(?:due|deadline|submission|submit|assignment|homework|project)/i.test(section)) {
      console.log('Found deadline-related section but using fixed due dates instead');
    }
  });
}

/**
 * Extract tasks and deliverables from text content
 * @param {string} text - Raw text from PDF
 * @returns {Object} Object containing tasks and deliverables arrays
 */
function extractTasksAndDeliverables(text) {
  if (!text) return { tasks: [], deliverables: [] };
  
  try {
    const tasks = [];
    const deliverables = [];
    
    // Look for task sections with more flexible pattern matching
    const taskSectionPatterns = [
      /\b(?:TASKS?|TO\s+DO|REQUIREMENTS?|ASSIGNMENT\s+TASKS?|INSTRUCTIONS)\b[:\s]*([\s\S]+?)(?:\n\s*\n|\b(?:SUBMISSION|DELIVERABLES|REMARKS|NOTE)\b)/i,
      /\b(?:YOUR\s+TASK\s+IS|YOU\s+(?:NEED|HAVE)\s+TO|STUDENTS\s+(?:WILL|SHOULD|MUST))\b[:\s]*([\s\S]+?)(?:\n\s*\n|\b(?:SUBMISSION|DELIVERABLES|REMARKS|NOTE)\b)/i,
      /\b(?:COMPLETE\s+THE\s+FOLLOWING|ANSWER\s+THE\s+FOLLOWING)\b[:\s]*([\s\S]+?)(?:\n\s*\n|\b(?:SUBMISSION|DELIVERABLES|REMARKS|NOTE)\b)/i
    ];
    
    // Try each task section pattern
    let taskSection = '';
    for (const pattern of taskSectionPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 10) {
        taskSection = match[1].trim();
        break;
      }
    }
    
    // If we found a task section, extract individual tasks
    if (taskSection) {
      // Look for numbered or bulleted tasks
      const taskItemPatterns = [
        /(?:^|\n)\s*(?:[ivxIVX]+\.|\d+\.|\*|\-|\•|\u2022|\u2023|\u25E6|\u2043|\u2219|\u2022)\s*([^\n]+)/g,
        /(?:^|\n)\s*(?:\([a-z0-9]\)|\[[a-z0-9]\])\s*([^\n]+)/g,
        /(?:^|\n)(?:[A-Z][a-z]+\s+(?:the|all|each|every|your|this|that|these|those|a|an|to))([^.!?\n]+[.!?])/g
      ];
      
      // Try each pattern for task items
      for (const pattern of taskItemPatterns) {
        let match;
        while ((match = pattern.exec(taskSection)) !== null) {
          if (match[1] && match[1].trim().length > 5) {
            const task = match[1].trim().replace(/\.$/, ''); // Remove trailing period if present
            if (!tasks.includes(task)) {
              tasks.push(task);
            }
          }
        }
      }
      
      // If no structured tasks found, try to extract sentences that look like tasks
      if (tasks.length === 0) {
        const sentencePattern = /(?:^|\n)([A-Z][^.!?\n]+(?:analyze|create|develop|design|implement|evaluate|explain|describe|compare|contrast|write|calculate|determine|solve|consider|discuss|examine)[^.!?\n]*[.!?])/g;
        let match;
        while ((match = sentencePattern.exec(taskSection)) !== null) {
          if (match[1] && match[1].trim().length > 10) {
            tasks.push(match[1].trim());
          }
        }
      }
    }
    
    // Look for deliverable/submission sections with more patterns
    const deliverableSectionPatterns = [
      /\b(?:SUBMISSION|DELIVERABLES|SUBMIT|TURN[\s-]IN|HAND[\s-]IN|TO\s+SUBMIT|REQUIRED\s+SUBMISSION)\b[:\s]*([\s\S]+?)(?:\n\s*\n|\b(?:REMARKS|NOTE|ASSESSMENT|GRADING|EVALUATION)\b)/i,
      /\b(?:YOU\s+(?:MUST|SHOULD|NEED\s+TO)\s+SUBMIT|UPLOAD\s+YOUR|INCLUDE\s+IN\s+YOUR\s+SUBMISSION)\b[:\s]*([\s\S]+?)(?:\n\s*\n|\b(?:REMARKS|NOTE|ASSESSMENT|GRADING|EVALUATION)\b)/i,
      /\b(?:YOUR\s+SUBMISSION\s+SHOULD\s+INCLUDE|YOUR\s+SUBMISSION\s+MUST\s+INCLUDE|PLEASE\s+SUBMIT)\b[:\s]*([\s\S]+?)(?:\n\s*\n|\b(?:REMARKS|NOTE|ASSESSMENT|GRADING|EVALUATION)\b)/i
    ];
    
    // Try each deliverable section pattern
    let deliverableSection = '';
    for (const pattern of deliverableSectionPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 10) {
        deliverableSection = match[1].trim();
        break;
      }
    }
    
    // If we found a deliverable section, extract individual deliverables
    if (deliverableSection) {
      // Look for numbered or bulleted deliverables
      const deliverableItemPatterns = [
        /(?:^|\n)\s*(?:[ivxIVX]+\.|\d+\.|\*|\-|\•|\u2022|\u2023|\u25E6|\u2043|\u2219|\u2022)\s*([^\n]+)/g,
        /(?:^|\n)\s*(?:\([a-z0-9]\)|\[[a-z0-9]\])\s*([^\n]+)/g,
        /(?:^|\n)(?:Submit|Upload|Include|Provide|Attach)([^.!?\n]+[.!?])/g
      ];
      
      // Try each pattern for deliverable items
      for (const pattern of deliverableItemPatterns) {
        let match;
        while ((match = pattern.exec(deliverableSection)) !== null) {
          if (match[1] && match[1].trim().length > 5) {
            const deliverable = match[1].trim().replace(/\.$/, ''); // Remove trailing period if present
            if (!deliverables.includes(deliverable)) {
              deliverables.push(deliverable);
            }
          }
        }
      }
      
      // If no structured deliverables found, try to extract sentences that look like deliverables
      if (deliverables.length === 0) {
        const sentencePattern = /(?:^|\n)([A-Z][^.!?\n]*(?:file|document|report|paper|submission|zip|code|project|assignment|portfolio|presentation)[^.!?\n]*[.!?])/g;
        let match;
        while ((match = sentencePattern.exec(deliverableSection)) !== null) {
          if (match[1] && match[1].trim().length > 10) {
            deliverables.push(match[1].trim());
          }
        }
      }
    }
    
    console.log(`Extracted ${tasks.length} tasks and ${deliverables.length} deliverables`);
    return { tasks, deliverables };
  } catch (error) {
    console.error('Error extracting tasks and deliverables:', error);
    return { tasks: [], deliverables: [] };
  }
}

/**
 * Extract assignment information from text content
 * @param {string} text - Raw text from PDF
 * @returns {Object} Assignment details object
 */
function extractAssignmentsFromText(text) {
  if (!text) return { title: '', dueDate: null, weight: null, points: null };
  
  try {
    // Look for assignment title patterns
    const titlePattern = /(?:assignment|homework|project|task)\s*(?:#|number|no\.?)?\s*\d*\s*[:.]?\s*([^\n.]+)/i;
    const titleMatch = text.match(titlePattern);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // Look for due date
    const dueDatePatterns = [
      /due\s*(?:date|by|on)?\s*[:.]?\s*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/i,
      /due\s*(?:date|by|on)?\s*[:.]?\s*([a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4})/i,
      /submit(?:ted)?\s*(?:by|before|on)?\s*[:.]?\s*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/i,
      /submit(?:ted)?\s*(?:by|before|on)?\s*[:.]?\s*([a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4})/i
    ];
    
    let dueDate = null;
    for (const pattern of dueDatePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        try {
          const dateObj = new Date(match[1]);
          if (!isNaN(dateObj.getTime())) {
            dueDate = dateObj.toISOString();
            break;
          }
        } catch (e) {
          console.log('Failed to parse date:', match[1]);
        }
      }
    }
    
    // Look for weight/points
    const weightPattern = /(?:worth|value|weight|grade|marks)\s*[:.]?\s*(\d+)%/i;
    const pointsPattern = /(?:worth|value|points|marks)\s*[:.]?\s*(\d+)\s*(?:points|marks|pts)/i;
    
    const weightMatch = text.match(weightPattern);
    const pointsMatch = text.match(pointsPattern);
    
    const weight = weightMatch ? parseInt(weightMatch[1]) : null;
    const points = pointsMatch ? parseInt(pointsMatch[1]) : null;
    
    return {
      title: title,
      dueDate: dueDate,
      weight: weight,
      points: points,
      // Add more extracted fields as needed
      rawText: text.substring(0, 200) + '...' // Store a preview of the raw text
    };
  } catch (error) {
    console.error('Error extracting assignment details:', error);
    return {
      title: '',
      dueDate: null,
      weight: null,
      points: null
    };
  }
}

/**
 * Determines the type of assignment based on text content
 * @param {string} text - The text content to analyze
 * @returns {string} - The assignment type
 */
function determineAssignmentType(text) {
  if (!text) return 'assignment';

  // Convert to lowercase and clean up for analysis
  const lowerText = text.toLowerCase();
  
  // Check for various assignment types based on keywords
  const typePatterns = [
    { type: 'essay', patterns: ['essay', 'write an essay', 'writing assignment', 'paper', 'research paper', 'reflection'] },
    { type: 'problem_set', patterns: ['problem set', 'solve the following', 'calculate', 'exercises', 'homework problem'] },
    { type: 'quiz', patterns: ['quiz', 'short test', 'pop quiz'] },
    { type: 'exam', patterns: ['exam', 'midterm', 'final exam', 'test', 'assessment'] },
    { type: 'project', patterns: ['project', 'group project', 'team assignment', 'develop', 'create', 'design'] },
    { type: 'lab', patterns: ['lab', 'laboratory', 'experiment'] },
    { type: 'presentation', patterns: ['presentation', 'present', 'oral report', 'speech', 'powerpoint'] },
    { type: 'reading', patterns: ['reading', 'read', 'reading assignment', 'chapter', 'textbook'] },
    { type: 'discussion', patterns: ['discussion', 'forum', 'debate', 'participate in class'] },
    { type: 'report', patterns: ['report', 'lab report', 'book report', 'summary', 'case study'] }
  ];
  
  // Check for assignment type patterns
  for (const { type, patterns } of typePatterns) {
    for (const pattern of patterns) {
      if (lowerText.includes(pattern)) {
        return type;
      }
    }
  }
  
  // Default assignment type if no specific type is identified
  return 'assignment';
}

/**
 * Process PDF documents to extract information and generate a schedule
 * @param {Array} filePaths - Array of PDF file paths
 * @param {String} userId - User ID
 * @param {Object} options - Processing options
 * @returns {Array} Generated study schedule
 */
export async function processDocuments(filePaths, userId, options = {}) {
  try {
    // Add null checks before accessing length property
    if (!filePaths || !Array.isArray(filePaths)) {
      console.warn("No documents to process or filePaths is not an array");
      return []; // Return empty array instead of failing
    }
    
    console.log(`Processing ${filePaths.length} PDFs for user ${userId}`);
    
    // Add validation to ensure filePaths is defined and is an array
    if (!filePaths || !Array.isArray(filePaths)) {
      console.error("Invalid filePaths provided:", filePaths);
      throw new Error("Expected an array of file paths");
    }
    
    // Validate userId
    if (!userId) {
      console.error("Missing userId in processDocuments call");
      throw new Error("User ID is required to process documents");
    }
    
    // Ensure options is an object
    const processingOptions = options || {};
    
    console.log('Starting enhanced document processing...', { 
      numberOfFiles: filePaths.length,
      hasPreferences: !!options.preferences,
      hasClassSchedule: !!options.classSchedule
    });
    
    const allDocumentContent = {
      assignments: [],
      dates: [],
      deadlines: [],
      topics: [],
      metadata: {
        courseTitle: '',
        courseCode: '',
        instructor: '',
        semester: ''
      },
      // Initialize these arrays to prevent undefined errors later
      tasks: [],
      deliverables: []
    };

    const processedFiles = [];

    // Process each file
    for (const filePath of filePaths) {
      console.log('Processing file:', filePath);
      const dataBuffer = fs.readFileSync(filePath);
      
      // Tag the document as an assignment
      const fileInfo = {
        path: filePath,
        name: filePath.split('/').pop(),
        documentType: 'assignment'
      };

      // Extract course code from filename if possible
      const filenameMatch = fileInfo.name.match(/\b([A-Z]{2,}[-\s]?[A-Z0-9]*\d{3}[A-Z0-9]*)\b/i);
      if (filenameMatch) {
        fileInfo.courseCode = filenameMatch[1].toUpperCase();
        console.log(`Extracted course code ${fileInfo.courseCode} from filename`);
      }

      // Use enhanced PDF processor for rich data extraction
      const extractedData = await processPDF(dataBuffer, fileInfo);
      console.log(`Extracted data for file ${fileInfo.name}:`, {
        assignmentsFound: extractedData?.structuredContent?.assignments?.length || 0,
        datesFound: extractedData?.structuredContent?.dates?.length || 0,
        deadlinesFound: extractedData?.structuredContent?.deadlines?.length || 0,
        topicsFound: extractedData?.structuredContent?.topics?.length || 0,
        tasksFound: extractedData?.structuredContent?.tasks?.length || 0,
        deliverablesFound: extractedData?.structuredContent?.deliverables?.length || 0,
        extractedCourseCode: extractedData?.syllabus?.courseCode || 'none'
      });
      
      // Set course code from extracted data if available
      if (extractedData.syllabus?.courseCode && !fileInfo.courseCode) {
        fileInfo.courseCode = extractedData.syllabus.courseCode;
        console.log(`Using course code ${fileInfo.courseCode} from syllabus data`);
      }

      // Merge structured content with comprehensive metadata
      if (extractedData?.structuredContent) {
        // Add assignments with assignment tag and detailed metadata
        if (Array.isArray(extractedData.structuredContent.assignments)) {
          extractedData.structuredContent.assignments.forEach(assignment => {
            // Extract course code and assignment number to check for fixed due dates
            const courseCode = fileInfo.courseCode || extractedData.syllabus?.courseCode || '';
            
            // Extract assignment number if present in title
            const assignmentNumberMatch = assignment.title.match(/(?:assignment|project|homework|hw|lab)\s*(?:no\.?|number|#)?\s*(\d+)|(?:^|\s+)a(\d+)\b/i);
            const assignmentNumber = assignmentNumberMatch 
              ? parseInt(assignmentNumberMatch[1] || assignmentNumberMatch[2], 10) 
              : 1;
            
            // Use the fixed due date function WITH FILE NAME
            const fixedDueDate = createFallbackDueDate(
              assignment.title, 
              options.classSchedule || [], 
              options.preferences || {},
              fileInfo.name // Pass the file name here to check for file-based fixed dates
            );
            
            // Use ISO date format string for the due date
            const dueDate = fixedDueDate.toISOString().split('T')[0];
            
            allDocumentContent.assignments.push({
              ...assignment,
              dueDate: dueDate, // Use our fixed due date
              courseCode: courseCode,
              assignmentNumber: assignmentNumber,
              source: 'pdf',
              documentType: 'assignment',
              sourceFile: filePath.split('/').pop()
            });
          });
        }
        
        // Add dates with context classification
        if (Array.isArray(extractedData.structuredContent.dates)) {
          extractedData.structuredContent.dates.forEach(date => {
            allDocumentContent.dates.push({
              ...date,
              source: 'pdf',
              sourceFile: filePath.split('/').pop()
            });
          });
        }
        
        // Add deadlines with priority info
        if (Array.isArray(extractedData.structuredContent.deadlines)) {
          extractedData.structuredContent.deadlines.forEach(deadline => {
            allDocumentContent.deadlines.push({
              ...deadline,
              source: 'pdf',
              sourceFile: filePath.split('/').pop()
            });
          });
        }
        
        // Add topics with importance ratings
        if (Array.isArray(extractedData.structuredContent.topics)) {
          extractedData.structuredContent.topics.forEach(topic => {
            allDocumentContent.topics.push({
              ...topic,
              source: 'pdf',
              sourceFile: filePath.split('/').pop()
            });
          });
        }
        
        // Add tasks and deliverables with proper null checks
        if (Array.isArray(extractedData.structuredContent.tasks)) {
          extractedData.structuredContent.tasks.forEach(task => {
            // No need to initialize tasks array, we did it at the beginning
            allDocumentContent.tasks.push({
              task,
              source: 'pdf',
              sourceFile: filePath.split('/').pop()
            });
          });
        }
        
        if (Array.isArray(extractedData.structuredContent.deliverables)) {
          extractedData.structuredContent.deliverables.forEach(deliverable => {
            // No need to initialize deliverables array, we did it at the beginning
            allDocumentContent.deliverables.push({
              deliverable,
              source: 'pdf',
              sourceFile: filePath.split('/').pop()
            });
          });
        }
      }
      
      // Add assignments from raw extraction with enrichment
      if (Array.isArray(extractedData.assignments)) {
        extractedData.assignments.forEach(assignment => {
          const isDuplicate = allDocumentContent.assignments.some(
            a => a.title === assignment.title || 
                (a.dueDate && assignment.details.dueDate && a.dueDate === assignment.details.dueDate)
          );
          
          if (!isDuplicate) {
            allDocumentContent.assignments.push({
              title: assignment.title,
              type: assignment.type,
              dueDate: assignment.details.dueDate,
              weight: assignment.details.weight,
              wordCount: assignment.details.wordCount,
              pageCount: assignment.details.pageCount,
              groupWork: assignment.details.groupWork,
              estimatedHours: assignment.details.estimatedHours,
              requirements: assignment.details.requirements,
              deliverables: assignment.details.deliverables,
              description: extractDescription(assignment.details.requirements?.join(' ') || ''),
              objectives: assignment.details.learningObjectives || [],
              topics: assignment.details.topics || [],
              complexity: assignment.complexity || 3,
              source: 'pdf',
              sourceFile: filePath.split('/').pop()
            });
          }
        });
      }

      if (extractedData?.syllabus?.courseTitle && !allDocumentContent.metadata.courseTitle) {
        allDocumentContent.metadata.courseTitle = extractedData.syllabus.courseTitle;
      }
      if (extractedData?.syllabus?.courseCode && !allDocumentContent.metadata.courseCode) {
        allDocumentContent.metadata.courseCode = extractedData.syllabus.courseCode;
      }
      if (extractedData?.syllabus?.instructor && !allDocumentContent.metadata.instructor) {
        allDocumentContent.metadata.instructor = extractedData.syllabus.instructor;
      }
      if (extractedData?.syllabus?.semester && !allDocumentContent.metadata.semester) {
        allDocumentContent.metadata.semester = extractedData.syllabus.semester;
      }

      processedFiles.push({
        name: fileInfo.name,
        courseCode: fileInfo.courseCode,
        data: extractedData,
        documentType: fileInfo.documentType || 'assignment'
      });
    }

    console.log('Extracted comprehensive data from all PDFs:', {
      numberOfAssignments: allDocumentContent.assignments.length,
      numberOfTopics: allDocumentContent.topics.length,
      numberOfDeadlines: allDocumentContent.deadlines.length,
      numberOfTasks: allDocumentContent.tasks ? allDocumentContent.tasks.length : 0,
      numberOfDeliverables: allDocumentContent.deliverables ? allDocumentContent.deliverables.length : 0,
      numberOfFiles: filePaths.length,
      courseCode: allDocumentContent.metadata.courseCode || 'none'
    });

    const classSchedule = options?.classSchedule || [];
    
    const taggedClassSchedule = classSchedule.map(cls => ({
      ...cls,
      documentType: 'class'
    }));

    console.log('Generating optimized human-friendly schedule with user preferences and class schedule'); 
    
    // Pass all the extracted metadata to the schedule generator
    const schedule = generateSchedule(
      allDocumentContent.assignments, 
      allDocumentContent.dates, 
      userId, 
      { 
        ...allDocumentContent.metadata, 
        topics: allDocumentContent.topics,
        deadlines: allDocumentContent.deadlines,
        tasks: allDocumentContent.tasks || [],
        deliverables: allDocumentContent.deliverables || [],
        userPreferences: { ...(options?.preferences || {}), classSchedule: taggedClassSchedule }
      }
    );

    // Make sure schedule is an array before accessing its properties
    if (!Array.isArray(schedule) || schedule.length === 0) {
      console.log('No schedule items were generated');
      return [];
    }

    console.log('Enhanced student-friendly schedule generated:', {
      numberOfEvents: schedule.length,
      firstEventType: schedule[0]?.category
    });

    // Final processing of schedule items with source data
    const enhancedSchedule = schedule.map(item => {
      // Find matching source file
      const sourceFileName = item.resource?.sourceFile;
      if (sourceFileName) {
        const sourceFile = processedFiles.find(f => f.name === sourceFileName);
        if (sourceFile) {
          // Extract the full text content for better context
          const fullText = sourceFile.data?.rawText || '';
          
          // Get relevant extracted tasks and deliverables
          const tasks = sourceFile.data?.structuredContent?.tasks || [];
          const deliverables = sourceFile.data?.structuredContent?.deliverables || [];
          
          // Attach all the detailed data to the schedule item
          return {
            ...item,
            pdfDetails: {
              fileName: sourceFile.name,
              courseCode: sourceFile.courseCode || item.courseCode,
              extractedText: sourceFile.data && sourceFile.data.rawText ? 
                sourceFile.data.rawText : 
                'No text extracted'
            },
            resource: {
              ...item.resource,
              taskDetails: {
                tasks,
                deliverables
              },
              assignmentData: sourceFile.data?.assignmentDetails?.find(
                a => a.title === item.title || (item.resource?.assignmentTitle === a.title)
              ),
              sourceDetails: {
                fileName: sourceFile.name,
                courseCode: sourceFile.courseCode
              }
            }
          };
        }
      }
      return item;
    });
    
    // Save schedule to file storage
    const metadata = {
      title: options.title || `Schedule generated from ${filePaths.length} documents`,
      courseCode: allDocumentContent.metadata.courseCode || '',
      fileCount: filePaths.length,
      fileNames: processedFiles.map(f => f.name),
      preferences: options.preferences || {}
    };
    
    // Try to save the schedule to file storage system
    try {
      const saveResult = saveSchedule(userId, enhancedSchedule, metadata);
      console.log('Schedule saved to file storage:', saveResult);
      
      // Add schedule ID to each item for reference
      enhancedSchedule.forEach(item => {
        item.scheduleId = saveResult.scheduleId;
      });
    } catch (storageError) {
      console.error('Error saving schedule to file storage:', storageError);
      // Continue anyway, the schedule will still be returned to the client
    }
    
    // Clean up temp files
    try {
      for (const filePath of filePaths) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {
      console.error('Warning: Error cleaning up temp files:', cleanupError);
    }

    return enhancedSchedule;
  } catch (error) {
    console.error('Error processing PDFs:', error);
    try {
      for (const filePath of filePaths) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (cleanupError) {
      console.error('Error cleaning up after processing failure:', cleanupError);
    }
    throw new Error('Failed to process PDF documents: ' + error.message);
  }
}

/**
 * Check if a line is likely to be a header
 * @param {string} text - The line text to check
 * @param {number} index - Current line index
 * @param {string[]} allLines - All lines in the document
 * @returns {boolean} - True if the line is likely a header
 */
function isHeaderLine(text, index, allLines) {
  const isAllCaps = text === text.toUpperCase() && text.length > 3;
  const hasSectionPrefix = /^(?:SECTION|PART|CHAPTER|UNIT)\s+\d+/i.test(text);
  const hasNumberingPrefix = /^\d+[\.\)]\s+[A-Z]/.test(text);
  const hasAssignmentPrefix = /^(?:Assignment|Task|Project)\s+\d+/i.test(text);
  
  const nextLine = index < allLines.length - 1 ? allLines[index + 1] : '';
  const isPreviousLineEmpty = index > 0 ? !allLines[index - 1].trim() : true;
  
  const isShortLine = text.length > 0 && text.length < 100;
  
  const hasFormattingChars = /[=\-_*]{3,}/.test(text);
  
  return (isAllCaps || hasSectionPrefix || hasNumberingPrefix || hasAssignmentPrefix || hasFormattingChars) && 
         isShortLine && 
         (isPreviousLineEmpty || index === 0 || hasFormattingChars);
}

/**
 * Check if a line contains assignment information
 * @param {string} text - Line to check
 * @returns {boolean} - True if contains assignment info
 */
function isAssignmentLine(text) {
  return /\b(?:assignment|homework|project|task|submission|deliverable|due|deadline)\b/i.test(text);
}

/**
 * Check if a line contains date information
 * @param {string} text - Line to check
 * @returns {boolean} - True if contains date info
 */
function isDateLine(text) {
  return /\b(?:date|due|deadline|submit|submission)\b|(?:\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i.test(text);
}

/**
 * Check if a line contains a topic reference
 * @param {string} text - Line to check
 * @returns {boolean} - True if contains topic
 */
function isTopicLine(text) {
  return /\b(?:topic|subject|theme|area)\b/i.test(text);
}

/**
 * Calculate topic importance based on context
 * @param {string} topicTitle - The topic title
 * @param {string} context - Topic context
 * @returns {number} - Importance score from 0-1
 */
function calculateTopicImportance(topicTitle, context) {
  // Simple implementation - could be enhanced with NLP
  let score = 0.5; // Default medium importance
  
  // Check for emphasis indicators
  if (/\b(?:important|critical|key|essential|fundamental|crucial|significant)\b/i.test(context)) {
    score += 0.3;
  }
  
  // Check for exam or assessment relationships
  if (/\b(?:exam|test|quiz|assessment|graded|evaluated)\b/i.test(context)) {
    score += 0.2;
  }
  
  // Cap the score between 0 and 1
  return Math.min(1, Math.max(0, score));
}

/**
 * Extract dates from text content
 * @param {string} text - Raw text from PDF
 * @returns {Array} Array of date objects with context
 */
function extractDatesFromText(text) {
  // Implementation moved to separate function
  return [];
}

/**
 * Extract title from text and context
 * @param {string} text - Line of text
 * @param {string} context - Surrounding context
 * @returns {string} - Extracted title
 */
function extractTitle(text, context) {
  // Try to find a title pattern in the line
  const titlePatterns = [
    /(?:assignment|homework|project)(?:\s+\d+)?(?:\s*[-:]\s*)([^.]+)/i,
    /(?:title|subject|topic)\s*[:]\s*([^.]+)/i,
    /^([A-Z][^.]+)\s*$/
  ];
  
  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 3) {
      return match[1].trim();
    }
  }
  
  // If not found in the direct text, look in the context
  if (context) {
    const contextTitlePatterns = [
      /(?:assignment|homework|project)(?:\s+\d+)?(?:\s*[-:]\s*)([^.\n]+)/i,
      /(?:title|subject|topic)\s*[:]\s*([^.\n]+)/i
    ];
    
    for (const pattern of contextTitlePatterns) {
      const match = context.match(pattern);
      if (match && match[1] && match[1].trim().length > 3) {
        return match[1].trim();
      }
    }
    
    // Try to use the first line of the context if nothing else works
    const firstLine = context.split('\n')[0];
    if (firstLine && firstLine.trim().length > 0 && firstLine.trim().length < 100) {
      return firstLine.trim();
    }
  }
  
  // Default title if nothing is found
  return "Untitled Assignment";
}

/**
 * Extract description from text content
 * @param {string} text - Text to analyze
 * @returns {string} - Extracted description
 */
function extractDescription(text) {
  if (!text) return '';
  
  // Look for description sections
  const descriptionPatterns = [
    /(?:description|overview|summary|introduction)\s*[:]\s*([^.]*(?:\.[^.]*){0,3})/i, // Up to 3 sentences after pattern
    /(?:^|\n)([A-Z][^.!?\n]*\.[^.!?\n]*\.[^.!?\n]*\.)/i // First 3 sentences
  ];
  
  for (const pattern of descriptionPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 10) {
      return match[1].trim();
    }
  }
  
  // If no description pattern found, use the first 200 characters
  if (text.length > 10) {
    return text.substring(0, Math.min(text.length, 200)).trim() + (text.length > 200 ? '...' : '');
  }
  
  return '';
}

/**
 * Extract learning objectives from text
 * @param {string} text - Text to analyze
 * @returns {string[]} - Array of learning objectives
 */
function extractObjectives(text) {
  if (!text) return [];
  
  const objectives = [];
  
  // Look for objectives sections
  const objectiveSectionPatterns = [
    /(?:learning\s+objectives|objectives|outcomes|goals|aims)\s*[:]\s*([^]*?)(?:\n\s*\n|\b(?:assessment|grading|requirements|tasks)\b)/i
  ];
  
  let objectiveSection = '';
  for (const pattern of objectiveSectionPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 10) {
      objectiveSection = match[1].trim();
      break;
    }
  }
  
  if (objectiveSection) {
    // Extract bullet points or numbered list items
    const bulletPattern = /(?:^|\n)\s*(?:[•\-*]|\d+\.)\s*([^\n]+)/g;
    let bulletMatch;
    
    while ((bulletMatch = bulletPattern.exec(objectiveSection)) !== null) {
      if (bulletMatch[1] && bulletMatch[1].trim().length > 5) {
        objectives.push(bulletMatch[1].trim());
      }
    }
    
    // If no bullet points found, try to extract sentences
    if (objectives.length === 0) {
      const sentences = objectiveSection.split(/[.!?]/).filter(s => s.trim().length > 10);
      for (const sentence of sentences) {
        if (sentence.trim().length > 10) {
          objectives.push(sentence.trim());
        }
      }
    }
  }
  
  return objectives;
}

/**
 * Calculate complexity of the content
 * @param {string} text - Text to analyze
 * @returns {number} - Complexity score (1-5)
 */
function calculateComplexity(text) {
  if (!text) return 3; // Default medium complexity
  
  let complexity = 3; // Start with medium complexity
  
  // Adjust based on text length - longer texts are often more complex
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 2000) complexity += 1;
  if (wordCount > 5000) complexity += 1;
  if (wordCount < 500) complexity -= 1;
  
  // Adjust based on advanced terminology
  const advancedTerms = [
    /\b(?:analyze|evaluate|synthesize|critique|implement|develop|research|investigate)\b/gi,
    /\b(?:algorithm|methodology|framework|paradigm|hypothesis|theoretical|conceptual)\b/gi,
    /\b(?:statistical|quantitative|qualitative|empirical|experimental|analytical)\b/gi
  ];
  
  let advancedTermCount = 0;
  for (const pattern of advancedTerms) {
    const matches = text.match(pattern);
    if (matches) advancedTermCount += matches.length;
  }
  
  if (advancedTermCount > 10) complexity += 1;
  if (advancedTermCount > 20) complexity += 1;
  if (advancedTermCount < 3) complexity -= 1;
  
  // Adjust based on code or mathematical content
  const technicalContent = [
    /\b(?:code|algorithm|function|class|object|variable|method)\b/gi,
    /\b(?:equation|formula|calculation|integral|derivative|vector|matrix)\b/gi,
    /\{\s*.*?;\s*\}/g, // Simple code block detection
    /\$.*?\$/g // Math formula detection
  ];
  
  let technicalContentCount = 0;
  for (const pattern of technicalContent) {
    const matches = text.match(pattern);
    if (matches) technicalContentCount += matches.length;
  }
  
  if (technicalContentCount > 5) complexity += 1;
  
  // Ensure complexity is between 1 and 5
  return Math.max(1, Math.min(5, complexity));
}

/**
 * Estimate hours needed to complete work based on text content
 * @param {string} text - Text to analyze
 * @returns {number} - Estimated hours
 */
function estimateWorkHours(text) {
  if (!text) return 3; // Default value
  
  // Base work hours on complexity and other factors
  let baseHours = calculateComplexity(text);
  
  // Adjust based on explicit mentions of time
  const timePatterns = [
    /(?:expected|estimated|approximate|approx\.)\s+(?:time|hours|duration)[:\s]+(\d+)/i,
    /(?:should|will|may)\s+take\s+(?:about|around|approximately)?\s+(\d+)\s+hours/i,
    /(\d+)\s+(?:hours|hrs)(?:\s+of\s+work)?/i
  ];
  
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const hours = parseInt(match[1]);
      if (!isNaN(hours) && hours > 0 && hours < 100) {
        return hours;
      }
    }
  }
  
  // Adjust for assignment type (if identifiable)
  if (/\b(?:essay|paper|report|research)\b/i.test(text)) {
    baseHours *= 1.5;
  } else if (/\b(?:presentation|project)\b/i.test(text)) {
    baseHours *= 1.2;
  } else if (/\b(?:quiz|test)\b/i.test(text)) {
    baseHours *= 0.7;
  }
  
  // Adjust for group work
  if (/\b(?:group|team|collaborate|together)\b/i.test(text)) {
    baseHours *= 1.3; // Group work often takes more time for coordination
  }
  
  // Round to nearest half hour
  return Math.round(baseHours * 2) / 2;
}

/**
 * Extract topics from the text content
 * @param {string} text - Text to analyze
 * @returns {string[]} - Array of topics
 */
function extractTopics(text) {
  if (!text) return [];
  
  const topics = [];
  
  // Look for explicit topic sections
  const topicSectionPatterns = [
    /(?:topics|subjects|areas|concepts|themes)\s*(?:covered|included|discussed)?[:\s]+([^]*?)(?:\n\s*\n|\b(?:assessment|grading|requirements|objectives)\b)/i
  ];
  
  let topicSection = '';
  for (const pattern of topicSectionPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 10) {
      topicSection = match[1].trim();
      break;
    }
  }
  
  if (topicSection) {
    // Extract bullet points or numbered list items
    const bulletPattern = /(?:^|\n)\s*(?:[•\-*]|\d+\.)\s*([^\n]+)/g;
    let bulletMatch;
    
    while ((bulletMatch = bulletPattern.exec(topicSection)) !== null) {
      if (bulletMatch[1] && bulletMatch[1].trim().length > 3) {
        topics.push(bulletMatch[1].trim());
      }
    }
    
    // If no bullet points found, try to extract short phrases
    if (topics.length === 0) {
      const phrases = topicSection.split(/[,;]/).filter(s => s.trim().length > 3 && s.trim().length < 50);
      for (const phrase of phrases) {
        if (phrase.trim().length > 3) {
          topics.push(phrase.trim());
        }
      }
    }
  }
  
  // If no topics found through sections, try to extract from full text using NLP-like approach
  if (topics.length === 0) {
    // Simple keyword extraction for common academic topics
    const topicKeywords = [
      /\b(?:machine learning|artificial intelligence|neural networks|deep learning)\b/gi,
      /\b(?:data structures|algorithms|computational complexity|optimization)\b/gi,
      /\b(?:web development|frontend|backend|user interface|API|RESTful)\b/gi,
      /\b(?:biology|chemistry|physics|mathematics|calculus|algebra|statistics)\b/gi,
      /\b(?:history|literature|philosophy|psychology|sociology|economics)\b/gi,
      /\b(?:business|marketing|management|finance|accounting|entrepreneurship)\b/gi
    ];
    
    for (const pattern of topicKeywords) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          if (!topics.includes(match)) {
            topics.push(match);
          }
        }
      }
    }
  }
  
  return topics.slice(0, 10); // Limit to 10 topics
}

