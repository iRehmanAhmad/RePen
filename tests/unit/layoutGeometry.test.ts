import { describe, expect, it } from 'vitest';
import { aspectRatioCss, normalizeCropForRender } from '../../src/shared/editor/layoutGeometry';

describe('shared layout geometry', () => {
  it('supports every persisted aspect ratio including ultrawide', () => {
    expect(aspectRatioCss('21:9')).toBe('21 / 9');
    expect(aspectRatioCss('9:16')).toBe('9 / 16');
    expect(aspectRatioCss(undefined)).toBe('16 / 9');
  });

  it('clamps crop geometry to stable normalized render bounds', () => {
    const crop = normalizeCropForRender({ x: 0.9, y: -2, width: 1, height: 0 });
    expect(crop.x).toBe(0.9);
    expect(crop.y).toBe(0);
    expect(crop.width).toBeCloseTo(0.1);
    expect(crop.height).toBe(0.01);
  });
});
