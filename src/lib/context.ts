import type { Bar, Entry, Moment, Period } from '../data/schema';

/** The states and periods of the same region that an entry starts inside: states first, each oldest first. */
export function partOf(entry: Entry, bars: Bar[]): Bar[] {
  return bars
    .filter((bar) => bar.id !== entry.id && bar.region === entry.region && bar.start <= entry.start && entry.start <= bar.end)
    .sort((a, b) => Number(a.kind === 'period') - Number(b.kind === 'period') || a.start - b.start || a.id.localeCompare(b.id));
}

/**
 * What happened inside a state or period: the moments, and the periods that began, in the same
 * region within its span. Most important first (a period without a rating counts as major), then oldest.
 */
export function keyMoments(bar: Bar, entries: Entry[]): (Moment | Period)[] {
  const rank = (e: Moment | Period) => e.importance ?? 2;
  return entries
    .filter((e): e is Moment | Period => e.kind !== 'state' && e.id !== bar.id && e.region === bar.region && e.start >= bar.start && e.start <= bar.end)
    .sort((a, b) => rank(b) - rank(a) || a.start - b.start || a.id.localeCompare(b.id));
}
