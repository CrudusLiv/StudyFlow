import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="text-center py-16">
      <h2 className="text-5xl font-bold text-indigo-700 mb-8">
        Welcome to StudyFlow
      </h2>
      <p className="text-xl text-gray-600 mb-12">
        An AI-powered app to help you manage and optimize your study plans effortlessly.
      </p>
      <div className="flex justify-center space-x-6">
        <Link to="/schedule">
          <button className="px-8 py-4 bg-indigo-700 text-indigo-700 text-lg font-semibold rounded-md hover:scale-120">
            Get Started
          </button>
        </Link>
        <Link to="/tracker">
          <button className="px-8 py-4 bg-gray-200 text-indigo-700 text-lg font-semibold rounded-md hover:scale-120">
            View Progress
          </button>
        </Link>
      </div>
    </div>
  );
};

export default Home;
