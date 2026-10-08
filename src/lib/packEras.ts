import { REGIONS, type Bar, type Region } from '../data/schema';

export interface Lane {
  region: Region;
  rows: Bar[][];
}

// Presentation groups within East Asia, independent of language and visible filters.
// Cross-border conflicts sit with their main setting; these are not territory claims.
const EAST_ASIA_GROUPS = [
  ['xia', 'shang', 'zhou', 'spring-and-autumn', 'warring-states-china', 'hundred-schools', 'qin', 'han',
    'three-kingdoms', 'jin-dynasty', 'northern-wei', 'northern-and-southern-dynasties',
    'sui', 'tang', 'xuanzang-journey', 'an-lushan-rebellion', 'five-dynasties', 'liao',
    'song', 'western-xia', 'jin-jurchen', 'yuan', 'marco-polo-in-china', 'ming',
    'zheng-he-voyages', 'qing', 'self-strengthening-movement', 'high-qing', 'first-opium-war', 'taiping-rebellion',
    'second-opium-war', 'first-sino-japanese-war', 'boxer-rebellion', 'russo-japanese-war',
    'republic-of-china', 'chinese-civil-war', 'manchukuo', 'long-march',
    'second-sino-japanese-war', 'prc', 'taiwan-roc', 'great-leap-forward', 'cultural-revolution'],
  ['yamato', 'nara-period', 'heian', 'genpei-war', 'kamakura-shogunate',
    'mongol-invasions-of-japan', 'ashikaga-shogunate', 'onin-war', 'sengoku',
    'azuchi-momoyama', 'tokugawa', 'sakoku', 'empire-of-japan', 'meiji',
    'postwar-japan', 'japanese-economic-miracle'],
  ['gojoseon', 'silla', 'goguryeo', 'baekje', 'balhae', 'goryeo', 'joseon',
    'imjin-war', 'korea-under-japanese-rule', 'north-korea', 'south-korea', 'korean-war'],
].map((ids) => new Set(ids));

/** Pack non-overlapping eras together, keeping East Asia's histories in adjacent rows. */
export function packEras(eras: Bar[]): Lane[] {
  return REGIONS.flatMap((region) => {
    const sorted = eras
      .filter((e) => e.region === region)
      .sort((a, b) => a.start - b.start || a.end - b.end);
    const groups = region === 'east-asia'
      ? [...EAST_ASIA_GROUPS.map((ids) => sorted.filter((era) => ids.has(era.id))),
        sorted.filter((era) => !EAST_ASIA_GROUPS.some((ids) => ids.has(era.id)))]
      : [sorted];
    const rows = groups.flatMap((group) => {
      const packed: Bar[][] = [];
      for (const era of group) {
        const row = packed.find((r) => r[r.length - 1].end <= era.start);
        if (row) row.push(era);
        else packed.push([era]);
      }
      return packed;
    });
    return rows.length > 0 ? [{ region, rows }] : [];
  });
}
