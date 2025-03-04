import { Link, useLocation } from 'react-router-dom';
import { AiOutlineHome, AiOutlineCalendar, AiOutlineLineChart } from 'react-icons/ai';
import {  BsGear } from 'react-icons/bs';
import { ROUTES } from '../lib/routes';
import '../styles/components/Navigation.css';

interface NavigationProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  userRole: string;
}

const Navigation = ({ isOpen, onClose, isLoggedIn, userRole }: NavigationProps) => {
  const location = useLocation();

  const navigationItems = [
    { path: ROUTES.HOME, icon: <AiOutlineHome />, label: 'Home' },
    { path: ROUTES.SCHEDULE, icon: <AiOutlineCalendar />, label: 'Schedule' },
    { path: ROUTES.TRACKER, icon: <AiOutlineLineChart />, label: 'Progress Tracker' },
    ...(isLoggedIn && userRole === 'admin' 
      ? [{ path: ROUTES.ADMIN, icon: <BsGear />, label: 'Admin Dashboard' }] 
      : []
    )
  ];

  return (
    <>
      <div className={`nav-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <nav className={`nav-container ${isOpen ? 'open' : ''}`}>
        <div className="nav-header">
          <span className="logo">StudyFlow</span>
        </div>
        
        <div className="nav-items">
          {navigationItems.map(({ path, icon, label }) => (
            <Link
              key={path}
              to={path}
              onClick={onClose}
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