import { Task, Schedule } from '../types/types';
import axios from 'axios';

let apiKey: string | null = null;

const fetchApiKey = async () => {
  if (!apiKey) {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found. Please log in.');
    }
    const response = await axios.get('http://localhost:5000/api/get-api-key', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    apiKey = response.data.apiKey;
  }
};

export const generateSchedule = async (tasks: Task[], extractedText: string): Promise<string> => {
  try {
    await fetchApiKey();
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY is not set in the environment variables.');
    }
    const prompt = `Organize the following tasks extracted from an assignment PDF into a structured daily schedule. 
Optimize study periods with appropriate breaks and prioritize tasks based on their urgency.
Extracted Text: ${extractedText}
Tasks: ${JSON.stringify(tasks)}`;
    
    console.log('Prompt sent to Mistral API:', prompt); // Debugging information

    const chatResponse = await axios.post(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    
    const data = chatResponse.data;
    console.log('Received response from Mistral API:', data); // Log the response content
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No choices returned from Mistral API');
    }
    
    const scheduleContent = data.choices[0].message?.content;
    if (!scheduleContent || typeof scheduleContent !== 'string') {
      throw new Error('No valid content returned from Mistral API');
    }
    
    console.log('Generated schedule:', scheduleContent);
    return scheduleContent;
  } catch (err) {
    console.error('Error generating schedule:', err);
    throw err;
  }
};

export const generateScheduleFromPdf = async (pdfFile: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('pdf', pdfFile);

    const response = await axios.post('http://localhost:5000/ai/read-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const extractedText = response.data.pdfText;
    console.log('Extracted text from PDF:', extractedText); // Debugging information

    const tasks = extractTasksFromText(extractedText);
    console.log('Extracted tasks from text:', tasks); // Debugging information

    return await generateSchedule(tasks, extractedText);
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

const extractTasksFromText = (text: string): Task[] => {
  const taskLines = text.split('\n').filter(line => line.trim() !== '');
  const tasks: Task[] = [];

  // Improved task extraction logic
  taskLines.forEach((line, index) => {
    if (line.toLowerCase().includes('task')) {
      const titleMatch = line.match(/Task \d+: (.+)/i);
      const durationMatch = line.match(/(\d+) minutes/i);
      const priorityMatch = line.match(/(high|medium|low) priority/i);

      if (titleMatch && durationMatch && priorityMatch) {
        const title = titleMatch[1].trim();
        const duration = parseInt(durationMatch[1], 10);
        const priority = priorityMatch[1].toLowerCase() as 'high' | 'medium' | 'low';

        tasks.push({
          id: (index + 1).toString(),
          title,
          duration,
          priority,
          category: 'study', // Default category, you can adjust based on your needs
          completed: false,
        });
      }
    }
  });

  // If no tasks are found, create a default task for testing
  if (tasks.length === 0) {
    tasks.push({
      id: '1',
      title: 'Default Task',
      duration: 60,
      priority: 'high',
      category: 'study',
      completed: false,
    });
  }

  return tasks;
};