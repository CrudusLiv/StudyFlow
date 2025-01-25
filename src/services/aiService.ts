import axios from 'axios';

const GEMINI_AI_BASE_URL = ''; // Replace with actual API URL
const API_KEY = ''; // Replace with your Gemini AI API Key

// Generate study plan
export const generateStudyPlan = async (data: {
  tasks: { name: string; deadline: string }[];
  studyHours: number;
}) => {
  try {
    const response = await axios.post(
      `${GEMINI_AI_BASE_URL}/generate-plan`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );
    return response.data; // Returns the AI-generated plan
  } catch (error) {
    console.error('Error generating study plan:', error);
    throw error;
  }
};

// Adjust schedule dynamically (DTR)
export const adjustSchedule = async (data: {
  tasks: { name: string; deadline: string }[];
  progress: number;
}) => {
  try {
    const response = await axios.post(
      `${GEMINI_AI_BASE_URL}/adjust-schedule`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );
    return response.data; // Returns the adjusted schedule
  } catch (error) {
    console.error('Error adjusting schedule:', error);
    throw error;
  }
};
