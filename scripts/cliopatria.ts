import type { Position } from 'geojson';
import { inflateRawSync } from 'node:zlib';
import type { Shape } from './patchBorders';

const SHA = '5f433377139a6eeaeacbdc894b70f8805b72c8b5';
const URL = `https://raw.githubusercontent.com/Seshat-Global-History-Databank/cliopatria/${SHA}/cliopatria.geojson.zip`;

/** The one file in a single-entry zip archive, which is all Cliopatria's download is. */
function unzipOnlyEntry(zip: Buffer): Buffer {
  const directoryEnd = zip.lastIndexOf(Buffer.from('PK\x05\x06', 'latin1'));
  const entry = zip.readUInt32LE(directoryEnd + 16);
  const compressedSize = zip.readUInt32LE(entry + 20);
  const header = zip.readUInt32LE(entry + 42);
  const data = header + 30 + zip.readUInt16LE(header + 26) + zip.readUInt16LE(header + 28);
  return inflateRawSync(zip.subarray(data, data + compressedSize));
}

/** About 10 m, far finer than the borders are known. */
const round = (n: number) => Math.round(n * 1e4) / 1e4;
function rounded(shape: Shape): Shape {
  const ring = (points: Position[]) => points.map(([x, y]) => [round(x), round(y)]);
  return shape.type === 'Polygon'
    ? { type: 'Polygon', coordinates: shape.coordinates.map(ring) }
    : { type: 'MultiPolygon', coordinates: shape.coordinates.map((polygon) => polygon.map(ring)) };
}

export const shapeKey = (year: number, name: string) => `${year}:${name}`;

/**
 * Downloads Cliopatria and returns the shape of each wanted polity in the wanted year, keyed by `shapeKey`.
 * The file has one polity record per line, each valid for a range of years, so only the wanted lines are parsed.
 */
export async function loadShapes(wanted: { year: number; name: string }[]): Promise<Map<string, Shape>> {
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${URL}`);
  const file = unzipOnlyEntry(Buffer.from(await res.arrayBuffer()));
  const shapes = new Map<string, Shape>();
  for (let start = 0; start < file.length; ) {
    const newline = file.indexOf(10, start);
    const end = newline === -1 ? file.length : newline;
    const head = /"Name": "([^"]+)", "FromYear": (-?\d+), "ToYear": (-?\d+)/.exec(file.toString('utf8', start, Math.min(end, start + 300)));
    if (head) {
      const [, name, from, to] = head;
      const years = wanted.filter((w) => w.name === name && w.year >= Number(from) && w.year <= Number(to));
      if (years.length) {
        const record = JSON.parse(file.toString('utf8', start, end).replace(/,\s*$/, '')) as { geometry: Shape };
        for (const { year } of years) shapes.set(shapeKey(year, name), rounded(record.geometry));
      }
    }
    start = end + 1;
  }
  const missing = wanted.filter((w) => !shapes.has(shapeKey(w.year, w.name)));
  if (missing.length) throw new Error(`Cliopatria has no shape for: ${missing.map((w) => `${w.name} in ${w.year}`).join(', ')}`);
  return shapes;
}
