import { addYears, fromAstronomical, MAX_YEAR, MIN_YEAR, toAstronomical } from './years';

/**
 * Reference point after the end of the range. The axis position is -ln(SCALE_REF - year),
 * so recent centuries get more width. 2700 gives the last 1000 years about 47% of the axis.
 */
export const SCALE_REF = 2700;
export const MAX_ZOOM = 40;

const curve = (astro: number) => -Math.log(SCALE_REF - astro);
const C_MIN = curve(toAstronomical(MIN_YEAR));
const C_MAX = curve(toAstronomical(MAX_YEAR));

export function yearToU(year: number): number {
  return (curve(toAstronomical(year)) - C_MIN) / (C_MAX - C_MIN);
}

export function uToYear(u: number): number {
  const c = C_MIN + u * (C_MAX - C_MIN);
  const year = fromAstronomical(Math.round(SCALE_REF - Math.exp(-c)));
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, year));
}

export interface View {
  zoom: number;
  /** Center of the visible window, in 0..1 axis units. */
  center: number;
}

export const FULL_VIEW: View = { zoom: 1, center: 0.5 };

export function clampView(v: View): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom));
  const half = 0.5 / zoom;
  const center = Math.min(1 - half, Math.max(half, v.center));
  return { zoom, center };
}

export function visibleURange(v: View): [number, number] {
  const half = 0.5 / v.zoom;
  return [v.center - half, v.center + half];
}

export function yearToPx(year: number, v: View, width: number): number {
  const [u0] = visibleURange(v);
  return (yearToU(year) - u0) * v.zoom * width;
}

export function pxToYear(px: number, v: View, width: number): number {
  const [u0] = visibleURange(v);
  return uToYear(u0 + px / (v.zoom * width));
}

export function zoomAt(v: View, factor: number, anchorPx: number, width: number): View {
  const [u0] = visibleURange(v);
  const anchorU = u0 + anchorPx / (v.zoom * width);
  const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom * factor));
  const newU0 = anchorU - anchorPx / (zoom * width);
  return clampView({ zoom, center: newU0 + 0.5 / zoom });
}

export function panBy(v: View, dxPx: number, width: number): View {
  return clampView({ zoom: v.zoom, center: v.center - dxPx / (v.zoom * width) });
}

const NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

/** Smallest multiple of `step` strictly after `year`; year 0 does not exist, so it becomes AD 1. */
function nextMultiple(year: number, step: number): number {
  const m = Math.floor(year / step) * step + step;
  return m === 0 ? 1 : m;
}

/**
 * Tick years for the visible window. The step adapts to the local density of the
 * compressed axis, so ticks stay at least `minGapPx` apart everywhere.
 */
export function ticks(v: View, width: number, minGapPx = 72): number[] {
  const px = (year: number) => yearToPx(year, v, width);
  const first = pxToYear(0, v, width);
  const last = pxToYear(width, v, width);
  const firstStep = NICE_STEPS.find((s) => px(addYears(first, s)) - px(first) >= minGapPx) ?? 1000;
  const out: number[] = [];
  let t = first % firstStep === 0 ? first : nextMultiple(first, firstStep);
  while (t <= last) {
    out.push(t);
    const tPx = px(t);
    const next = NICE_STEPS.map((s) => nextMultiple(t, s)).find((c) => px(c) - tPx >= minGapPx);
    if (next === undefined) break;
    t = next;
  }
  return out;
}
