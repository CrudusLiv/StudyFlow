import { Link } from 'react-router-dom';
import { BsCalendarCheck, BsGraphUp } from 'react-icons/bs';
import { RiBookmarkLine } from 'react-icons/ri';

const Home = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="text-center p-12 bg-white rounded-xl shadow-lg w-full max-w-3xl mx-4 transform hover:scale-[1.02] transition-transform duration-300">
        <h2 className="text-7xl leading-normals font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent mb-8">
          <span className="text-3xl">Welcome to </span><br />
          <span className="text-7xl leading-normals font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent mb-8">
            <RiBookmarkLine className="inline-block mb-2 mr-2" />
            StudyFlow
          </span>
        </h2>
        <p className="text-xl text-gray-600 mb-12 leading-relaxed">
          An AI-powered app to help you manage and optimize your study plans effortlessly.
        </p>
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
          <Link to="/schedule">
            <button className="w-full sm:w-auto px-10 py-4 bg-white text-indigo-600 border-2 border-indigo-600 text-lg font-semibold rounded-lg hover:bg-indigo-50 transform hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center">
              <BsCalendarCheck className="mr-2 text-xl" />
              Get Started
            </button>
          </Link>
          <Link to="/tracker">
            <button className="w-full sm:w-auto px-10 py-4 bg-white text-indigo-600 border-2 border-indigo-600 text-lg font-semibold rounded-lg hover:bg-indigo-50 transform hover:-translate-y-0.5 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center">
              <BsGraphUp className="mr-2 text-xl" />
              View Progress
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
