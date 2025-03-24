import fs from 'fs';
import pdfParse from 'pdf-parse';
import { extractAssignments, extractDates, generateSchedule } from './textProcessing.js';

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
        topics: []
      }
    };

    // Text preprocessing to handle PDF formatting issues
    const cleanedText = preProcessText(text);
    
    // Split into logical sections for semantic understanding
    const sections = splitIntoSections(cleanedText);
    const lines = cleanedText.split('\n').filter(line => line.trim());
    
    // Deep analysis of document structure
    analyzeDocumentStructure(lines, sections, documentContent);
    
    console.log('Advanced extraction complete:', {
      courseCode: documentContent.syllabus.courseCode,
      assignmentsFound: documentContent.assignments.length,
      datesFound: documentContent.dates.length,
      topicsFound: documentContent.structuredContent.topics.length
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
          const assignmentDetails = extractAssignmentDetails(lineText, assignmentContext);
          
          documentContent.assignments.push({
            type: determineAssignmentType(lineText, assignmentContext),
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
    const dateMatches = extractDatesWithContext(section);
    documentContent.dates.push(...dateMatches);
    
    // Add to structured content
    documentContent.structuredContent.dates.push(...dateMatches);
    
    // Calculate semantic complexity for better study time estimates
    const complexity = calculateComplexity(section);
    documentContent.complexity += complexity;
    
    // Extract deadlines with contextual understanding
    if (/(?:due|deadline|submission|submit|assignment|homework|project)/i.test(section)) {
      extractDeadlinesFromSection(section, documentContent);
    }
  });
}

/**
 * Extract rich assignment description
 */
function extractDescription(text) {
  // Look for explicit description sections
  const descMatch = text.match(/Description:?\s*([^.]+(?:\.[^.]+){0,5})/i);
  if (descMatch) return descMatch[1].trim();
  
  // Look for text after the title
  const titleMatch = text.match(/^([^\n.]+)[.\n]+(.*)/s);
  if (titleMatch && titleMatch[2]) {
    // Return first 1-3 sentences as description
    const sentences = titleMatch[2].split(/[.!?]\s+/).filter(s => s.trim().length > 0);
    return sentences.slice(0, Math.min(3, sentences.length)).join('. ') + '.';
  }
  
  // Fallback to first 100-200 characters if no clear description found
  return text.substring(0, Math.min(200, text.length)).trim().replace(/[.!?].*$/, '.') + '...';
}

/**
 * Extract learning objectives from assignment text
 */
function extractObjectives(text) {
  const objectives = [];
  
  // Look for objective sections
  const objectiveSection = text.match(/(?:Objectives|Goals|Learning\s+Outcomes|You\s+will\s+learn)[:\s]+(.*?)(?:\n\n|\n[A-Z]|$)/is);
  
  if (objectiveSection) {
    // Split by bullet points or numbers
    const bulletPoints = objectiveSection[1].split(/\n\s*[•\-*]\s*|\n\s*\d+[\.)]\s*/);
    
    for (const point of bulletPoints) {
      const cleanPoint = point.trim();
      if (cleanPoint.length > 10) {
        objectives.push(cleanPoint);
      }
    }
  }
  
  // Look for action verbs that typically indicate objectives
  const actionVerbs = ['understand', 'learn', 'create', 'develop', 'design', 'analyze', 'evaluate', 'apply'];
  const sentences = text.split(/[.!?]\s+/);
  
  for (const sentence of sentences) {
    for (const verb of actionVerbs) {
      if (sentence.toLowerCase().includes(verb) && 
          !objectives.some(obj => obj.toLowerCase().includes(sentence.toLowerCase()))) {
        const cleanSentence = sentence.trim();
        if (cleanSentence.length > 15 && cleanSentence.length < 150) {
          objectives.push(cleanSentence);
        }
        break;
      }
    }
  }
  
  return objectives.slice(0, 5); // Return top 5 objectives
}

/**
 * Extract topics from assignment context
 */
function extractTopics(text) {
  const topics = [];
  const lowerText = text.toLowerCase();
  
  // Common academic topics (expandable list)
  const commonTopics = [
    'algebra', 'calculus', 'statistics', 'probability', 'geometry', 'analysis', 
    'programming', 'algorithms', 'data structures', 'databases', 'web development', 
    'machine learning', 'artificial intelligence', 'networking', 'security',
    'physics', 'mechanics', 'thermodynamics', 'electromagnetism', 'quantum', 
    'chemistry', 'organic chemistry', 'biochemistry', 'biology', 'genetics',
    'history', 'economics', 'psychology', 'sociology', 'literature'
  ];
  
  for (const topic of commonTopics) {
    if (lowerText.includes(topic)) {
      topics.push(topic);
    }
  }
  
  // Look for "topic" or "chapter" mentions
  const topicMatches = text.match(/(?:topic|chapter|subject|module)s?:?\s*([^.\n]+)/gi);
  if (topicMatches) {
    for (const match of topicMatches) {
      const topicText = match.replace(/(?:topic|chapter|subject|module)s?:?\s*/i, '').trim();
      if (topicText && topicText.length > 2 && !topics.includes(topicText)) {
        topics.push(topicText);
      }
    }
  }
  
  return topics;
}

/**
 * Calculate topic importance for study prioritization
 */
function calculateTopicImportance(topic, context) {
  let importance = 1; // Base importance
  
  // Check for emphasis indicators
  if (/important|critical|essential|key|fundamental|core/i.test(context)) {
    importance += 2;
  }
  
  // Check if topic appears in exam/test context
  if (/exam|test|quiz|assessment|grade/i.test(context)) {
    importance += 2;
  }
  
  // Check frequency of topic mentions
  const topicRegex = new RegExp(topic.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
  const matches = context.match(topicRegex) || [];
  importance += Math.min(3, matches.length); // Add up to 3 points for repeated mentions
  
  return Math.min(10, importance); // Cap at 10
}

/**
 * Check if line is about a topic
 */
function isTopicLine(text) {
  return /(?:topic|chapter|subject|module)\s*\d*\s*[:.-]?\s*/i.test(text);
}

/**
 * Check if line is related to assignments
 */
function isAssignmentLine(text) {
  return /assignment|homework|project|lab|task|quiz|exam/i.test(text);
}

/**
 * Check if line contains date information
 */
function isDateLine(text) {
  return /\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}/i.test(text);
}

/**
 * Extract dates with surrounding context for better understanding
 */
function extractDatesWithContext(text) {
  const results = [];
  const datePatterns = [
    // MM/DD/YYYY or DD/MM/YYYY
    /(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})/g,
    // Month DD, YYYY
    /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}/gi,
    // YYYY-MM-DD
    /(\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/g
  ];
  
  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // Get rich context around the date (50 chars before and after)
      const start = Math.max(0, match.index - 50);
      const end = Math.min(text.length, match.index + match[0].length + 50);
      const context = text.substring(start, end);
      
      // Semantic classification of date context
      const isDeadline = /due|deadline|submit|turn\s*in|before|by/i.test(context);
      const isExam = /exam|test|quiz|final/i.test(context);
      const isLecture = /lecture|class|session/i.test(context);
      
      results.push({
        date: match[0],
        context: context,
        isDeadline,
        isExam,
        isLecture,
        importance: isDeadline || isExam ? 'high' : (isLecture ? 'medium' : 'low')
      });
    }
  }
  
  return results;
}

/**
 * Extract detailed assignment information
 */
function extractAssignmentDetails(lineText, context) {
  return {
    dueDate: extractDate(context),
    weight: extractWeight(context),
    requirements: extractRequirements(context),
    deliverables: extractDeliverables(context),
    wordCount: extractWordCount(context),
    pageCount: extractPageCount(context),
    groupWork: isGroupWork(context),
    estimatedHours: estimateWorkHours(context),
    topics: extractTopics(context),
    learningObjectives: extractObjectives(context)
  };
}

/**
 * Determine if a line is likely to be a header
 */
function isHeaderLine(text, index, lines) {
  // Headers are typically shorter, in a specific format
  if (text.length > 150) return false;
  
  // Check if all uppercase or standard header format
  if (/^[A-Z0-9\s\-.:]{3,50}$/.test(text)) return true;
  
  // Check if numbered or bulleted format
  if (/^\d+\.\s+[A-Z]/.test(text) || /^[•\-*]\s+[A-Z]/.test(text)) return true;
  
  // Check if followed by an empty line (common for headers)
  const nextLine = index < lines.length - 1 ? lines[index + 1].trim() : '';
  if (nextLine === '' && text.length < 100) return true;
  
  return false;
}

/**
 * Extract deadlines from a section of text
 */
function extractDeadlinesFromSection(section, documentContent) {
  const patterns = [
    // Due date patterns
    /(?:due|deadline|submit by)[:.\s]*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/gi,
    // Submission deadline patterns
    /(?:assignment|homework|project)[\s\S]*?(?:due|deadline|submit by)[:.\s]*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/gi
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(section)) !== null) {
      const deadline = {
        date: match[1],
        context: section.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50)
      };
      
      documentContent.deadlines.push(deadline);
      documentContent.structuredContent.deadlines.push(deadline);
    }
  }
}

/**
 * Extract date from text using multiple patterns
 */
function extractDate(text) {
  const patterns = [
    // "Due by/on" followed by date
    /(?:due|deadline|submit(?:ted)?)\s*(?:by|on|date|before)?[\s:]*([a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/i,
    // Date at end of sentence mentioning due/deadline
    /(?:due|deadline|submission|submit).*?(?:is|will be|on|by)[\s:]*([a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

/**
 * Extract assignment weight (percentage or points)
 */
function extractWeight(text) {
  const weightPatterns = [
    /(?:worth|weight|value|contributes|counts\s+for)\s*:?\s*(\d+(?:\.\d+)?)%/i,
    /(\d+(?:\.\d+)?)%\s*(?:of|toward|of the|of your|of total)/i,
    /(\d+)\s*(?:marks|points)/i
  ];

  for (const pattern of weightPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      return isNaN(value) ? null : value;
    }
  }
  return null;
}

/**
 * Extract word count requirements
 */
function extractWordCount(text) {
  const wordCountPatterns = [
    /(\d+)(?:\s*-\s*(\d+))?\s*words?/i,
    /word\s*(?:count|limit)(?:\s*:|\s+of)?\s*(\d+)(?:\s*-\s*(\d+))?/i,
    /between\s*(\d+)\s*and\s*(\d+)\s*words/i
  ];
  
  for (const pattern of wordCountPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) {
        // If it's a range, use the average
        return Math.floor((parseInt(match[1]) + parseInt(match[2])) / 2);
      }
      return parseInt(match[1]);
    }
  }
  return null;
}

/**
 * Extract page count requirements
 */
function extractPageCount(text) {
  const pageCountPatterns = [
    /(\d+)(?:\s*-\s*(\d+))?\s*pages?/i,
    /page\s*(?:count|limit)(?:\s*:|\s+of)?\s*(\d+)(?:\s*-\s*(\d+))?/i,
    /between\s*(\d+)\s*and\s*(\d+)\s*pages/i
  ];
  
  for (const pattern of pageCountPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) {
        // If it's a range, use the average
        return Math.floor((parseInt(match[1]) + parseInt(match[2])) / 2);
      }
      return parseInt(match[1]);
    }
  }
  return null;
}

/**
 * Determine if assignment is group work
 */
function isGroupWork(text) {
  return /\b(?:group|team|collaborate|partnership)\b/i.test(text);
}

/**
 * Extract task requirements
 */
function extractRequirements(text) {
  const requirements = [];
  const sections = text.split(/\n+/);
  let inRequirements = false;

  for (const section of sections) {
    // Check if this section starts requirements
    if (/\b(?:requirements?|specifications?|tasks?|instructions?|what\s+to\s+do)\b/i.test(section)) {
      inRequirements = true;
      continue;
    }

    // If we're in a requirements section and line has bullet/number format
    if (inRequirements && /^[\s•\-\d\.*]\s*\w+/.test(section)) {
      const requirement = section.replace(/^[\s•\-\d\.*]\s*/, '').trim();
      if (requirement) {
        requirements.push(requirement);
      }
    }

    // Stop collecting if we hit another section
    if (inRequirements && /^(?:submission|delivery|deadline|grading|marking)/i.test(section)) {
      inRequirements = false;
    }
  }

  return requirements;
}

/**
 * Extract deliverables list
 */
function extractDeliverables(text) {
  const deliverables = [];
  const sections = text.split(/\n+/);
  let inDeliverables = false;

  for (const section of sections) {
    // Check if this section starts deliverables
    if (/\b(?:deliverables?|submit|submission|provide|include|hand\s+in)\b/i.test(section)) {
      inDeliverables = true;
      continue;
    }

    // If we're in deliverables section and line has bullet/number format
    if (inDeliverables && /^[\s•\-\d\.*]\s*\w+/.test(section)) {
      const deliverable = section.replace(/^[\s•\-\d\.*]\s*/, '').trim();
      if (deliverable) {
        deliverables.push(deliverable);
      }
    }

    // Stop collecting if we hit another section
    if (inDeliverables && /^(?:grading|marking|requirements?|assessment)/i.test(section)) {
      inDeliverables = false;
    }
  }

  return deliverables;
}

/**
 * Calculate complexity score for assignment
 */
function calculateComplexity(text) {
  let complexity = 1; // Base complexity
  
  // Complexity indicators in text
  const complexityKeywords = [
    'research', 'analysis', 'analyze', 'evaluate', 'critical', 
    'complex', 'comprehensive', 'develop', 'create', 'design',
    'implementation', 'challenging', 'advanced', 'in-depth'
  ];
  
  const lowerText = text.toLowerCase();
  
  // Count keywords
  complexityKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = text.match(regex) || [];
    complexity += matches.length * 0.5;
  });
  
  // Adjust for word count
  const wordCountMatch = lowerText.match(/(\d+)(?:\s*-\s*(\d+))?\s*words/i);
  if (wordCountMatch) {
    const wordCount = parseInt(wordCountMatch[1]);
    if (!isNaN(wordCount)) {
      if (wordCount > 3000) complexity += 3;
      else if (wordCount > 2000) complexity += 2;
      else if (wordCount > 1000) complexity += 1;
    }
  }
  
  // Adjust for page count
  const pageCountMatch = lowerText.match(/(\d+)(?:\s*-\s*(\d+))?\s*pages/i);
  if (pageCountMatch) {
    const pageCount = parseInt(pageCountMatch[1]);
    if (!isNaN(pageCount)) {
      if (pageCount > 10) complexity += 3;
      else if (pageCount > 5) complexity += 2;
      else if (pageCount > 2) complexity += 1;
    }
  }
  
  return Math.min(10, complexity); // Cap at 10
}

/**
 * Estimate work hours based on content analysis
 */
function estimateWorkHours(text) {
  // Base hours depending on assignment type
  let baseHours = 2;
  const lowerText = text.toLowerCase();
  
  // Adjust based on assignment type
  if (/\b(?:report|paper|essay|write-up)\b/i.test(lowerText)) baseHours = 4;
  if (/\b(?:research|analysis)\b/i.test(lowerText)) baseHours = 5;
  if (/\b(?:presentation|slides)\b/i.test(lowerText)) baseHours = 3;
  if (/\b(?:project|implementation)\b/i.test(lowerText)) baseHours = 6;
  
  // Adjust for word count
  const wordCountMatch = lowerText.match(/(\d+)(?:\s*-\s*(\d+))?\s*words/i);
  if (wordCountMatch) {
    let wordCount;
    if (wordCountMatch[2]) {
      // If it's a range, use the average
      wordCount = (parseInt(wordCountMatch[1]) + parseInt(wordCountMatch[2])) / 2;
    } else {
      wordCount = parseInt(wordCountMatch[1]);
    }
    baseHours += wordCount / 500; // Add 1 hour per 500 words
  }
  
  // Adjust for complexity keywords
  const complexityKeywords = [
    'research', 'analysis', 'analyze', 'evaluate', 'critical', 
    'complex', 'comprehensive', 'develop', 'create', 'design',
    'implementation', 'challenging', 'advanced', 'in-depth'
  ];
  
  let keywordCount = 0;
  complexityKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = text.match(regex) || [];
    keywordCount += matches.length;
  });
  
  baseHours += keywordCount * 0.5; // Add 0.5 hours per complexity keyword
  
  // Reduce for group work
  if (/\b(?:group|team|collaborate)\b/i.test(lowerText)) {
    baseHours *= 0.7; // 30% less time for group work
  }
  
  return Math.max(1, Math.round(baseHours));
}

/**
 * Determine the type of assignment
 */
function determineAssignmentType(lineText, context) {
  const combinedText = `${lineText} ${context}`.toLowerCase();
  
  if (/\bessay\b/i.test(combinedText)) return 'essay';
  if (/\breport\b/i.test(combinedText)) return 'report';
  if (/\bproject\b/i.test(combinedText)) return 'project';
  if (/\bpresentation\b/i.test(combinedText)) return 'presentation';
  if (/\bquiz\b/i.test(combinedText)) return 'quiz';
  if (/\bexam\b/i.test(combinedText)) return 'exam';
  if (/\bhomework\b/i.test(combinedText)) return 'homework';
  if (/\blab\b/i.test(combinedText)) return 'lab';
  
  return 'assignment';
}

/**
 * Extract title from context
 */
function extractTitle(lineText, context) {
  // Try patterns for explicitly labeled titles
  const titlePatterns = [
    /Assignment\s*(?:#|\d+)?:\s*([^.!?\n]+)/i,
    /Title\s*:\s*([^.!?\n]+)/i,
    /Project\s*(?:#|\d+)?:\s*([^.!?\n]+)/i
  ];
  
  for (const pattern of titlePatterns) {
    const match = context.match(pattern);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
  }
  
  // If no explicit title, use the first sentence of the context
  const firstSentence = context.split(/[.!?][\s\n]/)[0].trim();
  if (firstSentence.length < 100) {
    return firstSentence;
  }
  
  // Fallback to the line text
  return lineText.trim();
}

/**
 * Process uploaded PDF documents and generate a study schedule
 * @param {string[]} filePaths - Array of paths to uploaded PDF files
 * @param {string} userId - User ID for personalization
 * @param {Object} options - Additional options like user preferences
 * @returns {Object[]} - Generated schedule
 */
export async function processDocuments(filePaths, userId, options = {}) {
  try {
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
      }
    };

    // Load user preferences with defaults
    const userPreferences = options.preferences || {
      studyHoursPerDay: 4,
      breakDuration: 15,
      weekendStudy: true,
      preferredStudyTimes: ['morning', 'evening'],
      preferredSessionLength: 2
    };

    // Process each document with proper assignment tagging
    for (const filePath of filePaths) {
      console.log('Processing file:', filePath);
      const dataBuffer = fs.readFileSync(filePath);
      
      // Tag the document as an assignment
      const fileInfo = {
        path: filePath,
        name: filePath.split('/').pop(),
        documentType: 'assignment'
      };

      // Use enhanced PDF processor for rich data extraction
      const extractedData = await processPDF(dataBuffer, fileInfo);
      
      // Merge structured content with comprehensive metadata
      if (extractedData.structuredContent) {
        // Add assignments with assignment tag and detailed metadata
        extractedData.structuredContent.assignments.forEach(assignment => {
          allDocumentContent.assignments.push({
            ...assignment,
            source: 'pdf',
            documentType: 'assignment',
            sourceFile: filePath.split('/').pop()
          });
        });
        
        // Add dates with context classification
        extractedData.structuredContent.dates.forEach(date => {
          allDocumentContent.dates.push({
            ...date,
            source: 'pdf',
            sourceFile: filePath.split('/').pop()
          });
        });
        
        // Add deadlines with priority info
        extractedData.structuredContent.deadlines.forEach(deadline => {
          allDocumentContent.deadlines.push({
            ...deadline,
            source: 'pdf',
            sourceFile: filePath.split('/').pop()
          });
        });
        
        // Add topics with importance ratings
        extractedData.structuredContent.topics.forEach(topic => {
          allDocumentContent.topics.push({
            ...topic,
            source: 'pdf',
            sourceFile: filePath.split('/').pop()
          });
        });
      }
      
      // Add assignments from raw extraction with enrichment
      extractedData.assignments.forEach(assignment => {
        // Check if this is a duplicate before adding
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

      // Use metadata if available with fallbacks
      if (!allDocumentContent.metadata.courseTitle && extractedData.syllabus?.courseTitle) {
        allDocumentContent.metadata.courseTitle = extractedData.syllabus.courseTitle;
      }
      if (!allDocumentContent.metadata.courseCode && extractedData.syllabus?.courseCode) {
        allDocumentContent.metadata.courseCode = extractedData.syllabus.courseCode;
      }
      if (!allDocumentContent.metadata.instructor && extractedData.syllabus?.instructor) {
        allDocumentContent.metadata.instructor = extractedData.syllabus.instructor;
      }
      if (!allDocumentContent.metadata.semester && extractedData.syllabus?.semester) {
        allDocumentContent.metadata.semester = extractedData.syllabus.semester;
      }

      // Clean up temp file after processing
      fs.unlinkSync(filePath);
    }

    console.log('Extracted comprehensive data:', {
      numberOfAssignments: allDocumentContent.assignments.length,
      numberOfTopics: allDocumentContent.topics.length,
      userPreferences: userPreferences
    });

    // Get class schedule with proper class tagging
    const classSchedule = options.classSchedule || [];
    
    // Tag each class entry with class type
    const taggedClassSchedule = classSchedule.map(cls => ({
      ...cls,
      documentType: 'class'
    }));

    // Generate optimized schedule with human-friendly pacing using preferences and class schedule
    console.log('Generating optimized human-friendly schedule with user preferences...');
    const schedule = generateSchedule(
      allDocumentContent.assignments, 
      allDocumentContent.dates, 
      userId, 
      { 
        ...allDocumentContent.metadata, 
        topics: allDocumentContent.topics,
        userPreferences: { ...userPreferences, classSchedule: taggedClassSchedule }
      }
    );

    console.log('Enhanced student-friendly schedule generated:', {
      numberOfEvents: schedule.length,
      firstEventType: schedule[0]?.category
    });

    return schedule;
  } catch (error) {
    console.error('Error processing PDFs:', error);
    throw new Error('Failed to process PDF documents');
  }
}

// ... other helper functions ...
