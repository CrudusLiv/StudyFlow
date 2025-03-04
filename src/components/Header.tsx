import '../styles/components/Header.css';
import React from 'react';
import { RiBookmarkLine } from 'react-icons/ri';
import { AiOutlineMenu } from 'react-icons/ai';
import Navigation from './Navigation';
const Header = ({ isOpen, toggleSidebar }) => {
  return (
    <div className="header">
      <div className={`mobile-overlay ${!isOpen && 'hidden'}`} onClick={toggleSidebar} />
      
    

        
      </div>

  );
};

export default Header;