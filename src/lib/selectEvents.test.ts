import { describe, expect, it } from 'vitest';
import type { HistoryEvent } from '../data/schema';
import {
  distanceFromYear,
  eventsInWindow,
  groupByRegion,
  pinnedEvents,
  windowHalfWidth,
} from './selectEvents';

const ev = (id: string, year: number, extra: Partial<HistoryEvent> = {}): HistoryEvent => ({
  id,
  title: id,
  year,
  endYear: null,
  region: 'europe',
  category: 'politics',
  location: { name: 'X', lat: 0, lng: 0 },
  importance: 2,
  summary: 's',
  significance: 's',
  wikipedia: 'https://en.wikipedia.org/wiki/X',
  ...extra,
});

describe('windowHalfWidth', () => {
  it('is 100 years zoomed out and shrinks with zoom down to 10', () => {
    expect(windowHalfWidth(1)).toBe(100);
    expect(windowHalfWidth(2)).toBe(50);
    expect(windowHalfWidth(4)).toBe(25);
    expect(windowHalfWidth(10)).toBe(10);
    expect(windowHalfWidth(40)).toBe(10);
  });
});

describe('eventsInWindow', () => {
  it('includes events exactly at the window edge and excludes ones just beyond', () => {
    const ids = eventsInWindow([ev('in', -144), ev('out', -145), ev('right', 57)], -44, 100).map((e) => e.id);
    expect(ids).toEqual(['in', 'right']);
  });
  it('counts across 1 BC / AD 1 without a year zero', () => {
    const ids = eventsInWindow([ev('ten-before', -10), ev('eleven-before', -11)], 1, 10).map((e) => e.id);
    expect(ids).toEqual(['ten-before']);
  });
  it('includes long-running events when the year is inside their span', () => {
    const han = ev('han', -206, { endYear: 220 });
    expect(distanceFromYear(han, 1)).toBe(0);
    expect(eventsInWindow([han], 1, 10)).toEqual([han]);
    expect(eventsInWindow([han], 300, 10)).toEqual([]);
    expect(eventsInWindow([han], 230, 10)).toEqual([han]);
  });
});

describe('groupByRegion', () => {
  it('uses the fixed region order and skips empty regions', () => {
    const groups = groupByRegion(
      [ev('a', 1, { region: 'americas' }), ev('b', 1, { region: 'europe' }), ev('c', 1, { region: 'east-asia' })],
      1,
    );
    expect(groups.map((g) => g.region)).toEqual(['europe', 'east-asia', 'americas']);
  });
  it('sorts by importance, then closeness to the year, then id', () => {
    const groups = groupByRegion(
      [
        ev('far-major', -80, { importance: 2 }),
        ev('near-major', -40, { importance: 2 }),
        ev('world-changing', -90, { importance: 3 }),
        ev('b-tie', -50, { importance: 1 }),
        ev('a-tie', -38, { importance: 1 }),
      ],
      -44,
    );
    expect(groups[0].events.map((e) => e.id)).toEqual([
      'world-changing',
      'near-major',
      'far-major',
      'a-tie',
      'b-tie',
    ]);
  });
});

describe('pinnedEvents', () => {
  const events = [ev('minor', 1, { importance: 1 }), ev('major', 1, { importance: 2 })];
  it('drops importance-1 pins when the window is wide', () => {
    expect(pinnedEvents(events, 100).map((e) => e.id)).toEqual(['major']);
  });
  it('keeps every pin when the window is 50 years or narrower', () => {
    expect(pinnedEvents(events, 50).map((e) => e.id)).toEqual(['minor', 'major']);
  });
});
