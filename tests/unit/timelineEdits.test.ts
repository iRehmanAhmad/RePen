import { describe, expect, it } from 'vitest';
import { addSpeedRange, addTrimRange, removeTimedRegionById, splitTimedRegion, resizeTrimRange, splitTrimRange, resizeSpeedRange } from '../../src/shared/editor/timelineEdits';

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

  it('resizes a trim range and re-merges overlaps', () => {
    const existing = [
      { id: 'cut-1', startMs: 100, endMs: 200 },
      { id: 'cut-2', startMs: 400, endMs: 600 },
    ];
    const resized = resizeTrimRange(existing, 'cut-1', 100, 450, 1000);
    expect(resized).toEqual([{ id: 'cut-1', startMs: 100, endMs: 600 }]);
  });

  it('splits a trim range strictly inside the boundaries', () => {
    const existing = [
      { id: 'cut-1', startMs: 100, endMs: 500 },
    ];
    const split = splitTrimRange(existing, 'cut-1', 300);
    expect(split).toHaveLength(2);
    expect(split[0]).toMatchObject({ id: 'cut-1', startMs: 100, endMs: 300 });
    expect(split[1]).toMatchObject({ id: 'cut-1-split-300', startMs: 300, endMs: 500 });

    // Out of bounds split
    expect(splitTrimRange(existing, 'cut-1', 50)).toEqual(existing);
    expect(splitTrimRange(existing, 'cut-1', 600)).toEqual(existing);
  });

  it('resizes a speed range applying the new range wins overlap rule', () => {
    const existing = [
      { id: 'speed-1', startMs: 100, endMs: 300, speed: 2 },
      { id: 'speed-2', startMs: 400, endMs: 600, speed: 0.5 },
    ];
    // Resize speed-1 to overlap speed-2; speed-1 should overwrite speed-2
    const resized = resizeSpeedRange(existing, 'speed-1', 100, 450, 1000);
    expect(resized).toHaveLength(2);
    expect(resized[0]).toMatchObject({ startMs: 100, endMs: 450, speed: 2 });
    expect(resized[1]).toMatchObject({ startMs: 450, endMs: 600, speed: 0.5 });
  });
});
