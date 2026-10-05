import { describe, expect, it } from 'vitest';
import type { Bar } from '../data/schema';
import { packEras } from './packEras';

const era = (id: string, start: number, end: number, region: Bar['region'] = 'europe'): Bar => ({
  id,
  kind: 'state',
  title: id,
  start,
  end,
  region,
  summary: 's',
  significance: 's',
  wikipedia: 'https://en.wikipedia.org/wiki/X',
});

describe('packEras', () => {
  it('puts non-overlapping and touching eras in one row', () => {
    const [lane] = packEras([era('rome-empire', -27, 476), era('rome-republic', -509, -27)]);
    expect(lane.rows.map((r) => r.map((e) => e.id))).toEqual([['rome-republic', 'rome-empire']]);
  });
  it('moves overlapping eras to extra rows', () => {
    const [lane] = packEras([era('zhou', -1046, -256), era('warring', -475, -221), era('qin', -221, -206)]);
    expect(lane.rows.map((r) => r.map((e) => e.id))).toEqual([['zhou', 'qin'], ['warring']]);
  });
  it('orders lanes by the fixed region order and skips empty regions', () => {
    const lanes = packEras([era('inca', 1438, 1533, 'americas'), era('han', -206, 220, 'east-asia')]);
    expect(lanes.map((l) => l.region)).toEqual(['east-asia', 'americas']);
  });
});
