import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Domain } from '../types';
import { symbols, Asset } from '../assets/symbols';
import { searchIcons } from '../services/iconifyService';
import { searchMaps, getFrequentMaps } from '../services/mapService';
import { LoadingDots } from './icons/Icons';

interface AssetsPanelProps {
  isOpen: boolean;
  domain: Domain;
}

const AssetCard: React.FC<{ asset: Asset }> = ({ asset }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('application/json', JSON.stringify(asset));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const isMap = asset.domains.includes('map');

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
            title={`Drag to add ${asset.name}`}
        >
            <svg
                viewBox={asset.viewBox}
                className="w-12 h-12"
            >
                <path 
                    d={asset.pathData} 
                    className={isMap ? 'fill-gray-400 dark:fill-gray-400 stroke-gray-600 dark:stroke-gray-200' : 'fill-none stroke-gray-700 dark:stroke-gray-300'}
                    strokeWidth={isMap ? (asset.width / 50) : 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <span className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate w-full text-center capitalize">{asset.name}</span>
        </div>
    );
};


const AssetsPanel: React.FC<AssetsPanelProps> = ({ isOpen, domain }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [iconAssets, setIconAssets] = useState<Asset[]>([]);
  const [mapAssets, setMapAssets] = useState<Asset[]>([]);
  const [frequentMaps, setFrequentMaps] = useState<Asset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimeout = useRef<number | null>(null);

  useEffect(() => {
      const loadFrequent = async () => {
          const maps = await getFrequentMaps();
          setFrequentMaps(maps);
      };
      if (isOpen) {
        loadFrequent();
      }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
        setIconAssets([]);
        setMapAssets([]);
        setIsSearching(false);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        return;
    }
    
    setIsSearching(true);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    debounceTimeout.current = window.setTimeout(async () => {
        const iconPromise = searchIcons(searchTerm);
        const mapPromise = searchMaps(searchTerm);
        const [icons, maps] = await Promise.all([iconPromise, mapPromise]);
        
        setIconAssets(icons);
        setMapAssets(maps);
        setIsSearching(false);
    }, 500); // 500ms debounce delay

  }, [searchTerm]);


  const localAssets = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase();
    
    if (!searchTerm.trim()) {
        // If no search term, show default assets for the selected domain
        return Array.from(symbols.values()).filter(asset => 
            domain === 'general' || asset.domains.includes(domain)
        );
    }
    
    // Otherwise, filter all local assets by the search term
    return Array.from(symbols.values()).filter(asset => 
        asset.name.toLowerCase().includes(lowerCaseSearch)
    );
  }, [domain, searchTerm]);
  
  const hasResults = localAssets.length > 0 || iconAssets.length > 0 || mapAssets.length > 0 || (frequentMaps.length > 0 && !searchTerm);

  return (
    <div
      className={`flex-shrink-0 h-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 ease-in-out ${
        isOpen ? 'w-[280px] border-r' : 'w-0 border-transparent'
      }`}
    >
        <div className={`flex flex-col h-full w-[280px] p-2 ${!isOpen && 'invisible'}`}>
            <h3 className="text-lg font-semibold pb-2 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">Assets</h3>
            <div className="py-2 relative">
                <input
                    type="text"
                    placeholder="Search assets, icons, maps..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><LoadingDots/></div> }
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
                {!isSearching && !hasResults ? (
                     <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 p-4">
                        <p>{searchTerm ? `No results for "${searchTerm}".` : `Type to search for assets.`}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {frequentMaps.length > 0 && !searchTerm && (
                             <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase px-1 mb-2">Frequently Used Maps</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {frequentMaps.map(asset => <AssetCard key={asset.id} asset={asset} />)}
                                </div>
                            </div>
                        )}
                        {localAssets.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase px-1 mb-2">
                                    {searchTerm ? 'Symbols' : 'Domain Symbols'}
                                </h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {localAssets.map(asset => <AssetCard key={asset.id} asset={asset} />)}
                                </div>
                            </div>
                        )}
                        {mapAssets.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase px-1 mb-2">Maps</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {mapAssets.map(asset => <AssetCard key={asset.id} asset={asset} />)}
                                </div>
                            </div>
                        )}
                        {iconAssets.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase px-1 mb-2">Web Icons</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {iconAssets.map(asset => <AssetCard key={asset.id} asset={asset} />)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default AssetsPanel;