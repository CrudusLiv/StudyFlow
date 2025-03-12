import '../styles/components/Header.css';
import React from 'react';
import { AiOutlineMenu } from 'react-icons/ai';
import { useAuth } from '../contexts/AuthContext';
import Navigation from './Navigation';

interface HeaderProps {
  onNavToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNavToggle }) => {
  const { isAuthenticated, userRole, logout } = useAuth();

  return (
    <header>
      <nav>
        <div className="header">
          <button className="menu-button" onClick={onNavToggle}>
            <AiOutlineMenu size={24} />
          </button>
          <h1>StudyFlow</h1>
          <div className="user-controls">
            {isAuthenticated ? (
              <button onClick={logout} className="logout-button">Logout</button>
            ) : (
              <span className="login-status">Not logged in</span>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
