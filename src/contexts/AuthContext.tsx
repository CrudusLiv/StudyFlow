import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: string;
  loading: boolean;
  login: (token: string, userKey: string, role?: string) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: '',
  loading: true,
  login: () => {},
  logout: () => {},
  checkAuth: async () => false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);

  // Check for tokens in URL on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userKey = params.get('userKey');
    const userRole = params.get('userRole');
    
    if (token && userKey) {
      console.log("Found token in URL, logging in");
      localStorage.setItem('token', token);
      localStorage.setItem('userKey', userKey);
      localStorage.setItem('userRole', userRole || 'user');
      setIsAuthenticated(true);
      setUserRole(userRole || 'user');
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    verifyAuth();
  }, []);

  const verifyAuth = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAuthenticated(false);
        setUserRole('');
        setLoading(false);
        return false;
      }

      const response = await axios.get('http://localhost:5000/api/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.status === 200) {
        // Get the role from the API response instead of localStorage
        const role = response.data.role || localStorage.getItem('userRole') || 'user';
        setIsAuthenticated(true);
        setUserRole(role);
        // Update localStorage with the latest role from server
        localStorage.setItem('userRole', role);
        return true;
      } else {
        throw new Error('Failed to verify token');
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('userKey');
      localStorage.removeItem('userRole');
      setIsAuthenticated(false);
      setUserRole('');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const login = (token: string, userKey: string, role = 'user') => {
    console.log("Login called with token and role:", role);
    localStorage.setItem('token', token);
    localStorage.setItem('userKey', userKey);
    localStorage.setItem('userRole', role);
    
    setIsAuthenticated(true);
    setUserRole(role);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userKey');
    localStorage.removeItem('userRole');
    setIsAuthenticated(false);
    setUserRole('');
    window.location.href = '/access';
  };

  const checkAuth = async () => {
    return await verifyAuth();
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userRole, 
      loading, 
      login, 
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};
