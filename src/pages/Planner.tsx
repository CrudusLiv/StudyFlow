import React, { useEffect, useState } from 'react';
import axios from 'axios';
import type { Schedule as ScheduleType, Task } from '../types/types';

const Planner: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: '', duration: 0, priority: 'medium', category: 'study' });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const response = await axios.get('http://localhost:5000/schedule', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        console.log('Fetched schedule:', response.data);
        setSchedule(response.data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          console.error('Error fetching schedule:', err.response ? err.response.data : err.message);
          setError('Failed to fetch schedule. Please try again later.');
        } else {
          console.error('Unexpected error:', err);
          setError('An unexpected error occurred. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  const getPriorityColor = (priority: Task['priority']) => {
    const colors = {
      high: 'bg-red-100 border-red-200 text-red-800',
      medium: 'bg-yellow-100 border-yellow-200 text-yellow-800',
      low: 'bg-green-100 border-green-200 text-green-800',
    };
    return colors[priority];
  };

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
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage('Task added successfully!');
      setSchedule((prevSchedule) => {
        if (prevSchedule) {
          return { ...prevSchedule, tasks: [...prevSchedule.tasks, response.data] };
        }
        return prevSchedule;
      });
      setNewTask({ title: '', duration: 0, priority: 'medium', category: 'study' });
      setPdfFile(null);
    } catch (error) {
      console.error('Error creating task:', error);
      setMessage('Error adding task. Please try again.');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!schedule || !Array.isArray(schedule.tasks)) {
    return <div>No schedule available.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold text-gray-800">Your Study Planner</h2>
      <div className="text-sm text-gray-600 mb-4">
        {new Date(schedule.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>

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
        <div>
          <label className="block text-sm font-medium text-gray-700">Upload Assignment (PDF)</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md">
          Add Task
        </button>
      </form>
      {message && <div className="mt-4 text-sm text-gray-600">{message}</div>}

      <div className="space-y-3 mt-6">
        {schedule.tasks.map((task: Task) => (
          <div
            key={task.id}
            className={`p-4 rounded-lg border ${getPriorityColor(task.priority)} transition transform hover:scale-[1.01]`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{task.title}</h3>
                <div className="flex items-center space-x-4 mt-2 text-sm">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {task.duration} minutes
                  </span>
                  <span className="capitalize">{task.category}</span>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium uppercase`}>
                {task.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Planner;