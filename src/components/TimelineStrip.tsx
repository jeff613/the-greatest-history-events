import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { ERAS } from '../data';
import { packEras } from '../lib/packEras';
import { FULL_VIEW, panBy, pxToYear, ticks, yearToPx, zoomAt, type View } from '../lib/timeScale';
import { formatSpan, formatYear } from '../lib/years';
import { useLatest } from '../state/useLatest';
import { REGION_COLORS, REGION_SHORT_LABELS } from '../theme';

const GUTTER = 72;
const AXIS_H = 24;
const LANE_GAP = 4;
const ROW_H = 10;
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
  const stripRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [width, setWidth] = useState(0);
  const lanes = useMemo(() => packEras(ERAS), []);

  // Track width comes from the lanes box (which excludes its scrollbar), measured before first paint.
  useLayoutEffect(() => {
    const el = lanesRef.current!;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The strip sizes to its content; publish its height so the mobile sheet can sit just above it.
  useLayoutEffect(() => {
    const el = stripRef.current!;
    const publish = () =>
      document.documentElement.style.setProperty('--strip-h', `${el.getBoundingClientRect().height}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--strip-h');
    };
  }, []);

  const trackW = Math.max(100, width - GUTTER);
  const x = (y: number) => GUTTER + yearToPx(y, view, trackW);
  const laneTops = lanes.reduce<number[]>(
    (tops, _lane, i) => [...tops, i === 0 ? LANE_GAP : tops[i - 1] + lanes[i - 1].rows.length * ROW_H + LANE_GAP],
    [],
  );
  const lanesH = laneTops[lanes.length - 1] + lanes[lanes.length - 1].rows.length * ROW_H + LANE_GAP;
  const tickYears = ticks(view, trackW);

  // Wheel: vertical zooms around the cursor, horizontal pans. Over the lane labels, vertical
  // wheel scrolls the lanes instead. Needs a non-passive listener.
  const latest = useLatest({ view, trackW, onView });
  useEffect(() => {
    const canvas = canvasRef.current!;
    const onWheel = (e: WheelEvent) => {
      const { view: v, trackW: w, onView: set } = latest.current;
      const px = e.clientX - canvas.getBoundingClientRect().left - GUTTER;
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!horizontal && px < 0) return;
      e.preventDefault();
      if (horizontal) set(panBy(v, -e.deltaX, w));
      else set(zoomAt(v, Math.exp(-e.deltaY * 0.002), px, w));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [latest]);

  const yearAt = (clientX: number) =>
    pxToYear(clientX - canvasRef.current!.getBoundingClientRect().left - GUTTER, view, trackW);
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('[data-era]')) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onYear(yearAt(e.clientX));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) onYear(yearAt(e.clientX));
  };
  const endDrag = () => {
    dragging.current = false;
  };
  const zoomAroundPlayhead = (factor: number) => onView(zoomAt(view, factor, yearToPx(year, view, trackW), trackW));

  const playheadX = x(year);
  const playheadVisible = width > 0 && playheadX >= GUTTER && playheadX <= width;

  return (
    <section className="strip" aria-label="Timeline" ref={stripRef}>
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
      <div
        className="strip-canvas"
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <svg className="strip-axis" width={width} height={AXIS_H}>
          <rect data-testid="timeline-axis" className="axis-bg" x={GUTTER} y={0} width={trackW} height={AXIS_H} />
          {tickYears.map((t) => (
            <g key={t}>
              <line className="tick-line" x1={x(t)} x2={x(t)} y1={AXIS_H - 6} y2={AXIS_H} />
              <text className="tick-label" x={x(t) + 3} y={AXIS_H - 9}>
                {formatYear(t)}
              </text>
            </g>
          ))}
        </svg>
        <div className="strip-lanes" ref={lanesRef}>
          <svg width={width} height={lanesH}>
            {tickYears.map((t) => (
              <line key={t} className="tick-line" x1={x(t)} x2={x(t)} y1={0} y2={lanesH} />
            ))}
            {lanes.map((lane, laneIndex) => {
              const top = laneTops[laneIndex];
              return (
                <g key={lane.region}>
                  <text className="lane-label" x={6} y={top + ROW_H - 2}>
                    {REGION_SHORT_LABELS[lane.region]}
                  </text>
                  {lane.rows.map((row, rowIndex) =>
                    row.map((era) => {
                      const x0 = Math.max(GUTTER, x(era.start));
                      const x1 = Math.min(width, x(era.end));
                      if (x1 <= x0) return null;
                      const y = top + rowIndex * ROW_H;
                      const showLabel = x1 - x0 > era.name.length * 5 + 8;
                      return (
                        <g key={era.id} data-era={era.id} className="era" onClick={() => onYear(era.start)}>
                          <title>{`${era.name} (${formatSpan(era.start, era.end)})`}</title>
                          <rect
                            x={x0}
                            y={y + 0.5}
                            width={x1 - x0}
                            height={ROW_H - 1}
                            rx={2}
                            fill={REGION_COLORS[lane.region]}
                          />
                          {showLabel && (
                            <text className="era-label" x={x0 + 4} y={y + ROW_H - 2}>
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
          </svg>
        </div>
        {playheadVisible && (
          <div className="playhead" style={{ left: playheadX }}>
            <span className="playhead-knob" style={{ top: AXIS_H / 2 }} />
          </div>
        )}
      </div>
    </section>
  );
}
