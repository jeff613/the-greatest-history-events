import { type CSSProperties, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { BARS, ENTRIES_BY_ID, MOMENTS } from '../data';
import type { Entry, Moment, Period, Region } from '../data/schema';
import { labelSpan, minImportance, placeLabels, type LabelSide, type Marker } from '../lib/momentLayout';
import { packEras } from '../lib/packEras';
import { FULL_VIEW, panBy, pxToYear, ticks, viewSpanning, visibleURange, yearToPx, yearToU, zoomAt, type View } from '../lib/timeScale';
import { yearDiff } from '../lib/years';
import { useLocale } from '../state/LocaleContext';
import { CATEGORY_COLORS, REGION_COLORS } from '../theme';

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
const barLabelChars = (widthPx: number, charWidth = BAR_CHAR_PX) => Math.floor((widthPx - 12) / charWidth);
/** A pill's rounded ends leave this much less room for its name than a square bar has. */
const PILL_INSET = 10;
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
  visibleKinds: Entry['kind'][];
  onToggleKind(kind: Entry['kind']): void;
  onToggleRegion(region: Region): void;
  playing: boolean;
  onYear(year: number): void;
  onView(view: View): void;
  onTogglePlay(): void;
}

export function TimelineStrip({ year, selectedId, onSelect, hoveredId, onHover, view, visibleRegions, visibleKinds, onToggleKind, onToggleRegion, playing, onYear, onView, onTogglePlay }: Props) {
  const { language, text, localize, formatYear, formatSpan, regionShortLabels } = useLocale();
  const bars = useMemo(() => BARS.map(localize), [localize]);
  const moments = useMemo(() => visibleKinds.includes('moment') ? MOMENTS.map(localize) : [], [localize, visibleKinds]);
  const barCharWidth = language === 'zh' ? 14 : BAR_CHAR_PX;
  const labelCharWidth = language === 'zh' ? 13 : LABEL_CHAR_PX;
  const stripRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const resize = useRef<{ pointerId: number; startY: number; startHeight: number } | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState<number | null>(() => Number(sessionStorage.getItem(HEIGHT_KEY)) || null);
  const allLanes = useMemo(() => packEras(bars).sort((a, b) => LANE_ORDER.indexOf(a.region) - LANE_ORDER.indexOf(b.region)), [bars]);

  const lanes = useMemo(() => {
    if (!visibleKinds.length) return [];
    const [start, end] = visibleURange(view);
    const packed = packEras(bars.filter((bar) => visibleKinds.includes(bar.kind)
      && yearToU(bar.end) > start && yearToU(bar.start) < end));
    return allLanes.filter((lane) => visibleRegions.includes(lane.region))
      .map((lane) => ({ ...lane, rows: packed.find((filtered) => filtered.region === lane.region)?.rows ?? [] }));
  }, [allLanes, bars, visibleRegions, visibleKinds, view]);

  useLayoutEffect(() => {
    if (lanesRef.current) lanesRef.current.scrollTop = 0;
  }, [visibleRegions, visibleKinds]);

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
  const least = minImportance(yearDiff(pxToYear(0, view, trackW), pxToYear(trackW, view, trackW)));
  const tickYears = ticks(view, trackW, language === 'zh' ? 96 : 72);

  // Markers and their labels depend on the view, not on the playhead, so they hold still while it moves.
  const laneMarkers = useMemo(() => {
    const px = (y: number) => yearToPx(y, view, trackW);
    return lanes.map((lane): LaneMarker[] => {
      const laneMoments = moments.filter((m) => m.region === lane.region && (m.importance >= least || m.id === selectedId))
        .sort((a, b) => a.start - b.start || b.importance - a.importance);
      const markers: Omit<LaneMarker, 'side'>[] = [];
      laneMoments.forEach((m, i) => {
        let fan = 0;
        while (fan < i && laneMoments[i - fan - 1].start === m.start) fan++;
        const center = px(m.start) + fan * SAME_YEAR_FAN_PX;
        if (center < 0 || center > trackW) return;
        markers.push({ id: m.id, entry: m, x: center, halfWidth: MARKER_SIZE[m.importance] * 0.75, label: m.title, importance: m.importance, selected: m.id === selectedId });
      });
      // A period too short to carry any of its name is drawn here instead, as a small pill with the name beside it.
      // Unlike moments these are never thinned out: a period is always drawn somewhere.
      for (const bar of lane.rows.flat()) {
        if (bar.kind !== 'period') continue;
        const importance = bar.importance ?? 2;
        const x0 = Math.max(0, px(bar.start));
        const x1 = Math.min(trackW, px(bar.end));
        if (x1 <= x0 || barLabelChars(x1 - x0 - PILL_INSET, barCharWidth) >= MIN_BAR_LABEL_CHARS) continue;
        const half = Math.max(3, (x1 - x0) / 2);
        markers.push({ id: bar.id, entry: bar, x: (x0 + x1) / 2, halfWidth: half, label: bar.title, importance, selected: bar.id === selectedId });
      }
      const sides = placeLabels(markers, trackW, labelCharWidth);
      // Drawn least important first, with the selected marker on top.
      return markers.map((m) => ({ ...m, side: sides.get(m.id) })).sort((a, b) => Number(a.selected) - Number(b.selected) || a.importance - b.importance);
    });
  }, [lanes, view, trackW, moments, barCharWidth, labelCharWidth, least, selectedId]);

  // Short periods live among the markers, so they must not reserve a bar row as well.
  const compactLanes = useMemo(() => lanes.map((lane, index) => {
    const pilled = new Set(laneMarkers[index].filter((marker) => marker.entry.kind === 'period').map((marker) => marker.id));
    const rows = packEras(lane.rows.flat().filter((bar) => !pilled.has(bar.id)))[0]?.rows ?? [];
    const markerHeight = laneMarkers[index].length ? MOMENTS_H : 0;
    return { ...lane, rows, markerHeight, height: Math.max(ROW_H, markerHeight + rows.length * ROW_H) };
  }), [lanes, laneMarkers]);
  const laneTops = compactLanes.reduce<number[]>(
    (tops, _lane, i) => [...tops, i === 0 ? LANE_GAP : tops[i - 1] + compactLanes[i - 1].height + LANE_GAP],
    [],
  );
  const lanesH = compactLanes.length ? laneTops[compactLanes.length - 1] + compactLanes[compactLanes.length - 1].height + LANE_GAP : 0;

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
    <section className="strip" aria-label={text('Timeline', '时间轴')} ref={stripRef} style={height ? { height, maxHeight: '80vh' } : undefined}>
      <div className="strip-resize" role="separator" aria-orientation="horizontal" aria-label={text('Resize timeline', '调整时间轴高度')}
        onPointerDown={onResizeDown} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} onPointerCancel={onResizeEnd} />
      <div className="strip-controls">
        <button onClick={onTogglePlay} aria-label={playing ? text('Pause', '暂停') : text('Play', '播放')}>
          {playing ? '❚❚' : '▶'}
        </button>
        <span className="strip-year" data-testid="strip-year">
          {formatYear(year)}
        </span>
        <span className="strip-hint">{text('Scroll for regions · Drag through time · + / - to zoom', '滚动查看地区 · 拖动浏览年代 · + / - 缩放')}</span>
        <span className="strip-spacer" />
        <div className="timeline-zoom" role="group" aria-label={text('Timeline zoom', '时间轴缩放')}>
          <span className="timeline-zoom-label">{text('Visible span', '显示跨度')}</span>
          <button onClick={() => zoomAroundPlayhead(ZOOM_STEP)} aria-label={text('Zoom in', '放大')} title={text('Zoom in on the timeline', '放大时间轴')}>
            +
          </button>
          <button onClick={() => zoomAroundPlayhead(1 / ZOOM_STEP)} aria-label={text('Zoom out', '缩小')} title={text('Zoom out on the timeline', '缩小时间轴')}>
            -
          </button>
          {[100, 500].map((span) => (
            <button key={span} onClick={() => onView(viewSpanning(year, span))}
              title={text(`Show ${span} years around the selected year`, `显示所选年份前后共${span}年`)}>
              {text(`${span} years`, `${span}年`)}
            </button>
          ))}
          <button onClick={() => onView(FULL_VIEW)} title={text('Show the full timeline: 2000 BC to AD 2000', '显示完整时间轴：公元前2000年至公元2000年')}>{text('All years', '全部年代')}</button>
        </div>
      </div>
      <nav className="timeline-regions" aria-label={text('Timeline regions', '时间轴地区')}>
        <div className="timeline-legend" role="group" aria-label={text('Timeline types', '时间轴类型')}>
          {(['state', 'period', 'moment'] as const).map((kind) => (
            <button key={kind} data-kind={kind}
              aria-pressed={visibleKinds.includes(kind)}
              style={{ '--pigment': 'var(--accent)' } as CSSProperties}
              onClick={() => onToggleKind(kind)}>
              {kind === 'state' ? text('States', '政权') : kind === 'period' ? text('Periods', '时期') : text('Moments', '事件')}
            </button>
          ))}
        </div>
        {allLanes.map((lane) => <button key={lane.region}
          aria-pressed={visibleRegions.includes(lane.region)}
          style={{ '--pigment': REGION_COLORS[lane.region] } as CSSProperties}
          onClick={() => onToggleRegion(lane.region)}>
          {lane.region === 'east-asia' ? text('China & East Asia', '中国与东亚') : regionShortLabels[lane.region]}
        </button>)}
      </nav>
      <div className="timeline-detail" role="status" data-testid="timeline-detail">
        {!visibleKinds.includes('moment') ? text('Moments hidden', '事件已隐藏')
          : least === 3 ? text('Moments: Highlights · Zoom in for more', '事件：重要转折 · 放大查看更多')
          : least === 2 ? text('Moments: Highlights + major events · Zoom in for more', '事件：重要转折与重大事件 · 放大查看更多')
          : text('Moments: All tiers', '事件：全部层级')}
      </div>
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
          {!lanes.length && <p className="timeline-empty">{!visibleKinds.length
            ? text('Select a type above to show states, periods or moments.', '选择上方类型以显示政权、时期或事件。')
            : text('Select a region above to show its timeline. Select several to compare.', '选择上方地区以显示时间轴，可多选以进行比较。')}</p>}
          <svg width={width} height={lanesH}>
            {tickYears.map((t) => (
              <line key={t} className="tick-line" x1={x(t)} x2={x(t)} y1={0} y2={lanesH} />
            ))}
            {compactLanes.map((lane, laneIndex) => {
              const top = laneTops[laneIndex];
              const barsTop = top + lane.markerHeight;
              return (
                <g key={lane.region} data-region={lane.region}>
                  {laneIndex > 0 && <line className="lane-rule" x1={0} x2={width} y1={top - LANE_GAP / 2} y2={top - LANE_GAP / 2} />}
                  <text className="lane-label" x={6} y={lane.rows.length ? barsTop + (ROW_H - 4) / 2 + 0.5 : top + (lane.markerHeight ? MARKER_Y : ROW_H / 2)}>
                    {regionShortLabels[lane.region]}
                  </text>
                  {lane.rows.map((row, rowIndex) =>
                    row.map((era) => {
                      const x0 = Math.max(GUTTER, x(era.start));
                      const x1 = Math.min(width, x(era.end));
                      if (x1 <= x0) return null;
                      const y = barsTop + rowIndex * ROW_H;
                      const labelChars = barLabelChars(x1 - x0 - (era.kind === 'period' ? PILL_INSET : 0), barCharWidth);
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
                            rx={era.kind === 'period' ? (ROW_H - 4) / 2 : undefined}
                            fill={REGION_COLORS[lane.region]}
                          />
                          {showLabel && (
                            <text className="era-label" x={x0 + (era.kind === 'period' ? 9 : 4)} y={y + 18}>
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
                    // A period keeps its lane's pigment wherever it is drawn; a moment takes its category's.
                    const fill = entry.kind === 'moment' ? CATEGORY_COLORS[entry.category] : REGION_COLORS[lane.region];
                    const size = MARKER_SIZE[m.importance];
                    // A marker that lost out on a label still shows its name while it is hovered or selected.
                    const active = selectedId === m.id || hoveredId === m.id;
                    const side = m.side ?? (active ? 'top' : undefined);
                    const span = side && labelSpan(m, side, trackW, labelCharWidth);
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
