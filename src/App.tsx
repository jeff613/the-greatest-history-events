import { useMemo, useRef, useState } from 'react';
import { About } from './components/About';
import { EventPanel } from './components/EventPanel';
import { MapView } from './components/MapView';
import { TimelineStrip } from './components/TimelineStrip';
import { ENTRIES, ENTRIES_BY_ID, PLACED, hasPlace } from './data';
import type { Placed } from './data/schema';
import { pinnedEntries, sliceAt, windowHalfWidth } from './lib/slice';
import { useTimeState } from './state/useTimeState';

export default function App() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const t = useTimeState();
  const halfWidth = windowHalfWidth(t.view.zoom);
  const slice = useMemo(
    () => sliceAt(ENTRIES, t.year, halfWidth, t.visibleRegions),
    [t.year, halfWidth, t.visibleRegions],
  );
  const selected = t.selectedId ? (ENTRIES_BY_ID.get(t.selectedId) ?? null) : null;
  const selectedPlaced = selected && hasPlace(selected) ? selected : null;
  // Kept referentially stable while the pinned set is unchanged, so playback does not make
  // MapLibre re-parse the pins source on every frame.
  const pinsRef = useRef<Placed[]>([]);
  const pins = useMemo(() => {
    const base = pinnedEntries(PLACED, t.year, halfWidth);
    // The selected entry keeps its pin even when it is outside the window or below the pin threshold.
    const next = selectedPlaced && !base.includes(selectedPlaced)
      ? [...base, selectedPlaced]
      : base;
    const prev = pinsRef.current;
    const same = next.length === prev.length && next.every((e, i) => e.id === prev[i].id);
    if (!same) pinsRef.current = next;
    return pinsRef.current;
  }, [t.year, halfWidth, selectedPlaced]);

  return (
    <>
      <div className='app' inert={aboutOpen}>
        <header className='app-header'>
          <div className="brand"><span className="eyebrow">AN INTERACTIVE ATLAS · 2000 BC - AD 2000</span><h1>The Greatest History</h1></div>
          <span className="header-focus">History across the world <span>Explore regions. Compare eras.</span></span>
          <button onClick={() => setAboutOpen(true)}>About</button>
        </header>
        <main className='map-area'>
          <MapView
            year={t.year}
            selectedBar={selected && selected.kind !== 'moment' ? selected : null}
            selectedTerritory={t.selectedTerritory}
            onSelectTerritory={t.selectTerritory}
            pins={pins}
            selectedPlaced={selectedPlaced}
            hoveredId={t.hoveredId}
            onHover={t.hover}
            onSelect={t.select}
          />
        </main>
        <div className='panel-area'>
          <EventPanel
            year={t.year}
            halfWidth={halfWidth}
            slice={slice}
            selected={selected}
            hoveredId={t.hoveredId}
            onHover={t.hover}
            onSelect={t.select}
            onShowAllRegions={t.showAllRegions}
          />
        </div>
        <TimelineStrip
          year={t.year}
          view={t.view}
          visibleRegions={t.visibleRegions}
          onToggleRegion={t.toggleRegion}
          playing={t.playing}
          selectedId={t.selectedId}
          onSelect={t.select}
          hoveredId={t.hoveredId}
          onHover={t.hover}
          onYear={t.setYear}
          onView={t.setView}
          onTogglePlay={t.togglePlaying}
        />
      </div>
      {aboutOpen && <About onClose={() => setAboutOpen(false)} />}
    </>
  );
}
