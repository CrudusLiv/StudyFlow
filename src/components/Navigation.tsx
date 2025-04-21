import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiCalendar, 
  FiBarChart2,
  FiMenu, 
  FiX, 
  FiCheckSquare, 
  FiUser,
  FiShield // Added Shield icon for admin
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/components/Navigation.css';
import { useAuth } from '../contexts/AuthContext';
import { rightSideNavVariants, rightSideItemVariants } from '../utils/rightSideNavigation';


const Navigation: React.FC = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, userRole, refreshUserData } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  // Improved admin check with detailed logging
  const isAdmin = userRole && (userRole.toLowerCase() === 'admin');
  
  useEffect(() => {
    console.log('Navigation - Current user role:', userRole);
    console.log('Navigation - Is admin?', isAdmin);
    console.log('Navigation - Role type:', typeof userRole);
    
    // Refresh user data when component mounts to ensure role is current
    if (isAuthenticated) {
      refreshUserData().catch(err => console.error('Failed to refresh user data:', err));
    }
  }, [isAuthenticated, userRole, isAdmin, refreshUserData]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-left">
          <div className="na">
            <Link to="/">
              <motion.div 
                initial={{ scale: 0.9, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5 }}
              >
                StudyFlow
              </motion.div>
            </Link>
          </div>
        </div>

        <div className="nav-right">
          <motion.button 
            className="menu-toggle" 
            onClick={toggleMenu}
            whileTap={{ scale: 0.9 }}
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? <FiX /> : <FiMenu />}
          </motion.button>
        </div>

        <div className="nav-desktop">
          <motion.div 
            className="nav-items"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { 
                  staggerChildren: 0.1,
                  delayChildren: 0.3
                }
              }
            }}
          >
            <motion.div variants={rightSideItemVariants}>
              <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
                <FiHome className="nav-icon" />
                <span>Home</span>
              </Link>
            </motion.div>
            
            <motion.div variants={rightSideItemVariants}>
              <Link to="/schedule" className={location.pathname === '/schedule' ? 'active' : ''}>
                <FiCalendar className="nav-icon" />
                <span>Schedule</span>
              </Link>
            </motion.div>
            
            <motion.div variants={rightSideItemVariants}>
              <Link to="/tracker" className={location.pathname === '/tracker' ? 'active' : ''}>
                <FiBarChart2 className="nav-icon" />
                <span>Tracker</span>
              </Link>
            </motion.div>
            
            <motion.div variants={rightSideItemVariants}>
              <Link to="/reminders" className={location.pathname === '/reminders' ? 'active' : ''}>
                <FiCheckSquare className="nav-icon" />
                <span>Reminders</span>
              </Link>
            </motion.div>
            
            <motion.div variants={rightSideItemVariants}>
              <Link to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>
                <FiUser className="nav-icon" />
                <span>Profile</span>
              </Link>
            </motion.div>

            {/* Admin link - only visible to admin users */}
            {isAdmin && (
              <motion.div variants={rightSideItemVariants}>
                <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
                  <FiShield className="nav-icon" />
                  <span>Admin</span>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            className="mobile-menu"
            variants={rightSideNavVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            ref={menuRef}
          >
            <div className="mobile-menu-header">
              <div className="logo">StudyFlow</div>
              <motion.button 
                className="close-menu" 
                onClick={() => setIsMenuOpen(false)}
                whileTap={{ scale: 0.9 }}
                aria-label="Close menu"
              >
                <FiX />
              </motion.button>
            </div>
            
            <motion.div className="mobile-nav-items">
              <motion.div variants={rightSideItemVariants}>
                <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
                  <FiHome className="nav-icon" />
                  <span>Home</span>
                </Link>
              </motion.div>
              
              <motion.div variants={rightSideItemVariants}>
                <Link to="/schedule" className={location.pathname === '/schedule' ? 'active' : ''}>
                  <FiCalendar className="nav-icon" />
                  <span>Schedule</span>
                </Link>
              </motion.div>
              
              <motion.div variants={rightSideItemVariants}>
                <Link to="/tracker" className={location.pathname === '/tracker' ? 'active' : ''}>
                  <FiBarChart2 className="nav-icon" />
                  <span>Progress</span>
                </Link>
              </motion.div>
              
              <motion.div variants={rightSideItemVariants}>
                <Link to="/reminders" className={location.pathname === '/reminders' ? 'active' : ''}>
                  <FiCheckSquare className="nav-icon" />
                  <span>Reminders</span>
                </Link>
              </motion.div>
              
              <motion.div variants={rightSideItemVariants}>
                <Link to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>
                  <FiUser className="nav-icon" />
                  <span>Profile</span>
                </Link>
              </motion.div>

              {/* Admin link in mobile menu - only visible to admin users */}
              {isAdmin && (
                <motion.div variants={rightSideItemVariants}>
                  <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
                    <FiShield className="nav-icon" />
                    <span>Admin</span>
                  </Link>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navigation;
