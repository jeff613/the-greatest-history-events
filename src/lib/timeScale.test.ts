import { describe, expect, it } from 'vitest';
import {
  clampView,
  FULL_VIEW,
  MAX_ZOOM,
  panBy,
  pxToYear,
  ticks,
  uToYear,
  yearToPx,
  yearToU,
  zoomAt,
  type View,
} from './timeScale';
import { MAX_YEAR, MIN_YEAR } from './years';

describe('yearToU and uToYear', () => {
  it('maps the range ends to 0 and 1', () => {
    expect(yearToU(MIN_YEAR)).toBeCloseTo(0, 12);
    expect(yearToU(MAX_YEAR)).toBeCloseTo(1, 12);
  });
  it('is strictly increasing', () => {
    let prev = -Infinity;
    for (let y = MIN_YEAR; y <= MAX_YEAR; y++) {
      if (y === 0) continue;
      const u = yearToU(y);
      expect(u).toBeGreaterThan(prev);
      prev = u;
    }
  });
  it('round-trips every year', () => {
    for (let y = MIN_YEAR; y <= MAX_YEAR; y++) {
      if (y === 0) continue;
      expect(uToYear(yearToU(y))).toBe(y);
    }
  });
  it('gives the last 1000 years 40-50% of the axis', () => {
    const share = 1 - yearToU(1000);
    expect(share).toBeGreaterThanOrEqual(0.4);
    expect(share).toBeLessThanOrEqual(0.5);
  });
  it('clamps positions outside 0..1', () => {
    expect(uToYear(-0.5)).toBe(MIN_YEAR);
    expect(uToYear(2)).toBe(MAX_YEAR);
  });
});

describe('views', () => {
  it('clampView keeps zoom in 1..MAX_ZOOM and the window inside the axis', () => {
    expect(clampView({ zoom: 0.2, center: 0.9 })).toEqual({ zoom: 1, center: 0.5 });
    expect(clampView({ zoom: 1000, center: 0.5 }).zoom).toBe(MAX_ZOOM);
    expect(clampView({ zoom: 4, center: 0.99 }).center).toBeCloseTo(0.875);
  });
  it('yearToPx and pxToYear are inverses on a zoomed view', () => {
    const v = clampView({ zoom: 5, center: yearToU(-44) });
    const px = yearToPx(-44, v, 1000);
    expect(px).toBeCloseTo(500);
    expect(pxToYear(px, v, 1000)).toBe(-44);
  });
  it('zoomAt keeps the year under the cursor fixed', () => {
    const px = yearToPx(1066, FULL_VIEW, 1000);
    const zoomed = zoomAt(FULL_VIEW, 3, px, 1000);
    expect(zoomed.zoom).toBe(3);
    expect(yearToPx(1066, zoomed, 1000)).toBeCloseTo(px, 6);
  });
  it('zoomAt cannot go beyond the zoom limits', () => {
    const max: View = { zoom: MAX_ZOOM, center: 0.5 };
    const v = zoomAt(max, 2, 500, 1000);
    expect(v.zoom).toBe(MAX_ZOOM);
    expect(v.center).toBeCloseTo(0.5, 9);
    expect(zoomAt(FULL_VIEW, 0.1, 300, 1000)).toEqual(FULL_VIEW);
  });
  it('panBy moves toward earlier years when dragging right and stops at the edges', () => {
    const v = clampView({ zoom: 2, center: 0.5 });
    expect(panBy(v, 100, 1000).center).toBeLessThan(0.5);
    expect(panBy(FULL_VIEW, 500, 1000)).toEqual(FULL_VIEW);
  });
});

describe('ticks', () => {
  const cases: [string, View][] = [
    ['full view', FULL_VIEW],
    ['zoomed on Rome', clampView({ zoom: 12, center: yearToU(-44) })],
    ['zoomed on the 1900s', clampView({ zoom: 30, center: yearToU(1950) })],
  ];
  for (const [name, view] of cases) {
    it(`are increasing, spaced, inside the view and never year 0 (${name})`, () => {
      const width = 1200;
      const minGap = 70;
      const t = ticks(view, width, minGap);
      expect(t.length).toBeGreaterThan(3);
      const first = pxToYear(0, view, width);
      const last = pxToYear(width, view, width);
      t.forEach((year, i) => {
        expect(year).not.toBe(0);
        expect(year).toBeGreaterThanOrEqual(first);
        expect(year).toBeLessThanOrEqual(last);
        if (i > 0) {
          expect(year).toBeGreaterThan(t[i - 1]);
          expect(yearToPx(year, view, width) - yearToPx(t[i - 1], view, width)).toBeGreaterThanOrEqual(minGap);
        }
      });
    });
  }
  it('cover the whole window on a narrow strip', () => {
    const width = 318;
    const t = ticks(FULL_VIEW, width, 72);
    expect(t.length).toBeGreaterThan(2);
    expect(yearToPx(t[t.length - 1], FULL_VIEW, width)).toBeGreaterThanOrEqual((width * 2) / 3);
    t.forEach((year, i) => {
      expect(year).not.toBe(0);
      if (i > 0) expect(year).toBeGreaterThan(t[i - 1]);
    });
  });
  it('start at 2000 BC and use round 50-year multiples on the full view', () => {
    const t = ticks(FULL_VIEW, 1200, 70);
    expect(t[0]).toBe(-2000);
    for (const year of t) expect(year % 50 === 0 || year === 1).toBe(true);
  });
});
