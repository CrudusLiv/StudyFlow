import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { AiOutlineHome, AiOutlineCalendar, AiOutlineLineChart, AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';
import { BsClipboardCheck, BsBell, BsCalendarCheck } from 'react-icons/bs';
import { FiUser } from 'react-icons/fi';
import { RiBookmarkLine } from 'react-icons/ri';
import { BiLogOut } from 'react-icons/bi';
import { BsGear } from 'react-icons/bs';
import ThemeToggle from './ThemeToggle';
import { ROUTES } from '../lib/routes';

interface Notification {
  id: number;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

const Header = ({ isOpen, toggleSidebar }: { isOpen: boolean; toggleSidebar: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    role: ''
  });
  const isLoggedIn = localStorage.getItem('token');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('http://localhost:5000/api/user', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserData(response.data);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    // Close notifications when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.isRead).length);
  }, [notifications]);

  const markAsRead = async (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUserData({ name: '', email: '', role: '' });
    navigate('/access');
  };

  const renderNotifications = () => (
    <div className="max-h-96 overflow-y-auto">
      {notifications.length > 0 ? (
        <>
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                !notification.isRead ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
              }`}
              onClick={() => markAsRead(notification.id)}
            >
              <h4 className="font-medium text-gray-900 dark:text-white">{notification.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.message}</p>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 block">
                {new Date(notification.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </>
      ) : (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          No notifications
        </div>
      )}
    </div>
  );

  const renderBottomSection = () => (
    <div className="space-y-4">
      <div className={`${!isOpen && 'flex justify-center'} flex items-center gap-2`}>
        <ThemeToggle />
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all relative"
          >
            <BsBell className="text-xl text-gray-600 dark:text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Popup */}
          {showNotifications && (
            <div className="fixed inset-0 z-50 flex items-start justify-center mt-16 px-4 sm:px-0">
              <div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-hidden">
                <div className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        System notifications and updates
                      </p>
                    </div>
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      Mark all read
                    </button>
                  </div>
                </div>
                
                <div className="overflow-y-auto max-h-[calc(80vh-4rem)]">
                  {renderNotifications()}
                </div>
                
                <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoggedIn ? (
        <div className={`${!isOpen && 'justify-center'} group relative`}>
          <Link to="/profile" 
            className={`flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all ${
              !isOpen && 'justify-center'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
              <FiUser className="text-xl text-indigo-600 dark:text-indigo-400" />
            </div>
            {isOpen && (
              <div className="ml-3 text-left">
                <p className="font-medium text-gray-800 dark:text-gray-200">{userData.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{userData.email}</p>
              </div>
            )}
          </Link>

          {/* Tooltip for collapsed state */}
          {!isOpen && (
            <div className="absolute left-full ml-2 pl-2 hidden group-hover:block">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 whitespace-nowrap border border-gray-200 dark:border-gray-700">
                <p className="font-medium text-gray-800 dark:text-gray-200">{userData.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{userData.email}</p>
              </div>
            </div>
          )}

          <button 
            onClick={handleLogout}
            className={`mt-2 flex items-center w-full p-3 rounded-lg bg-red-50 dark:bg-red-900/50 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all ${
              !isOpen && 'justify-center'
            }`}
          >
            <BiLogOut className="text-xl" />
            {isOpen && <span className="ml-3 font-medium">Logout</span>}
          </button>
        </div>
      ) : (
        <Link 
          to="/access" 
          className={`flex items-center p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all ${
            !isOpen && 'justify-center'
          }`}
        >
          <FiUser className="text-xl" />
          {isOpen && <span className="ml-3 font-medium">Log In / Sign Up</span>}
        </Link>
      )}
    </div>
  );

  // Add click handler for navigation items
  const handleNavClick = () => {
    // Close sidebar on mobile when an item is clicked
    if (window.innerWidth < 1024) { // 1024px is our 'lg' breakpoint
      toggleSidebar();
    }
  };

  return (
    <div className="flex bg-transparent">
      {/* Mobile overlay */}
      <div 
        className={`
          fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={toggleSidebar}
      />
      
      {/* Sidebar/Navigation */}
      <nav className={`
        fixed top-0 left-0 h-screen z-50
        bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-lg
        transition-all duration-300
        ${isOpen 
          ? 'xs:w-[240px] sm:w-[280px] md:w-[320px] lg:w-64 translate-x-0' 
          : 'w-16 -translate-x-full lg:translate-x-0'
        }
      `}>
        {/* Mobile menu button */}
        <button 
          className="absolute top-4 right-4 z-50 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 lg:hidden"
          onClick={toggleSidebar}
        >
          {isOpen ? <AiOutlineClose /> : <AiOutlineMenu />}
        </button>

        {/* Logo and navigation links */}
        <div className="h-full flex flex-col">
          <div className="p-4 lg:p-6">
            <div className={`flex items-center space-x-2 mb-8 ${!isOpen && 'justify-center'}`}>
              <RiBookmarkLine className="text-2xl lg:text-3xl text-indigo-600 dark:text-indigo-400" />
              {isOpen && (
                <span className="text-xl lg:text-2xl font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                  StudyFlow
                </span>
              )}
            </div>

            {/* Navigation links */}
            <div className="space-y-2">
              {[
                { path: ROUTES.HOME, icon: <AiOutlineHome />, label: 'Home' },
                { path: ROUTES.UNIVERSITY_SCHEDULE, icon: <BsClipboardCheck />, label: 'University Schedule' },
                { path: ROUTES.SCHEDULE, icon: <AiOutlineCalendar />, label: 'Study Schedule' },
                { path: ROUTES.REMINDERS, icon: <BsCalendarCheck />, label: 'Reminders' },
                { path: ROUTES.TRACKER, icon: <AiOutlineLineChart />, label: 'Tracker' },
                ...(isLoggedIn && userData.role === 'admin' 
                  ? [{ path: ROUTES.ADMIN, icon: <BsGear />, label: 'Admin' }] 
                  : []
                )
              ].map(({ path, icon, label }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={handleNavClick}
                  className={`
                    flex items-center p-3 rounded-lg transition-all duration-200
                    ${location.pathname === path 
                      ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }
                    ${!isOpen && 'justify-center'}
                  `}
                >
                  <span className="text-xl">{icon}</span>
                  {isOpen && <span className="ml-3 text-sm font-medium whitespace-nowrap">{label}</span>}
                </Link>
              ))}
            </div>
          </div>

          {/* Bottom section */}
          <div className="mt-auto p-4 lg:p-6 border-t border-gray-100 dark:border-gray-800">
            {renderBottomSection()}
          </div>
        </div>
      </nav>

      {/* Mobile header - only shown on small screens */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm z-30 lg:hidden">
        <div className="flex items-center justify-between px-4 h-full">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300"
          >
            <AiOutlineMenu className="text-xl" />
          </button>
          <span className="font-semibold text-gray-900 dark:text-white">StudyFlow</span>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            {isLoggedIn && (
              <Link to="/profile" className="p-2">
                <FiUser className="text-xl text-gray-600 dark:text-gray-300" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main content padding for mobile header */}
      <div className="lg:hidden h-16" />
    </div>
  );
};

export default Header;
