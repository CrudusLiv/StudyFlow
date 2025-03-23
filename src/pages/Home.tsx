import React, { useState, useEffect } from 'react';import { Link, useNavigate } from 'react-router-dom';
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

  return (
    <div className="home-container">
      <div className="content-wrapper">
        <div className="content-card">
          <h1 className="main-title">Welcome to StudyFlow</h1>
          <p className="subtitle">
            Your all-in-one solution for managing your academic journey.
          </p>
          
          <div className="features-grid">
            <div 
              className="feature-card schedule-card" 
              onClick={() => handleNavigate('/schedule')}
              role="button"
              tabIndex={0}
              aria-label="Navigate to Schedule Management"
              onKeyDown={(e) => e.key === 'Enter' && handleNavigate('/schedule')}
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
            </div>
            
            <div 
              className="feature-card progress-card"
              onClick={() => handleNavigate('/progress')}
              role="button"
              tabIndex={0}
              aria-label="Navigate to Progress Tracking"
              onKeyDown={(e) => e.key === 'Enter' && handleNavigate('/progress')}
            >
              <FaChartLine className="feature-icon" />
              <h2 className="feature-title progress-title">
                Progress Tracking
              </h2>
              <p className="feature-description">
                Monitor your academic progress and stay on top of your goals.
              </p>
              <div className="feature-cta">
                <span className="feature-cta-text">View Progress</span>
                <FaArrowRight className="feature-cta-icon" />
              </div>
            </div>
          </div>

          <div className="assignments-list">
            <h3 className="section-title">
              <FaTasks className="section-icon" /> Active Assignments
            </h3>
            {loading ? (
              <div className="loading-container">
                <FaSpinner className="loading-spinner" />
                <p>Loading assignments...</p>
              </div>
            ) : (
              <div className="assignments-grid">
                {assignments
                  .filter(assignment => assignment.progress < 100)
                  .map(assignment => (
                    <div key={assignment._id} className="assignment-item">
                      <div className="assignment-header">
                        <h4 className="assignment-title">{assignment.title}</h4>
                        <div className="assignment-meta">
                          <FaClock className="meta-icon" />
                          <span className="assignment-date">
                            Due: {new Date(assignment.dueDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      <p className="assignment-description">{assignment.description}</p>
                      <div className="progress-container">
                        <div className="progress-header">
                          <span className="progress-value">{assignment.progress}%</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${assignment.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;