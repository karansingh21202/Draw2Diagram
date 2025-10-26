import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import Canvas from './components/Canvas';
import ChatPanel from './components/ChatPanel';
import Toolbar from './components/Toolbar';
import StylePanel from './components/StylePanel';
import DomainSelector from './components/DomainSelector';
import MapDetailSelector from './components/MapDetailSelector';
import ExportButton from './components/ExportButton';
import BackgroundToggle from './components/BackgroundToggle';
import AssetsToolbar from './components/AssetsToolbar';
import AssetsPanel from './components/AssetsPanel';
import ThemeToggle from './components/ThemeToggle';

import { useHistoryState } from './hooks/useHistoryState';
import { generateOrEditDiagram } from './services/geminiService';
import { recordMapUsage } from './services/mapService';
import { convertElementsToSvg, exportToPng, exportToSvg } from './utils/export';
import { transformPathData, getElementsBounds } from './utils/geometry';
import { drawElement } from './utils/render';
import { smartRefineImage, recolorImage } from './utils/image';
import { Asset } from './assets/symbols';

import type { Element, Tool, ElementStyle, ChatMessage, Domain, MapDetailLevel, Point, Theme, GenerationMode, RasterElement, PathElement, TextElement, ImageGenerationStyle } from './types';

/**
 * Centralized configuration for theme-dependent colors.
 * This ensures consistency and makes theme adjustments easier.
 */
const themeColors = {
  light: {
    stroke: '#111827', // dark gray for text/strokes
    background: '#FFFFFF',
    mapStroke: '#888888',
    mapFill: '#E5E7EB',
  },
  dark: {
    stroke: '#FFFFFF', // white for text/strokes
    background: '#111827', // dark gray for background
    mapStroke: '#A0A0A0',
    mapFill: '#4B5563',
  }
};

const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

type CanvasState = {
    elements: Element[];
    backgroundImage: string | null;
};

const renderElementsToDataURL = (elementsToRender: Element[], bounds: Bounds): string | null => {
    const tempCanvas = document.createElement('canvas');
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    
    if (width <= 0 || height <= 0) return null;

    const padding = 20; // Add padding to give the AI context
    tempCanvas.width = width + padding * 2;
    tempCanvas.height = height + padding * 2;
    
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;

    // The canvas is transparent by default, which is ideal for targeted edits.
    ctx.translate(-bounds.minX + padding, -bounds.minY + padding);
    elementsToRender.forEach(el => drawElement(ctx, el));
    
    return tempCanvas.toDataURL('image/png').split(',')[1];
};


const App: React.FC = () => {
    const [canvasState, setCanvasState, undo, redo, canUndo, canRedo] = useHistoryState<CanvasState>({ elements: [], backgroundImage: null });
    const { elements, backgroundImage } = canvasState;
    
    const [tool, setTool] = useState<Tool>('select');
    const [theme, setTheme] = useState<Theme>(prefersDark ? 'dark' : 'light');
    const [style, setStyle] = useState<ElementStyle>({
        strokeColor: themeColors[theme].stroke,
        fillColor: 'transparent',
        strokeWidth: 3,
        fontSize: 24,
    });
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [domain, setDomain] = useState<Domain>('general');
    const [mapDetail, setMapDetail] = useState<MapDetailLevel>('medium');
    const [isBgTransparent, setIsBgTransparent] = useState(false);
    const [selectedElementIds, setSelectedElementIds] = useState<Set<number>>(new Set());
    const [panZoomState, setPanZoomState] = useState({ scale: 1, positionX: 0, positionY: 0 });
    const [editingElementId, setEditingElementId] = useState<number | null>(null);
    const [isAssetsPanelOpen, setIsAssetsPanelOpen] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const updateElements = (updater: (prevElements: Element[]) => Element[], overwrite: boolean = false) => {
        setCanvasState(prevCanvasState => ({
            ...prevCanvasState,
            elements: updater(prevCanvasState.elements)
        }), overwrite);
    };

    const handleToggleTheme = async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        
        const oldDefaultStroke = themeColors[theme].stroke;
        const newDefaultStroke = themeColors[newTheme].stroke;
        
        const oldMapStroke = themeColors[theme].mapStroke;
        const newMapStroke = themeColors[newTheme].mapStroke;
        
        const oldMapFill = themeColors[theme].mapFill;
        const newMapFill = themeColors[newTheme].mapFill;
        
        // Step 1: Synchronously update all vector elements
        const vectorsUpdatedElements = elements.map(el => {
            if (el.type === 'raster') return el; // Skip rasters for now

            const newElStyle = { ...el.style };
            let styleChanged = false;
            
            if (el.isMap) {
                if (el.style.strokeColor.toUpperCase() === oldMapStroke.toUpperCase()) {
                    newElStyle.strokeColor = newMapStroke;
                    styleChanged = true;
                }
                if (el.style.fillColor.toUpperCase() === oldMapFill.toUpperCase()) {
                    newElStyle.fillColor = newMapFill;
                    styleChanged = true;
                }
            } else {
                if (el.style.strokeColor.toUpperCase() === oldDefaultStroke.toUpperCase()) {
                    newElStyle.strokeColor = newDefaultStroke;
                    styleChanged = true;
                }
                if (el.style.fillColor.toUpperCase() === oldDefaultStroke.toUpperCase()) {
                    newElStyle.fillColor = newDefaultStroke;
                    styleChanged = true;
                }
            }
            
            return styleChanged ? { ...el, style: newElStyle } : el;
        });

        setCanvasState(prev => ({ ...prev, elements: vectorsUpdatedElements }), false);
        setStyle(s => ({ ...s, strokeColor: newDefaultStroke }));
        setTheme(newTheme);

        // Step 2: Asynchronously update raster images
        const rasterRecolorPromises = elements
            .filter((el): el is RasterElement => 
                el.type === 'raster' && 
                el.sourceStrokeColor !== 'multi-color' && // Do not recolor multi-color images
                el.sourceStrokeColor.toUpperCase() === oldDefaultStroke.toUpperCase()
            )
            .map(async el => {
                try {
                    const newImageUrl = await recolorImage(el.imageUrl, oldDefaultStroke, newDefaultStroke);
                    return { ...el, imageUrl: newImageUrl, sourceStrokeColor: newDefaultStroke };
                } catch (error) {
                    console.error(`Failed to re-color image for element ${el.id}:`, error);
                    return el; // Return original element on failure
                }
            });

        if (rasterRecolorPromises.length > 0) {
            const recoloredRasters = await Promise.all(rasterRecolorPromises);
            // Use an overwrite update to avoid creating a new history step for the async change
            updateElements(prevElements => {
                const newElements = [...prevElements];
                recoloredRasters.forEach(recoloredEl => {
                    const index = newElements.findIndex(el => el.id === recoloredEl.id);
                    if (index !== -1) {
                        newElements[index] = recoloredEl;
                    }
                });
                return newElements;
            }, true);
        }
    };

    const handleSendMessage = async (message: string, mode: GenerationMode, language?: string, imageStyle?: ImageGenerationStyle) => {
        setIsLoading(true);

        const userMessage: ChatMessage = { sender: 'user', text: message, type: 'text' };
        setMessages(prev => [...prev, userMessage]);

        let imageDataUrl: string | null = null;
        let elementsForAI: Element[] | null = elements.length > 0 ? elements : null;
        let selectionBounds: Bounds | null = null;
        const targetBgColor = themeColors[theme].background;

        if (mode === 'image' && selectedElementIds.size > 0) {
            // TARGETED IMAGE EDIT
            const selectedElements = elements.filter(el => selectedElementIds.has(el.id));
            selectionBounds = getElementsBounds(selectedElements);
            imageDataUrl = renderElementsToDataURL(selectedElements, selectionBounds);
            elementsForAI = selectedElements; // Provide only selected elements for context
        } else if (elements.length > 0 || backgroundImage) {
            // GLOBAL EDIT OR CHAT CONTEXT
            const canvas = canvasRef.current;
            if (canvas) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const ctx = tempCanvas.getContext('2d');
                if (ctx) {
                    // CRITICAL FIX: The snapshot for the AI MUST always have a transparent background
                    // to avoid the AI mimicking the canvas color and creating an "overlay" effect.
                    ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                    
                    // First draw the background image if it exists (as it's part of the content)
                    if (backgroundImage) {
                        const img = new Image();
                        img.src = backgroundImage;
                        try {
                           // This is synchronous if the image is already loaded, which it should be.
                           ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
                        } catch(e) {
                           console.error("Error drawing background image to temp canvas for AI");
                        }
                    }
                    
                    // Then draw the vector elements on top
                    elements.forEach(el => drawElement(ctx, el));
                    imageDataUrl = tempCanvas.toDataURL('image/png').split(',')[1];
                }
            }
        }
        
        try {
            const result = await generateOrEditDiagram({
                prompt: message,
                imageDataBase64: imageDataUrl,
                elements: elementsForAI,
                domain,
                mapDetail,
                canvasWidth: canvasRef.current?.width ?? 1280,
                canvasHeight: canvasRef.current?.height ?? 720,
                selectedIds: Array.from(selectedElementIds),
                generationMode: mode,
                codeLanguage: language,
                imageGenerationStyle: imageStyle,
                theme: theme,
                backgroundColor: targetBgColor,
            });
            
            if (mode === 'image' && result.newImageBase64) {
                 const cleanedImageBase64 = await smartRefineImage(result.newImageBase64);
                 
                 let sourceColorForRaster = themeColors[theme].stroke; // Default
                 const elementsToCheck = selectionBounds 
                    ? elements.filter(el => selectedElementIds.has(el.id)) 
                    : elements;
    
                const uniqueStrokeColors = new Set(
                    elementsToCheck
                        .filter(el => !el.isMap)
                        .map(el => el.style.strokeColor)
                        .filter(color => color && color.toUpperCase() !== 'TRANSPARENT')
                );
                const uniqueFillColors = new Set(
                    elementsToCheck
                        .filter(el => !el.isMap)
                        .map(el => el.style.fillColor)
                        .filter(color => color && color.toUpperCase() !== 'TRANSPARENT')
                );

                const allUniqueColors = new Set([...uniqueStrokeColors, ...uniqueFillColors]);

                if (allUniqueColors.size > 1) {
                    sourceColorForRaster = 'multi-color';
                } else if (allUniqueColors.size === 1) {
                    sourceColorForRaster = allUniqueColors.values().next().value;
                }

                 if (selectionBounds) {
                    // Replace selection with a new raster element
                    const newRasterElement: RasterElement = {
                        id: Date.now(),
                        type: 'raster',
                        imageUrl: 'data:image/png;base64,' + cleanedImageBase64,
                        bounds: selectionBounds,
                        style: { strokeColor: 'transparent', fillColor: 'transparent', strokeWidth: 0 },
                        sourceStrokeColor: sourceColorForRaster,
                    };
                    setCanvasState(prev => ({ ...prev, elements: [...prev.elements.filter(el => !selectedElementIds.has(el.id)), newRasterElement] }), false);
                 } else {
                    // Global image edit: replace everything. This is an atomic, undoable action.
                    setCanvasState({ elements: [], backgroundImage: 'data:image/png;base64,' + cleanedImageBase64 }, false);
                 }
                 setSelectedElementIds(new Set());
            } else if (result.elements) {
                 // Vector edit: replace elements and clear background image. Atomic and undoable.
                 setCanvasState({ elements: result.elements, backgroundImage: null }, false);
                 setSelectedElementIds(new Set());
            }

            const aiMessage: ChatMessage = { 
                sender: 'ai', 
                text: result.response,
                type: mode === 'code' ? 'code' : 'text',
                language: mode === 'code' ? language : undefined
            };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error: any) {
            const errorMessage: ChatMessage = { sender: 'ai', text: `Error: ${error.message}`, type: 'text' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBeautify = () => {
        if (elements.length === 0) {
             setMessages(prev => [...prev, { sender: 'ai', text: "There's nothing on the canvas to beautify!", type: 'text' }]);
             return;
        }
        let prompt = "Beautify the entire drawing. Clean up the lines, align the shapes, and make it look professional.";
        if (selectedElementIds.size > 0) {
            prompt = "Beautify only the selected elements. Clean up their lines and shapes."
        }
        handleSendMessage(prompt, 'chat');
    }

    const handleExport = (format: 'png' | 'svg') => {
        if (!canvasRef.current) return;
        const { width, height } = canvasRef.current;
        const svgString = convertElementsToSvg(elements, width, height, isBgTransparent, theme, backgroundImage);
        const name = `diagram-${domain}-${Date.now()}`;

        if (format === 'svg') {
            exportToSvg(svgString, name);
        } else {
            exportToPng(svgString, width, height, name, isBgTransparent, theme);
        }
    };

    const handleStyleChange = useCallback((newStyle: Partial<ElementStyle>) => {
        const updatedStyle = { ...style, ...newStyle };
        setStyle(updatedStyle);

        if (selectedElementIds.size > 0) {
            updateElements(prevElements =>
                prevElements.map(el =>
                    selectedElementIds.has(el.id) ? { ...el, style: { ...el.style, ...newStyle } } : el
                ), true
            );
        }
    }, [style, selectedElementIds, setCanvasState]);
    
    const effectiveStyle = useMemo(() => {
        if (selectedElementIds.size === 1) {
            const selectedId = selectedElementIds.values().next().value;
            const selectedElement = elements.find(el => el.id === selectedId);
            if (selectedElement) {
                return { ...style, ...selectedElement.style };
            }
        }
        return style;
    }, [elements, selectedElementIds, style]);

    const handleResetView = () => {
        setPanZoomState({ scale: 1, positionX: 0, positionY: 0 });
    }
    
    const handleTextCreate = (point: Point) => {
        const id = Date.now();
        const newTextElement: TextElement = {
            id,
            type: 'text',
            points: [point],
            style: { ...style, fillColor: style.strokeColor },
            text: 'Text',
        };
        updateElements(prev => [...prev, newTextElement]);
        setEditingElementId(id);
        setTool('select');
    };

    const handleTextUpdate = (id: number, newText: string) => {
        updateElements(prev => prev.map(el => el.id === id ? { ...el, text: newText } : el));
        if (newText.trim() === '') {
            updateElements(prev => prev.filter(el => el.id !== id));
        }
    };

    const handleFinishEditingText = () => {
        if (!editingElementId || !textInputRef.current) return;
        handleTextUpdate(editingElementId, textInputRef.current.value);
        setEditingElementId(null);
        setSelectedElementIds(new Set());
    }
    
    const handleElementDoubleClick = (elementId: number) => {
        const element = elements.find(el => el.id === elementId);
        if (element && element.type === 'text') {
            setEditingElementId(elementId);
        }
    };
    
    const handleAssetDrop = (asset: Asset, point: Point) => {
        const DESIRED_WIDTH = 100;
        const scale = asset.width > 0 ? DESIRED_WIDTH / asset.width : 1;
        const newWidth = asset.width * scale;
        const newHeight = asset.height * scale;
        
        const translation: Point = {
            x: point.x - newWidth / 2,
            y: point.y - newHeight / 2,
        };

        const transformedPathData = transformPathData(asset.pathData, scale, scale, translation);
        
        const isMapAsset = asset.domains.includes('map');
        
        const newElement: PathElement = {
            id: Date.now() + Math.random(),
            type: 'path',
            points: [],
            pathData: transformedPathData,
            isMap: isMapAsset,
            style: {
                strokeColor: isMapAsset ? themeColors[theme].mapStroke : themeColors[theme].stroke,
                fillColor: isMapAsset ? themeColors[theme].mapFill : 'transparent',
                strokeWidth: isMapAsset ? 1 : 2,
            },
            bounds: {
                minX: translation.x,
                minY: translation.y,
                maxX: translation.x + newWidth,
                maxY: translation.y + newHeight,
            }
        };
        
        updateElements(prev => [...prev, newElement]);
        
        if (asset.id.startsWith('map-')) {
            recordMapUsage(asset.id);
        }
    };
    
    const editingElement = elements.find(el => el.id === editingElementId);

    return (
        <div className="w-screen h-screen bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white flex overflow-hidden">
            <AssetsToolbar isOpen={isAssetsPanelOpen} onToggle={() => setIsAssetsPanelOpen(!isAssetsPanelOpen)} />
            <AssetsPanel isOpen={isAssetsPanelOpen} domain={domain} />

            <main className="flex-1 flex flex-col relative">
                <div className="absolute top-4 left-4 z-20 flex flex-col sm:flex-row gap-2 items-start">
                    <DomainSelector currentDomain={domain} onDomainChange={setDomain} />
                    {domain === 'map' && <MapDetailSelector currentLevel={mapDetail} onLevelChange={setMapDetail} />}
                </div>

                <div className="absolute top-4 right-4 z-20 flex gap-2">
                     <button
                        onClick={handleBeautify}
                        disabled={isLoading || elements.length === 0}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-semibold transition-colors duration-200 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed"
                     >
                        {selectedElementIds.size > 0 ? "Beautify Selection" : "Beautify"}
                    </button>
                    <ExportButton onExport={handleExport} disabled={elements.length === 0 && !backgroundImage} />
                    <BackgroundToggle isTransparent={isBgTransparent} onToggle={setIsBgTransparent} />
                    <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
                </div>
                
                <Toolbar
                    currentTool={tool}
                    onToolChange={setTool}
                    onUndo={undo}
                    onRedo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onResetView={handleResetView}
                />
                <StylePanel
                    currentStyle={effectiveStyle}
                    onStyleChange={handleStyleChange}
                    isSelectionActive={selectedElementIds.size > 0}
                    tool={tool}
                    theme={theme}
                />
                
                <Canvas
                    ref={canvasRef}
                    elements={elements}
                    setElements={updateElements}
                    tool={tool}
                    style={style}
                    theme={theme}
                    isBgTransparent={isBgTransparent}
                    backgroundImage={backgroundImage}
                    selectedElementIds={selectedElementIds}
                    setSelectedElementIds={setSelectedElementIds}
                    panZoomState={panZoomState}
                    setPanZoomState={setPanZoomState}
                    onTextCreate={handleTextCreate}
                    onElementDoubleClick={handleElementDoubleClick}
                    editingElementId={editingElementId}
                    onAssetDrop={handleAssetDrop}
                />
                
                {editingElement?.type === 'text' && (
                    <textarea
                        ref={textInputRef}
                        defaultValue={editingElement.text}
                        onBlur={handleFinishEditingText}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleFinishEditingText();
                            }
                            if (e.key === 'Escape') {
                                setEditingElementId(null);
                            }
                        }}
                        autoFocus
                        style={{
                            position: 'absolute',
                            left: `${(editingElement.points[0].x * panZoomState.scale) + panZoomState.positionX}px`,
                            top: `${(editingElement.points[0].y * panZoomState.scale) + panZoomState.positionY}px`,
                            transformOrigin: 'top left',
                            transform: `scale(${panZoomState.scale})`,
                            fontSize: `${editingElement.style.fontSize || 24}px`,
                            lineHeight: 1.2,
                            fontFamily: 'sans-serif',
                            color: editingElement.style.fillColor,
                            background: theme === 'dark' ? '#374151' : '#F3F4F6',
                            border: '1px solid #4f46e5',
                            outline: 'none',
                            zIndex: 100,
                            width: '200px',
                            minHeight: `${(editingElement.style.fontSize || 24) * 1.2 + 10}px`,
                            resize: 'both',
                            overflow: 'hidden',
                        }}
                    />
                )}

            </main>
            <aside className="w-[350px] flex-shrink-0 border-l border-gray-200 dark:border-gray-700">
                <ChatPanel messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} selectedElementCount={selectedElementIds.size} />
            </aside>
        </div>
    );
};

export default App;