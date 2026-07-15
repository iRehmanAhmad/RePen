import { describe, it, expect } from 'vitest';
import {
  pointDistance,
  segmentDistance,
  ccw,
  segmentsIntersect,
  segmentToSegmentDistance,
} from '../../src/renderer/presenter/geometry';

describe('Geometry Utilities Unit Test', () => {
  it('should compute distance between two points', () => {
    expect(pointDistance(0, 0, 3, 4)).toBe(5);
  });

  it('should compute distance from point to segment', () => {
    expect(segmentDistance(2, 2, 0, 0, 4, 0)).toBe(2);
  });

  it('should detect segment intersections', () => {
    expect(segmentsIntersect(0, 0, 4, 4, 0, 4, 4, 0)).toBe(true);
    expect(segmentsIntersect(0, 0, 4, 4, 5, 0, 5, 4)).toBe(false);
  });

  it('should compute segment to segment distance', () => {
    // Intersecting segments
    expect(segmentToSegmentDistance(0, 0, 4, 4, 0, 4, 4, 0)).toBe(0);
    // Parallel segments separated by distance of 2
    expect(segmentToSegmentDistance(0, 0, 4, 0, 0, 2, 4, 2)).toBe(2);
  });
});
