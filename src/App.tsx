import { useMemo, useState } from "react";
import { About } from "./components/About";
import { MapView } from "./components/MapView";
import { TimelineStrip } from "./components/TimelineStrip";
import { EVENTS, EVENTS_BY_ID } from "./data";
import { EventPanel } from "./components/EventPanel";
import {
  eventsInWindow,
  groupByRegion,
  pinnedEvents,
  windowHalfWidth,
} from "./lib/selectEvents";
import { useTimeState } from "./state/useTimeState";

export default function App() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const t = useTimeState();
  const halfWidth = windowHalfWidth(t.view.zoom);
  const inWindow = useMemo(
    () => eventsInWindow(EVENTS, t.year, halfWidth),
    [t.year, halfWidth],
  );
  const groups = useMemo(
    () => groupByRegion(inWindow, t.year),
    [inWindow, t.year],
  );
  const selectedEvent = t.selectedEventId
    ? (EVENTS_BY_ID.get(t.selectedEventId) ?? null)
    : null;
  const pins = useMemo(() => {
    const base = pinnedEvents(inWindow, halfWidth);
    // The selected event keeps its pin even when it is outside the window or below the pin threshold.
    return selectedEvent && !base.includes(selectedEvent)
      ? [...base, selectedEvent]
      : base;
  }, [inWindow, halfWidth, selectedEvent]);

  return (
    <>
      <div className="app" inert={aboutOpen}>
        <header className="app-header">
          <h1>The Greatest History</h1>
          <button onClick={() => setAboutOpen(true)}>About</button>
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
        <div className="panel-area">
          <EventPanel
            year={t.year}
            halfWidth={halfWidth}
            groups={groups}
            selectedEvent={selectedEvent}
            hoveredEventId={t.hoveredEventId}
            onHover={t.hoverEvent}
            onSelect={t.selectEvent}
          />
        </div>
        <TimelineStrip
          year={t.year}
          view={t.view}
          playing={t.playing}
          onYear={t.setYear}
          onView={t.setView}
          onTogglePlay={t.togglePlaying}
        />
      </div>
      {aboutOpen && <About onClose={() => setAboutOpen(false)} />}
    </>
  );
}
