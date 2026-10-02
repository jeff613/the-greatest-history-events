import { clampView, yearToU, type View } from '../lib/timeScale';
import { clampYear } from '../lib/years';

export const DEFAULT_YEAR = -500;

export interface UrlState {
  year: number;
  view: View;
  selectedEventId: string | null;
}

function numberParam(params: URLSearchParams, name: string): number | null {
  const raw = params.get(name);
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseUrlState(
  search: string,
  lookupEvent: (id: string) => { year: number } | undefined,
): UrlState {
  const params = new URLSearchParams(search);
  const eventId = params.get('event');
  const event = eventId ? lookupEvent(eventId) : undefined;
  const yearParam = numberParam(params, 'year');
  const year = yearParam !== null ? clampYear(yearParam) : (event?.year ?? DEFAULT_YEAR);
  const zoom = numberParam(params, 'zoom') ?? 1;
  return {
    year,
    view: clampView({ zoom, center: yearToU(year) }),
    selectedEventId: event && eventId ? eventId : null,
  };
}

export function serializeUrlState(state: UrlState): string {
  const params = new URLSearchParams();
  params.set('year', String(state.year));
  if (state.view.zoom > 1) params.set('zoom', String(Math.round(state.view.zoom * 100) / 100));
  if (state.selectedEventId) params.set('event', state.selectedEventId);
  return `?${params.toString()}`;
}
