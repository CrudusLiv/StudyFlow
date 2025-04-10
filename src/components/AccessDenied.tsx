import React from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiAlertTriangle } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const AccessDenied: React.FC = () => {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative mb-8">
        <FiShield className="text-gray-300 text-9xl" />
        <div className="absolute inset-0 flex items-center justify-center">
          <FiAlertTriangle className="text-red-500 text-5xl" />
        </div>
      </div>
      
      <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">
        Access Denied
      </h1>
      
      <p className="text-lg mb-8 max-w-lg text-gray-600 dark:text-gray-300">
        You don't have permission to access this page. This area is restricted to administrators only.
      </p>
      
      <Link 
        to="/"
        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Back to Home
      </Link>
    </motion.div>
  );
};

export default AccessDenied;
