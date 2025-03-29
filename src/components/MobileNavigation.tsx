import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaCalendarAlt, FaChartLine, FaBell, FaUser } from 'react-icons/fa';
import '../styles/components/MobileNavigation.css';

const MobileNavigation: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="mobile-navigation">
      <Link to="/home" className={`mobile-nav-item ${isActive('/home') ? 'active' : ''}`}>
        <FaHome className="mobile-nav-icon" />
        <span className="mobile-nav-label">Home</span>
      </Link>
      
      <Link to="/schedule" className={`mobile-nav-item ${isActive('/schedule') ? 'active' : ''}`}>
        <FaCalendarAlt className="mobile-nav-icon" />
        <span className="mobile-nav-label">Schedule</span>
      </Link>
      
      <Link to="/tracker" className={`mobile-nav-item ${isActive('/tracker') ? 'active' : ''}`}>
        <FaChartLine className="mobile-nav-icon" />
        <span className="mobile-nav-label">Progress</span>
      </Link>
      
      <Link to="/reminders" className={`mobile-nav-item ${isActive('/reminders') ? 'active' : ''}`}>
        <FaBell className="mobile-nav-icon" />
        <span className="mobile-nav-label">Reminders</span>
      </Link>
      
      <Link to="/profile" className={`mobile-nav-item ${isActive('/profile') ? 'active' : ''}`}>
        <FaUser className="mobile-nav-icon" />
        <span className="mobile-nav-label">Profile</span>
      </Link>
    </nav>
  );
};

export default MobileNavigation;
