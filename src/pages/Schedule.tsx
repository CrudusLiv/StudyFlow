import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FiUpload, 
  FiEdit2, 
  FiRefreshCw, 
  FiCalendar, 
  FiClock,
  FiCheckCircle, 
  FiCircle, 
  FiLoader,
  FiSettings,
  FiFilter,
  FiDownload,
  FiTrash2,
  FiFile 
} from 'react-icons/fi';
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

// Function to generate a unique color based on the task title
const getTaskColor = (task: ScheduleTask): string => {
  let hash = 0; // Initialize a hash value

  // Loop through each character in the task title
  for (let i = 0; i < task.title.length; i++) {
    // Generate a hash by shifting bits left and adding the character's Unicode value
    hash = task.title.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert the hash into a hue value (0-359 degrees for HSL color)
  const hue = hash % 360;

  // Return the HSL color string with fixed saturation (70%) and lightness (85%)
  return `hsl(${hue}, 70%, 85%)`;
};

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
  const [isDragging, setIsDragging] = useState(false);
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setPdfFiles(Array.from(e.dataTransfer.files));
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <div className="header-left">
          <div className="title-group">
            <FiCalendar className="header-icon" />
            <div>
              <h2 className="schedule-title">Study Schedule</h2>
              <p className="current-date">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="header-actions">
            <button className="header-button">
              <FiFilter className="button-icon" />
              Filter
            </button>
            <button className="header-button">
              <FiDownload className="button-icon" />
              Export
            </button>
            <button className="header-button">
              <FiRefreshCw className="button-icon" />
              Refresh
            </button>
            <button className="header-button settings-button">
              <FiSettings className="button-icon" />
            </button>
          </div>
        </div>
      </div>

      <div className="upload-section">
        <div className="upload-header">
          <h3><FiUpload className="section-icon" /> Course Materials</h3>
          <p className="upload-description">Upload your course syllabus and materials to generate a schedule</p>
        </div>
        
        <div 
          className={`upload-area ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FiFile className="upload-icon" />
          <p className="upload-text">Drag and drop PDF files here or</p>
          <label className="upload-button">
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileChange}
              className="file-input"
            />
            Browse Files
          </label>
        </div>

        {pdfFiles.length > 0 && (
          <div className="file-list">
            {pdfFiles.map((file, index) => (
              <div key={index} className="file-item">
                <FiFile className="file-icon" />
                <span className="file-name">{file.name}</span>
                <button 
                  className="remove-file"
                  onClick={() => setPdfFiles(files => files.filter((_, i) => i !== index))}
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
            <button onClick={handleGenerateSchedule} className="generate-button">
              <FiClock className="button-icon" /> Generate Schedule
            </button>
          </div>
        )}
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
                          <div className="task-card" style={{ backgroundColor: getTaskColor(task) }}>
                            <div className="task-content">
                              <div className="task-header">
                                <h4 className="task-title">{task.title}</h4>
                                {task.priority && (
                                  <span className={`priority-badge priority-${task.priority}`}>
                                    {task.priority}
                                  </span>
                                )}
                              </div>
                              {task.courseCode && (
                                <span className="course-code">{task.courseCode}</span>
                              )}
                              <p className="task-details">{task.details}</p>
                              <div className="task-footer">
                                <select
                                  value={task.status}
                                  onChange={(e) => handleUpdateTask(dayIndex, taskIndex, {
                                    status: e.target.value as ScheduleTask['status']
                                  })}
                                  className="status-select"
                                >
                                  <option value="pending"><FiCircle /> Pending</option>
                                  <option value="in-progress"><FiLoader /> In Progress</option>
                                  <option value="completed"><FiCheckCircle /> Completed</option>
                                </select>
                                <button
                                  onClick={() => handleEditTask(dayIndex, taskIndex, task)}
                                  className="edit-button"
                                >
                                  <FiEdit2 className="button-icon" /> Edit
                                </button>
                              </div>
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
