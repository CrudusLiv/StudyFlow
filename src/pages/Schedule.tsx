import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FiUpload,
  FiCalendar,
  FiClock,
  FiSettings,
  FiFile,
  FiTrash2,
  FiEdit,
  FiX,
  FiTrash
} from 'react-icons/fi';
import '../styles/pages/Schedule.css';
import { Calendar, momentLocalizer, NavigateAction, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '../contexts/AuthContext';
import type { CalendarEvent, ScheduleTask } from '../types/types';
import { googleCalendarService } from '../services/googleCalendar';

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

interface SchedulePreferences {
  startTime: string;
  endTime: string;
  breakDuration: number;
  daysBeforeDue: number;
  includeWeekends: boolean;
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

// Add a new component for better task display
const TaskEventComponent = ({ event }: { event: any }) => {
  const task = event.resource || {};
  const priorityClass = task.priority ? `priority-${task.priority}` : 'priority-medium';

  return (
    <div className={`task-event ${priorityClass}`}>
      <div className="task-event-title">{event.title}</div>
      {event.description && <div className="task-event-desc">{event.description}</div>}
    </div>
  );
};

const Schedule: React.FC = () => {
  // Remove unused state
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
  const [preferences, setPreferences] = useState<SchedulePreferences>({
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 15,
    daysBeforeDue: 7,
    includeWeekends: false
  });
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('week');
  const [selectedTask, setSelectedTask] = useState<ScheduleTask | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Remove unused context hooks
  const navigate = useNavigate();
  const localizer = momentLocalizer(moment);

  // 3. Group all useCallback hooks
  const debugSchedule = useCallback((schedule: unknown, source: string): void => {
    console.log(`[DEBUG ${source}]`, schedule);
  }, []);

  const findDayIndex = useCallback((event: { start: Date; title: string; resource?: any }): number => {
    if (!multiWeekSchedule || !multiWeekSchedule.length) return -1;
    const eventDate = event.start.toISOString().split('T')[0];
    const week = multiWeekSchedule[currentWeekIndex];
    return week.days.findIndex(d => d.date === eventDate);
  }, [multiWeekSchedule, currentWeekIndex]);

  const findTaskIndex = useCallback((event: { start: Date; title: string; resource?: any }, dayIndex: number): number => {
    if (dayIndex < 0 || !multiWeekSchedule || !multiWeekSchedule.length) return -1;
    const week = multiWeekSchedule[currentWeekIndex];
    const day = week.days[dayIndex];
    return day.tasks.findIndex(t =>
      t.title === event.title &&
      event.start.toTimeString().includes(t.time.split('-')[0].trim())
    );
  }, [multiWeekSchedule, currentWeekIndex]);

  const convertTasksToEvents = useCallback(() => {
    if (!multiWeekSchedule || !multiWeekSchedule.length) {
      console.log('No schedule data available');
      return [];
    }

    const events: CalendarEvent[] = [];

    try {
      // Loop through all weeks instead of just current week
      multiWeekSchedule.forEach((week, weekIndex) => {
        if (!week.days || !Array.isArray(week.days)) return;

        week.days.forEach(day => {
          if (!day.tasks || !Array.isArray(day.tasks) || !day.date) return;

          // Process each task in this day
          day.tasks.forEach(task => {
            try {
              if (!task.title || !task.time) return;

              // Normalize the time format (remove spaces, ensure proper format)
              const timeRange = task.time.replace(/\s+/g, '');
              const [startTimeStr, endTimeStr] = timeRange.split('-');

              if (!startTimeStr || !endTimeStr) {
                console.log(`Task has invalid time format: ${task.time}`);
                return;
              }

              // Format the times properly with padding and colons
              const formattedStartTime = startTimeStr.includes(':') ? startTimeStr : `${startTimeStr.padStart(2, '0')}:00`;
              const formattedEndTime = endTimeStr.includes(':') ? endTimeStr : `${endTimeStr.padStart(2, '0')}:00`;

              // Create the complete date strings
              const startDate = new Date(`${day.date}T${formattedStartTime}`);
              const endDate = new Date(`${day.date}T${formattedEndTime}`);

              // Skip invalid dates
              if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.log(`Invalid date/time for task: ${task.title}, ${task.time}, ${day.date}`);
                return;
              }

              events.push({
                id: `${day.date}-${task.time}-${Math.random().toString(36).substring(2, 7)}`,
                title: task.title,
                start: startDate,
                end: endDate,
                description: task.details || '',
                allDay: false,
                resource: task
              });
            } catch (err) {
              console.error(`Error processing task ${task.title}:`, err);
            }
          });
        });
      });

      console.log(`Created ${events.length} calendar events`);
      return events;
    } catch (error) {
      console.error('Error converting tasks to events:', error);
      return [];
    }
  }, [multiWeekSchedule]);

  const eventStyleGetter = useCallback((event: any) => {
    const backgroundColor = getTaskColor(event.resource || { title: event.title, status: 'pending' });

    return {
      style: {
        backgroundColor,
        color: '#1a1a1a',
        border: 'none',
        borderRadius: '4px',
        opacity: 1
      }
    };
  }, []);

  // Add a function to help debug the schedule structure
  const debugScheduleStructure = useCallback(() => {
    if (!multiWeekSchedule || !multiWeekSchedule.length) {
      console.log('No schedule data to debug');
      return;
    }

    const summary = {
      weeks: multiWeekSchedule.length,
      days: 0,
      tasks: 0,
      daysWithDates: 0,
      tasksWithValidTimes: 0
    };

    multiWeekSchedule.forEach((week, weekIdx) => {
      if (!week.days || !Array.isArray(week.days)) {
        console.log(`Week ${weekIdx + 1} has no valid days array`);
        return;
      }

      summary.days += week.days.length;

      week.days.forEach((day, dayIdx) => {
        if (day.date) summary.daysWithDates++;

        if (!day.tasks || !Array.isArray(day.tasks)) {
          console.log(`Week ${weekIdx + 1}, Day ${dayIdx + 1} (${day.day}) has no tasks array`);
          return;
        }

        summary.tasks += day.tasks.length;

        day.tasks.forEach((task, taskIdx) => {
          const hasValidTime = task.time && task.time.includes('-');
          if (hasValidTime) summary.tasksWithValidTimes++;

          if (!hasValidTime) {
            console.log(`Invalid time format for task: Week ${weekIdx + 1}, Day ${dayIdx + 1}, Task ${taskIdx + 1}: ${task.title} - ${task.time}`);
          }
        });
      });
    });

    console.log('Schedule summary:', summary);

    if (summary.tasks > 0 && summary.tasksWithValidTimes === 0) {
      console.warn('ALERT: No tasks have properly formatted time ranges!');
    }
  }, [multiWeekSchedule]);

  // 4. Group all useEffect hooks
  useEffect(() => {
    // ...existing fetchTasks effect...
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
    // ...existing fetchSavedSchedule effect...
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

  useEffect(() => {
    // ...existing debug logging effect...
    if (multiWeekSchedule && multiWeekSchedule.length > 0) {
      console.log('Schedule data available:', multiWeekSchedule);
      const events = convertTasksToEvents();
      console.log('Converted events:', events);
    } else {
      console.log('No schedule data available');
    }
  }, [multiWeekSchedule, convertTasksToEvents]);

  // Add useEffect to run the debug function when schedule changes
  useEffect(() => {
    debugScheduleStructure();
  }, [multiWeekSchedule, debugScheduleStructure]);

  // 5. Regular functions after all hooks
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
    setEditingTask({
      dayIndex,
      taskIndex: -1,
      task: {
        time: "09:00 - 10:00",
        title: "New Task",
        details: "Task description",
        status: "pending"
      }
    });
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

  // Modified handleSaveEdit to handle new tasks
  const handleSaveEdit = async () => {
    if (!editingTask || !multiWeekSchedule.length) return;
    const { dayIndex, taskIndex, task } = editingTask;

    const updatedSchedules = [...multiWeekSchedule];
    const currentWeek = { ...updatedSchedules[currentWeekIndex] };
    currentWeek.days = currentWeek.days.map((day, dIndex) => {
      if (dIndex === dayIndex) {
        if (taskIndex === -1) {
          // Add new task
          return {
            ...day,
            tasks: [...day.tasks, task]
          };
        } else {
          // Update existing task
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
      }
      return day;
    });
    updatedSchedules[currentWeekIndex] = currentWeek;

    await saveScheduleChanges(updatedSchedules);
    setMultiWeekSchedule(updatedSchedules);
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

  const handleNextWeek = useCallback(() => {
    setCurrentWeekIndex(prev => Math.min(prev + 1, multiWeekSchedule.length - 1));
  }, [multiWeekSchedule.length]);

  const handlePrevWeek = useCallback(() => {
    setCurrentWeekIndex(prev => Math.max(0, prev - 1));
  }, []);

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

  const handleAddToGoogleCalendar = async (task: ScheduleTask) => {
    try {
      if (!googleCalendarService.isConnected()) {
        setMessage('Please connect to Google Calendar first');
        return;
      }

      const [startTime] = task.time.split('-');
      const startDate = new Date();
      const [hours, minutes] = startTime.split(':').map(Number);
      startDate.setHours(hours, minutes, 0);

      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);

      await googleCalendarService.createEvent({
        title: task.title,
        description: task.details,
        start: startDate,
        end: endDate,
      });

      setMessage('Task added to Google Calendar');
    } catch (err) {
      const error = err as Error;
      console.error('Error adding to Google Calendar:', error);
      setMessage('Failed to add task to Google Calendar');
    }
  };

  const handleStoragePreferenceChange = (useGoogle: boolean) => {
    setUseGoogleCalendar(useGoogle);
    localStorage.setItem('useGoogleCalendar', String(useGoogle));
    setShowStorageOptionModal(false);
  };

  // Function to convert tasks to calendar events - clean with proper types
  const findDayIndexByDate = (date: string): number => {
    if (!multiWeekSchedule || !multiWeekSchedule.length) return -1;

    const week = multiWeekSchedule[currentWeekIndex];
    return week.days.findIndex(d => d.date === date);
  };

  // Add missing toolbar handlers
  const handleNavigate = useCallback((newDate: Date, view: View, action: NavigateAction) => {
    switch (action) {
      case 'PREV':
        handlePrevWeek();
        break;
      case 'NEXT':
        handleNextWeek();
        break;
      case 'TODAY':
        setCurrentWeekIndex(0);
        break;
      default:
        break;
    }
  }, [handlePrevWeek, handleNextWeek]);

  // Add task click handler
  const handleTaskClick = useCallback((event: any) => {
    setSelectedTask(event.resource);
    setShowTaskModal(true);
  }, []);

  // Add task update handler
  const handleTaskUpdate = async (updatedTask: ScheduleTask) => {
    if (!selectedTask) return;
    
    const dayIndex = findDayIndexByDate(new Date(updatedTask.time.split('-')[0]).toISOString().split('T')[0]);
    const taskIndex = multiWeekSchedule[currentWeekIndex].days[dayIndex].tasks
      .findIndex(t => t.title === selectedTask.title && t.time === selectedTask.time);
    
    await handleUpdateTask(dayIndex, taskIndex, updatedTask);
    setShowTaskModal(false);
    setSelectedTask(null);
  };

  // Add task delete handler
  const handleTaskDelete = async () => {
    if (!selectedTask) return;
    
    const dayIndex = findDayIndexByDate(new Date(selectedTask.time.split('-')[0]).toISOString().split('T')[0]);
    const taskIndex = multiWeekSchedule[currentWeekIndex].days[dayIndex].tasks
      .findIndex(t => t.title === selectedTask.title && t.time === selectedTask.time);
    
    await handleDeleteTask(dayIndex, taskIndex);
    setShowTaskModal(false);
    setSelectedTask(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="schedule-container">
      {/* Header section */}
      <header className="schedule-header">
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

        <div className="header-actions">
          <div className="view-selector">
            <button
              className={`view-button ${calendarView === 'month' ? 'active' : ''}`}
              onClick={() => setCalendarView('month')}
            >
              Month
            </button>
            <button
              className={`view-button ${calendarView === 'week' ? 'active' : ''}`}
              onClick={() => setCalendarView('week')}
            >
              Week
            </button>
            <button
              className={`view-button ${calendarView === 'day' ? 'active' : ''}`}
              onClick={() => setCalendarView('day')}
            >
              Day
            </button>
          </div>
          <button
            className="settings-button"
            onClick={() => setShowGenerateScheduleModal(true)}
          >
            <FiSettings className="button-icon" />
            Preferences
          </button>
        </div>
      </header>

      {/* Upload section */}
      <div className="upload-section">
        <div className="upload-header">
          <h3><FiUpload className="section-icon" /> Upload Course Materials</h3>
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

      {/* Calendar section */}
      <div className="calendar-container">
        {message && <div className="message">{message}</div>}
        
        <div className="week-navigation">
          <button 
            className="nav-button"
            onClick={() => handleNavigate('PREV')}
            disabled={currentWeekIndex === 0}
          >
            Previous Week
          </button>
          <span className="current-week">Week {currentWeekIndex + 1}</span>
          <button 
            className="nav-button"
            onClick={() => handleNavigate('NEXT')}
            disabled={currentWeekIndex >= (multiWeekSchedule.length - 1)}
          >
            Next Week
          </button>
        </div>

        {convertTasksToEvents().length === 0 ? (
          <div className="empty-calendar-message">
            <p>No events to display. Upload course materials to generate a schedule.</p>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={convertTasksToEvents()}
            startAccessor="start"
            endAccessor="end"
            views={['month', 'week', 'day']}
            defaultView={calendarView}
            view={calendarView}
            onView={(newView) => setCalendarView(newView as 'month' | 'week' | 'day')}
            onNavigate={(newDate: Date, view: View, action: NavigateAction) => handleNavigate(newDate, view, action)}
            onSelectEvent={handleTaskClick}
            step={15}
            timeslots={4}
            toolbar={true}
            eventPropGetter={eventStyleGetter}
            components={{
              event: TaskEventComponent
            }}
            min={new Date(0, 0, 0, 7, 0, 0)}
            max={new Date(0, 0, 0, 23, 0, 0)}
          />
        )}

        {/* Task Modal */}
        {showTaskModal && selectedTask && (
          <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
            <div className="task-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Task Details</h3>
                <button 
                  className="close-button"
                  onClick={() => setShowTaskModal(false)}
                >
                  <FiX />
                </button>
              </div>
              
              <div className="modal-content">
                <div className="task-info">
                  <div className="info-row">
                    <FiClock className="info-icon" />
                    <span>{selectedTask.time}</span>
                  </div>
                  <div className="info-row">
                    <FiCalendar className="info-icon" />
                    <span>{selectedTask.dueDate || 'No due date'}</span>
                  </div>
                  <div className={`priority-badge priority-${selectedTask.priority || 'medium'}`}>
                    {selectedTask.priority || 'medium'} priority
                  </div>
                </div>

                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={selectedTask.title}
                    onChange={e => setSelectedTask({
                      ...selectedTask,
                      title: e.target.value
                    })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Details</label>
                  <textarea
                    value={selectedTask.details}
                    onChange={e => setSelectedTask({
                      ...selectedTask,
                      details: e.target.value
                    })}
                    className="form-input"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={selectedTask.status}
                    onChange={e => setSelectedTask({
                      ...selectedTask,
                      status: e.target.value as ScheduleTask['status']
                    })}
                    className="form-input"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  className="delete-button"
                  onClick={handleTaskDelete}
                >
                  <FiTrash /> Delete
                </button>
                <div className="right-buttons">
                  <button 
                    className="cancel-button"
                    onClick={() => setShowTaskModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="save-button"
                    onClick={() => handleTaskUpdate(selectedTask)}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule;
