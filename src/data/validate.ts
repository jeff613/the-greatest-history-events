import type { z } from 'zod';
import { formatYear } from '../lib/years';
import { eraSchema, EVENT_FILES, eventSchema } from './schema';

export interface DataFile {
  file: string;
  records: unknown;
}

function recordId(record: unknown, index: number): string {
  const id = (record as { id?: unknown } | null)?.id;
  return typeof id === 'string' ? id : `#${index}`;
}

function checkFile(
  df: DataFile,
  schema: z.ZodType<{ id: string }>,
  seen: Map<string, string>,
  errors: string[],
  extra?: (record: { id: string }) => string | null,
): void {
  if (!Array.isArray(df.records)) {
    errors.push(`${df.file}: expected an array of records`);
    return;
  }
  df.records.forEach((record, i) => {
    const label = `${df.file} ${recordId(record, i)}`;
    const result = schema.safeParse(record);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.map(String).join('.') || '(record)';
        const keys = 'keys' in issue && Array.isArray(issue.keys) ? ` (${issue.keys.join(', ')})` : '';
        errors.push(`${label} ${path}: ${issue.message}${keys}`);
      }
      return;
    }
    const previous = seen.get(result.data.id);
    if (previous) errors.push(`${label}: duplicate id "${result.data.id}" (also in ${previous})`);
    else seen.set(result.data.id, df.file);
    const problem = extra?.(result.data);
    if (problem) errors.push(`${label}: ${problem}`);
  });
}

export function validateData(eventFiles: DataFile[], erasFile: DataFile): string[] {
  const errors: string[] = [];
  const eventIds = new Map<string, string>();
  for (const df of eventFiles) {
    const name = df.file.replace(/^events\//, '');
    const range = EVENT_FILES[name];
    if (!range) {
      errors.push(`${df.file}: unknown events file; use one of ${Object.keys(EVENT_FILES).join(', ')}`);
      continue;
    }
    checkFile(df, eventSchema, eventIds, errors, (record) => {
      const { year } = record as unknown as { year: number };
      if (year >= range[0] && year <= range[1]) return null;
      const home = Object.entries(EVENT_FILES).find(([, [lo, hi]]) => year >= lo && year <= hi)?.[0];
      return `year ${formatYear(year)} belongs in a file covering it (${home ?? 'none'})`;
    });
  }
  checkFile(erasFile, eraSchema, new Map(), errors);
  return errors;
}
