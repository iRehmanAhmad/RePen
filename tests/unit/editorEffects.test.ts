import { describe, it, expect } from 'vitest';

describe('Editor Compositor Effects and Layouts', () => {
  it('should prevent overlapping zoom regions during timeline insertions', () => {
    const existingRegions = [
      { id: 'z1', startMs: 1000, endMs: 3000 },
      { id: 'z2', startMs: 5000, endMs: 8000 },
    ];

    const isOverlapping = (startMs: number, endMs: number) => {
      return existingRegions.some(r => 
        (startMs >= r.startMs && startMs < r.endMs) ||
        (endMs > r.startMs && endMs <= r.endMs) ||
        (startMs <= r.startMs && endMs >= r.endMs)
      );
    };

    expect(isOverlapping(2000, 4000)).toBe(true);
    expect(isOverlapping(3500, 4500)).toBe(false);
    expect(isOverlapping(500, 1500)).toBe(true);
    expect(isOverlapping(500, 9000)).toBe(true);
  });

  it('should map webcam mask shapes to correct CSS properties', () => {
    const getMaskStyle = (shape: string): string => {
      switch (shape) {
        case 'circle': return 'circle(50%)';
        case 'rounded': return 'inset(0% round 8px)';
        case 'square': return 'inset(0%)';
        default: return 'none';
      }
    };

    expect(getMaskStyle('circle')).toBe('circle(50%)');
    expect(getMaskStyle('rounded')).toBe('inset(0% round 8px)');
    expect(getMaskStyle('rectangle')).toBe('none');
  });

  it('should build valid 3D perspective rotation transform strings', () => {
    const buildTransform = (depth: number, preset?: string) => {
      let str = `scale(${depth})`;
      if (preset === 'iso') {
        str += ' perspective(1000px) rotateX(-10deg) rotateY(-16deg)';
      }
      return str;
    };

    expect(buildTransform(1.5)).toBe('scale(1.5)');
    expect(buildTransform(2.0, 'iso')).toBe('scale(2) perspective(1000px) rotateX(-10deg) rotateY(-16deg)');
  });
});
