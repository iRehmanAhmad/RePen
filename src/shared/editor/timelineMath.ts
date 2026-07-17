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

/** Produces a bounded, stable ruler independent of source duration. */
export function createTimelineTicks(durationMs: number, zoom: number): number[] {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return [0];
  const targetSegments = Math.max(4, Math.min(20, Math.round(10 * clampTimelineZoom(zoom))));
  const rawStep = durationMs / targetSegments;
  const candidates = [100, 250, 500, 1000, 2000, 5000, 10_000, 15_000, 30_000, 60_000, 120_000, 300_000, 600_000];
  const step = candidates.find((candidate) => candidate >= rawStep) || candidates[candidates.length - 1];
  const ticks: number[] = [];
  for (let timeMs = 0; timeMs < durationMs; timeMs += step) ticks.push(timeMs);
  if (ticks[ticks.length - 1] !== durationMs) ticks.push(durationMs);
  return ticks;
}
