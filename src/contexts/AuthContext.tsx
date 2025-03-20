import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

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

  useEffect(() => {
    // Handle URL tokens (Google auth)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userKey = params.get('userKey');
    const userRole = params.get('userRole');

    if (token && userKey) {
      localStorage.setItem('token', token);
      localStorage.setItem('userKey', userKey);
      localStorage.setItem('userRole', userRole || 'user');
      setIsAuthenticated(true);
      setUserRole(userRole || 'user');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Handle Firebase auth state (Microsoft auth)
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken();
          const response = await axios.post('http://localhost:5000/auth/microsoft', {
            token: idToken,
            email: user.email,
            name: user.displayName
          });

          if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('userKey', response.data.userKey);
            localStorage.setItem('userRole', response.data.role || 'user');
            setIsAuthenticated(true);
            setUserRole(response.data.role || 'user');
          }
        } catch (error) {
          console.error('Error processing Firebase auth:', error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
        const role = response.data.role || localStorage.getItem('userRole') || 'user';
        setIsAuthenticated(true);
        setUserRole(role);
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
