import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, View, NavigateAction, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';
import {
  FiCalendar,
  FiSettings,
  // FiUpload,
 
  // FiX,
  // FiPlusCircle,
  FiClock,
  FiMapPin,
  // FiUser,
  FiCode,
  FiBook,
  FiGrid,
  FiList,
  FiUploadCloud,
  FiFile,
  FiTrash2,
  FiAlertCircle
} from 'react-icons/fi';

import { WeeklySchedule, CalendarEvent } from '../types/types';
import '../styles/pages/Schedule.css';
import { tasksToEvents, classesToEvents } from '../utils/calendarHelpers';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import TaskModal from '../components/TaskModal';
import ClassModal from '../components/ClassModal';

// Set up the moment localizer properly
const localizer = momentLocalizer(moment);

// Custom event component for the calendar
const TaskEventComponent = ({ event }: { event: CalendarEvent }) => {
  const isClassEvent = event.category === 'class';

  return (
    <div className={`task-event ${isClassEvent ? 'class-event' : `priority-${event.priority || 'medium'}`}`}>
      <div className="task-event-title">{event.title}</div>
      {event.description && <div className="task-event-desc">{event.description}</div>}
    </div>
  );
};

export function Schedule() {
  // Add events state
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // State for calendar UI
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('week');
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [onboardingStep, setOnboardingStep] = useState<number>(1);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'calendar' | 'grid' | 'list'>('calendar');
  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);

  // State for task management
  const [multiWeekSchedule, setMultiWeekSchedule] = useState<WeeklySchedule[] | null>(null);
  const [universitySchedule, setUniversitySchedule] = useState<any>(null);
  const [hasUniversitySchedule, setHasUniversitySchedule] = useState<boolean>(false);

  // State for preferences
  const [calendarPreferences, setCalendarPreferences] = useState({
    startHour: 8,
    endHour: 20,
    defaultView: 'week',
    showWeekends: true,
    defaultDuration: 60,
    breakDuration: 15,
  });
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  // State for specific filtering
  const [showStudyEvents, setShowStudyEvents] = useState<boolean>(true);
  const [showClassEvents, setShowClassEvents] = useState<boolean>(true);

  // State for adding a university class
  const [newClass, setNewClass] = useState({
    courseName: '',
    courseCode: '',
    startTime: '',
    endTime: '',
    location: '',
    professor: '',
    day: '',
    semesterDates: {
      startDate: new Date(),
      endDate: new Date()
    }
  });

  // State for file upload
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // DAYS array for university schedule
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Add studyData to the component state (place with other useState declarations)
  const [studyData, setStudyData] = useState<any[]>([]);

  useEffect(() => {
    fetchScheduleData();
  }, []);

  // Fetch schedule data from the API
  const fetchScheduleData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('Authentication token not found');
        return;
      }

      // Get university schedule
      const uniResponse = await axios.get('http://localhost:5000/university-schedule', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (uniResponse.data && uniResponse.data.weeklySchedule) {
        setUniversitySchedule(uniResponse.data);
        setHasUniversitySchedule(true);
      }

      // Get study schedule (AI-generated)
      const studyResponse = await axios.get('http://localhost:5000/ai/get-schedule', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (studyResponse.data && studyResponse.data.weeklySchedule) {
        setMultiWeekSchedule(studyResponse.data.weeklySchedule);
      }
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      setMessage('Failed to load schedule data');
    }
  };

  // Update the processEvents function with better debugging
  const processEvents = useCallback((studyData: any, classData: any) => {
    try {
      console.log('Processing events with:', {
        studyData: studyData?.slice(0, 2),
        classData: classData ? 'present' : 'absent',
        classDataStructure: classData ? JSON.stringify(classData).substring(0, 100) + '...' : 'none'
      });

      let updatedEvents: CalendarEvent[] = [];

      if (showStudyEvents && Array.isArray(studyData)) {
        console.log('Converting study data to events, length:', studyData.length);
        const studyEvents = tasksToEvents(studyData);
        console.log('Created study events:', studyEvents.slice(0, 2));
        updatedEvents = [...updatedEvents, ...studyEvents];
      }

      if (showClassEvents && hasUniversitySchedule && classData) {
        console.log('Converting class data to events, structure:', {
          hasWeeklySchedule: classData.weeklySchedule ? true : false,
          weeklyScheduleLength: classData.weeklySchedule?.length,
          isArray: Array.isArray(classData.weeklySchedule)
        });
        const classEvents = classesToEvents(classData);
        console.log('Created class events:', classEvents.slice(0, 2));
        updatedEvents = [...updatedEvents, ...classEvents];
      }

      console.log('Final events to be set:', {
        totalEvents: updatedEvents.length,
        sampleEvents: updatedEvents.slice(0, 2)
      });

      setEvents(updatedEvents);
    } catch (error) {
      console.error('Error processing events:', error);
      setError('Failed to process events. Please try again.');
    }
  }, [showStudyEvents, showClassEvents, hasUniversitySchedule, setEvents, tasksToEvents, classesToEvents, setError]);

  // Fix the fetchUniversitySchedule function to handle data correctly
  const fetchUniversitySchedule = useCallback(async () => {
    try {
      console.log('Fetching university schedule data...');
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('Authentication token not found');
        return;
      }

      // Get university schedule
      const uniResponse = await axios.get('http://localhost:5000/university-schedule', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('University schedule API response:', JSON.stringify(uniResponse.data).substring(0, 200));

      if (uniResponse.data && Array.isArray(uniResponse.data.weeklySchedule)) {
        // Make sure the data has the correct structure
        const formattedData = {
          weeklySchedule: uniResponse.data.weeklySchedule.map(day => ({
            day: day.day,
            classes: Array.isArray(day.classes) ? day.classes.map(cls => ({
              courseName: cls.courseName,
              startTime: cls.startTime,
              endTime: cls.endTime,
              location: cls.location || ''
            })) : []
          }))
        };

        console.log('Formatted university schedule data:', {
          weeklyScheduleLength: formattedData.weeklySchedule.length,
          sampleDay: formattedData.weeklySchedule[0]
        });

        setUniversitySchedule(formattedData);
        setHasUniversitySchedule(true);

        // Process events with the properly formatted data
        processEvents(studyData, formattedData);
      } else {
        console.warn('Invalid university schedule format:', uniResponse.data);
        setHasUniversitySchedule(false);
      }
    } catch (error) {
      console.error('Error fetching university schedule data:', error);
      setMessage('Failed to load university schedule data');
    }
  }, [processEvents, studyData, setMessage, setUniversitySchedule, setHasUniversitySchedule]);

  // Event style getter for the calendar
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    let style: React.CSSProperties = {
      backgroundColor: 'white',
      color: '#333',
      border: '1px solid #ddd'
    };

    if (event.category === 'class') {
      // University class styling
      style.backgroundColor = '#e8f4f8';
      style.borderLeft = '4px solid #3498db';
    } else {
      // Study task styling based on priority
      switch(event.priority) {
        case 'high':
          style.borderLeft = '4px solid #ef4444';
          style.backgroundColor = '#fee2e2';
          break;
        case 'medium':
          style.borderLeft = '4px solid #f59e0b';
          style.backgroundColor = '#fef3c7';
          break;
        case 'low':
          style.borderLeft = '4px solid #10b981';
          style.backgroundColor = '#d1fae5';
          break;
      }
    }

    return { style };
  }, []);

  // Check if there's any data to display in the calendar
  const hasCalendarData = useCallback(() => {
    return (
      (showStudyEvents && multiWeekSchedule && multiWeekSchedule.length > 0) ||
      (showClassEvents && hasUniversitySchedule)
    );
  }, [multiWeekSchedule, hasUniversitySchedule, showStudyEvents, showClassEvents]);

  // Handler for adding a university class
  const handleAddClass = useCallback(async () => {
    if (!newClass.day || !newClass.courseName || !newClass.startTime || !newClass.endTime) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      // Check for duplicates
      const isDuplicate = events.some(event => 
        event.category === 'class' &&
        event.title === newClass.courseName &&
        event.resource?.day === newClass.day &&
        event.start.toTimeString().includes(newClass.startTime)
      );

      if (isDuplicate) {
        setError('This class already exists in the schedule');
        return;
      }

      // Validate semester dates
      const startDate = new Date(newClass.semesterDates.startDate);
      const endDate = new Date(newClass.semesterDates.endDate);

      if (endDate <= startDate) {
        setError('End date must be after start date');
        return;
      }

      // Create class with semester dates
      const classData = {
        ...newClass,
        semesterDates: {
          startDate,
          endDate
        }
      };

      const response = await axios.post(
        'http://localhost:5000/api/schedule/class',
        classData,
        { headers: { Authorization: `Bearer ${token}` }}
      );

      if (response.data) {
        // Reset form
        setNewClass({
          courseName: '',
          courseCode: '',
          startTime: '',
          endTime: '',
          location: '',
          professor: '',
          day: '',
          semesterDates: {
            startDate: new Date(),
            endDate: new Date()
          }
        });
        setShowAddModal(false);
        setError(null);

        // Refresh events
        fetchScheduleData();
      }
    } catch (error) {
      console.error('Error adding class:', error);
      setError('Failed to add class');
    }
  }, [newClass, events, fetchScheduleData]);

  const handleClassAdd = async (classData: any) => {
    try {
      console.log('Adding new class to calendar:', classData);
      const formattedClass = {
        title: classData.courseName,
        start: new Date(`${classData.date}T${classData.startTime}`),
        end: new Date(`${classData.date}T${classData.endTime}`),
        allDay: false,
        category: 'class',
        priority: 'medium',
        resource: {
          type: 'class',
          ...classData
        }
      };

      // Add to existing events
      setEvents(prevEvents => [...prevEvents, formattedClass]);

      // Update preferences if needed
      if (formattedClass.start.getHours() < calendarPreferences.startHour) {
        setCalendarPreferences(prev => ({
          ...prev,
          startHour: formattedClass.start.getHours()
        }));
      }
      if (formattedClass.end.getHours() > calendarPreferences.endHour) {
        setCalendarPreferences(prev => ({
          ...prev,
          endHour: formattedClass.end.getHours()
        }));
      }

      // Trigger calendar refresh
      setTimeout(() => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
          calendarApi.refetchEvents();
        }
      }, 100);

    } catch (error) {
      console.error('Error adding class to calendar:', error);
      setError('Failed to add class to calendar');
    }
  };

  // Handler for calendar navigation
  const handleNavigate = (newDate: Date, view: View, action: NavigateAction) => {
    setSelectedDate(newDate);
  };

  // Handler for clicking on a task
  const handleTaskClick = (event: CalendarEvent) => {
    setSelectedTask(event.resource);
    setShowTaskModal(true);
  };

  // Combine class events with study events for the calendar
  const convertTasksToEvents = useCallback(() => {
    const studyEvents = multiWeekSchedule ? tasksToEvents(multiWeekSchedule) : [];
    const classEvents = universitySchedule ? classesToEvents(universitySchedule) : [];

    return [
      ...(showStudyEvents ? studyEvents : []),
      ...(showClassEvents ? classEvents : [])
    ];
  }, [multiWeekSchedule, showStudyEvents, showClassEvents, universitySchedule]);

  // Function to render the preferences modal
  const renderPreferencesModal = () => {
    if (!showPreferencesModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content preferences-modal">
          <h2>Calendar Preferences</h2>
          <div className="preferences-grid">
            <div className="preference-item">
              <label>Start Hour</label>
              <input
                type="number"
                min="0"
                max="23"
                value={calendarPreferences.startHour}
                onChange={(e) => setCalendarPreferences({
                  ...calendarPreferences,
                  startHour: parseInt(e.target.value)
                })}
                className="time-picker"
              />
            </div>
            <div className="preference-item">
              <label>End Hour</label>
              <input
                type="number"
                min="0"
                max="23"
                value={calendarPreferences.endHour}
                onChange={(e) => setCalendarPreferences({
                  ...calendarPreferences,
                  endHour: parseInt(e.target.value)
                })}
                className="time-picker"
              />
            </div>
            <div className="preference-item">
              <label>Default Duration (minutes)</label>
              <input
                type="number"
                min="15"
                max="180"
                step="15"
                value={calendarPreferences.defaultDuration}
                onChange={(e) => setCalendarPreferences({
                  ...calendarPreferences,
                  defaultDuration: parseInt(e.target.value)
                })}
                className="time-picker"
              />
            </div>
            <div className="preference-item">
              <label>Break Duration (minutes)</label>
              <input
                type="number"
                min="0"
                max="60"
                step="5"
                value={calendarPreferences.breakDuration}
                onChange={(e) => setCalendarPreferences({
                  ...calendarPreferences,
                  breakDuration: parseInt(e.target.value)
                })}
                className="time-picker"
              />
            </div>
            <div className="preference-item">
              <label>Show Weekends</label>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={calendarPreferences.showWeekends}
                  onChange={(e) => setCalendarPreferences({
                    ...calendarPreferences,
                    showWeekends: e.target.checked
                  })}
                />
                <span className="toggle-label"></span>
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button onClick={() => handlePreferencesSubmit(calendarPreferences)}>
              Save Preferences
            </button>
            <button onClick={() => setShowPreferencesModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handlePreferencesSubmit = (updatedPreferences: any) => {
    console.log('Updating preferences:', {
      oldPreferences: calendarPreferences,
      newPreferences: updatedPreferences
    });
    setCalendarPreferences(updatedPreferences);
    setShowPreferencesModal(false);
    // Re-process events with new preferences
    console.log('Reprocessing events with new preferences');
    processEvents(events, null);
  };

  const renderDebugInfo = () => {
    if (!events.length) {
      return (
        <div className="empty-calendar-message">
          <h3>No Events Found</h3>
          <p>Debug Info:</p>
          <ul>
            <li>Total Events: {events.length}</li>
            <li>Show Study Events: {showStudyEvents.toString()}</li>
            <li>Show Class Events: {showClassEvents.toString()}</li>
          </ul>
        </div>
      );
    }
    return null;
  };

  // Function to render the add class modal
  const renderAddClassModal = () => (
    <div className="modal-overlay" onClick={() => setShowAddClassModal(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Add New Class</h2>
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label className="form-label">Day</label>
          <select
            value={newClass.day}
            onChange={(e) => setNewClass({ ...newClass, day: e.target.value })}
            className="form-input"
          >
            <option value="">Select Day</option>
            {DAYS.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Course Code</label>
          <div className="input-group">
            <FiCode className="input-icon" />
            <input
              type="text"
              placeholder="e.g. CS101"
              value={newClass.courseCode}
              onChange={(e) => setNewClass({ ...newClass, courseCode: e.target.value })}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Course Name</label>
          <div className="input-group">
            <FiBook className="input-icon" />
            <input
              type="text"
              placeholder="e.g. Introduction to Computer Science"
              value={newClass.courseName}
              onChange={(e) => setNewClass({ ...newClass, courseName: e.target.value })}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label className="form-label">Start Time</label>
            <div className="input-group">
              <FiClock className="input-icon" />
              <input
                type="time"
                value={newClass.startTime}
                onChange={(e) => setNewClass({ ...newClass, startTime: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group half">
            <label className="form-label">End Time</label>
            <div className="input-group">
              <FiClock className="input-icon" />
              <input
                type="time"
                value={newClass.endTime}
                onChange={(e) => setNewClass({ ...newClass, endTime: e.target.value })}
                className="form-input"
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Location</label>
          <div className="input-group">
            <FiMapPin className="input-icon" />
            <input
              type="text"
              placeholder="e.g. Room 101, Building A"
              value={newClass.location}
              onChange={(e) => setNewClass({ ...newClass, location: e.target.value })}
              className="form-input"
            />
          </div>
        </div>

        {/* Add semester dates */}
        <div className="form-group">
          <h3>Semester Dates</h3>
          <div className="date-inputs">
            <div className="input-group">
              <label>Start Date</label>
              <input
                type="date"
                value={formatDateForInput(newClass.semesterDates.startDate)}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="form-input"
              />
              <span className="date-format">Current format: {
                newClass.semesterDates.startDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })
              }</span>
            </div>
            <div className="input-group">
              <label>End Date</label>
              <input
                type="date"
                value={formatDateForInput(newClass.semesterDates.endDate)}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="form-input"
              />
              <span className="date-format">Current format: {
                newClass.semesterDates.endDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })
              }</span>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={handleModalSubmit} className="primary-button">
            Add Class
          </button>
          <button onClick={() => setShowAddClassModal(false)} className="secondary-button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // Function to render onboarding guide
  const renderOnboardingGuide = () => {
    return (
      <div className="onboarding-guide">
        <h3>Getting Started</h3>
        <div className={`step ${onboardingStep === 1 ? 'active' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-text">Add your university classes first</span>
          <button onClick={() => setShowAddClassModal(true)} className="add-button">
            Add Class
          </button>
        </div>
        <div className={`step ${onboardingStep === 2 ? 'active' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-text">Upload course materials to generate study schedule</span>
          {hasUniversitySchedule && (
            <button className="generate-button">
              Generate Schedule
            </button>
          )}
        </div>
      </div>
    );
  };

  // Function to render event filters
  const renderEventFilter = () => {
    return (
      <div className="schedule-actions">
        <div className="event-filter">
          <label className="filter-option">
            <input
              type="checkbox"
              checked={showClassEvents}
              onChange={e => setShowClassEvents(e.target.checked)}
            />
            Show Classes
          </label>
          <label className="filter-option">
            <input
              type="checkbox"
              checked={showStudyEvents}
              onChange={e => setShowStudyEvents(e.target.checked)}
            />
            Show Study Tasks
          </label>
        </div>

        <div className="view-selector">
          <button
            className={`view-button ${activeView === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveView('calendar')}
          >
            <FiCalendar className="button-icon" /> Calendar View
          </button>
          <button
            className={`view-button ${activeView === 'grid' ? 'active' : ''}`}
            onClick={() => setActiveView('grid')}
          >
            <FiGrid className="button-icon" /> Grid View
          </button>
          <button
            className={`view-button ${activeView === 'list' ? 'active' : ''}`}
            onClick={() => setActiveView('list')}
          >
            <FiList className="button-icon" /> List View
          </button>
        </div>
      </div>
    );
  };

  // Function to handle task deletion
  const handleTaskDelete = () => {
    setShowTaskModal(false);
    setSelectedTask(null);
  };

  // Function to handle task update
  const handleTaskUpdate = (updatedTask: any) => {
    setSelectedTask(updatedTask);
    // Implementation would go here to update the task in the backend
    setShowTaskModal(false);
  };

  // File handling functions
  const handleFileDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragleave') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter(
        file => file.type === 'application/pdf'
      );

      if (validFiles.length > 0) {
        setFiles(prevFiles => [...prevFiles, ...validFiles]);
        e.dataTransfer.clearData();
      } else {
        setUploadMessage('Only PDF files are accepted');
        setUploadStatus('error');
        setTimeout(() => setUploadStatus('idle'), 3000);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) { const validFiles = Array.from(e.target.files).filter(
        file => file.type === 'application/pdf'
      );

      if (validFiles.length > 0) {
        setFiles(prevFiles => [...prevFiles, ...validFiles]);
      } else {
        setUploadMessage('Only PDF files are accepted');
        setUploadStatus('error');
        setTimeout(() => setUploadStatus('idle'), 3000);
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      setUploadMessage('Please select at least one file to upload');
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
      return;
    }

    try {
      setUploadStatus('uploading');
      setUploadMessage('Uploading files, please wait...');

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await axios.post(
        'http://localhost:5000/api/upload-documents',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          },
          timeout: 30000 // 30 seconds timeout for potentially large files
        }
      );

      if (response.data && response.data.weeklySchedule) {
        // Update schedule with the newly generated data
        setMultiWeekSchedule(response.data.weeklySchedule);
        processEvents(response.data.weeklySchedule, universitySchedule);

        setUploadStatus('success');
        setUploadMessage('Schedule successfully generated from your documents!');
        setFiles([]);

        // Clear success message after a few seconds
        setTimeout(() => {
          setUploadStatus('idle');
          setUploadMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      setUploadStatus('error');
      setUploadMessage(
        error instanceof Error
          ? `Upload failed: ${error.message}`
          : 'Upload failed. Please try again.'
      );

      // Clear error message after a few seconds
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadMessage('');
      }, 5000);
    }
  };

  useEffect(() => {
    const handleUniversityScheduleUpdate = () => {
      console.log('UniversitySchedule update detected - refreshing data');
      fetchScheduleData(); // Call your existing fetchScheduleData function
    };

    window.addEventListener('universityScheduleUpdated', handleUniversityScheduleUpdate);

    return () => {
      window.removeEventListener('universityScheduleUpdated', handleUniversityScheduleUpdate);
    };
  }, [fetchScheduleData]);

  useEffect(() => {
    const handleClassAddedEvent = (event) => {
      console.log('Detected class addition event, refreshing calendar');
      fetchUniversitySchedule();
    };

    window.addEventListener('classAdded', handleClassAddedEvent);

    return () => {
      window.removeEventListener('classAdded', handleClassAddedEvent);
    };
  }, [fetchUniversitySchedule]);

  const handleModalSubmit = async () => {
    // Validate form
    if (!newClass.day || !newClass.courseName || !newClass.startTime || !newClass.endTime) {
      setError('Please fill in all required fields');
      return;
    }

    const success = await handleAddClass(newClass);
    if (success) {
      // Dispatch a custom event to notify that a class was added
      window.dispatchEvent(new CustomEvent('classAdded', {
        detail: { classData: newClass }
      }));

      // Close modal and reset form
      setShowAddClassModal(false);
      setNewClass({
        day: '',
        courseName: '',
        startTime: '',
        endTime: '',
        location: ''
      });

      setError(null);
    }
  };

  // Fix the handleDateSelect function
  const handleDateSelect = (slotInfo: { start: Date, end: Date, slots: Date[], action: 'select' | 'click' | 'doubleClick' }) => {
    setSelectedDate(slotInfo.start);

    const newEvent: CalendarEvent = {
      id: `task-${Math.random().toString(36).substr(2, 9)}`,
      title: "New Task",
      start: slotInfo.start,
      end: slotInfo.end,
      allDay: false,
      category: 'task',
      priority: 'medium',
      resource: {}
    };

    setEvents(prevEvents => [...prevEvents, newEvent]);
  };

  const fetchAllEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch both tasks and university classes
      const [tasksResponse, classesResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/tasks', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/university-schedule', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Convert tasks and classes to calendar events
      const taskEvents = tasksToEvents(tasksResponse.data);
      const classEvents = classesResponse.data?.weeklySchedule
        ? classesToEvents(classesResponse.data)
        : [];

      // Combine and set all events
      setEvents([...taskEvents, ...classEvents]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load schedule');
      setLoading(false);
    }
  };

  // Add event listener for university schedule updates
  useEffect(() => {
    const handleUniversityScheduleUpdate = () => {
      console.log('University schedule updated, refreshing calendar...');
      fetchAllEvents();
    };

    window.addEventListener('universityScheduleUpdated', handleUniversityScheduleUpdate);

    return () => {
      window.removeEventListener('universityScheduleUpdated', handleUniversityScheduleUpdate);
    };
  }, []);

  const handleEventClick = (event: CalendarEvent) => {
    if (event.category === 'class') {
      setSelectedClass(event);
      setShowClassModal(true);
    } else {
      setSelectedTask(event);
      setShowTaskModal(true);
    }
  };

  // Add a helper function for date formatting
  const formatDateForInput = (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).split('/').reverse().join('-'); // Convert DD/MM/YYYY to YYYY-MM-DD for input field
  };

  const handleDateChange = (type: 'startDate' | 'endDate', dateString: string) => {
    const date = new Date(dateString);
    setNewClass(prev => ({
      ...prev,
      semesterDates: {
        ...prev.semesterDates,
        [type]: date
      }
    }));
  };

  return (
    <div className="schedule-container">
      {renderOnboardingGuide()}
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
            onClick={() => setShowPreferencesModal(true)}
          >
            <FiSettings className="button-icon" />
            Preferences
          </button>
        </div>
      </header>

      {renderEventFilter()}

      {/* Add file upload section before the calendar */}
      <div className="upload-section">
        <div className="upload-header">
          <h3>
            <FiUploadCloud className="section-icon" />
            Generate Schedule from Documents
          </h3>
          <p className="upload-description">
            Upload your syllabus, assignment details, or course outlines as PDFs to automatically generate a study schedule.
          </p>
        </div>

        <div
          className={`upload-area ${isDragging ? 'dragging' : ''}`}
          onDragEnter={handleFileDrag}
          onDragLeave={handleFileDrag}
          onDragOver={handleFileDrag}
          onDrop={handleFileDrop}
          onClick={triggerFileInput}
        >
          <FiUploadCloud className="upload-icon" />
          <p className="upload-text">Drag and drop files here or click to browse</p>
          <span className="upload-button">Select Files</span>
          <p className="file-type">Supported file types: PDF</p>

          <input
            type="file"
            ref={fileInputRef}
            className="file-input"
            onChange={handleFileSelect}
            multiple
            accept="application/pdf"
          />
        </div>

        {/* Display selected files */}
        {files.length > 0 && (
          <div className="file-list">
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <FiFile className="file-icon" />
                <span className="file-name">{file.name}</span>
                <button
                  className="remove-file"
                  onClick={() => handleRemoveFile(index)}
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}

            <div className="upload-actions">
              <button
                className="upload-action-button primary"
                onClick={uploadFiles}
                disabled={uploadStatus === 'uploading'}
              >
                {uploadStatus === 'uploading' ? 'Uploading...' : 'Generate Schedule'}
              </button>

              <button
                className="upload-action-button"
                onClick={() => setFiles([])}
                disabled={uploadStatus === 'uploading'}
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* Status messages */}
        {uploadStatus !== 'idle' && (
          <div className={`upload-message ${uploadStatus}`}>
            {uploadStatus === 'error' && <FiAlertCircle />}
            {uploadMessage}
          </div>
        )}
      </div>

      {/* Calendar section - Only show when there's data */}
      {activeView === 'calendar' && (
        <div className="calendar-container">
          {message && <div className="message">{message}</div>}
          <Calendar
            localizer={localizer}
            events={convertTasksToEvents()}
            startAccessor="start"
            endAccessor="end"
            views={['month', 'week', 'day']}
            defaultView={calendarView}
            view={calendarView}
            onView={(newView) => setCalendarView(newView as 'month' | 'week' | 'day')}
            onNavigate={handleNavigate}
            onSelectEvent={handleEventClick}
            step={30}
            timeslots={2}
            toolbar={true}
            eventPropGetter={eventStyleGetter}
            components={{
              event: TaskEventComponent
            }}
            min={new Date(0, 0, 0, calendarPreferences.startHour)}
            max={new Date(0, 0, 0, calendarPreferences.endHour)}
            selectable
            onSelectSlot={handleDateSelect}
            dayLayoutAlgorithm="no-overlap"
            popup
            messages={{
              week: 'Week',
              day: 'Day',
              month: 'Month',
              previous: 'Back',
              next: 'Next'
            }}
            style={{ height: 650 }}
          />
        </div>
      )}

      {/* Grid view */}
      {activeView === 'grid' && (
        <div className="schedule-table-container">
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Time</th>
                {DAYS.map(day => (
                  <th key={day}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 14 }, (_, i) => {
                const hour = i + 8;
                const timeSlot = `${hour.toString().padStart(2, '0')}:00`;

                return (
                  <tr key={timeSlot}>
                    <td className="time-cell">{timeSlot}</td>
                    {DAYS.map(day => {
                      const daySchedule = universitySchedule?.weeklySchedule?.find(
                        (d: any) => d.day === day
                      );
                      const classAtTime = daySchedule?.classes?.find((c: any) => {
                        const slotTime = parseInt(timeSlot);
                        const startHour = parseInt(c.startTime);
                        const endHour = parseInt(c.endTime);
                        return slotTime >= startHour && slotTime < endHour;
                      });

                      return (
                        <td key={`${day}-${timeSlot}`} className="schedule-cell">
                          {classAtTime && (
                            <div className="class-card">
                              <div className="class-title">{classAtTime.courseName}</div>
                              <div className="class-details">
                                <div>{classAtTime.startTime} - {classAtTime.endTime}</div>
                                {classAtTime.location && (
                                  <div>{classAtTime.location}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* List view */}
      {activeView === 'list' && (
        <div className="schedule-list">
          {DAYS.map(day => {
            const daySchedule = universitySchedule?.weeklySchedule?.find(
              (d: any) => d.day === day
            );

            return (
              <div key={day} className="schedule-list-item">
                <h3>{day}</h3>
                {!daySchedule?.classes?.length ? (
                  <p className="no-classes">No classes scheduled</p>
                ) : (
                  <ul>
                    {daySchedule.classes.map((classItem: any, index: number) => (
                      <li key={`${classItem.courseName}-${index}`}>
                        <div className="class-card">
                          <div className="class-title">{classItem.courseName}</div>
                          <div className="class-details">
                            <div>{classItem.startTime} - {classItem.endTime}</div>
                            {classItem.location && (
                              <div>{classItem.location}</div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setShowTaskModal(false)} />
      )}

      {/* Class Modal */}
      {showClassModal && selectedClass && (
        <ClassModal event={selectedClass} onClose={() => setShowClassModal(false)} />
      )}

      {/* Add University Class Modal */}
      {showAddClassModal && renderAddClassModal()}

      {/* Preferences Modal */}
      {showPreferencesModal && renderPreferencesModal()}
    </div>
  );
};

export default Schedule;
