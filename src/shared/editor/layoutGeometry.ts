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
    width: Math.min(1 - x, Math.max(0.01, rawWidth)),
    height: Math.min(1 - y, Math.max(0.01, rawHeight)),
  };
}
