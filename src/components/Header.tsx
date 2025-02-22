import { Link } from 'react-router-dom';
import { AiOutlineHome, AiOutlineCalendar, AiOutlineLineChart } from 'react-icons/ai';
import { BsClipboardCheck, BsBell } from 'react-icons/bs';
import { FiUser } from 'react-icons/fi';

const Header = () => {
  return (
    <header className="w-full bg-indigo-700 text-white shadow-md">
      <nav className="w-full max-w-[2000px] mx-auto flex justify-between items-center py-4 px-6 ">
        <h1 className="text-xl font-bold">StudyFlow</h1>
        <div className="flex items-center gap-4">
          <Link to="/" className="hover:text-indigo-300 text-lg rounded-2xl bg-white p-3 w-32 text-center flex items-center justify-center gap-2">
            <AiOutlineHome /> Home
          </Link>
          <Link to="/schedule" className="hover:text-indigo-300 text-lg rounded-2xl bg-white p-3 w-32 text-center flex items-center justify-center gap-2">
            <AiOutlineCalendar /> Schedule
          </Link>
          <Link to="/tracker" className="hover:text-indigo-300 text-lg rounded-2xl bg-white p-3 w-32 text-center flex items-center justify-center gap-2">
            <AiOutlineLineChart /> Tracker
          </Link>
          <Link to="/planner" className="hover:text-indigo-300 text-lg rounded-2xl bg-white p-3 w-32 text-center flex items-center justify-center gap-2">
            <BsClipboardCheck /> Planner
          </Link>
          <Link to="/notifications" className="hover:text-indigo-300 text-lg rounded-2xl bg-white p-3 w-32 text-center flex items-center justify-center gap-2">
            <BsBell /> Notifications
          </Link>
          <Link to="/access" className="hover:text-indigo-300 text-lg rounded-2xl bg-white p-3 w-32 text-center flex items-center justify-center gap-2">
            <FiUser /> Log In / Sign Up
          </Link>
        </div>
      </nav>
    </header>
  );
};
export default Header;
