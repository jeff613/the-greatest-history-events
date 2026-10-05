import type { MultiPolygon, Polygon } from 'geojson';
import { describe, expect, it } from 'vitest';
import { applyPatch, type SourceFeature } from './patchBorders';

/** An axis-aligned rectangle, in degrees. */
function box(x0: number, y0: number, x1: number, y1: number): Polygon {
  return { type: 'Polygon', coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]] };
}

function polity(NAME: string, geometry: Polygon | MultiPolygon, SUBJECTO: string | null = null): SourceFeature {
  return { type: 'Feature', geometry, properties: { NAME, SUBJECTO, BORDERPRECISION: 1 } };
}

const names = (features: SourceFeature[]) => features.map((f) => f.properties.NAME);
const noShapes = new Map<string, Polygon | MultiPolygon>();

describe('applyPatch', () => {
  it('removes the named polities and leaves the rest untouched', () => {
    const rome = polity('Rome', box(0, 0, 10, 10));
    const out = applyPatch([rome, polity('Atlantis', box(20, 0, 30, 10))], { remove: ['Atlantis'] }, noShapes);
    expect(out).toEqual([rome]);
  });

  it('fails when a patch names a polity the source does not have', () => {
    const source = [polity('Rome', box(0, 0, 10, 10))];
    expect(() => applyPatch(source, { remove: ['Atlantis'] }, noShapes)).toThrow(/Atlantis/);
    expect(() => applyPatch(source, { merge: { Italy: { from: ['Rome', 'Etruria'] } } }, noShapes)).toThrow(/Etruria/);
  });

  it('merges neighbors into one polity with no border between them', () => {
    const out = applyPatch(
      [polity('India', box(0, 0, 10, 10)), polity('Pakistan', box(-10, 0, 0, 10)), polity('Nepal', box(0, 10, 5, 12))],
      { merge: { 'British Raj': { from: ['India', 'Pakistan'], ruler: 'United Kingdom' } } },
      noShapes,
    );
    expect(names(out)).toEqual(['Nepal', 'British Raj']);
    const raj = out[1];
    expect(raj.properties.SUBJECTO).toBe('United Kingdom');
    expect(raj.geometry.type).toBe('Polygon');
    // One ring around both squares: the shared edge is gone.
    expect(raj.geometry.coordinates).toHaveLength(1);
    const xs = (raj.geometry as Polygon).coordinates[0].map(([x]) => x);
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([-10, 10]);
  });

  it('adds a shape under its label and cuts it out of the polities it overlaps', () => {
    const far = polity('Japan', box(60, 0, 70, 10));
    const out = applyPatch(
      [polity('Tibet', box(0, 0, 20, 10)), far],
      { add: { 'Ming Dynasty': 'Ming Empire' } },
      new Map([['Ming Dynasty', box(10, 0, 40, 10)]]),
    );
    expect(names(out)).toEqual(['Tibet', 'Japan', 'Ming Empire']);
    const tibetXs = (out[0].geometry as Polygon).coordinates[0].map(([x]) => x);
    expect(Math.max(...tibetXs)).toBe(10);
    expect(out[1]).toBe(far);
    expect(out[2].properties).toEqual({ NAME: 'Ming Empire', SUBJECTO: 'Ming Empire', BORDERPRECISION: 2 });
    expect(out[2].geometry).toEqual(box(10, 0, 40, 10));
  });

  it('drops a polity that an added shape covers all or nearly all of', () => {
    const out = applyPatch(
      [polity('Nan-Yue', box(10, 0, 20, 10)), polity('Min-Yue', box(38, 0, 48, 10))],
      { add: { 'Qin Dynasty': 'Qin Empire' } },
      new Map([['Qin Dynasty', box(0, 0, 47, 10)]]),
    );
    expect(names(out)).toEqual(['Qin Empire']);
  });

  it('drops the slivers that cutting leaves behind, but not small polities it never touched', () => {
    // Smaller than any sliver may be, and between the two parts of the added shape, so never cut.
    const island = polity('Chuzan', box(50, 0, 50.2, 0.2));
    const tibet: MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [box(0, 0, 20, 10).coordinates, box(20.05, 4, 20.3, 4.3).coordinates],
    };
    const ming: MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [box(20.1, 0, 40, 10).coordinates, box(60, 0, 70, 10).coordinates],
    };
    const out = applyPatch([polity('Tibet', tibet), island], { add: { 'Ming Dynasty': 'Ming Empire' } }, new Map([['Ming Dynasty', ming]]));
    expect(names(out)).toEqual(['Tibet', 'Chuzan', 'Ming Empire']);
    expect(out[0].geometry.type).toBe('Polygon');
    const xs = (out[0].geometry as Polygon).coordinates[0].map(([x]) => x);
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([0, 20]);
    expect(out[1]).toBe(island);
  });

  it('fails when a shape to add was not loaded', () => {
    expect(() => applyPatch([], { add: { 'Qin Dynasty': 'Qin Empire' } }, noShapes)).toThrow(/Qin Dynasty/);
  });
});
