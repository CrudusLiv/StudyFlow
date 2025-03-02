import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-gray-600 dark:text-gray-400"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <FiSun className="text-xl" />
      ) : (
        <FiMoon className="text-xl" />
      )}
    </button>
  );
};

export default ThemeToggle;
