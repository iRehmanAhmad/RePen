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
  cursorPosition?: { cx: number; cy: number };
  reducedMotion?: boolean;
}

export interface CompositorSceneOutput {
  aspectStyle: Record<string, string | number>;
  compositorStyle: Record<string, string | number>;
  cropMediaStyle: Record<string, string | number>;
  webcamStyle: Record<string, string | number>;
  viewportStyle: Record<string, string | number>;
  mediaStyle: Record<string, string | number>;
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
    webcamLayoutPreset = 'picture-in-picture',
    webcamSizePreset = 25,
    webcamPosition = { cx: 0.82, cy: 0.82 },
    webcamMirrored = false,
    webcamMaskShape = 'square',
    previewQualityMode = 'high-quality',
    cursorPosition,
    reducedMotion = false,
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

  const aspectStyle: Record<string, string | number> = {
    aspectRatio: ratioStr,
  };

  // 2. Compositor Style (padding, borders, shadow, backgrounds, zooms)
  const shadowValue = previewQualityMode === 'performance'
    ? `0 2px 10px rgba(0,0,0,${shadowIntensity})`
    : `0 20px 60px rgba(0,0,0,${shadowIntensity})`;

  const compositorStyle: Record<string, string | number> = {
    padding: `${padding}px`,
    borderRadius: `${borderRadius}px`,
    boxShadow: shadowValue,
    transition: reducedMotion ? 'none' : 'all 0.15s ease-out',
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
    let focusX = (activeZoom.focus?.cx ?? 0.5) * 100;
    let focusY = (activeZoom.focus?.cy ?? 0.5) * 100;

    if (activeZoom.focusMode === 'cursor-follow' && cursorPosition) {
      focusX = Math.max(0, Math.min(100, cursorPosition.cx * 100));
      focusY = Math.max(0, Math.min(100, cursorPosition.cy * 100));
    }
    
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

  // 4. Viewport, Media, and Webcam Styles based on preset
  let viewportStyle: Record<string, string | number> = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  };

  let mediaStyle: Record<string, string | number> = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  };

  let webcamStyle: Record<string, string | number> = {
    width: `${webcamSizePreset}%`,
    left: `${webcamPosition.cx * 100}%`,
    top: `${webcamPosition.cy * 100}%`,
    transform: `translate(-50%, -50%) ${webcamMirrored ? 'scaleX(-1)' : ''}`,
    borderRadius: webcamMaskShape === 'circle' ? '50%' : webcamMaskShape === 'rounded' ? '16px' : '0',
  };

  if (webcamLayoutPreset === 'no-webcam') {
    webcamStyle.display = 'none';
  } else if (webcamLayoutPreset === 'vertical-stack') {
    viewportStyle = {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      gap: '8px',
      padding: '8px',
      boxSizing: 'border-box',
    };
    mediaStyle = {
      flex: 1,
      width: '100%',
      height: 'auto',
      position: 'relative',
      overflow: 'hidden',
    };
    webcamStyle = {
      height: `${webcamSizePreset}%`,
      width: '100%',
      position: 'relative',
      objectFit: 'contain',
      borderRadius: webcamMaskShape === 'circle' ? '50%' : webcamMaskShape === 'rounded' ? '16px' : '0',
      transform: webcamMirrored ? 'scaleX(-1)' : '',
    };
  } else if (webcamLayoutPreset === 'dual-frame') {
    viewportStyle = {
      display: 'flex',
      flexDirection: 'row',
      width: '100%',
      height: '100%',
      gap: '8px',
      padding: '8px',
      boxSizing: 'border-box',
    };
    mediaStyle = {
      flex: 1,
      height: '100%',
      width: 'auto',
      position: 'relative',
      overflow: 'hidden',
    };
    webcamStyle = {
      width: `${webcamSizePreset}%`,
      height: '100%',
      position: 'relative',
      objectFit: 'contain',
      borderRadius: webcamMaskShape === 'circle' ? '50%' : webcamMaskShape === 'rounded' ? '16px' : '0',
      transform: webcamMirrored ? 'scaleX(-1)' : '',
    };
  }

  return {
    aspectStyle,
    compositorStyle,
    cropMediaStyle,
    webcamStyle,
    viewportStyle,
    mediaStyle,
  };
}
