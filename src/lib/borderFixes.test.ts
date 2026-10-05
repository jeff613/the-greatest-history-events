import { describe, expect, it } from 'vitest';
import { fixLabel, LABEL_FIXES } from './borderFixes';

describe('fixLabel', () => {
  it('renames a polity that is mislabeled for its snapshot year', () => {
    expect(fixLabel(700, { NAME: 'Sui Empire', SUBJECTO: 'Sui Empire' })).toEqual({
      NAME: 'Tang Empire',
      SUBJECTO: 'Tang Empire',
    });
  });
  it('leaves the same name alone in snapshots where it is right', () => {
    const sui = { NAME: 'Sui Empire', SUBJECTO: 'Sui Empire' };
    expect(fixLabel(600, sui)).toBe(sui);
  });
  it('keeps the recorded ruler when only the name is corrected', () => {
    expect(fixLabel(1914, { NAME: 'Botswana', SUBJECTO: 'United Kingdom of Great Britain and Ireland' })).toEqual({
      NAME: 'Bechuanaland',
      SUBJECTO: 'United Kingdom of Great Britain and Ireland',
    });
  });
  it('sets the ruler when the fix names one', () => {
    expect(fixLabel(1945, { NAME: 'Sri Lanka', SUBJECTO: 'Sri Lanka' })).toEqual({ NAME: 'Ceylon', SUBJECTO: 'United Kingdom' });
  });
  it('matches source names with stray whitespace and keeps other properties', () => {
    expect(fixLabel(-1500, { NAME: ' Zhoa ', SUBJECTO: null, BORDERPRECISION: 1 })).toEqual({
      NAME: 'Shang',
      SUBJECTO: 'Shang',
      BORDERPRECISION: 1,
    });
  });
  it('never contains a fix that changes nothing', () => {
    for (const fixes of Object.values(LABEL_FIXES)) {
      for (const [from, to] of Object.entries(fixes)) {
        if (typeof to === 'string') expect(to).not.toBe(from);
      }
    }
  });
});
