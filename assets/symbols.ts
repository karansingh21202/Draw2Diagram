import type { Domain } from '../types';

export interface Asset {
  id: string;
  name: string;
  domains: Domain[];
  pathData: string;
  width: number;
  height: number;
  viewBox: string;
}

// Using a Map for efficient lookup by ID
export const symbols: Map<string, Asset> = new Map([
  // Circuit Symbols
  ['resistor', {
    id: 'resistor',
    name: 'Resistor',
    domains: ['circuit'],
    pathData: `M0 12L10 12L12 4L16 20L20 4L24 20L28 4L32 12L42 12`,
    width: 42,
    height: 24,
    viewBox: '0 0 42 24'
  }],
  ['capacitor', {
    id: 'capacitor',
    name: 'Capacitor',
    domains: ['circuit'],
    pathData: `M0 12L18 12M18 0L18 24M24 0L24 24M24 12L42 12`,
    width: 42,
    height: 24,
    viewBox: '0 0 42 24'
  }],
  ['voltage-source', {
    id: 'voltage-source',
    name: 'Voltage Source',
    domains: ['circuit'],
    pathData: `M0 18L20 18M20 6L20 30M26 12L26 24M32 18L52 18M45 12L39 18L45 24M13 12L7 18L13 24`,
    width: 52,
    height: 36,
    viewBox: '0 0 52 36'
  }],

  // Flowchart Symbols
  ['flow-process', {
    id: 'flow-process',
    name: 'Process',
    domains: ['flowchart'],
    pathData: `M0 0L48 0L48 32L0 32L0 0Z`,
    width: 48,
    height: 32,
    viewBox: '0 0 48 32'
  }],
  ['flow-decision', {
    id: 'flow-decision',
    name: 'Decision',
    domains: ['flowchart'],
    pathData: `M24 0L48 16L24 32L0 16L24 0Z`,
    width: 48,
    height: 32,
    viewBox: '0 0 48 32'
  }],
  ['flow-terminator', {
    id: 'flow-terminator',
    name: 'Terminator',
    domains: ['flowchart'],
    pathData: `M16 0L32 0C40.8366 0 48 7.16344 48 16C48 24.8366 40.8366 32 32 32L16 32C7.16344 32 0 24.8366 0 16C0 7.16344 7.16344 0 16 0Z`,
    width: 48,
    height: 32,
    viewBox: '0 0 48 32'
  }],
    
  // Cloud & Software Symbols
  ['cloud-server', {
    id: 'cloud-server',
    name: 'Server / VM',
    domains: ['cloud'],
    pathData: `M2 12.2148C2 9.45281 4.23858 7.21484 7 7.21484H41C43.7614 7.21484 46 9.45281 46 12.2148V35.7852C46 38.5472 43.7614 40.7852 41 40.7852H7C4.23858 40.7852 2 38.5472 2 35.7852V12.2148ZM10 16.2148H14V20.2148H10V16.2148ZM10 26.2148H38V30.2148H10V26.2148Z`,
    width: 48,
    height: 48,
    viewBox: '0 0 48 48'
  }],
  ['cloud-db', {
    id: 'cloud-db',
    name: 'Database',
    domains: ['cloud', 'uml'],
    pathData: `M24 4C12.9543 4 4 7.58172 4 12V36C4 40.4183 12.9543 44 24 44C35.0457 44 44 40.4183 44 36V12C44 7.58172 35.0457 4 24 4ZM4 20C4 24.4183 12.9543 28 24 28C35.0457 28 44 24.4183 44 20M4 28C4 32.4183 12.9543 36 24 36C35.0457 36 44 32.4183 44 28`,
    width: 48,
    height: 48,
    viewBox: '0 0 48 48'
  }],
  ['uml-actor', {
    id: 'uml-actor',
    name: 'User / Actor',
    domains: ['uml', 'cloud'],
    pathData: `M24 12a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM16 28h16m-8 0V22m0 12l-6 8m6-8l6 8`,
    width: 48,
    height: 48,
    viewBox: '0 0 48 48'
  }],
  ['uml-use-case', {
    id: 'uml-use-case',
    name: 'Use Case',
    domains: ['uml'],
    pathData: `M48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24Z`,
    width: 48,
    height: 48,
    viewBox: '0 0 48 48'
  }],
  ['cloud-firewall', {
    id: 'cloud-firewall',
    name: 'Firewall',
    domains: ['cloud'],
    pathData: `M4 12V36H44V12H4ZM12 18H18V24H12V18ZM22 18H26V30H22V18ZM30 18H36V24H30V18Z`,
    width: 48,
    height: 48,
    viewBox: '0 0 48 48'
  }],
  ['cloud-lb', {
    id: 'cloud-lb',
    name: 'Load Balancer',
    domains: ['cloud'],
    pathData: `M24 4L10 18H38L24 4ZM10 30H38V44H10V30ZM4 24H44`,
    width: 48,
    height: 48,
    viewBox: '0 0 48 48'
  }],

  // Communication
  ['comm-email', {
    id: 'comm-email',
    name: 'Email / Mail',
    domains: ['general'],
    pathData: `M4 8H44V36H4V8ZM4 8L24 22L44 8`,
    width: 48,
    height: 44,
    viewBox: '0 0 48 44'
  }],
  ['comm-phone', {
    id: 'comm-phone',
    name: 'Phone / Call',
    domains: ['general'],
    pathData: `M15.5 2.8C16.9 3.2 18 4.5 18 6V12C18 13.1 17.1 14 16 14H15C13.9 14 13 13.1 13 12V8C13 6.9 12.1 6 11 6H8C6.9 6 6 6.9 6 8V16C6 17.1 6.9 18 8 18H12C13.1 18 14 18.9 14 20V26C14 27.1 13.1 28 12 28H8C6.9 28 6 27.1 6 26V25M32.5 45.2C31.1 44.8 30 43.5 30 42V36C30 34.9 30.9 34 32 34H33C34.1 34 35 34.9 35 36V40C35 41.1 35.9 42 37 42H40C41.1 42 42 41.1 42 40V32C42 30.9 41.1 30 40 30H36C34.9 30 34 29.1 34 28V22C34 20.9 34.9 20 36 20H40C41.1 20 42 20.9 42 22V23M18 14L30 34`,
    width: 48,
    height: 48,
    viewBox: '0 0 48 48'
  }],
  
  // Science
  ['science-atom', {
    id: 'science-atom',
    name: 'Atom',
    domains: ['general'],
    pathData: `M24 28a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM39.6 19c-3-8.8-10.3-15-19.6-15-5.6 0-10.6 2.3-14.3 6M8.4 29c3 8.8 10.3 15 19.6 15 5.6 0 10.6-2.3 14.3-6M19 8.4C10.2 11.4 4 18.7 4 28c0 5.6 2.3 10.6 6 14.3M29 39.6c8.8-3 15-10.3 15-19.6 0-5.6-2.3-10.6-6-14.3`,
    width: 48,
    height: 48,
    viewBox: '0 0 48 48'
  }],
  ['science-beaker', {
    id: 'science-beaker',
    name: 'Beaker',
    domains: ['general'],
    pathData: `M8 4H40V10H8V4ZM12 10L16 44H32L36 10H12ZM20 18H28M20 26H28M20 34H28`,
    width: 48,
    height: 48,
    viewBox: '0 0 48 48'
  }],

  // General
  ['general-folder', {
    id: 'general-folder',
    name: 'Folder',
    domains: ['general'],
    pathData: `M4 8H20L24 12H44V40H4V8Z`,
    width: 48,
    height: 48,
    viewBox: '0 0 48 48'
  }],
  ['general-gear', {
    id: 'general-gear',
    name: 'Settings / Gear',
    domains: ['general'],
    pathData: `M24 29a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM39.5 21l3.5-2-2.9-5-4.3 1.2c-1.3-1.6-3-2.9-4.8-3.7L30 6h-12l-1 5.5c-1.8.8-3.5 2.1-4.8-3.7L7.9 14l-2.9 5 3.5 2c-.1.7-.1 1.3-.1 2s0 1.3.1 2l-3.5 2 2.9 5 4.3-1.2c1.3 1.6 3 2.9 4.8 3.7L18 42h12l1-5.5c1.8-.8 3.5-2.1 4.8-3.7l4.3 1.2 2.9-5-3.5-2c.1-.7.1-1.3.1-2s0-1.3-.1-2z`,
    width: 48,
    height: 48,
    viewBox: '0 0 48 48'
  }],
]);