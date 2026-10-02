import { validateData } from '../src/data/validate';
import { loadDataFiles } from './loadDataFiles';

const { eventFiles, erasFile } = loadDataFiles();
const errors = validateData(eventFiles, erasFile);
if (errors.length > 0) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s) in data/`);
  process.exit(1);
}
const eventCount = eventFiles.reduce((n, f) => n + (f.records as unknown[]).length, 0);
console.log(`data OK: ${eventCount} events, ${(erasFile.records as unknown[]).length} eras`);
