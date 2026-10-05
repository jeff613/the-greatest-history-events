import { describe, expect, it } from 'vitest';
import type { Entry, Moment, Period, Placed, State } from '../data/schema';
import { distanceFromYear, pinnedEntries, sliceAt, windowHalfWidth } from './slice';

const text = { summary: 's', significance: 's', wikipedia: 'https://en.wikipedia.org/wiki/X' };
const place = { category: 'politics', location: { name: 'X', lat: 0, lng: 0 }, importance: 2 } as const;
const moment = (id: string, start: number, extra: Partial<Moment> = {}): Moment => ({
  id, kind: 'moment', title: id, start, end: null, region: 'europe', ...place, ...text, ...extra,
});
const state = (id: string, start: number, end: number, extra: Partial<State> = {}): State => ({
  id, kind: 'state', title: id, start, end, region: 'europe', ...text, ...extra,
});
const period = (id: string, start: number, end: number, extra: Partial<Period> = {}): Period => ({
  id, kind: 'period', title: id, start, end, region: 'europe', ...text, ...extra,
});
const ids = (entries: Entry[]) => entries.map((e) => e.id);

describe('windowHalfWidth', () => {
  it('is 100 years zoomed out and shrinks with zoom down to 10', () => {
    expect(windowHalfWidth(1)).toBe(100);
    expect(windowHalfWidth(2)).toBe(50);
    expect(windowHalfWidth(4)).toBe(25);
    expect(windowHalfWidth(10)).toBe(10);
    expect(windowHalfWidth(40)).toBe(10);
  });
});

describe('distanceFromYear', () => {
  it('is zero inside a span and counts across the missing year zero', () => {
    expect(distanceFromYear(state('rome', -27, 476), 100)).toBe(0);
    expect(distanceFromYear(state('rome', -27, 476), -30)).toBe(3);
    expect(distanceFromYear(moment('birth', 5), -5)).toBe(9);
  });
});

describe('pinnedEntries', () => {
  const war = { ...period('war', 1914, 1918), ...place, importance: 3 } as Placed;
  it('pins moments within the window, edges included', () => {
    const pins = pinnedEntries([moment('in', -144), moment('out', -145), moment('right', 57)], -44, 100);
    expect(ids(pins)).toEqual(['in', 'right']);
  });
  it('pins a placed period only while the year is inside it', () => {
    expect(ids(pinnedEntries([war], 1916, 10))).toEqual(['war']);
    expect(ids(pinnedEntries([war], 1920, 10))).toEqual([]);
  });
  it('drops minor entries when the window is wide', () => {
    const all = [moment('minor', 1, { importance: 1 }), moment('major', 1, { importance: 2 })];
    expect(ids(pinnedEntries(all, 1, 50))).toEqual(['minor', 'major']);
    expect(ids(pinnedEntries(all, 1, 51))).toEqual(['major']);
  });
});

describe('sliceAt', () => {
  const entries: Entry[] = [
    state('byzantine', 330, 1453),
    period('renaissance', 1300, 1600),
    state('ottoman', 1299, 1922, { region: 'mena' }),
    state('ming', 1368, 1644, { region: 'east-asia' }),
    moment('constantinople', 1453, { importance: 3 }),
    moment('gutenberg', 1440, { importance: 3 }),
    moment('vienna', 1460, { importance: 1 }),
    moment('far', 1300),
    moment('columbus', 1452, { region: 'americas', importance: 3 }),
  ];
  const slice = sliceAt(entries, 1453, 20, ['europe', 'mena', 'east-asia']);

  it('lists regions in the fixed order, skipping ones that are switched off or empty', () => {
    expect(slice.groups.map((g) => g.region)).toEqual(['europe', 'mena', 'east-asia']);
  });
  it('puts states before periods among the bars that contain the year, the last year included', () => {
    expect(ids(slice.groups[0].inProgress)).toEqual(['byzantine', 'renaissance']);
    expect(ids(sliceAt(entries, 1454, 20, ['europe']).groups[0].inProgress)).toEqual(['renaissance']);
  });
  it('orders the nearby moments by importance, then by distance', () => {
    expect(ids(slice.groups[0].moments)).toEqual(['constantinople', 'gutenberg', 'vienna']);
  });
  it('counts moments in regions that are switched off', () => {
    expect(slice.elsewhere).toBe(1);
    expect(sliceAt(entries, 1453, 20, ['europe', 'americas']).elsewhere).toBe(0);
  });
});
