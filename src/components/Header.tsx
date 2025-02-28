import { Link } from 'react-router-dom';
import { useState } from 'react';
import { AiOutlineHome, AiOutlineCalendar, AiOutlineLineChart, AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';
import { BsClipboardCheck, BsBell } from 'react-icons/bs';
import { FiUser } from 'react-icons/fi';
import { RiBookmarkLine } from 'react-icons/ri';

const Header = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex bg-transparent">
      {/* Sidebar Navigation */}
        <nav className={`fixed top-0 left-0 h-screen bg-white/95 backdrop-blur-sm shadow-lg transition-all duration-300 z-50 ${isOpen ? 'w-64' : 'w-16'}`}>
        {/* Toggle Button */}
        <button 
          className="absolute top-4 right-4 z-50 p-2 rounded-lg text-indigo-600 hover:bg-indigo-50"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <AiOutlineClose /> : <AiOutlineMenu />}
        </button>

        <div className="p-6">
          {/* Logo Section */}
          <div className={`flex items-center space-x-2 mb-10 ${!isOpen && 'justify-center'}`}>
            <RiBookmarkLine className="text-3xl text-indigo-600" />
            {isOpen && <span className="text-2xl font-bold text-indigo-600">StudyFlow</span>}
          </div>

          {/* Navigation Links */}
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
          </div>

          {/* User Section at Bottom */}
          <div className="absolute bottom-0 left-0 w-full p-6">
            <Link to="/access" className={`flex items-center p-3 rounded-lg hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 transition-all ${!isOpen && 'justify-center'}`}>
              <FiUser className="text-xl" />
              {isOpen && <span className="ml-3">Log In / Sign Up</span>}
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Header;
