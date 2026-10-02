import { useCallback, useEffect, useState } from 'react';
import { EVENTS_BY_ID } from '../data';
import { clampView, uToYear, visibleURange, yearToU, type View } from '../lib/timeScale';
import { clampYear } from '../lib/years';
import { advancePlayback, playbackStart } from './playback';
import { useLatest } from './useLatest';
import { parseUrlState, serializeUrlState } from './urlState';

// Safari throws SecurityError past 100 replaceState calls per 30 s, so writes are debounced.
const URL_WRITE_DELAY_MS = 250;

export interface TimeStore {
  year: number;
  view: View;
  selectedEventId: string | null;
  hoveredEventId: string | null;
  playing: boolean;
  setYear(year: number): void;
  setView(view: View): void;
  selectEvent(id: string | null): void;
  hoverEvent(id: string | null): void;
  togglePlaying(): void;
}

export function useTimeState(): TimeStore {
  const [initial] = useState(() => parseUrlState(window.location.search, (id) => EVENTS_BY_ID.get(id)));
  const [year, setYearRaw] = useState(initial.year);
  const [view, setViewRaw] = useState(initial.view);
  const [selectedEventId, selectEvent] = useState(initial.selectedEventId);
  const [hoveredEventId, hoverEvent] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const latest = useLatest({ year, view });

  // A user moving the playhead takes over from playback.
  const setYear = useCallback((y: number) => {
    setPlaying(false);
    setYearRaw(clampYear(y));
  }, []);
  const setView = useCallback((v: View) => setViewRaw(clampView(v)), []);
  const togglePlaying = useCallback(() => setPlaying((p) => !p), []);

  useEffect(() => {
    const query = serializeUrlState({ year, view, selectedEventId });
    const id = window.setTimeout(
      () => window.history.replaceState(null, '', `${window.location.pathname}${query}`),
      URL_WRITE_DELAY_MS,
    );
    return () => window.clearTimeout(id);
  }, [year, view, selectedEventId]);

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
    selectedEventId,
    hoveredEventId,
    playing,
    setYear,
    setView,
    selectEvent,
    hoverEvent,
    togglePlaying,
  };
}
