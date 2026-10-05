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

/** Era band colors on the timeline strip: earth pigments, each dark enough to carry light lettering. */
export const REGION_COLORS: Record<Region, string> = {
  europe: '#8f3f24',
  mena: '#7d5a10',
  'sub-saharan-africa': '#6b4a2a',
  'central-asia': '#5d6b2e',
  'south-asia': '#2f6b4f',
  'east-asia': '#2f5577',
  'southeast-asia-oceania': '#4a437a',
  americas: '#7a2f45',
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
  politics: '#a8381a',
  religion: '#6e3478',
  science: '#2a6a94',
  culture: '#c08a12',
  trade: '#2f7a55',
};

/** The ink every line and label is drawn in; `--text` in styles.css. */
export const INK = '#24170a';

export const MAP_COLORS = {
  ocean: '#a9b79a',
  land: '#ead6a2',
  river: '#6d8777',
  border: INK,
  label: INK,
  labelHalo: 'rgba(236, 219, 172, 0.85)',
  /** The wash and outline of a selected territory. */
  territory: '#a8381a',
};
