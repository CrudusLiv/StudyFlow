import axios from 'axios';

export const generateSchedule = async (tasks: any[], rawText: string = '', metadata: any = {}): Promise<string> => {
  try {
    console.log('Generating advanced schedule with cognitive optimization');
    const token = localStorage.getItem('token');
    
    // Get user preferences for better scheduling
    let userPreferences = {};
    try {
      const prefsString = localStorage.getItem('userPreferences');
      if (prefsString) {
        userPreferences = JSON.parse(prefsString);
        console.log('Using cached user preferences for cognitive optimization');
      }
    } catch (error) {
      console.warn('Could not retrieve user preferences, using defaults');
    }
    
    // Get class schedules for conflict avoidance
    let classSchedule = [];
    try {
      const classString = localStorage.getItem('scheduleRawClasses');
      if (classString) {
        classSchedule = JSON.parse(classString);
        console.log('Using cached class schedule for conflict avoidance');
      }
    } catch (error) {
      console.warn('Could not retrieve class schedule, proceeding without conflict checking');
    }
    
    // Prepare enhanced metadata for better scheduling
    const enhancedMetadata = {
      userPreferences: {
        ...userPreferences,
        classSchedule
      },
      extractedText: rawText,
      cognitiveOptimization: true,
      ...(metadata || {})
    };

    const response = await axios.post('http://localhost:5000/ai/generate-schedule', 
      { tasks, metadata: enhancedMetadata },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (response.data && response.data.schedule) {
      return JSON.stringify(response.data.schedule);
    } else if (response.data && typeof response.data === 'string') {
      return response.data;
    } else if (response.data) {
      // Convert structured data to string if needed
      return JSON.stringify(response.data);
    }
    
    // If we reach here, we didn't get a valid response
    console.warn('Invalid response format from generateSchedule API:', response.data);
    return JSON.stringify({ error: 'No valid schedule data returned' });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error('Axios error generating schedule:', err.response?.data || err.message);
    } else {
      console.error('Unexpected error generating schedule:', err);
    }
    throw err;
  }
};

export const generateScheduleFromPdf = async (pdfFile: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    
    // Add documentType as hidden field
    formData.append('documentType', 'assignment');

    const response = await axios.post('http://localhost:5000/ai/read-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const extractedText = response.data.pdfText;
    console.log('Extracted text from PDF:', extractedText); // Debugging information

    // Get user preferences for cognitive optimization
    let userPreferences = {};
    try {
      const prefsString = localStorage.getItem('userPreferences');
      if (prefsString) {
        userPreferences = JSON.parse(prefsString);
        console.log('Using user preferences for cognitive-optimized scheduling');
      }
    } catch (error) {
      console.warn('Could not retrieve user preferences');
    }
    
    // Get class schedule for conflict avoidance
    let classSchedule = [];
    try {
      const classString = localStorage.getItem('scheduleRawClasses');
      if (classString) {
        classSchedule = JSON.parse(classString);
        console.log('Using class schedule for time slot optimization');
      }
    } catch (error) {
      console.warn('Could not retrieve class schedule');
    }
    
    // Enhanced metadata for cognitive-based scheduling
    const metadata = {
      userPreferences: {
        ...userPreferences,
        classSchedule,
        cognitiveLoadFactors: {
          exam: 1.5,
          project: 1.3,
          assignment: 1.0,
          reading: 0.8
        },
        spacingPreference: userPreferences.spacingPreference || 'moderate',
        productiveTimeOfDay: userPreferences.productiveTimeOfDay || 'balanced',
        procrastinationProfile: userPreferences.procrastinationProfile || 'moderate'
      },
      extractedText,
      pdfFileName: pdfFile.name,
      documentType: 'assignment' // Always set document type as assignment
    };

    // Pass raw text and enhanced metadata to the AI
    return await generateSchedule([], extractedText, metadata);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error('Axios error generating schedule from PDF:', err.response?.data || err.message);
    } else {
      console.error('Unexpected error generating schedule from PDF:', err);
    }
    throw err;
  }
};

export const readPdf = async (pdfFile: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('pdf', pdfFile);

    const response = await axios.post('http://localhost:5000/ai/read-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.pdfText;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error('Axios error reading PDF:', err.response?.data || err.message);
    } else {
      console.error('Unexpected error reading PDF:', err);
    }
    throw err;
  }
};