import { describe, expect, it } from 'vitest';
import { loadDataFiles } from '../../scripts/loadDataFiles';
import { validateData, type DataFile } from './validate';

const goodEvent = {
  id: 'caesar-assassination',
  title: 'Julius Caesar assassinated',
  year: -44,
  endYear: null,
  dateLabel: '15 March 44 BC',
  region: 'europe',
  category: 'politics',
  location: { name: 'Rome', lat: 41.9, lng: 12.48 },
  importance: 3,
  summary: 'Summary.',
  significance: 'Significance.',
  wikipedia: 'https://en.wikipedia.org/wiki/Assassination_of_Julius_Caesar',
};
const goodEra = { id: 'han', name: 'Han dynasty', start: -206, end: 220, region: 'east-asia' };

const events = (file: string, ...records: unknown[]): DataFile => ({ file: `events/${file}`, records });
const eras = (...records: unknown[]): DataFile => ({ file: 'eras.json', records });

describe('validateData', () => {
  it('accepts valid data', () => {
    expect(validateData([events('1000bc-1bc.json', goodEvent)], eras(goodEra))).toEqual([]);
  });

  it('rejects year 0 with a clear message', () => {
    const errors = validateData([events('ad1-ad1000.json', { ...goodEvent, year: 0 })], eras());
    expect(errors.join('\n')).toMatch(/caesar-assassination year: year 0 does not exist/);
  });

  it('rejects endYear before year', () => {
    const errors = validateData([events('1000bc-1bc.json', { ...goodEvent, endYear: -50 })], eras());
    expect(errors.join('\n')).toMatch(/endYear/);
  });

  it('rejects unknown regions and extra fields', () => {
    const errors = validateData(
      [events('1000bc-1bc.json', { ...goodEvent, region: 'atlantis', colour: 'red' })],
      eras(),
    );
    expect(errors.some((e) => e.includes('region'))).toBe(true);
    expect(errors.some((e) => e.includes('colour'))).toBe(true);
  });

  it('rejects duplicate event ids across files', () => {
    const errors = validateData(
      [events('1000bc-1bc.json', goodEvent), events('ad1-ad1000.json', { ...goodEvent, year: 14 })],
      eras(),
    );
    expect(errors.join('\n')).toMatch(/duplicate id "caesar-assassination"/);
  });

  it('rejects an event stored in the wrong millennium file', () => {
    const errors = validateData([events('ad1-ad1000.json', goodEvent)], eras());
    expect(errors.join('\n')).toMatch(/belongs in a file covering/);
  });

  it('rejects unknown file names and non-array files', () => {
    const errors = validateData([events('misc.json', goodEvent)], { file: 'eras.json', records: {} });
    expect(errors.join('\n')).toMatch(/events\/misc.json: unknown events file/);
    expect(errors.join('\n')).toMatch(/eras.json: expected an array/);
  });

  it('rejects eras that end before they start and duplicate era ids', () => {
    const errors = validateData([], eras({ ...goodEra, id: 'bad', end: -300 }, goodEra, goodEra));
    expect(errors.join('\n')).toMatch(/bad end/);
    expect(errors.join('\n')).toMatch(/duplicate id "han"/);
  });

  it('passes on the real data in data/', () => {
    const { eventFiles, erasFile } = loadDataFiles();
    expect(validateData(eventFiles, erasFile)).toEqual([]);
  });
});
