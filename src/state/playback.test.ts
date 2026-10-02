import { describe, expect, it } from 'vitest';
import { advancePlayback, PLAY_RATE, playbackStart } from './playback';

describe('playback', () => {
  it('restarts from the beginning when started at the end', () => {
    expect(playbackStart(1)).toBe(0);
    expect(playbackStart(0.3)).toBe(0.3);
  });
  it('moves at the same on-screen speed regardless of zoom', () => {
    expect(advancePlayback(0.5, 0.05, 1).u).toBeCloseTo(0.5 + 0.05 * PLAY_RATE);
    expect(advancePlayback(0.5, 0.05, 2).u).toBeCloseTo(0.5 + (0.05 * PLAY_RATE) / 2);
  });
  it('ignores long frames such as a backgrounded tab', () => {
    expect(advancePlayback(0.5, 10, 1).u).toBeCloseTo(0.5 + 0.1 * PLAY_RATE);
  });
  it('stops exactly at the end', () => {
    expect(advancePlayback(0.999, 0.1, 1)).toEqual({ u: 1, done: true });
    expect(advancePlayback(0.5, 0.05, 1).done).toBe(false);
  });
});
