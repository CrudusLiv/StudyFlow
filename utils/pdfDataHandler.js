/**
 * Utility functions for handling PDF data and ensuring it can be stored in the database
 */

/**
 * Safely process PDF extraction results for database storage
 * 
 * @param {Object} extractedData - The data extracted from PDF
 * @returns {Object} - Sanitized data ready for database storage
 */
export const sanitizePdfData = (extractedData) => {
  // Create a safe copy with default values
  const safeData = {
    courseCode: extractedData.courseCode || '',
    instructor: extractedData.instructor || '',
    semester: extractedData.semester || '',
    assignments: [],
    dates: [],
    topics: [],
    complexity: extractedData.complexity || 0
  };

  // Handle assignments - ensure they're stored as objects, not stringified
  if (extractedData.assignments) {
    try {
      // If assignments is a string (serialized JSON), parse it
      if (typeof extractedData.assignments === 'string') {
        safeData.assignments = JSON.parse(extractedData.assignments);
      } 
      // If it's already an array of objects, use it directly
      else if (Array.isArray(extractedData.assignments)) {
        safeData.assignments = extractedData.assignments;
      }
    } catch (e) {
      console.error('Error processing assignments data:', e);
      // If parsing fails, store as empty array
      safeData.assignments = [];
    }
  }

  // Similarly handle dates and topics
  if (Array.isArray(extractedData.dates)) {
    safeData.dates = extractedData.dates;
  }

  if (Array.isArray(extractedData.topics)) {
    safeData.topics = extractedData.topics;
  }

  return safeData;
};

/**
 * Validates that required fields are present in PDF document data
 * 
 * @param {Object} docData - Document data to validate
 * @returns {Object} - Result with isValid flag and any errors
 */
export const validatePdfDocumentData = (docData) => {
  const errors = [];
  
  if (!docData.userId) {
    errors.push('userId is required');
  }
  
  if (!docData.title) {
    errors.push('title is required');
  }
  
  if (!docData.fileName) {
    errors.push('fileName is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
