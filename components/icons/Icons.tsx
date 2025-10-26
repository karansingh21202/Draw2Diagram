import React from 'react';
import {
    LuUser,
    LuBot,
    LuEraser,
    LuUndo2,
    LuRedo2,
    LuMousePointer,
    LuHand,
    LuSend,
    LuSquare,
    LuCircle,
    LuChevronDown,
    LuDownload,
    LuGrid,
    LuMaximize,
    LuType,
    LuPen,
    LuPalette,
    LuSignal,
    LuShapes,
    LuSun,
    LuMoon,
} from 'react-icons/lu';

// Helper to apply default classNames
const iconProps = (className: string | undefined) => ({
    className: className || "w-5 h-5",
});

// User / AI Icons
export const UserIcon = ({ className }: { className?: string }) => <LuUser {...iconProps(className)} />;
export const AiIcon = ({ className }: { className?: string }) => <LuBot {...iconProps(className)} />;
export const SendIcon = ({ className }: { className?: string }) => <LuSend {...iconProps(className)} />;

// Loading animation
export const LoadingDots = () => (
    <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
    </div>
);

// Toolbar Icons
export const PenIcon = ({ className }: { className?: string }) => <LuPen {...iconProps(className)} />;
export const LineIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-5 h-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="20" x2="20" y2="4" />
    </svg>
);
export const RectangleIcon = ({ className }: { className?: string }) => <LuSquare {...iconProps(className)} />;
export const CircleIcon = ({ className }: { className?: string }) => <LuCircle {...iconProps(className)} />;
export const TextIcon = ({ className }: { className?: string }) => <LuType {...iconProps(className)} />;
export const HandIcon = ({ className }: { className?: string }) => <LuHand {...iconProps(className)} />;
export const EraserIcon = ({ className }: { className?: string }) => <LuEraser {...iconProps(className)} />;
export const CursorIcon = ({ className }: { className?: string }) => <LuMousePointer {...iconProps(className)} />;
export const UndoIcon = ({ className }: { className?: string }) => <LuUndo2 {...iconProps(className)} />;
export const RedoIcon = ({ className }: { className?: string }) => <LuRedo2 {...iconProps(className)} />;
export const FrameIcon = ({ className }: { className?: string }) => <LuMaximize {...iconProps(className)} />;

// Style & Other UI Icons
export const ChevronDownIcon = ({ className }: { className?: string }) => <LuChevronDown {...iconProps(className)} />;
export const ExportIcon = ({ className }: { className?: string }) => <LuDownload {...iconProps(className)} />;
export const ColorSwatchIcon = ({ className }: { className?: string }) => <LuPalette {...iconProps(className)} />;
export const StrokeWidthIcon = ({ className }: { className?: string }) => <LuSignal className={`-rotate-90 ${className || 'w-5 h-5'}`} />;
export const SignalIcon = ({ className }: { className?: string }) => <LuSignal {...iconProps(className)} />;
export const SunIcon = ({ className }: { className?: string }) => <LuSun {...iconProps(className)} />;
export const MoonIcon = ({ className }: { className?: string }) => <LuMoon {...iconProps(className)} />;

// Background Icons
export const GridIcon = ({ className }: { className?: string }) => <LuGrid {...iconProps(className)} />;
export const ShapesIcon = ({ className }: { className?: string }) => <LuShapes {...iconProps(className)} />;

// Custom SVG icon for transparency, retained for its specific design.
export const TransparencyIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-5 h-5"} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 3a7 7 0 100 14 7 7 0 000-14zM2 10a8 8 0 1116 0 8 8 0 01-16 0z" />
    </svg>
);