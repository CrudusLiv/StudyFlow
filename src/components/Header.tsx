import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiBell, FiLogOut, FiMoon, FiSun, FiMenu } from 'react-icons/fi';
import '../styles/components/Header.css';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import useReminderCount from '../hooks/useReminderCount';

const Header: React.FC = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { reminders, count: notificationCount, markAsRead } = useReminderCount();
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);
    
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
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
              {notificationCount > 0 && (
                <span className="notification-badge">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
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
                  <h3>Reminders</h3>
                  <div className="notification-items">
                    {reminders.length > 0 ? (
                      reminders.map(reminder => (
                        <div key={reminder._id} className="notification-item">
                          <p>{reminder.title}</p>
                          <small>{formatDate(reminder.reminderDate)}</small>
                          <button 
                            className="mark-read-btn" 
                            onClick={() => handleMarkAsRead(reminder._id)}
                            aria-label="Mark as read"
                          >
                            ✓
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="empty-notifications">
                        <p>No new reminders</p>
                      </div>
                    )}
                  </div>
                  <Link to="/reminders" className="view-all">
                    View all reminders
                  </Link>
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
