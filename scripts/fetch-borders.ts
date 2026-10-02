import type { FeatureCollection, Geometry } from 'geojson';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { polityColor, polityKey, type Snapshot } from '../src/lib/borders';
import { MAX_YEAR, MIN_YEAR } from '../src/lib/years';

const SHA = 'da7a4b735ecef70aebdc9c73e409d8a2500d50f3';
const BASE = `https://raw.githubusercontent.com/aourednik/historical-basemaps/${SHA}`;
const OUT = join(import.meta.dirname, '..', 'public', 'borders');

interface SourceProps {
  NAME: string | null;
  SUBJECTO: string | null;
  BORDERPRECISION: number | null;
}

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

mkdirSync(OUT, { recursive: true });
const index: Snapshot[] = [];
for (const { year, filename } of wanted) {
  const geo = (await (await get(`${BASE}/geojson/${filename}`)).json()) as FeatureCollection<Geometry, SourceProps>;
  // Features without a NAME are unclaimed land; the base map already draws it.
  const features = geo.features
    .filter((f) => f.geometry && f.properties?.NAME)
    .map((f) => ({
      type: 'Feature' as const,
      geometry: f.geometry,
      properties: {
        NAME: f.properties.NAME,
        SUBJECTO: f.properties.SUBJECTO,
        BORDERPRECISION: f.properties.BORDERPRECISION,
        COLOR: polityColor(polityKey(f.properties)),
      },
    }));
  writeFileSync(join(OUT, filename), JSON.stringify({ type: 'FeatureCollection', features }));
  index.push({ year, file: filename });
  console.log(`borders ${year}: ${features.length} polities`);
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2));
writeFileSync(join(OUT, 'LICENSE.txt'), await (await get(`${BASE}/LICENSE`)).text());
console.log(`wrote ${index.length} snapshots to public/borders`);
