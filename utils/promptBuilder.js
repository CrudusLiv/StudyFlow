export function buildEnhancedPrompt(pdfContent, preferences, systemInfo) {
  return `Analyze the following PDF content and create a detailed study schedule. 
Extract specific tasks, deadlines, and requirements from the PDF content.

PDF CONTENT TO ANALYZE:
${pdfContent}

REQUIRED OUTPUT FORMAT:
{
  "weeklySchedule": [
    {
      "week": "Week 1",
      "days": [
        {
          "day": "Monday",
          "date": "YYYY-MM-DD",
          "tasks": [
            {
              "time": "HH:MM - HH:MM",
              "title": "SPECIFIC TASK FROM PDF",
              "details": "DETAILS FROM PDF",
              "status": "pending",
              "priority": "high|medium|low",
              "category": "study",
              "pdfReference": {
                "page": "PAGE NUMBER IF AVAILABLE",
                "quote": "RELEVANT QUOTE FROM PDF"
              }
            }
          ]
        }
      ]
    }
  ]
}

STRICT REQUIREMENTS:
1. Create exactly ${preferences.weeksAvailable || 4} weeks
2. Each task must be from the PDF content
3. Include specific details and quotes
4. Schedule between ${preferences.wakeTime} and ${preferences.sleepTime}
5. Break every ${preferences.breakFrequency} minutes
6. Prefer ${preferences.preferredTime} for complex tasks

Extract and schedule EVERY task mentioned in the PDF.`;
}
