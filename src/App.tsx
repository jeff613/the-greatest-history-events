import { useMemo, useRef, useState } from 'react';
import { About } from './components/About';
import { EventPanel } from './components/EventPanel';
import { MapView } from './components/MapView';
import { TimelineStrip } from './components/TimelineStrip';
import { ENTRIES, ENTRIES_BY_ID, PLACED, hasPlace } from './data';
import type { Placed } from './data/schema';
import { pinnedEntries, sliceAt, windowHalfWidth } from './lib/slice';
import { useLocale } from './state/LocaleContext';
import { useTimeState } from './state/useTimeState';

export default function App() {
  const { language, setLanguage, text } = useLocale();
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
          <div className="brand"><span className="eyebrow">{text('AN INTERACTIVE ATLAS · 2000 BC - AD 2000', '互动历史地图集 · 公元前2000年 - 公元2000年')}</span><h1>{text('The Greatest History', '世界历史长卷')}</h1></div>
          <span className="header-focus">{text('History across the world', '纵览世界历史')} <span>{text('Explore regions. Compare eras.', '探索各地，对照时代。')}</span></span>
          <div className="header-actions">
            <div className="language-toggle" role="group" aria-label={text('Language', '语言')}>
              <button lang="en" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button>
              <button lang="zh-CN" aria-pressed={language === 'zh'} onClick={() => setLanguage('zh')}>中文</button>
            </div>
            <button onClick={() => setAboutOpen(true)}>{text('About', '关于')}</button>
          </div>
        </header>
        <main className='map-area'>
          <MapView
            playing={t.playing}
            onTogglePlay={t.togglePlaying}
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
          visibleKinds={t.visibleKinds}
          onToggleKind={t.toggleKind}
          onToggleRegion={t.toggleRegion}
          selectedId={t.selectedId}
          onSelect={t.select}
          hoveredId={t.hoveredId}
          onHover={t.hover}
          onYear={t.setYear}
          onView={t.setView}
        />
      </div>
      {aboutOpen && <About onClose={() => setAboutOpen(false)} />}
    </>
  );
}
