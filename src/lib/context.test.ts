import { describe, expect, it } from 'vitest';
import type { Bar, Moment } from '../data/schema';
import { keyMoments, partOf } from './context';

const text = { summary: 's', significance: 's', wikipedia: 'https://en.wikipedia.org/wiki/X' };
const bar = (id: string, kind: 'state' | 'period', start: number, end: number, region: Bar['region'] = 'europe'): Bar => ({
  id, kind, title: id, start, end, region, ...text,
});
const moment = (id: string, start: number, importance: 1 | 2 | 3 = 2, region: Moment['region'] = 'europe'): Moment => ({
  id, kind: 'moment', title: id, start, end: null, region, category: 'politics',
  location: { name: 'X', lat: 0, lng: 0 }, importance, ...text,
});
const ids = (entries: { id: string }[]) => entries.map((e) => e.id);

const bars = [
  bar('renaissance', 'period', 1300, 1600),
  bar('byzantine', 'state', 330, 1453),
  bar('hre', 'state', 962, 1806),
  bar('ming', 'state', 1368, 1644, 'east-asia'),
  bar('thirty-years-war', 'period', 1618, 1648),
];

describe('partOf', () => {
  it('lists the bars of the same region that contain the start, states first, the last year included', () => {
    expect(ids(partOf(moment('constantinople', 1453), bars))).toEqual(['byzantine', 'hre', 'renaissance']);
  });
  it('never lists an entry as part of itself', () => {
    expect(ids(partOf(bars[0], bars))).toEqual(['byzantine', 'hre']);
  });
  it('is empty when nothing contains the entry', () => {
    expect(partOf(moment('early', -500), bars)).toEqual([]);
  });
});

describe('keyMoments', () => {
  const moments = [moment('late', 1440, 2), moment('fall', 1453, 3), moment('early', 400, 3), moment('zheng-he', 1405, 3, 'east-asia'), moment('after', 1500)];
  it('lists the moments of the same region inside the span, most important first, then oldest', () => {
    expect(ids(keyMoments(bars[1], moments))).toEqual(['early', 'fall', 'late']);
  });
  it('includes the periods that began inside it, but not itself or states', () => {
    expect(ids(keyMoments(bars[2], [...bars, ...moments]))).toEqual(['fall', 'renaissance', 'late', 'after', 'thirty-years-war']);
  });
  it('is empty for a bar with nothing inside it', () => {
    expect(keyMoments(bars[4], moments)).toEqual([]);
  });
});
