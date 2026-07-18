import { useState, useLayoutEffect, useRef } from 'react';
import { fitCompositionToBounds } from '../../shared/editor/layoutGeometry';

export type ZoomMode = 'fit' | '100%';

interface UsePreviewViewportProps {
  aspectRatio: string;
  sourceWidth: number | null;
  sourceHeight: number | null;
}

export function usePreviewViewport({
  aspectRatio,
  sourceWidth,
  sourceHeight,
}: UsePreviewViewportProps) {
  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit');
  const [stageWidth, setStageWidth] = useState(800);
  const [stageHeight, setStageHeight] = useState(450);
  const stageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // The stage has padded children. Measure its stable workspace parent rather
    // than the nested composition container so a grid resize cannot feed a
    // collapsed composition size back into the fit calculation.
    const boundsTarget = stage.parentElement || stage;
    const measure = () => {
      const { width, height } = boundsTarget.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setStageWidth(width);
        setStageHeight(height);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(boundsTarget);
    return () => observer.disconnect();
  }, []);

  // Compute final composition box width & height
  let width = 0;
  let height = 0;

  if (zoomMode === '100%' && sourceWidth && sourceHeight) {
    width = sourceWidth;
    height = sourceHeight;
  } else {
    // zoomMode === 'fit' (or fallback if metadata is not yet loaded)
    const fitResult = fitCompositionToBounds(
      stageWidth,
      stageHeight,
      aspectRatio,
      sourceWidth,
      sourceHeight,
      20
    );
    width = fitResult.width;
    height = fitResult.height;
  }

  return {
    stageRef,
    zoomMode,
    setZoomMode,
    width,
    height,
    stageWidth,
    stageHeight,
  };
}
