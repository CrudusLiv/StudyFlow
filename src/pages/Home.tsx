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

  const featureCards = [
    {
      icon: <FaCalendarAlt />,
      title: "Schedule Management",
      description: "Plan your academic journey with our intelligent scheduling system.",
      path: "/schedule",
      className: "schedule-card"
    },
    {
      icon: <FaChartLine />,
      title: "Progress Tracking",
      description: "Visualize your academic growth and track assignments efficiently.",
      path: "/tracker",
      className: "progress-card"
    },
    {
      icon: <FaClock />,
      title: "Smart Reminders",
      description: "Stay on top of deadlines with personalized notifications.",
      path: "/reminders",
      className: "reminder-card"
    }
  ];

  return (
    <motion.div 
      className="home-container"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageVariants}
    >
      <div className="content-wrapper">
        <motion.div className="content-card">
          <motion.h1 
            className="main-title"
            variants={fadeIn}
          >
            Welcome to StudyFlow
          </motion.h1>
          
          <motion.div 
            className="features-grid"
            variants={staggeredGrid}
          >
            {featureCards.map((card, index) => (
              <motion.div
                key={card.title}
                className={`feature-card ${card.className}`}
                variants={gridItemVariants}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                onClick={() => handleNavigate(card.path)}
              >
                <div className="feature-icon">{card.icon}</div>
                <h2 className="feature-title">{card.title}</h2>
                <p className="feature-description">{card.description}</p>
                <motion.div 
                  className="feature-cta"
                  whileHover={{ x: 4 }}
                >
                  <span>Get Started</span>
                  <FaArrowRight />
                </motion.div>
              </motion.div>
            ))}
          </motion.div>

          {!loading && assignments.length > 0 && (
            <motion.div 
              className="dashboard-section"
              variants={containerVariants}
            >
              <h2 className="section-title">
                <FaTasks />
                Active Assignments
              </h2>
              
              <motion.div 
                className="assignments-grid"
                variants={staggeredGrid}
              >
                {assignments.map((assignment) => (
                  <AssignmentCard 
                    key={assignment._id}
                    assignment={assignment}
                    formatDate={formatDate}
                    getDaysRemaining={getDaysRemaining}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

const AssignmentCard: React.FC<{ 
  assignment: Assignment; 
  formatDate: (date: string) => string;
  getDaysRemaining: (date: string) => number;
}> = ({ assignment, formatDate, getDaysRemaining }) => {
  return (
    <motion.div 
      className="assignment-item"
      variants={gridItemVariants}
      whileHover={{ y: -4 }}
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
  );
};

export default Home;