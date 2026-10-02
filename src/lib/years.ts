export const MIN_YEAR = -2000;
export const MAX_YEAR = 2000;

/** Calendar year -> astronomical year (1 BC = 0, 2 BC = -1), which has no gap. */
export function toAstronomical(year: number): number {
  return year < 0 ? year + 1 : year;
}

export function fromAstronomical(astro: number): number {
  return astro <= 0 ? astro - 1 : astro;
}

/** Signed number of years from `from` to `to`, accounting for the missing year zero. */
export function yearDiff(from: number, to: number): number {
  return toAstronomical(to) - toAstronomical(from);
}

export function addYears(year: number, n: number): number {
  return fromAstronomical(toAstronomical(year) + n);
}

export function clampYear(year: number): number {
  const rounded = Math.round(year);
  if (rounded === 0) return 1;
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, rounded));
}

export function formatYear(year: number): string {
  if (year < 0) return `${-year} BC`;
  if (year < 1000) return `AD ${year}`;
  return String(year);
}

export function formatSpan(start: number, end: number | null): string {
  if (end === null) return formatYear(start);
  if (end < 0) return `${-start}-${-end} BC`;
  if (start > 0) return start < 1000 ? `AD ${start}-${end}` : `${start}-${end}`;
  return `${formatYear(start)} - ${formatYear(end)}`;
}
