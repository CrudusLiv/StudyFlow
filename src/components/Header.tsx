import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { AiOutlineHome, AiOutlineCalendar, AiOutlineLineChart, AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';
import { BsClipboardCheck, BsBell } from 'react-icons/bs';
import { FiUser } from 'react-icons/fi';
import { RiBookmarkLine } from 'react-icons/ri';
import { BiLogOut } from 'react-icons/bi';
import { BsGear } from 'react-icons/bs';

const Header = ({ isOpen, toggleSidebar }: { isOpen: boolean; toggleSidebar: () => void }) => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    role: ''
  });
  const isLoggedIn = localStorage.getItem('token');

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUserData({ name: '', email: '', role: '' });
    navigate('/access');
  };

  return (
    <div className="flex bg-transparent">
      <nav className={`fixed top-0 left-0 h-screen bg-white/95 backdrop-blur-sm shadow-lg transition-all duration-300 z-50 ${isOpen ? 'w-64' : 'w-16'}`}>
        <button 
          className="absolute top-4 right-4 z-50 p-2 rounded-lg text-indigo-600 hover:bg-indigo-50"
          onClick={toggleSidebar}
        >
          {isOpen ? <AiOutlineClose /> : <AiOutlineMenu />}
        </button>

        <div className="p-6">
          <div className={`flex items-center space-x-2 mb-10 ${!isOpen && 'justify-center'}`}>
            <RiBookmarkLine className="text-3xl text-indigo-600" />
            {isOpen && <span className="text-2xl font-bold text-indigo-600">StudyFlow</span>}
          </div>

          <div className="space-y-2">
            <Link to="/" className={`flex items-center p-3 rounded-lg hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 transition-all ${!isOpen && 'justify-center'}`}>
              <AiOutlineHome className="text-xl" />
              {isOpen && <span className="ml-3">Home</span>}
            </Link>
            
            <Link to="/schedule" className={`flex items-center p-3 rounded-lg hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 transition-all ${!isOpen && 'justify-center'}`}>
              <AiOutlineCalendar className="text-xl" />
              {isOpen && <span className="ml-3">Schedule</span>}
            </Link>
            
            <Link to="/tracker" className={`flex items-center p-3 rounded-lg hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 transition-all ${!isOpen && 'justify-center'}`}>
              <AiOutlineLineChart className="text-xl" />
              {isOpen && <span className="ml-3">Tracker</span>}
            </Link>
            
            <Link to="/planner" className={`flex items-center p-3 rounded-lg hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 transition-all ${!isOpen && 'justify-center'}`}>
              <BsClipboardCheck className="text-xl" />
              {isOpen && <span className="ml-3">Planner</span>}
            </Link>
            
            <Link to="/notifications" className={`flex items-center p-3 rounded-lg hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 transition-all ${!isOpen && 'justify-center'}`}>
              <BsBell className="text-xl" />
              {isOpen && <span className="ml-3">Notifications</span>}
            </Link>

            {isLoggedIn && userData.role === 'admin' && (
              <Link to="/admin" className={`flex items-center p-3 rounded-lg hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 transition-all ${!isOpen && 'justify-center'}`}>
                <BsGear className="text-xl" />
                {isOpen && <span className="ml-3">Admin</span>}
              </Link>
            )}
          </div>

          <div className="absolute bottom-0 left-0 w-full p-6">
            {isLoggedIn ? (
              <div className={`${!isOpen && 'justify-center'}`}>
                <div className="mb-4 flex items-center space-x-3">
                  {isOpen && (
                    <>
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <FiUser className="text-xl text-indigo-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-800">{userData.name}</p>
                        <p className="text-sm text-gray-500">{userData.email}</p>
                      </div>
                    </>
                  )}
                </div>
                <button 
                  onClick={handleLogout}
                  className={`flex items-center w-full p-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all ${!isOpen && 'justify-center'}`}
                >
                  <BiLogOut className="text-xl" />
                  {isOpen && <span className="ml-3 font-medium">Logout</span>}
                </button>
              </div>
            ) : (
              <Link 
                to="/access" 
                className={`flex items-center p-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all ${!isOpen && 'justify-center'}`}
              >
                <FiUser className="text-xl" />
                {isOpen && <span className="ml-3 font-medium">Log In / Sign Up</span>}
              </Link>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Header;
