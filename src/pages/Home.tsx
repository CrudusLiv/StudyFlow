import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaChartLine, FaClock, FaTasks, FaArrowRight, FaSpinner } from 'react-icons/fa';
import '../styles/pages/Home.css';

interface Assignment {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  dueDate: string;
  progress: number;
  completed: boolean;
}

const testAssignments: Assignment[] = [
  // ...existing code...
];

const Home: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  const fadeInUp = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.5 }
  };

  return (
    <motion.div 
      className="home-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="content-wrapper">
        <motion.div 
          className="content-card"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          <motion.h1 
            className="main-title"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            Welcome to StudyFlow
          </motion.h1>
          
          <p className="subtitle">
            Your all-in-one solution for managing your academic journey.
          </p>
          
          <motion.div 
            className="features-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, staggerChildren: 0.1 }}
          >
            <motion.div 
              className="feature-card schedule-card"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNavigate('/schedule')}
              onKeyDown={(e) => e.key === 'Enter' && handleNavigate('/schedule')}
            >
              <FaCalendarAlt className="feature-icon" />
              <h2 className="feature-title schedule-management-title">
                Let's get started on scheduling!
              </h2>
              <p className="feature-description">
                Organize your classes and study sessions with our intuitive scheduling tools.
              </p>
              <div className="feature-cta">
                <button className="feature-cta-text">Go to Schedule</button>
                <FaArrowRight className="feature-cta-icon" />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Home;