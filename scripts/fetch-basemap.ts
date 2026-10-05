import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { withoutStraightEdgePoints } from './straightEdges';

const NE_SHA = 'ca96624a56bd078437bca8184e78163e5039ad19';
const NE_BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_SHA}/geojson`;
const FONTS_SHA = '025ff2b2f84cc0fdf11f7b1d74b3a784595fe7a4';
// The map draws its labels from the Cinzel font file. These glyphs are only the fallback for characters
// Cinzel lacks, so they are saved under the name of the map's font stack.
const FALLBACK_FONT = 'Open Sans Regular';
const FONT_STACK = 'Cinzel';
const FONTS_BASE = `https://raw.githubusercontent.com/openmaptiles/fonts/${FONTS_SHA}/${encodeURIComponent(FALLBACK_FONT)}`;
const PUBLIC = join(import.meta.dirname, '..', 'public');

async function get(url: string): Promise<Response> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res;
}

const basemapDir = join(PUBLIC, 'basemap');
mkdirSync(basemapDir, { recursive: true });
const layers: Record<string, string> = {
  land: 'ne_50m_land',
  lakes: 'ne_50m_lakes',
  rivers: 'ne_50m_rivers_lake_centerlines',
};
for (const [name, source] of Object.entries(layers)) {
  let text = await (await get(`${NE_BASE}/${source}.geojson`)).text();
  if (name === 'land') {
    const land = JSON.parse(text) as FeatureCollection<Polygon | MultiPolygon>;
    for (const { geometry } of land.features) {
      if (geometry.type === 'Polygon') geometry.coordinates = geometry.coordinates.map(withoutStraightEdgePoints);
      else geometry.coordinates = geometry.coordinates.map((polygon) => polygon.map(withoutStraightEdgePoints));
    }
    text = JSON.stringify(land);
  }
  writeFileSync(join(basemapDir, `${name}.geojson`), text);
  console.log(`basemap ${name}`);
}

// Glyph ranges are derived from the border labels (fetch-borders runs first): every 256-codepoint block
// used by a NAME in any snapshot, plus 0-255. Blocks the font lacks upstream get an empty placeholder
// so the dev/preview server never answers them with index.html.
const bordersDir = join(PUBLIC, 'borders');
const snapshots = JSON.parse(readFileSync(join(bordersDir, 'index.json'), 'utf8')) as { file: string }[];
const blockStarts = new Set<number>([0]);
for (const { file } of snapshots) {
  const collection = JSON.parse(readFileSync(join(bordersDir, file), 'utf8')) as {
    features: { properties: { NAME: string | null } }[];
  };
  for (const feature of collection.features) {
    for (const char of feature.properties.NAME ?? '') blockStarts.add(Math.floor(char.codePointAt(0)! / 256) * 256);
  }
}
const glyphDir = join(PUBLIC, 'glyphs', FONT_STACK);
mkdirSync(glyphDir, { recursive: true });
for (const start of [...blockStarts].sort((a, b) => a - b)) {
  const range = `${start}-${start + 255}`;
  const url = `${FONTS_BASE}/${range}.pbf`;
  const res = await fetch(url);
  if (res.status === 404) {
    writeFileSync(join(glyphDir, `${range}.pbf`), new Uint8Array(0));
    console.log(`no upstream glyphs for ${range}, wrote empty placeholder`);
    continue;
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  writeFileSync(join(glyphDir, `${range}.pbf`), Buffer.from(await res.arrayBuffer()));
}
writeFileSync(
  join(PUBLIC, 'glyphs', 'README.txt'),
  `${FALLBACK_FONT} glyphs from openmaptiles/fonts @ ${FONTS_SHA}, the fallback for map labels. Open Sans is licensed under the Apache License 2.0.\n`,
);
console.log('glyphs done');
