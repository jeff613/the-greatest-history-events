import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const NE_SHA = 'ca96624a56bd078437bca8184e78163e5039ad19';
const NE_BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_SHA}/geojson`;
const FONTS_SHA = '025ff2b2f84cc0fdf11f7b1d74b3a784595fe7a4';
const FONT_STACK = 'Open Sans Italic';
const FONTS_BASE = `https://raw.githubusercontent.com/openmaptiles/fonts/${FONTS_SHA}/${encodeURIComponent(FONT_STACK)}`;
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
  writeFileSync(join(basemapDir, `${name}.geojson`), await (await get(`${NE_BASE}/${source}.geojson`)).text());
  console.log(`basemap ${name}`);
}

// Covers Latin, Latin-1, Latin Extended and combining marks (0-2047), plus Latin Extended Additional
// (7680-7935) and General Punctuation (8192-8447). Rarer scripts in the data fall back to missing glyphs.
const EXTRA_RANGES = ['7680-7935', '8192-8447'];
const glyphDir = join(PUBLIC, 'glyphs', FONT_STACK);
mkdirSync(glyphDir, { recursive: true });
for (let start = 0; start < 2048; start += 256) {
  const range = `${start}-${start + 255}`;
  const res = await get(`${FONTS_BASE}/${range}.pbf`);
  writeFileSync(join(glyphDir, `${range}.pbf`), Buffer.from(await res.arrayBuffer()));
}
for (const range of EXTRA_RANGES) {
  const res = await get(`${FONTS_BASE}/${range}.pbf`);
  writeFileSync(join(glyphDir, `${range}.pbf`), Buffer.from(await res.arrayBuffer()));
}
writeFileSync(
  join(PUBLIC, 'glyphs', 'README.txt'),
  `${FONT_STACK} glyphs from openmaptiles/fonts @ ${FONTS_SHA}. Open Sans is licensed under the Apache License 2.0.\n`,
);
console.log('glyphs done');
