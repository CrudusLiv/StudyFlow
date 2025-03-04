import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/pages/Schedule.css';

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
    <div className="schedule-container">
      <div className="schedule-header">
        <h2 className="schedule-title">Study Schedule</h2>
        <div className="current-date">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      <div className="upload-section">
        <div className="upload-controls">
          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileChange}
            className="file-input"
          />
          <button onClick={handleGenerateSchedule} className="generate-button">
            Generate Schedule
          </button>
        </div>
      </div>

      {weeklySchedule && (
        <div className="schedule-grid">
          <table className="schedule-table">
            <thead className="table-header">
              <tr>
                <th>Time</th>
                {weeklySchedule.weeklySchedule.map(day => (
                  <th key={day.day}>{day.day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {generateTimeSlots(weeklySchedule.weeklySchedule).map((timeSlot) => (
                <tr key={timeSlot}>
                  <td className="task-cell">{timeSlot}</td>
                  {weeklySchedule.weeklySchedule.map((day, dayIndex) => {
                    const taskIndex = day.tasks.findIndex(t => t.time === timeSlot);
                    const task = day.tasks[taskIndex];
                    
                    return (
                      <td key={`${day.day}-${timeSlot}`} className="task-cell">
                        {task && (
                          <div className="task-card">
                            <div className="task-content">
                              <h4 className="task-title">{task.title}</h4>
                              {task.courseCode && (
                                <span className="course-code">{task.courseCode}</span>
                              )}
                              <p className="task-details">{task.details}</p>
                              {task.assignmentTitle && (
                                <div className="assignment-info">
                                  Assignment: {task.assignmentTitle}
                                </div>
                              )}
                              {task.dueDate && (
                                <div className="due-date">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </div>
                              )}
                              {task.priority && (
                                <span className={`priority-badge priority-${task.priority}`}>
                                  {task.priority}
                                </span>
                              )}
                              <select
                                value={task.status}
                                onChange={(e) => handleUpdateTask(dayIndex, taskIndex, {
                                  status: e.target.value as ScheduleTask['status']
                                })}
                                className="status-select"
                              >
                                <option value="pending">Pending</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                              </select>
                              <button
                                onClick={() => handleEditTask(dayIndex, taskIndex, task)}
                                className="edit-button"
                              >
                                Edit
                              </button>
                            </div>
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
      )}

      {editingTask && (
        <>
          <div className="modal-overlay" onClick={() => setEditingTask(null)} />
          <div className="edit-modal">
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                value={editingTask.task.title}
                onChange={(e) => setEditingTask({
                  ...editingTask,
                  task: { ...editingTask.task, title: e.target.value }
                })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Time</label>
              <input
                type="text"
                value={editingTask.task.time}
                onChange={(e) => setEditingTask({
                  ...editingTask,
                  task: { ...editingTask.task, time: e.target.value }
                })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Details</label>
              <textarea
                value={editingTask.task.details}
                onChange={(e) => setEditingTask({
                  ...editingTask,
                  task: { ...editingTask.task, details: e.target.value }
                })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                value={editingTask.task.priority || 'medium'}
                onChange={(e) => setEditingTask({
                  ...editingTask,
                  task: { ...editingTask.task, priority: e.target.value as ScheduleTask['priority'] }
                })}
                className="form-input"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="button-group">
              <button onClick={() => setEditingTask(null)} className="cancel-button">
                Cancel
              </button>
              <button onClick={handleSaveEdit} className="save-button">
                Save Changes
              </button>
            </div>
          </div>
        </>
      )}
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
