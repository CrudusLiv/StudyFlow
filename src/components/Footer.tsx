import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white shadow-md py-4 mt-auto">
      <div className="container mx-auto text-center text-gray-600">
        &copy; {new Date().getFullYear()} StudyFlow. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
