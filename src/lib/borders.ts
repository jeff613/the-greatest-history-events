export interface Snapshot {
  year: number;
  file: string;
}

export function snapshotFor(index: Snapshot[], year: number): Snapshot | null {
  let found: Snapshot | null = null;
  for (const s of index) {
    if (s.year > year) break;
    found = s;
  }
  return found;
}

export function neighborSnapshots(index: Snapshot[], year: number): Snapshot[] {
  const current = snapshotFor(index, year);
  const i = current ? index.indexOf(current) : -1;
  return [index[i - 1], index[i + 1]].filter((s): s is Snapshot => s !== undefined);
}

/** Muted colors that read well at ~50% opacity on the dark base map. */
export const POLITY_PALETTE = [
  '#c96f5b',
  '#d6a35b',
  '#b9b65a',
  '#7fae6b',
  '#5ea79a',
  '#5c8fc0',
  '#7f78c7',
  '#b06fae',
  '#c8758f',
  '#9c8a6e',
  '#6f9a7d',
  '#a3865c',
] as const;

export function polityKey(props: { NAME: string | null; SUBJECTO: string | null }): string {
  return props.SUBJECTO || props.NAME || '';
}

/** FNV-1a hash into the palette, so a polity keeps its color across snapshots. */
export function polityColor(key: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return POLITY_PALETTE[(hash >>> 0) % POLITY_PALETTE.length];
}

/**
 * Caching loader where only the most recent `load` call wins: earlier calls resolve to
 * null once a newer one (or `invalidate`) has happened, so out-of-order responses are ignored.
 */
export function createLatestLoader<T>(fetcher: (key: string) => Promise<T>) {
  const cache = new Map<string, Promise<T>>();
  let token = 0;

  const get = (key: string): Promise<T> => {
    let promise = cache.get(key);
    if (!promise) {
      promise = fetcher(key);
      cache.set(key, promise);
      promise.catch(() => cache.delete(key));
    }
    return promise;
  };

  return {
    async load(key: string): Promise<T | null> {
      const mine = ++token;
      try {
        const value = await get(key);
        return mine === token ? value : null;
      } catch (err) {
        if (mine !== token) return null;
        throw err;
      }
    },
    invalidate(): void {
      token++;
    },
    prefetch(key: string): void {
      get(key).catch(() => {});
    },
  };
}
