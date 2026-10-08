import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ENTRIES, ENTRIES_BY_ID, hasPlace } from '../data';
import type { Entry, Region } from '../data/schema';
import { keyMoments, partOf } from '../lib/context';
import type { Slice } from '../lib/slice';
import { useLocale } from '../state/LocaleContext';
import { useLatest } from '../state/useLatest';
import { CATEGORY_COLORS, REGION_COLORS } from '../theme';

export const LIST_CAP = 5;
const SWIPE_PX = 30;

interface Props {
  year: number;
  halfWidth: number;
  slice: Slice;
  selected: Entry | null;
  hoveredId: string | null;
  onHover(id: string | null): void;
  onSelect(id: string | null): void;
  onShowAllRegions(): void;
}

export function EventPanel({ year, halfWidth, slice, selected, hoveredId, onHover, onSelect, onShowAllRegions }: Props) {
  const { text, formatYear, regionLabels } = useLocale();
  // Expansions apply to one window only; the 5-per-region cap returns when the window changes.
  const windowKey = `${year}:${halfWidth}`;
  const [expansion, setExpansion] = useState<{ windowKey: string; regions: Region[] }>({ windowKey, regions: [] });
  const expanded = expansion.windowKey === windowKey ? expansion.regions : [];
  const [sheetOpen, setSheetOpen] = useState(false);
  const paneRef = useRef<HTMLElement>(null);
  const swipeStart = useRef<number | null>(null);
  const swiped = useRef(false);

  // The pane is one scroll container for the list and every card, so it would otherwise keep
  // its scroll position when what it shows changes.
  useLayoutEffect(() => {
    paneRef.current!.scrollTop = 0;
  }, [selected?.id, sheetOpen]);

  // On phones, choosing an entry (for example from a map pin) opens the sheet.
  useEffect(() => {
    if (selected) setSheetOpen(true);
  }, [selected]);

  const row = (entry: Entry) => (
    <li key={entry.id}>
      <EntryRow entry={entry} hovered={entry.id === hoveredId} onHover={onHover} onSelect={onSelect} />
    </li>
  );

  return (
    <aside ref={paneRef} className={`panel${sheetOpen ? ' is-open' : ''}`} data-testid="event-panel">
      <button
        className="sheet-handle"
        aria-expanded={sheetOpen}
        aria-label={sheetOpen ? text('Collapse events', '收起事件') : text('Expand events', '展开事件')}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          swipeStart.current = e.clientY;
        }}
        onPointerCancel={() => {
          swipeStart.current = null;
        }}
        onPointerUp={(e) => {
          const start = swipeStart.current;
          swipeStart.current = null;
          if (start !== null && Math.abs(e.clientY - start) > SWIPE_PX) {
            swiped.current = true;
            setSheetOpen(e.clientY < start);
          }
        }}
        onClick={() => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          setSheetOpen((open) => !open);
        }}
      />
      {selected ? (
        <EntryCard key={selected.id} entry={selected} hoveredId={hoveredId} onHover={onHover} onSelect={onSelect} />
      ) : (
        <div className="panel-list">
          <header className="panel-header">
            <h2>{text(`Around ${formatYear(year)}`, `${formatYear(year)}前后`)}</h2>
            <p className="panel-sub">{text(`What was in progress, and events within ${halfWidth} years either side`, `正在延续的历史，以及前后${halfWidth}年内的事件`)}</p>
          </header>
          {slice.groups.length === 0 && (
            <p className="panel-empty">
              {text('Nothing recorded here for the regions shown. Zoom out the timeline, move the playhead or switch on more regions.', '所选地区在此时段暂无记录。请缩小时间轴、移动时间指针或选择更多地区。')}
            </p>
          )}
          {slice.groups.map((group) => {
            const shown = expanded.includes(group.region) ? group.moments : group.moments.slice(0, LIST_CAP);
            const more = group.moments.length - shown.length;
            return (
              <section key={group.region} className="region">
                <h3>{regionLabels[group.region]}</h3>
                {group.inProgress.length > 0 && <ul className="in-progress" aria-label={text(`In progress in ${regionLabels[group.region]}`, `${regionLabels[group.region]}正在延续的历史`)}>{group.inProgress.map(row)}</ul>}
                <ul>{shown.map(row)}</ul>
                {more > 0 && (
                  <button className="more" onClick={() => setExpansion({ windowKey, regions: [...expanded, group.region] })}>
                    {text(`+${more} more`, `再显示${more}条`)}
                  </button>
                )}
              </section>
            );
          })}
          {slice.elsewhere > 0 && (
            <p className="panel-elsewhere">
              {text(`${slice.elsewhere} more ${slice.elsewhere === 1 ? 'event' : 'events'} around this time in regions that are switched off.`, `未显示的地区在此时段还有${slice.elsewhere}条记录。`)}{' '}
              <button className="more" onClick={onShowAllRegions}>{text('Show all regions', '显示所有地区')}</button>
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

function EntryRow({
  entry: originalEntry,
  hovered,
  onHover,
  onSelect,
}: {
  entry: Entry;
  hovered: boolean;
  onHover(id: string | null): void;
  onSelect(id: string): void;
}) {
  const { localize, formatSpan } = useLocale();
  const entry = localize(originalEntry);
  const ref = useRef<HTMLButtonElement>(null);
  /** Whether this row's mouse-over set the shared hover, so it is cleared if the row goes away. */
  const ownsHover = useRef(false);
  const latestOnHover = useLatest(onHover);
  useEffect(() => {
    if (hovered) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [hovered]);
  useEffect(
    () => () => {
      if (ownsHover.current) latestOnHover.current(null);
    },
    [latestOnHover],
  );
  const setHover = (on: boolean) => {
    ownsHover.current = on;
    onHover(on ? entry.id : null);
  };
  return (
    <button
      ref={ref}
      className={`event-row${hovered ? ' is-hovered' : ''}`}
      data-kind={entry.kind}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => {
        setHover(false);
        onSelect(entry.id);
      }}
    >
      {entry.kind === 'moment' ? (
        <span className="dot" style={{ background: CATEGORY_COLORS[entry.category] }} aria-hidden />
      ) : (
        <span className={`bar-glyph${entry.kind === 'period' ? ' is-period' : ''}`} style={{ background: REGION_COLORS[entry.region] }} aria-hidden />
      )}
      <span className="event-title">{entry.title}</span>
      <span className="event-date">{formatSpan(entry.start, entry.end)}</span>
    </button>
  );
}

const KIND_LABELS = { state: 'Historical state', period: 'Historical period' } as const;

function EntryCard({
  entry: originalEntry,
  hoveredId,
  onHover,
  onSelect,
}: {
  entry: Entry;
  hoveredId: string | null;
  onHover(id: string | null): void;
  onSelect(id: string | null): void;
}) {
  const { text, localize, formatSpan, regionLabels, categoryLabels } = useLocale();
  const entry = localize(originalEntry);
  const [allMoments, setAllMoments] = useState(false);
  const parents = entry.kind === 'state' ? [] : partOf(entry, ENTRIES_BY_ID);
  const moments = entry.kind === 'moment' ? [] : keyMoments(entry, ENTRIES);
  const shownMoments = allMoments ? moments : moments.slice(0, LIST_CAP);
  const row = (other: Entry) => (
    <li key={other.id}>
      <EntryRow entry={other} hovered={other.id === hoveredId} onHover={onHover} onSelect={onSelect} />
    </li>
  );
  return (
    <article className="card" data-testid="entry-card" data-kind={entry.kind}>
      <button className="back" onClick={() => onSelect(null)}>
        {text('← Around this time', '← 返回此时段')}
      </button>
      <p className="card-category">
        {entry.kind !== 'state' && entry.category && (
          <span className="dot" style={{ background: CATEGORY_COLORS[entry.category] }} aria-hidden />
        )}
        {entry.kind === 'moment'
          ? categoryLabels[entry.category]
          : `${text(KIND_LABELS[entry.kind], entry.kind === 'state' ? '历史政权' : '历史时期')}${entry.kind === 'period' && entry.category ? ` · ${categoryLabels[entry.category]}` : ''}`}
      </p>
      <h2>{entry.title}</h2>
      <p className="card-meta">
        {entry.dateLabel ?? formatSpan(entry.start, entry.end)} · {hasPlace(entry) ? `${entry.location.name}, ` : ''}
        {regionLabels[entry.region]}
      </p>
      <p>{entry.summary}</p>
      <h3>{text('Why it mattered', '历史意义')}</h3>
      <p>{entry.significance}</p>
      {parents.length > 0 && (
        <section className="card-context">
          <h3>{text('Part of', '所属历史')}</h3>
          <ul>{parents.map(row)}</ul>
        </section>
      )}
      {moments.length > 0 && (
        <section className="card-context">
          <h3>{text('Key moments', '重要事件')}</h3>
          <ul>{shownMoments.map(row)}</ul>
          {moments.length > shownMoments.length && (
            <button className="more" onClick={() => setAllMoments(true)}>
              {text(`+${moments.length - shownMoments.length} more`, `再显示${moments.length - shownMoments.length}条`)}
            </button>
          )}
        </section>
      )}
      <a href={entry.wikipedia} target="_blank" rel="noreferrer">
        {text('Read more on Wikipedia', '前往维基百科阅读更多（英文）')}
      </a>
    </article>
  );
}
