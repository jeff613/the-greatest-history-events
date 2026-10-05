import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { BARS, ENTRIES_BY_ID, MOMENTS } from '../data';
import type { Entry, Moment, Period, Region } from '../data/schema';
import { labelSpan, minImportance, placeLabels, type LabelSide, type Marker } from '../lib/momentLayout';
import { packEras } from '../lib/packEras';
import { FULL_VIEW, panBy, pxToYear, ticks, viewSpanning, yearToPx, yearToU, zoomAt, type View } from '../lib/timeScale';
import { formatSpan, formatYear, yearDiff } from '../lib/years';
import { CATEGORY_COLORS, REGION_COLORS, REGION_SHORT_LABELS } from '../theme';

const GUTTER = 96;
/** Room after the last year, so the playhead and the final tick label are not cut off at AD 2000. */
const PAD_RIGHT = 32;
const AXIS_H = 32;
const LANE_GAP = 10;
const ROW_H = 28;
/** Height of a lane's moments area: two rows of labels above the line of markers. */
const MOMENTS_H = 50;
const MARKER_Y = 38;
const LABEL_ROW_Y = { top: 11, above: 23 } as const;
/** Above the tick labels, so the knob never covers the label of the year it sits on. */
const KNOB_Y = 7;
const ZOOM_STEP = 1.5;
/** A press that moves less than this is a click, not a drag. */
const CLICK_SLOP_PX = 4;
const BAR_CHAR_PX = 7;
const MIN_BAR_LABEL_CHARS = 5;
/** How many characters of its name a bar this wide has room for. */
const barLabelChars = (widthPx: number) => Math.floor((widthPx - 12) / BAR_CHAR_PX);
const LABEL_CHAR_PX = 6.2;
/** Moments that share a year are drawn this far apart (twice the click radius), so each can be clicked. */
const MARKER_HIT_RADIUS = 8;
const SAME_YEAR_FAN_PX = MARKER_HIT_RADIUS * 2;
const MARKER_SIZE = { 1: 6, 2: 8, 3: 10 } as const;
const LANE_ORDER: Region[] = ['europe', 'mena', 'central-asia', 'south-asia', 'east-asia', 'southeast-asia-oceania', 'sub-saharan-africa', 'americas'];
const MIN_STRIP_PX = 200;
const HEIGHT_KEY = 'strip-height';

/** Scrub moves the playhead (axis row, playhead); pan moves the view (lanes) or, if it never moves, is a click. */
type Drag =
  | { kind: 'scrub'; pointerId: number }
  | { kind: 'pan'; pointerId: number; startX: number; startY: number; startView: View; entryId: string | null; moved: boolean };

interface LaneMarker extends Marker {
  entry: Moment | Period;
  side: LabelSide | undefined;
}

interface Props {
  year: number;
  selectedId: string | null;
  onSelect(id: string): void;
  hoveredId: string | null;
  onHover(id: string | null): void;
  view: View;
  visibleRegions: Region[];
  onToggleRegion(region: Region): void;
  playing: boolean;
  onYear(year: number): void;
  onView(view: View): void;
  onTogglePlay(): void;
}

export function TimelineStrip({ year, selectedId, onSelect, hoveredId, onHover, view, visibleRegions, onToggleRegion, playing, onYear, onView, onTogglePlay }: Props) {
  const stripRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const resize = useRef<{ pointerId: number; startY: number; startHeight: number } | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState<number | null>(() => Number(sessionStorage.getItem(HEIGHT_KEY)) || null);
  const allLanes = useMemo(() => packEras(BARS).sort((a, b) => LANE_ORDER.indexOf(a.region) - LANE_ORDER.indexOf(b.region)), []);

  const lanes = useMemo(() => allLanes.filter((lane) => visibleRegions.includes(lane.region)), [allLanes, visibleRegions]);

  useLayoutEffect(() => {
    if (lanesRef.current) lanesRef.current.scrollTop = 0;
  }, [visibleRegions]);

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

  const trackW = Math.max(100, width - GUTTER - PAD_RIGHT);
  const x = (y: number) => GUTTER + yearToPx(y, view, trackW);
  const laneTops = lanes.reduce<number[]>(
    (tops, _lane, i) => [...tops, i === 0 ? LANE_GAP : tops[i - 1] + MOMENTS_H + lanes[i - 1].rows.length * ROW_H + LANE_GAP],
    [],
  );
  const lanesH = lanes.length ? laneTops[lanes.length - 1] + MOMENTS_H + lanes[lanes.length - 1].rows.length * ROW_H + LANE_GAP : 0;
  const tickYears = ticks(view, trackW);

  // Markers and their labels depend on the view, not on the playhead, so they hold still while it moves.
  const laneMarkers = useMemo(() => {
    const px = (y: number) => yearToPx(y, view, trackW);
    const least = minImportance(yearDiff(pxToYear(0, view, trackW), pxToYear(trackW, view, trackW)));
    return lanes.map((lane): LaneMarker[] => {
      const moments = MOMENTS.filter((m) => m.region === lane.region && m.importance >= least)
        .sort((a, b) => a.start - b.start || b.importance - a.importance);
      const markers: Omit<LaneMarker, 'side'>[] = [];
      moments.forEach((m, i) => {
        let fan = 0;
        while (fan < i && moments[i - fan - 1].start === m.start) fan++;
        const center = px(m.start) + fan * SAME_YEAR_FAN_PX;
        if (center < 0 || center > trackW) return;
        markers.push({ id: m.id, entry: m, x: center, halfWidth: MARKER_SIZE[m.importance] * 0.75, label: m.title, importance: m.importance });
      });
      // A period whose bar is too narrow to carry any of its name is named here instead.
      for (const bar of lane.rows.flat()) {
        if (bar.kind !== 'period') continue;
        const importance = bar.importance ?? 2;
        const x0 = Math.max(0, px(bar.start));
        const x1 = Math.min(trackW, px(bar.end));
        if (importance < least || x1 <= x0 || barLabelChars(x1 - x0) >= MIN_BAR_LABEL_CHARS) continue;
        const half = Math.max(3, (x1 - x0) / 2);
        markers.push({ id: bar.id, entry: bar, x: (x0 + x1) / 2, halfWidth: half, label: bar.title, importance });
      }
      const sides = placeLabels(markers, trackW, LABEL_CHAR_PX);
      // Drawn least important first, so the markers that matter most end up on top.
      return markers.map((m) => ({ ...m, side: sides.get(m.id) })).sort((a, b) => a.importance - b.importance);
    });
  }, [lanes, view, trackW]);

  const yearAt = (clientX: number) => {
    const px = clientX - canvasRef.current!.getBoundingClientRect().left - GUTTER;
    return pxToYear(Math.min(trackW, Math.max(0, px)), view, trackW);
  };
  const select = (entry: Entry) => {
    onSelect(entry.id);
    const px = yearToPx(entry.start, view, trackW);
    if (px < 0 || px > trackW) onView({ zoom: view.zoom, center: yearToU(entry.start) });
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const target = e.target as Element;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (target.closest('.playhead')) {
      drag.current = { kind: 'scrub', pointerId: e.pointerId };
    } else if (target.closest('.strip-axis')) {
      drag.current = { kind: 'scrub', pointerId: e.pointerId };
      onYear(yearAt(e.clientX));
    } else {
      drag.current = {
        kind: 'pan',
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startView: view,
        entryId: target.closest('[data-entry]')?.getAttribute('data-entry') ?? null,
        moved: false,
      };
    }
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (d.kind === 'scrub') {
      onYear(yearAt(e.clientX));
      return;
    }
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < CLICK_SLOP_PX) return;
    d.moved = true;
    onView(panBy(d.startView, e.clientX - d.startX, trackW));
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    if (d.kind !== 'pan' || d.moved) return;
    const entry = d.entryId ? ENTRIES_BY_ID.get(d.entryId) : undefined;
    if (entry) select(entry);
    else if (e.clientX - canvasRef.current!.getBoundingClientRect().left >= GUTTER) onYear(yearAt(e.clientX));
  };
  const cancelDrag = () => {
    drag.current = null;
  };
  const zoomAroundPlayhead = (factor: number) => onView(zoomAt(view, factor, yearToPx(year, view, trackW), trackW));

  // Dragging the top edge trades map for timeline; the height lasts for the session.
  const onResizeDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    resize.current = { pointerId: e.pointerId, startY: e.clientY, startHeight: stripRef.current!.getBoundingClientRect().height };
  };
  const onResizeMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = resize.current;
    if (!r || r.pointerId !== e.pointerId) return;
    const next = Math.round(Math.min(window.innerHeight * 0.8, Math.max(MIN_STRIP_PX, r.startHeight + r.startY - e.clientY)));
    setHeight(next);
    sessionStorage.setItem(HEIGHT_KEY, String(next));
  };
  const onResizeEnd = () => {
    resize.current = null;
  };

  const entryProps = (entry: Entry) => ({
    'data-entry': entry.id,
    role: 'button',
    tabIndex: 0,
    'aria-label': entry.title,
    'aria-pressed': selectedId === entry.id,
    onPointerEnter: () => onHover(entry.id),
    onPointerLeave: () => onHover(null),
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(entry);
      }
    },
  });
  const stateClass = (entry: Entry) => `${selectedId === entry.id ? ' is-selected' : ''}${hoveredId === entry.id ? ' is-hovered' : ''}`;

  const playheadX = x(year);
  const playheadVisible = width > 0 && playheadX >= GUTTER && playheadX <= GUTTER + trackW;

  return (
    <section className="strip" aria-label="Timeline" ref={stripRef} style={height ? { height, maxHeight: '80vh' } : undefined}>
      <div className="strip-resize" role="separator" aria-orientation="horizontal" aria-label="Resize timeline"
        onPointerDown={onResizeDown} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} onPointerCancel={onResizeEnd} />
      <div className="strip-controls">
        <button onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <span className="strip-year" data-testid="strip-year">
          {formatYear(year)}
        </span>
        <span className="strip-hint">Scroll for regions · Drag through time · + / - to zoom</span>
        <span className="strip-spacer" />
        <button onClick={() => zoomAroundPlayhead(ZOOM_STEP)} aria-label="Zoom in">
          +
        </button>
        <button onClick={() => zoomAroundPlayhead(1 / ZOOM_STEP)} aria-label="Zoom out">
          -
        </button>
        <button onClick={() => onView(viewSpanning(year, 500))}>500 years</button>
        <button onClick={() => onView(FULL_VIEW)}>All years</button>
      </div>
      <nav className="timeline-regions" aria-label="Timeline regions">
        <span className="timeline-legend">Solid: states · Dashed: periods · ◆ moments</span>
        {allLanes.map((lane) => <button key={lane.region}
          aria-pressed={visibleRegions.includes(lane.region)}
          onClick={() => onToggleRegion(lane.region)}>
          {lane.region === 'east-asia' ? 'China & East Asia' : REGION_SHORT_LABELS[lane.region]}
        </button>)}
      </nav>
      <div
        className="strip-canvas"
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={cancelDrag}
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
          {!lanes.length && <p className="timeline-empty">Select a region above to show its timeline. Select several to compare.</p>}
          <svg width={width} height={lanesH}>
            {tickYears.map((t) => (
              <line key={t} className="tick-line" x1={x(t)} x2={x(t)} y1={0} y2={lanesH} />
            ))}
            {lanes.map((lane, laneIndex) => {
              const top = laneTops[laneIndex];
              const barsTop = top + MOMENTS_H;
              return (
                <g key={lane.region} data-region={lane.region}>
                  <text className="lane-label" x={6} y={barsTop + (ROW_H - 4) / 2 + 0.5}>
                    {REGION_SHORT_LABELS[lane.region]}
                  </text>
                  {lane.rows.map((row, rowIndex) =>
                    row.map((era) => {
                      const x0 = Math.max(GUTTER, x(era.start));
                      const x1 = Math.min(width, x(era.end));
                      if (x1 <= x0) return null;
                      const y = barsTop + rowIndex * ROW_H;
                      const labelChars = barLabelChars(x1 - x0);
                      const showLabel = labelChars >= MIN_BAR_LABEL_CHARS;
                      const label = era.title.length <= labelChars ? era.title : `${era.title.slice(0, labelChars - 1)}…`;
                      return (
                        <g key={era.id} className={`era${era.kind === 'period' ? ' era-period' : ''}${stateClass(era)}`} {...entryProps(era)}>
                          <title>{`${era.title} (${era.dateLabel ?? formatSpan(era.start, era.end)})`}</title>
                          <path className="era-hitbox" d={`M ${x0} ${y} h ${Math.min(width - x0, Math.max(10, x1 - x0))} v ${ROW_H - 1} h ${-Math.min(width - x0, Math.max(10, x1 - x0))} Z`} fill="transparent" />
                          <rect
                            x={x0}
                            y={y + 0.5}
                            width={Math.max(4, x1 - x0)}
                            height={ROW_H - 4}
                            rx={5}
                            fill={REGION_COLORS[lane.region]}
                          />
                          {showLabel && (
                            <text className="era-label" x={x0 + 4} y={y + 18}>
                              {label}
                            </text>
                          )}
                        </g>
                      );
                    }),
                  )}
                  {laneMarkers[laneIndex].map((m) => {
                    const cx = GUTTER + m.x;
                    const cy = top + MARKER_Y;
                    const entry = m.entry;
                    const fill = entry.category ? CATEGORY_COLORS[entry.category] : REGION_COLORS[lane.region];
                    const size = MARKER_SIZE[m.importance];
                    // A marker that lost out on a label still shows its name while it is hovered or selected.
                    const active = selectedId === m.id || hoveredId === m.id;
                    const side = m.side ?? (active ? 'top' : undefined);
                    const span = side && labelSpan(m, side, trackW, LABEL_CHAR_PX);
                    return (
                      <g key={m.id} className={`marker${entry.kind === 'period' ? ' marker-period' : ''}${stateClass(entry)}`} {...entryProps(entry)}>
                        <title>{`${entry.title} (${entry.dateLabel ?? formatSpan(entry.start, entry.end)})`}</title>
                        <circle className="marker-hitbox" cx={cx} cy={cy} r={Math.max(MARKER_HIT_RADIUS, m.halfWidth)} fill="transparent" />
                        {entry.kind === 'period' ? (
                          <rect className="marker-shape" x={cx - m.halfWidth} y={cy - 3.5} width={m.halfWidth * 2} height={7} rx={3.5} fill={fill} />
                        ) : (
                          <rect className="marker-shape" x={cx - size / 2} y={cy - size / 2} width={size} height={size} fill={fill}
                            transform={`rotate(45 ${cx} ${cy})`} />
                        )}
                        {span && (
                          <text className={`marker-label${m.side ? '' : ' is-forced'}`} x={GUTTER + span[0]}
                            y={side === 'above' || side === 'top' ? top + LABEL_ROW_Y[side] : cy + 4}>
                            {entry.title}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
        {playheadVisible && (
          <div className="playhead" data-testid="playhead" style={{ left: playheadX }}>
            <span className="playhead-grip" style={{ height: AXIS_H }} />
            <span className="playhead-knob" style={{ top: KNOB_Y }} />
          </div>
        )}
      </div>
    </section>
  );
}
