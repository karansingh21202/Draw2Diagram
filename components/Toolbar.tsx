import React from 'react';
import type { Tool } from '../types';
import { PenIcon, LineIcon, RectangleIcon, CircleIcon, HandIcon, EraserIcon, UndoIcon, RedoIcon, FrameIcon, CursorIcon, TextIcon } from './icons/Icons';

interface ToolbarProps {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onResetView: () => void;
}

const toolData: { name: Tool; icon: React.ReactNode; tooltip: string }[] = [
  { name: 'select', icon: <CursorIcon />, tooltip: 'Select' },
  { name: 'pen', icon: <PenIcon />, tooltip: 'Pen / Draw' },
  { name: 'line', icon: <LineIcon />, tooltip: 'Line' },
  { name: 'rectangle', icon: <RectangleIcon />, tooltip: 'Rectangle' },
  { name: 'circle', icon: <CircleIcon />, tooltip: 'Circle' },
  { name: 'text', icon: <TextIcon />, tooltip: 'Text' },
];

const navigationToolData: { name: Tool; icon: React.ReactNode; tooltip: string }[] = [
    { name: 'pan', icon: <HandIcon />, tooltip: 'Pan / Move' },
    { name: 'eraser', icon: <EraserIcon />, tooltip: 'Eraser' },
];

const Toolbar: React.FC<ToolbarProps> = ({ currentTool, onToolChange, onUndo, onRedo, canUndo, canRedo, onResetView }) => {
  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-lg shadow-lg p-2 flex items-center gap-1">
      <button 
        onClick={onUndo} 
        disabled={!canUndo}
        className="p-2 rounded-md transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white disabled:text-gray-400 dark:disabled:text-gray-500 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        aria-label="Undo"
        data-tooltip="Undo"
      >
        <UndoIcon />
      </button>
      <button 
        onClick={onRedo}
        disabled={!canRedo}
        className="p-2 rounded-md transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white disabled:text-gray-400 dark:disabled:text-gray-500 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        aria-label="Redo"
        data-tooltip="Redo"
      >
        <RedoIcon />
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-500 mx-1"></div>

      {toolData.map(({ name, icon, tooltip }) => (
        <button
          key={name}
          onClick={() => onToolChange(name)}
          className={`p-2 rounded-md transition-colors ${
            currentTool === name
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white'
          }`}
          aria-label={`Select ${name} tool`}
          data-tooltip={tooltip}
        >
          {icon}
        </button>
      ))}
      
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-500 mx-1"></div>
      
      {navigationToolData.map(({ name, icon, tooltip }) => (
          <button
            key={name}
            onClick={() => onToolChange(name)}
            className={`p-2 rounded-md transition-colors ${
              currentTool === name
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white'
            }`}
            aria-label={`Select ${name} tool`}
            data-tooltip={tooltip}
          >
            {icon}
          </button>
      ))}

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-500 mx-1"></div>
       <button 
        onClick={onResetView}
        className="p-2 rounded-md transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white"
        aria-label="Reset View"
        data-tooltip="Reset View"
      >
        <FrameIcon />
      </button>

    </div>
  );
};

export default Toolbar;