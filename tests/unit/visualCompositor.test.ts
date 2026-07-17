import { describe, expect, it } from 'vitest';
import { computeCompositorStyles } from '../../src/shared/editor/visualCompositor';

describe('shared visual compositor', () => {
  it('correctly maps 16:9 widescreen and 9:16 vertical aspects', () => {
    const out169 = computeCompositorStyles({
      aspectRatio: '16:9',
      currentTimeMs: 0,
    });
    expect(out169.aspectStyle).toEqual({
      aspectRatio: '16 / 9',
      width: '100%',
      height: 'auto',
    });

    const out916 = computeCompositorStyles({
      aspectRatio: '9:16',
      currentTimeMs: 0,
    });
    expect(out916.aspectStyle).toEqual({
      aspectRatio: '9 / 16',
      height: '100%',
      width: 'auto',
    });
  });

  it('handles source aspect ratio with original dimensions', () => {
    const outSource = computeCompositorStyles({
      aspectRatio: 'source',
      sourceWidth: 800,
      sourceHeight: 600,
      currentTimeMs: 0,
    });
    expect(outSource.aspectStyle).toEqual({
      aspectRatio: '800 / 600',
      width: '100%',
      height: 'auto',
    });
  });

  it('clamps and translates crop coordinates', () => {
    const outCrop = computeCompositorStyles({
      cropRegion: { x: 0.1, y: 0.2, width: 0.5, height: 0.6 },
      currentTimeMs: 0,
    });
    expect(outCrop.cropMediaStyle).toEqual({
      width: '200.0000%',
      height: '166.6667%',
      maxWidth: 'none',
      maxHeight: 'none',
      transform: 'translate(-10%, -20%)',
      transformOrigin: 'top left',
    });
  });

  it('disables shadows in performance mode', () => {
    const outHQ = computeCompositorStyles({
      shadowIntensity: 0.5,
      previewQualityMode: 'high-quality',
      currentTimeMs: 0,
    });
    expect(outHQ.compositorStyle.boxShadow).toContain('60px');

    const outPerf = computeCompositorStyles({
      shadowIntensity: 0.5,
      previewQualityMode: 'performance',
      currentTimeMs: 0,
    });
    expect(outPerf.compositorStyle.boxShadow).toContain('10px');
  });

  it('applies active zoom transforms with rotation presets', () => {
    const zoomRegions = [
      { id: 'z1', startMs: 100, endMs: 500, depth: 2, focus: { cx: 0.3, cy: 0.4 }, rotationPreset: 'iso' as const },
    ];
    const outZoom = computeCompositorStyles({
      zoomRegions,
      currentTimeMs: 300,
    });
    expect(outZoom.compositorStyle.transform).toBe('scale(2) perspective(1000px) rotateX(-10deg) rotateY(-16deg)');
    expect(outZoom.compositorStyle.transformOrigin).toBe('30% 40%');
  });
});
