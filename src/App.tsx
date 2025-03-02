import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from './contexts/ThemeContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Access from './pages/Access';
import Schedule from './pages/Schedule';
import Planner from './pages/Planner';
import Tracker from './pages/Tracker';
import Notifications from './pages/Notifications';
import UniversitySchedule from './pages/UniversitySchedule';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Reminders from './pages/Reminders';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  // Add useEffect to handle resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // 'lg' breakpoint
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <ThemeProvider>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <Router>
          <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <Header isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            <main className={`
              flex-grow transition-all duration-300
              px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8
              ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}
            `}>
              <div className="max-w-7xl mx-auto w-full">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/access" element={<Access />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/planner" element={<Planner />} />
                  <Route path="/tracker" element={<Tracker />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/university-schedule" element={<UniversitySchedule />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/reminders" element={<Reminders />} />
                </Routes>
              </div>
            </main>
            <Footer className="w-full" />
          </div>
        </Router>
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
};

export default App;