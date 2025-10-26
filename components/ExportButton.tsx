import React, { useState, useRef, useEffect } from 'react';
import { ExportIcon, ChevronDownIcon } from './icons/Icons';

interface ExportButtonProps {
    onExport: (format: 'png' | 'svg') => void;
    disabled: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ onExport, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleExport = (format: 'png' | 'svg') => {
        onExport(format);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 rounded-lg text-gray-800 dark:text-white font-semibold transition-colors duration-200 disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                <ExportIcon />
                <span className="hidden sm:inline">Export</span>
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-50 overflow-hidden ring-1 ring-black ring-opacity-5 dark:ring-0">
                    <ul className="py-1">
                        <li>
                            <button
                                onClick={() => handleExport('png')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                                Export as PNG
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => handleExport('svg')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                                Export as SVG
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ExportButton;