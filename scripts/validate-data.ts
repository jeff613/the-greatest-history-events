import { validateData } from '../src/data/validate';
import { loadDataFiles } from './loadDataFiles';

const files = loadDataFiles();
const errors = validateData(files);
if (errors.length > 0) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s) in data/`);
  process.exit(1);
}
const entries = files.flatMap((f) => f.records as { kind: string }[]);
const count = (kind: string) => entries.filter((e) => e.kind === kind).length;
console.log(`data OK: ${count('moment')} moments, ${count('period')} periods, ${count('state')} states`);
