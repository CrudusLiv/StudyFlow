import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Access from './pages/Access';
import Schedule from './pages/Schedule';
import Planner from './pages/Planner';
import Tracker from './pages/Tracker';
import Notifications from './pages/Notifications';
import AiIntegration from './pages/AiIntegration';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
        <Header isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <div className={`flex-grow transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-16'}`}>
          <div className="w-full h-full px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/access" element={<Access />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/planner" element={<Planner />} />
              <Route path="/tracker" element={<Tracker />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/ai" element={<AiIntegration />} />
            </Routes>
          </div>
        </div>
        <Footer className="w-full" />
      </div>
    </Router>
  );
};

export default App;