import type { Bar, Entry, Moment, Period } from '../data/schema';

/** The states and periods an entry is recorded as belonging to (its `partOf`): states first, each oldest first. */
export function partOf(entry: Moment | Period, byId: ReadonlyMap<string, Entry>): Bar[] {
  return (entry.partOf ?? [])
    .map((id) => byId.get(id))
    .filter((parent): parent is Bar => parent !== undefined && parent.kind !== 'moment')
    .sort((a, b) => Number(a.kind === 'period') - Number(b.kind === 'period') || a.start - b.start || a.id.localeCompare(b.id));
}

/**
 * What happened within a state or period: the moments and periods recorded as part of it.
 * Most important first (a period without a rating counts as major), then oldest.
 */
export function keyMoments(bar: Bar, entries: Entry[]): (Moment | Period)[] {
  const rank = (e: Moment | Period) => e.importance ?? 2;
  return entries
    .filter((e): e is Moment | Period => e.kind !== 'state' && (e.partOf?.includes(bar.id) ?? false))
    .sort((a, b) => rank(b) - rank(a) || a.start - b.start || a.id.localeCompare(b.id));
}
