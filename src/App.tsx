import { useMemo } from 'react';
import { MapView } from './components/MapView';
import { TimelineStrip } from './components/TimelineStrip';
import { EVENTS, EVENTS_BY_ID } from './data';
import { eventsInWindow, pinnedEvents, windowHalfWidth } from './lib/selectEvents';
import { useTimeState } from './state/useTimeState';

export default function App() {
  const t = useTimeState();
  const halfWidth = windowHalfWidth(t.view.zoom);
  const inWindow = useMemo(() => eventsInWindow(EVENTS, t.year, halfWidth), [t.year, halfWidth]);
  const selectedEvent = t.selectedEventId ? (EVENTS_BY_ID.get(t.selectedEventId) ?? null) : null;
  const pins = useMemo(() => {
    const base = pinnedEvents(inWindow, halfWidth);
    // The selected event keeps its pin even when it is outside the window or below the pin threshold.
    return selectedEvent && !base.includes(selectedEvent) ? [...base, selectedEvent] : base;
  }, [inWindow, halfWidth, selectedEvent]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>The Greatest History</h1>
      </header>
      <main className="map-area">
        <MapView
          year={t.year}
          pins={pins}
          selectedEvent={selectedEvent}
          hoveredEventId={t.hoveredEventId}
          onHover={t.hoverEvent}
          onSelect={t.selectEvent}
        />
      </main>
      <aside className="panel-area" />
      <TimelineStrip
        year={t.year}
        view={t.view}
        playing={t.playing}
        onYear={t.setYear}
        onView={t.setView}
        onTogglePlay={t.togglePlaying}
      />
    </div>
  );
}
