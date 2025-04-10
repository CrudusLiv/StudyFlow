import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: string;
  loading: boolean;
  login: (token: string, userKey: string, role?: string) => void;
  logout: () => void;
  checkAuth: () => boolean;  // Change return type to match implementation
  refreshUserData: () => Promise<void>; // Add new method to refresh user data
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: '',
  loading: true,
  login: () => {},
  logout: () => {},
  checkAuth: () => false,
  refreshUserData: async () => {} // Add default implementation
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);

  // Function to refresh user data from API
  const refreshUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('http://localhost:5000/api/user', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.role) {
        console.log('Retrieved role from API:', response.data.role);
        setUserRole(response.data.role);
        localStorage.setItem('userRole', response.data.role);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuthState = () => {
      const token = localStorage.getItem('token');
      const savedRole = localStorage.getItem('userRole');
      
      if (token) {
        // Check token expiry time
        const tokenExpiry = localStorage.getItem('tokenExpiry');
        const currentTime = new Date().getTime();
        
        if (!tokenExpiry || parseInt(tokenExpiry) > currentTime) {
          setIsAuthenticated(true);
          setUserRole(savedRole || 'user');
          
          // If no expiry has been set, set it to 1 hour from now
          if (!tokenExpiry) {
            const expiryTime = new Date().getTime() + (60 * 60 * 1000); // 1 hour
            localStorage.setItem('tokenExpiry', expiryTime.toString());
          }
        } else {
          // Token is expired, clean up
          localStorage.removeItem('token');
          localStorage.removeItem('userKey');
          localStorage.removeItem('userRole');
          localStorage.removeItem('tokenExpiry');
        }
      }
      
      setLoading(false);
    };

    // Add call to verify auth immediately after initialization
    const checkAndRefreshAuth = async () => {
      initializeAuthState();
      
      // If we have a token, attempt to refresh user data from server
      if (localStorage.getItem('token')) {
        await refreshUserData();
      }
      
      setLoading(false);
    };
    
    checkAndRefreshAuth();
    
    // Handle URL tokens (Google auth)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userKey = params.get('userKey');
    const userRole = params.get('userRole');

    if (token && userKey) {
      // Set expiry time - 1 hour from now
      const expiryTime = new Date().getTime() + (60 * 60 * 1000);
      
      localStorage.setItem('token', token);
      localStorage.setItem('userKey', userKey);
      localStorage.setItem('userRole', userRole || 'user');
      localStorage.setItem('tokenExpiry', expiryTime.toString());
      
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
            // Set expiry time - 1 hour from now
            const expiryTime = new Date().getTime() + (60 * 60 * 1000);
            
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('userKey', response.data.userKey);
            localStorage.setItem('userRole', response.data.role || 'user');
            localStorage.setItem('tokenExpiry', expiryTime.toString());
            
            setIsAuthenticated(true);
            setUserRole(response.data.role || 'user');
          }
        } catch (error) {
          console.error('Error processing Firebase auth:', error);
        }
      }
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

      // Check token expiry
      const tokenExpiry = localStorage.getItem('tokenExpiry');
      if (tokenExpiry && parseInt(tokenExpiry) < new Date().getTime()) {
        // Token expired
        localStorage.removeItem('token');
        localStorage.removeItem('userKey');
        localStorage.removeItem('userRole');
        localStorage.removeItem('tokenExpiry');
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
        
        // Extend token expiry on successful verification
        const expiryTime = new Date().getTime() + (60 * 60 * 1000); // 1 hour
        localStorage.setItem('tokenExpiry', expiryTime.toString());
        
        return true;
      } else {
        throw new Error('Failed to verify token');
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('userKey');
      localStorage.removeItem('userRole');
      localStorage.removeItem('tokenExpiry');
      setIsAuthenticated(false);
      setUserRole('');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const login = (token: string, userKey: string, role = 'user') => {
    console.log('Logging in with role:', role);
    
    // Set expiry time - 1 hour from now
    const expiryTime = new Date().getTime() + (60 * 60 * 1000);
    localStorage.setItem('tokenExpiry', expiryTime.toString());
    
    localStorage.setItem('token', token);
    localStorage.setItem('userKey', userKey);
    localStorage.setItem('userRole', role);
    setIsAuthenticated(true);
    setUserRole(role);
    
    // After login, fetch fresh user data to ensure role is up to date
    setTimeout(() => refreshUserData(), 500);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userKey');
    localStorage.removeItem('userRole');
    localStorage.removeItem('tokenExpiry');
    setIsAuthenticated(false);
    setUserRole('');
    window.location.href = '/access';
  };

  const checkAuth = useCallback(() => {
    const storedToken = localStorage.getItem('token');
    const storedUserKey = localStorage.getItem('userKey');
    const storedRole = localStorage.getItem('userRole');
    
    console.log('Stored role from localStorage:', storedRole);
    
    if (storedToken && storedUserKey) {
      setIsAuthenticated(true);
      setUserRole(storedRole || 'user');
      return true;
    }
    
    return false;
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      userRole,
      loading,
      login,
      logout,
      checkAuth,
      refreshUserData // Add the new method to the context
    }}>
      {children}
    </AuthContext.Provider>
  );
};
