import { REGIONS, type Bar, type Entry, type Moment, type Placed, type Region } from '../data/schema';
import { yearDiff } from './years';

export const MIN_HALF_WINDOW = 10;
export const MAX_HALF_WINDOW = 100;
/** Above this half-width, only importance 2-3 entries get pins on the map. */
export const ALL_PINS_MAX_HALF_WINDOW = 50;

export function windowHalfWidth(zoom: number): number {
  return Math.max(MIN_HALF_WINDOW, Math.round(MAX_HALF_WINDOW / zoom));
}

/** Years between `year` and the entry; 0 while the year is inside its span. */
export function distanceFromYear(entry: Pick<Entry, 'start' | 'end'>, year: number): number {
  const end = entry.end ?? entry.start;
  if (year < entry.start) return yearDiff(year, entry.start);
  if (year > end) return yearDiff(end, year);
  return 0;
}

/** Map pins: moments within the window, and placed periods while the year is inside them. */
export function pinnedEntries(placed: Placed[], year: number, halfWidth: number): Placed[] {
  const minImportance = halfWidth > ALL_PINS_MAX_HALF_WINDOW ? 2 : 1;
  return placed.filter((e) => {
    const reach = e.kind === 'moment' ? halfWidth : 0;
    return e.importance >= minImportance && distanceFromYear(e, year) <= reach;
  });
}

export interface SliceGroup {
  region: Region;
  /** States, then periods, whose span contains the year; each oldest first. */
  inProgress: Bar[];
  /** Moments within the window: most important first, then nearest. */
  moments: Moment[];
}

export interface Slice {
  groups: SliceGroup[];
  /** Moments in the window that belong to regions not being shown. */
  elsewhere: number;
}

/** What the timeline shows under the playhead, region by region, for the regions being shown. */
export function sliceAt(entries: Entry[], year: number, halfWidth: number, regions: Region[]): Slice {
  const nearby = entries.filter((e): e is Moment => e.kind === 'moment' && distanceFromYear(e, year) <= halfWidth);
  const current = entries.filter((e): e is Bar => e.kind !== 'moment' && distanceFromYear(e, year) === 0);
  const groups = REGIONS.filter((region) => regions.includes(region)).flatMap((region): SliceGroup[] => {
    const inProgress = current
      .filter((e) => e.region === region)
      .sort((a, b) => Number(a.kind === 'period') - Number(b.kind === 'period') || a.start - b.start || a.id.localeCompare(b.id));
    const moments = nearby
      .filter((e) => e.region === region)
      .sort(
        (a, b) =>
          b.importance - a.importance ||
          distanceFromYear(a, year) - distanceFromYear(b, year) ||
          a.id.localeCompare(b.id),
      );
    return inProgress.length || moments.length ? [{ region, inProgress, moments }] : [];
  });
  return { groups, elsewhere: nearby.filter((e) => !regions.includes(e.region)).length };
}
