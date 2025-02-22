import React from 'react';
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
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
        <Header />
        <div className="container mx-auto px-4 py-8">
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
        <Footer />
      </div>
    </Router>
  );
};

export default App;