import type { Point, Theme } from '../types';

/**
 * A utility function to parse hex colors into an RGBA object.
 * @param hex The hex color string (e.g., '#RRGGBB').
 * @returns An object with r, g, b, a properties.
 */
function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
    if (!hex || hex === 'transparent') {
        return { r: 0, g: 0, b: 0, a: 0 };
    }
    let c: any = hex.substring(1).split('');
    if (c.length === 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return {
        r: (c >> 16) & 255,
        g: (c >> 8) & 255,
        b: c & 255,
        a: 255,
    };
}

/**
 * Intelligently refines an image from the AI by removing its background and creating
 * a clean alpha channel, while preserving the original drawing colors.
 * This function is theme-agnostic and works by detecting if the background is predominantly light or dark.
 * @param base64Image The base64 encoded PNG string from the AI.
 * @returns A Promise that resolves to a new, cleaned base64 encoded PNG string (data only, no prefix).
 */
export const smartRefineImage = (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const { width, height } = img;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
                return reject(new Error('Could not get canvas context for image refinement.'));
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            // --- Smart Background Detection ---
            // Sample corner pixels to guess the background color.
            const corners = [
                0, // Top-left
                (width - 1) * 4, // Top-right
                (height - 1) * width * 4, // Bottom-left
                (height * width - 1) * 4 // Bottom-right
            ];
            let totalLuminance = 0;
            corners.forEach(index => {
                totalLuminance += 0.299 * data[index] + 0.587 * data[index+1] + 0.114 * data[index+2];
            });
            const avgLuminance = totalLuminance / 4;
            const isBackgroundLight = avgLuminance > 127;
            
            const tolerance = 25;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                if (a === 0) continue;
                
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                let newAlpha;

                if (isBackgroundLight) {
                    // If the background is light, darker pixels are part of the drawing.
                    if (lum > 255 - tolerance) {
                        newAlpha = 0; // It's background
                    } else {
                        newAlpha = Math.floor(255 * ((255 - lum) / 255));
                    }
                } else {
                    // If the background is dark, lighter pixels are part of the drawing.
                    if (lum < tolerance) {
                        newAlpha = 0; // It's background
                    } else {
                        newAlpha = Math.floor(255 * (lum / 255));
                    }
                }
                
                // IMPORTANT: Keep original R, G, B values. Only modify the alpha channel.
                data[i + 3] = newAlpha;
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png').split(',')[1]);
        };
        img.onerror = () => reject(new Error('Failed to load image for refinement.'));
        img.src = 'data:image/png;base64,' + base64Image;
    });
};


/**
 * Takes a base64 encoded image (which should be a clean monochrome image with an alpha channel)
 * and replaces the color of any non-transparent pixel with a new color, while perfectly preserving
 * the original pixel's transparency (alpha).
 * @param base64Image The source image data URL.
 * @param oldColorHex The original color (unused, kept for API consistency).
 * @param newColorHex The new color to apply to the drawing (e.g., '#FFFFFF').
 * @returns A Promise resolving to the new base64 encoded image data URL (full URL with prefix).
 */
export const recolorImage = (base64Image: string, oldColorHex: string, newColorHex: string): Promise<string> => {
     return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
                return reject(new Error('Could not get canvas context for image re-coloring.'));
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const newRgba = hexToRgba(newColorHex);

            for (let i = 0; i < data.length; i += 4) {
                 const alpha = data[i + 3];

                 // If the pixel is not fully transparent, it's part of the drawing.
                 if (alpha > 0) {
                    // Change its RGB color to the new theme color.
                    data[i] = newRgba.r;     // red
                    data[i + 1] = newRgba.g; // green
                    data[i + 2] = newRgba.b; // blue
                    // The original alpha (data[i + 3]) is left untouched, preserving the anti-aliasing.
                 }
            }
            
            ctx.putImageData(imageData, 0, 0);
            // Return the full data URL, as expected by App.tsx's handleToggleTheme
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            reject(new Error('Failed to load image for re-coloring.'));
        };
        // The input is a full data URL from the element's `imageUrl` property
        img.src = base64Image;
    });
};