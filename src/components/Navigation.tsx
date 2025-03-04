import { Link, useLocation } from 'react-router-dom';
import { AiOutlineHome, AiOutlineCalendar, AiOutlineLineChart } from 'react-icons/ai';
import { BsGear } from 'react-icons/bs';
import { ROUTES } from '../lib/routes';
import '../styles/components/Navigation.css';
import { useEffect, useState } from 'react';

interface NavigationProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  userRole: string;
}

const Navigation = ({ isOpen, onClose, isLoggedIn, userRole }: NavigationProps) => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigationItems = [
    { 
      path: ROUTES.HOME, 
      icon: <AiOutlineHome size={22} />, 
      label: 'Home' 
    },
    { 
      path: ROUTES.SCHEDULE, 
      icon: <AiOutlineCalendar size={22} />, 
      label: 'Schedule' 
    },
    { 
      path: ROUTES.TRACKER, 
      icon: <AiOutlineLineChart size={22} />, 
      label: 'Progress Tracker' 
    },
    ...(isLoggedIn && userRole === 'admin' 
      ? [{ 
          path: ROUTES.ADMIN, 
          icon: <BsGear size={22} />, 
          label: 'Admin Dashboard' 
        }] 
      : []
    )
  ];

  return (
    <>
      {isMobile && (
        <div 
          className={`nav-overlay ${isOpen ? 'active' : ''}`} 
          onClick={onClose}
        />
      )}
      <nav 
        className={`nav-container ${isMobile ? (isOpen ? 'open' : '') : 'desktop'}`}
        style={!isMobile ? { transform: 'none' } : undefined}
      >
        <div className="nav-header">
          <span className="logo">StudyFlow</span>
        </div>
        
        <div className="nav-items">
          {navigationItems.map(({ path, icon, label }) => (
            <Link
              key={path}
              to={path}
              onClick={isMobile ? onClose : undefined}
              className={`nav-item ${location.pathname === path ? 'active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
};

export default Navigation;
