import type { Element } from '../types';

interface CacheEntry {
    image: HTMLImageElement;
    status: 'loading' | 'loaded' | 'error';
}
const imageCache = new Map<string, CacheEntry>();

/**
 * Retrieves an image from a cache. If the image is not cached or not loaded,
 * it initiates the loading process and triggers a callback upon completion.
 * @param src The URL of the image to load.
 * @param onLoadCallback A function to call when the image successfully loads, used to trigger a re-render.
 * @returns The HTMLImageElement if it's loaded and ready to be drawn, otherwise null.
 */
const getImageFromCache = (src: string, onLoadCallback?: () => void): HTMLImageElement | null => {
    let entry = imageCache.get(src);

    if (!entry) {
        const image = new Image();
        const newEntry: CacheEntry = { image, status: 'loading' };
        imageCache.set(src, newEntry);
        
        image.onload = () => {
            newEntry.status = 'loaded';
            onLoadCallback?.(); // Critical step to trigger re-render
        };
        image.onerror = () => {
            newEntry.status = 'error';
            console.error(`Failed to load image from src: ${src}`);
        };
        image.src = src;
        return null; // Not ready on the first call
    }

    if (entry.status === 'loaded') {
        return entry.image;
    }

    // Status is 'loading' or 'error', not ready to draw.
    return null;
};


/**
 * Draws a single element onto a canvas rendering context.
 * Handles loading and caching for raster image elements.
 * @param ctx The canvas rendering context.
 * @param element The element to draw.
 * @param forceRender A callback to trigger a re-render of the canvas, needed for async image loading.
 */
export const drawElement = (ctx: CanvasRenderingContext2D, element: Element, forceRender?: () => void) => {
    ctx.strokeStyle = element.style.strokeColor;
    ctx.fillStyle = element.style.fillColor;
    ctx.lineWidth = element.style.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([]);
    
    ctx.beginPath();
    
    switch (element.type) {
        case 'raster':
            if (element.imageUrl) {
                const img = getImageFromCache(element.imageUrl, forceRender);
                if (img && element.bounds) {
                    const { minX, minY, maxX, maxY } = element.bounds;
                    ctx.drawImage(img, minX, minY, maxX - minX, maxY - minY);
                }
            }
            break;
        case 'path':
            if (element.pathData) {
                const path = new Path2D(element.pathData);
                if (element.style.fillColor !== 'transparent') ctx.fill(path);
                ctx.stroke(path);
            }
            break;
        case 'pen':
            if (element.points.length > 1) {
                element.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
                ctx.stroke();
            }
            break;
        case 'line':
            if (element.points.length > 1) {
                ctx.moveTo(element.points[0].x, element.points[0].y);
                ctx.lineTo(element.points[1].x, element.points[1].y);
                ctx.stroke();
            }
            break;
        case 'rectangle':
            if (element.points.length > 1) {
                const [s, e] = element.points;
                ctx.rect(s.x, s.y, e.x - s.x, e.y - s.y);
                if (element.style.fillColor !== 'transparent') ctx.fill();
                ctx.stroke();
            }
            break;
        case 'circle':
            if (element.points.length > 1) {
                const [c, e] = element.points;
                const r = Math.hypot(e.x - c.x, e.y - c.y);
                if (r > 0) {
                    ctx.arc(c.x, c.y, r, 0, 2 * Math.PI);
                    if (element.style.fillColor !== 'transparent') ctx.fill();
                    ctx.stroke();
                }
            }
            break;
        case 'text':
            if (element.text) {
                ctx.font = `${element.style.fontSize || 24}px sans-serif`;
                ctx.fillStyle = element.style.strokeColor;
                ctx.textBaseline = 'top';
                ctx.fillText(element.text, element.points[0].x, element.points[0].y);
            }
            break;
    }
};