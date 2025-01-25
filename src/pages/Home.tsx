import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen bg-indigo-100 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-indigo-700 mb-8">Welcome to StudyFlow</h1>
      <div className="flex space-x-4">
        <Link to="/planner">
          <button className="py-3 px-6 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-500 transition">
            Planner
          </button>
        </Link>
        <Link to="/schedule">
          <button className="py-3 px-6 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-500 transition">
            Schedule
          </button>
        </Link>
      </div>
    </div>
  );
};

export default Home;
