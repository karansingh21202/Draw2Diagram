import React from 'react';
// FIX: Corrected import path for types
import type { MapDetailLevel } from '../types';
import { SignalIcon } from './icons/Icons';

interface MapDetailSelectorProps {
  currentLevel: MapDetailLevel;
  onLevelChange: (level: MapDetailLevel) => void;
}

const levels: { id: MapDetailLevel; name: string }[] = [
  { id: 'low', name: 'Low' },
  { id: 'medium', name: 'Medium' },
  { id: 'high', name: 'High' },
];

const MapDetailSelector: React.FC<MapDetailSelectorProps> = ({ currentLevel, onLevelChange }) => {
  return (
    <div className="flex items-center gap-2 p-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
       <SignalIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 ml-2" />
      {levels.map((level) => (
        <button
          key={level.id}
          onClick={() => onLevelChange(level.id)}
          className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
            currentLevel === level.id
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {level.name}
        </button>
      ))}
    </div>
  );
};

export default MapDetailSelector;