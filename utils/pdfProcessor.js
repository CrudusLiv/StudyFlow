import { getDocument } from 'pdfjs-dist/legacy/build/pdf.js';

/**
 * Process a PDF buffer and extract structured content
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<Object>} Extracted content object
 */
export async function processPDF(buffer) {
  try {
    const data = new Uint8Array(buffer);
    const loadingTask = getDocument({ data });
    const pdf = await loadingTask.promise;
    
    const content = {
      sections: [],
      assignments: [],
      metadata: { title: '' },
      rawText: ''
    };

    // Extract metadata
    const metadata = await pdf.getMetadata();
    content.metadata = {
      title: metadata.info?.Title || '',
      author: metadata.info?.Author || '',
      subject: metadata.info?.Subject || '',
      keywords: metadata.info?.Keywords?.split(',').map(k => k.trim()) || []
    };

    // Process each page
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items.map(item => ({
        text: item.str,
        fontSize: item.transform[0],
        y: item.transform[5],
        bold: item.transform[0] > 12
      }));

      let currentSection = '';
      pageText.forEach((item, idx) => {
        const text = item.text.trim();
        if (!text) return;

        fullText += text + ' ';

        if (item.bold || item.fontSize > 12) {
          if (text.length > 3 && text.length < 100) {
            content.sections.push({
              title: text,
              content: '',
              level: item.fontSize > 14 ? 1 : 2,
              pageNum: i
            });
            currentSection = text;
          }
        } 
        else if (isAssignmentText(text)) {
          const nextItems = pageText.slice(idx + 1, idx + 5);
          const description = nextItems.map(i => i.text).join(' ');
          const dueDateMatch = extractDueDate(description);
          
          content.assignments.push({
            title: text,
            description,
            dueDate: dueDateMatch ? new Date(dueDateMatch[1]) : undefined,
            estimatedHours: estimateWorkHours(description)
          });
        }
        else if (currentSection && content.sections.length > 0) {
          content.sections[content.sections.length - 1].content += text + ' ';
        }
      });
    }

    content.rawText = fullText.trim();
    return content;
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw new Error(`Failed to process PDF: ${error.message}`);
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
