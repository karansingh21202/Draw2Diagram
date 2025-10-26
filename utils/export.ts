import type { Element, Theme } from '../types';

export const convertElementsToSvg = (elements: Element[], width: number, height: number, isTransparent: boolean, theme: Theme, backgroundImage: string | null): string => {
  let svgPaths = '';
  
  elements.forEach(el => {
      let tag = '';
      const baseStyle = `stroke="${el.style.strokeColor}" stroke-width="${el.style.strokeWidth}"`;
      const fillStyle = `fill="${el.style.fillColor === 'transparent' ? 'none' : el.style.fillColor}"`;
      const fullStyle = `${baseStyle} ${fillStyle}`;

      switch (el.type) {
          case 'raster':
              if (el.imageUrl && el.bounds) {
                const { minX, minY, maxX, maxY } = el.bounds;
                const w = maxX - minX;
                const h = maxY - minY;
                tag = `<image href="${el.imageUrl}" x="${minX}" y="${minY}" width="${w}" height="${h}" />`;
              }
              break;
          case 'path':
              if (el.pathData) {
                  tag = `<path d="${el.pathData}" ${fullStyle} stroke-linejoin="round" stroke-linecap="round" />`;
              }
              break;
          case 'pen':
              if (el.points.length < 2) break;
              const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              tag = `<path d="${d}" fill="none" ${baseStyle} stroke-linejoin="round" stroke-linecap="round" />`;
              break;
          case 'line':
              if (el.points.length < 2) break;
              tag = `<line x1="${el.points[0].x}" y1="${el.points[0].y}" x2="${el.points[1].x}" y2="${el.points[1].y}" ${baseStyle} stroke-linecap="round" />`;
              break;
          case 'rectangle':
              if (el.points.length < 2) break;
              const minX = Math.min(el.points[0].x, el.points[1].x);
              const minY = Math.min(el.points[0].y, el.points[1].y);
              const w = Math.abs(el.points[0].x - el.points[1].x);
              const h = Math.abs(el.points[0].y - el.points[1].y);
              tag = `<rect x="${minX}" y="${minY}" width="${w}" height="${h}" ${fullStyle} />`;
              break;
          case 'circle':
              if (el.points.length < 2) break;
              const center = el.points[0];
              const edge = el.points[1];
              const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
              tag = `<circle cx="${center.x}" cy="${center.y}" r="${radius}" ${fullStyle} />`;
              break;
          case 'text':
                if ('points' in el && el.points.length > 0 && el.text) {
                    const textStyle = `font-family="sans-serif" font-size="${el.style.fontSize || 24}" fill="${el.style.strokeColor}"`;
                    tag = `<text x="${el.points[0].x}" y="${el.points[0].y}" ${textStyle} dominant-baseline="hanging">${el.text}</text>`;
                }
                break;
      }
      svgPaths += tag;
  });

  const bgColor = theme === 'dark' ? '#111827' : '#FFFFFF';
  const bgRect = isTransparent ? '' : `<rect width="100%" height="100%" fill="${bgColor}" />`;
  const bgImage = backgroundImage ? `<image href="${backgroundImage}" x="0" y="0" width="${width}" height="${height}" />` : '';

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${bgRect}${bgImage}${svgPaths}</svg>`;
};


export const exportToPng = (svgString: string, width: number, height: number, name: string, isTransparent: boolean, theme: Theme) => {
  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.error("Could not get canvas context for export.");
    return;
  }
  
  ctx.scale(dpr, dpr);
  
  // The SVG string now contains the background, so we don't need to draw it here manually
  // unless the SVG itself is transparent and we want a non-transparent PNG.
  // The current logic where the SVG handles its own background is sufficient.
  
  const img = new Image();
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  img.onload = () => {
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);
    
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `${name}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  img.onerror = (e) => {
    console.error("Error loading SVG image for PNG export:", e);
    URL.revokeObjectURL(url);
  };
  
  img.src = url;
};

export const exportToSvg = (svgString: string, name: string) => {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};