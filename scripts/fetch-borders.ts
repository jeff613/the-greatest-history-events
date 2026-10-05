import type { FeatureCollection } from 'geojson';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fixLabel, LABEL_FIXES } from '../src/lib/borderFixes';
import { polityColor, polityKey, territoryName, type Snapshot } from '../src/lib/borders';
import { MAX_YEAR, MIN_YEAR } from '../src/lib/years';
import { BORDER_PATCHES } from './borderPatches';
import { loadShapes, shapeKey } from './cliopatria';
import { applyPatch, type Shape, type SourceFeature, type SourceProps } from './patchBorders';

const SHA = 'da7a4b735ecef70aebdc9c73e409d8a2500d50f3';
const BASE = `https://raw.githubusercontent.com/aourednik/historical-basemaps/${SHA}`;
const OUT = join(import.meta.dirname, '..', 'public', 'borders');

async function get(url: string): Promise<Response> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res;
}

const sourceIndex = (await (await get(`${BASE}/index.json`)).json()) as {
  years: { year: number; filename: string }[];
};
const sorted = [...sourceIndex.years].sort((a, b) => a.year - b.year);
const start = sorted.filter((y) => y.year <= MIN_YEAR).at(-1);
const wanted = [...(start ? [start] : []), ...sorted.filter((y) => y.year > MIN_YEAR && y.year <= MAX_YEAR)];

/** Named polities of a source snapshot. Features without a NAME are unclaimed land; the base map already draws it. */
const sources = new Map<number, Promise<SourceFeature[]>>();
function source(year: number): Promise<SourceFeature[]> {
  const filename = wanted.find((y) => y.year === year)?.filename;
  if (!filename) throw new Error(`the source has no snapshot for ${year}`);
  let features = sources.get(year);
  if (!features) {
    features = get(`${BASE}/geojson/${filename}`)
      .then((res) => res.json() as Promise<FeatureCollection<Shape, SourceProps>>)
      .then((geo) => geo.features.filter((f) => f.geometry && f.properties?.NAME));
    sources.set(year, features);
  }
  return features;
}

const patches = Object.entries(BORDER_PATCHES).map(([year, patch]) => ({ year: Number(year), patch }));
const shapes = await loadShapes(
  patches.flatMap(({ year, patch }) => Object.keys(patch.add ?? {}).map((name) => ({ year, name }))),
);
const snapshots = [
  ...wanted,
  ...patches
    .filter(({ patch }) => patch.base !== undefined)
    .map(({ year }) => ({ year, filename: `world_${year < 0 ? `bc${-year}` : year}.geojson` })),
].sort((a, b) => a.year - b.year);

mkdirSync(OUT, { recursive: true });
const index: Snapshot[] = [];
for (const { year, filename } of snapshots) {
  const patch = BORDER_PATCHES[year];
  let polities = await source(patch?.base ?? year);
  if (patch) {
    const forYear = new Map(Object.keys(patch.add ?? {}).map((name) => [name, shapes.get(shapeKey(year, name))!]));
    polities = applyPatch(polities, patch, forYear);
  }
  // A fix that matches nothing means the source changed; fail so the table gets reviewed.
  const stale = Object.keys(LABEL_FIXES[year] ?? {}).filter((name) => !polities.some((f) => f.properties.NAME?.trim() === name));
  if (stale.length) throw new Error(`borders ${year}: label fixes match no polity: ${stale.join(', ')}`);
  const features = polities.map((f) => {
    const props = fixLabel(year, f.properties);
    return {
      type: 'Feature' as const,
      geometry: f.geometry,
      properties: {
        NAME: territoryName(props),
        SUBJECTO: props.SUBJECTO,
        BORDERPRECISION: props.BORDERPRECISION,
        COLOR: polityColor(polityKey(props)),
      },
    };
  });
  writeFileSync(join(OUT, filename), JSON.stringify({ type: 'FeatureCollection', features }));
  index.push({ year, file: filename });
  console.log(`borders ${year}: ${features.length} polities${patch ? ' (patched)' : ''}`);
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2));
writeFileSync(join(OUT, 'LICENSE.txt'), await (await get(`${BASE}/LICENSE`)).text());
console.log(`wrote ${index.length} snapshots to public/borders`);
