import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { generateScheduleFromPdf } from '../services/ai';

interface Task {
  _id: string;
  title: string;
  duration: number;
  priority: string;
  category: string;
}

const Schedule: React.FC = () => {
  const [schedule, setSchedule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({ title: '', duration: 0, priority: 'medium', category: 'study' });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTasks = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('No token found. Please log in.');
        setLoading(false);
        navigate('/access');
        return;
      }

      try {
        const response = await axios.get('http://localhost:5000/tasks', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setTasks(response.data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            setMessage('Invalid token. Please log in again.');
            localStorage.removeItem('token');
            navigate('/access');
          } else {
            setMessage('Failed to fetch tasks. Please try again later.');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
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

  const handleEdit = (taskId: string) => {
    const taskToEdit = tasks.find(task => task._id === taskId);
    if (taskToEdit) {
      setEditingTask(taskId);
      setNewTask({
        title: taskToEdit.title,
        duration: taskToEdit.duration,
        priority: taskToEdit.priority,
        category: taskToEdit.category
      });
    }
  };

  const handleDelete = async (taskId: string) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.delete(`http://localhost:5000/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.status === 200) {
        setTasks(tasks.filter(task => task._id !== taskId));
        setMessage('Task deleted successfully!');
      }
    } catch (error) {
      setMessage('Error deleting task. Please try again.');
    }
  };

  const handleUpdate = async (taskId: string) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.put(
        `http://localhost:5000/tasks/${taskId}`,
        newTask,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setTasks(tasks.map(task => 
        task._id === taskId ? response.data : task
      ));
      setEditingTask(null);
      setNewTask({ title: '', duration: 0, priority: 'medium', category: 'study' });
      setMessage('Task updated successfully!');
    } catch (error) {
      setMessage('Error updating task. Please try again.');
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
      if (editingTask) {
        await handleUpdate(editingTask);
      } else {
        const response = await axios.post('http://localhost:5000/tasks', newTask, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setTasks([...tasks, response.data]);
        setNewTask({ title: '', duration: 0, priority: 'medium', category: 'study' });
        setMessage('Task added successfully!');
      }
    } catch (error) {
      setMessage('Error managing task. Please try again.');
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
    
    <div className="p-6">
      <div className="max-w-6xl">
        <h2 className="text-3xl font-bold text-gray-800">Your Study Schedule</h2>
        <div className="text-md text-gray-600 mt-2">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingTask ? 'Edit Task' : 'Add New Task'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={newTask.title}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                name="duration"
                value={newTask.duration}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                name="priority"
                value={newTask.priority}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={newTask.category}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              >
                <option value="study">Study</option>
                <option value="break">Break</option>
                <option value="exercise">Exercise</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button 
              type="submit" 
              className="w-full px-4 py-2 bg-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
            >
              {editingTask ? 'Update Task' : 'Add Task'}
            </button>
            {editingTask && (
              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setNewTask({ title: '', duration: 0, priority: 'medium', category: 'study' });
                }}
                className="w-full px-4 py-2 bg-gray-500 text-indigo-600 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Generate from PDF</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Assignment (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleGenerateSchedule}
              className="w-full px-4 py-2 bg-green-600 text-indigo-600 rounded-md hover:bg-green-700 transition-colors"
            >
              Generate Schedule
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className="mt-6 p-4 rounded-md bg-blue-50 text-blue-700">
          {message}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Current Schedule</h3>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                <div>
                  <h4 className="font-medium">{task.title}</h4>
                  <p className="text-sm text-gray-600">
                    {task.duration} minutes - {task.priority} priority - {task.category}
                  </p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => handleEdit(task._id)}
                    className="px-3 py-1 bg-blue-600 text-indigo-600 rounded-md hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(task._id)}
                    className="px-3 py-1 bg-red-600 text-indigo-600 rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
