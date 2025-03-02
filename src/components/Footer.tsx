import React from 'react';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className }) => {
  return (
    <footer className={`bg-white dark:bg-gray-800 shadow-md py-4 mt-auto ${className || ''}`}>
      <div className="container mx-auto text-center text-gray-600 dark:text-gray-400">
        &copy; {new Date().getFullYear()} StudyFlow. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
