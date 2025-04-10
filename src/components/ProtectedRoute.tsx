import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLoader } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string; // New prop for role-based access control
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, loading, userRole } = useAuth();
  const location = useLocation();

  // Show a loading indicator while checking authentication
  if (loading) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          animate={{ 
            rotate: 360,
            transition: { 
              repeat: Infinity, 
              duration: 1, 
              ease: "linear" 
            }
          }}
        >
          <FiLoader size={40} color="#4f46e5" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Checking authentication...
        </motion.p>
      </motion.div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/access" state={{ from: location }} replace />;
  }

  // Check if a specific role is required and if user has that role
  if (requiredRole && userRole !== requiredRole) {
    console.log(`Access denied: Required role '${requiredRole}', user has role '${userRole}'`);
    // Redirect to home page if user doesn't have required role
    return <Navigate to="/" state={{ accessDenied: true }} replace />;
  }

  // Pass children if authenticated and has correct role if required
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};
