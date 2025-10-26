import React from 'react';
// FIX: Corrected import path for types
import type { Domain } from '../types';
import { ChevronDownIcon } from './icons/Icons';

interface DomainSelectorProps {
  currentDomain: Domain;
  onDomainChange: (domain: Domain) => void;
}

const domains: { id: Domain; name: string }[] = [
  { id: 'general', name: 'General Diagram' },
  { id: 'flowchart', name: 'Flowchart' },
  { id: 'circuit', name: 'Circuit Diagram' },
  { id: 'cloud', name: 'Cloud Architecture' },
  { id: 'uml', name: 'UML Diagram' },
  { id: 'map', name: 'Map' },
];

const DomainSelector: React.FC<DomainSelectorProps> = ({ currentDomain, onDomainChange }) => {
  return (
    <div className="relative">
      <select
        value={currentDomain}
        onChange={(e) => onDomainChange(e.target.value as Domain)}
        className="appearance-none w-full sm:w-auto bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg pl-4 pr-10 py-3 text-gray-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
      >
        {domains.map((domain) => (
          <option key={domain.id} value={domain.id}>
            {domain.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
        <ChevronDownIcon />
      </div>
    </div>
  );
};

export default DomainSelector;