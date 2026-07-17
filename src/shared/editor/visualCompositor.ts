import type { AspectRatio } from './editorDefaults';
import type { CropRegion, ZoomRegion, WebcamMaskShape } from './types';
import { aspectRatioCss, normalizeCropForRender } from './layoutGeometry';

export interface CompositorSceneInput {
  aspectRatio?: AspectRatio | 'source';
  sourceWidth?: number;
  sourceHeight?: number;
  cropRegion?: Partial<CropRegion>;
  padding?: number;
  borderRadius?: number;
  shadowIntensity?: number;
  wallpaper?: string;
  currentTimeMs: number;
  zoomRegions?: ZoomRegion[];
  webcamLayoutPreset?: string;
  webcamSizePreset?: number;
  webcamPosition?: { cx: number; cy: number };
  webcamMirrored?: boolean;
  webcamMaskShape?: WebcamMaskShape;
  previewQualityMode?: 'performance' | 'high-quality';
}

export interface CompositorSceneOutput {
  aspectStyle: Record<string, string | number>;
  compositorStyle: Record<string, string | number>;
  cropMediaStyle: Record<string, string | number>;
  webcamStyle: Record<string, string | number>;
}

export function computeCompositorStyles(input: CompositorSceneInput): CompositorSceneOutput {
  const {
    aspectRatio = '16:9',
    sourceWidth,
    sourceHeight,
    cropRegion,
    padding = 0,
    borderRadius = 0,
    shadowIntensity = 0.3,
    wallpaper = '#0b0c0e',
    currentTimeMs,
    zoomRegions = [],
    webcamSizePreset = 25,
    webcamPosition = { cx: 0.82, cy: 0.82 },
    webcamMirrored = false,
    webcamMaskShape = 'square',
    previewQualityMode = 'high-quality',
  } = input;

  // 1. Aspect Ratio Style
  let ratioStr = '16 / 9';
  if (aspectRatio === 'source') {
    if (sourceWidth && sourceHeight) {
      ratioStr = `${sourceWidth} / ${sourceHeight}`;
    }
  } else {
    ratioStr = aspectRatioCss(aspectRatio);
  }

  const isVertical = aspectRatio === '9:16';
  const aspectStyle: Record<string, string | number> = isVertical
    ? { aspectRatio: ratioStr, height: '100%', width: 'auto' }
    : { aspectRatio: ratioStr, width: '100%', height: 'auto' };

  // 2. Compositor Style (padding, borders, shadow, backgrounds, zooms)
  const shadowValue = previewQualityMode === 'performance'
    ? `0 2px 10px rgba(0,0,0,${shadowIntensity})`
    : `0 20px 60px rgba(0,0,0,${shadowIntensity})`;

  const compositorStyle: Record<string, string | number> = {
    padding: `${padding}px`,
    borderRadius: `${borderRadius}px`,
    boxShadow: shadowValue,
    transition: 'all 0.15s ease-out',
    background: wallpaper,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // Add zoom region transforms if active
  const activeZoom = zoomRegions.find(r => currentTimeMs >= r.startMs && currentTimeMs <= r.endMs);
  if (activeZoom) {
    const depth = activeZoom.depth || 1.5;
    const focusX = (activeZoom.focus?.cx ?? 0.5) * 100;
    const focusY = (activeZoom.focus?.cy ?? 0.5) * 100;
    
    let transformStr = `scale(${depth})`;
    
    if (activeZoom.rotationPreset === 'iso') {
      transformStr = `${transformStr} perspective(1000px) rotateX(-10deg) rotateY(-16deg)`;
    } else if (activeZoom.rotationPreset === 'left') {
      transformStr = `${transformStr} perspective(1000px) rotateY(-22deg)`;
    } else if (activeZoom.rotationPreset === 'right') {
      transformStr = `${transformStr} perspective(1000px) rotateY(22deg)`;
    }

    compositorStyle.transform = transformStr;
    compositorStyle.transformOrigin = `${focusX}% ${focusY}%`;
  }

  // 3. Crop Media Style (for main video and drawings canvas)
  const crop = normalizeCropForRender(cropRegion);
  const cropMediaStyle: Record<string, string | number> = {
    width: `${(100 / crop.width).toFixed(4)}%`,
    height: `${(100 / crop.height).toFixed(4)}%`,
    maxWidth: 'none',
    maxHeight: 'none',
    transform: `translate(${-crop.x * 100}%, ${-crop.y * 100}%)`,
    transformOrigin: 'top left',
  };

  // 4. Webcam Style
  const webcamStyle: Record<string, string | number> = {
    width: `${webcamSizePreset}%`,
    left: `${webcamPosition.cx * 100}%`,
    top: `${webcamPosition.cy * 100}%`,
    transform: `translate(-50%, -50%) ${webcamMirrored ? 'scaleX(-1)' : ''}`,
    borderRadius: webcamMaskShape === 'circle' ? '50%' : webcamMaskShape === 'rounded' ? '16px' : '0',
  };

  return {
    aspectStyle,
    compositorStyle,
    cropMediaStyle,
    webcamStyle,
  };
}
