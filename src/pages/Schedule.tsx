import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, View, NavigateAction, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';
import {
  FiCalendar,
  FiUpload,
  FiSettings,
  FiClock,
  FiMapPin,
  FiCode,
  FiBook,
  FiGrid,
  FiList,
  FiFile,
  FiAlertCircle,
  FiInfo,  // Add this import
  FiCheck   // Add this import if not already present
} from 'react-icons/fi';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { WeeklySchedule, DaySchedule, CalendarEvent, ClassData } from '../types/types';
import '../styles/pages/Schedule.css';
import { tasksToEvents, classesToEvents } from '../utils/calendarHelpers';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import TaskModal from '../components/TaskModal';
import ClassModal from '../components/ClassModal';
import { scheduleService } from '../services/scheduleService';
import DebugCalendar from '../components/DebugCalendar';

// Set up the moment localizer properly
const localizer = momentLocalizer(moment);

// Custom event component for the calendar
const TaskEventComponent = ({ event }: { event: CalendarEvent }) => {
  const priorityClass = event.priority ? `priority-${event.priority}` : 'priority-medium';
  const categoryClass = event.category || '';
  const isClassEvent = event.resource?.type === 'class';
  const courseCode = event.courseCode || event.resource?.courseCode;
  
  return (
    <div 
      className={`task-event ${priorityClass} ${categoryClass}`}
      onClick={() => handleEventSelect(event)}
    >
      <div className="task-event-title">
        {isClassEvent && courseCode ? `${courseCode} - ` : ''}{event.title}
      </div>
      {event.description && (
        <div className="task-event-desc">{event.description}</div>
      )}
      {courseCode && !isClassEvent && (
        <div className="task-event-course">📚 {courseCode}</div>
      )}
      {isClassEvent && event.resource?.location && (
        <div className="task-event-location">📍 {event.resource.location}</div>
      )}
    </div>
  );
};

// Define custom Event component for React Big Calendar
const CustomEventComponent = ({ event }) => {
  // Log event details for debugging
  console.log('Rendering event:', event);
  
  return (
    <div className="custom-event-wrapper">
      <div className="custom-event-title">
        {event.title}
      </div>
      {event.resource?.location && (
        <div className="custom-event-location">
          📍 {event.resource.location}
        </div>
      )}
      {event.resource?.type === 'class' && (
        <div className="custom-event-type">
          Class
        </div>
      )}
    </div>
  );
};

// Add this function to organize classes by day 
const organizeClassesByDay = (classes: any[]) => {
  const dayMap: { [key: string]: any[] } = {
    'Monday': [],
    'Tuesday': [],
    'Wednesday': [],
    'Thursday': [],
    'Friday': [],
    'Saturday': [],
    'Sunday': []
  };
  
  classes.forEach(cls => {
    if (cls.day && dayMap[cls.day]) {
      dayMap[cls.day].push(cls);
    }
  });
  
  return dayMap;
};

// Add this for time formatting
const formatClassTime = (startTime: string, endTime: string) => {
  return `${startTime} - ${endTime}`;
};

const Schedule: React.FC = () => {
  // Add events state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // State for calendar UI
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('week');
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [onboardingStep, setOnboardingStep] = useState<number>(1);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'calendar' | 'grid' | 'list'>(() => {
    // Restore previous view from localStorage if available
    return (localStorage.getItem('scheduleActiveView') as 'calendar' | 'grid' | 'list') || 'calendar';
  });
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

  const [showUploadModal, setShowUploadModal] = useState(false);

  const [parsedDocuments, setParsedDocuments] = useState<Array<{
    title: string;
    content: any;
    status: 'parsing' | 'done' | 'error';
  }>>([]);

  const [classSchedules, setClassSchedules] = useState<any[]>([]);

  const [showDebugCalendar, setShowDebugCalendar] = useState(true);

  const [schedule, setSchedule] = useState<any>(null);

  // Add a key to force re-renders when events change
  const [renderKey, setRenderKey] = useState(0);

  const [rawClasses, setRawClasses] = useState<any[]>([]);
  const [classesByDay, setClassesByDay] = useState<{[key: string]: any[]}>({});

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const [preferences, setPreferences] = useState({
    studyHoursPerDay: 4,
    breakDuration: 15,
    weekendStudy: true,
    preferredStudyTimes: ['morning', 'evening'],
    preferredSessionLength: 2,
    dayStartTime: '08:00',
    dayEndTime: '22:00'
  });

  const [classData, setClassData] = useState([]); // Properly define classData

  useEffect(() => {
    fetchScheduleData();
    fetchClassSchedules();
    loadPreferences();
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

  const fetchClassSchedules = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/schedule/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClassSchedules(response.data);
      
      // Convert class schedules to events and add to calendar
      const classEvents = convertClassSchedulesToEvents(response.data);
      setEvents(prev => [...prev.filter(e => e.category !== 'class'), ...classEvents]);
    } catch (error) {
      console.error('Error fetching class schedules:', error);
      toast.error('Failed to fetch class schedules');
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
  const eventStyleGetter = (event: any) => {
    console.log('Styling event:', event);
    
    // Handle class events with custom styling
    if (event.category === 'class') {
      return {
        className: 'class-event',
        style: {
          backgroundColor: '#4f46e5',
          color: 'white',
          fontWeight: 500,
          border: 'none',
          borderRadius: '4px',
          padding: '2px 5px'
        }
      };
    }
    
    // Original event styling logic for other event types
    const priorityColors = {
      high: { backgroundColor: '#fee2e2', borderColor: '#ef4444', color: '#b91c1c' },
      medium: { backgroundColor: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' },
      low: { backgroundColor: '#d1fae5', borderColor: '#10b981', color: '#065f46' }
    };

    const categoryColors = {
      task: { backgroundColor: '#dbeafe', borderColor: '#3b82f6', color: '#1e40af' },
      study: { backgroundColor: '#e0e7ff', borderColor: '#6366f1', color: '#4338ca' },
      assignment: { backgroundColor: '#fae8ff', borderColor: '#d946ef', color: '#86198f' },
      exam: { backgroundColor: '#fce7f3', borderColor: '#ec4899', color: '#9d174d' }
    };

    // Use priority colors as default, override with category if available
    const priority = event.priority || 'medium';
    const category = event.category;
    
    const styleObj = priorityColors[priority] || priorityColors.medium;
    
    if (category && categoryColors[category]) {
      Object.assign(styleObj, categoryColors[category]);
    }

    return {
      className: `event-${priority} event-${category || 'default'}`,
      style: {
        backgroundColor: styleObj.backgroundColor,
        borderLeft: `4px solid ${styleObj.borderColor}`,
        color: styleObj.color
      }
    };
  };

  // Check if there's any data to display in the calendar
  const hasCalendarData = useCallback(() => {
    return (
      (showStudyEvents && multiWeekSchedule && multiWeekSchedule.length > 0) ||
      (showClassEvents && hasUniversitySchedule)
    );
  }, [multiWeekSchedule, hasUniversitySchedule, showStudyEvents, showClassEvents]);

  // Handler for adding a university class
  const handleAddClass = async (classData: ClassData) => {
    try {
      setLoading(true);
      const { allClasses } = await scheduleService.addClass(classData);
      console.log('Added class, received all classes:', allClasses);
      
      // Use the same direct conversion method as in the fetchClasses function
      const formattedEvents = allClasses.flatMap(classItem => {
        const events = [];
        try {
          // Get semester dates or use defaults
          const startDate = classItem.semesterDates?.startDate 
            ? new Date(classItem.semesterDates.startDate)
            : new Date();
            
          const endDate = classItem.semesterDates?.endDate
            ? new Date(classItem.semesterDates.endDate)
            : new Date(new Date().setMonth(new Date().getMonth() + 3));
          
          let currentDate = new Date(startDate);
          
          // Create recurring events for each class day
          while (currentDate <= endDate) {
            // Check if current day matches class day
            if (currentDate.toLocaleDateString('en-us', { weekday: 'long' }) === classItem.day) {
              // Parse class times
              const [startHour, startMinute] = classItem.startTime.split(':').map(Number);
              const [endHour, endMinute] = classItem.endTime.split(':').map(Number);
              
              // Create event start and end times
              const eventStart = new Date(currentDate);
              eventStart.setHours(startHour, startMinute, 0);
              
              const eventEnd = new Date(currentDate);
              eventEnd.setHours(endHour, endMinute, 0);
              
              events.push({
                id: `class-${classItem._id}-${currentDate.toISOString()}`,
                title: `${classItem.courseName} (${classItem.courseCode})`,
                start: eventStart,
                end: eventEnd,
                allDay: false,
                category: 'class',
                courseCode: classItem.courseCode,
                location: classItem.location,
                resource: {
                  type: 'class',
                  courseCode: classItem.courseCode,
                  location: classItem.location,
                  recurring: true,
                  day: classItem.day,
                  details: {
                    courseName: classItem.courseName,
                    professor: classItem.professor
                  }
                }
              });
            }
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
          }
        } catch (err) {
          console.error('Error processing class:', classItem, err);
        }
        return events;
      });
      
      console.log('Formatted class events for normal calendar:', formattedEvents);
      
      // Set the events directly 
      setEvents(formattedEvents);
      setShowAddClassModal(false);
      toast.success('Class added successfully!');
    } catch (error) {
      console.error('Error adding class:', error);
      toast.error('Failed to add class');
    } finally {
      setLoading(false);
    }
  };

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

  const convertClassSchedulesToEvents = (classes: any[]) => {
    const events: CalendarEvent[] = [];
    const currentDate = new Date();
    
    classes.forEach(classItem => {
      const { startDate, endDate } = classItem.semesterDates;
      let currentDay = new Date(startDate);
      
      while (currentDay <= new Date(endDate)) {
        if (currentDay.toLocaleString('en-us', { weekday: 'long' }) === classItem.day) {
          const eventStart = new Date(currentDay);
          const [startHours, startMinutes] = classItem.startTime.split(':');
          eventStart.setHours(parseInt(startHours), parseInt(startMinutes), 0);

          const eventEnd = new Date(currentDay);
          const [endHours, endMinutes] = classItem.endTime.split(':');
          eventEnd.setHours(parseInt(endHours), parseInt(endMinutes), 0);

          events.push({
            id: `class-${classItem._id}-${currentDay.toISOString()}`,
            title: `${classItem.courseName} (${classItem.courseCode})`,
            start: eventStart,
            end: eventEnd,
            courseCode: classItem.courseCode,
            location: classItem.location,
            category: 'class',
            resource: {
              type: 'class',
              courseCode: classItem.courseCode,
              location: classItem.location,
              details: {
                courseName: classItem.courseName,
                professor: classItem.professor
              }
            }
          });
        }
        currentDay.setDate(currentDay.getDate() + 1);
      }
    });

    return events;
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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || []);
    
    // Validate files before uploading
    for (const file of newFiles) {
      if (file.type !== 'application/pdf') {
        setUploadMessage('Only PDF files are allowed');
        setUploadStatus('error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setUploadMessage('File size should be less than 10MB');
        setUploadStatus('error');
        return;
      }
    }
  
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
    
    for (const file of newFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        setParsedDocuments(prev => [...prev, {
          title: file.name,
          content: null,
          status: 'parsing'
        }]);
  
        const token = localStorage.getItem('token');
        const response = await axios.post(
          'http://localhost:5000/api/parse-pdf',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${token}`
            },
            timeout: 30000 // 30 second timeout
          }
        );
  
        setParsedDocuments(prev => prev.map(doc => 
          doc.title === file.name 
            ? { ...doc, content: response.data.data, status: 'done' }
            : doc
        ));
  
        setUploadStatus('success');
        setUploadMessage(`${file.name} processed successfully`);
  
      } catch (error: any) {
        console.error(`Error parsing ${file.name}:`, error);
        
        setParsedDocuments(prev => prev.map(doc => 
          doc.title === file.name 
            ? { ...doc, status: 'error' }
            : doc
        ));
  
        setUploadStatus('error');
        setUploadMessage(
          error.response?.data?.error || 
          error.message || 
          `Error processing ${file.name}`
        );
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

  const renderUploadModal = () => {
    if (!showUploadModal) return null;
  
    return (
      <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
        <div className="pdf-upload-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Upload PDF Documents</h2>
            <button className="close-button" onClick={() => setShowUploadModal(false)}>×</button>
          </div>
  
          <div className="constraints-list">
            <h3><FiInfo /> Upload Constraints</h3>
            <ul>
              <li><FiCheck /> File type must be PDF</li>
              <li><FiCheck /> Maximum file size: 10MB</li>
              <li><FiCheck /> Maximum 5 files at once</li>
              <li><FiCheck /> Clear text content required</li>
            </ul>
          </div>
  
          <div className="upload-area" 
            onDragEnter={handleFileDrag}
            onDragLeave={handleFileDrag}
            onDragOver={handleFileDrag}
            onDrop={handleFileDrop}
            onClick={triggerFileInput}>
            <FiUpload className="upload-icon" />
            <p>Drag and drop PDF files here or click to browse</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="application/pdf"
              style={{ display: 'none' }}
            />
          </div>
  
          {files.length > 0 && (
            <div className="pdf-list">
              <h3>Selected Files</h3>
              {files.map((file, index) => (
                <div key={index} className="pdf-item">
                  <FiFile className="pdf-icon" />
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    {parsedDocuments.find(doc => doc.title === file.name) && (
                      <span className={`parse-status ${
                        parsedDocuments.find(doc => doc.title === file.name)?.status
                      }`}>
                        {parsedDocuments.find(doc => doc.title === file.name)?.status === 'parsing' 
                          ? 'Parsing...' 
                          : parsedDocuments.find(doc => doc.title === file.name)?.status === 'done'
                          ? 'Parsed ✓'
                          : 'Error!'}
                      </span>
                    )}
                  </div>
                  <button
                    className="remove-file"
                    onClick={() => handleRemoveFile(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              
              {/* Add generate schedule button after file list */}
              <button 
                className="generate-button"
                onClick={handleGenerateSchedule}
                disabled={!files.length || parsedDocuments.some(doc => doc.status !== 'done')}
              >
                {parsedDocuments.some(doc => doc.status === 'generating') 
                  ? 'Generating Schedule...' 
                  : 'Generate Schedule'}
              </button>
            </div>
          )}
  
          {uploadStatus !== 'idle' && (
            <div className={`upload-message ${uploadStatus}`}>
              {uploadStatus === 'error' && <FiAlertCircle />}
              {uploadMessage}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleGenerateSchedule = async () => {
    try {
      setParsedDocuments(prev => prev.map(doc => ({
        ...doc,
        status: doc.status === 'done' ? 'generating' : doc.status
      })));
  
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('pdfFiles', file);
      });
  
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/ai/generate-schedule',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
  
      // Convert schedule data to calendar events
      if (response.data) {
        const calendarEvents = tasksToEvents(response.data);
        setEvents(prev => [...prev, ...calendarEvents]);
        setShowUploadModal(false);
        toast.success('Schedule generated successfully!');
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
      toast.error('Failed to generate schedule. Please try again.');
    } finally {
      setParsedDocuments(prev => prev.map(doc => ({
        ...doc,
        status: 'done'
      })));
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

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const classes = await scheduleService.fetchClasses();
        console.log('Fetched classes:', classes);
        
        // Convert classes to calendar events
        const classEvents = classesToEvents(classes);
        setEvents(prev => [...prev.filter(e => e.category !== 'class'), ...classEvents]);
      } catch (error) {
        console.error('Error fetching schedules:', error);
        toast.error('Failed to load schedule');
      }
    };
  
    fetchSchedules();
  }, []);

  useEffect(() => {
    fetchAndSetClasses();
  }, []);

  const fetchAndSetClasses = async () => {
    try {
      const classes = await scheduleService.fetchClasses();
      console.log('Fetched classes in component:', classes);
      
      if (classes && classes.length > 0) {
        const classEvents = classesToEvents(classes);
        console.log('Generated class events:', classEvents);
        
        setEvents(prev => {
          const nonClassEvents = prev.filter(e => e.category !== 'class');
          return [...nonClassEvents, ...classEvents];
        });
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load class schedule');
    }
  };

  // Add this helper function
  const generateRecurringEvents = (classData: any) => {
    const events: CalendarEvent[] = [];
    const startDate = new Date(classData.semesterDates.startDate);
    const endDate = new Date(classData.semesterDates.endDate);
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (currentDate.toLocaleDateString('en-us', { weekday: 'long' }) === classData.day) {
        const [startHours, startMinutes] = classData.startTime.split(':');
        const [endHours, endMinutes] = classData.endTime.split(':');

        const eventStart = new Date(currentDate);
        eventStart.setHours(parseInt(startHours), parseInt(startMinutes), 0);

        const eventEnd = new Date(currentDate);
        eventEnd.setHours(parseInt(endHours), parseInt(endMinutes), 0);

        events.push({
          id: `class-${classData._id}-${currentDate.toISOString()}`,
          title: `${classData.courseName} (${classData.courseCode})`,
          start: eventStart,
          end: eventEnd,
          allDay: false,
          category: 'class',
          courseCode: classData.courseCode,
          location: classData.location,
          resource: {
            type: 'class',
            courseCode: classData.courseCode,
            location: classData.location,
            recurring: true,
            day: classData.day,
            details: {
              courseName: classData.courseName,
              professor: classData.professor
            }
          }
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return events;
  };

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const response = await scheduleService.fetchClasses();
        console.log('Fetched classes:', response);

        if (Array.isArray(response)) {
          const allEvents = response.flatMap(classData => generateRecurringEvents(classData));
          console.log('Generated events:', allEvents);
          setEvents(allEvents);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        toast.error('Failed to load classes');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  useEffect(() => {
    fetchClassData();
  }, []);

  const fetchClassData = async () => {
    try {
      const classes = await scheduleService.fetchClasses();
      console.log('Classes for normal calendar:', classes);
      
      if (classes && classes.length > 0) {
        // Create events in the exact format needed by the calendar
        const formattedEvents = classes.flatMap(classItem => {
          const events = [];
          
          // Get semester dates or use defaults
          const startDate = classItem.semesterDates?.startDate 
            ? new Date(classItem.semesterDates.startDate)
            : new Date();
          const endDate = classItem.semesterDates?.endDate
            ? new Date(classItem.semesterDates.endDate)
            : new Date(new Date().setMonth(new Date().getMonth() + 3));
          
          let currentDate = new Date(startDate);
          
          // Create recurring events for each class day
          while (currentDate <= endDate) {
            // Check if current day matches class day
            if (currentDate.toLocaleDateString('en-us', { weekday: 'long' }) === classItem.day) {
              // Parse class times
              const [startHour, startMinute] = classItem.startTime.split(':').map(Number);
              const [endHour, endMinute] = classItem.endTime.split(':').map(Number);
              
              // Create event start and end times
              const eventStart = new Date(currentDate);
              eventStart.setHours(startHour, startMinute, 0);
              
              const eventEnd = new Date(currentDate);
              eventEnd.setHours(endHour, endMinute, 0);
              
              events.push({
                id: `class-${classItem._id}-${currentDate.toISOString()}`,
                title: `${classItem.courseName} (${classItem.courseCode})`,
                start: eventStart,
                end: eventEnd,
                allDay: false,
                category: 'class',
                courseCode: classItem.courseCode,
                location: classItem.location,
                resource: {
                  type: 'class',
                  courseCode: classItem.courseCode,
                  location: classItem.location,
                  courseName: classItem.courseName,
                  professor: classItem.professor || ''
                }
              });
            }
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          return events;
        });
        
        console.log('Formatted class events for normal calendar:', formattedEvents);
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error('Error fetching classes for normal calendar:', error);
      toast.error('Failed to load classes');
    }
  };

  // Custom event component to ensure proper rendering
  const EventComponent = ({ event }: any) => {
    console.log('Rendering event:', event);
    
    return (
      <div className={`calendar-event ${event.category === 'class' ? 'class-event' : ''}`}>
        <div className="event-title">{event.title}</div>
        {event.location && <div className="event-location">📍 {event.location}</div>}
      </div>
    );
  };

  useEffect(() => {
    async function loadClasses() {
      try {
        setLoading(true);
        const fetchedClasses = await scheduleService.fetchClasses();
        // Debug log
        console.log("Fetched classes:", fetchedClasses);

        // Flatten each class into recurring events
        const classEvents = fetchedClasses.flatMap(cls => {
          const events = [];
          // ...existing code...
          const semesterStart = cls.semesterDates?.startDate
            ? new Date(cls.semesterDates.startDate)
            : new Date();
          const semesterEnd = cls.semesterDates?.endDate
            ? new Date(cls.semesterDates.endDate)
            : new Date(new Date().setMonth(new Date().getMonth() + 3));
          let current = new Date(semesterStart);
          while (current <= semesterEnd) {
            if (current.toLocaleDateString('en-US', { weekday: 'long' }) === cls.day) {
              // ...existing code...
              const [sh, sm] = cls.startTime.split(':').map(Number);
              const [eh, em] = cls.endTime.split(':').map(Number);
              const startTime = new Date(current);
              startTime.setHours(sh, sm, 0);
              const endTime = new Date(current);
              endTime.setHours(eh, em, 0);
              events.push({
                id: `cls-${cls._id}-${current.toISOString()}`,
                title: `${cls.courseName} (${cls.courseCode})`,
                start: startTime,
                end: endTime,
                location: cls.location,
                resource: { courseCode: cls.courseCode, type: 'class' },
              });
            }
            current.setDate(current.getDate() + 1);
          }
          return events;
        });
        // Set fully populated events
        setEvents(classEvents);
      } catch (err) {
        console.error("Failed to load classes:", err);
      } finally {
        setLoading(false);
      }
    }
    loadClasses();
  }, []);

  useEffect(() => {
    fetchClassesAlternate();
  }, []);

  const fetchClassesAlternate = async () => {
    console.log('fetchClassesAlternate: A new approach');
    try {
      const classesData = await scheduleService.fetchClasses();
      if (!classesData || classesData.length === 0) {
        console.log('No classes found with alternate method');
        return;
      }
      const altEvents = classesData.flatMap(cls => {
        const eventsArr = [];
        try {
          const semStart = cls.semesterDates?.startDate ? new Date(cls.semesterDates.startDate) : new Date();
          const semEnd = cls.semesterDates?.endDate ? new Date(cls.semesterDates.endDate) : new Date(new Date().setMonth(new Date().getMonth() + 3));
          let current = new Date(semStart);
          while (current <= semEnd) {
            if (current.toLocaleDateString('en-us', { weekday: 'long' }) === cls.day) {
              const [sh, sm] = cls.startTime.split(':').map(Number);
              const [eh, em] = cls.endTime.split(':').map(Number);
              const evtStart = new Date(current);
              evtStart.setHours(sh, sm, 0);
              const evtEnd = new Date(current);
              evtEnd.setHours(eh, em, 0);
              eventsArr.push({
                id: `alternate-${cls._id}-${current.toISOString()}`,
                title: `${cls.courseName} (${cls.courseCode})`,
                start: evtStart,
                end: evtEnd,
                location: cls.location,
                resource: { type: 'class', courseCode: cls.courseCode },
              });
            }
            current.setDate(current.getDate() + 1);
          }
        } catch (e) {
          console.error('Error processing class in alternate method:', cls, e);
        }
        return eventsArr;
      });
      console.log('Alternate events:', altEvents);
      setEvents(prevEvents => [...prevEvents, ...altEvents]);
    } catch (err) {
      console.error('Alternate fetch failed:', err);
    }
  };

  useEffect(() => {
    async function loadAlternateEvents() {
      try {
        const classes = await scheduleService.fetchClasses();
        console.log("Alternate fetch for main calendar:", classes);

        if (!classes || classes.length === 0) {
          console.log("No classes for main calendar in alternate method");
          return;
        }

        const altEvents = classes.flatMap((cls) => {
          const events = [];
          // ...existing code...
          const start = cls.semesterDates?.startDate ? new Date(cls.semesterDates.startDate) : new Date();
          const end = cls.semesterDates?.endDate ? new Date(cls.semesterDates.endDate) : new Date(new Date().setMonth(new Date().getMonth() + 3));
          let current = new Date(start);
          while (current <= end) {
            if (current.toLocaleDateString('en-us', { weekday: 'long' }) === cls.day) {
              const [sh, sm] = cls.startTime.split(':').map(Number);
              const [eh, em] = cls.endTime.split(':').map(Number);
              const evtStart = new Date(current);
              evtStart.setHours(sh, sm, 0);
              const evtEnd = new Date(current);
              evtEnd.setHours(eh, em, 0);
              events.push({
                id: `alt-${cls._id}-${cls.day}-${evtStart.toISOString()}`,
                title: `${cls.courseName} (${cls.courseCode})`,
                start: evtStart,
                end: evtEnd,
                resource: { type: 'class', location: cls.location },
              });
            }
            current.setDate(current.getDate() + 1);
          }
          return events;
        });

        console.log("Alternate events for main calendar:", altEvents);
        setEvents(prev => [...prev, ...altEvents]);
      } catch (err) {
        console.error("Error in alternate fetch for main calendar:", err);
      }
    }

    loadAlternateEvents();
  }, []);

  useEffect(() => {
    async function fallbackIfScheduleNull() {
      try {
        console.log("Checking schedule fallback...");
        // Assume you already have a 'schedule' variable
        if (!schedule) {
          const classes = await scheduleService.fetchClasses();
          console.log("Fallback classes:", classes);
          // Flatten classes into recurring events
          const fallbackEvents = classes.flatMap(cls => {
            // ...existing code...
            // Return an array of fully formed event objects
          });
          setEvents(prev => [...prev, ...fallbackEvents]);
        }
      } catch (err) {
        console.error("Fallback schedule fetch error:", err);
      }
    }
    fallbackIfScheduleNull();
  }, []);

  useEffect(() => {
    async function fetchCalendarEvents() {
      try {
        const classes = await scheduleService.fetchClasses();
        if (!classes || classes.length === 0) return;
        console.log("Fetched classes for normal schedule:", classes);
  
        const newEvents = classes.flatMap((cls) => {
          const events = [];
          // ...existing code...
          // Use same logic as DebugCalendar to create recurring events
          // for startDate -> endDate, matching cls.day
          return events;
        });
  
        console.log("Generated normal schedule events:", newEvents);
        setEvents(newEvents); // Replace or merge existing
      } catch (err) {
        console.error("Error fetching schedule events:", err);
      }
    }
    fetchCalendarEvents();
  }, []);

  useEffect(() => {
    async function fetchAndDebugFormat() {
      try {
        const classes = await scheduleService.fetchClasses();
        console.log("Debug-style classes in Schedule:", classes);
        if (!Array.isArray(classes) || classes.length === 0) return;
  
        const debugEvents = classes.flatMap((cls) => {
          const events = [];
          // ...copy recurring logic from DebugCalendar...
          // (Generate events for each day in the date range)
          return events;
        });
  
        console.log("Debug-style events in Schedule:", debugEvents);
        setEvents(debugEvents); // Replace or append as needed
      } catch (err) {
        console.error("Error in debug approach for Schedule:", err);
      }
    }
    fetchAndDebugFormat();
  }, []);

  // Add a function to fetch generated assignments/tasks
  const fetchAssignmentsAndTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/schedule/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Fetched assignments/tasks:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        // Map the tasks to the format expected by react-big-calendar
        const taskEvents = response.data.map(task => ({
          id: task._id || task.id || `task-${Math.random().toString(36).substring(7)}`,
          title: task.title,
          start: new Date(task.start),
          end: new Date(task.end),
          allDay: false,
          resource: {
            type: 'task',
            ...task
          },
          courseCode: task.courseCode,
          location: task.location,
          category: task.category || 'task',
          priority: task.priority || 'medium'
        }));
        
        console.log('Mapped task events:', taskEvents);
        
        // Add these events to the state
        setEvents(prevEvents => [...prevEvents, ...taskEvents]);
      }
    } catch (error) {
      console.error('Error fetching assignments/tasks:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  // Call this function after PDF upload
  const handlePdfUploadSuccess = () => {
    toast.success('PDF processed successfully!');
    fetchAssignmentsAndTasks();
  };

  // Add this to the PDF upload handling code
  const handlePdfUpload = async (files) => {
    // ...existing code...
    
    try {
      // ...existing upload code...
      
      // After successful upload and processing
      handlePdfUploadSuccess();
    } catch (error) {
      // ...existing error handling...
    }
  };

  // Add debug output to check what events are being provided to the calendar
  const EventDebugger = () => {
    // First check if events array exists and has items
    if (!events || events.length === 0) {
      return (
        <div className="calendar-debug-info">
          <p>No events in state. Check if:</p>
          <ol>
            <li>Classes are being fetched from the server (see logs)</li>
            <li>Classes are being converted to events correctly</li>
            <li>Events are being set in state</li>
          </ol>
          <div>
            <button 
              onClick={async () => {
                const classes = await scheduleService.fetchClasses();
                if (classes && classes.length > 0) {
                  console.log("Reload attempt - Classes found:", classes.length);
                  // Manually create events
                  const manualEvents = [];
                  for (const cls of classes) {
                    try {
                      const startDate = cls.semesterDates?.startDate 
                        ? new Date(cls.semesterDates.startDate) 
                        : new Date();
                      const endDate = cls.semesterDates?.endDate 
                        ? new Date(cls.semesterDates.endDate) 
                        : new Date(new Date().setMonth(new Date().getMonth() + 3));
                      
                      let currentDate = new Date(startDate);
                      while (currentDate <= endDate) {
                        if (currentDate.toLocaleDateString('en-us', { weekday: 'long' }) === cls.day) {
                          const [startHour, startMinute] = cls.startTime.split(':').map(Number);
                          const [endHour, endMinute] = cls.endTime.split(':').map(Number);
                          
                          const eventStart = new Date(currentDate);
                          eventStart.setHours(startHour, startMinute, 0);
                          
                          const eventEnd = new Date(currentDate);
                          eventEnd.setHours(endHour, endMinute, 0);
                          
                          manualEvents.push({
                            id: `class-${cls._id}-${currentDate.toISOString()}`,
                            title: `${cls.courseName} (${cls.courseCode})`,
                            start: eventStart,
                            end: eventEnd,
                            allDay: false,
                            category: 'class',
                            resource: { type: 'class', courseCode: cls.courseCode, location: cls.location }
                          });
                        }
                        currentDate.setDate(currentDate.getDate() + 1);
                      }
                    } catch (err) {
                      console.error("Error creating event:", err);
                    }
                  }
                  console.log("Manual events created:", manualEvents.length);
                  if (manualEvents.length > 0) {
                    setEvents(manualEvents);
                  }
                }
              }}
              className="debug-reload-button"
            >
              Attempt Manual Reload
            </button>
          </div>
        </div>
      );
    }
    
    // Only access events[0] if we know it exists
    return (
      <div className="calendar-debug-info">
        <p>Events in state: {events.length}</p>
        <p>First event: {events[0]?.title || 'No title'}</p>
        <p>Type: {events[0]?.resource?.type || 'Unknown'}</p>
        <p>Start: {events[0]?.start?.toString() || 'No start date'}</p>
      </div>
    );
  };

  // Add a simple custom event component that ensures visibility
  const VisibleEventComponent = ({ event }) => {
    console.log("Rendering event:", event);
    return (
      <div
        style={{
          backgroundColor: event.priority === 'high' ? '#ef4444' : 
                           event.priority === 'medium' ? '#f59e0b' : '#10b981',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontWeight: 'bold',
          border: '2px solid black',
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div style={{ fontWeight: 'bold' }}>{event.title}</div>
        {event.location && <div>📍 {event.location}</div>}
      </div>
    );
  };

  // Add a separate debugger component specifically for event rendering
  const RenderDebugger = () => {
    if (events.length === 0) return null;
    
    // Get the first event's date in YYYY-MM-DD format for comparison
    const firstEventDate = events[0]?.start instanceof Date 
      ? `${events[0].start.getFullYear()}-${String(events[0].start.getMonth() + 1).padStart(2, '0')}-${String(events[0].start.getDate()).padStart(2, '0')}`
      : 'Invalid date';
    
    return (
      <div className="calendar-debug-info">
        <h4>Render Debugging</h4>
        <p>Current view: {calendarView}</p>
        <p>First event date: {firstEventDate}</p>
        <button 
          onClick={() => {
            // Force navigate to the first event's month
            if (events.length > 0 && events[0].start instanceof Date) {
              setCalendarView("month");
              // You'd need to update the Calendar's date prop or ref
            }
          }}
          style={{
            padding: '8px 16px',
            background: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Go to Event Date
        </button>
      </div>
    );
  };

  // Modify your fetchAndConvertClasses function to ensure proper state updates
  useEffect(() => {
    async function fetchAndConvertClasses() {
      try {
        const classes = await scheduleService.fetchClasses();
        console.log("Classes fetched for initial load:", classes);
        
        if (!classes || classes.length === 0) {
          console.log("No classes returned from fetchClasses()");
          setEvents([]);
          setRawClasses([]);
          setClassesByDay({});
          return;
        }

        // Store the raw classes data
        setRawClasses(classes);
        
        // Organize classes by day for grid/list views
        setClassesByDay(organizeClassesByDay(classes));
        
        // Convert classes to calendar events as before
        // ...existing event creation code...
        
        // Important: Force state update and re-render
        setRenderKey(prev => prev + 1);
      } catch (err) {
        console.error("Error in fetchAndConvertClasses:", err);
        setEvents([]);
        setRawClasses([]);
        setClassesByDay({});
      }
    }
    
    fetchAndConvertClasses();
  }, []);

  // Add this view selector component
  const ViewSelector = () => {
    return (
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
    );
  };

  // Add Grid View Component
  const GridView = () => {
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
      const hour = i + 8; // Start from 8 AM
      return `${hour.toString().padStart(2, '0')}:00`;
    });

    return (
      <div className="schedule-table-container">
        <table className="schedule-table">
          <thead className="table-header">
            <tr>
              <th>Time</th>
              {DAYS.map(day => (
                <th key={day}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map(timeSlot => (
              <tr key={timeSlot}>
                <td className="time-cell">{timeSlot}</td>
                {DAYS.map(day => {
                  const classes = classesByDay[day] || [];
                  const classAtTime = classes.find(c => 
                    timeSlot >= c.startTime && timeSlot < c.endTime
                  );

                  return (
                    <td key={`${day}-${timeSlot}`} className="schedule-cell">
                      {classAtTime && (
                        <div className="class-card" 
                          style={{
                            backgroundColor: `var(--priority-medium-bg)`,
                            borderLeftColor: `var(--priority-medium-border)`
                          }}
                          onClick={() => {
                            setSelectedEvent({
                              title: `${classAtTime.courseName} (${classAtTime.courseCode})`,
                              resource: { 
                                type: 'class',
                                ...classAtTime
                              }
                            });
                            setShowClassModal(true);
                          }}
                        >
                          <div className="class-title" 
                            style={{ color: `var(--priority-medium-text)` }}>
                            {classAtTime.courseName}
                          </div>
                          <div className="class-details">
                            <div>{classAtTime.location}</div>
                            <div>{formatClassTime(classAtTime.startTime, classAtTime.endTime)}</div>
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
    );
  };

  // Add List View Component
  const ListView = () => {
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    return (
      <div className="schedule-list">
        {DAYS.map(day => (
          <div key={day} className="schedule-list-item">
            <h3>{day}</h3>
            {classesByDay[day]?.length > 0 ? (
              <ul>
                {classesByDay[day]
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((classItem, index) => (
                    <li key={`${classItem.courseCode}-${index}`}
                      onClick={() => {
                        setSelectedEvent({
                          title: `${classItem.courseName} (${classItem.courseCode})`,
                          resource: { 
                            type: 'class',
                            ...classItem
                          }
                        });
                        setShowClassModal(true);
                      }}
                    >
                      <div className="class-card"
                        style={{
                          backgroundColor: `var(--priority-medium-bg)`,
                          borderLeftColor: `var(--priority-medium-border)`
                        }}
                      >
                        <div className="class-title"
                          style={{ color: `var(--priority-medium-text)` }}>
                          {classItem.courseName} ({classItem.courseCode})
                        </div>
                        <div className="class-details">
                          <div><FiClock className="icon" /> {formatClassTime(classItem.startTime, classItem.endTime)}</div>
                          <div><FiMapPin className="icon" /> {classItem.location}</div>
                          {classItem.professor && (
                            <div><FiUser className="icon" /> {classItem.professor}</div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="no-classes">No classes scheduled</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Load cached data from localStorage
  const loadCachedData = useCallback(() => {
    try {
      const cachedEvents = localStorage.getItem('scheduleEvents');
      const cachedRawClasses = localStorage.getItem('scheduleRawClasses');
      const cachedClassesByDay = localStorage.getItem('scheduleClassesByDay');
      
      let hasCache = false;
      
      if (cachedEvents) {
        const parsedEvents = JSON.parse(cachedEvents);
        // Convert string dates back to Date objects
        const eventsWithDates = parsedEvents.map((event: any) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end)
        }));
        setEvents(eventsWithDates);
        hasCache = true;
      }
      
      if (cachedRawClasses) {
        setRawClasses(JSON.parse(cachedRawClasses));
        hasCache = true;
      }
      
      if (cachedClassesByDay) {
        setClassesByDay(JSON.parse(cachedClassesByDay));
        hasCache = true;
      }
      
      return hasCache; // Return true if we loaded any cached data
    } catch (error) {
      console.error('Error loading cached schedule data:', error);
      return false;
    }
  }, []);

  // Save active view to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('scheduleActiveView', activeView);
  }, [activeView]);

  // Modify the existing fetch function to use cached data
  useEffect(() => {
    async function fetchAndConvertClasses() {
      // First load from cache if available
      const hasCachedData = loadCachedData();
      
      // If we have cached data, we can show it immediately while fetching
      if (hasCachedData) {
        setLoading(false);
      }
      
      try {
        const classes = await scheduleService.fetchClasses();
        console.log("Classes fetched in Schedule.tsx:", classes);
        
        if (!classes || classes.length === 0) {
          console.log("No classes returned from fetchClasses()");
          
          // Only clear the state if we don't have cached data
          if (!hasCachedData) {
            setEvents([]);
            setRawClasses([]);
            setClassesByDay({});
          }
          setLoading(false);
          return;
        }

        // Store the raw classes data
        setRawClasses(classes);
        localStorage.setItem('scheduleRawClasses', JSON.stringify(classes));
        
        // Organize classes by day for grid/list views
        const classesByDayObject = organizeClassesByDay(classes);
        setClassesByDay(classesByDayObject);
        localStorage.setItem('scheduleClassesByDay', JSON.stringify(classesByDayObject));
        
        // Convert classes to calendar events
        const convertedEvents = classesToEvents(classes);
        setEvents(convertedEvents);
        
        // Store events in localStorage (with dates converted to strings)
        const serializedEvents = convertedEvents.map(event => ({
          ...event,
          start: event.start.toISOString(),
          end: event.end.toISOString()
        }));
        localStorage.setItem('scheduleEvents', JSON.stringify(serializedEvents));
        
      } catch (err) {
        console.error("Error in fetchAndConvertClasses:", err);
        // Only clear if we don't have cached data
        if (!hasCachedData) {
          setEvents([]);
          setRawClasses([]);
          setClassesByDay({});
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchAndConvertClasses();
  }, [loadCachedData]);

  // Add this function to clear the cache (useful for debugging)
  const clearCache = () => {
    localStorage.removeItem('scheduleEvents');
    localStorage.removeItem('scheduleRawClasses');
    localStorage.removeItem('scheduleClassesByDay');
    localStorage.removeItem('scheduleActiveView');
    console.log('Schedule cache cleared');
  };

  // Add this debugging to the event handler
  const handleEventSelect = (event: CalendarEvent) => {
    console.log('Event selected:', event);
    
    // Set selected event with additional debug logging
    setSelectedEvent(event);
    console.log('Selected event set:', event.title);
    
    // Determine which modal to show based on event type and add explicit logging
    if (event.resource?.type === 'class') {
      console.log('Opening class modal for:', event.title);
      setShowClassModal(true);
    } else {
      console.log('Opening task modal for:', event.title);
      setShowTaskModal(true);
    }
  };
  
  // Add a custom TaskEventComponent that captures clicks properly
  const TaskEventComponent = ({ event }: { event: CalendarEvent }) => {
    const priorityClass = event.priority ? `priority-${event.priority}` : '';
    const categoryClass = event.category || '';
    const isClassEvent = event.resource?.type === 'class';
    const courseCode = event.courseCode || event.resource?.courseCode;
    
    return (
      <div 
        className={`task-event ${priorityClass} ${categoryClass}`}
        onClick={() => {
          // Directly call handleEventSelect from the component
          console.log('Task event clicked:', event.title);
          handleEventSelect(event);
        }}
      >
        <div className="task-event-title">
          {isClassEvent && courseCode ? `${courseCode} - ` : ''}{event.title}
        </div>
        {event.description && (
          <div className="task-event-desc">{event.description}</div>
        )}
        {courseCode && !isClassEvent && (
          <div className="task-event-course">{courseCode}</div>
        )}
        {isClassEvent && event.resource?.location && (
          <div className="task-event-location">📍 {event.resource.location}</div>
        )}
      </div>
    );
  };

  const loadPreferences = async () => {
    try {
      setPreferencesLoading(true);
      const userPrefs = await scheduleService.getUserPreferences();
      
      if (userPrefs) {
        setPreferences(prevPrefs => ({
          ...prevPrefs,
          ...userPrefs
        }));
        // Store preferences for PDF processing
        localStorage.setItem('userPreferences', JSON.stringify(userPrefs));
      }
      
      setPreferencesError(null);
    } catch (error) {
      console.error('Error loading preferences:', error);
      setPreferencesError('Failed to load your preferences. Using defaults.');
    } finally {
      setPreferencesLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setPreferencesLoading(true);
      setPreferencesError(null);
      
      const savedPrefs = await scheduleService.updateUserPreferences(preferences);
      
      if (savedPrefs) {
        // Update local storage for PDF processing
        localStorage.setItem('userPreferences', JSON.stringify(savedPrefs));
      }
      
      setPreferencesSuccess('Preferences saved successfully!');
      setTimeout(() => setPreferencesSuccess(null), 3000);
      
      // Re-fetch with new preferences if we have study data
      if (studyData.length > 0) {
        processEvents(studyData, classData);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setPreferencesError('Failed to save preferences. Please try again.');
    } finally {
      setPreferencesLoading(false);
    }
  };

  // Process file drop for PDF upload
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const validFiles = acceptedFiles.filter(file => 
      file.type === 'application/pdf' || file.name.endsWith('.pdf')
    );

    if (validFiles.length === 0) {
      alert('Please upload PDF files only');
      return;
    }

    setLoading(true);
    
    try {
      // Ensure all uploaded files are tagged as assignments
      const taggedFiles = validFiles.map(file => {
        // Create a new File object with custom properties
        const taggedFile = new File([file], file.name, {
          type: file.type,
          lastModified: file.lastModified
        });
        // Add assignment tag as a non-enumerable property
        Object.defineProperty(taggedFile, 'documentType', {
          value: 'assignment',
          writable: false,
          enumerable: true
        });
        return taggedFile;
      });

      // Get user preferences to send with the request
      const userPrefs = localStorage.getItem('userPreferences');
      const options = userPrefs ? { preferences: JSON.parse(userPrefs) } : {};
      
      const studySchedule = await scheduleService.processUploadedPDFs(taggedFiles, options);
      console.log('Processed study schedule with preferences:', studySchedule);
      setStudyData(studySchedule);
      processEvents(studySchedule, classData);
    } catch (error) {
      console.error('Error processing PDFs:', error);
      alert('Error processing PDF files. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [classData, processEvents]);

  return (
    <div className="schedule-container">
      <ToastContainer /> {/* Add this near the top of your JSX */}
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
          <button 
            className="header-button" 
            onClick={() => setShowDebugCalendar(!showDebugCalendar)}
          >
            {showDebugCalendar ? 'Hide Debug View' : 'Show Debug View'}
          </button>
        </div>
      </header>

      {renderEventFilter()}

      {/* Add file upload section before the calendar */}
      <button 
        className="add-class-button" 
        onClick={() => setShowUploadModal(true)}
      >
        <FiUpload className="button-icon" />
        Upload PDFs
      </button>

      {/* Add the debugger before the calendar */}
      <EventDebugger />

      {/* Add this component before the Calendar */}
      <RenderDebugger />

      {/* Render appropriate view based on active view state */}
      {loading ? (
        <div className="loading-message">Loading your schedule...</div>
      ) : (
        <>
          {/* Calendar View */}
          {activeView === 'calendar' && (
            <div className="calendar-container">
              {events.length === 0 ? (
                <div className="empty-calendar-message">
                  <h3>No classes found</h3>
                  <p>Click "Add Class" to add your first class.</p>
                </div>
              ) : (
                <div className="calendar-wrapper" style={{ height: 700 }} key={renderKey}>
                  <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    views={['month', 'week', 'day']}
                    defaultView="week"
                    components={{
                      event: TaskEventComponent
                    }}
                    onSelectEvent={handleEventSelect}
                    eventPropGetter={(event) => {
                      // Apply custom styling based on event type
                      const isClassEvent = event.resource?.type === 'class';
                      const priority = event.priority || 'medium';
                      
                      return {
                        className: `calendar-event-clickable ${isClassEvent ? 'class-event' : `priority-${priority}-event`}`,
                      };
                    }}
                    dayPropGetter={(date) => {
                      // Customize day cell styling
                      const today = new Date();
                      const isToday = 
                        date.getDate() === today.getDate() &&
                        date.getMonth() === today.getMonth() &&
                        date.getFullYear() === today.getFullYear();
                      
                      return {
                        className: isToday ? 'rbc-today-enhanced' : '',
                      };
                    }}
                    // Improve accessiblity of calendar
                    messages={{
                      allDay: 'All Day',
                      previous: 'Previous',
                      next: 'Next',
                      today: 'Today',
                      month: 'Month',
                      week: 'Week',
                      day: 'Day',
                      showMore: (total) => `+${total} more`
                    }}
                    // Improve time slot display
                    step={30}
                    timeslots={2}
                    min={new Date(new Date().setHours(8, 0, 0, 0))}
                    max={new Date(new Date().setHours(20, 0, 0, 0))}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Grid View */}
          {activeView === 'grid' && (
            rawClasses.length === 0 ? (
              <div className="empty-calendar-message">
                <h3>No classes found</h3>
                <p>Click "Add Class" to add your first class.</p>
              </div>
            ) : (
              <GridView />
            )
          )}
          
          {/* List View */}
          {activeView === 'list' && (
            rawClasses.length === 0 ? (
              <div className="empty-calendar-message">
                <h3>No classes found</h3>
                <p>Click "Add Class" to add your first class.</p>
              </div>
            ) : (
              <ListView />
            )
          )}
        </>
      )}

      {/* Task Modal */}
      {showTaskModal && selectedEvent && (
        <TaskModal 
          task={selectedEvent} 
          onClose={() => {
            console.log('Closing task modal');
            setShowTaskModal(false);
            setSelectedEvent(null);
          }}
        />
      )}
      
      {showClassModal && selectedEvent && (
        <ClassModal 
          event={selectedEvent} 
          onClose={() => {
            console.log('Closing class modal');
            setShowClassModal(false);
            setSelectedEvent(null);
          }}
        />
      )}

      {/* Add University Class Modal */}
      {showAddClassModal && renderAddClassModal()}

      {/* Preferences Modal */}
      {showPreferencesModal && renderPreferencesModal()}

      {renderUploadModal()}
      {showDebugCalendar && <DebugCalendar />}
    </div>
  );
};

export default Schedule;