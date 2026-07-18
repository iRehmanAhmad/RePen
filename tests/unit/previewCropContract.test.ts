import { describe, expect, it } from 'vitest';
import { fitCompositionToBounds, normalizeCropForRender } from '../../src/shared/editor/layoutGeometry';

describe('preview crop and composition fit math', () => {
  it('clamps crop region values to valid normalized bounds [0, 1]', () => {
    const crop = normalizeCropForRender({ x: -0.5, y: 1.5, width: 2, height: -1 });
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(1.0); // max y is 1
    expect(crop.width).toBe(1.0); // clamped to 1 - x
    expect(crop.height).toBe(0.01); // min height is 0.01
  });

  it('correctly calculates widescreen 16:9 composition bounds', () => {
    const stageWidth = 800;
    const stageHeight = 500;
    const padding = 32; // margins around composition

    const result = fitCompositionToBounds(stageWidth, stageHeight, '16:9', null, null, padding);

    // Width: stageWidth - padding * 2 = 736
    // Height: 736 * (9 / 16) = 414
    expect(result.width).toBe(736);
    expect(result.height).toBe(414);
  });

  it('correctly calculates vertical 9:16 composition bounds in landscape stage', () => {
    const stageWidth = 800;
    const stageHeight = 450;
    const padding = 32;

    const result = fitCompositionToBounds(stageWidth, stageHeight, '9:16', null, null, padding);

    // Available height is shorter: 450 - padding * 2 = 386
    // Width: 386 * (9 / 16) = 217
    expect(result.height).toBe(386);
    expect(result.width).toBe(Math.round(386 * 9 / 16));
  });

  it('correctly calculates square 1:1 composition bounds', () => {
    const stageWidth = 600;
    const stageHeight = 450;
    const padding = 20;

    const result = fitCompositionToBounds(stageWidth, stageHeight, '1:1', null, null, padding);

    // Available width = 560, height = 410. Height is smaller, so height = 410, width = 410.
    expect(result.width).toBe(410);
    expect(result.height).toBe(410);
  });
});
