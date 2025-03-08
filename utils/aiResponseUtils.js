/**
 * Extracts JSON content from raw AI response text that may include explanations
 * or markdown formatting
 * 
 * @param {string} rawResponse - The raw response from the AI
 * @returns {string} - Cleaned JSON string
 */
export function extractJsonFromResponse(rawResponse) {
  if (!rawResponse) return '';
  
  try {
    // Remove markdown code block indicators
    let cleaned = rawResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Find content between opening and closing curly braces (most outer pair)
    const jsonMatch = cleaned.match(/(\{[\s\S]*\})/);
    if (jsonMatch && jsonMatch[0]) {
      cleaned = jsonMatch[0];
    }
    
    // Remove any non-JSON text before opening brace
    const openBraceIndex = cleaned.indexOf('{');
    if (openBraceIndex > 0) {
      cleaned = cleaned.substring(openBraceIndex);
    }
    
    // Remove any non-JSON text after closing brace
    const closeBraceIndex = cleaned.lastIndexOf('}');
    if (closeBraceIndex < cleaned.length - 1) {
      cleaned = cleaned.substring(0, closeBraceIndex + 1);
    }
    
    // Validate that this is valid JSON
    JSON.parse(cleaned); // This will throw if invalid
    
    return cleaned;
  } catch (error) {
    console.error('Error extracting JSON from response:', error);
    throw new Error(`Failed to extract valid JSON: ${error.message}`);
  }
}

/**
 * Attempts multiple strategies to parse JSON from AI response
 * 
 * @param {string} rawResponse - The raw response from the AI
 * @returns {object} - Parsed JSON object
 */
export function parseAIResponse(rawResponse) {
  if (!rawResponse) {
    throw new Error('Empty response received');
  }
  
  try {
    // First try: Direct parse (maybe it's already valid JSON)
    try {
      return JSON.parse(rawResponse);
    } catch (e) {
      console.log('Direct JSON parse failed, trying extraction methods...');
    }
    
    // Second try: Extract JSON using regex
    const extractedJson = extractJsonFromResponse(rawResponse);
    return JSON.parse(extractedJson);
    
  } catch (error) {
    console.error('All parsing methods failed:', error);
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
}
