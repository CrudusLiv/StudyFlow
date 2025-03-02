import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface BaseTask {
  _id: string;
  title: string;
}

interface RegularTask extends BaseTask {
  duration: number;
  priority: string;
  category: string;
}

interface ScheduleTask {
  time: string;
  title: string;
  details: string;
  dueDate?: string;
  assignmentTitle?: string;
  courseCode?: string;
  priority?: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
}

interface DaySchedule {
  day: string;
  tasks: ScheduleTask[];
}

interface WeeklySchedule {
  weeklySchedule: DaySchedule[];
}

const Schedule: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [tasks, setTasks] = useState<RegularTask[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(null);
  const [editingTask, setEditingTask] = useState<{
    dayIndex: number;
    taskIndex: number;
    task: ScheduleTask;
  } | null>(null);
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

  useEffect(() => {
    const fetchSavedSchedule = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await axios.get('http://localhost:5000/ai/get-schedule', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.data && response.data.weeklySchedule) {
          setWeeklySchedule(response.data);
          console.log('Fetched schedule:', response.data);
        }
      } catch (error) {
        console.error('Error fetching saved schedule:', error);
        setMessage('Error fetching saved schedule');
      }
    };

    fetchSavedSchedule();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPdfFiles(Array.from(e.target.files));
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
    } catch {
      setMessage('Error deleting task. Please try again.');
    }
  };

  const saveScheduleChanges = async (updatedSchedule: WeeklySchedule) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await axios.post(
        'http://localhost:5000/ai/save-schedule',
        updatedSchedule,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log('Saved schedule:', response.data);
      setWeeklySchedule(response.data);
    } catch (error) {
      console.error('Error saving schedule:', error);
      setMessage('Error saving schedule changes');
    }
  };

  const handleGenerateSchedule = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('No token found. Please log in.');
      navigate('/access');
      return;
    }

    if (pdfFiles.length === 0) {
      setMessage('Please upload PDF files.');
      return;
    }

    try {
      const formData = new FormData();
      pdfFiles.forEach(file => formData.append('pdfFiles', file));

      const response = await axios.post('http://localhost:5000/ai/generate-schedule', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Generated schedule:', response.data);
      setWeeklySchedule(response.data);
      await saveScheduleChanges(response.data);
      setMessage('Schedule generated and saved successfully!');
    } catch (error) {
      console.error('Error generating schedule:', error);
      setMessage('Error generating schedule. Please try again.');
    }
  };

  const handleUpdateTask = async (dayIndex: number, taskIndex: number, updates: Partial<ScheduleTask>) => {
    if (!weeklySchedule) return;

    const updatedSchedule = {
      weeklySchedule: weeklySchedule.weeklySchedule.map((day, dIndex) => {
        if (dIndex === dayIndex) {
          return {
            ...day,
            tasks: day.tasks.map((task, tIndex) => {
              if (tIndex === taskIndex) {
                return { ...task, ...updates };
              }
              return task;
            })
          };
        }
        return day;
      })
    };

    setWeeklySchedule(updatedSchedule);
    await saveScheduleChanges(updatedSchedule);
  };

  const handleAddTask = async (dayIndex: number) => {
    if (!weeklySchedule) return;

    const newTask: ScheduleTask = {
      time: "09:00-10:00",
      title: "New Task",
      details: "Task description",
      status: "pending"
    };

    const updatedSchedule = {
      weeklySchedule: weeklySchedule.weeklySchedule.map((day, index) => {
        if (index === dayIndex) {
          return {
            ...day,
            tasks: [...day.tasks, newTask]
          };
        }
        return day;
      })
    };

    setWeeklySchedule(updatedSchedule);
    await saveScheduleChanges(updatedSchedule);
  };

  const handleDeleteTask = async (dayIndex: number, taskIndex: number) => {
    if (!weeklySchedule) return;

    const updatedSchedule = {
      weeklySchedule: weeklySchedule.weeklySchedule.map((day, dIndex) => {
        if (dIndex === dayIndex) {
          return {
            ...day,
            tasks: day.tasks.filter((_, tIndex) => tIndex !== taskIndex)
          };
        }
        return day;
      })
    };

    setWeeklySchedule(updatedSchedule);
    await saveScheduleChanges(updatedSchedule);
  };

  const handleEditTask = (dayIndex: number, taskIndex: number, task: ScheduleTask) => {
    setEditingTask({ dayIndex, taskIndex, task: { ...task } });
  };

  const handleSaveEdit = async () => {
    if (!editingTask || !weeklySchedule) return;
    const { dayIndex, taskIndex, task } = editingTask;

    const updatedSchedule = {
      weeklySchedule: weeklySchedule.weeklySchedule.map((day, dIndex) => {
        if (dIndex === dayIndex) {
          return {
            ...day,
            tasks: day.tasks.map((t, tIndex) => {
              if (tIndex === taskIndex) {
                return task;
              }
              return t;
            })
          };
        }
        return day;
      })
    };

    await saveScheduleChanges(updatedSchedule);
    setEditingTask(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-2 md:p-4 lg:p-6 bg-white dark:bg-gray-900">
      <div className="max-w-full mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 md:mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-2 md:mb-0">Study Schedule</h2>
          <div className="text-sm md:text-md text-gray-600 dark:text-gray-300">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 md:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <h3 className="text-lg md:text-xl font-semibold">Upload Schedule from PDF</h3>
            <div className="flex flex-col md:flex-row w-full md:w-auto space-y-2 md:space-y-0 md:space-x-4">
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileChange}
                className="w-full md:w-auto file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <button
                onClick={handleGenerateSchedule}
                className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Generate Schedule
              </button>
            </div>
          </div>
        </div>

        {weeklySchedule && (
          <div className="mt-4 md:mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 md:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Weekly Schedule</h3>
              <div className="grid grid-cols-2 md:flex gap-2">
                {weeklySchedule.weeklySchedule.map((day, dayIndex) => (
                  <button
                    key={day.day}
                    onClick={() => handleAddTask(dayIndex)}
                    className="px-2 md:px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Add to {day.day}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="overflow-auto max-h-[calc(100vh-300px)] -mx-3 md:-mx-6">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-800 z-20">
                        Time
                      </th>
                      {weeklySchedule.weeklySchedule.map(day => (
                        <th key={day.day} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[250px]">
                          {day.day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {generateTimeSlots(weeklySchedule.weeklySchedule).map((timeSlot) => (
                      <tr key={timeSlot} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 z-10">
                          {timeSlot}
                        </td>
                        {weeklySchedule.weeklySchedule.map((day, dayIndex) => {
                          const taskIndex = day.tasks.findIndex(t => t.time === timeSlot);
                          const task = day.tasks[taskIndex];
                          
                          return (
                            <td key={`${day.day}-${timeSlot}`} className="px-6 py-4 text-sm">
                              {task && (
                                <div className="group relative p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                  <div className="space-y-2">
                                    {/* Title and Priority */}
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                          {task.title}
                                        </h4>
                                        {task.courseCode && (
                                          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                            {task.courseCode}
                                          </span>
                                        )}
                                      </div>
                                      {task.priority && (
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                          task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                                          task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                                          'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                        }`}>
                                          {task.priority}
                                        </span>
                                      )}
                                    </div>

                                    {/* Details */}
                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                      {task.details}
                                    </div>

                                    {/* Assignment Info */}
                                    {task.assignmentTitle && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Assignment: {task.assignmentTitle}
                                      </div>
                                    )}

                                    {/* Due Date */}
                                    {task.dueDate && (
                                      <div className="text-xs font-medium text-red-600 dark:text-red-400">
                                        Due: {new Date(task.dueDate).toLocaleDateString()}
                                      </div>
                                    )}

                                    {/* Status Selector */}
                                    <select
                                      value={task.status}
                                      onChange={(e) => handleUpdateTask(dayIndex, taskIndex, { 
                                        status: e.target.value as ScheduleTask['status']
                                      })}
                                      className={`w-full px-2 py-1 mt-2 rounded text-xs ${
                                        task.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                                        task.status === 'in-progress' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                      }`}
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="in-progress">In Progress</option>
                                      <option value="completed">Completed</option>
                                    </select>
                                  </div>

                                  {/* Single Edit Button */}
                                  <button
                                    onClick={() => handleEditTask(dayIndex, taskIndex, task)}
                                    className="hidden group-hover:block absolute -top-2 -right-2 p-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {editingTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Edit Task
                </h3>
                <button
                  onClick={() => handleDeleteTask(editingTask.dayIndex, editingTask.taskIndex)}
                  className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  title="Delete task"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editingTask.task.title}
                    onChange={(e) => setEditingTask({
                      ...editingTask,
                      task: { ...editingTask.task, title: e.target.value }
                    })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time
                  </label>
                  <input
                    type="text"
                    value={editingTask.task.time}
                    onChange={(e) => setEditingTask({
                      ...editingTask,
                      task: { ...editingTask.task, time: e.target.value }
                    })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Details
                  </label>
                  <textarea
                    value={editingTask.task.details}
                    onChange={(e) => setEditingTask({
                      ...editingTask,
                      task: { ...editingTask.task, details: e.target.value }
                    })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 min-h-[100px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={editingTask.task.priority || 'medium'}
                    onChange={(e) => setEditingTask({
                      ...editingTask,
                      task: { ...editingTask.task, priority: e.target.value as ScheduleTask['priority'] }
                    })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {editingTask.task.dueDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={editingTask.task.dueDate.split('T')[0]}
                      onChange={(e) => setEditingTask({
                        ...editingTask,
                        task: { ...editingTask.task, dueDate: e.target.value }
                      })}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-4">
                <button
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className="mt-6 p-4 rounded-md bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200">
            {message}
          </div>
        )}

        {tasks.length > 0 && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Current Schedule</h3>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{task.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {task.duration} minutes - {task.priority} priority - {task.category}
                    </p>
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleDelete(task._id)}
                      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
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
    </div>
  );
};

// Helper function to generate unique time slots from all tasks
const generateTimeSlots = (schedule: DaySchedule[]): string[] => {
  const timeSlots = new Set<string>();
  schedule.forEach(day => {
    day.tasks.forEach(task => {
      timeSlots.add(task.time);
    });
  });
  return Array.from(timeSlots).sort();
};

export default Schedule;
