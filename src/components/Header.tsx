import '../styles/components/Header.css';
import React from 'react';
import {useState} from 'react';
import { RiBookmarkLine } from 'react-icons/ri';
import { AiOutlineMenu } from 'react-icons/ai';
import Navigation from './Navigation';

function Header() {
  const [isOpen, setIsOpen] = useState(false);
  // Add these states or get them from your auth context/provider
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('user');

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="header">
      <button className="menu-button" onClick={toggleSidebar}>
        <AiOutlineMenu size={24} />
      </button>
      <h1>Study Flow</h1>
      <Navigation 
        isOpen={isOpen}
        onClose={toggleSidebar}
        isLoggedIn={isLoggedIn}
        userRole={userRole}
      />
    </div>
  );
}

export default Header;
