import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';
import { difference, intersection, union } from 'polyclip-ts';

export interface SourceProps {
  NAME: string | null;
  SUBJECTO: string | null;
  BORDERPRECISION: number | null;
}
export type Shape = Polygon | MultiPolygon;
export type SourceFeature = Feature<Shape, SourceProps>;

/** Changes to one border snapshot. Polities are named as the source names them, before any label fix. */
export interface Patch {
  /** For a year the source has no snapshot of: the source snapshot to start from. */
  base?: number;
  /** Polities to drop. */
  remove?: string[];
  /** Pieces the source drew under the wrong name: the parts of a polity that lie inside the box get the right one. */
  relabel?: { polity: string; within: Box; as: string; ruler?: string }[];
  /** Polities to join into one, keyed by the name of the result. */
  merge?: Record<string, { from: string[]; ruler?: string }>;
  /** Shapes to bring in from Cliopatria for this year, keyed by its name for the polity, with the label to show. */
  add?: Record<string, string>;
}

/** Leftovers smaller than this, after an added shape is cut out of a polity, are slivers along the new border. */
const MIN_PART_KM2 = 3000;
/** A polity left with less than this share of its area has been replaced by the added shape. */
const MIN_KEPT_SHARE = 0.2;
const KM_PER_DEGREE = 111.32;

type Ring = Position[];
type PolygonCoords = Ring[];

/** Good enough to compare a polity with itself before and after cutting; not a geodesic area. */
function ringArea(ring: Ring): number {
  let twice = 0;
  let lat = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    twice += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    lat += ring[i][1];
  }
  const shrink = Math.cos(((lat / (ring.length - 1)) * Math.PI) / 180);
  return (Math.abs(twice) / 2) * KM_PER_DEGREE ** 2 * shrink;
}

const polygonArea = ([outer, ...holes]: PolygonCoords) => holes.reduce((area, hole) => area - ringArea(hole), ringArea(outer));
const polygons = (shape: Shape): PolygonCoords[] => (shape.type === 'Polygon' ? [shape.coordinates] : shape.coordinates);
const toShape = (parts: PolygonCoords[]): Shape =>
  parts.length === 1 ? { type: 'Polygon', coordinates: parts[0] } : { type: 'MultiPolygon', coordinates: parts };

export type Box = [west: number, south: number, east: number, north: number];
function boxOf(shapes: Shape[]): Box {
  const box: Box = [Infinity, Infinity, -Infinity, -Infinity];
  for (const shape of shapes) {
    for (const [outer] of polygons(shape)) {
      for (const [x, y] of outer) {
        box[0] = Math.min(box[0], x);
        box[1] = Math.min(box[1], y);
        box[2] = Math.max(box[2], x);
        box[3] = Math.max(box[3], y);
      }
    }
  }
  return box;
}
const overlaps = (a: Box, b: Box) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

// polyclip-ts wants [x, y] tuples; GeoJSON positions are number arrays of at least that length.
type Clippable = Parameters<typeof union>[0];
const clippable = (shape: Shape) => shape.coordinates as Clippable;

const totalArea = (parts: PolygonCoords[]) => parts.reduce((area, part) => area + polygonArea(part), 0);

/** What is left of a polity once the added shapes are cut out of it, or null if they replace it. */
function cut(shape: Shape, cutter: Clippable): Shape | null {
  const overlap = intersection(clippable(shape), cutter) as PolygonCoords[];
  if (totalArea(overlap) < 1) return shape;
  const parts = difference(clippable(shape), cutter) as PolygonCoords[];
  const kept = parts.filter((part) => polygonArea(part) >= MIN_PART_KM2);
  return totalArea(kept) < totalArea(polygons(shape)) * MIN_KEPT_SHARE ? null : toShape(kept);
}

/**
 * Applies one snapshot's patch: drops and merges source polities, then lays the added shapes
 * over the result, cutting them out of whatever they overlap so no two polities claim the same land.
 */
export function applyPatch(source: SourceFeature[], patch: Patch, shapes: Map<string, Shape>): SourceFeature[] {
  const named = (name: string) => source.filter((f) => f.properties.NAME?.trim() === name);
  const merges = Object.entries(patch.merge ?? {});
  const gone = [...(patch.remove ?? []), ...merges.flatMap(([, { from }]) => from)];
  const unknown = gone.filter((name) => named(name).length === 0);
  if (unknown.length) throw new Error(`patch names polities the source does not have: ${unknown.join(', ')}`);

  let features = source.filter((f) => !gone.includes(f.properties.NAME?.trim() ?? ''));
  for (const { polity, within, as, ruler } of patch.relabel ?? []) {
    let found = false;
    features = features.flatMap((feature) => {
      if (feature.properties.NAME?.trim() !== polity) return [feature];
      const parts = polygons(feature.geometry);
      const moved = parts.filter((part) => {
        const [west, south, east, north] = boxOf([toShape([part])]);
        return west >= within[0] && south >= within[1] && east <= within[2] && north <= within[3];
      });
      if (!moved.length) return [feature];
      found = true;
      const kept = parts.filter((part) => !moved.includes(part));
      const piece: SourceFeature = {
        type: 'Feature',
        geometry: toShape(moved),
        properties: { NAME: as, SUBJECTO: ruler ?? as, BORDERPRECISION: feature.properties.BORDERPRECISION },
      };
      return kept.length ? [{ ...feature, geometry: toShape(kept) }, piece] : [piece];
    });
    if (!found) throw new Error(`patch relabels a piece of ${polity} that the source does not have there`);
  }
  for (const [name, { from, ruler }] of merges) {
    const [first, ...rest] = from.flatMap(named);
    const joined = union(clippable(first.geometry), ...rest.map((f) => clippable(f.geometry))) as PolygonCoords[];
    features.push({
      type: 'Feature',
      geometry: toShape(joined),
      properties: { NAME: name, SUBJECTO: ruler ?? name, BORDERPRECISION: first.properties.BORDERPRECISION },
    });
  }

  const added = Object.entries(patch.add ?? {}).map(([name, label]): SourceFeature => {
    const geometry = shapes.get(name);
    if (!geometry) throw new Error(`patch adds a shape that was not loaded: ${name}`);
    return { type: 'Feature', geometry, properties: { NAME: label, SUBJECTO: label, BORDERPRECISION: 2 } };
  });
  if (added.length) {
    const [first, ...rest] = added.map((f) => clippable(f.geometry));
    const cutter = union(first, ...rest);
    const reach = boxOf(added.map((f) => f.geometry));
    features = features.flatMap((feature) => {
      if (!overlaps(boxOf([feature.geometry]), reach)) return [feature];
      const geometry = cut(feature.geometry, cutter);
      if (geometry === feature.geometry) return [feature];
      return geometry ? [{ ...feature, geometry }] : [];
    });
  }
  return [...features, ...added];
}
