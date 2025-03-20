import pkg from 'pdfjs-dist/legacy/build/pdf.js';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { extractAssignments, extractDates, generateSchedule } from './textProcessing.js';

const { getDocument } = pkg;

/**
 * Process a PDF buffer and extract structured content
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<Object>} Extracted content object
 */
export async function processPDF(buffer) {
  try {
    console.log('Starting enhanced PDF processing with pdfjs...');
    const data = new Uint8Array(buffer);
    const loadingTask = getDocument({ data });
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded successfully. Total pages: ${pdf.numPages}`);

    let fullText = '';
    let currentSection = '';
    let structuredContent = {
      headers: [],
      sections: {},
      assignments: [],
      dates: [],
      deadlines: [],
      syllabus: {
        courseTitle: '',
        courseCode: '',
        instructor: '',
        term: '',
        officeHours: []
      }
    };

    // Process each page with enhanced text extraction
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processing page ${i}/${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      // First pass: group text by position to detect columns and paragraphs
      const textItems = [];
      const lineMap = new Map();

      textContent.items.forEach((item) => {
        const x = Math.round(item.transform[4]);
        const y = Math.round(item.transform[5]);
        const fontSize = Math.round(item.transform[0]);

        // Group by vertical position (lines)
        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }

        lineMap.get(y).push({
          text: item.str,
          x,
          y,
          fontSize,
          width: Math.round(viewport.width * (item.width / 1000))
        });

        textItems.push({
          text: item.str,
          x,
          y,
          fontSize,
          width: Math.round(viewport.width * (item.width / 1000))
        });
      });

      // Sort lines by vertical position (top to bottom)
      const sortedLineKeys = Array.from(lineMap.keys()).sort((a, b) => b - a);

      // Process each line
      let lastY = null;
      let lastFontSize = null;
      let paragraph = '';

      for (const y of sortedLineKeys) {
        const line = lineMap.get(y);

        // Sort items in line by horizontal position (left to right)
        line.sort((a, b) => a.x - b.x);

        // Combine items in line
        const lineText = line.map(item => item.text).join(' ').trim();

        if (lineText) {
          // Detect section headers (larger font or all caps)
          const isHeader = (line[0].fontSize > 12) ||
                          (lineText === lineText.toUpperCase() && lineText.length > 10);

          // Process previous paragraph if we hit a new section
          if (isHeader && paragraph) {
            analyzeTextBlock(paragraph, structuredContent);
            paragraph = '';

            // Store header
            structuredContent.headers.push({
              text: lineText,
              fontSize: line[0].fontSize,
              page: i
            });

            currentSection = lineText;
          } else {
            // Add to current paragraph
            paragraph += lineText + ' ';
          }

          // Also add to full text
          fullText += lineText + '\n';
        }

        lastY = y;
        lastFontSize = line[0].fontSize;
      }

      // Process any remaining paragraph
      if (paragraph) {
        analyzeTextBlock(paragraph, structuredContent);
      }

      console.log(`Page ${i} text sample:`, fullText.substring(0, 100) + '...');
    }

    // Look for assignments in each section
    Object.entries(structuredContent.sections).forEach(([section, content]) => {
      if (/assignments|projects|homework|schedule|due dates|deadlines|tasks/i.test(section)) {
        content.forEach(paragraph => {
          identifyAssignments(paragraph, structuredContent);
        });
      }
    });

    console.log('Extracted structured content:', {
      sectionCount: Object.keys(structuredContent.sections).length,
      headerCount: structuredContent.headers.length,
      assignmentCount: structuredContent.assignments.length,
      dateCount: structuredContent.dates.length,
      deadlineCount: structuredContent.deadlines.length
    });

    return {
      rawText: fullText.trim(),
      structuredContent,
      metadata: structuredContent.syllabus
    };
  } catch (error) {
    console.error('Error in enhanced PDF processing:', error);
    throw error;
  }
}

/**
 * Analyze text block for key information
 */
function analyzeTextBlock(text, structuredContent) {
  text = text.trim();
  if (!text) return;

  const lowerText = text.toLowerCase();

  // Extract course information
  if (/course|class|subject/i.test(lowerText)) {
    const courseCodeMatch = text.match(/([A-Z]{2,}\d{3,}[A-Z0-9]*)/);
    if (courseCodeMatch && !structuredContent.syllabus.courseCode) {
      structuredContent.syllabus.courseCode = courseCodeMatch[1];
    }

    // Try to extract course title
    if (!structuredContent.syllabus.courseTitle) {
      const titleMatch = text.match(/course(?:\s+title)?:?\s*([^.]+)/i);
      if (titleMatch) {
        structuredContent.syllabus.courseTitle = titleMatch[1].trim();
      }
    }
  }

  // Extract instructor information
  if (/instructor|professor|teacher|faculty/i.test(lowerText)) {
    const instructorMatch = text.match(/(?:instructor|professor|teacher):?\s*([^.,]+)/i);
    if (instructorMatch) {
      structuredContent.syllabus.instructor = instructorMatch[1].trim();
    }
  }

  // Extract term/semester information
  if (/term|semester|quarter|spring|fall|winter|summer/i.test(lowerText)) {
    const termMatch = text.match(/(?:term|semester|quarter):?\s*([^.,]+)/i) ||
                      text.match(/(spring|fall|winter|summer)\s+\d{4}/i);
    if (termMatch) {
      structuredContent.syllabus.term = termMatch[1].trim();
    }
  }

  // Extract dates
  const dateMatches = text.match(/\b(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{4})\b/gi);
  if (dateMatches) {
    structuredContent.dates.push(...dateMatches);

    // If dates appear with a deadline context, add to deadlines
    if (/due|deadline|submit|assignment/i.test(lowerText)) {
      structuredContent.deadlines.push({
        text: text.trim(),
        dates: dateMatches
      });
    }
  }

  // Extract office hours
  if (/office\s+hours/i.test(lowerText)) {
    const hourMatch = text.match(/office\s+hours:?\s*([^.]+)/i);
    if (hourMatch) {
      structuredContent.syllabus.officeHours.push(hourMatch[1].trim());
    }
  }

  // Store text in appropriate section
  if (structuredContent.headers.length > 0) {
    const latestHeader = structuredContent.headers[structuredContent.headers.length - 1].text;
    if (!structuredContent.sections[latestHeader]) {
      structuredContent.sections[latestHeader] = [];
    }
    structuredContent.sections[latestHeader].push(text);
  }
}

/**
 * Identify assignments in text
 */
function identifyAssignments(text, structuredContent) {
  // Common patterns for assignments
  const assignmentPatterns = [
    /assignment\s*(?:#|no\.?|number)?\s*\d+/i,
    /project\s*(?:#|no\.?|number)?\s*\d+/i,
    /homework\s*(?:#|no\.?|number)?\s*\d+/i,
    /task\s*(?:#|no\.?|number)?\s*\d+/i,
    /lab\s*(?:#|no\.?|number)?\s*\d+/i,
    /(?:final|midterm)\s+(?:project|paper|essay|report)/i,
    /\b(?:due|submit|deadline).*?\b(?:by|on|before).*?(?:\d{1,2}[-/.]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i
  ];

  // Check if text contains an assignment pattern
  const isAssignment = assignmentPatterns.some(pattern => pattern.test(text));

  if (isAssignment) {
    // Extract assignment title
    let title = '';
    for (const pattern of [
      /(?:assignment|project|homework|task|lab)\s*(?:#|no\.?|number)?\s*\d+:?\s*([^.]*)/i,
      /(?:final|midterm)\s+(?:project|paper|essay|report):?\s*([^.]*)/i
    ]) {
      const match = text.match(pattern);
      if (match && match[1]) {
        title = match[1].trim();
        break;
      }
    }

    if (!title) {
      // Fallback: use first sentence or first 50 chars
      title = text.split('.')[0];
      if (title.length > 50) title = title.substring(0, 50) + '...';
    }

    // Extract due date
    let dueDate = null;
    const dueDateMatch = text.match(/\b(?:due|submit|deadline).*?\b(?:by|on|before)\s*([^.]*)/i) ||
                         text.match(/due\s*(?:date)?:?\s*([^.]*)/i);

    if (dueDateMatch) {
      const dateInText = dueDateMatch[1].match(/\b(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{4})\b/gi);
      if (dateInText) {
        dueDate = dateInText[0];
      }
    }

    // Extract points or weight
    let weight = null;
    const pointsMatch = text.match(/\b(\d+)\s*(?:points|marks|pts)/i) ||
                        text.match(/\b(?:worth|value|weight).*?(\d+)%/i);
    if (pointsMatch) {
      weight = parseInt(pointsMatch[1]);
    }

    // Extract description
    let description = text;
    // Remove title if present in the description
    if (title && description.includes(title)) {
      description = description.replace(title, '');
    }
    // Remove date information
    if (dueDateMatch) {
      description = description.replace(dueDateMatch[0], '');
    }
    // Clean up remaining text
    description = description
      .replace(/^[^:]*:\s*/, '') // Remove prefix like "Assignment 1:"
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();

    structuredContent.assignments.push({
      title: title || 'Untitled Assignment',
      rawText: text,
      dueDate,
      weight,
      description,
      type: findKeyword(text)
    });
  }
}

/**
 * Find assignment type keyword
 */
function findKeyword(text) {
  const lowerText = text.toLowerCase();
  const keywords = {
    'essay': /essay|write|writing|written/,
    'report': /report|analysis|analyze|research paper/,
    'presentation': /presentation|slides|present|speech|talk/,
    'project': /project|build|create|develop|implement/,
    'exam': /exam|test|quiz|midterm|final/,
    'problem set': /problem set|exercises|questions|problems/
  };

  for (const [keyword, pattern] of Object.entries(keywords)) {
    if (pattern.test(lowerText)) return keyword;
  }

  return 'assignment';
}

/**
 * Process uploaded PDF documents and generate a study schedule
 * @param {string[]} filePaths - Array of paths to uploaded PDF files
 * @param {string} userId - User ID for personalization
 * @returns {Object[]} - Generated weekly schedule
 */
export async function processDocuments(filePaths, userId) {
  try {
    console.log('Starting document processing...', { numberOfFiles: filePaths.length });
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

    console.log('Generating optimized schedule...');
    const schedule = generateSchedule(assignments, dates, userId, allStructuredContent.metadata);

    console.log('Schedule generated:', {
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

/**
 * Check if text appears to be an assignment description
 * @param {string} text - Text to analyze
 * @returns {boolean} True if text looks like an assignment
 */
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

/**
 * Extract due date from text
 * @param {string} text - Text to search for due date
 * @returns {RegExpMatchArray|null} Match array if due date found
 */
function extractDueDate(text) {
  return text.match(
    /due\s*(?:by|on|:)?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{4})/i
  );
}

/**
 * Estimate work hours based on text complexity
 * @param {string} text - Assignment description
 * @returns {number} Estimated hours
 */
function estimateWorkHours(text) {
  const words = text.split(/\s+/).length;
  const complexity = (text.match(/analyze|research|create|develop|implement/gi) || []).length;
  const baseHours = Math.ceil(words / 100);
  const complexityHours = complexity * 2;

  return Math.max(1, Math.min(8, baseHours + complexityHours));
}
