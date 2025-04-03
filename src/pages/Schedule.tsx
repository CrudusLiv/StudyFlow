import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, View, NavigateAction, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
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
  FiInfo,  
  FiCheck,
  FiPlus,
  FiUser
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
import PreferencesPanel from '../components/PreferencesPanel';                
import { pdfService } from '../services/pdfService';
import { 
  pageVariants, 
  containerVariants, 
  listVariants, 
  listItemVariants,
  buttonVariants,
  modalVariants
} from '../utils/animationConfig';
import ScheduleGridView from '../components/ScheduleGridView';
import ScheduleListView from '../components/ScheduleListView';

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

// Fix the organizeClassesByDay function to handle different input formats and prevent duplicates
const organizeClassesByDay = (classes: any): { [key: string]: any[] } => {
  const dayMap: { [key: string]: any[] } = {
    'Monday': [],
    'Tuesday': [],
    'Wednesday': [],
    'Thursday': [],
    'Friday': [],
    'Saturday': [],
    'Sunday': []
  };
  
  // Handle different input formats
  const classArray = Array.isArray(classes) 
    ? classes 
    : (classes && classes.data && Array.isArray(classes.data) 
        ? classes.data 
        : []);
  
  // Keep track of processed class IDs to avoid duplicates
  const processedIds = new Set();
  
  classArray.forEach(cls => {
    // Extract the class day - handle both raw classes and calendar events
    const day = cls.day || cls.resource?.day;
    
    // Extract a unique identifier for the class
    const classId = cls._id || cls.resource?._id || 
      (cls.courseCode && cls.day ? `${cls.courseCode}-${cls.day}-${cls.startTime}` : null);
    
    // Only process if it's a valid class and we haven't seen this ID before
    if (day && dayMap[day] && classId && !processedIds.has(classId)) {
      processedIds.add(classId);
      
      // If it's a calendar event, extract the original class data
      const classData = cls.resource?.type === 'class' 
        ? { 
            courseName: cls.resource.details?.courseName || cls.title,
            courseCode: cls.resource.courseCode || cls.courseCode,
            startTime: cls.resource.startTime || (cls.start && cls.start.toTimeString().substring(0, 5)),
            endTime: cls.resource.endTime || (cls.end && cls.end.toTimeString().substring(0, 5)),
            location: cls.resource.location || cls.location,
            day: cls.resource.day || day
          }
        : cls;
      
      dayMap[day].push(classData);
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
  const [activeView, setActiveView] = useState<'calendar' | 'grid' | 'list'>('calendar');
  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [viewType, setViewType] = useState<'calendar' | 'grid' | 'list'>('calendar');

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

  const [schedule, setSchedule] = useState<any>(null);

  // Add a key to force re-renders when events change
  const [renderKey, setRenderKey] = useState(0);

  const [rawClasses, setRawClasses] = useState<any[]>([]);
  const [classesByDay, setClassesByDay] = useState<{[key: string]: any[]}>({});

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const [preferences, setPreferences] = useState({
    studyHoursPerDay: 4,
    preferredStudyTimes: ['morning', 'evening'],
    breakDuration: 15,
    longBreakDuration: 30,
    sessionsBeforeLongBreak: 4,
    weekendStudy: true,
    preferredSessionLength: 2,
    wakeUpTime: '08:00',
    sleepTime: '23:00',
    preferredStudyDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    minimumDaysBetweenSessions: 1,
    preferSpacedRepetition: true
  });

  const [classData, setClassData] = useState([]); // Properly define classData

  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesError, setPreferencesError] = useState(null);
  const [preferencesSuccess, setPreferencesSuccess] = useState(null);

  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    fetchScheduleData();
    fetchClassSchedules();
    loadPreferences();
    loadPDFDocuments();
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

  // Fix fetchClassSchedules function to properly handle the response format
  const fetchClassSchedules = async () => {
    try {
      setLoading(true);
      const response = await scheduleService.fetchClasses();
      
      // Check if response has data and it's an array
      if (response && response.data && Array.isArray(response.data)) {
        setClassSchedules(response.data);
        
        if (response.data.length > 0) {
          console.log(`Processing ${response.data.length} classes for calendar`);
          // Convert class schedules to events and add to calendar
          const classEvents = generateRecurringEvents(response.data);
          setEvents(prev => [...prev.filter(e => e.category !== 'class'), ...classEvents]);
        } else {
          console.log('No classes found in response');
        }
      } else {
        console.log('No class data received from API or invalid format:', response);
        setClassSchedules([]);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load schedule');
      // Set empty array to prevent undefined errors
      setClassSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  // Fix other functions that fetch classes to use the consistent format
  const fetchAndSetClasses = async () => {
    try {
      const classesData = await scheduleService.fetchClasses();
      console.log('Fetched classes in component:', classesData);
      
      if (Array.isArray(classesData) && classesData.length > 0) {
        const classEvents = generateRecurringEvents(classesData);
        console.log('Generated class events:', classEvents);
        
        setEvents(prev => {
          // Filter out existing class events and add the new ones
          const nonClassEvents = prev.filter(event => event.category !== 'class');
          return [...nonClassEvents, ...classEvents];
        });
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load class schedule');
    }
  };

  // Simplify and improve the useEffect hooks
  useEffect(() => {
    // Call a single function to fetch all data needed
    const loadInitialData = async () => {
      await fetchScheduleData();
      await fetchClassSchedules(); // This will set up class events
      await loadPreferences();
      await loadPDFDocuments();
    };
    
    loadInitialData();
    
    // Clean up redundant fetch class calls in other useEffect hooks
  }, []);

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
      const formattedEvents = generateRecurringEvents(allClasses);
      
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

  // Replace the generateRecurringEvents function to handle single class or array
  const generateRecurringEvents = (classItems) => {
    if (!Array.isArray(classItems)) {
      console.warn('generateRecurringEvents: Input is not an array:', classItems);
      return [];
    }
    
    const events = [];
    let eventCounter = 0; // Add a counter to ensure uniqueness
    
    classItems.forEach(classData => {
      if (!classData || !classData.semesterDates) {
        console.warn('Invalid class data:', classData);
        return;
      }
      
      const startDate = new Date(classData.semesterDates.startDate);
      const endDate = new Date(classData.semesterDates.endDate);
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        if (currentDate.toLocaleString('en-us', { weekday: 'long' }) === classData.day) {
          // Skip if missing critical time values
          if (!classData.startTime || !classData.endTime) {
            console.warn('Missing time values in class item:', classData);
            break;
          }
          
          try {
            const [startHours, startMinutes] = classData.startTime.split(':');
            const [endHours, endMinutes] = classData.endTime.split(':');
            
            const eventStart = new Date(currentDate);
            eventStart.setHours(parseInt(startHours), parseInt(startMinutes), 0);
            
            const eventEnd = new Date(currentDate);
            eventEnd.setHours(parseInt(endHours), parseInt(endMinutes), 0);
            
            // Create a unique ID using more parameters and a counter
            const uniqueId = `class-${classData._id || Math.random().toString(36).substring(2)}-${
              currentDate.toISOString().split('T')[0]
            }-${startHours}${startMinutes}-${endHours}${endMinutes}-${eventCounter++}`;
            
            events.push({
              id: uniqueId,
              title: `${classData.courseName} (${classData.courseCode || 'No Code'})`,
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
          } catch (err) {
            console.error('Error creating event for class:', err, classData);
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
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
            <button 
              className="generate-button"
              onClick={() => setShowUploadModal(true)} // Add onClick handler here
            >
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
        setParsedDocuments(prev => [...prev, {
          title: file.name,
          content: null,
          status: 'parsing'
        }]);
  
        // Use the service to upload and parse the PDF
        const result = await pdfService.uploadAndParsePDF(file);
  
        setParsedDocuments(prev => prev.map(doc => 
          doc.title === file.name 
            ? { ...doc, content: result.data, status: 'done' }
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
        // Store current class events before updating
        const classEvents = events.filter(event => event.category === 'class');
        
        // Update schedule with the newly generated data
        setMultiWeekSchedule(response.data.weeklySchedule);
        
        // Merge new study events with existing class events
        const newStudyEvents = tasksToEvents(response.data.weeklySchedule);
        processEvents([...newStudyEvents, ...classEvents], universitySchedule);

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

  const handleGenerateSchedule = async () => {
    try {
      setParsedDocuments(prev => prev.map(doc => ({
        ...doc,
        status: doc.status === 'done' ? 'generating' : doc.status
      })));
  
      // Use the service to generate a schedule
      const response = await pdfService.generateSchedule(files);
  
      // Add better error handling and response validation
      if (!response) {
        throw new Error('Empty response from server');
      }
  
      console.log('Schedule generation response:', response);
  
      // Check if schedule exists and is valid
      if (response.success && response.schedule) {
        // Ensure schedule is an array before converting
        const schedule = Array.isArray(response.schedule) ? response.schedule : [];
        
        if (schedule.length === 0) {
          toast.warning('No study events were generated. Try uploading more detailed PDFs.');
        } else {
          // Convert the schedule to calendar-compatible events
          const scheduleEvents = pdfService.convertScheduleToEvents(schedule);
          console.log(`Converted ${scheduleEvents.length} schedule events`);
          
          // Get current class events before setting the new events
          const currentClassEvents = events.filter(event => event.category === 'class');
          console.log(`Preserving ${currentClassEvents.length} existing class events`);
          
          // Combine the study schedule with existing class events
          setEvents([...currentClassEvents, ...scheduleEvents]);
          
          // Save the document ID for reference
          if (response.documentId) {
            localStorage.setItem('lastScheduleDocumentId', response.documentId);
          }
          
          // If saving was done locally only, show a warning
          if (response.localOnly) {
            toast.warning('Schedule was saved locally due to size limitations.');
          } else {
            toast.success(`Generated ${scheduleEvents.length} study events successfully!`);
          }
          
          setShowUploadModal(false);
        }
      } else if (response.error) {
        // Show specific error from server if present
        toast.error(response.error || 'Failed to generate schedule');
      } else {
        toast.warning(response.message || 'No schedulable assignments found. Check for valid due dates in your documents.');
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
    // Only set the selected date without creating a new event
    setSelectedDate(slotInfo.start);
    
    // The code that creates a new event has been removed
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
      <div 
        className="modal-overlay" 
        onClick={() => setShowUploadModal(false)}
        style={{ 
          zIndex: 1000, 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      >
        <div 
          className="pdf-upload-modal" 
          onClick={e => e.stopPropagation()}
          style={{ position: 'relative', zIndex: 1001 }}
        >
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

  const loadPDFDocuments = async () => {
    try {
      setLoading(true);
      const documents = await pdfService.getPDFDocuments();
      
      if (documents && documents.length > 0) {
        // Set parsed documents
        setParsedDocuments(documents.map(doc => ({
          title: doc.title,
          content: doc.extractedData,
          status: 'done'
        })));
        
        // If any document has a generated schedule, use it
        const documentsWithSchedule = documents.filter(doc => 
          doc.generatedSchedule && doc.generatedSchedule.length > 0
        );
        
        if (documentsWithSchedule.length > 0) {
          // Get the most recent document with a schedule
          const latestDocument = documentsWithSchedule.sort((a, b) => 
            new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
          )[0];
          
          console.log('Found document with schedule:', latestDocument.title);
          console.log('Schedule items:', latestDocument.generatedSchedule.length);
          
          // Get current class events before setting the new events
          const classEvents = events.filter(event => event.category === 'class');
          
          // Convert the schedule to calendar events
          const scheduleEvents = pdfService.convertScheduleToEvents(latestDocument.generatedSchedule);
          
          // Set events, combining schedule with classes
          if (scheduleEvents.length > 0) {
            console.log(`Setting ${scheduleEvents.length} study events and ${classEvents.length} class events`);
            setEvents([...classEvents, ...scheduleEvents]);
            
            // Save document ID for reference
            localStorage.setItem('lastScheduleDocumentId', latestDocument._id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading PDF documents:', error);
    } finally {
      setLoading(false);
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
        const classEvents = generateRecurringEvents(classes);
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

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const response = await scheduleService.fetchClasses();
        console.log('Fetched classes:', response);

        if (Array.isArray(response)) {
          // Process classes directly using the existing helper function
          const events = generateRecurringEvents(response);
          setEvents(prevEvents => [...prevEvents, ...events]);
          console.log('Class events generated:', events.length);
        } else {
          console.warn('fetchClasses did not return an array:', response);
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
    async function fetchAndConvertClasses() {
      try {
        const classes = await scheduleService.fetchClasses();
        console.log('Classes fetched for initial load:', classes);
        
        if (!classes || classes.length === 0) {
          console.log('No classes returned from fetchClasses()');
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
        const events = generateRecurringEvents(classes);
        setEvents(events);
        
        // Important: Force state update and re-render
        setRenderKey(prev => prev + 1);
      } catch (err) {
        console.error('Error in fetchAndConvertClasses:', err);
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
      const hour = i + 8; // Start at 8 AM
      return `${hour}:00`;
    });
    
    // Generate time slot labels
    const renderTimeSlots = () => {
      return TIME_SLOTS.map((time, index) => (
        <div key={`time-${index}`} className="time-slot-label">
          {time}
        </div>
      ));
    };
    
    // Generate empty grid cells
    const renderEmptyCells = (day: string) => {
      return TIME_SLOTS.map((time, index) => {
        const hour = index + 8;
        const dayClasses = classesByDay[day] || [];
        
        // Find classes that occur during this hour
        const classesInThisHour = dayClasses.filter(cls => {
          const startHour = parseInt(cls.startTime.split(':')[0]);
          const endHour = parseInt(cls.endTime.split(':')[0]);
          return startHour <= hour && endHour > hour;
        });
        
        return (
          <div key={`${day}-${index}`} className="grid-cell">
            {classesInThisHour.map((cls, idx) => (
              <div key={`class-${idx}`} className="grid-class-item">
                {cls.courseName || cls.courseCode || 'Class'}
              </div>
            ))}
          </div>
        );
      });
    };

    return (
      <motion.div 
        className="schedule-grid-container"
        variants={containerVariants}
      >
        <motion.div className="schedule-grid">
          <motion.div className="time-column">
            <div className="time-header"></div>
            {/* Animate time slots with staggered effect */}
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={listVariants}
            >
              {TIME_SLOTS.map((time, index) => (
                <motion.div 
                  key={`time-${index}`} 
                  className="time-slot-label"
                  variants={listItemVariants}
                >
                  {time}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
          
          {DAYS.map(day => (
            <motion.div 
              key={day} 
              className="day-column"
              variants={containerVariants}
            >
              <div className="day-header">{day}</div>
              <motion.div
                initial="hidden"
                animate="visible"
                variants={listVariants}
              >
                {TIME_SLOTS.map((time, index) => {
                  // ...existing code for renderEmptyCells...
                  return (
                    <motion.div 
                      key={`${day}-${index}`} 
                      className="grid-cell"
                      variants={listItemVariants}
                    >
                      {/* ...existing grid cell content... */}
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    );
  };

  // Add List View Component
  const ListView = () => {
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    const renderClasses = (day: string) => {
      const dayClasses = classesByDay[day] || [];
      
      if (dayClasses.length === 0) {
        return <p className="no-classes">No classes scheduled</p>;
      }
      
      return dayClasses
        .sort((a, b) => {
          // Sort by start time
          const aStart = a.startTime.split(':').map(Number);
          const bStart = b.startTime.split(':').map(Number);
          
          if (aStart[0] !== bStart[0]) {
            return aStart[0] - bStart[0]; // Sort by hour
          }
          return aStart[1] - bStart[1]; // Sort by minute
        })
        .map((cls, index) => (
          <div key={`${day}-${index}`} className="list-class-item">
            <div className="list-class-time">
              {cls.startTime} - {cls.endTime}
            </div>
            <div className="list-class-info">
              <h4>{cls.courseName || 'Class'}</h4>
              {cls.courseCode && <p className="list-course-code">{cls.courseCode}</p>}
              {cls.location && <p className="list-location">{cls.location}</p>}
              {cls.professor && <p className="list-professor">Prof. {cls.professor}</p>}
            </div>
          </div>
        ));
    };

    return (
      <motion.div 
        className="schedule-list-container"
        variants={containerVariants}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={listVariants}
        >
          {DAYS.map(day => (
            <motion.div 
              key={day} 
              className="list-day-section"
              variants={listItemVariants}
            >
              <h3 className="list-day-header">{day}</h3>
              <div className="list-classes">
                {/* ...existing renderClasses with animations... */}
                {renderClasses(day)}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
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
        const response = await scheduleService.fetchClasses();
        console.log("Classes fetched in Schedule.tsx:", response);
        
        // Extract classes array from response
        const classes = response && response.data ? response.data : [];
        
        if (!classes || classes.length === 0) {
          console.log("No valid classes found");
          setRawClasses([]);
          setClassesByDay({});
          return;
        }

        // Store the raw classes data
        setRawClasses(classes);
        localStorage.setItem('scheduleRawClasses', JSON.stringify(classes));
        
        // Organize classes by day for grid/list views - pass the extracted array
        const classesByDayObject = organizeClassesByDay(classes);
        setClassesByDay(classesByDayObject);
        localStorage.setItem('scheduleClassesByDay', JSON.stringify(classesByDayObject));
        
        // Important: Force state update and re-render
        setRenderKey(prev => prev + 1);
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
        console.log('Loaded preferences:', userPrefs);
        setPreferences(prevPrefs => ({
          ...prevPrefs,
          ...userPrefs
        }));
      }
      
      setPreferencesError(null);
    } catch (error) {
      console.error('Error loading preferences:', error);
      // Don't show error to user since we're using defaults
      // Just log it for debugging purposes
    } finally {
      setPreferencesLoading(false);
    }
  };

  // Save preferences to server
const savePreferences = async () => {
  try {
    setPreferencesLoading(true);
    setPreferencesError(null);
    
    console.log('Saving preferences:', preferences);
    
    try {
      // This will now always return preferences (either from server or local)
      const savedPrefs = await scheduleService.updateUserPreferences(preferences);
      
      // Success message - even if we only saved locally
      setPreferencesSuccess('Preferences saved successfully!');
      setTimeout(() => setPreferencesSuccess(null), 3000);
      
      // Re-fetch with new preferences if needed
      if (studyData.length > 0) {
        processEvents(studyData, classData);
      }
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      setPreferencesError('Could not save preferences to server. Your preferences are still saved locally.');
    }
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

  // Add a function to deduplicate events for grid and list views
  const deduplicateClassEvents = (events: CalendarEvent[]) => {
    // For non-calendar views, we want to show each class only once
    const uniqueClassMap = new Map();
    const nonClassEvents = events.filter(event => event.category !== 'class');
    
    // Process class events and keep only one instance per class
    events.forEach(event => {
      if (event.category === 'class') {
        const day = event.resource?.day;
        if (day) {
          // Create a unique key for each class based on day, course code, and time
          const courseCode = event.courseCode || event.resource?.courseCode || '';
          const startTime = event.resource?.startTime || 
            (event.start ? event.start.toTimeString().substring(0, 5) : '');
          
          const uniqueKey = `${day}-${courseCode}-${startTime}`;
          
          // Only add this class if we haven't seen this key before
          if (!uniqueClassMap.has(uniqueKey)) {
            uniqueClassMap.set(uniqueKey, event);
          }
        }
      }
    });
    
    // Combine non-class events with deduplicated class events
    return [...nonClassEvents, ...Array.from(uniqueClassMap.values())];
  };

  // Render the view based on the selected view type
  const renderView = () => {
    switch (viewType) {
      case 'grid':
        return (
          <ScheduleGridView 
            events={deduplicateClassEvents(events)}
            onEventClick={handleEventClick}
          />
        );
      case 'list':
        return (
          <ScheduleListView 
            events={deduplicateClassEvents(events)}
            onEventClick={handleEventClick}
          />
        );
      default:
        return (
          <div className="calendar-container">
            <Calendar
              events={events}
              defaultView="week"
              views={["day", "week", "month"]}
              defaultDate={new Date()}
              onSelectEvent={handleEventClick}
              onSelectSlot={handleDateSelect}
              selectable
              localizer={localizer}
              components={{
                event: TaskEventComponent
              }}
              eventPropGetter={eventStyleGetter}
              dayPropGetter={(date) => {
                const today = new Date();
                const isToday = 
                  date.getDate() === today.getDate() &&
                  date.getMonth() === today.getMonth() &&
                  date.getFullYear() === today.getFullYear();
                
                return {
                  className: isToday ? 'rbc-today-enhanced' : '',
                };
              }}
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
              step={30}
              timeslots={2}
              min={new Date(new Date().setHours(8, 0, 0, 0))}
              max={new Date(new Date().setHours(20, 0, 0, 0))}
            />
          </div>
        );
    }
  };

  return (
    <motion.div 
      className="schedule-container"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageVariants}
    >
      <ToastContainer />
      {renderOnboardingGuide()}
      <motion.header 
        className="schedule-header"
        variants={containerVariants}
      >
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
          <motion.div 
            className="view-selector"
            variants={containerVariants}
          >
            <motion.button
              className={`view-button ${calendarView === 'month' ? 'active' : ''}`}
              onClick={() => setCalendarView('month')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Month
            </motion.button>
            <motion.button
              className={`view-button ${calendarView === 'week' ? 'active' : ''}`}
              onClick={() => setCalendarView('week')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Week
            </motion.button>
            <motion.button
              className={`view-button ${calendarView === 'day' ? 'active' : ''}`}
              onClick={() => setCalendarView('day')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Day
            </motion.button>
          </motion.div>
          <motion.button
            className="settings-button"
            onClick={() => setShowPreferences(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiSettings className="button-icon" />
            Preferences
          </motion.button>
        </div>
      </motion.header>



      {/* View selector buttons */}
      <div className="view-selector">
        <button 
          className={`view-button ${viewType === 'calendar' ? 'active' : ''}`}
          onClick={() => setViewType('calendar')}
        >
          <FiCalendar className="button-icon" />
          <span>Calendar</span>
        </button>
        <button 
          className={`view-button ${viewType === 'grid' ? 'active' : ''}`}
          onClick={() => setViewType('grid')}
        >
          <FiGrid className="button-icon" />
          <span>Grid</span>
        </button>
        <button 
          className={`view-button ${viewType === 'list' ? 'active' : ''}`}
          onClick={() => setViewType('list')}
        >
          <FiList className="button-icon" />
          <span>List</span>
        </button>
      </div>

      {/* Animated view switching */}
      <AnimatePresence mode="wait">
        {renderView()}
      </AnimatePresence>

      {/* Task Modal with animations */}
      <AnimatePresence>
        {showTaskModal && selectedEvent && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <TaskModal 
                task={selectedEvent} 
                onClose={() => {
                  console.log('Closing task modal');
                  setShowTaskModal(false);
                  setSelectedEvent(null);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Class Modal with animations */}
      <AnimatePresence>
        {showClassModal && selectedEvent && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <ClassModal 
                event={selectedEvent} 
                onClose={() => {
                  console.log('Closing class modal');
                  setShowClassModal(false);
                  setSelectedEvent(null);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add University Class Modal */}
      {showAddClassModal && 
        <div 
          className="modal-overlay" 
          style={{
            zIndex: 1000,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        >
          {renderAddClassModal()}
        </div>
      }

      {showUploadModal && renderUploadModal()}

      {/* Preferences Modal */}
      {showPreferences && (
        <motion.div 
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <PreferencesPanel
            onClose={() => setShowPreferences(false)}
            preferences={preferences}
            setPreferences={setPreferences}
            onSave={savePreferences}
            loading={preferencesLoading}
            error={preferencesError}
            success={preferencesSuccess}
          />
        </motion.div>
      )}

      {renderUploadModal()}
    </motion.div>
  );
};

export default Schedule;