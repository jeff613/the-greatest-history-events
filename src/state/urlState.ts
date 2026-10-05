import { clampView, yearToU, type View } from '../lib/timeScale';
import { clampYear } from '../lib/years';

export const DEFAULT_YEAR = -500;

export interface UrlState {
  year: number;
  view: View;
  selectedId: string | null;
}

function numberParam(params: URLSearchParams, name: string): number | null {
  const raw = params.get(name);
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * `lookup` resolves an id from a link to the entry it should open. Links made before states
 * and periods could be selected carry `event` instead of `item`; both are read.
 */
export function parseUrlState(
  search: string,
  lookup: (id: string) => { id: string; start: number } | undefined,
): UrlState {
  const params = new URLSearchParams(search);
  const linked = params.get('item') ?? params.get('event');
  const entry = linked ? lookup(linked) : undefined;
  const yearParam = numberParam(params, 'year');
  const year = yearParam !== null ? clampYear(yearParam) : (entry?.start ?? DEFAULT_YEAR);
  const zoom = numberParam(params, 'zoom') ?? 1;
  return {
    year,
    view: clampView({ zoom, center: yearToU(year) }),
    selectedId: entry?.id ?? null,
  };
}

export function serializeUrlState(state: UrlState): string {
  const params = new URLSearchParams();
  params.set('year', String(state.year));
  if (state.view.zoom > 1) params.set('zoom', String(Math.round(state.view.zoom * 100) / 100));
  if (state.selectedId) params.set('item', state.selectedId);
  return `?${params.toString()}`;
}
