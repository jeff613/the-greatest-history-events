import { useEffect, useRef } from 'react';

export function About({ onClose }: { onClose(): void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    // Without preventScroll, a dialog taller than the screen opens scrolled down to the Close button.
    closeRef.current?.focus({ preventScroll: true });
    return () => previous?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="about-backdrop" onClick={onClose}>
      <div
        className="about"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="about-title">About The Greatest History</h2>
        <p>
          A curated focus on Europe and Asia, with major turning points elsewhere, from 2000 BC to AD 2000 on one map, so you can see what was happening in
          different parts of the world at the same time. The timeline shows three things together for each region: states as solid bars, periods such as wars, movements and influential lives as dashed bars, and single moments as diamonds above them. Select any of them to read what it was, why it mattered, what it was part of and what happened within it. Approximate or disputed dates are noted in those descriptions. Toggle the region buttons to choose which timelines to compare. Scroll vertically to browse their rows, drag the bands to move through time, use + and - to zoom, drag the top edge of the timeline to make it taller, or press play.
        </p>
        <p>
          Borders are approximate. Before the modern era most states had no fixed frontiers, and many overlapped.
          Treat the shaded areas as a rough picture of who held sway. The map shows the latest available snapshot at or before the selected year, not reconstructed boundaries for every year. Its snapshot date is shown on the map. Physical coastlines and rivers come from a modern base map.
        </p>
        <h3>Sources</h3>
        <ul>
          <li>
            Historical borders:{' '}
            <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noreferrer">
              historical-basemaps
            </a>{' '}
            by André Ourednik and contributors, GPL-3.0. Labels that were wrong for a snapshot's date have been corrected.
          </li>
          <li>
            Replacement shapes where those borders were out of date, and the snapshots for 1750 BC, 560 BC, 210 BC,
            AD 250 and AD 650:{' '}
            <a href="https://github.com/Seshat-Global-History-Databank/cliopatria" target="_blank" rel="noreferrer">
              Cliopatria
            </a>{' '}
            by the Seshat Global History Databank,{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>
            , cut to fit the surrounding borders.
          </li>
          <li>
            Land, lakes and rivers:{' '}
            <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">
              Natural Earth
            </a>{' '}
            (public domain).
          </li>
          <li>Map labels: Open Sans (Apache License 2.0). Map rendering: MapLibre GL JS.</li>
          <li>Event descriptions link to Wikipedia for further reading.</li>
        </ul>
        <button ref={closeRef} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
