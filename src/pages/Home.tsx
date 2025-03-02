import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl mx-auto">
        <div className="bg-white/90 dark:bg-gray-800/90 p-4 xs:p-6 sm:p-8 rounded-2xl shadow-xl">
          <h1 className="text-3xl xs:text-4xl sm:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Welcome to StudyFlow
          </h1>
          <p className="text-lg md:text-xl mb-8 text-gray-700 dark:text-gray-300">
            Your all-in-one solution for managing your academic journey.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="p-4 sm:p-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
              <h2 className="text-xl font-semibold mb-3 text-indigo-700 dark:text-indigo-300">
                Schedule Management
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Organize your classes and study sessions with our intuitive scheduling tools.
              </p>
            </div>
            
            <div className="p-4 sm:p-6 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
              <h2 className="text-xl font-semibold mb-3 text-purple-700 dark:text-purple-300">
                Progress Tracking
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor your academic progress and stay on top of your goals.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Ready to enhance your academic experience?
            </p>
            <Link
              to="/university-schedule"
              className="inline-block px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
