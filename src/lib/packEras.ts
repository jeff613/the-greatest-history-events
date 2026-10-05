import { REGIONS, type Bar, type Region } from '../data/schema';

export interface Lane {
  region: Region;
  rows: Bar[][];
}

/** Greedy interval packing: each era goes in the first row where it does not overlap. */
export function packEras(eras: Bar[]): Lane[] {
  return REGIONS.flatMap((region) => {
    const sorted = eras
      .filter((e) => e.region === region)
      .sort((a, b) => a.start - b.start || a.end - b.end);
    const rows: Bar[][] = [];
    for (const era of sorted) {
      const row = rows.find((r) => r[r.length - 1].end <= era.start);
      if (row) row.push(era);
      else rows.push([era]);
    }
    return rows.length > 0 ? [{ region, rows }] : [];
  });
}
