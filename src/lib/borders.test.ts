import { describe, expect, it, vi } from 'vitest';
import {
  createLatestLoader,
  neighborSnapshots,
  POLITY_PALETTE,
  polityColor,
  polityKey,
  snapshotFor,
  type Snapshot,
} from './borders';

const index: Snapshot[] = [
  { year: -2000, file: 'a.geojson' },
  { year: -1500, file: 'b.geojson' },
  { year: -1, file: 'c.geojson' },
  { year: 100, file: 'd.geojson' },
];

describe('snapshotFor', () => {
  it('returns the latest snapshot at or before the year', () => {
    expect(snapshotFor(index, -2000)?.file).toBe('a.geojson');
    expect(snapshotFor(index, -1600)?.file).toBe('a.geojson');
    expect(snapshotFor(index, -1500)?.file).toBe('b.geojson');
    expect(snapshotFor(index, 50)?.file).toBe('c.geojson');
    expect(snapshotFor(index, 2000)?.file).toBe('d.geojson');
  });
  it('returns null before the first snapshot or with no index', () => {
    expect(snapshotFor(index, -2500)).toBeNull();
    expect(snapshotFor([], 100)).toBeNull();
  });
});

describe('neighborSnapshots', () => {
  it('returns the snapshots on either side of the current one', () => {
    expect(neighborSnapshots(index, -1600).map((s) => s.file)).toEqual(['b.geojson']);
    expect(neighborSnapshots(index, 50).map((s) => s.file)).toEqual(['b.geojson', 'd.geojson']);
    expect(neighborSnapshots(index, 2000).map((s) => s.file)).toEqual(['c.geojson']);
  });
});

describe('polity colors', () => {
  it('prefers the overlord (SUBJECTO) so colonies share the empire color', () => {
    expect(polityKey({ NAME: 'British India', SUBJECTO: 'United Kingdom' })).toBe('United Kingdom');
    expect(polityKey({ NAME: 'Roman Empire', SUBJECTO: null })).toBe('Roman Empire');
  });
  it('is stable and always from the palette', () => {
    for (const name of ['Roman Empire', 'Han Empire', 'Maurya Empire', '']) {
      expect(polityColor(name)).toBe(polityColor(name));
      expect(POLITY_PALETTE).toContain(polityColor(name));
    }
  });
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('createLatestLoader', () => {
  it('superseded loads resolve to null, even if they finish last', async () => {
    const pending = { x: deferred<string>(), y: deferred<string>() };
    const loader = createLatestLoader((key) => pending[key as 'x' | 'y'].promise);
    const first = loader.load('x');
    const second = loader.load('y');
    pending.y.resolve('Y');
    pending.x.resolve('X');
    expect(await second).toBe('Y');
    expect(await first).toBeNull();
  });

  it('invalidate drops pending loads', async () => {
    const d = deferred<string>();
    const loader = createLatestLoader(() => d.promise);
    const load = loader.load('x');
    loader.invalidate();
    d.resolve('X');
    expect(await load).toBeNull();
  });

  it('fetches each key once and retries after a failure', async () => {
    const fetcher = vi.fn<(key: string) => Promise<string>>();
    fetcher.mockRejectedValueOnce(new Error('offline')).mockResolvedValue('ok');
    const loader = createLatestLoader(fetcher);
    await expect(loader.load('x')).rejects.toThrow('offline');
    expect(await loader.load('x')).toBe('ok');
    expect(await loader.load('x')).toBe('ok');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('keeps only the 6 most recently used snapshots', async () => {
    const fetcher = vi.fn((key: string) => Promise.resolve(key.toUpperCase()));
    const loader = createLatestLoader(fetcher);
    for (const key of ['a', 'b', 'c', 'd', 'e', 'f']) await loader.load(key);
    await loader.load('a'); // a becomes the most recently used, so b is now the oldest
    await loader.load('g');
    expect(fetcher).toHaveBeenCalledTimes(7);
    expect(await loader.load('a')).toBe('A');
    expect(fetcher).toHaveBeenCalledTimes(7);
    expect(await loader.load('b')).toBe('B');
    expect(fetcher).toHaveBeenCalledTimes(8);
    expect(fetcher).toHaveBeenLastCalledWith('b');
  });

  it('never evicts the pending load of the latest request', async () => {
    const d = deferred<string>();
    const fetcher = vi.fn((key: string) => (key === 'x' ? d.promise : Promise.resolve(key)));
    const loader = createLatestLoader(fetcher);
    const pending = loader.load('x');
    for (const key of ['a', 'b', 'c', 'd', 'e', 'f']) loader.prefetch(key);
    d.resolve('X');
    expect(await pending).toBe('X');
    expect(await loader.load('x')).toBe('X');
    expect(fetcher.mock.calls.filter(([key]) => key === 'x')).toHaveLength(1);
  });

  it('a superseded failure resolves to null instead of throwing', async () => {
    const d = deferred<string>();
    const loader = createLatestLoader((key) => (key === 'x' ? d.promise : Promise.resolve('Y')));
    const first = loader.load('x');
    await loader.load('y');
    d.reject(new Error('late failure'));
    expect(await first).toBeNull();
  });
});
