import { useEffect, useRef, useState } from 'react';
import type { HistoryEvent, Region } from '../data/schema';
import type { RegionGroup } from '../lib/selectEvents';
import { formatSpan, formatYear } from '../lib/years';
import { useLatest } from '../state/useLatest';
import { CATEGORY_COLORS, CATEGORY_LABELS, REGION_LABELS } from '../theme';

export const REGION_CAP = 5;
const SWIPE_PX = 30;

interface Props {
  year: number;
  halfWidth: number;
  groups: RegionGroup[];
  selectedEvent: HistoryEvent | null;
  hoveredEventId: string | null;
  onHover(id: string | null): void;
  onSelect(id: string | null): void;
}

export function EventPanel({ year, halfWidth, groups, selectedEvent, hoveredEventId, onHover, onSelect }: Props) {
  const [expanded, setExpanded] = useState<Set<Region>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const swipeStart = useRef<number | null>(null);
  const swiped = useRef(false);

  // Expansions apply to one window only; the 5-per-region cap returns when the window changes.
  useEffect(() => {
    setExpanded((s) => (s.size ? new Set() : s));
  }, [year, halfWidth]);

  // On phones, choosing an event (for example from a map pin) opens the sheet.
  useEffect(() => {
    if (selectedEvent) setSheetOpen(true);
  }, [selectedEvent]);

  return (
    <aside className={`panel${sheetOpen ? ' is-open' : ''}`} data-testid="event-panel">
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
      {selectedEvent ? (
        <EventCard event={selectedEvent} onBack={() => onSelect(null)} />
      ) : (
        <div className="panel-list">
          <header className="panel-header">
            <h2>Around {formatYear(year)}</h2>
            <p className="panel-sub">Events within {halfWidth} years either side</p>
          </header>
          {groups.length === 0 && (
            <p className="panel-empty">
              No recorded events in this window. Zoom out the timeline or move the playhead.
            </p>
          )}
          {groups.map((group) => {
            const shown = expanded.has(group.region) ? group.events : group.events.slice(0, REGION_CAP);
            const more = group.events.length - shown.length;
            return (
              <section key={group.region} className="region">
                <h3>{REGION_LABELS[group.region]}</h3>
                <ul>
                  {shown.map((event) => (
                    <li key={event.id}>
                      <EventRow
                        event={event}
                        hovered={event.id === hoveredEventId}
                        onHover={onHover}
                        onSelect={onSelect}
                      />
                    </li>
                  ))}
                </ul>
                {more > 0 && (
                  <button className="more" onClick={() => setExpanded((s) => new Set(s).add(group.region))}>
                    +{more} more
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function EventRow({
  event,
  hovered,
  onHover,
  onSelect,
}: {
  event: HistoryEvent;
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
    onHover(on ? event.id : null);
  };
  return (
    <button
      ref={ref}
      className={`event-row${hovered ? ' is-hovered' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => {
        setHover(false);
        onSelect(event.id);
      }}
    >
      <span className="dot" style={{ background: CATEGORY_COLORS[event.category] }} aria-hidden />
      <span className="event-title">{event.title}</span>
      <span className="event-date">{formatSpan(event.year, event.endYear)}</span>
    </button>
  );
}

function EventCard({ event, onBack }: { event: HistoryEvent; onBack(): void }) {
  return (
    <article className="card">
      <button className="back" onClick={onBack}>
        ← All events
      </button>
      <p className="card-category">
        <span className="dot" style={{ background: CATEGORY_COLORS[event.category] }} aria-hidden />
        {CATEGORY_LABELS[event.category]}
      </p>
      <h2>{event.title}</h2>
      <p className="card-meta">
        {event.dateLabel ?? formatSpan(event.year, event.endYear)} · {event.location.name},{' '}
        {REGION_LABELS[event.region]}
      </p>
      <p>{event.summary}</p>
      <h3>Why it mattered</h3>
      <p>{event.significance}</p>
      <a href={event.wikipedia} target="_blank" rel="noreferrer">
        Read more on Wikipedia
      </a>
    </article>
  );
}
