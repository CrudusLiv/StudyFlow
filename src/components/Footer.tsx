import React from 'react';
import '../styles/components/Footer.css';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className }) => {
  return (
    <footer className={`footer ${className || ''}`}>
      <div className="footer-container">
        &copy; {new Date().getFullYear()} StudyFlow. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
