import { describe, expect, it } from 'vitest';
import { addZoomRange } from '../../src/shared/editor/timelineEdits';
import { ZoomRegion } from '../../src/shared/editor/types';

describe('Zoom overlap and easing options tests', () => {
  it('correctly maps zoom easing options', () => {
    const manualZoom: ZoomRegion = {
      id: 'zoom-ease',
      startMs: 1000,
      endMs: 4000,
      depth: 2,
      focus: { cx: 0.5, cy: 0.5 },
      focusMode: 'manual',
      easingPreset: 'ease-in-out',
    };
    expect(manualZoom.easingPreset).toBe('ease-in-out');

    const springZoom: ZoomRegion = {
      id: 'zoom-spring',
      startMs: 4000,
      endMs: 7000,
      depth: 3,
      focus: { cx: 0.1, cy: 0.8 },
      focusMode: 'cursor-follow',
      easingPreset: 'spring',
    };
    expect(springZoom.easingPreset).toBe('spring');
    expect(springZoom.focusMode).toBe('cursor-follow');
  });

  it('verifies that the newly added zoom range replaces overlapping portions of the existing one', () => {
    const existing: ZoomRegion[] = [
      { id: 'z1', startMs: 2000, endMs: 5000, depth: 1.5, focus: { cx: 0.5, cy: 0.5 } },
    ];
    // Zoom-2 overlaps from 3000 to 6000
    const newZoom: ZoomRegion = { id: 'z2', startMs: 3000, endMs: 6000, depth: 2.5, focus: { cx: 0.1, cy: 0.1 } };
    const result = addZoomRange(existing, newZoom, 10000);

    expect(result).toHaveLength(2);
    // z1 should be shortened to end at 3000
    expect(result[0]).toMatchObject({ id: 'z1-before-3000', startMs: 2000, endMs: 3000 });
    // z2 should span from 3000 to 6000
    expect(result[1]).toMatchObject({ id: 'z2', startMs: 3000, endMs: 6000 });
  });
});
