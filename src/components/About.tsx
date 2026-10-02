import { useEffect } from 'react';

export function About({ onClose }: { onClose(): void }) {
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
          The most influential events from 2000 BC to AD 2000 on one map, so you can see what was happening in
          different parts of the world at the same time. Drag the timeline, scroll to zoom, or press play.
        </p>
        <p>
          Borders are approximate. Before the modern era most states had no fixed frontiers, and many overlapped.
          Treat the shaded areas as a rough picture of who held sway, not a precise map.
        </p>
        <h3>Sources</h3>
        <ul>
          <li>
            Historical borders:{' '}
            <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noreferrer">
              historical-basemaps
            </a>{' '}
            by André Ourednik and contributors, GPL-3.0.
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
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
