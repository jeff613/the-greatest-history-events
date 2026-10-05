import folded from '../../data/folded.json';
import type { Bar, Entry, Moment, Placed } from './schema';

// Data is validated at build time (npm run validate), so the casts here are safe.
const modules = import.meta.glob<Entry[]>('../../data/timeline/*.json', {
  eager: true,
  import: 'default',
});

export function hasPlace(entry: Entry): entry is Placed {
  return entry.kind !== 'state' && entry.location !== undefined;
}

// Mixed regions include North Africa and Oceania; use locations to keep those selective.
export function isFocusEntry(entry: Entry): boolean {
  if (!hasPlace(entry)) return true;
  const { lat, lng } = entry.location;
  // Asia starts at the Levant (34 E), except that Anatolia reaches further west, north of 36 N.
  const inFocus = ['europe', 'central-asia', 'south-asia', 'east-asia'].includes(entry.region)
    || (entry.region === 'mena' && lat >= 12 && (lng >= 34 || (lng >= 26 && lat >= 36)))
    || (entry.region === 'southeast-asia-oceania' && lat >= -11 && lng <= 141);
  return inFocus || entry.importance === 3;
}

export const ENTRIES: Entry[] = Object.values(modules).flat().filter(isFocusEntry);
export const ENTRIES_BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));
export const MOMENTS = ENTRIES.filter((e): e is Moment => e.kind === 'moment');
export const BARS = ENTRIES.filter((e): e is Bar => e.kind !== 'moment');
export const PLACED = ENTRIES.filter(hasPlace);
/** Founding moments that were folded into their state: old id -> the state's id, so old links still open something. */
export const FOLDED: Record<string, string> = folded;
