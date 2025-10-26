import type { Asset } from '../assets/symbols';

const API_URL = 'https://api.iconify.design';

/**
 * Parses an SVG string to extract its path data, viewBox, and dimensions.
 * @param svgString The raw SVG string content.
 * @param id A unique ID for the asset (e.g., 'mdi:database').
 * @param name A user-friendly name for the asset.
 * @returns An Asset object or null if parsing fails.
 */
const parseSvgToAsset = (svgString: string, id: string, name: string): Asset | null => {
    try {
        // Use matchAll to find all <path> elements and their 'd' attributes.
        const pathMatches = [...svgString.matchAll(/<path[^>]*d="([^"]+)"/g)];
        
        // If no paths are found, it's not a valid icon for our use case.
        if (pathMatches.length === 0) {
            console.warn(`No path data found for icon ${id}.`);
            return null;
        }

        // Combine all found path data strings into one. This works because
        // each path typically starts with a "moveto" command.
        const pathData = pathMatches.map(match => match[1]).join(' ');

        const viewBoxMatch = svgString.match(/viewBox="([^"]+)"/);
        const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';
        
        const dimensions = viewBox.trim().split(/\s+/).map(parseFloat);
        const width = dimensions[2] || 24;
        const height = dimensions[3] || 24;

        return {
            id,
            name,
            domains: ['general'], // All remote icons are general purpose
            pathData,
            width,
            height,
            viewBox,
        };
    } catch (e) {
        console.error(`Error parsing SVG for icon ${id}:`, e);
        return null;
    }
};

/**
 * Searches the Iconify API for icons and fetches their SVG data.
 * @param query The search term.
 * @returns A promise that resolves to an array of Asset objects.
 */
export const searchIcons = async (query: string): Promise<Asset[]> => {
    if (!query.trim()) {
        return [];
    }
    try {
        const searchResponse = await fetch(`${API_URL}/search?query=${query}&limit=24`);
        if (!searchResponse.ok) {
            throw new Error(`Iconify search failed with status: ${searchResponse.status}`);
        }
        const searchResult = await searchResponse.json();

        if (!searchResult.icons || searchResult.icons.length === 0) {
            return [];
        }

        const iconFetchPromises = searchResult.icons.map(async (iconName: string) => {
            try {
                const svgResponse = await fetch(`${API_URL}/${iconName}.svg`);
                if (!svgResponse.ok) return null;
                const svgString = await svgResponse.text();
                // Format the name nicely (e.g., 'mdi:database' -> 'Database')
                const friendlyName = iconName.split(':')[1].replace(/-/g, ' ');
                return parseSvgToAsset(svgString, iconName, friendlyName);
            } catch {
                return null;
            }
        });

        const assets = (await Promise.all(iconFetchPromises)).filter((asset): asset is Asset => asset !== null);
        return assets;

    } catch (error) {
        console.error("Error fetching from Iconify:", error);
        return [];
    }
};