import type { Position } from 'geojson';

/**
 * Drops the points along a straight north-south or east-west edge of a ring, keeping its two ends.
 *
 * Natural Earth closes Antarctica along the bottom of the map with a point every 360/256 degrees, which is
 * exactly where map tiles are cut. MapLibre's tiler treats such a point as redundant and drops it, even when
 * it has become the corner of a tile's piece of land, so the land was drawn with corners sliced off.
 */
export function withoutStraightEdgePoints(ring: Position[]): Position[] {
  return ring.filter((point, i) => {
    const before = ring[i - 1];
    const after = ring[i + 1];
    if (!before || !after) return true;
    const sameLng = before[0] === point[0] && point[0] === after[0];
    const sameLat = before[1] === point[1] && point[1] === after[1];
    return !sameLng && !sameLat;
  });
}
