import { describe, expect, it } from 'vitest';
import { BARS } from '../data';
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


describe('East Asia row grouping', () => {
  it('keeps overlapping Chinese histories above Japanese and Korean rows', () => {
    const [lane] = packEras([
      era('three-kingdoms', 220, 280, 'east-asia'),
      era('yamato', 250, 710, 'east-asia'),
      era('jin-dynasty', 266, 420, 'east-asia'),
      era('northern-wei', 386, 535, 'east-asia'),
      era('silla', -57, 935, 'east-asia'),
    ]);
    expect(lane.rows.map((row) => row.map((entry) => entry.id))).toEqual([
      ['three-kingdoms', 'northern-wei'], ['jin-dynasty'], ['yamato'], ['silla'],
    ]);
  });

  it('preserves grouping when visibility filters remove other eras', () => {
    const selected = BARS.filter((entry) => ['jin-dynasty', 'yamato', 'northern-wei'].includes(entry.id));
    const [lane] = packEras(selected.reverse());
    expect(lane.rows.map((row) => row.map((entry) => entry.id))).toEqual([
      ['jin-dynasty'], ['northern-wei'], ['yamato'],
    ]);
  });

  it('keeps every entry exactly once, with no overlapping bars in a row', () => {
    const lanes = packEras(BARS);
    expect(lanes.flatMap((lane) => lane.rows.flat()).map((entry) => entry.id).sort())
      .toEqual(BARS.map((entry) => entry.id).sort());
    for (const lane of lanes) {
      for (const row of lane.rows) {
        for (let index = 1; index < row.length; index++) {
          expect(row[index - 1].end).toBeLessThanOrEqual(row[index].start);
        }
      }
    }
  });
});
