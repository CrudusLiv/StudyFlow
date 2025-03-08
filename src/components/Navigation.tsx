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
      path: ROUTES.UNIVERSITY_SCHEDULE, 
      icon: <AiOutlineSchedule size={22} />, 
      label: 'University Schedule' 
    },
    { 
      path: ROUTES.REMINDERS, 
      icon: <AiOutlineBell size={22} />, 
      label: 'Reminders' 
    },
    { 
      path: ROUTES.TRACKER, 
      icon: <AiOutlineLineChart size={22} />, 
      label: 'Progress Tracker' 
    },
    ...isLoggedIn ? [] : [
    { 
      path: ROUTES.PROFILE, 
      icon: <AiOutlineUser size={22} />, 
      label: 'Profile' 
    }],
    ...(isLoggedIn && userRole === 'admin' ? [
      { 
        path: ROUTES.ADMIN, 
        icon: <BsGear size={22} />, 
        label: 'Admin Dashboard' 
      }] 
      : []
    )
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
      </nav>
    </>
  );
};
export default Navigation;
