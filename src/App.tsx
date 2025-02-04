import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Schedule from './pages/Schedule';
import Tracker from './pages/Tracker';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen w-screen flex flex-col bg-gray-50 text-gray-800">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/tracker" element={<Tracker />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
