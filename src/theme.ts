import type { Category, Region } from './data/schema';

export const REGION_LABELS: Record<Region, string> = {
  europe: 'Europe',
  mena: 'Middle East & North Africa',
  'sub-saharan-africa': 'Sub-Saharan Africa',
  'central-asia': 'Central Asia & Steppe',
  'south-asia': 'South Asia',
  'east-asia': 'East Asia',
  'southeast-asia-oceania': 'Southeast Asia & Oceania',
  americas: 'Americas',
};

export const REGION_SHORT_LABELS: Record<Region, string> = {
  europe: 'Europe',
  mena: 'Mid. East',
  'sub-saharan-africa': 'Africa',
  'central-asia': 'Steppe',
  'south-asia': 'S. Asia',
  'east-asia': 'E. Asia',
  'southeast-asia-oceania': 'SE Asia',
  americas: 'Americas',
};

/** Where each region is on the map, as [west, south, east, north], for showing an entry that has no place of its own. */
export const REGION_BOUNDS: Record<Region, [number, number, number, number]> = {
  europe: [-11, 35, 42, 62],
  mena: [-10, 12, 63, 42],
  'sub-saharan-africa': [-18, -35, 52, 18],
  'central-asia': [45, 32, 120, 56],
  'south-asia': [60, 5, 98, 37],
  'east-asia': [98, 20, 146, 50],
  'southeast-asia-oceania': [92, -12, 142, 24],
  americas: [-125, -55, -35, 60],
};

/** Era band colors on the timeline strip. */
export const REGION_COLORS: Record<Region, string> = {
  europe: '#8c4a44',
  mena: '#94703a',
  'sub-saharan-africa': '#7a6a33',
  'central-asia': '#5e6a3a',
  'south-asia': '#3f7354',
  'east-asia': '#3c6280',
  'southeast-asia-oceania': '#5b4f86',
  americas: '#80466f',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  politics: 'Politics, war & upheaval',
  religion: 'Religion & philosophy',
  science: 'Science & technology',
  culture: 'Culture & the arts',
  trade: 'Trade & exploration',
};

/** Event pin and dot colors. */
export const CATEGORY_COLORS: Record<Category, string> = {
  politics: '#e0645a',
  religion: '#b48ce0',
  science: '#4fb3d9',
  culture: '#e6b84f',
  trade: '#6cc28b',
};

export const MAP_COLORS = {
  ocean: '#0e1a26',
  land: '#2b3440',
  river: '#1d3346',
  border: '#0e1a26',
  label: '#f1e6cf',
  labelHalo: '#0e1a26',
};
