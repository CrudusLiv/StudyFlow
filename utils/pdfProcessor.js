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
 * Extract topics from the content
 * @param {string} text - Text to extract topics from
 * @returns {string[]} - Array of topics
 */
function extractTopics(text) {
  const topics = [];
  const topicPatterns = [
    /\b(?:Topic|Subject|Theme)s?(?:\s+covered|\s+include|\s+discussed)?(?:\s*:|include|covered|are)\s*([^.]+(?:\.|$))/i,
    /\b(?:This\s+(?:assignment|paper|project)\s+covers)\s+([^.]+(?:\.|$))/i,
    /\b(?:related\s+to|focus\s+on|about)\s+([^.]+(?:\.|$))/i,
    /\b(?:knowledge\s+of|understand)\s+([^.]+(?:\.|$))/i
  ];
  
  // Try to find explicit topic mentions first
  for (const pattern of topicPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Split by common delimiters and filter empty strings
      const topicList = match[1].split(/(?:,|;|and|\n|\r|\+)/);
      topicList.forEach(topic => {
        const cleanedTopic = topic.trim();
        if (cleanedTopic && cleanedTopic.length > 3 && !topics.includes(cleanedTopic)) {
          topics.push(cleanedTopic);
        }
      });
    }
  }
  
  // If no topics found from explicit mentions, try to extract important phrases
  if (topics.length === 0) {
    // Look for phrases that are likely topics (nouns with optional adjectives)
    const phraseMatches = text.match(/\b[A-Z][a-z]+(?:\s+[a-z]+){1,3}\b/g) || [];
    
    // Keep only unique phrases with reasonable length
    const uniquePhrases = [...new Set(phraseMatches)];
    uniquePhrases.forEach(phrase => {
      // Filter out common non-topic phrases
      if (phrase.length > 6 && 
          !/\b(?:the|this|that|these|those|submission|deadline|due date|required|assignment)\b/i.test(phrase)) {
        topics.push(phrase);
      }
    });
    
    // Limit to top 5 topics if more were found
    if (topics.length > 5) {
      topics.splice(5);
    }
  }
  
  return topics;
}

/**
 * Extract learning objectives from text
 * @param {string} text - Text to analyze
 * @returns {string[]} - List of learning objectives
 */
function extractObjectives(text) {
  const objectives = [];
  
  // Check if there's a learning objectives section
  const objectivesSection = text.match(/(?:learning\s+objectives|objectives|goals|outcomes|(?:you\s+will\s+learn|students\s+will\s+learn|by\s+the\s+end))(?:\s+include|\s+are)?(?:\s*:|\s*-|\s*–|\n)([\s\S]+?)(?=\n\s*\n|\n\s*[A-Z]|$)/i);
  
  if (objectivesSection && objectivesSection[1]) {
    // Split by bullet points, numbers, or new lines
    const lines = objectivesSection[1].split(/(?:\n•|\n\d+\.|\n-|\n)/);
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.length > 10) {
        objectives.push(trimmed);
      }
    });
  }
  
  // If still no objectives, look for sentences starting with action verbs common in learning objectives
  if (objectives.length === 0) {
    const actionVerbPattern = /\b(?:understand|learn|analyze|evaluate|create|apply|identify|describe|explain|compare|discuss|demonstrate|develop|design|implement)\b\s+[^.!?]+[.!?]/gi;
    const verbMatches = text.match(actionVerbPattern) || [];
    
    verbMatches.forEach(match => {
      if (match.length > 15 && match.length < 150) {
        objectives.push(match.trim());
      }
    });
    
    // Limit to top 3 objectives if more were found
    if (objectives.length > 3) {
      objectives.splice(3);
    }
  }
  
  return objectives;
}

/**
 * Calculate topic importance based on content analysis
 * @param {string} topic - Topic text
 * @param {string} context - Surrounding context
 * @returns {number} - Importance score 1-10
 */
function calculateTopicImportance(topic, context) {
  let score = 5; // Default middle importance
  
  // Increase score based on emphasis indicators
  if (/important|critical|essential|key|main|primary|focus|significant/i.test(context)) {
    score += 2;
  }
  
  // Increase score based on proximity to grading criteria
  if (/grade|mark|assessment|evaluation|rubric/i.test(context)) {
    score += 1;
  }
  
  // Increase score based on repetition of the topic
  const topicMentions = (context.match(new RegExp(topic, 'gi')) || []).length;
  score += Math.min(2, topicMentions / 2);
  
  // Cap at 10
  return Math.min(10, score);
}

/**
 * Extract detailed assignment information
 * @param {string} lineText - The line containing assignment information
 * @param {string} context - Surrounding text context
 * @returns {Object} Extracted assignment details
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
    learningObjectives: extractObjectives(context),
    description: extractDescription(context)
  };
}

/**
 * Extract rich assignment description
 * @param {string} text - The text to extract description from
 * @returns {string} - Extracted description
 */
function extractDescription(text) {
  const descMatch = text.match(/Description:?\s*([^.]+(?:\.[^.]+){0,5})/i);
  if (descMatch) return descMatch[1].trim();
  
  const titleMatch = text.match(/^([^\n.]+)[.\n]+(.*)/s);
  if (titleMatch && titleMatch[2]) {
    const sentences = titleMatch[2].split(/[.!?]\s+/).filter(s => s.trim().length > 0);
    return sentences.slice(0, Math.min(3, sentences.length)).join('. ') + '.';
  }
  
  return text.substring(0, Math.min(200, text.length)).trim().replace(/[.!?].*$/, '.') + '...';
}

/**
 * Extract date from text using multiple patterns
 * @param {string} text - Text to extract date from
 * @returns {string|null} - Extracted date or null
 */
function extractDate(text) {
  const patterns = [
    /(?:due|deadline|submit(?:ted)?)\s*(?:by|on|date|before)?[\s:]*([a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/i,
    /due\s*date\s*[:.-]\s*(\d{1,2})(?:st|nd|rd|th)?\s*([a-z]+)\s*\d{4}/i,
    /(?:due|deadline|submission)\s*(?:date|on)?[\s:]*\s*(\d{1,2})(?:st|nd|rd|th)?\s*([a-z]+)\s*\d{4}/i,
    /(?:due|deadline|submission|submit).*?(?:is|will be|on|by)[\s:]*([a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/i,
    /(?:date|due|deadline)\s*[:.-]\s*(\d{1,2})(?:st|nd|rd|th)?\s*([a-z]+)\s*\d{4}/i,
    /recommended\s*completion\s*[:.-]\s*(\d{1,2})(?:st|nd|rd|th)?\s*([a-z]+)\s*\d{4}/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[1] && match[2] && /^[a-z]+$/i.test(match[2])) {
        const day = match[1].replace(/(?:st|nd|rd|th)/, '');
        const month = match[2];
        const yearMatch = text.match(new RegExp(`${month}\\s*(\\d{4})`, 'i'));
        if (yearMatch && yearMatch[1]) {
          const year = yearMatch[1];
          const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                             'july', 'august', 'september', 'october', 'november', 'december'];
          const monthIndex = monthNames.findIndex(m => 
            month.toLowerCase().includes(m.toLowerCase()));
          
          if (monthIndex !== -1) {
            const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return dateStr;
          }
        }
      }
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Extract assignment weight (percentage or points)
 * @param {string} text - Text to extract weight from
 * @returns {number|null} - Weight percentage or null
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
 * @param {string} text - Text to extract word count from
 * @returns {number|null} - Word count or null
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
        return Math.floor((parseInt(match[1]) + parseInt(match[2])) / 2);
      }
      return parseInt(match[1]);
    }
  }
  return null;
}

/**
 * Extract page count requirements
 * @param {string} text - Text to extract page count from
 * @returns {number|null} - Page count or null
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
        return Math.floor((parseInt(match[1]) + parseInt(match[2])) / 2);
      }
      return parseInt(match[1]);
    }
  }
  return null;
}

/**
 * Determine if assignment is group work
 * @param {string} text - Text to analyze
 * @returns {boolean} - True if group work
 */
function isGroupWork(text) {
  return /\b(?:group|team|collaborate|partnership)\b/i.test(text);
}

/**
 * Extract task requirements
 * @param {string} text - Text to extract requirements from
 * @returns {string[]} - Array of requirements
 */
function extractRequirements(text) {
  const requirements = [];
  const sections = text.split(/\n+/);
  let inRequirements = false;

  for (const section of sections) {
    if (/\b(?:requirements?|specifications?|tasks?|instructions?|what\s+to\s+do)\b/i.test(section)) {
      inRequirements = true;
      continue;
    }

    if (inRequirements && /^[\s•\-\d\.*]\s*\w+/.test(section)) {
      const requirement = section.replace(/^[\s•\-\d\.*]\s*/, '').trim();
      if (requirement) {
        requirements.push(requirement);
      }
    }

    if (inRequirements && /^(?:submission|delivery|deadline|grading|marking)/i.test(section)) {
      inRequirements = false;
    }
  }

  return requirements;
}

/**
 * Extract deliverables list
 * @param {string} text - Text to extract deliverables from
 * @returns {string[]} - Array of deliverables
 */
function extractDeliverables(text) {
  const deliverables = [];
  const sections = text.split(/\n+/);
  let inDeliverables = false;

  for (const section of sections) {
    if (/\b(?:deliverables?|submit|submission|provide|include|hand\s+in)\b/i.test(section)) {
      inDeliverables = true;
      continue;
    }

    if (inDeliverables && /^[\s•\-\d\.*]\s*\w+/.test(section)) {
      const deliverable = section.replace(/^[\s•\-\d\.*]\s*/, '').trim();
      if (deliverable) {
        deliverables.push(deliverable);
      }
    }

    if (inDeliverables && /^(?:grading|marking|requirements?|assessment)/i.test(section)) {
      inDeliverables = false;
    }
  }

  return deliverables;
}

/**
 * Calculate complexity score for assignment
 * @param {string} text - Text to analyze
 * @returns {number} - Complexity score 1-10
 */
function calculateComplexity(text) {
  let complexity = 1;
  const complexityKeywords = [
    'research', 'analysis', 'analyze', 'evaluate', 'critical', 
    'complex', 'comprehensive', 'develop', 'create', 'design',
    'implementation', 'challenging', 'advanced', 'in-depth'
  ];
  
  const lowerText = text.toLowerCase();
  
  complexityKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = text.match(regex) || [];
    complexity += matches.length * 0.5;
  });
  
  const wordCountMatch = lowerText.match(/(\d+)(?:\s*-\s*(\d+))?\s*words/i);
  if (wordCountMatch) {
    const wordCount = parseInt(wordCountMatch[1]);
    if (!isNaN(wordCount)) {
      if (wordCount > 3000) complexity += 3;
      else if (wordCount > 2000) complexity += 2;
      else if (wordCount > 1000) complexity += 1;
    }
  }
  
  const pageCountMatch = lowerText.match(/(\d+)(?:\s*-\s*(\d+))?\s*pages/i);
  if (pageCountMatch) {
    const pageCount = parseInt(pageCountMatch[1]);
    if (!isNaN(pageCount)) {
      if (pageCount > 10) complexity += 3;
      else if (pageCount > 5) complexity += 2;
      else if (pageCount > 2) complexity += 1;
    }
  }
  
  return Math.min(10, complexity);
}

/**
 * Estimate work hours based on content analysis
 * @param {string} text - Text to analyze
 * @returns {number} - Estimated work hours
 */
function estimateWorkHours(text) {
  let baseHours = 2;
  const lowerText = text.toLowerCase();
  
  if (/\b(?:report|paper|essay|write-up)\b/i.test(lowerText)) baseHours = 4;
  if (/\b(?:research|analysis)\b/i.test(lowerText)) baseHours = 5;
  if (/\b(?:presentation|slides)\b/i.test(lowerText)) baseHours = 3;
  if (/\b(?:project|implementation)\b/i.test(lowerText)) baseHours = 6;
  
  const wordCountMatch = lowerText.match(/(\d+)(?:\s*-\s*(\d+))?\s*words/i);
  if (wordCountMatch) {
    let wordCount;
    if (wordCountMatch[2]) {
      wordCount = (parseInt(wordCountMatch[1]) + parseInt(wordCountMatch[2])) / 2;
    } else {
      wordCount = parseInt(wordCountMatch[1]);
    }
    baseHours += wordCount / 500;
  }
  
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
  
  baseHours += keywordCount * 0.5;
  
  if (/\b(?:group|team|collaborate)\b/i.test(lowerText)) {
    baseHours *= 0.7;
  }
  
  return Math.max(1, Math.round(baseHours));
}

/**
 * Determine the type of assignment
 * @param {string} lineText - Line with assignment information
 * @param {string} context - Text context
 * @returns {string} - Assignment type
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
 * @param {string} lineText - Line with title information
 * @param {string} context - Text context
 * @returns {string} - Extracted title
 */
function extractTitle(lineText, context) {
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
  
  const firstSentence = context.split(/[.!?][\s\n]/)[0].trim();
  if (firstSentence.length < 100) {
    return firstSentence;
  }
  
  return lineText.trim();
}

/**
 * Extract dates with contextual information
 * @param {string} text - Text to extract dates from
 * @returns {Array} - Array of date objects with context
 */
function extractDatesWithContext(text) {
  const dateMatches = [];
  const datePatterns = [
    /(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/g,
    /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]+)(?:\s*,?\s*(\d{4}))?/g,
    /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/g
  ];

  datePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // Get context around the date (up to 100 chars before and after)
      const contextStart = Math.max(0, match.index - 100);
      const contextEnd = Math.min(text.length, match.index + match[0].length + 100);
      const context = text.substring(contextStart, contextEnd);
      
      // Determine if this is a deadline or exam date
      const isDeadline = /(?:due|deadline|submit|assignment)/i.test(context);
      const isExam = /(?:exam|test|quiz|midterm|final)/i.test(context);
      
      dateMatches.push({
        date: match[0],
        context: context,
        isDeadline: isDeadline,
        isExam: isExam,
        importance: isDeadline || isExam ? 'high' : 'medium'
      });
    }
  });

  return dateMatches;
}

/**
 * Extract deadlines from section and add to document content
 * @param {string} section - Section text
 * @param {Object} documentContent - Document content object to update
 */
function extractDeadlinesFromSection(section, documentContent) {
  const deadlinePatterns = [
    /(?:due|deadline|submission)\s*(?:date|on|by)?\s*:?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})/i,
    /(?:submit|turn\s+in|hand\s+in).*?(?:by|before|no\s+later\s+than)\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})/i
  ];

  deadlinePatterns.forEach(pattern => {
    const match = section.match(pattern);
    if (match && match[1]) {
      // Get 50 chars of context before the deadline
      const contextStart = Math.max(0, match.index - 50);
      const context = section.substring(contextStart, match.index + match[0].length);
      
      documentContent.structuredContent.deadlines.push({
        date: match[1],
        context: context,
        priority: determinePriority(section)
      });
    }
  });
}

/**
 * Determine priority based on text content
 * @param {string} text - Text to analyze
 * @returns {string} - Priority level (high, medium, low)
 */
function determinePriority(text) {
  const lowerText = text.toLowerCase();
  
  // Check for high priority indicators
  if (/\b(?:critical|essential|important|major|significant|urgent|immediate)\b/i.test(lowerText)) {
    return 'high';
  }
  
  // Check for low priority indicators
  if (/\b(?:minor|optional|suggested|recommended|if time permits|bonus)\b/i.test(lowerText)) {
    return 'low';
  }
  
  // Default to medium
  return 'medium';
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
      console.log(`Extracted data for file ${fileInfo.name}:`, {
        assignmentsFound: extractedData.structuredContent?.assignments?.length || 0,
        datesFound: extractedData.structuredContent?.dates?.length || 0,
        deadlinesFound: extractedData.structuredContent?.deadlines?.length || 0,
        topicsFound: extractedData.structuredContent?.topics?.length || 0
      });
      
      // Merge structured content with comprehensive metadata
      if (extractedData.structuredContent) {
        // Add assignments with assignment tag and detailed metadata
        if (Array.isArray(extractedData.structuredContent.assignments)) {
          extractedData.structuredContent.assignments.forEach(assignment => {
            allDocumentContent.assignments.push({
              ...assignment,
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
    }

    console.log('Extracted comprehensive data from all PDFs:', {
      numberOfAssignments: allDocumentContent.assignments.length,
      numberOfTopics: allDocumentContent.topics.length,
      numberOfDeadlines: allDocumentContent.deadlines.length,
      numberOfFiles: filePaths.length
    });

    const classSchedule = options.classSchedule || [];
    
    const taggedClassSchedule = classSchedule.map(cls => ({
      ...cls,
      documentType: 'class'
    }));

    console.log('Generating optimized human-friendly schedule with user preferences:', 
      JSON.stringify(Object.keys(options.preferences || {}))
    );
    
    const schedule = generateSchedule(
      allDocumentContent.assignments, 
      allDocumentContent.dates, 
      userId, 
      { 
        ...allDocumentContent.metadata, 
        topics: allDocumentContent.topics,
        deadlines: allDocumentContent.deadlines,
        userPreferences: { ...options.preferences, classSchedule: taggedClassSchedule }
      }
    );

    console.log('Enhanced student-friendly schedule generated:', {
      numberOfEvents: schedule.length,
      firstEventType: schedule[0]?.category
    });

    try {
      for (const filePath of filePaths) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {
      console.error('Warning: Error cleaning up temp files:', cleanupError);
    }

    return schedule;
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

