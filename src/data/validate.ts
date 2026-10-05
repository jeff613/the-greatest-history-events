import { formatYear } from '../lib/years';
import { ENTRY_FILES, entrySchema } from './schema';

export interface DataFile {
  file: string;
  records: unknown;
}

function recordId(record: unknown, index: number): string {
  const id = (record as { id?: unknown } | null)?.id;
  return typeof id === 'string' ? id : `#${index}`;
}

export function validateData(files: DataFile[]): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>();
  for (const df of files) {
    const range = ENTRY_FILES[df.file.replace(/^timeline\//, '')];
    if (!range) {
      errors.push(`${df.file}: unknown timeline file; use one of ${Object.keys(ENTRY_FILES).join(', ')}`);
      continue;
    }
    if (!Array.isArray(df.records)) {
      errors.push(`${df.file}: expected an array of records`);
      continue;
    }
    df.records.forEach((record, i) => {
      const label = `${df.file} ${recordId(record, i)}`;
      const result = entrySchema.safeParse(record);
      if (!result.success) {
        for (const issue of result.error.issues) {
          const path = issue.path.map(String).join('.') || '(record)';
          const keys = 'keys' in issue && Array.isArray(issue.keys) ? ` (${issue.keys.join(', ')})` : '';
          errors.push(`${label} ${path}: ${issue.message}${keys}`);
        }
        return;
      }
      const { id, start } = result.data;
      const previous = seen.get(id);
      if (previous) errors.push(`${label}: duplicate id "${id}" (also in ${previous})`);
      else seen.set(id, df.file);
      if (start < range[0] || start > range[1]) {
        const home = Object.entries(ENTRY_FILES).find(([, [lo, hi]]) => start >= lo && start <= hi)?.[0];
        errors.push(`${label}: start ${formatYear(start)} belongs in a file covering it (${home ?? 'none'})`);
      }
    });
  }
  return errors;
}
