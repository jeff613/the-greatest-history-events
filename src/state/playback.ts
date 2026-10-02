/** Fraction of the visible strip the playhead crosses per second (about 40 s per screen). */
export const PLAY_RATE = 0.025;
const MAX_FRAME_SEC = 0.1;

export function playbackStart(u: number): number {
  return u >= 1 ? 0 : u;
}

export function advancePlayback(u: number, dtSec: number, zoom: number): { u: number; done: boolean } {
  const next = Math.min(1, u + (Math.min(dtSec, MAX_FRAME_SEC) * PLAY_RATE) / zoom);
  return { u: next, done: next >= 1 };
}
