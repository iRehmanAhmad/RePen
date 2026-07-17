import { describe, expect, it } from 'vitest';
import { addTrimRange, splitTimedRegion } from '../../src/shared/editor/timelineEdits';

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
});
