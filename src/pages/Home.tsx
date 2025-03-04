import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages/Home.css';

const Home: React.FC = () => {
  return (
    <div className="home-container">
      <div className="content-wrapper">
        <div className="content-card">
          <h1 className="main-title">Welcome to StudyFlow</h1>
          <p className="subtitle">
            Your all-in-one solution for managing your academic journey.
          </p>
          
          <div className="features-grid">
            <div className="feature-card schedule-card">
              <h2 className="feature-title schedule-title">
                Schedule Management
              </h2>
              <p className="feature-description">
                Organize your classes and study sessions with our intuitive scheduling tools.
              </p>
            </div>
            
            <div className="feature-card progress-card">
              <h2 className="feature-title progress-title">
                Progress Tracking
              </h2>
              <p className="feature-description">
                Monitor your academic progress and stay on top of your goals.
              </p>
            </div>
          </div>

          <div className="cta-section">
            <p className="cta-text">
              Ready to enhance your academic experience?
            </p>
            <Link to="/university-schedule" className="cta-button">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;