import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSessionManager } from '../hooks/useSessionManager';
import { useIsMobile } from '../hooks/useMediaQuery';
import { ProtectedRoute } from './ProtectedRoute';
import Header from './Header';
import Footer from './Footer';
import Navigation from './Navigation';
import MobileNavigation from './MobileNavigation';
import SessionExpirationModal from './SessionExpirationModal';
import Home from '../pages/Home';
import Access from '../pages/Access';
import Schedule from '../pages/Schedule';
import Tracker from '../pages/Tracker';
import Notifications from '../pages/Notifications';
import Admin from '../pages/Admin';
import Profile from '../pages/Profile';
import Reminders from '../pages/Reminders';

const AppContent: React.FC = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const { isAuthenticated, checkAuth } = useAuth();
  const isMobile = useIsMobile(); // Using our custom hook
  
  // Initialize session manager
  useSessionManager();
  
  // Heartbeat to periodically check and refresh auth state
  useEffect(() => {
    if (isAuthenticated) {
      // Check and extend auth every 15 minutes if user is authenticated
      const heartbeatInterval = setInterval(() => {
        // Get token expiry time
        const tokenExpiry = localStorage.getItem('tokenExpiry');
        if (tokenExpiry) {
          const expiryTime = parseInt(tokenExpiry);
          const currentTime = new Date().getTime();
          
          // If we're within 15 minutes of expiry, extend the session
          if (expiryTime - currentTime < 15 * 60 * 1000) {
            checkAuth();
          }
        }
      }, 15 * 60 * 1000); // Check every 15 minutes
      
      return () => clearInterval(heartbeatInterval);
    }
  }, [isAuthenticated, checkAuth]);

  return (
    <>
      {isAuthenticated && <SessionExpirationModal />}
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Header onNavToggle={() => setIsNavOpen(!isNavOpen)} />
        
        {/* Show regular navigation for desktop */}
        {!isMobile && (
          <Navigation
            isOpen={isNavOpen}
            onClose={() => setIsNavOpen(false)}
          />
        )}
        
        <main className={`flex-grow transition-all duration-300 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 ${isMobile ? 'pb-16' : ''}`}>
          <div className="max-w-7xl mx-auto w-full">
            <Routes>
              <Route path="/" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/home" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/access" element={<Access />} />
              <Route path="/schedule" element={
                <ProtectedRoute>
                  <Schedule />
                </ProtectedRoute>
              } />
              <Route path="/tracker" element={
                <ProtectedRoute>
                  <Tracker />
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/reminders" element={
                <ProtectedRoute>
                  <Reminders />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </main>
        
        {/* Footer only visible on desktop */}
        {!isMobile && <Footer />}
        
        {/* Mobile Navigation */}
        {isMobile && isAuthenticated && <MobileNavigation />}
      </div>
    </>
  );
};

export default AppContent;
