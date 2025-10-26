import type { Point, Element } from '../types';

/**
 * Calculates the raw, unpadded geometric bounding box of a single element.
 * This is an internal helper function.
 * @param element The element to measure.
 * @param ctx A canvas rendering context for text measurement.
 * @returns The raw bounding box coordinates.
 */
const getRawElementBounds = (element: Element): { minX: number, minY: number, maxX: number, maxY: number } => {
    if ((element.type === 'path' || element.type === 'raster') && element.bounds) {
        return element.bounds;
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    if (element.type === 'circle' && element.points.length >= 2) {
        const [center, edge] = element.points;
        const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
        minX = center.x - radius;
        minY = center.y - radius;
        maxX = center.x + radius;
        maxY = center.y + radius;
    } else if (element.type === 'text' && element.text && element.points.length > 0) {
        const ctx = document.createElement('canvas').getContext('2d')!;
        const fontSize = element.style.fontSize || 24;
        ctx.font = `${fontSize}px sans-serif`;
        const metrics = ctx.measureText(element.text);
        const x = element.points[0].x;
        const y = element.points[0].y;
        minX = x;
        minY = y;
        maxX = x + metrics.width;
        maxY = y + fontSize;
    } else if ('points' in element && element.points.length > 0){
        element.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
    } else {
         return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    return { minX, minY, maxX, maxY };
};


/**
 * Calculates the geometric center of an element based on its raw bounds.
 * @param element The element to find the center of.
 * @returns The center point {x, y}.
 */
export const getElementCenter = (element: Element): Point => {
    const bounds = getRawElementBounds(element);
    return {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2
    };
};

/**
 * Calculates a padded bounding box for hit-detection purposes.
 * @param element The element to measure.
 * @returns The padded bounding box coordinates.
 */
export const getElementBounds = (element: Element): { minX: number, minY: number, maxX: number, maxY: number } => {
    const padding = element.style.strokeWidth / 2 + 5; // Add padding for easier selection
    const bounds = getRawElementBounds(element);
    
    return {
        minX: bounds.minX - padding,
        minY: bounds.minY - padding,
        maxX: bounds.maxX + padding,
        maxY: bounds.maxY + padding,
    };
};

/**
 * Calculates the collective, tight bounding box of multiple elements for resizing.
 * @param elements The elements to measure.
 * @returns The collective bounding box.
 */
export const getElementsBounds = (elements: Element[]): { minX: number, minY: number, maxX: number, maxY: number } => {
    if (elements.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
        // Use raw (un-padded) bounds for an accurate collective box
        const bounds = getRawElementBounds(el);
        minX = Math.min(minX, bounds.minX);
        minY = Math.min(minY, bounds.minY);
        maxX = Math.max(maxX, bounds.maxX);
        maxY = Math.max(maxY, bounds.maxY);
    });
    return { minX, minY, maxX, maxY };
};


/**
 * Finds the best attachment point on the boundary of a shape.
 * @param element The element to attach to.
 * @param targetPoint The point the line is trying to connect from.
 * @returns The optimal attachment point on the element's boundary.
 */
export const getAttachmentPoint = (element: Element, targetPoint: Point): Point => {
    const bounds = getRawElementBounds(element);
    const center = getElementCenter(element);

    if (element.type === 'circle') {
        const radius = (bounds.maxX - bounds.minX) / 2;
        const dx = targetPoint.x - center.x;
        const dy = targetPoint.y - center.y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) return { x: center.x + radius, y: center.y };
        return { x: center.x + (dx / dist) * radius, y: center.y + (dy / dist) * radius };
    }

    const dx = targetPoint.x - center.x;
    const dy = targetPoint.y - center.y;
    const w = (bounds.maxX - bounds.minX) / 2;
    const h = (bounds.maxY - bounds.minY) / 2;
    if (dx === 0 && dy === 0) return { x: center.x + w, y: center.y };
    if (w === 0 || h === 0) return center; // Avoid division by zero for lines/points

    const slope = dy / dx;
    const hSlope = h / w;
    let x = center.x, y = center.y;

    if (Math.abs(slope) < hSlope) {
        x = dx > 0 ? center.x + w : center.x - w;
        y = center.y + (x - center.x) * slope;
    } else {
        y = dy > 0 ? center.y + h : center.y - h;
        x = center.x + (y - center.y) / slope;
    }
    return { x, y };
};

/**
 * Transforms an SVG path data string by scaling and translating it.
 * @param pathData The SVG path data string.
 * @param scaleX The horizontal scaling factor.
 * @param scaleY The vertical scaling factor.
 * @param translate The translation point {x, y}.
 * @returns The transformed SVG path data string.
 */
export const transformPathData = (pathData: string, scaleX: number, scaleY: number, translate: Point): string => {
    if (!pathData) return '';
    // This regex is a simplified approach; a proper parser would be more robust.
    // It captures a command (like M, l, c) and the numbers that follow it.
    return pathData.replace(/([A-Za-z])([^A-Za-z]*)/g, (_, command, argsStr) => {
        const args = argsStr.trim().match(/-?\d*\.?\d+/g)?.map(Number) || [];
        if (args.length === 0 && command.toUpperCase() !== 'Z') return command;
        
        let newArgs: number[] = [];
        const isRelative = command.toLowerCase() === command;

        // The logic for transformation depends on the command
        switch (command.toUpperCase()) {
            case 'Z': // Close path command has no arguments
                return 'Z';
            case 'H': // Horizontal lineto
                newArgs = args.map(x => x * scaleX + (isRelative ? 0 : translate.x));
                break;
            case 'V': // Vertical lineto
                newArgs = args.map(y => y * scaleY + (isRelative ? 0 : translate.y));
                break;
            case 'A': // Elliptical Arc
                // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
                for (let i = 0; i < args.length; i += 7) {
                    newArgs.push(
                        args[i] * Math.abs(scaleX), // rx - use abs to prevent negative radius
                        args[i + 1] * Math.abs(scaleY), // ry
                        args[i + 2], // x-axis-rotation
                        args[i + 3], // large-arc-flag
                        args[i + 4], // sweep-flag
                        args[i + 5] * scaleX + (isRelative ? 0 : translate.x), // x
                        args[i + 6] * scaleY + (isRelative ? 0 : translate.y)  // y
                    );
                }
                break;
            default: // M, L, C, S, Q, T (coordinates)
                for (let i = 0; i < args.length; i += 2) {
                    const x = args[i];
                    const y = args[i + 1];
                    newArgs.push(x * scaleX + (isRelative ? 0 : translate.x));
                    newArgs.push(y * scaleY + (isRelative ? 0 : translate.y));
                }
                break;
        }
        return `${command} ${newArgs.join(' ')}`;
    });
};


/**
 * Translates an SVG path data string by a given delta (dx, dy).
 * @param pathData The SVG path data string.
 * @param dx The horizontal translation amount.
 * @param dy The vertical translation amount.
 * @returns The translated SVG path data string.
 */
export const translatePathData = (pathData: string, dx: number, dy: number): string => {
    if (!pathData) return '';
    return transformPathData(pathData, 1, 1, { x: dx, y: dy });
};