import { Task } from '../types/types';
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

    // Do not extract tasks; just pass raw text to the AI
    return await generateSchedule([], extractedText);
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