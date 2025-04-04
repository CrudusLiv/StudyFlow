import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiBell, FiLogOut, FiMoon, FiSun, FiMenu } from 'react-icons/fi';
import '../styles/components/Header.css';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Header: React.FC = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  // Refs for dropdown menus
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleProfileDropdown = () => {
    setIsProfileOpen(!isProfileOpen);
    setIsNotificationsOpen(false);
  };

  const toggleNotificationsDropdown = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    setIsProfileOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Animation variants
  const dropdownVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring",
        stiffness: 400,
        damping: 25
      } 
    },
    exit: { 
      opacity: 0, 
      y: -10, 
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  const iconButtonVariants = {
    hover: { scale: 1.1 },
    tap: { scale: 0.9 }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <motion.header 
      className="app-header"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="header-container">
        <div className="header-left">
          {/* Mobile menu button moved to Navigation component */}
        </div>
        
        <div className="header-right">
          <motion.button 
            className="theme-toggle" 
            onClick={toggleTheme}
            whileHover="hover"
            whileTap="tap"
            variants={iconButtonVariants}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
          </motion.button>
          
          <div className="notifications-dropdown" ref={notificationsRef}>
            <motion.button 
              className="notifications-button" 
              onClick={toggleNotificationsDropdown}
              whileHover="hover"
              whileTap="tap"
              variants={iconButtonVariants}
              aria-label="Notifications"
            >
              <FiBell />
              <span className="notification-badge">3</span>
            </motion.button>
            
            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div 
                  className="dropdown-menu notifications-menu"
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <h3>Notifications</h3>
                  <div className="notification-items">
                    <div className="notification-item">
                      <p>New message from professor</p>
                      <small>2 minutes ago</small>
                    </div>
                    <div className="notification-item">
                      <p>Assignment due tomorrow</p>
                      <small>1 hour ago</small>
                    </div>
                    <div className="notification-item">
                      <p>Study session scheduled</p>
                      <small>Yesterday</small>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="profile-dropdown" ref={profileRef}>
            <motion.button 
              className="profile-button" 
              onClick={toggleProfileDropdown}
              whileHover="hover"
              whileTap="tap"
              variants={iconButtonVariants}
              aria-label="User profile"
            >
              <FiUser />
            </motion.button>
            
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div 
                  className="dropdown-menu profile-menu"
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <Link to="/profile" className="dropdown-item">
                    <FiUser />
                    <span>Profile</span>
                  </Link>
                  <button className="dropdown-item logout-button" onClick={handleLogout}>
                    <FiLogOut />
                    <span>Logout</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
