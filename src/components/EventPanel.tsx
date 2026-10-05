import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ENTRIES, ENTRIES_BY_ID, hasPlace } from '../data';
import type { Entry, Region } from '../data/schema';
import { keyMoments, partOf } from '../lib/context';
import type { Slice } from '../lib/slice';
import { formatSpan, formatYear } from '../lib/years';
import { useLatest } from '../state/useLatest';
import { CATEGORY_COLORS, CATEGORY_LABELS, REGION_COLORS, REGION_LABELS } from '../theme';

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
  }, [selected?.id]);

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
        aria-label={sheetOpen ? 'Collapse events' : 'Expand events'}
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
            <h2>Around {formatYear(year)}</h2>
            <p className="panel-sub">What was in progress, and events within {halfWidth} years either side</p>
          </header>
          {slice.groups.length === 0 && (
            <p className="panel-empty">
              Nothing recorded here for the regions shown. Zoom out the timeline, move the playhead or switch on more regions.
            </p>
          )}
          {slice.groups.map((group) => {
            const shown = expanded.includes(group.region) ? group.moments : group.moments.slice(0, LIST_CAP);
            const more = group.moments.length - shown.length;
            return (
              <section key={group.region} className="region">
                <h3>{REGION_LABELS[group.region]}</h3>
                {group.inProgress.length > 0 && <ul className="in-progress" aria-label={`In progress in ${REGION_LABELS[group.region]}`}>{group.inProgress.map(row)}</ul>}
                <ul>{shown.map(row)}</ul>
                {more > 0 && (
                  <button className="more" onClick={() => setExpansion({ windowKey, regions: [...expanded, group.region] })}>
                    +{more} more
                  </button>
                )}
              </section>
            );
          })}
          {slice.elsewhere > 0 && (
            <p className="panel-elsewhere">
              {slice.elsewhere} more {slice.elsewhere === 1 ? 'event' : 'events'} around this time in regions that are switched off.{' '}
              <button className="more" onClick={onShowAllRegions}>Show all regions</button>
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

function EntryRow({
  entry,
  hovered,
  onHover,
  onSelect,
}: {
  entry: Entry;
  hovered: boolean;
  onHover(id: string | null): void;
  onSelect(id: string): void;
}) {
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
  entry,
  hoveredId,
  onHover,
  onSelect,
}: {
  entry: Entry;
  hoveredId: string | null;
  onHover(id: string | null): void;
  onSelect(id: string | null): void;
}) {
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
        ← Around this time
      </button>
      <p className="card-category">
        {entry.kind !== 'state' && entry.category && (
          <span className="dot" style={{ background: CATEGORY_COLORS[entry.category] }} aria-hidden />
        )}
        {entry.kind === 'moment'
          ? CATEGORY_LABELS[entry.category]
          : `${KIND_LABELS[entry.kind]}${entry.kind === 'period' && entry.category ? ` · ${CATEGORY_LABELS[entry.category]}` : ''}`}
      </p>
      <h2>{entry.title}</h2>
      <p className="card-meta">
        {entry.dateLabel ?? formatSpan(entry.start, entry.end)} · {hasPlace(entry) ? `${entry.location.name}, ` : ''}
        {REGION_LABELS[entry.region]}
      </p>
      <p>{entry.summary}</p>
      <h3>Why it mattered</h3>
      <p>{entry.significance}</p>
      {parents.length > 0 && (
        <section className="card-context">
          <h3>Part of</h3>
          <ul>{parents.map(row)}</ul>
        </section>
      )}
      {moments.length > 0 && (
        <section className="card-context">
          <h3>Key moments</h3>
          <ul>{shownMoments.map(row)}</ul>
          {moments.length > shownMoments.length && (
            <button className="more" onClick={() => setAllMoments(true)}>
              +{moments.length - shownMoments.length} more
            </button>
          )}
        </section>
      )}
      <a href={entry.wikipedia} target="_blank" rel="noreferrer">
        Read more on Wikipedia
      </a>
    </article>
  );
}
