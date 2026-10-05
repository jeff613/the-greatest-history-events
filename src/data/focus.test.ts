import { describe, expect, it } from 'vitest';
import { isFocusEntry } from './index';
import type { Entry, Moment } from './schema';

const moment = (region: Moment['region'], lat: number, lng: number, importance: Moment['importance']) =>
  ({ kind: 'moment', region, location: { lat, lng }, importance }) as Moment;

describe('geographic editorial focus', () => {
  it('keeps detailed European and Asian events', () => {
    expect(isFocusEntry(moment('europe', 42, 12, 1))).toBe(true);
    expect(isFocusEntry(moment('mena', 33, 44, 1))).toBe(true);
    expect(isFocusEntry(moment('southeast-asia-oceania', -6, 107, 1))).toBe(true);
  });
  it('counts Anatolia as Asia even where it lies west of the Levant', () => {
    expect(isFocusEntry(moment('mena', 40.4, 29.7, 2))).toBe(true);
    expect(isFocusEntry(moment('mena', 39.9, 32.9, 1))).toBe(true);
    expect(isFocusEntry(moment('mena', 36.85, 10.3, 2))).toBe(false);
  });
  it('keeps only major events elsewhere, including mixed regions', () => {
    for (const [region, lat, lng] of [
      ['americas', 40, -74], ['sub-saharan-africa', 0, 20],
      ['mena', 30, 31], ['southeast-asia-oceania', -34, 151],
    ] as const) {
      expect(isFocusEntry(moment(region, lat, lng, 2))).toBe(false);
      expect(isFocusEntry(moment(region, lat, lng, 3))).toBe(true);
    }
  });
  it('keeps every state and every period without a place, wherever it is', () => {
    expect(isFocusEntry({ kind: 'state', region: 'americas' } as Entry)).toBe(true);
    expect(isFocusEntry({ kind: 'period', region: 'sub-saharan-africa' } as Entry)).toBe(true);
  });
});
