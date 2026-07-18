import { describe, expect, it } from 'vitest';
import { aspectRatioCss, normalizeCropForRender, fitCompositionToBounds } from '../../src/shared/editor/layoutGeometry';

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

  it('calculates optimal bounds using fitCompositionToBounds', () => {

    // 16:9 widescreen in a wide but short box
    const fitWidescreenShort = fitCompositionToBounds(800, 300, '16:9', null, null, 20);
    // Avail width: 760, Avail height: 260. Height will clamp to 260, width to 260 * 16/9 = 462
    expect(fitWidescreenShort.height).toBe(260);
    expect(fitWidescreenShort.width).toBe(Math.round(260 * 16 / 9));

    // 9:16 vertical in a wide but short box
    const fitVerticalShort = fitCompositionToBounds(800, 300, '9:16', null, null, 20);
    // Avail width: 760, Avail height: 260. Height clamps to 260, width to 260 * 9/16 = 146
    expect(fitVerticalShort.height).toBe(260);
    expect(fitVerticalShort.width).toBe(Math.round(260 * 9 / 16));

    // 1:1 square in a square box
    const fitSquare = fitCompositionToBounds(400, 400, '1:1', null, null, 20);
    // Avail width: 360, Avail height: 360.
    expect(fitSquare.width).toBe(360);
    expect(fitSquare.height).toBe(360);

    // Source ratio with original dimensions (e.g. 800 x 600)
    const fitSource = fitCompositionToBounds(1000, 800, 'source', 800, 600, 50);
    // Avail width: 900, Avail height: 700. Height clamps to 700, width to 700 * 800/600 = 933 -> too wide.
    // So width clamps to 900, height to 900 / (800/600) = 675
    expect(fitSource.width).toBe(900);
    expect(fitSource.height).toBe(675);
  });
});
