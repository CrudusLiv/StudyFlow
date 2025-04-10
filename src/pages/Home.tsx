import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaCalendarAlt, FaChartLine, FaClock, FaTasks, FaArrowRight, FaSpinner } from 'react-icons/fa';
import {
  pageVariants,
  containerVariants,
  staggeredGrid,
  gridItemVariants,
  fadeIn
} from '../utils/animationConfig';
import '../styles/pages/Home.css';
import AccessDenied from '../components/AccessDenied';

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
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showAccessDenied, setShowAccessDenied] = useState(false);

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setAssignments(testAssignments);
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (location.state && (location.state as any).accessDenied) {
      setShowAccessDenied(true);
      // Clear the state after a short delay
      const timer = setTimeout(() => {
        window.history.replaceState({}, document.title);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location]);

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

  const heroVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  if (showAccessDenied) {
    return <AccessDenied />;
  }

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
          className="hero-section"
          variants={heroVariants}
        >
          <motion.h1 
            className="main-title"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            Transform Your <br />
            Study Experience
          </motion.h1>
          
          <motion.p 
            className="subtitle"
            variants={fadeIn}
          >
            Streamline your academic journey with intelligent scheduling, progress tracking, and personalized study tools.
          </motion.p>
        </motion.div>

        <motion.div 
          className="features-grid"
          variants={staggeredGrid}
        >
          {[
            {
              icon: <FaCalendarAlt />,
              title: "Smart Schedule",
              description: "AI-powered scheduling that adapts to your study patterns and preferences",
              path: "/schedule",
              order: 1
            },
            {
              icon: <FaChartLine />,
              title: "Progress Analytics",
              description: "Visualize your academic progress with detailed insights and trends",
              path: "/tracker",
              order: 2
            }
          ].map((feature, index) => (
            <motion.div 
              key={index}
              className="feature-card"
              variants={gridItemVariants}
              whileHover="hover"
              style={{ "--animation-order": feature.order } as React.CSSProperties}
              onClick={() => handleNavigate(feature.path)}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h2 className="feature-title">{feature.title}</h2>
              <p className="feature-description">{feature.description}</p>
              <motion.div 
                className="feature-cta"
                whileHover={{ x: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <span>Explore</span>
                <FaArrowRight />
              </motion.div>
            </motion.div>
          ))}
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
      </div>
    </motion.div>
  );
};

export default Home;