import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { generateScheduleFromPdf } from '../services/ai';

const Schedule: React.FC = () => {
  const [schedule, setSchedule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({ title: '', duration: 0, priority: 'medium', category: 'study' });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSchedule = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('No token found. Please log in.');
        setLoading(false);
        navigate('/access');
        return;
      }

      try {
        const response = await axios.get('http://localhost:5000/schedule', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log('Fetched schedule:', response.data);
        setSchedule(response.data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          console.error('Error fetching schedule:', err.response ? err.response.data : err.message);
          if (err.response && err.response.status === 401) {
            setMessage('Invalid token. Please log in again.');
            localStorage.removeItem('token');
            navigate('/access');
          } else {
            setMessage('Failed to fetch schedule. Please try again later.');
          }
        } else {
          console.error('Unexpected error:', err);
          setMessage('An unexpected error occurred. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTask({ ...newTask, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('No token found. Please log in.');
      navigate('/access');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', newTask.title);
      formData.append('duration', newTask.duration.toString());
      formData.append('priority', newTask.priority);
      formData.append('category', newTask.category);
      if (pdfFile) {
        formData.append('pdf', pdfFile);
      }

      const response = await axios.post('http://localhost:5000/tasks', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage('Task added successfully!');
      setSchedule((prevSchedule) => {
        if (prevSchedule) {
          return `${prevSchedule}\n${response.data.title} - ${response.data.duration} minutes - ${response.data.priority} priority`;
        } else {
          return `${response.data.title} - ${response.data.duration} minutes - ${response.data.priority} priority`;
        }
      });
      setNewTask({ title: '', duration: 0, priority: 'medium', category: 'study' });
      setPdfFile(null);
    } catch (error) {
      console.error('Error creating task:', error);
      setMessage('Error adding task. Please try again.');
    }
  };

  const handleGenerateSchedule = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('No token found. Please log in.');
      navigate('/access');
      return;
    }

    if (!pdfFile) {
      setMessage('Please upload a PDF file.');
      return;
    }

    try {
      const schedule = await generateScheduleFromPdf(pdfFile);
      setSchedule(schedule);
      setMessage('Schedule generated successfully!');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error generating schedule:', error.response ? error.response.data : error.message);
        setMessage('Error generating schedule. Please try again.');
      } else {
        console.error('Unexpected error:', error);
        setMessage('An unexpected error occurred. Please try again later.');
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold text-gray-800">Your Study Schedule</h2>
      {schedule && (
        <div className="text-sm text-gray-600 mb-4">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            name="title"
            value={newTask.title}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
          <input
            type="number"
            name="duration"
            value={newTask.duration}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Priority</label>
          <select
            name="priority"
            value={newTask.priority}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
            required
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            name="category"
            value={newTask.category}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
            required
          >
            <option value="study">Study</option>
            <option value="break">Break</option>
            <option value="exercise">Exercise</option>
            <option value="other">Other</option>
          </select>
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md">
          Add Task
        </button>
      </form>
      {message && <div className="mt-4 text-sm text-gray-600">{message}</div>}

      {schedule && (
        <div className="space-y-3 mt-6">
          <pre className="p-4 bg-gray-100 rounded-md whitespace-pre-wrap">{schedule}</pre>
        </div>
      )}

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700">Upload Assignment (PDF)</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
        />
        <button
          onClick={handleGenerateSchedule}
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded-md"
        >
          Generate Schedule
        </button>
      </div>
    </div>
  );
};

export default Schedule;