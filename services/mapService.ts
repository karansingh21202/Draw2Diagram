import * as topojson from 'topojson-client';
import { geoPath, geoMercator } from 'd3-geo';
import type { Asset } from '../assets/symbols';
import { localAmCharts } from '../assets/localAmCharts';
import { transformPathData } from '../utils/geometry';

// Define types for TopoJSON for clarity
interface TopoJSONObject {
  type: 'Topology';
  objects: {
    [key: string]: {
      type: 'GeometryCollection';
      geometries: any[];
    };
  };
  arcs: any[];
}

const FREQUENT_MAPS_KEY = 'draw2diagram_frequentMaps';
const MAX_FREQUENT_MAPS = 9;

let worldAtlas: TopoJSONObject | null = null;
let countryFeatures: any[] | null = null;

// Fetch and initialize map data once
async function init() {
  if (worldAtlas) return;
  try {
    const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    if (!response.ok) throw new Error('Failed to load map data');
    worldAtlas = await response.json();
    const featureCollection = topojson.feature(worldAtlas, worldAtlas.objects.countries as any);
    // FIX: Added a type guard to safely check for the `features` property.
    // This ensures the object is a FeatureCollection before accessing its features array, preventing potential runtime errors.
    if (featureCollection && 'features' in featureCollection) {
      countryFeatures = (featureCollection as any).features;
    }
  } catch (error) {
    console.error("Could not initialize map service:", error);
    // FIX: Corrected the initialization of `worldAtlas` in the catch block.
    // An empty object `{}` does not satisfy the TopoJSONObject type. Initialized with a valid empty object to handle errors gracefully.
    worldAtlas = { type: 'Topology', objects: {}, arcs: [] };
    // FIX: Corrected initialization of `countryFeatures` in the catch block.
    // It was being assigned an empty object `{}`, which caused a type error because it is expected to be an array (`any[] | null`).
    // It is now correctly initialized to an empty array `[]`.
    countryFeatures = [];
  }
}

// Generate an Asset for a specific country by its feature object (TopoJSON)
const generateAssetFromFeature = (countryFeature: any): Asset | null => {
    if (!countryFeature || !countryFeature.properties || !countryFeature.geometry || !countryFeature.id) return null;

    const countryName = countryFeature.properties.name;
    const projection = geoMercator().fitSize([500, 500], countryFeature);
    const pathGenerator = geoPath().projection(projection);
    
    const [[x0, y0], [x1, y1]] = pathGenerator.bounds(countryFeature);

    if (!isFinite(x0) || !isFinite(y0) || !isFinite(x1) || !isFinite(y1)) {
        return null;
    }
    
    const width = Math.max(1, x1 - x0);
    const height = Math.max(1, y1 - y0);
    
    const translatedProjection = geoMercator()
        .fitSize([width, height], countryFeature)
        .translate([width / 2, height / 2]); 
    
    const finalPathGenerator = geoPath().projection(translatedProjection);
    const pathData = finalPathGenerator(countryFeature);

    if (!pathData || !pathData.match(/[LCAQZ]/i)) {
        return null;
    }

    return {
        id: `map-${countryFeature.id}`,
        name: countryName,
        domains: ['map'],
        pathData: pathData,
        width: Math.round(width),
        height: Math.round(height),
        viewBox: `0 0 ${Math.round(width)} ${Math.round(height)}`,
    };
}

// Parse complex amCharts SVG strings - FIXED VERSION
const parseAmChartsSvgToAsset = (svgString: string, id: string, name: string): Asset | null => {
    try {
        const pathMatches = [...svgString.matchAll(/<path[^>]*d="([^"]+)"/g)];
        if (pathMatches.length === 0) return null;
        
        const combinedPathData = pathMatches.map(match => match[1]).join(' ');

        const viewBoxMatch = svgString.match(/viewBox="([^"]+)"/i);
        let viewBox = '0 0 1000 1000';
        let width = 1000;
        let height = 1000;
        let minX = 0;
        let minY = 0;
        
        if (viewBoxMatch) {
            viewBox = viewBoxMatch[1];
            const dimensions = viewBox.trim().split(/\s+/).map(parseFloat);
            if (dimensions.length >= 4 && dimensions.every(isFinite)) {
                minX = dimensions[0];
                minY = dimensions[1];
                width = dimensions[2];
                height = dimensions[3];
            }
        } else {
            const widthMatch = svgString.match(/width="(\d+)"/i);
            const heightMatch = svgString.match(/height="(\d+)"/i);
            if (widthMatch) width = parseFloat(widthMatch[1]);
            if (heightMatch) height = parseFloat(heightMatch[1]);
            viewBox = `0 0 ${width} ${height}`;
        }
        
        // Normalize path data to a (0,0) origin if viewBox has an offset
        const normalizedPathData = (minX !== 0 || minY !== 0)
            ? transformPathData(combinedPathData, 1, 1, { x: -minX, y: -minY })
            : combinedPathData;

        return {
            id: `map-amcharts-${id}`,
            name: `${name} (Detailed)`,
            domains: ['map'],
            pathData: normalizedPathData,
            width: Math.round(width),
            height: Math.round(height),
            viewBox: `0 0 ${Math.round(width)} ${Math.round(height)}`,
        };
    } catch (e) {
        console.error(`Error parsing amCharts SVG for ${id}:`, e);
        return null;
    }
};

const getLocalAmCharts = (query: string): Asset[] => {
    const lowerQuery = query.toLowerCase();
    return localAmCharts
        .filter(m => m.name.toLowerCase().includes(lowerQuery) || m.id.toLowerCase().includes(lowerQuery))
        .map(m => parseAmChartsSvgToAsset(m.svg, m.id, m.name))
        .filter((a): a is Asset => a !== null);
};

const slugMap: { [key: string]: string } = {
    'united states': 'usa',
    'united states of america': 'usa',
    'usa': 'usa',
    'america': 'usa',
    'uk': 'unitedKingdom',
    'united kingdom': 'unitedKingdom',
    'britain': 'unitedKingdom',
    'great britain': 'unitedKingdom',
    'india': 'india',
    'nepal': 'nepal',
    'italy': 'italy',
    'world': 'world'
};

export function recordMapUsage(assetId: string) {
    try {
        const rawData = localStorage.getItem(FREQUENT_MAPS_KEY);
        const frequencies: { [id: string]: number } = rawData ? JSON.parse(rawData) : {};
        frequencies[assetId] = (frequencies[assetId] || 0) + 1;
        localStorage.setItem(FREQUENT_MAPS_KEY, JSON.stringify(frequencies));
    } catch (e) {
        console.error("Failed to record map usage:", e);
    }
}

export async function getFrequentMaps(): Promise<Asset[]> {
    await init();
    if (!countryFeatures) return [];

    try {
        const rawData = localStorage.getItem(FREQUENT_MAPS_KEY);
        const frequencies: { [id: string]: number } = rawData ? JSON.parse(rawData) : {};

        const sortedIds = Object.keys(frequencies).sort((a, b) => frequencies[b] - frequencies[a]);
        const topIds = sortedIds.slice(0, MAX_FREQUENT_MAPS);

        const assets = topIds.map(id => {
            if (id.startsWith('map-amcharts-')) {
                const localId = id.replace('map-amcharts-', '');
                const localMap = localAmCharts.find(m => m.id === localId);
                return localMap ? parseAmChartsSvgToAsset(localMap.svg, localMap.id, localMap.name) : null;
            }
            const numericId = id.replace('map-', '');
            const feature = countryFeatures?.find(f => f.id === numericId);
            return feature ? generateAssetFromFeature(feature) : null;
        }).filter((a): a is Asset => a !== null);

        return assets;
    } catch (e) {
        console.error("Failed to get frequent maps:", e);
        return [];
    }
}

export async function searchMaps(query: string): Promise<Asset[]> {
    await init();
    if (!query) return [];

    const lowerCaseQuery = query.toLowerCase();
    
    // Search in local amCharts maps first
    const localAmChartsResults = getLocalAmCharts(lowerCaseQuery);
    
    // Search in TopoJSON world atlas
    const topojsonPromise = (async () => {
        if (!countryFeatures) return [];
        return countryFeatures
            .filter(f => f.properties.name.toLowerCase().includes(lowerCaseQuery))
            .slice(0, 10)
            .map(generateAssetFromFeature)
            .filter((a): a is Asset => a !== null);
    })();
    
    // Try online amCharts if local not found
    const onlineAmChartsPromise = (async () => {
        const slug = slugMap[lowerCaseQuery];
        if (!slug || localAmChartsResults.some(m => m.id.includes(slug))) {
            return null;
        }
        try {
            const response = await fetch(`https://www.amcharts.com/wp-content/uploads/maps/svg/${slug}Low.svg`);
            if (!response.ok) return null;
            const svgString = await response.text();
            const name = Object.keys(slugMap).find(key => slugMap[key] === slug) || slug;
            return parseAmChartsSvgToAsset(svgString, slug, name);
        } catch (e) {
            console.warn(`Could not fetch amCharts map for ${query}:`, e);
            return null;
        }
    })();
    
    const [topojsonResults, onlineAmChartsResult] = await Promise.all([topojsonPromise, onlineAmChartsPromise]);

    // Combine all results, prioritizing local amCharts maps
    const allResults = [...localAmChartsResults, ...topojsonResults];
    if (onlineAmChartsResult) {
        allResults.push(onlineAmChartsResult);
    }
    
    return allResults;
}