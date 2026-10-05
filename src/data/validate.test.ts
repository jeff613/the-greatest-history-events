import { describe, expect, it } from 'vitest';
import { loadDataFiles } from '../../scripts/loadDataFiles';
import { validateData, type DataFile } from './validate';

const text = { summary: 'Summary.', significance: 'Significance.', wikipedia: 'https://en.wikipedia.org/wiki/X' };
const moment = {
  id: 'caesar-assassination',
  kind: 'moment',
  title: 'Julius Caesar assassinated',
  start: -44,
  end: null,
  dateLabel: '15 March 44 BC',
  region: 'europe',
  category: 'politics',
  location: { name: 'Rome', lat: 41.9, lng: 12.48 },
  importance: 3,
  ...text,
};
const state = { id: 'han', kind: 'state', title: 'Han dynasty', start: -206, end: 220, region: 'east-asia', ...text };
const period = { id: 'punic-war', kind: 'period', title: 'First Punic War', start: -264, end: -241, region: 'europe', ...text };

const file = (name: string, ...records: unknown[]): DataFile => ({ file: `timeline/${name}`, records });
const errorsFor = (...records: unknown[]) => validateData([file('1000bc-1bc.json', ...records)]).join('\n');

describe('validateData', () => {
  it('accepts a moment, a state, a plain period and a period with a place', () => {
    const placed = { ...period, id: 'placed', category: 'politics', importance: 2, location: moment.location };
    expect(errorsFor(moment, state, period, placed)).toBe('');
  });

  it('rejects year 0 with a clear message', () => {
    const errors = validateData([file('ad1-ad1000.json', { ...moment, start: 0 })]);
    expect(errors.join('\n')).toMatch(/caesar-assassination start: year 0 does not exist/);
  });

  it('rejects a moment that has an end year', () => {
    expect(errorsFor({ ...moment, end: -40 })).toMatch(/caesar-assassination end/);
  });

  it('rejects a state or period without an end year, or one that ends before it starts', () => {
    expect(errorsFor({ ...state, end: null })).toMatch(/han end/);
    expect(errorsFor({ ...period, end: undefined })).toMatch(/punic-war end/);
    expect(errorsFor({ ...period, end: -300 })).toMatch(/punic-war end: end must be after start/);
  });

  it('rejects a moment without a place, category or importance', () => {
    const { location: _location, ...nowhere } = moment;
    expect(errorsFor(nowhere)).toMatch(/caesar-assassination location/);
  });

  it('rejects a period with only some of location, category and importance', () => {
    expect(errorsFor({ ...period, location: moment.location })).toMatch(/together, or none/);
  });

  it('rejects a state with a place', () => {
    expect(errorsFor({ ...state, location: moment.location })).toMatch(/han/);
  });

  it('rejects an entry without a summary, significance or Wikipedia link', () => {
    for (const field of ['summary', 'significance', 'wikipedia']) {
      expect(errorsFor({ ...state, [field]: undefined })).toMatch(new RegExp(`han ${field}`));
    }
  });

  it('rejects unknown kinds, unknown regions and extra fields', () => {
    expect(errorsFor({ ...state, kind: 'empire' })).toMatch(/han kind/);
    const errors = validateData([file('1000bc-1bc.json', { ...moment, region: 'atlantis', colour: 'red' })]);
    expect(errors.some((e) => e.includes('region'))).toBe(true);
    expect(errors.some((e) => e.includes('colour'))).toBe(true);
  });

  it('accepts a link to a state or period the entry overlaps', () => {
    const republic = { id: 'roman-republic', kind: 'state', title: 'Roman Republic', start: -509, end: -27, region: 'europe', ...text };
    expect(errorsFor(republic, { ...moment, partOf: ['roman-republic'] }, { ...period, partOf: ['roman-republic'] })).toBe('');
  });

  it('rejects a link to a missing entry, a moment, itself, a repeat, or something from another time', () => {
    expect(errorsFor({ ...moment, partOf: ['nowhere'] })).toMatch(/caesar-assassination partOf: no entry has the id "nowhere"/);
    expect(errorsFor(moment, { ...period, partOf: ['caesar-assassination'] })).toMatch(/punic-war partOf: "caesar-assassination" is a moment/);
    expect(errorsFor({ ...period, partOf: ['punic-war'] })).toMatch(/cannot be part of itself/);
    expect(errorsFor(period, { ...moment, start: -250, partOf: ['punic-war', 'punic-war'] })).toMatch(/"punic-war" is listed twice/);
    expect(errorsFor(period, { ...moment, partOf: ['punic-war'] })).toMatch(/do not overlap those of "punic-war" \(264 BC to 241 BC\)/);
    expect(errorsFor({ ...moment, partOf: [] })).toMatch(/partOf/);
    expect(errorsFor({ ...state, partOf: ['punic-war'] })).toMatch(/Unrecognized key/);
  });

  it('rejects duplicate ids, across files and across kinds', () => {
    const errors = validateData([
      file('1000bc-1bc.json', moment, { ...state, id: 'caesar-assassination' }),
      file('ad1-ad1000.json', { ...moment, start: 14 }),
    ]);
    expect(errors.filter((e) => e.includes('duplicate id "caesar-assassination"'))).toHaveLength(2);
  });

  it('rejects an entry stored in the wrong millennium file', () => {
    const errors = validateData([file('ad1-ad1000.json', moment)]);
    expect(errors.join('\n')).toMatch(/belongs in a file covering/);
  });

  it('rejects unknown file names and non-array files', () => {
    const errors = validateData([file('misc.json', moment), { file: 'timeline/ad1-ad1000.json', records: {} }]);
    expect(errors.join('\n')).toMatch(/timeline\/misc.json: unknown timeline file/);
    expect(errors.join('\n')).toMatch(/ad1-ad1000.json: expected an array/);
  });

  it('passes on the real data in data/', () => {
    expect(validateData(loadDataFiles())).toEqual([]);
  });
});
