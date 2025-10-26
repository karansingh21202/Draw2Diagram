import React from 'react';
import { ShapesIcon } from './icons/Icons';

interface AssetsToolbarProps {
    isOpen: boolean;
    onToggle: () => void;
}

const AssetsToolbar: React.FC<AssetsToolbarProps> = ({ isOpen, onToggle }) => {
    return (
        <div className="flex-shrink-0 h-full flex items-center justify-center bg-white dark:bg-gray-900 p-2 border-r border-gray-200 dark:border-gray-700">
            <button
                onClick={onToggle}
                className={`p-3 rounded-lg transition-colors duration-200 ${isOpen ? 'bg-indigo-600 text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                aria-label={isOpen ? "Close assets panel" : "Open assets panel"}
                title="Assets"
            >
                <ShapesIcon className="w-6 h-6" />
            </button>
        </div>
    );
};

export default AssetsToolbar;