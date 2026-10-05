import { describe, expect, it } from 'vitest';
import type { Bar, Entry, Moment, Period } from '../data/schema';
import { keyMoments, partOf } from './context';

const text = { summary: 's', significance: 's', wikipedia: 'https://en.wikipedia.org/wiki/X' };
const state = (id: string, start: number, end: number): Bar => ({ id, kind: 'state', title: id, start, end, region: 'europe', ...text });
const period = (id: string, start: number, end: number, parents?: string[]): Period => ({
  id, kind: 'period', title: id, start, end, region: 'europe', ...(parents ? { partOf: parents } : {}), ...text,
});
const moment = (id: string, start: number, importance: 1 | 2 | 3, parents?: string[]): Moment => ({
  id, kind: 'moment', title: id, start, end: null, region: 'europe', category: 'politics',
  location: { name: 'X', lat: 0, lng: 0 }, importance, ...(parents ? { partOf: parents } : {}), ...text,
});
const ids = (entries: { id: string }[]) => entries.map((e) => e.id);

const byzantine = state('byzantine', 330, 1453);
const ottoman = state('ottoman', 1299, 1922);
const hre = state('hre', 962, 1806);
const renaissance = period('renaissance', 1300, 1600);
const hundredYearsWar = period('hundred-years-war', 1337, 1453);
const thirtyYearsWar = period('thirty-years-war', 1618, 1648, ['hre']);
const fall = moment('fall', 1453, 3, ['ottoman', 'byzantine']);
const press = moment('press', 1440, 3, ['renaissance', 'hre']);
const code = moment('code', 529, 2, ['byzantine']);
const schism = moment('schism', 1054, 2, ['byzantine']);
const entries: Entry[] = [byzantine, ottoman, hre, renaissance, hundredYearsWar, thirtyYearsWar, fall, press, code, schism];
const byId = new Map(entries.map((e) => [e.id, e]));

describe('partOf', () => {
  it('lists what the entry is recorded as part of, states first, each oldest first', () => {
    expect(ids(partOf(fall, byId))).toEqual(['byzantine', 'ottoman']);
    expect(ids(partOf(press, byId))).toEqual(['hre', 'renaissance']);
  });
  it('lists nothing for an entry with no recorded links, whatever was going on around it', () => {
    expect(partOf(hundredYearsWar, byId)).toEqual([]);
  });
  it('skips a link to an entry that is not shown', () => {
    expect(ids(partOf(moment('m', 1500, 2, ['hidden', 'hre']), byId))).toEqual(['hre']);
  });
});

describe('keyMoments', () => {
  it('lists the entries recorded as part of the bar, most important first, then oldest', () => {
    expect(ids(keyMoments(byzantine, entries))).toEqual(['fall', 'code', 'schism']);
  });
  it('includes periods, which count as major unless rated', () => {
    expect(ids(keyMoments(hre, entries))).toEqual(['press', 'thirty-years-war']);
  });
  it('lists nothing that merely happened in the same place and time', () => {
    expect(keyMoments(hundredYearsWar, entries)).toEqual([]);
  });
});
