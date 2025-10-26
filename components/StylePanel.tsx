import React from 'react';
import type { ElementStyle, Tool, Theme } from '../types';
import { ColorSwatchIcon, StrokeWidthIcon } from './icons/Icons';

interface StylePanelProps {
  currentStyle: Partial<ElementStyle>;
  onStyleChange: (style: Partial<ElementStyle>) => void;
  isSelectionActive: boolean;
  tool: Tool;
  theme: Theme;
}

const StylePanel: React.FC<StylePanelProps> = ({ currentStyle, onStyleChange, isSelectionActive, tool, theme }) => {
    
  const handleStyleChange = (key: keyof ElementStyle, value: string | number) => {
    onStyleChange({ [key]: value });
  };

  const showFontSize = currentStyle.fontSize !== undefined || tool === 'text';
  
  return (
    <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg p-2 flex items-center gap-4 text-gray-700 dark:text-gray-300 border transition-colors ${isSelectionActive ? 'border-indigo-500' : 'border-transparent'}`}>
      
      {/* Stroke Color */}
      <div className="flex items-center gap-2">
        <label htmlFor="strokeColor" className="cursor-pointer" title="Stroke Color">
          <ColorSwatchIcon />
        </label>
        <div className="relative w-8 h-8 flex items-center justify-center">
            <input
                type="color"
                id="strokeColor"
                value={currentStyle.strokeColor || '#FFFFFF'}
                onChange={(e) => handleStyleChange('strokeColor', e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-6 h-6 rounded-md border-2 border-gray-300 dark:border-gray-600" style={{ backgroundColor: currentStyle.strokeColor }} />
        </div>
      </div>
      
      {/* Fill Color */}
      <div className="flex items-center gap-2">
        <label htmlFor="fillColor" className="cursor-pointer" title="Fill Color">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 bg-cover bg-center" style={{ 
                backgroundColor: currentStyle.fillColor === 'transparent' || currentStyle.fillColor === 'none' ? (theme === 'dark' ? '#111827' : '#FFFFFF') : currentStyle.fillColor,
                backgroundImage: (currentStyle.fillColor === 'transparent' || currentStyle.fillColor === 'none') ? `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%23${theme === 'dark' ? '333' : 'ccc'}' stroke-width='4' stroke-dasharray='6%2c 14' stroke-linecap='square'/%3e%3c/svg%3e")` : 'none'
             }}/>
        </label>
        <div className="relative w-8 h-8 flex items-center justify-center">
            <input
                type="color"
                id="fillColor"
                value={currentStyle.fillColor === 'transparent' || currentStyle.fillColor === 'none' ? (theme === 'dark' ? '#111827' : '#FFFFFF') : currentStyle.fillColor}
                onChange={(e) => handleStyleChange('fillColor', e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
             <button 
                onClick={() => handleStyleChange('fillColor', 'transparent')} 
                className="w-6 h-6 rounded-md border-2 border-gray-300 dark:border-gray-600 relative overflow-hidden bg-white dark:bg-gray-700"
                title="Set fill to transparent"
             >
                <div className="absolute w-8 h-px bg-red-500 transform rotate-45 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
             </button>
        </div>
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-500 mx-1"></div>

      {/* Stroke Width */}
      <div className="flex items-center gap-2">
         <label htmlFor="strokeWidth" className="cursor-pointer" title="Stroke Width">
          <StrokeWidthIcon />
        </label>
        <input
          type="range"
          id="strokeWidth"
          min="1"
          max="50"
          value={currentStyle.strokeWidth || 3}
          onChange={(e) => handleStyleChange('strokeWidth', parseInt(e.target.value, 10))}
          className="w-24 cursor-pointer accent-indigo-600"
        />
        <span className="text-xs w-6 text-center">{currentStyle.strokeWidth || 3}</span>
      </div>

      {showFontSize && (
        <>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-500 mx-1"></div>
            <div className="flex items-center gap-2">
                <span className="text-lg font-serif">A</span>
                <input
                    type="range"
                    id="fontSize"
                    min="8"
                    max="128"
                    value={currentStyle.fontSize || 24}
                    onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value, 10))}
                    className="w-24 cursor-pointer accent-indigo-600"
                />
                <span className="text-xs w-8 text-center">{currentStyle.fontSize || 24}px</span>
            </div>
        </>
      )}
    </div>
  );
};

export default StylePanel;