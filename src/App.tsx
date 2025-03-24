import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Access from './pages/Access';
import Schedule from './pages/Schedule';
import Tracker from './pages/Tracker';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Reminders from './pages/Reminders';
import Navigation from './components/Navigation';

function App() {
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <Header onNavToggle={() => setIsNavOpen(!isNavOpen)} />
            <Navigation
              isOpen={isNavOpen}
              onClose={() => setIsNavOpen(false)}
            />
            <main className="flex-grow transition-all duration-300 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
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
                    <ProtectedRoute requiredRole="admin">
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
            <Footer className="w-full" />
          </div>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
