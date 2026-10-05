import { describe, expect, it } from 'vitest';
import { labelSpan, minImportance, placeLabels, type Marker } from './momentLayout';

const CHAR = 6;
const WIDTH = 1000;
const marker = (id: string, x: number, extra: Partial<Marker> = {}): Marker => ({
  id, x, halfWidth: 5, label: 'Ten chars!', importance: 2, ...extra,
});
const overlaps = (a: [number, number], b: [number, number]) => a[0] < b[1] && a[1] > b[0];

describe('minImportance', () => {
  it('draws only world-changing moments when zoomed far out, and everything when close', () => {
    expect(minImportance(4000)).toBe(3);
    expect(minImportance(1501)).toBe(3);
    expect(minImportance(1500)).toBe(2);
    expect(minImportance(500)).toBe(2);
    expect(minImportance(300)).toBe(1);
    expect(minImportance(100)).toBe(1);
  });
});

describe('placeLabels', () => {
  it('labels a lone marker on its right', () => {
    expect(placeLabels([marker('a', 100)], WIDTH, CHAR).get('a')).toBe('right');
  });

  it('flips the label to the left at the right edge and keeps it inside the strip', () => {
    const m = marker('a', WIDTH - 10);
    const side = placeLabels([m], WIDTH, CHAR).get('a')!;
    expect(side).toBe('left');
    const [left, right] = labelSpan(m, side, WIDTH, CHAR);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(WIDTH);
  });

  it('keeps a label inside the strip when the marker is at the left edge with a neighbor on its right', () => {
    const markers = [marker('a', 2), marker('b', 30)];
    const placed = placeLabels(markers, WIDTH, CHAR);
    for (const m of markers) {
      const side = placed.get(m.id);
      if (side) expect(labelSpan(m, side, WIDTH, CHAR)[0]).toBeGreaterThanOrEqual(0);
    }
  });

  it('never lets a label cover another marker or another label in its row', () => {
    const markers = [marker('a', 100), marker('b', 130), marker('c', 160), marker('d', 400), marker('e', 420)];
    const placed = placeLabels(markers, WIDTH, CHAR);
    const spans = markers.flatMap((m) => {
      const side = placed.get(m.id);
      return side ? [{ m, side, span: labelSpan(m, side, WIDTH, CHAR) }] : [];
    });
    for (const a of spans) {
      if (a.side === 'right' || a.side === 'left') {
        for (const m of markers) if (m.id !== a.m.id) expect(overlaps(a.span, [m.x - m.halfWidth, m.x + m.halfWidth])).toBe(false);
      }
      for (const b of spans) {
        const row = (side: string) => (side === 'right' || side === 'left' ? 'line' : side);
        if (a !== b && row(a.side) === row(b.side)) expect(overlaps(a.span, b.span)).toBe(false);
      }
    }
    expect(placed.size).toBeGreaterThanOrEqual(3);
  });

  it('labels two markers that share a position without overlapping', () => {
    const markers = [marker('ussr', 500), marker('web', 509)];
    const placed = placeLabels(markers, WIDTH, CHAR);
    expect(placed.size).toBe(2);
    const [a, b] = markers.map((m) => ({ side: placed.get(m.id)!, span: labelSpan(m, placed.get(m.id)!, WIDTH, CHAR) }));
    expect(overlaps(a.span, b.span)).toBe(false);
  });

  it('gives a contested spot to the more important marker, then to the earlier one', () => {
    // On a strip this narrow labels only fit above; the first row goes to whoever is placed first.
    const pair = (a: Partial<Marker>, b: Partial<Marker>) => placeLabels([marker('a', 20, a), marker('b', 60, b)], 80, CHAR);
    expect(pair({ importance: 1 }, { importance: 3 }).get('b')).toBe('above');
    expect(pair({ importance: 3 }, { importance: 1 }).get('a')).toBe('above');
    expect(pair({}, {}).get('a')).toBe('above');
    expect(pair({}, {}).get('b')).toBe('top');
  });

  it('leaves a marker unlabelled when the line and both rows above are taken', () => {
    const crowd = [marker('a', 20), marker('b', 40), marker('c', 60)];
    expect(placeLabels(crowd, 80, CHAR).size).toBe(2);
  });
});
