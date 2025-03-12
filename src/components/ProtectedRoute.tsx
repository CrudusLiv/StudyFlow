import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'user' | 'admin';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, userRole, loading, checkAuth } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  
  useEffect(() => {
    const verify = async () => {
      // First check context state
      if (isAuthenticated) {
        setIsValid(true);
        setIsVerifying(false);
        return;
      }
      
      // If not authenticated in context, verify with API
      try {
        const valid = await checkAuth();
        setIsValid(valid);
      } catch (error) {
        console.error("Auth verification error:", error);
        setIsValid(false);
      } finally {
        setIsVerifying(false);
      }
    };
    
    verify();
  }, [isAuthenticated, checkAuth]);
  
  if (loading || isVerifying) {
    return <div className="auth-loading">Verifying access...</div>;
  }
  
  if (!isValid) {
    return <Navigate to="/access" replace />;
  }
  
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}
