/** A marker on a lane's moments line: a moment's diamond, or the pill of a period too short to carry its name. */
export interface Marker {
  id: string;
  /** Center, in pixels along the lane. */
  x: number;
  halfWidth: number;
  label: string;
  importance: 1 | 2 | 3;
}

/** Beside the marker on its line, or centered in the first or second row above it. */
export type LabelSide = 'right' | 'left' | 'above' | 'top';

/** The least important moments worth drawing when the strip shows this many years. */
export function minImportance(visibleYears: number): 1 | 2 | 3 {
  if (visibleYears > 1500) return 3;
  if (visibleYears > 300) return 2;
  return 1;
}

const GAP = 4;
type Box = [left: number, right: number];
const collides = (box: Box, others: Box[]) => others.some(([l, r]) => box[0] < r + GAP && box[1] > l - GAP);

/**
 * Decides which markers get a label and where. Most important first, then earliest, so that the
 * labels do not change as the playhead moves: beside the marker (right, then left) if that stretch of the line is free of other markers and
 * labels, otherwise centered above it in the first of the two rows that is free, otherwise no label.
 */
export function placeLabels(markers: Marker[], width: number, charWidth: number): Map<string, LabelSide> {
  const placed = new Map<string, LabelSide>();
  const beside: Box[] = [];
  const rows: Record<'above' | 'top', Box[]> = { above: [], top: [] };
  const bodies = new Map(markers.map((m): [string, Box] => [m.id, [m.x - m.halfWidth, m.x + m.halfWidth]]));
  const order = [...markers].sort((a, b) => b.importance - a.importance || a.x - b.x);
  for (const m of order) {
    const w = m.label.length * charWidth;
    const others = [...bodies].filter(([id]) => id !== m.id).map(([, box]) => box);
    const right: Box = [m.x + m.halfWidth + GAP, m.x + m.halfWidth + GAP + w];
    const left: Box = [m.x - m.halfWidth - GAP - w, m.x - m.halfWidth - GAP];
    const aboveLeft = Math.min(Math.max(0, m.x - w / 2), Math.max(0, width - w));
    const over: Box = [aboveLeft, aboveLeft + w];
    if (right[1] <= width && !collides(right, others) && !collides(right, beside)) {
      beside.push(right);
      placed.set(m.id, 'right');
    } else if (left[0] >= 0 && !collides(left, others) && !collides(left, beside)) {
      beside.push(left);
      placed.set(m.id, 'left');
    } else {
      const row = (['above', 'top'] as const).find((r) => !collides(over, rows[r]));
      if (row) {
        rows[row].push(over);
        placed.set(m.id, row);
      }
    }
  }
  return placed;
}

/** Where a label placed by `placeLabels` starts and ends, for drawing it. */
export function labelSpan(m: Marker, side: LabelSide, width: number, charWidth: number): Box {
  const w = m.label.length * charWidth;
  if (side === 'right') return [m.x + m.halfWidth + GAP, m.x + m.halfWidth + GAP + w];
  if (side === 'left') return [m.x - m.halfWidth - GAP - w, m.x - m.halfWidth - GAP];
  const left = Math.min(Math.max(0, m.x - w / 2), Math.max(0, width - w));
  return [left, left + w];
}
