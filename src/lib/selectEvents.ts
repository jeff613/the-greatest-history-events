import { REGIONS, type HistoryEvent, type Region } from '../data/schema';
import { yearDiff } from './years';

export const MIN_HALF_WINDOW = 10;
export const MAX_HALF_WINDOW = 100;
/** Above this half-width, only importance 2-3 events get pins on the map. */
export const ALL_PINS_MAX_HALF_WINDOW = 50;

export function windowHalfWidth(zoom: number): number {
  return Math.max(MIN_HALF_WINDOW, Math.round(MAX_HALF_WINDOW / zoom));
}

export function distanceFromYear(event: HistoryEvent, year: number): number {
  const end = event.endYear ?? event.year;
  if (year < event.year) return yearDiff(year, event.year);
  if (year > end) return yearDiff(end, year);
  return 0;
}

export function eventsInWindow(events: HistoryEvent[], year: number, halfWidth: number): HistoryEvent[] {
  return events.filter((e) => distanceFromYear(e, year) <= halfWidth);
}

export interface RegionGroup {
  region: Region;
  events: HistoryEvent[];
}

export function groupByRegion(events: HistoryEvent[], year: number): RegionGroup[] {
  return REGIONS.flatMap((region) => {
    const inRegion = events
      .filter((e) => e.region === region)
      .sort(
        (a, b) =>
          b.importance - a.importance ||
          distanceFromYear(a, year) - distanceFromYear(b, year) ||
          a.id.localeCompare(b.id),
      );
    return inRegion.length > 0 ? [{ region, events: inRegion }] : [];
  });
}

export function pinnedEvents(events: HistoryEvent[], halfWidth: number): HistoryEvent[] {
  if (halfWidth <= ALL_PINS_MAX_HALF_WINDOW) return events;
  return events.filter((e) => e.importance >= 2);
}
