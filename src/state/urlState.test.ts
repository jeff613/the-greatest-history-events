import { describe, expect, it } from 'vitest';
import { MAX_ZOOM, yearToU } from '../lib/timeScale';
import { DEFAULT_YEAR, parseUrlState, serializeUrlState } from './urlState';

const known: Record<string, { id: string; start: number }> = {
  'caesar-assassination': { id: 'caesar-assassination', start: -44 },
  han: { id: 'han', start: -206 },
  // A founding moment that was folded into its state resolves to the state.
  'ming-dynasty-founded': { id: 'ming', start: 1368 },
};
const lookup = (id: string) => known[id];

describe('parseUrlState', () => {
  it('uses defaults for an empty query', () => {
    expect(parseUrlState('', lookup)).toEqual({
      year: DEFAULT_YEAR,
      view: { zoom: 1, center: 0.5 },
      selectedId: null,
    });
  });

  it('reads year and zoom and centers the view on the year', () => {
    const s = parseUrlState('?year=-44&zoom=4', lookup);
    expect(s.year).toBe(-44);
    expect(s.view.zoom).toBe(4);
    expect(s.view.center).toBeCloseTo(yearToU(-44));
  });

  it('falls back safely on garbage', () => {
    expect(parseUrlState('?year=abc', lookup).year).toBe(DEFAULT_YEAR);
    expect(parseUrlState('?year=', lookup).year).toBe(DEFAULT_YEAR);
    expect(parseUrlState('?year=0', lookup).year).toBe(1);
    expect(parseUrlState('?year=99999', lookup).year).toBe(2000);
    expect(parseUrlState('?year=-12.4', lookup).year).toBe(-12);
    expect(parseUrlState('?zoom=-5', lookup).view.zoom).toBe(1);
    expect(parseUrlState('?zoom=abc', lookup).view.zoom).toBe(1);
    expect(parseUrlState('?zoom=1e9', lookup).view.zoom).toBe(MAX_ZOOM);
  });

  it('ignores unknown ids and shows the year', () => {
    expect(parseUrlState('?year=300&item=nope', lookup)).toMatchObject({ year: 300, selectedId: null });
  });

  it('opens a known entry of any kind at its own start when no year is given', () => {
    expect(parseUrlState('?item=caesar-assassination', lookup)).toMatchObject({ year: -44, selectedId: 'caesar-assassination' });
    expect(parseUrlState('?item=han', lookup)).toMatchObject({ year: -206, selectedId: 'han' });
  });

  it('still reads links that use the older event parameter', () => {
    expect(parseUrlState('?event=caesar-assassination', lookup).selectedId).toBe('caesar-assassination');
  });

  it('opens the state for a link to a founding moment that was folded into it', () => {
    expect(parseUrlState('?event=ming-dynasty-founded', lookup)).toMatchObject({ year: 1368, selectedId: 'ming' });
  });

  it('lets an explicit year win over the entry start', () => {
    expect(parseUrlState('?year=-40&item=caesar-assassination', lookup).year).toBe(-40);
  });
});

describe('serializeUrlState', () => {
  it('omits default zoom and a missing selection', () => {
    expect(serializeUrlState({ year: -44, view: { zoom: 1, center: 0.5 }, selectedId: null })).toBe(
      '?year=-44',
    );
  });
  it('writes zoom compactly and the selection', () => {
    expect(
      serializeUrlState({ year: -44, view: { zoom: 2.5, center: 0.4 }, selectedId: 'caesar-assassination' }),
    ).toBe('?year=-44&zoom=2.5&item=caesar-assassination');
  });
  it('round-trips through parse', () => {
    const state = parseUrlState('?year=1066&zoom=3&item=caesar-assassination', lookup);
    expect(parseUrlState(serializeUrlState(state), lookup)).toEqual(state);
  });
});
