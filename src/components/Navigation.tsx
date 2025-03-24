import { Link, useLocation } from 'react-router-dom';
import {
  AiOutlineHome,
  AiOutlineCalendar,
  AiOutlineLineChart,
  AiOutlineSchedule,
  AiOutlineBell,
  AiOutlineUser
} from 'react-icons/ai';
import { BsGear } from 'react-icons/bs';
import { FiSun, FiMoon } from 'react-icons/fi';
import { ROUTES } from '../lib/routes';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/components/Navigation.css';

interface NavigationProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  userRole: string;
}

const Navigation = ({ isOpen, onClose, isLoggedIn, userRole }: NavigationProps) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navigationItems = [
    {
      path: ROUTES.HOME,
      icon: <AiOutlineHome size={22} />,
      label: 'Home'
    },
    {
      path: ROUTES.SCHEDULE,
      icon: <AiOutlineCalendar size={22} />,
      label: 'Study Schedule'
    },
   {
      path: ROUTES.REMINDERS,
      icon: <AiOutlineBell size={22}/>,
      label: 'Reminders'
    },
   {
      path: ROUTES.TRACKER,
      icon: <AiOutlineLineChart size={22}/>,
      label: 'Progress Tracker'
    },
   {
      path: ROUTES.PROFILE,
      icon: <AiOutlineUser size={22}/>,
      label: 'Profile'
    },
    ...(userRole === 'admin' ? [
     {
        path: ROUTES.ADMIN,
        icon: <BsGear size={22}/>,
        label: 'Admin Dashboard'
      }
    ] : [])
  ];

  return (
    <>
      {isOpen && <div className="nav-backdrop" onClick={onClose}></div>}
      <nav className={`nav-container ${isOpen ? 'open' : ''}`}>
        <div className="nav-header">
          <span className="logo">StudyFlow</span>
          <button className="close-button" onClick={onClose}></button>
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
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <FiMoon size={20} /> : <FiSun size={20} />}
        </button>
      </nav>
    </>
  );
};
export default Navigation;
