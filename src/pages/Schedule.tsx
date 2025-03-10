import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FiUpload, 
  FiRefreshCw, 
  FiCalendar, 
  FiClock,
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
  date?: string; // new property
  tasks: ScheduleTask[];
}

interface WeeklySchedule {
  week: string;
  days: DaySchedule[];
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
  const [multiWeekSchedule, setMultiWeekSchedule] = useState<WeeklySchedule[]>([]);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [editingTask, setEditingTask] = useState<{
    dayIndex: number;
    taskIndex: number;
    task: ScheduleTask;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showGenerateScheduleModal, setShowGenerateScheduleModal] = useState(false);
  const [preferences, setPreferences] = useState({
    preferredTime: 'morning',
    daysBeforeDue: '2',
    wakeTime: '07:00',
    sleepTime: '23:00',
    dinnerTime: '18:00',
    breakFrequency: '120',
    includeWeekend: true  // new preference option
  });
  const navigate = useNavigate();

  // Add debug function
  const debugSchedule = useCallback((schedule: unknown, source: string): void => {
    console.log(`[DEBUG ${source}]`, schedule);
  }, []);

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
        console.log('Fetching saved schedule...');
        const response = await axios.get('http://localhost:5000/ai/get-schedule', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        debugSchedule(response.data, 'API Response');
        
        if (response.data && Array.isArray(response.data.weeklySchedule)) {
          if (response.data.weeklySchedule[0]?.week) {
            setMultiWeekSchedule(response.data.weeklySchedule);
          } else {
            // Transform flat array into one week
            setMultiWeekSchedule([{ week: 'Week 1', days: response.data.weeklySchedule }]);
          }
        }
      } catch (error) {
        console.error('Error fetching saved schedule:', error);
        setMessage('Error fetching saved schedule');
      }
    };

    fetchSavedSchedule();
  }, [debugSchedule]);

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

  const saveScheduleChanges = async (updated: WeeklySchedule[]) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      console.log('Saving schedule data:', updated[currentWeekIndex]);
      
      // Extract the correct data structure to save
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      const dataToSave = {
        weeklySchedule: updated[currentWeekIndex].days.map((day, index) => ({
          day: day.day || dayNames[index % 7],
          date: day.date || new Date().toISOString().split('T')[0],
          tasks: Array.isArray(day.tasks) ? day.tasks : []
        }))
      };
      
      const response = await axios.post(
        'http://localhost:5000/ai/save-schedule',
        dataToSave,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log('Schedule save response:', response.data);
      
      // Process the response data to ensure it's in the correct format for our UI
      if (response.data && response.data.weeklySchedule) {
        setMultiWeekSchedule(
          response.data.weeklySchedule[0]?.week
            ? response.data.weeklySchedule
            : [{ week: 'Week 1', days: response.data.weeklySchedule }]
        );
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      setMessage('Error saving schedule changes');
    }
  };

  const handleGenerateSchedule = async () => {
    if (!showGenerateScheduleModal) {
      setShowGenerateScheduleModal(true);
      return;
    }
    setMessage(null);
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
      formData.append('preferences', JSON.stringify(preferences));
      
      console.log('Sending request to generate schedule...');
      const response = await axios.post('http://localhost:5000/ai/generate-schedule', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      debugSchedule(response.data, 'Generate Response');

      if (!response.data?.weeklySchedule?.length) {
        throw new Error('Invalid schedule format received');
      }

      // --- CHANGES BEGIN: Preserve multi-week structure ---
      const scheduleData = response.data.weeklySchedule.map((week: any) => {
        if (week.week && Array.isArray(week.days)) {
          return {
            week: week.week,
            days: week.days.map((d: any) => ({
              day: d.day || 'Unknown Day',
              date: d.date || new Date().toISOString().split('T')[0],
              tasks: Array.isArray(d.tasks)
                ? d.tasks.map((task: any) => ({
                    time: task.time || '09:00',
                    title: task.title || 'Untitled Task',
                    details: task.details || '',
                    status: task.status || 'pending'
                  }))
                : []
            }))
          };
        } else {
          return {
            week: 'Week 1',
            days: [{
              day: week.day || 'Unknown Day',
              date: week.date || new Date().toISOString().split('T')[0],
              tasks: Array.isArray(week.tasks)
                ? week.tasks.map((task: any) => ({
                    time: task.time || '09:00',
                    title: task.title || 'Untitled Task',
                    details: task.details || '',
                    status: task.status || 'pending'
                  }))
                : []
            }]
          };
        }
      });
      // --- CHANGES END ---
      
      debugSchedule({ days: scheduleData }, 'Processed Generate Data');
      
      setMultiWeekSchedule(scheduleData);
      setShowGenerateScheduleModal(false);
      
      // Save immediately after setting state
      await saveScheduleChanges([{ weeklySchedule: scheduleData }]);
      setMessage('Schedule generated and saved successfully!');
    } catch (error) {
      console.error('Error generating schedule:', error);
      setMessage('Error generating schedule. Please try again.');
    }
  };

  const handleUpdateTask = async (dayIndex: number, taskIndex: number, updates: Partial<ScheduleTask>) => {
    if (!multiWeekSchedule.length) return;
    
    const updatedSchedules = [...multiWeekSchedule];
    const currentWeek = { ...updatedSchedules[currentWeekIndex] };
    currentWeek.days = currentWeek.days.map((day, dIndex) => {
      if (dIndex === dayIndex) {
        return {
          ...day,
          tasks: day.tasks.map((task, tIndex) => tIndex === taskIndex ? { ...task, ...updates } : task)
        };
      }
      return day;
    });
    updatedSchedules[currentWeekIndex] = currentWeek;
  
    setMultiWeekSchedule(updatedSchedules);
    await saveScheduleChanges(updatedSchedules);
  };

  const handleAddTask = async (dayIndex: number) => {
    if (!multiWeekSchedule.length) return;

    const newTask: ScheduleTask = {
      time: "09:00-10:00",
      title: "New Task",
      details: "Task description",
      status: "pending"
    };

    const updatedSchedules = [...multiWeekSchedule];
    const currentWeek = { ...updatedSchedules[currentWeekIndex] };
    currentWeek.days = currentWeek.days.map((day, index) => {
      if (index === dayIndex) {
        return {
          ...day,
          tasks: [...day.tasks, newTask]
        };
      }
      return day;
    });
    updatedSchedules[currentWeekIndex] = currentWeek;

    setMultiWeekSchedule(updatedSchedules);
    await saveScheduleChanges(updatedSchedules);
  };

  const handleDeleteTask = async (dayIndex: number, taskIndex: number) => {
    if (!multiWeekSchedule.length) return;

    const updatedSchedules = [...multiWeekSchedule];
    const currentWeek = { ...updatedSchedules[currentWeekIndex] };
    currentWeek.days = currentWeek.days.map((day, dIndex) => {
      if (dIndex === dayIndex) {
        return {
          ...day,
          tasks: day.tasks.filter((_, tIndex) => tIndex !== taskIndex)
        };
      }
      return day;
    });
    updatedSchedules[currentWeekIndex] = currentWeek;

    setMultiWeekSchedule(updatedSchedules);
    await saveScheduleChanges(updatedSchedules);
  };

  const handleEditTask = (dayIndex: number, taskIndex: number, task: ScheduleTask) => {
    setEditingTask({ dayIndex, taskIndex, task: { ...task } });
  };

  const handleSaveEdit = async () => {
    if (!editingTask || !multiWeekSchedule.length) return;
    const { dayIndex, taskIndex, task } = editingTask;

    const updatedSchedules = [...multiWeekSchedule];
    const currentWeek = { ...updatedSchedules[currentWeekIndex] };
    currentWeek.days = currentWeek.days.map((day, dIndex) => {
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
    });
    updatedSchedules[currentWeekIndex] = currentWeek;

    await saveScheduleChanges(updatedSchedules);
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

  const handleNextWeek = () => {
    if (currentWeekIndex < multiWeekSchedule.length - 1) {
      setCurrentWeekIndex(currentWeekIndex + 1);
    }
  };

  const handlePrevWeek = () => {
    if (currentWeekIndex > 0) {
      setCurrentWeekIndex(currentWeekIndex - 1);
    }
  };

  // Replace existing hasValidScheduleData function with:
  const hasValidScheduleData = () => {
    return (
      Array.isArray(multiWeekSchedule) &&
      multiWeekSchedule.length > 0 &&
      currentWeekIndex >= 0 &&
      currentWeekIndex < multiWeekSchedule.length &&
      Array.isArray(multiWeekSchedule[currentWeekIndex].days) &&
      multiWeekSchedule[currentWeekIndex].days.length > 0
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  // Before rendering the schedule, add an early return:
  if (!hasValidScheduleData()) {
    return (
      <div className="no-schedule-message">
        <p>No valid schedule data available. Please generate a schedule or upload course materials.</p>
      </div>
    );
  }

  // Determine current week's days (if the schedule structure uses "days" instead of "weeklySchedule")
  const currentWeekDays = multiWeekSchedule[currentWeekIndex].days || multiWeekSchedule[currentWeekIndex].weeklySchedule;

  return (
    <div className="schedule-container improved-schedule">
      <header className="schedule-header-bar">
        <h1>My Schedule</h1>
      </header>
      {message && <div className="message">{message}</div>}
      <div className="upload-section improved-upload-section">
        <h2>Upload PDF Files</h2>
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
              <button 
                className="header-button settings-button" 
                onClick={handleGenerateSchedule}
              >
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
      </div>
      
      {/* Insert week navigation controls */}
      <div className="week-navigation">
        <button 
          className={`nav-button ${currentWeekIndex === 0 ? 'disabled' : ''}`} 
          onClick={handlePrevWeek} 
          disabled={currentWeekIndex === 0}
        >
          Previous Week
        </button>
        <span className="current-week">
          Week {currentWeekIndex + 1} of {multiWeekSchedule.length}
        </span>
        <button 
          className={`nav-button ${currentWeekIndex === multiWeekSchedule.length - 1 ? 'disabled' : ''}`} 
          onClick={handleNextWeek} 
          disabled={currentWeekIndex === multiWeekSchedule.length - 1}
        >
          Next Week
        </button>
      </div>
      
      {hasValidScheduleData() ? (
        <section className="schedule-weeks">
          <div className="schedule-grid">
            <table className="schedule-table">
              <thead className="table-header">
                <tr>
                  <th>Time</th>
                  {multiWeekSchedule[currentWeekIndex].days.map((day, i) => {
                    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                    return (
                      <th key={i}>
                        {day.day || weekDays[i]}
                        <br />
                        <span className="date-label">{day.date || ''}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {generateTimeSlots(multiWeekSchedule[currentWeekIndex].days).map((timeSlot) => (
                  <tr key={timeSlot}>
                    <td className="task-cell">{timeSlot}</td>
                    {multiWeekSchedule[currentWeekIndex].days.map((day, dayIndex) => {
                      const task = Array.isArray(day.tasks)
                        ? day.tasks.find(t => t && t.time === timeSlot)
                        : null;
                      return (
                        <td key={`${dayIndex}-${timeSlot}`} className="task-cell">
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
                                <p className="task-details">{task.details || 'No details provided'}</p>
                                <div className="task-footer">
                                  <select
                                    value={task.status}
                                    onChange={(e) => handleUpdateTask(dayIndex, day.tasks.indexOf(task), {
                                      status: e.target.value as ScheduleTask['status']
                                    })}
                                    className="status-select"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                  </select>
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
        </section>
      ) : (
        <div className="no-schedule-message">
          <p>No schedule data available. Please generate a schedule or upload course materials.</p>
        </div>
      )}

      {editingTask && (
        <>
          <div className="modal-overlay" onClick={() => setEditingTask(null)} />
          <div className="edit-modal improved-modal">
            <h2>Edit Task</h2>
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

      {showGenerateScheduleModal && (
        <div className="modal-overlay">
          <div className="modal improved-modal">
            <button className="modal-close-button" onClick={() => setShowGenerateScheduleModal(false)}>
              &times;
            </button>
            <div className="modal-content-container">
              <h2>Schedule Preferences</h2>
              <label>Preferred Time</label>
              <input
                value={preferences.preferredTime}
                onChange={(e) =>
                  setPreferences({ ...preferences, preferredTime: e.target.value })
                }
              />
              <label>Days Before Due</label>
              <input
                value={preferences.daysBeforeDue}
                onChange={(e) =>
                  setPreferences({ ...preferences, daysBeforeDue: e.target.value })
                }
              />
              <label>Wake Time</label>
              <input
                value={preferences.wakeTime}
                onChange={(e) =>
                  setPreferences({ ...preferences, wakeTime: e.target.value })
                }
              />
              <label>Sleep Time</label>
              <input
                value={preferences.sleepTime}
                onChange={(e) =>
                  setPreferences({ ...preferences, sleepTime: e.target.value })
                }
              />
              <label>Dinner Time</label>
              <input
                value={preferences.dinnerTime}
                onChange={(e) =>
                  setPreferences({ ...preferences, dinnerTime: e.target.value })
                }
              />
              <label>Break Frequency</label>
              <input
                value={preferences.breakFrequency}
                onChange={(e) =>
                  setPreferences({ ...preferences, breakFrequency: e.target.value })
                }
              />
              <label>
                <input
                  type="checkbox"
                  checked={preferences.includeWeekend}
                  onChange={(e) =>
                    setPreferences({ ...preferences, includeWeekend: e.target.checked })
                  }
                />
                Include Saturday and Sunday
              </label>
              <div className="modal-actions">
                <button onClick={() => handleGenerateSchedule()}>Generate</button>
                <button onClick={() => setShowGenerateScheduleModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to generate unique time slots from all tasks
const generateTimeSlots = (days: DaySchedule[]): string[] => {
  const timeSlots = new Set<string>();
  const defaultSlots = ['09:00', '10:00', '11:00', '12:00','13:00', '14:00', '15:00', '16:00', '17:00'];
  defaultSlots.forEach(slot => timeSlots.add(slot));
  days.forEach(day => {
    (Array.isArray(day.tasks) ? day.tasks : []).forEach(task => {
      if (task && task.time) {
        timeSlots.add(task.time);
      }
    });
  });
  return Array.from(timeSlots).sort();
};

export default Schedule;
