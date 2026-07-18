import type { AspectRatio } from './editorDefaults';
import type { CropRegion } from './types';

const ASPECT_RATIO_CSS: Record<AspectRatio, string> = {
  '16:9': '16 / 9',
  '4:3': '4 / 3',
  '1:1': '1 / 1',
  '9:16': '9 / 16',
  '21:9': '21 / 9',
};

export function aspectRatioCss(value: AspectRatio | undefined): string {
  return ASPECT_RATIO_CSS[value || '16:9'] || ASPECT_RATIO_CSS['16:9'];
}

export function normalizeCropForRender(crop: Partial<CropRegion> | undefined): CropRegion {
  const rawX = Number.isFinite(crop?.x) ? crop?.x ?? 0 : 0;
  const rawY = Number.isFinite(crop?.y) ? crop?.y ?? 0 : 0;
  const rawWidth = Number.isFinite(crop?.width) ? crop?.width ?? 1 : 1;
  const rawHeight = Number.isFinite(crop?.height) ? crop?.height ?? 1 : 1;
  const x = Math.min(1, Math.max(0, rawX));
  const y = Math.min(1, Math.max(0, rawY));
  return {
    x,
    y,
    width: Math.max(0.01, Math.min(1 - x, rawWidth)),
    height: Math.max(0.01, Math.min(1 - y, rawHeight)),
  };
}

export interface FitResult {
  width: number;
  height: number;
}

export function fitCompositionToBounds(
  stageWidth: number,
  stageHeight: number,
  aspectRatio: string,
  sourceWidth?: number | null,
  sourceHeight?: number | null,
  margin = 32
): FitResult {
  const availW = Math.max(10, stageWidth - margin * 2);
  const availH = Math.max(10, stageHeight - margin * 2);

  let ratio = 16 / 9;
  if (aspectRatio === '16:9') ratio = 16 / 9;
  else if (aspectRatio === '4:3') ratio = 4 / 3;
  else if (aspectRatio === '1:1') ratio = 1 / 1;
  else if (aspectRatio === '9:16') ratio = 9 / 16;
  else if (aspectRatio === '21:9') ratio = 21 / 9;
  else if (aspectRatio === 'source' && sourceWidth && sourceHeight) {
    ratio = sourceWidth / sourceHeight;
  }

  let width = availW;
  let height = availW / ratio;

  if (height > availH) {
    height = availH;
    width = availH * ratio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}
