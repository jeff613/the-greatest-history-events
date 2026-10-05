import { describe, expect, it } from 'vitest';
import { withoutStraightEdgePoints } from './straightEdges';

describe('withoutStraightEdgePoints', () => {
  it('keeps only the ends of a run along a parallel or a meridian', () => {
    // The shape of Antarctica's closing edge: down the antimeridian, along the pole, and back up.
    const ring = [[10, -70], [180, -84], [180, -87], [180, -90], [90, -90], [0, -90], [-90, -90], [-180, -90], [-180, -84], [10, -70]];
    expect(withoutStraightEdgePoints(ring)).toEqual([[10, -70], [180, -84], [180, -90], [-180, -90], [-180, -84], [10, -70]]);
  });
  it('leaves a coastline alone, and keeps the first and last points', () => {
    const ring = [[0, 0], [0, 1], [1, 2], [2, 1], [0, 0]];
    expect(withoutStraightEdgePoints(ring)).toEqual(ring);
  });
});
