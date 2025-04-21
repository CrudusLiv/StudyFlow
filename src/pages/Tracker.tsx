import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaClock, FaChartLine, FaTasks, FaCalendarAlt, FaExclamationTriangle, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line
} from 'recharts';
import '../styles/pages/Tracker.css';
import { 
  pageVariants, 
  containerVariants, 
  listVariants, 
  listItemVariants,
  staggeredGrid,
  gridItemVariants
} from '../utils/animationConfig';
import { scheduleService, Assignment, ProgressStats } from '../services/scheduleService';
import { CalendarEvent } from '../types/types';

// Sample fallback data for when no tasks are available
const fallbackAssignments: Assignment[] = [
  {
    _id: '1',
    title: 'Example Assignment',
    description: 'This is an example. Add real assignments in the Schedule page.',
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 0,
    completed: false
  }
];

const Tracker: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<ProgressStats>({
    totalAssignments: 0,
    completedAssignments: 0,
    overallProgress: 0,
    timeRemaining: 0,
    upcomingDeadlines: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Improve getEventsFromStorage to handle date conversion properly
  const getEventsFromStorage = useCallback(() => {
    try {
      const cachedEvents = localStorage.getItem('scheduleEvents');
      if (cachedEvents) {
        console.log('Found cached schedule events in localStorage');
        const parsedEvents = JSON.parse(cachedEvents);
        
        // Make sure we're working with valid data
        if (!Array.isArray(parsedEvents)) {
          console.error('Invalid scheduleEvents format in localStorage:', typeof parsedEvents);
          return [];
        }
        
        // Convert string dates back to Date objects
        const eventsWithDates = parsedEvents.map((event: any) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end)
        }));
        
        console.log(`Loaded ${eventsWithDates.length} events from localStorage`);
        return eventsWithDates;
      }
      return [];
    } catch (error) {
      console.error('Error loading cached schedule data:', error);
      return [];
    }
  }, []);

  // Update loadScheduleData to provide better fallbacks
  const loadScheduleData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get events from localStorage first (faster)
      const storedEvents = getEventsFromStorage();
      
      if (storedEvents.length > 0) {
        console.log(`Processing ${storedEvents.length} events from localStorage`);
        setEvents(storedEvents);
        
        // Log a sample event to debug source file information
        if (storedEvents.length > 0) {
          console.log('Sample event resource:', storedEvents[0].resource);
        }
        
        // Convert events to assignments for the tracker
        const assignments = scheduleService.eventsToAssignments(storedEvents);
        setAssignments(assignments);
        
        // Calculate progress stats
        const stats = scheduleService.calculateProgressStats(storedEvents);
        setStats(stats);
      } else {
        console.log('No events in localStorage, trying to fetch from server');
        
        // If no cached events, try to fetch from server
        try {
          const recentSchedule = await scheduleService.fetchMostRecentSchedule();
          
          if (recentSchedule && recentSchedule.schedule && recentSchedule.schedule.length > 0) {
            console.log(`Fetched ${recentSchedule.schedule.length} events from server`);
            
            // Ensure dates are proper Date objects
            const scheduleWithDates = recentSchedule.schedule.map((event: any) => ({
              ...event,
              start: new Date(event.start),
              end: new Date(event.end)
            }));
            
            setEvents(scheduleWithDates);
            
            // Also save to localStorage for future use
            localStorage.setItem('scheduleEvents', JSON.stringify(recentSchedule.schedule));
            
            // Convert events to assignments for the tracker
            const assignments = scheduleService.eventsToAssignments(scheduleWithDates);
            setAssignments(assignments);
            
            // Calculate progress stats
            const stats = scheduleService.calculateProgressStats(scheduleWithDates);
            setStats(stats);
          } else {
            // No real assignments found, show empty state with a message
            setAssignments(fallbackAssignments);
            setError('No schedule data found. Create a schedule in the Schedule page to track your progress.');
          }
        } catch (fetchError) {
          console.error('Error fetching schedule from server:', fetchError);
          setAssignments(fallbackAssignments);
          setError('Failed to load schedule data. Please check your connection.');
        }
      }
    } catch (error) {
      console.error('Error loading schedule data:', error);
      setAssignments(fallbackAssignments);
      setError('An error occurred while loading your progress data.');
    } finally {
      setLoading(false);
    }
  }, [getEventsFromStorage]);

  // Update the useEffect that handles schedule updates
  useEffect(() => {
    loadScheduleData();
    
    // Set up event listener for schedule changes
    const handleScheduleUpdate = () => {
      console.log('Schedule update detected, refreshing tracker...');
      loadScheduleData();
    };
    
    window.addEventListener('scheduleUpdated', handleScheduleUpdate);
    
    // No need for polling if we have event listeners
    // Only set up polling as fallback for very old browsers
    const interval = setInterval(loadScheduleData, 300000); // Refresh every 5 minutes
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('scheduleUpdated', handleScheduleUpdate);
    };
  }, [loadScheduleData]);

  // Get assignments based on active tab
  const getFilteredAssignments = () => {
    switch (activeTab) {
      case 'upcoming':
        return assignments.filter(a => !a.completed).sort((a, b) => 
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );
      case 'completed':
        return assignments.filter(a => a.completed);
      default:
        return assignments;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Check if assignment is due soon (within 3 days)
  const isDueSoon = (dueDate: string) => {
    const now = new Date().getTime();
    const due = new Date(dueDate).getTime();
    return (due - now) <= (3 * 24 * 60 * 60 * 1000) && (due - now) > 0;
  };

  // Check if assignment is overdue
  const isOverdue = (dueDate: string) => {
    const now = new Date().getTime();
    const due = new Date(dueDate).getTime();
    return due < now;
  };

  const formatYAxis = (value: number) => `${value}`;
  const formatTooltip = (value: number) => [`${value}%`, 'Progress'];

  const getResponsiveMargin = () => {
    const width = window.innerWidth;
    if (width <= 480) {
      return { top: 5, right: 5, left: 20, bottom: 50 };
    } else if (width <= 768) {
      return { top: 10, right: 10, left: 30, bottom: 60 };
    } else if (width <= 1024) {
      return { top: 15, right: 20, left: 40, bottom: 70 };
    }
    return { top: 20, right: 30, left: 50, bottom: 80 };
  };

  const getChartDimensions = () => {
    const width = window.innerWidth;
    if (width <= 480) {
      return { height: 250, fontSize: 10, barSize: 30 };
    } else if (width <= 768) {
      return { height: 300, fontSize: 12, barSize: 40 };
    }
    return { height: 400, fontSize: 14, barSize: 60 };
  };

  // Prepare data for pie chart
  const pieData = [
    { name: 'Completed', value: stats.completedAssignments, fill: '#10b981' },
    { name: 'In Progress', value: stats.totalAssignments - stats.completedAssignments, fill: '#6366f1' }
  ];

  // Show loading state
  if (loading) {
    return (
      <motion.div 
        className="tracker-container"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={pageVariants}
      >
        <motion.div 
          className="tracker-wrapper"
          variants={containerVariants}
        >
          <div className="loading">Loading assignments...</div>
        </motion.div>
      </motion.div>
    );
  }

  // Show error state with clear message
  if (error && assignments.length === 0) {
    return (
      <motion.div 
        className="tracker-container"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={pageVariants}
      >
        <motion.div 
          className="tracker-wrapper"
          variants={containerVariants}
        >
          <div className="error">
            <FaExclamationTriangle style={{ fontSize: '2rem', marginBottom: '1rem' }} />
            <p>{error}</p>
            <motion.a 
              href="/schedule" 
              className="action-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ 
                display: 'inline-block',
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                background: 'var(--primary)',
                color: 'white',
                borderRadius: '0.5rem',
                textDecoration: 'none'
              }}
            >
              Go to Schedule
            </motion.a>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="tracker-container"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageVariants}
    >
      <motion.div 
        className="tracker-wrapper"
        variants={containerVariants}
      >
        <motion.div 
          className="tracker-header"
          variants={containerVariants}
        >
          <h2 className="tracker-title">Progress Tracker</h2>
          <p className="tracker-subtitle">Track your assignment progress and completion status</p>
          
          {error && (
            <div className="info-message">
              <FaExclamationTriangle /> {error}
            </div>
          )}
        </motion.div>
        
        <motion.div 
          className="stats-grid"
          variants={staggeredGrid}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="stat-card"
            variants={gridItemVariants}
            whileHover="hover"
          >
            <FaChartLine className="stat-icon" />
            <h3 className="stat-title">Overall Progress</h3>
            <div className="stat-value">
              {stats.overallProgress.toFixed(1)}%
            </div>
            <div className="progress-bar">
              <motion.div 
                className="progress-fill" 
                initial={{ width: 0 }}
                animate={{ width: `${stats.overallProgress}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              />
            </div>
          </motion.div>

          <motion.div 
            className="stat-card"
            variants={gridItemVariants}
            whileHover="hover"
          >
            <FaTasks className="stat-icon" />
            <h3 className="stat-title">Assignments</h3>
            <div className="stat-value">
              {stats.completedAssignments}/{stats.totalAssignments}
            </div>
            <p className="stat-label">Completed Tasks</p>
          </motion.div>

          <motion.div 
            className="stat-card"
            variants={gridItemVariants}
            whileHover="hover"
          >
            <FaClock className="stat-icon" />
            <h3 className="stat-title">Time Remaining</h3>
            <div className="stat-value">{stats.timeRemaining.toFixed(1)}</div>
            <p className="stat-label">Days Average</p>
          </motion.div>
        </motion.div>

        <motion.div 
          className="chart-section"
          variants={containerVariants}
        >
          <h3 className="section-title"><FaChartLine className="section-icon" />Assignment Progress</h3>
          <div className="chart-wrapper" style={{ height: getChartDimensions().height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={getFilteredAssignments()}
                margin={getResponsiveMargin()}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="title"
                  interval={0}
                  tick={{ 
                    fill: '#6b7280', 
                    fontSize: getChartDimensions().fontSize,
                    width: window.innerWidth <= 480 ? 60 : 100 
                  }}
                  tickLine={{ stroke: '#e5e7eb' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  height={window.innerWidth <= 480 ? 60 : 80}
                  angle={-45}
                  textAnchor="end"
                  label={{ 
                    value: "Assignments", 
                    position: "bottom", 
                    offset: window.innerWidth <= 480 ? 30 : 50,
                    style: { fill: '#4b5563', fontSize: window.innerWidth <= 480 ? 12 : 14 }
                  }}
                />
                <YAxis 
                  domain={[0, 100]}
                  tickFormatter={formatYAxis}
                  tick={{ 
                    fill: '#6b7280', 
                    fontSize: window.innerWidth <= 480 ? 10 : 12 
                  }}
                  tickLine={{ stroke: '#e5e7eb' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  label={{ 
                    value: "Progress (%)", 
                    angle: -90, 
                    position: "insideLeft",
                    offset: window.innerWidth <= 480 ? -25 : -35,
                    style: { 
                      fill: '#4b5563',
                      fontSize: window.innerWidth <= 480 ? 12 : 14
                    }
                  }}
                />
                <Tooltip 
                  formatter={formatTooltip}
                  contentStyle={{ 
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    padding: '12px',
                    fontSize: window.innerWidth <= 480 ? '12px' : '14px'
                  }}
                  cursor={{ fill: 'rgba(129, 140, 248, 0.1)' }}
                />

                <Bar 
                  dataKey="progress" 
                  name="Progress" 
                  radius={[8, 8, 0, 0]}
                  maxBarSize={getChartDimensions().barSize}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                >
                  {getFilteredAssignments().map((entry, index) => {
                    // Simplified color logic: green for completed, orange for in-progress
                    const fillColor = entry.completed ? '#10b981' : '#f59e0b';
                    
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={fillColor}
                        stroke={entry.completed ? '#047857' : 'none'}
                        strokeWidth={entry.completed ? 2 : 0}
                      />
                    );
                  })}
                </Bar>
              </BarChart>             
            </ResponsiveContainer>
            <div className="summary">
              <h4 className="summary-title">
                <FaCheckCircle className="summary-icon completed" />
                Completed Assignments
              </h4>
              <h4 className="summary-title">
                <FaClock className="summary-icon pending" />
                In Progress Assignments
              </h4>
            </div>
          </div>
        </motion.div>

        {assignments.length > 0 && (
          <motion.div 
            className="assignments-section"
            variants={containerVariants}
          >
            <h3 className="section-title">
              <FaCalendarAlt className="section-icon" />
              Assignments
            </h3>
            
            <div className="tab-buttons">
              <button 
                className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All
              </button>
              <button 
                className={`tab-button ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                Upcoming
              </button>
              <button 
                className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                Completed
              </button>
            </div>
            
            <div className="assignments-grid">
              {getFilteredAssignments().map(assignment => (
                <motion.div 
                  key={assignment._id}
                  className="assignment-item"
                  variants={listItemVariants}
                  whileHover={{ y: -4, boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)' }}
                >
                  <div className="assignment-status">
                    {assignment.completed && (
                      <div className="status-indicator completed">
                        <FaCheckCircle style={{ color: '#10b981' }} />
                      </div>
                    )}
                    {!assignment.completed && isDueSoon(assignment.dueDate) && (
                      <div className="status-indicator due-soon">
                        <FaExclamationTriangle style={{ color: '#f59e0b' }} />
                      </div>
                    )}
                    {!assignment.completed && isOverdue(assignment.dueDate) && (
                      <div className="status-indicator overdue">
                        <FaExclamationTriangle style={{ color: '#ef4444' }} />
                      </div>
                    )}
                    
                    {/* Add priority indicator */}
                    {assignment.priority && (
                      <div className={`priority-badge ${assignment.priority}`}>
                        {assignment.priority}
                      </div>
                    )}
                  </div>
                  
                  <div className="assignment-header">
                    <h4 className="assignment-title">{assignment.title}</h4>
                    <div className="assignment-meta">
                      {assignment.courseCode && (
                        <span className="course-code">{assignment.courseCode}</span>
                      )}
                      <span className="meta-icon"><FaCalendarAlt /></span>
                      <span className="assignment-date">{formatDate(assignment.dueDate)}</span>
                    </div>
                  </div>
                  
                  {assignment.description && (
                    <p className="assignment-description">{assignment.description}</p>
                  )}
                  
                  <div className="progress-header">
                    <span className="progress-label">Progress</span>
                    <span className="progress-value">{assignment.progress.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar">
                    <motion.div 
                      className="progress-fill" 
                      initial={{ width: 0 }}
                      animate={{ width: `${assignment.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      style={{ background: assignment.completed ? '#10b981' : '#6366f1' }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Tracker;