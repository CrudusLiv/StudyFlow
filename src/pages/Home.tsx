import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaChartLine, FaClock, FaTasks, FaArrowRight, FaSpinner } from 'react-icons/fa';
import {
  pageVariants,
  containerVariants,
  staggeredGrid,
  gridItemVariants,
  fadeIn
} from '../utils/animationConfig';
import '../styles/pages/Home.css';

interface Assignment {
  _id: string;
  title: string;
  courseCode: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  progress: number;
}

const testAssignments: Assignment[] = [
  {
    _id: '1',
    title: 'Database Design Project',
    courseCode: 'CS305',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    progress: 75
  },
  {
    _id: '2',
    title: 'Algorithm Analysis Report',
    courseCode: 'CS341',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'medium',
    progress: 30
  },
  {
    _id: '3',
    title: 'UI/UX Research',
    courseCode: 'DES201',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    progress: 90
  },
  {
    _id: '4',
    title: 'Physics Lab Report',
    courseCode: 'PHYS202',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'low',
    progress: 50
  }
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setAssignments(testAssignments);
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  // Format date function
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate days remaining
  const getDaysRemaining = (dateString: string) => {
    const dueDate = new Date(dateString);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <motion.div 
      className="home-container"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageVariants}
    >
      <div className="content-wrapper">
        <motion.div 
          className="content-card"
          variants={containerVariants}
        >
          <motion.h1 
            className="main-title"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            Welcome to StudyFlow
          </motion.h1>
          
          <motion.p 
            className="subtitle"
            variants={fadeIn}
          >
            Your all-in-one solution for managing your academic journey.
          </motion.p>
          
          <motion.div 
            className="features-grid"
            variants={staggeredGrid}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              className="feature-card schedule-card"
              variants={gridItemVariants}
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNavigate('/schedule')}
            >
              <FaCalendarAlt className="feature-icon" />
              <h2 className="feature-title schedule-management-title">
                Schedule Management
              </h2>
              <p className="feature-description">
                Organize your classes and study sessions with our intuitive scheduling tools.
              </p>
              <div className="feature-cta">
                <span className="feature-cta-text">Go to Schedule</span>
                <FaArrowRight className="feature-cta-icon" />
              </div>
            </motion.div>

            <motion.div 
              className="feature-card progress-card"
              variants={gridItemVariants}
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNavigate('/tracker')}
            >
              <FaChartLine className="feature-icon" />
              <h2 className="feature-title progress-tracking-title">
                Progress Tracking
              </h2>
              <p className="feature-description">
                Monitor your academic progress and visualize your achievements.
              </p>
              <div className="feature-cta">
                <span className="feature-cta-text">View Progress</span>
                <FaArrowRight className="feature-cta-icon" />
              </div>
            </motion.div>

            <motion.div 
              className="feature-card reminder-card"
              variants={gridItemVariants}
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNavigate('/reminders')}
            >
              <FaClock className="feature-icon" />
              <h2 className="feature-title reminders-title">
                Smart Reminders
              </h2>
              <p className="feature-description">
                Never miss a deadline with customizable reminder notifications.
              </p>
              <div className="feature-cta">
                <span className="feature-cta-text">Set Reminders</span>
                <FaArrowRight className="feature-cta-icon" />
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            className="dashboard-section"
            variants={containerVariants}
          >
            <h2 className="section-title">
              <FaTasks className="section-icon" />
              Upcoming Assignments
            </h2>
            
            {loading ? (
              <div className="loading-container">
                <FaSpinner className="loading-spinner" />
                <p>Loading your assignments...</p>
              </div>
            ) : (
              <motion.div 
                className="assignments-grid"
                variants={staggeredGrid}
                initial="hidden"
                animate="visible"
              >
                {assignments.map((assignment) => (
                  <motion.div 
                    key={assignment._id}
                    className={`assignment-item priority-${assignment.priority}`}
                    variants={gridItemVariants}
                    whileHover="hover"
                  >
                    <div className="assignment-header">
                      <h3 className="assignment-title">{assignment.title}</h3>
                      <span className="assignment-course">{assignment.courseCode}</span>
                    </div>
                    <div className="assignment-details">
                      <div className="assignment-due">
                        Due: {formatDate(assignment.dueDate)}
                      </div>
                      <div className="assignment-days-left">
                        {getDaysRemaining(assignment.dueDate)} days left
                      </div>
                    </div>
                    <div className="assignment-progress">
                      <div className="progress-text">
                        Progress: {assignment.progress}%
                      </div>
                      <div className="progress-bar">
                        <motion.div 
                          className="progress-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${assignment.progress}%` }}
                          transition={{ duration: 1, delay: 0.3 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Home;