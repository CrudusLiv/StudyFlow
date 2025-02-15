import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="bg-indigo-700 text-white shadow-md">
      <nav className="container mx-auto flex justify-between items-center py-4 px-0 ">
        <h1 className="text-xl font-bold">StudyFlow</h1>
        <div className="space-x-6 flex items-center mr-0 ">
          <Link to="/" className="hover:text-indigo-300 text-lg rounded-2xl bg-white p-3 ">
            Home
          </Link>
          <Link to="/schedule" className="hover:text-indigo-300 text-lg rounded-2xl bg-white p-3">
            Schedule
          </Link>
          <Link to="/tracker" className="hover:text-indigo-300 text-lg rounded-2xl bg-white p-3">
            Tracker
          </Link>
          <Link to="/planner" className="hover:text-indigo-300 text-lg rounded-2xl bg-white p-3">
            Planner
          </Link>
          <Link to="/notifications" className="hover:text-indigo-300 text-lg rounded-2xl bg-white p-3">
          Notifications
          </Link>
          <Link to="/pomodoro" className="hover:text-indigo-300 text-lg rounded-2xl bg-white p-3">
          Pomodoro
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Header;
