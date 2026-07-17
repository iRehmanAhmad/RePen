export function clampTimelineZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(5, Math.max(1, value));
}

export function timelinePercent(timeMs: number, durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 0;
  return Math.min(100, Math.max(0, (Math.max(0, timeMs) / durationMs) * 100));
}

export function timeAtTimelinePosition(positionPx: number, timelineWidthPx: number, durationMs: number): number {
  if (!Number.isFinite(timelineWidthPx) || timelineWidthPx <= 0 || !Number.isFinite(durationMs) || durationMs <= 0) {
    return 0;
  }
  const fraction = Math.min(1, Math.max(0, positionPx / timelineWidthPx));
  return Math.round(fraction * durationMs);
}

export function formatTimelineTime(timeMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
