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

/** Earth pigments that read well at ~55% opacity on the papyrus base map. */
export const POLITY_PALETTE = [
  '#a84a2a', // red ochre
  '#c9962e', // yellow ochre
  '#5f8f6a', // malachite
  '#3f6f9a', // Egyptian blue
  '#7a4f2a', // umber
  '#8a3a52', // madder
  '#6b5a8a', // orchil purple
  '#7f8f3a', // green earth
  '#c26a3a', // terracotta
  '#4a8a8a', // verdigris
  '#b08a5a', // raw sienna
  '#5a5a4a', // charcoal
] as const;

/** Some source names contain only spaces; preserve the recorded ruling polity as a fallback. */
export function territoryName(props: { NAME?: string | null; SUBJECTO?: string | null }): string {
  return props.NAME?.trim() || props.SUBJECTO?.trim() || 'Name unavailable';
}

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

/** Snapshots kept in memory: the current one, its prefetched neighbors, and a few recent ones. */
const CACHE_SIZE = 6;

/**
 * Caching loader where only the most recent `load` call wins: earlier calls resolve to
 * null once a newer one (or `invalidate`) has happened, so out-of-order responses are ignored.
 * The cache keeps the CACHE_SIZE most recently used keys, but never drops the latest load's key.
 */
export function createLatestLoader<T>(fetcher: (key: string) => Promise<T>) {
  /** In least-recently-used-first order: a hit is moved to the end. */
  const cache = new Map<string, Promise<T>>();
  let token = 0;
  let latestKey: string | null = null;

  const get = (key: string): Promise<T> => {
    let promise = cache.get(key);
    if (promise) {
      cache.delete(key);
    } else {
      const fetched = fetcher(key);
      promise = fetched;
      fetched.catch(() => {
        if (cache.get(key) === fetched) cache.delete(key);
      });
    }
    cache.set(key, promise);
    for (const old of cache.keys()) {
      if (cache.size <= CACHE_SIZE) break;
      if (old !== latestKey) cache.delete(old);
    }
    return promise;
  };

  return {
    async load(key: string): Promise<T | null> {
      const mine = ++token;
      latestKey = key;
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
      latestKey = null;
    },
    prefetch(key: string): void {
      get(key).catch(() => {});
    },
  };
}
