import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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

interface Assignment {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  dueDate: string;
  progress: number;
  completed: boolean;
}

interface ProgressStats {
  totalAssignments: number;
  completedAssignments: number;
  overallProgress: number;
  timeRemaining: number;
  upcomingDeadlines: number;
}

// Add example data
const exampleAssignments: Assignment[] = [
  {
    _id: '1',
    title: 'Database Design Project',
    description: 'ERD and Schema Design',
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 75,
    completed: false
  },
  {
    _id: '2',
    title: 'Operating Systems Report',
    description: 'Process Scheduling Analysis',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 90,
    completed: false
  },
  {
    _id: '3',
    title: 'Web Development Project',
    description: 'React Frontend Implementation',
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 45,
    completed: false
  },
  {
    _id: '4',
    title: 'Algorithm Assignment',
    description: 'Dynamic Programming Solutions',
    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 100,
    completed: true
  },
  {
    _id: '5',
    title: 'Software Testing',
    description: 'Unit Test Implementation',
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 30,
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

  // Fetch assignments from the API
  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/assignments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.length > 0) {
        setAssignments(response.data);
      } else {
        // Use example data if API returns empty array
        console.log('Using example data - No assignments from API');
        setAssignments(exampleAssignments);
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      // Use example data on error
      setAssignments(exampleAssignments);
      setError('Using example data - API unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    // Set up periodic refresh
    const interval = setInterval(fetchAssignments, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Calculate progress and update stats whenever assignments change
  useEffect(() => {
    if (assignments.length > 0) {
      updateProgressStats();
    }
  }, [assignments]);

  const calculateProgress = useCallback((assignment: Assignment) => {
    const now = new Date().getTime();
    const dueDate = new Date(assignment.dueDate).getTime();
    const startDate = assignment.startDate ? new Date(assignment.startDate).getTime() : now - (24 * 60 * 60 * 1000);
    const totalDuration = dueDate - startDate;
    const elapsed = now - startDate;
    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  }, []);

  const updateProgressStats = useCallback(() => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.completed).length;
    const progress = assignments.reduce((acc, curr) => acc + (curr.progress || 0), 0) / total;
    
    const now = new Date().getTime();
    const remainingAssignments = assignments.filter(a => !a.completed);
    const avgTimeRemaining = remainingAssignments.reduce((acc, curr) => {
      const dueDate = new Date(curr.dueDate).getTime();
      return acc + (dueDate - now);
    }, 0) / (remainingAssignments.length || 1);

    // Count assignments due in the next 3 days
    const upcomingDeadlines = assignments.filter(a => {
      const dueDate = new Date(a.dueDate).getTime();
      return !a.completed && (dueDate - now) <= (3 * 24 * 60 * 60 * 1000);
    }).length;

    setStats({
      totalAssignments: total,
      completedAssignments: completed,
      overallProgress: progress,
      timeRemaining: avgTimeRemaining / (1000 * 60 * 60 * 24),
      upcomingDeadlines
    });
  }, [assignments]);

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

  // Show error state
  if (error) {
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
          <div className="error">{error}</div>
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
                data={assignments.length > 0 ? assignments : exampleAssignments}
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
                  {(assignments.length > 0 ? assignments : exampleAssignments).map((entry, index) => {
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
      </motion.div>
    </motion.div>
  );
};

export default Tracker;