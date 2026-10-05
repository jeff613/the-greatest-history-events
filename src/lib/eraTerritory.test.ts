import { describe, expect, it } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { ENTRIES_BY_ID } from '../data';
import { territoryFor } from './eraTerritory';

const geo: FeatureCollection = {
  type: 'FeatureCollection',
  features: ['Han Empire', 'Han', 'Han Zhao', 'Rome'].map((NAME) => ({
    type: 'Feature', properties: { NAME }, geometry: { type: 'Polygon', coordinates: [] },
  })),
};

describe('era territory matching', () => {
  it('matches known aliases without selecting similarly named successor states', () => {
    const territory = territoryFor(geo, ENTRIES_BY_ID.get('han')!);
    expect(territory.features.map((feature) => feature.properties?.NAME)).toEqual(['Han Empire', 'Han']);
  });
  it('includes dependent territories when their subject polity matches', () => {
    const colony: FeatureCollection = { type: 'FeatureCollection', features: [{
      type: 'Feature', properties: { NAME: 'British Raj', SUBJECTO: 'UK' },
      geometry: { type: 'Polygon', coordinates: [] },
    }] };
    expect(territoryFor(colony, ENTRIES_BY_ID.get('british-empire')!).features).toHaveLength(1);
  });
  it('returns no territory for an era without a matching shape', () => {
    expect(territoryFor(geo, ENTRIES_BY_ID.get('viking-age')!).features).toHaveLength(0);
  });
});
