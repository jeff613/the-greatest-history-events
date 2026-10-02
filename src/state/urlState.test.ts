import { describe, expect, it } from 'vitest';
import { MAX_ZOOM, yearToU } from '../lib/timeScale';
import { DEFAULT_YEAR, parseUrlState, serializeUrlState } from './urlState';

const known: Record<string, { year: number }> = { 'caesar-assassination': { year: -44 } };
const lookup = (id: string) => known[id];

describe('parseUrlState', () => {
  it('uses defaults for an empty query', () => {
    expect(parseUrlState('', lookup)).toEqual({
      year: DEFAULT_YEAR,
      view: { zoom: 1, center: 0.5 },
      selectedEventId: null,
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

  it('ignores unknown events and shows the year', () => {
    expect(parseUrlState('?year=300&event=nope', lookup)).toMatchObject({ year: 300, selectedEventId: null });
  });

  it('opens a known event at its own year when no year is given', () => {
    expect(parseUrlState('?event=caesar-assassination', lookup)).toMatchObject({
      year: -44,
      selectedEventId: 'caesar-assassination',
    });
  });

  it('lets an explicit year win over the event year', () => {
    expect(parseUrlState('?year=-40&event=caesar-assassination', lookup).year).toBe(-40);
  });
});

describe('serializeUrlState', () => {
  it('omits default zoom and missing event', () => {
    expect(serializeUrlState({ year: -44, view: { zoom: 1, center: 0.5 }, selectedEventId: null })).toBe(
      '?year=-44',
    );
  });
  it('writes zoom compactly and the event', () => {
    expect(
      serializeUrlState({ year: -44, view: { zoom: 2.5, center: 0.4 }, selectedEventId: 'caesar-assassination' }),
    ).toBe('?year=-44&zoom=2.5&event=caesar-assassination');
  });
  it('round-trips through parse', () => {
    const state = parseUrlState('?year=1066&zoom=3&event=caesar-assassination', lookup);
    expect(parseUrlState(serializeUrlState(state), lookup)).toEqual(state);
  });
});
