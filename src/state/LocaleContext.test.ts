import { describe, expect, it } from 'vitest';
import { loadDataFiles } from '../../scripts/loadDataFiles';
import { entrySchema } from '../data/schema';
import { formatSpan, formatYear } from '../lib/years';
import { localizeEntry } from './LocaleContext';

const entries = loadDataFiles().flatMap((file) => (file.records as unknown[]).map((record) => entrySchema.parse(record)));

describe('Chinese localization', () => {
  it('covers every entry, including optional place names and date notes', () => {
    for (const entry of entries) {
      expect(entry.zh, entry.id).toBeDefined();
      for (const field of ['title', 'summary', 'significance'] as const) {
        expect(entry.zh![field], `${entry.id}.${field}`).toMatch(/\p{Script=Han}/u);
        expect(entry.zh![field], `${entry.id}.${field}`).not.toMatch(/[⁇▁�]/);
      }
      if (entry.dateLabel) expect(entry.zh!.dateLabel, entry.id).toMatch(/\p{Script=Han}|\d/u);
      if (entry.kind !== 'state' && entry.location) expect(entry.zh!.locationName, entry.id).toMatch(/\p{Script=Han}/u);
    }
  });

  it('changes only display text, preserving identity, relationships and map coordinates', () => {
    const entry = entries.find((entry) => entry.id === 'caesar-assassination')!;
    const chinese = localizeEntry(entry, 'zh');
    expect(localizeEntry(entry, 'en')).toBe(entry);
    expect(chinese.title).toBe('尤利乌斯·恺撒遇刺');
    expect(chinese.id).toBe(entry.id);
    expect(chinese.start).toBe(entry.start);
    expect(chinese.wikipedia).toBe(entry.wikipedia);
    if (chinese.kind === 'moment' && entry.kind === 'moment') {
      expect(chinese.partOf).toBe(entry.partOf);
      expect(chinese.location).toEqual({ ...entry.location, name: '罗马' });
      expect(entry.location.name).toBe('Rome');
    }
  });

  it('formats Chinese dates across the BC/AD boundary while keeping English defaults', () => {
    expect(formatYear(-44, 'zh')).toBe('公元前44年');
    expect(formatYear(1, 'zh')).toBe('公元1年');
    expect(formatSpan(-1, 1, 'zh')).toBe('公元前1年至公元1年');
    expect(formatSpan(618, 907, 'zh')).toBe('公元618年至公元907年');
    expect(formatSpan(-44, null, 'zh')).toBe('公元前44年');
    expect(formatYear(-44)).toBe('44 BC');
  });
});
