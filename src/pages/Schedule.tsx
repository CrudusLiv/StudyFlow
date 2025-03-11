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
import { 
  Select, 
  MenuItem, 
  Switch,
  FormControlLabel,
  Slider,
} from '@mui/material';
import ReactDatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

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
  category?: string;  // Add category
  pdfReference?: {    // Add pdfReference
    page?: string;
    quote?: string;
  };
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

// Add helper functions here
const parseTime = (timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes);
  return date;
};

const formatTime = (date: Date | null): string => {
  if (!date) return '00:00';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

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
      const files = Array.from(e.target.files);
      setPdfFiles(files);
      setMessage(`Selected ${files.length} file(s): ${files.map(f => f.name).join(', ')}`);
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
      // Clean and validate schedule data
      const cleanedSchedule = {
        weeklySchedule: updated.map(week => ({
          week: week.week,
          days: week.days.map(day => ({
            day: day.day,
            date: day.date,
            tasks: (Array.isArray(day.tasks) ? day.tasks : [])
              .filter(task => task && task.title && task.time)
              .map(task => ({
                time: task.time || '09:00 - 10:00',
                title: task.title,
                details: task.details || '',
                status: task.status || 'pending',
                priority: task.priority || 'medium',
                category: task.category || 'study',
                pdfReference: {
                  page: task.pdfReference?.page || '',
                  quote: task.pdfReference?.quote || ''
                }
              }))
          }))
        }))
      };
  
      const response = await axios.post(
        'http://localhost:5000/ai/save-schedule',
        cleanedSchedule,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );
  
      if (response.data?.weeklySchedule) {
        setMultiWeekSchedule(response.data.weeklySchedule);
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      // Don't throw the error, just log it
      setMessage('Failed to save schedule changes. Your changes may not be persisted.');
    }
  };

  const handleGenerateSchedule = async () => {
    if (!showGenerateScheduleModal) {
      setShowGenerateScheduleModal(true);
      return;
    }
    
    setMessage('Generating schedule...');
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('No token found. Please log in.');
      navigate('/access');
      return;
    }
  
    try {
      const formData = new FormData();
      pdfFiles.forEach(file => {
        console.log('Appending file:', file.name);
        formData.append('pdfFiles', file);
      });
      formData.append('preferences', JSON.stringify({
        ...preferences,
        weeksAvailable: 4 // Explicitly set number of weeks
      }));
      
      const response = await axios.post('http://localhost:5000/ai/generate-schedule', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
  
      console.log('Raw AI response:', response.data);
  
      if (!response.data?.weeklySchedule) {
        throw new Error('Invalid schedule format received');
      }
  
      const normalizedSchedule = response.data.weeklySchedule.map((week: any, weekIndex: number) => ({
        week: `Week ${weekIndex + 1}`,
        days: Array(7).fill(null).map((_, dayIndex) => {
          const existingDay = week.days?.[dayIndex] || {};
          return {
            day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex],
            date: existingDay.date || new Date(Date.now() + ((weekIndex * 7) + dayIndex) * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0],
            tasks: Array.isArray(existingDay.tasks) ? existingDay.tasks.map((task: any) => ({
              time: task.time || '09:00 - 10:00',
              title: task.title || 'Untitled Task',
              details: task.details || '',
              status: task.status || 'pending',
              priority: task.priority || 'medium',
              category: task.category || 'study',
              pdfReference: task.pdfReference || null
            })).filter(task => task.title && task.time) : []
          };
        })
      }));
  
      console.log('Normalized schedule:', normalizedSchedule);
  
      setMultiWeekSchedule(normalizedSchedule);
      setShowGenerateScheduleModal(false);
  
      await saveScheduleChanges(normalizedSchedule);
      setMessage('Schedule generated and saved successfully!');
    } catch (error) {
      console.error('Error generating schedule:', error);
      setMessage(error.response?.data?.error || 'Error generating schedule. Please try again.');
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

  const hasValidScheduleData = () => {
    if (!Array.isArray(multiWeekSchedule) || multiWeekSchedule.length === 0) {
      console.log('Invalid schedule: empty or not an array');
      return false;
    }
  
    const totalTasks = multiWeekSchedule.reduce((weekAcc, week) => 
      weekAcc + week.days.reduce((dayAcc, day) => 
        dayAcc + (Array.isArray(day?.tasks) ? day.tasks.length : 0), 0), 0);
  
    console.log('Total tasks in schedule:', totalTasks);
  
    return multiWeekSchedule.length > 0 && totalTasks > 0;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  // Before rendering the schedule, add an early return:
  if (!hasValidScheduleData()) {
    return (
      <div className="schedule-container improved-schedule">
        <header className="schedule-header-bar">
          <h1>My Schedule</h1>
        </header>
        {message && <div className="message">{message}</div>}
        
        <div className="upload-section improved-upload-section">
          <h2>Upload PDF Files</h2>
          {/* Keep the file upload section from the original return statement */}
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
        
        <div className="no-schedule-message">
          <p>No valid schedule data available. Please generate a schedule or upload course materials.</p>
        </div>
      </div>
    );
  }

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
                            <TaskCard
                              task={task}
                              onEdit={() => handleEditTask(dayIndex, day.tasks.indexOf(task), task)}
                              onDelete={() => handleDeleteTask(dayIndex, day.tasks.indexOf(task))}
                              onStatusChange={(status) => handleUpdateTask(dayIndex, day.tasks.indexOf(task), { status })}
                            />
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
      <div className="modal-content">
        <h2>Schedule Preferences</h2>
        
        <div className="preferences-grid">
          <div className="preference-item">
            <label>Preferred Study Time</label>
            <Select
              value={preferences.preferredTime}
              onChange={(e) => setPreferences({ 
                ...preferences, 
                preferredTime: e.target.value 
              })}
              fullWidth
            >
              <MenuItem value="morning">Morning (9:00 - 12:00)</MenuItem>
              <MenuItem value="afternoon">Afternoon (13:00 - 17:00)</MenuItem>
              <MenuItem value="evening">Evening (18:00 - 21:00)</MenuItem>
            </Select>
          </div>

          <div className="preference-item">
            <label>Wake Time</label>
            <ReactDatePicker
              selected={parseTime(preferences.wakeTime)}
              onChange={(date) => setPreferences({
                ...preferences,
                wakeTime: formatTime(date)
              })}
              showTimeSelect
              showTimeSelectOnly
              timeIntervals={15}
              dateFormat="HH:mm"
              className="time-picker"
            />
          </div>

          <div className="preference-item">
            <label>Sleep Time</label>
            <ReactDatePicker
              selected={parseTime(preferences.sleepTime)}
              onChange={(date) => setPreferences({
                ...preferences,
                sleepTime: formatTime(date)
              })}
              showTimeSelect
              showTimeSelectOnly
              timeIntervals={15}
              dateFormat="HH:mm"
              className="time-picker"
            />
          </div>

          <div className="preference-item">
            <label>Break Frequency</label>
            <Select
              value={preferences.breakFrequency}
              onChange={(e) => setPreferences({
                ...preferences,
                breakFrequency: e.target.value
              })}
              fullWidth
            >
              <MenuItem value="15">Every 15 minutes</MenuItem>
              <MenuItem value="30">Every 30 minutes</MenuItem>
              <MenuItem value="45">Every 45 minutes</MenuItem>
              <MenuItem value="60">Every hour</MenuItem>
              <MenuItem value="90">Every 1.5 hours</MenuItem>
              <MenuItem value="120">Every 2 hours</MenuItem>
            </Select>
          </div>

          <div className="preference-item">
            <label>Days Before Due</label>
            <Slider
              value={Number(preferences.daysBeforeDue)}
              onChange={(_, value) => setPreferences({
                ...preferences,
                daysBeforeDue: String(value)
              })}
              min={1}
              max={7}
              marks
              valueLabelDisplay="auto"
            />
          </div>

          <div className="preference-item weekend-toggle">
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.includeWeekend}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    includeWeekend: e.target.checked
                  })}
                  color="primary"
                />
              }
              label="Include Weekends"
            />
          </div>
        </div>

        <div className="modal-actions">
          <button 
            className="primary-button"
            onClick={handleGenerateSchedule}
          >
            Generate Schedule
          </button>
          <button 
            className="secondary-button"
            onClick={() => setShowGenerateScheduleModal(false)}
          >
            Cancel
          </button>
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

// Add task action buttons to the task card
const TaskCard: React.FC<{
  task: ScheduleTask;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: ScheduleTask['status']) => void;
}> = ({ task, onEdit, onDelete, onStatusChange }) => (
  <div className="task-card" style={{ backgroundColor: getTaskColor(task) }}>
    <div className="task-content">
      <div className="task-header">
        <h4 className="task-title">{task.title}</h4>
        <div className="task-actions">
          <button onClick={onEdit} className="edit-button">Edit</button>
          <button onClick={onDelete} className="delete-button">Delete</button>
        </div>
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
          onChange={(e) => onStatusChange(e.target.value as ScheduleTask['status'])}
          className="status-select"
        >
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </div>
  </div>
);

export default Schedule;
