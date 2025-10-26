import React from 'react';
import { GridIcon, TransparencyIcon } from './icons/Icons';

interface BackgroundToggleProps {
  isTransparent: boolean;
  onToggle: (isTransparent: boolean) => void;
}

const BackgroundToggle: React.FC<BackgroundToggleProps> = ({ isTransparent, onToggle }) => {
  return (
    <button
      onClick={() => onToggle(!isTransparent)}
      className={`p-2 rounded-lg transition-colors duration-200 ${
        isTransparent
          ? 'bg-indigo-600 text-white' 
          : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-gray-300'
      }`}
      title={isTransparent ? 'Use Solid Background' : 'Use Transparent Background'}
      aria-label={isTransparent ? 'Switch to solid background' : 'Switch to transparent background'}
    >
      <TransparencyIcon className="w-5 h-5" />
    </button>
  );
};

export default BackgroundToggle;