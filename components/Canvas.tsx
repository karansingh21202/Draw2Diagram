import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { translatePathData, getAttachmentPoint, getElementBounds, getElementCenter, getElementsBounds, transformPathData } from '../utils/geometry';
import { drawElement } from '../utils/render';
import type { Element, Point, Tool, ElementStyle, Theme, PenElement, LineElement, RectangleElement, CircleElement, TextElement } from '../types';
import type { Asset } from '../assets/symbols';

interface CanvasProps {
    elements: Element[];
    setElements: (action: (prevState: Element[]) => Element[], overwrite?: boolean) => void;
    tool: Tool;
    style: ElementStyle;
    theme: Theme;
    isBgTransparent: boolean;
    backgroundImage: string | null;
    selectedElementIds: Set<number>;
    setSelectedElementIds: React.Dispatch<React.SetStateAction<Set<number>>>;
    panZoomState: { scale: number; positionX: number; positionY: number };
    setPanZoomState: (state: { scale: number; positionX: number; positionY: number }) => void;
    onTextCreate: (point: Point) => void;
    onElementDoubleClick: (elementId: number) => void;
    editingElementId: number | null;
    onAssetDrop: (asset: Asset, point: Point) => void;
}

type Handle = 'n' | 's' | 'w' | 'e' | 'nw' | 'ne' | 'sw' | 'se';
type Bounds = { minX: number, minY: number, maxX: number, maxY: number };
type DragState = 'none' | 'drawing' | 'draggingSelection' | 'resizing' | 'marquee';

const isPointNearLine = (p1: Point, p2: Point, point: Point, threshold: number) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    if (dx === 0 && dy === 0) return false;
    const t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (dx * dx + dy * dy);
    const closestT = Math.max(0, Math.min(1, t));
    const closestPoint = { x: p1.x + closestT * dx, y: p1.y + closestT * dy };
    const dist = Math.sqrt(Math.pow(closestPoint.x - point.x, 2) + Math.pow(closestPoint.y - point.y, 2));
    return dist < threshold;
};

const isPointInElement = (point: Point, element: Element, scale: number): boolean => {
    const { type, style } = element;

    const bounds = getElementBounds(element);
    if (point.x < bounds.minX || point.x > bounds.maxX || point.y < bounds.minY || point.y > bounds.maxY) {
        return false;
    }
    
    if (element.type === 'raster') return true; // Bounds check is sufficient

    if (type === 'path' && element.pathData) {
        const ctx = document.createElement('canvas').getContext('2d')!;
        const path = new Path2D(element.pathData);
        // Give a generous clickable area for strokes, especially when zoomed out.
        ctx.lineWidth = style.strokeWidth + 10 / scale;
        return ctx.isPointInPath(path, point.x, point.y) || ctx.isPointInStroke(path, point.x, point.y);
    }
    
    if (type === 'line' && 'points' in element && element.points.length >= 2) {
        const threshold = 10 / scale + style.strokeWidth / 2;
        return isPointNearLine(element.points[0], element.points[1], point, threshold);
    }
    
    // For filled shapes, the bounds check is sufficient
    return true;
};

const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(({ elements, setElements, tool, style, theme, isBgTransparent, backgroundImage, selectedElementIds, setSelectedElementIds, panZoomState, setPanZoomState, onTextCreate, onElementDoubleClick, editingElementId, onAssetDrop }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useImperativeHandle(ref, () => canvasRef.current!);

    const [drawingElement, setDrawingElement] = useState<Element | null>(null);
    const lastDragPointRef = useRef<Point | null>(null);
    const [marquee, setMarquee] = useState<{ start: Point, end: Point } | null>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 1280, height: 720 });
    const wrapperRef = useRef<HTMLDivElement>(null);
    const lastClickTimeRef = useRef(0);
    const [snapTarget, setSnapTarget] = useState<{ element: Element; isStart: boolean } | null>(null);
    const [loadedBgImage, setLoadedBgImage] = useState<HTMLImageElement | null>(null);
    
    const [hoveredHandle, setHoveredHandle] = useState<Handle | null>(null);
    const [resizingState, setResizingState] = useState<{
        handle: Handle;
        initialSelectionBounds: Bounds;
        initialElements: Map<number, Element>;
        aspectRatio: number;
    } | null>(null);
    
    const [imageRenderTrigger, setImageRenderTrigger] = useState(0);
    const dragStateRef = useRef<DragState>('none');


    const forceImageRender = useCallback(() => {
        setImageRenderTrigger(v => v + 1);
    }, []);

     useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        const resizeObserver = new ResizeObserver(() => {
            setCanvasSize({ width: wrapper.offsetWidth, height: wrapper.offsetHeight });
        });
        resizeObserver.observe(wrapper);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        if (backgroundImage) {
            const img = new Image();
            img.onload = () => setLoadedBgImage(img);
            img.onerror = () => setLoadedBgImage(null);
            img.src = backgroundImage;
        } else {
            setLoadedBgImage(null);
        }
    }, [backgroundImage]);

    const getHandles = (bounds: Bounds): { [key in Handle]: Bounds } => {
        const handleSize = 8 / panZoomState.scale;
        const halfHandle = handleSize / 2;
        return {
            nw: { minX: bounds.minX - halfHandle, minY: bounds.minY - halfHandle, maxX: bounds.minX + halfHandle, maxY: bounds.minY + halfHandle },
            n:  { minX: (bounds.minX + bounds.maxX) / 2 - halfHandle, minY: bounds.minY - halfHandle, maxX: (bounds.minX + bounds.maxX) / 2 + halfHandle, maxY: bounds.minY + halfHandle },
            ne: { minX: bounds.maxX - halfHandle, minY: bounds.minY - halfHandle, maxX: bounds.maxX + halfHandle, maxY: bounds.minY + halfHandle },
            e:  { minX: bounds.maxX - halfHandle, minY: (bounds.minY + bounds.maxY) / 2 - halfHandle, maxX: bounds.maxX + halfHandle, maxY: (bounds.minY + bounds.maxY) / 2 + halfHandle },
            se: { minX: bounds.maxX - halfHandle, minY: bounds.maxY - halfHandle, maxX: bounds.maxX + halfHandle, maxY: bounds.maxY + halfHandle },
            s:  { minX: (bounds.minX + bounds.maxX) / 2 - halfHandle, minY: bounds.maxY - halfHandle, maxX: (bounds.minX + bounds.maxX) / 2 + halfHandle, maxY: bounds.maxY + halfHandle },
            sw: { minX: bounds.minX - halfHandle, minY: bounds.maxY - halfHandle, maxX: bounds.minX + halfHandle, maxY: bounds.maxY + halfHandle },
            w:  { minX: bounds.minX - halfHandle, minY: (bounds.minY + bounds.maxY) / 2 - halfHandle, maxX: bounds.minX + halfHandle, maxY: (bounds.minY + bounds.maxY) / 2 + halfHandle },
        };
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (loadedBgImage) {
            ctx.drawImage(loadedBgImage, 0, 0, canvas.width, canvas.height);
        } else if (!isBgTransparent) {
            ctx.fillStyle = theme === 'dark' ? '#111827' : '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // All drawing operations are now performed in "world" coordinates.
        // The react-zoom-pan-pinch library handles the transformation of the
        // entire canvas via CSS, so we don't need to manually transform the context.
        const elementsToDraw = drawingElement ? [...elements, drawingElement] : elements;

        elementsToDraw.forEach(element => {
            if (element.id === editingElementId) return; // Hide text being edited
            drawElement(ctx, element, forceImageRender);
        });
        
        // Draw selection box and handles
        if (selectedElementIds.size > 0) {
            const selectedElements = elements.filter(el => selectedElementIds.has(el.id));
            const bounds = getElementsBounds(selectedElements);
            
            ctx.save();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1 / panZoomState.scale;
            ctx.setLineDash([4 / panZoomState.scale, 2 / panZoomState.scale]);
            ctx.strokeRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);

            // Draw handles
            ctx.fillStyle = theme === 'dark' ? '#FFFFFF' : '#111827';
            ctx.setLineDash([]);
            const handles = getHandles(bounds);
            Object.values(handles).forEach(handle => {
                ctx.strokeRect(handle.minX, handle.minY, handle.maxX - handle.minX, handle.maxY - handle.minY);
                ctx.fillRect(handle.minX, handle.minY, handle.maxX - handle.minX, handle.maxY - handle.minY);
            });
            ctx.restore();
        }

        if (snapTarget) { /* ... */ }

        // Draw selection marquee
        if (marquee) {
            ctx.save();
            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; // Tailwind's blue-500 with 10% opacity
            ctx.strokeStyle = '#3b82f6'; // Tailwind's blue-500
            ctx.lineWidth = 1 / panZoomState.scale;
            ctx.setLineDash([4 / panZoomState.scale, 2 / panZoomState.scale]);

            const width = marquee.end.x - marquee.start.x;
            const height = marquee.end.y - marquee.start.y;

            ctx.fillRect(marquee.start.x, marquee.start.y, width, height);
            ctx.strokeRect(marquee.start.x, marquee.start.y, width, height);
            ctx.restore();
        }

    }, [elements, drawingElement, theme, isBgTransparent, panZoomState, selectedElementIds, canvasSize, marquee, editingElementId, snapTarget, loadedBgImage, imageRenderTrigger, forceImageRender]);
    
    const getPointInCanvas = useCallback((clientX: number, clientY: number): Point => {
        if (!wrapperRef.current) return { x: 0, y: 0 };
        const rect = wrapperRef.current.getBoundingClientRect();
        return { 
            x: (clientX - rect.left - panZoomState.positionX) / panZoomState.scale, 
            y: (clientY - rect.top - panZoomState.positionY) / panZoomState.scale 
        };
    }, [panZoomState]);
    
    const getElementAtPoint = (point: Point): Element | null => {
        // Iterate backwards so we pick the top-most element
        const reversedElements = [...elements].reverse();
    
        for (const el of reversedElements) {
            try {
                if (isPointInElement(point, el, panZoomState.scale)) {
                    return el;
                }
            } catch (error) {
                console.error(`Selection check failed for element ID ${el.id}. Skipping.`, error);
            }
        }
        
        return null;
    };
    
    const getHandleAtPoint = (point: Point): Handle | null => {
        if (selectedElementIds.size === 0) return null;
        const selectedElements = elements.filter(el => selectedElementIds.has(el.id));
        const bounds = getElementsBounds(selectedElements);
        const handles = getHandles(bounds);
        for (const [name, handleBounds] of Object.entries(handles)) {
            if (point.x >= handleBounds.minX && point.x <= handleBounds.maxX && point.y >= handleBounds.minY && point.y <= handleBounds.maxY) {
                return name as Handle;
            }
        }
        return null;
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (tool === 'pan' || (e.button !== 0)) return;

        const clickTime = Date.now();
        const isDoubleClick = clickTime - lastClickTimeRef.current < 300;
        lastClickTimeRef.current = clickTime;
        const startPoint = getPointInCanvas(e.clientX, e.clientY);

        const handle = getHandleAtPoint(startPoint);
        if (handle) {
            const selected = elements.filter(el => selectedElementIds.has(el.id));
            const bounds = getElementsBounds(selected);
            setResizingState({
                handle,
                initialSelectionBounds: bounds,
                initialElements: new Map(selected.map(el => [el.id, JSON.parse(JSON.stringify(el))])),
                aspectRatio: (bounds.maxX - bounds.minX) / (bounds.maxY - bounds.minY)
            });
            dragStateRef.current = 'resizing';
            return;
        }

        const clickedElement = getElementAtPoint(startPoint);

        if (isDoubleClick && clickedElement && clickedElement.type === 'text') { onElementDoubleClick(clickedElement.id); return; }
        if (tool === 'text') { onTextCreate(startPoint); return; }

        if (tool === 'select') {
            if (clickedElement) {
                if (!selectedElementIds.has(clickedElement.id)) {
                  const newSelection = e.shiftKey ? new Set(selectedElementIds) : new Set<number>();
                  newSelection.add(clickedElement.id);
                  setSelectedElementIds(newSelection);
                }
                dragStateRef.current = 'draggingSelection';
                lastDragPointRef.current = startPoint;
            } else {
                if (!e.shiftKey) setSelectedElementIds(new Set<number>());
                setMarquee({ start: startPoint, end: startPoint });
                dragStateRef.current = 'marquee';
            }
            return;
        }
        
        if (tool === 'eraser') { /* Eraser logic can be added here */ }
        
        dragStateRef.current = 'drawing';
        const newElement: PenElement | LineElement | RectangleElement | CircleElement = { 
            id: Date.now(), 
            type: tool as 'line', // Cast, will be one of the drawing tools
            points: [startPoint, startPoint], 
            style: style,
        };
        if (tool === 'line' && clickedElement) {
            (newElement as LineElement).startElementId = clickedElement.id;
            newElement.points[0] = getAttachmentPoint(clickedElement, startPoint);
        }
        setDrawingElement(newElement);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const currentPoint = getPointInCanvas(e.clientX, e.clientY);
        const { current: dragState } = dragStateRef;
        
        if (tool === 'pan' && dragState === 'none') return;
        
        if (dragState === 'resizing' && resizingState) {
            const { handle, initialSelectionBounds, initialElements } = resizingState;
            let newBounds = { ...initialSelectionBounds };

            if (handle.includes('e')) newBounds.maxX = currentPoint.x;
            if (handle.includes('w')) newBounds.minX = currentPoint.x;
            if (handle.includes('s')) newBounds.maxY = currentPoint.y;
            if (handle.includes('n')) newBounds.minY = currentPoint.y;
            
            if (newBounds.minX > newBounds.maxX) [newBounds.minX, newBounds.maxX] = [newBounds.maxX, newBounds.minX];
            if (newBounds.minY > newBounds.maxY) [newBounds.minY, newBounds.maxY] = [newBounds.maxY, newBounds.minY];
            
            if (e.shiftKey && ['nw', 'ne', 'sw', 'se'].includes(handle)) {
                 const originalAspectRatio = (initialSelectionBounds.maxX - initialSelectionBounds.minX) / (initialSelectionBounds.maxY - initialSelectionBounds.minY);
                 if (isFinite(originalAspectRatio) && originalAspectRatio > 0) {
                    const newWidth = newBounds.maxX - newBounds.minX;
                    const newHeight = newBounds.maxY - newBounds.minY;

                    if (Math.abs(newWidth / newHeight - originalAspectRatio) > 1e-2) {
                        if (handle.includes('w') || handle.includes('e')) {
                            const aspectHeight = newWidth / originalAspectRatio;
                            if (handle.includes('n')) newBounds.minY = newBounds.maxY - aspectHeight;
                            else newBounds.maxY = newBounds.minY + aspectHeight;
                        } else {
                            const aspectWidth = newHeight * originalAspectRatio;
                            if (handle.includes('w')) newBounds.minX = newBounds.maxX - aspectWidth;
                            else newBounds.maxX = newBounds.minX + aspectWidth;
                        }
                    }
                 }
            }

            const initialWidth = initialSelectionBounds.maxX - initialSelectionBounds.minX;
            const initialHeight = initialSelectionBounds.maxY - initialSelectionBounds.minY;
            const finalWidth = newBounds.maxX - newBounds.minX;
            const finalHeight = newBounds.maxY - newBounds.minY;

            const scaleX = initialWidth === 0 ? 1 : finalWidth / initialWidth;
            const scaleY = initialHeight === 0 ? 1 : finalHeight / initialHeight;
            
            const origin = {
                x: handle.includes('w') ? initialSelectionBounds.maxX : initialSelectionBounds.minX,
                y: handle.includes('n') ? initialSelectionBounds.maxY : initialSelectionBounds.minY,
            };
            
            setElements(prev => prev.map(el => {
                if (!initialElements.has(el.id)) return el;
                const initialEl = initialElements.get(el.id)!;
                if (initialEl.type === 'raster') return el;
                
                const newPoints = 'points' in initialEl ? initialEl.points.map(p => ({
                    x: origin.x + (p.x - origin.x) * scaleX,
                    y: origin.y + (p.y - origin.y) * scaleY
                })) : [];
                
                let newPathData: string | undefined;
                let newBoundsForEl: Bounds | undefined;

                if (initialEl.type === 'path' && initialEl.pathData && initialEl.bounds) {
                    const translation = { x: origin.x * (1 - scaleX), y: origin.y * (1 - scaleY) };
                    newPathData = transformPathData(initialEl.pathData, scaleX, scaleY, translation);
                    newBoundsForEl = {
                        minX: origin.x + (initialEl.bounds.minX - origin.x) * scaleX,
                        minY: origin.y + (initialEl.bounds.minY - origin.y) * scaleY,
                        maxX: origin.x + (initialEl.bounds.maxX - origin.x) * scaleX,
                        maxY: origin.y + (initialEl.bounds.maxY - origin.y) * scaleY,
                    };
                    if (newBoundsForEl.minX > newBoundsForEl.maxX) [newBoundsForEl.minX, newBoundsForEl.maxX] = [newBoundsForEl.maxX, newBoundsForEl.minX];
                    if (newBoundsForEl.minY > newBoundsForEl.maxY) [newBoundsForEl.minY, newBoundsForEl.maxY] = [newBoundsForEl.maxY, newBoundsForEl.minY];
                }
                
                const updatedEl = { ...el, points: newPoints };
                if (newPathData !== undefined) (updatedEl as any).pathData = newPathData;
                if (newBoundsForEl !== undefined) (updatedEl as any).bounds = newBoundsForEl;

                return updatedEl;
            }), true);
            return;
        } else if (dragState === 'draggingSelection' && lastDragPointRef.current && selectedElementIds.size > 0) {
            const dx = currentPoint.x - lastDragPointRef.current.x;
            const dy = currentPoint.y - lastDragPointRef.current.y;
             setElements(prevElements => {
                const updatedElements = new Map<number, Element>(prevElements.map(el => [el.id, el]));
                selectedElementIds.forEach(id => {
                    const el = updatedElements.get(id);
                    if (el) {
                        let newEl: Element;
                        switch (el.type) {
                            case 'path':
                                newEl = { ...el, points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })), pathData: translatePathData(el.pathData, dx, dy), bounds: { minX: el.bounds.minX + dx, minY: el.bounds.minY + dy, maxX: el.bounds.maxX + dx, maxY: el.bounds.maxY + dy } };
                                break;
                            case 'raster':
                                newEl = { ...el, bounds: { minX: el.bounds.minX + dx, minY: el.bounds.minY + dy, maxX: el.bounds.maxX + dx, maxY: el.bounds.maxY + dy } };
                                break;
                            default:
                                newEl = { ...el, points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
                        }
                        updatedElements.set(id, newEl);
                    }
                });
                return Array.from(updatedElements.values());
            }, true);
            lastDragPointRef.current = currentPoint;
            return;
        } else if (dragState === 'marquee' && marquee) { 
            setMarquee({ ...marquee, end: currentPoint });
            return;
        } else if (dragState === 'drawing' && drawingElement && 'points' in drawingElement) {
            setDrawingElement(prevElement => {
                if (!prevElement || !('points' in prevElement)) return null;
                const { type } = prevElement;
                const newPoints = [...prevElement.points];
                if (type === 'pen') {
                    newPoints.push(currentPoint);
                } else if (newPoints.length > 0) {
                    newPoints[newPoints.length - 1] = currentPoint;
                }
                return { ...prevElement, points: newPoints };
            });
        } else {
             setHoveredHandle(getHandleAtPoint(currentPoint));
        }
    }, [getPointInCanvas, tool, resizingState, setElements, selectedElementIds, marquee, drawingElement]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        const { current: dragState } = dragStateRef;
        if (dragState === 'none') return;
        
        if (dragState === 'resizing') {
            setResizingState(null);
            setElements(currentElements => [...currentElements], false);
        } else if (dragState === 'draggingSelection') {
            lastDragPointRef.current = null;
            setElements(currentElements => [...currentElements], false);
        } else if (dragState === 'marquee' && marquee) { 
            const bounds = {
                minX: Math.min(marquee.start.x, marquee.end.x),
                minY: Math.min(marquee.start.y, marquee.end.y),
                maxX: Math.max(marquee.start.x, marquee.end.x),
                maxY: Math.max(marquee.start.y, marquee.end.y),
            }
            const idsInMarquee = elements
                .filter(el => {
                    const elCenter = getElementCenter(el);
                    return elCenter.x > bounds.minX && elCenter.x < bounds.maxX && elCenter.y > bounds.minY && elCenter.y < bounds.maxY;
                })
                .map(el => el.id);
            
            setSelectedElementIds(prev => {
                const newSelection = e.shiftKey ? new Set(prev) : new Set<number>();
                idsInMarquee.forEach(id => newSelection.add(id));
                return newSelection;
            });
            setMarquee(null);
        } else if (dragState === 'drawing' && drawingElement) {
            if (drawingElement.type === 'pen' && drawingElement.points.length > 20) {
                const simplifiedPoints = drawingElement.points.filter((_, i) => i % 4 === 0 || i === drawingElement.points.length - 1);
                const finalElement = { ...drawingElement, points: simplifiedPoints };
                setElements(prevElements => [...prevElements, finalElement], false);
            } else {
                setElements(prevElements => [...prevElements, drawingElement], false);
            }
            setDrawingElement(null);
        }
        
        dragStateRef.current = 'none';
        setSnapTarget(null);
    }, [setElements, marquee, drawingElement, elements, setSelectedElementIds]);
    
     useEffect(() => {
        const handleMove = (e: MouseEvent) => handleMouseMove(e);
        const handleUp = (e: MouseEvent) => handleMouseUp(e);

        if (dragStateRef.current !== 'none') {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    const getCursor = () => {
        if (resizingState || hoveredHandle) {
            const handle = resizingState?.handle || hoveredHandle;
            if (handle === 'n' || handle === 's') return 'ns-resize';
            if (handle === 'e' || handle === 'w') return 'ew-resize';
            if (handle === 'nw' || handle === 'se') return 'nwse-resize';
            if (handle === 'ne' || handle === 'sw') return 'nesw-resize';
        }
        if (dragStateRef.current === 'draggingSelection') return 'grabbing';
        switch (tool) {
            case 'pan': return 'grab';
            case 'select': return 'default';
            case 'pen': return 'crosshair';
            case 'line': return 'crosshair';
            case 'rectangle': return 'crosshair';
            case 'circle': return 'crosshair';
            case 'text': return 'text';
            case 'eraser': return 'cell';
            default: return 'default';
        }
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        if (e.dataTransfer.types.includes('application/json')) e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        if (e.dataTransfer.types.includes('application/json')) {
            e.preventDefault();
            try {
                const asset = JSON.parse(e.dataTransfer.getData('application/json'));
                if (asset && asset.id && asset.pathData) {
                    onAssetDrop(asset, getPointInCanvas(e.clientX, e.clientY));
                }
            } catch (error) { console.error("Failed to handle asset drop:", error); }
        }
    };

    return (
        <div 
            className="w-full h-full flex-1 bg-gray-50 dark:bg-gray-900 overflow-hidden" 
            ref={wrapperRef} 
            style={{ cursor: getCursor() }}
        >
            <TransformWrapper
                initialScale={panZoomState.scale}
                initialPositionX={panZoomState.positionX}
                initialPositionY={panZoomState.positionY}
                onTransformed={(_ref, state) => setPanZoomState(state)}
                minScale={0.1}
                maxScale={20}
                limitToBounds={false}
                panning={{ disabled: tool !== 'pan' || dragStateRef.current !== 'none', velocityDisabled: true }}
                wheel={{ step: 0.1 }}
                doubleClick={{ disabled: true }}
            >
                <TransformComponent
                    wrapperStyle={{ width: '100%', height: '100%' }}
                    contentStyle={{ width: canvasSize.width, height: canvasSize.height }}
                >
                    <div 
                        style={{ width: canvasSize.width, height: canvasSize.height }}
                        onMouseDown={handleMouseDown}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        <canvas
                            ref={canvasRef}
                            width={canvasSize.width}
                            height={canvasSize.height}
                            className="absolute top-0 left-0"
                        />
                    </div>
                </TransformComponent>
            </TransformWrapper>
        </div>
    );
});

export default Canvas;