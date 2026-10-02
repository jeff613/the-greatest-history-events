import { describe, expect, it } from 'vitest';
import {
  addYears,
  clampYear,
  formatSpan,
  formatYear,
  fromAstronomical,
  MAX_YEAR,
  MIN_YEAR,
  toAstronomical,
  yearDiff,
} from './years';

describe('formatYear', () => {
  it('formats BC years', () => {
    expect(formatYear(-44)).toBe('44 BC');
    expect(formatYear(-2000)).toBe('2000 BC');
  });
  it('prefixes AD below 1000', () => {
    expect(formatYear(1)).toBe('AD 1');
    expect(formatYear(476)).toBe('AD 476');
    expect(formatYear(999)).toBe('AD 999');
  });
  it('uses a plain number from 1000 on', () => {
    expect(formatYear(1000)).toBe('1000');
    expect(formatYear(1492)).toBe('1492');
  });
});

describe('formatSpan', () => {
  it('returns a single year when there is no end', () => {
    expect(formatSpan(-44, null)).toBe('44 BC');
  });
  it('joins two BC years with one suffix', () => {
    expect(formatSpan(-431, -404)).toBe('431-404 BC');
  });
  it('joins AD years with one prefix', () => {
    expect(formatSpan(618, 907)).toBe('AD 618-907');
    expect(formatSpan(960, 1279)).toBe('AD 960-1279');
    expect(formatSpan(1914, 1918)).toBe('1914-1918');
  });
  it('spells out both eras across the boundary', () => {
    expect(formatSpan(-27, 476)).toBe('27 BC - AD 476');
    expect(formatSpan(-221, 1912)).toBe('221 BC - 1912');
  });
});

describe('astronomical conversion', () => {
  it('maps 1 BC to 0 and back', () => {
    expect(toAstronomical(-1)).toBe(0);
    expect(toAstronomical(1)).toBe(1);
    expect(fromAstronomical(0)).toBe(-1);
  });
  it('round-trips every year in range', () => {
    for (let y = MIN_YEAR; y <= MAX_YEAR; y++) {
      if (y === 0) continue;
      expect(fromAstronomical(toAstronomical(y))).toBe(y);
    }
  });
});

describe('yearDiff and addYears', () => {
  it('skip the missing year zero', () => {
    expect(yearDiff(-1, 1)).toBe(1);
    expect(yearDiff(-44, 14)).toBe(57);
    expect(yearDiff(1, -1)).toBe(-1);
    expect(addYears(-1, 1)).toBe(1);
    expect(addYears(1, -1)).toBe(-1);
    expect(addYears(-5, 10)).toBe(6);
  });
});

describe('clampYear', () => {
  it('clamps to the range and replaces zero', () => {
    expect(clampYear(-5000)).toBe(-2000);
    expect(clampYear(3000)).toBe(2000);
    expect(clampYear(0)).toBe(1);
    expect(clampYear(-0.3)).toBe(1);
    expect(clampYear(12.6)).toBe(13);
  });
});
