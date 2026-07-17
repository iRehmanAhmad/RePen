import { describe, expect, it } from 'vitest';
import { clampTimelineZoom, createTimelineTicks, formatTimelineTime, timeAtTimelinePosition, timelinePercent } from '../../src/shared/editor/timelineMath';

describe('timeline math', () => {
  it('bounds zoom and timeline percentages', () => {
    expect(clampTimelineZoom(0.2)).toBe(1);
    expect(clampTimelineZoom(7)).toBe(5);
    expect(timelinePercent(-100, 1000)).toBe(0);
    expect(timelinePercent(1500, 1000)).toBe(100);
  });

  it('maps clicks to a bounded media time and formats accessible labels', () => {
    expect(timeAtTimelinePosition(250, 1000, 20_000)).toBe(5_000);
    expect(timeAtTimelinePosition(2_000, 1000, 20_000)).toBe(20_000);
    expect(formatTimelineTime(65_000)).toBe('1:05');
  });

  it('creates a bounded, ordered ruler at every zoom level', () => {
    const ticks = createTimelineTicks(65_000, 5);
    expect(ticks[0]).toBe(0);
    expect(ticks.at(-1)).toBe(65_000);
    expect(ticks.length).toBeLessThanOrEqual(21);
  });
});
