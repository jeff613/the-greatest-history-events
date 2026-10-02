import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { ERAS } from '../data';
import { packEras } from '../lib/packEras';
import { FULL_VIEW, panBy, pxToYear, ticks, yearToPx, zoomAt, type View } from '../lib/timeScale';
import { formatSpan, formatYear } from '../lib/years';
import { useLatest } from '../state/useLatest';
import { REGION_COLORS, REGION_SHORT_LABELS } from '../theme';

const GUTTER = 72;
const AXIS_H = 24;
const LANE_GAP = 4;
const ZOOM_STEP = 1.5;

interface Props {
  year: number;
  view: View;
  playing: boolean;
  onYear(year: number): void;
  onView(view: View): void;
  onTogglePlay(): void;
}

export function TimelineStrip({ year, view, playing, onYear, onView, onTogglePlay }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const [size, setSize] = useState({ width: 800, height: 200 });
  const lanes = useMemo(() => packEras(ERAS), []);

  useEffect(() => {
    const el = canvasRef.current!;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const trackW = Math.max(100, size.width - GUTTER);
  const totalRows = lanes.reduce((n, lane) => n + lane.rows.length, 0);
  const rowH = Math.max(8, Math.min(16, (size.height - AXIS_H - LANE_GAP * lanes.length) / Math.max(1, totalRows)));
  const x = (y: number) => GUTTER + yearToPx(y, view, trackW);
  const laneTops = lanes.reduce<number[]>(
    (tops, _lane, i) => [...tops, i === 0 ? AXIS_H : tops[i - 1] + lanes[i - 1].rows.length * rowH + LANE_GAP],
    [],
  );

  // Wheel: vertical zooms around the cursor, horizontal pans. Needs a non-passive listener.
  const latest = useLatest({ view, trackW, onView });
  useEffect(() => {
    const svg = svgRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { view: v, trackW: w, onView: set } = latest.current;
      const px = e.clientX - svg.getBoundingClientRect().left - GUTTER;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) set(panBy(v, -e.deltaX, w));
      else set(zoomAt(v, Math.exp(-e.deltaY * 0.002), px, w));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [latest]);

  const yearAt = (clientX: number) =>
    pxToYear(clientX - svgRef.current!.getBoundingClientRect().left - GUTTER, view, trackW);
  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest('[data-era]')) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onYear(yearAt(e.clientX));
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (dragging.current) onYear(yearAt(e.clientX));
  };
  const endDrag = () => {
    dragging.current = false;
  };
  const zoomAroundPlayhead = (factor: number) => onView(zoomAt(view, factor, yearToPx(year, view, trackW), trackW));

  const playheadX = x(year);
  const playheadVisible = playheadX >= GUTTER && playheadX <= size.width;

  return (
    <section className="strip" aria-label="Timeline">
      <div className="strip-controls">
        <button onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <span className="strip-year" data-testid="strip-year">
          {formatYear(year)}
        </span>
        <span className="strip-spacer" />
        <button onClick={() => zoomAroundPlayhead(ZOOM_STEP)} aria-label="Zoom in">
          +
        </button>
        <button onClick={() => zoomAroundPlayhead(1 / ZOOM_STEP)} aria-label="Zoom out">
          -
        </button>
        <button onClick={() => onView(FULL_VIEW)}>All years</button>
      </div>
      <div className="strip-canvas" ref={canvasRef}>
        <svg
          ref={svgRef}
          width={size.width}
          height={size.height}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <rect data-testid="timeline-axis" className="axis-bg" x={GUTTER} y={0} width={trackW} height={AXIS_H} />
          {ticks(view, trackW).map((t) => (
            <g key={t}>
              <line className="tick-line" x1={x(t)} x2={x(t)} y1={AXIS_H - 6} y2={size.height} />
              <text className="tick-label" x={x(t) + 3} y={AXIS_H - 9}>
                {formatYear(t)}
              </text>
            </g>
          ))}
          {lanes.map((lane, laneIndex) => {
            const top = laneTops[laneIndex];
            return (
              <g key={lane.region}>
                <text className="lane-label" x={6} y={top + Math.min(rowH, 12) - 2}>
                  {REGION_SHORT_LABELS[lane.region]}
                </text>
                {lane.rows.map((row, rowIndex) =>
                  row.map((era) => {
                    const x0 = Math.max(GUTTER, x(era.start));
                    const x1 = Math.min(size.width, x(era.end));
                    if (x1 <= x0) return null;
                    const y = top + rowIndex * rowH;
                    const showLabel = rowH >= 11 && x1 - x0 > era.name.length * 6 + 8;
                    return (
                      <g key={era.id} data-era={era.id} className="era" onClick={() => onYear(era.start)}>
                        <title>{`${era.name} (${formatSpan(era.start, era.end)})`}</title>
                        <rect x={x0} y={y + 1} width={x1 - x0} height={rowH - 2} rx={2} fill={REGION_COLORS[lane.region]} />
                        {showLabel && (
                          <text className="era-label" x={x0 + 4} y={y + rowH - 3.5}>
                            {era.name}
                          </text>
                        )}
                      </g>
                    );
                  }),
                )}
              </g>
            );
          })}
          {playheadVisible && (
            <g className="playhead" pointerEvents="none">
              <line x1={playheadX} x2={playheadX} y1={0} y2={size.height} />
              <circle cx={playheadX} cy={AXIS_H / 2} r={6} />
            </g>
          )}
        </svg>
      </div>
    </section>
  );
}
