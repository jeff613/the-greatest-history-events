import { useCallback, useEffect, useState } from 'react';
import { REGIONS, type Entry, type Region } from '../data/schema';
import { ENTRIES_BY_ID, FOLDED } from '../data';
import { clampView, uToYear, visibleURange, yearToU, type View } from '../lib/timeScale';
import { clampYear } from '../lib/years';
import { advancePlayback, playbackStart } from './playback';
import { useLatest } from './useLatest';
import { parseUrlState, serializeUrlState } from './urlState';

// Safari throws SecurityError past 100 replaceState calls per 30 s, so writes are debounced.
const URL_WRITE_DELAY_MS = 250;
const DEFAULT_REGIONS: Region[] = [...REGIONS];

export interface TerritorySelection {
  name: string;
  snapshotFile: string;
}

export interface TimeStore {
  year: number;
  view: View;
  visibleRegions: Region[];
  visibleKinds: Entry['kind'][];
  toggleKind(kind: Entry['kind']): void;
  /** The selected timeline entry: a moment, a period or a state. */
  selectedId: string | null;
  selectedTerritory: TerritorySelection | null;
  hoveredId: string | null;
  playing: boolean;
  setYear(year: number): void;
  setView(view: View): void;
  toggleRegion(region: Region): void;
  showAllRegions(): void;
  select(id: string | null): void;
  selectTerritory(territory: TerritorySelection | null): void;
  hover(id: string | null): void;
  togglePlaying(): void;
}

const withRegion = (regions: Region[], region: Region) => (regions.includes(region) ? regions : [...regions, region]);

export function useTimeState(): TimeStore {
  const [initial] = useState(() => parseUrlState(window.location.search, (id) => ENTRIES_BY_ID.get(FOLDED[id] ?? id)));
  const [year, setYearRaw] = useState(initial.year);
  const [visibleRegions, setVisibleRegions] = useState<Region[]>(() => {
    const linked = initial.selectedId ? ENTRIES_BY_ID.get(initial.selectedId) : undefined;
    return linked ? withRegion(DEFAULT_REGIONS, linked.region) : DEFAULT_REGIONS;
  });
  const [view, setViewRaw] = useState(initial.view);
  const [visibleKinds, setVisibleKinds] = useState<Entry['kind'][]>(['state', 'period', 'moment']);
  const [selectedTerritory, setSelectedTerritory] = useState<TerritorySelection | null>(null);
  const [selectedId, setSelectedId] = useState(initial.selectedId);
  const [hoveredId, hover] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const latest = useLatest({ year, view });

  // A user moving the playhead takes over from playback, and the pane goes back to following the playhead.
  const setYear = useCallback((y: number) => {
    setPlaying(false);
    setSelectedId(null);
    setSelectedTerritory(null);
    setYearRaw(clampYear(y));
  }, []);
  // Selecting an entry goes to it: the playhead moves to its start and its region's lane is shown.
  const select = useCallback((id: string | null) => {
    const entry = id === null ? undefined : ENTRIES_BY_ID.get(id);
    setSelectedId(entry?.id ?? null);
    if (!entry) return;
    setPlaying(false);
    setSelectedTerritory(null);
    setYearRaw(entry.start);
    setVisibleRegions((visible) => withRegion(visible, entry.region));
    setVisibleKinds((visible) => visible.includes(entry.kind) ? visible : [...visible, entry.kind]);
  }, []);
  const selectTerritory = useCallback((territory: TerritorySelection | null) => {
    setPlaying(false);
    setSelectedId(null);
    setSelectedTerritory(territory);
  }, []);
  const toggleRegion = useCallback((region: Region) => {
    setVisibleRegions((visible) => visible.includes(region)
      ? visible.filter((entry) => entry !== region) : [...visible, region]);
  }, []);
  const showAllRegions = useCallback(() => setVisibleRegions([...REGIONS]), []);
  const toggleKind = useCallback((kind: Entry['kind']) => {
    setVisibleKinds((visible) => visible.includes(kind)
      ? visible.filter((entry) => entry !== kind) : [...visible, kind]);
    hover(null);
  }, []);
  const setView = useCallback((v: View) => setViewRaw(clampView(v)), []);
  const togglePlaying = useCallback(() => {
    setSelectedId(null);
    setSelectedTerritory(null);
    setPlaying((p) => !p);
  }, []);

  useEffect(() => {
    const query = serializeUrlState({ year, view, selectedId });
    const id = window.setTimeout(
      () => window.history.replaceState(null, '', `${window.location.pathname}${query}`),
      URL_WRITE_DELAY_MS,
    );
    return () => window.clearTimeout(id);
  }, [year, view, selectedId]);

  useEffect(() => {
    if (!playing) return;
    let u = playbackStart(yearToU(latest.current.year));
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const step = advancePlayback(u, (now - last) / 1000, latest.current.view.zoom);
      last = now;
      u = step.u;
      setYearRaw(uToYear(u));
      const v = latest.current.view;
      const [u0, u1] = visibleURange(v);
      // Keep the playhead on screen: when it leaves, page so it sits 10% in from the left.
      if (u < u0 || u > u1) setViewRaw(clampView({ zoom: v.zoom, center: u + 0.4 / v.zoom }));
      if (step.done) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, latest]);

  return {
    year,
    view,
    visibleRegions,
    visibleKinds,
    toggleKind,
    selectedId,
    selectedTerritory,
    hoveredId,
    playing,
    setYear,
    setView,
    toggleRegion,
    showAllRegions,
    select,
    selectTerritory,
    hover,
    togglePlaying,
  };
}
