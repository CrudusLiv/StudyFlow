import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="bg-indigo-700 text-white shadow-md">
      <nav className="container mx-auto flex justify-between items-center py-4 px-6">
        <h1 className="text-2xl font-bold">StudyFlow</h1>
        <div className="space-x-6">
          <Link to="/" className="hover:text-indigo-300 text-lg">
            Home
          </Link>
          <Link to="/schedule" className="hover:text-indigo-300 text-lg">
            Schedule
          </Link>
          <Link to="/tracker" className="hover:text-indigo-300 text-lg">
            Tracker
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Header;
