import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DataFile } from '../src/data/validate';

const DATA_DIR = join(import.meta.dirname, '..', 'data');

function readJson(relative: string): DataFile {
  const text = readFileSync(join(DATA_DIR, relative), 'utf8');
  try {
    return { file: relative, records: JSON.parse(text) };
  } catch (err) {
    throw new Error(`data/${relative}: invalid JSON: ${(err as Error).message}`);
  }
}

export function loadDataFiles(): { eventFiles: DataFile[]; erasFile: DataFile } {
  const eventFiles = readdirSync(join(DATA_DIR, 'events'))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => readJson(`events/${f}`));
  return { eventFiles, erasFile: readJson('eras.json') };
}
