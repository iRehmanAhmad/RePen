import { describe, expect, it } from 'vitest';
import { addSpeedRange, addTrimRange, removeTimedRegionById, splitTimedRegion } from '../../src/shared/editor/timelineEdits';

describe('timeline edit rules', () => {
  it('clamps and merges overlapping trim ranges so playback has one deterministic skip region', () => {
    expect(addTrimRange([{ id: 'a', startMs: 100, endMs: 300 }], 250, 600, 1000))
      .toEqual([{ id: 'a', startMs: 100, endMs: 600 }]);
    expect(addTrimRange([], -50, 1500, 1000)).toMatchObject([{ startMs: 0, endMs: 1000 }]);
  });

  it('splits only inside a timed region', () => {
    expect(splitTimedRegion({ id: 'caption', startMs: 100, endMs: 300 }, 200))
      .toEqual([{ id: 'caption', startMs: 100, endMs: 200 }, { id: 'caption-split-200', startMs: 200, endMs: 300 }]);
    expect(splitTimedRegion({ id: 'caption', startMs: 100, endMs: 300 }, 100)).toBeNull();
  });

  it('removes only the requested trim range', () => {
    const regions = [
      { id: 'first', startMs: 100, endMs: 200 },
      { id: 'second', startMs: 300, endMs: 400 },
    ];
    expect(removeTimedRegionById(regions, 'first')).toEqual([{ id: 'second', startMs: 300, endMs: 400 }]);
    expect(removeTimedRegionById(regions, 'missing')).toEqual(regions);
  });

  it('makes a new speed range replace only its overlapping interval', () => {
    const existing = [{ id: 'slow', startMs: 100, endMs: 500, speed: 0.5 }];
    const updated = addSpeedRange(existing, 300, 700, 2, 1000);
    expect(updated).toHaveLength(2);
    expect(updated[0]).toMatchObject({ startMs: 100, endMs: 300, speed: 0.5 });
    expect(updated[1]).toMatchObject({ startMs: 300, endMs: 700, speed: 2 });
  });
});
