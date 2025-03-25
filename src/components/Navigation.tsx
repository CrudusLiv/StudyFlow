import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiHome,
  FiCalendar,
  FiBook,
  FiClock,
  FiUser,
  FiLogOut,
  FiSun,
  FiMoon
} from 'react-icons/fi';
import { ROUTES } from '../lib/routes';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import '../styles/components/Navigation.css';

interface NavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

const Navigation = ({ isOpen, onClose }: NavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navigationItems = [
    {
      path: ROUTES.HOME,
      icon: <FiHome size={22} />,
      label: 'Home'
    },
    {
      path: ROUTES.SCHEDULE,
      icon: <FiCalendar size={22} />,
      label: 'Study Schedule'
    },
    {
      path: ROUTES.REMINDERS,
      icon: <FiClock size={22} />,
      label: 'Reminders'
    },
    {
      path: ROUTES.TRACKER,
      icon: <FiBook size={22} />,
      label: 'Progress Tracker'
    },
    {
      path: ROUTES.PROFILE,
      icon: <FiUser size={22} />,
      label: 'Profile'
    },
    ...(user?.role === 'admin' ? [
      {
        path: ROUTES.ADMIN,
        icon: <FiLogOut size={22} />,
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
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
        </button>
      </nav>
    </>
  );
};

export default Navigation;
