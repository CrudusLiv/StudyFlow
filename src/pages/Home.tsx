import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaChartLine, FaArrowRight } from 'react-icons/fa';
import '../styles/pages/Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <FaCalendarAlt />,
      title: "Smart Scheduling",
      description: "Plan your academic journey with our intelligent scheduling system",
      path: "/schedule"
    },
    {
      icon: <FaChartLine />,
      title: "Track Progress",
      description: "Monitor your academic growth with detailed analytics and insights",
      path: "/tracker"
    }
  ];

  return (
    <motion.div 
      className="home-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="content-wrapper">
        <motion.div 
          className="hero-section"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="main-title">Transform Your Study Journey</h1>
          <p className="subtitle">
            Maximize your academic potential with our intelligent study management platform
          </p>
        </motion.div>

        <motion.div 
          className="features-grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="feature-card"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 * (index + 1) }}
              onClick={() => navigate(feature.path)}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h2 className="feature-title">{feature.title}</h2>
              <p className="feature-description">{feature.description}</p>
              <div className="feature-cta">
                Get Started <FaArrowRight />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Home;