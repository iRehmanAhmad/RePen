import { clampPlaybackSpeed, type PlaybackSpeed, type SpeedRegion } from './types';

export interface TimedRegion { id: string; startMs: number; endMs: number; }

function boundedTime(value: number, durationMs: number): number {
  return Math.min(durationMs, Math.max(0, Math.round(value)));
}

/** Trim regions are skipped source ranges. Overlaps are merged deterministically. */
export function addTrimRange(regions: TimedRegion[], startMs: number, endMs: number, durationMs: number): TimedRegion[] {
  const start = boundedTime(Math.min(startMs, endMs), durationMs);
  const end = boundedTime(Math.max(startMs, endMs), durationMs);
  if (end <= start) return regions;
  const sorted = [...regions, { id: `trim-${Date.now()}`, startMs: start, endMs: end }]
    .filter((region) => region.endMs > region.startMs)
    .sort((a, b) => a.startMs - b.startMs);
  return sorted.reduce<TimedRegion[]>((merged, region) => {
    const previous = merged[merged.length - 1];
    if (previous && region.startMs <= previous.endMs) {
      previous.endMs = Math.max(previous.endMs, region.endMs);
    } else {
      merged.push({ ...region });
    }
    return merged;
  }, []);
}

/** Remove one persisted range without changing the remaining ranges or their order. */
export function removeTimedRegionById<T extends TimedRegion>(regions: T[], id: string): T[] {
  return regions.filter((region) => region.id !== id);
}

/**
 * Add a speed range while preserving non-overlapping portions of existing ranges.
 * The newly added range wins where it intersects an older one, so coordinator lookup
 * never depends on insertion order.
 */
export function addSpeedRange(
  regions: SpeedRegion[],
  startMs: number,
  endMs: number,
  speed: number,
  durationMs: number,
): SpeedRegion[] {
  const start = boundedTime(Math.min(startMs, endMs), durationMs);
  const end = boundedTime(Math.max(startMs, endMs), durationMs);
  if (end <= start) return regions;

  const preserved = regions.flatMap((region) => {
    if (region.endMs <= start || region.startMs >= end) return [{ ...region }];
    const portions: SpeedRegion[] = [];
    if (region.startMs < start) portions.push({ ...region, id: `${region.id}-before-${start}`, endMs: start });
    if (region.endMs > end) portions.push({ ...region, id: `${region.id}-after-${end}`, startMs: end });
    return portions;
  });

  const nextSpeed: PlaybackSpeed = clampPlaybackSpeed(speed);
  return [...preserved, { id: `speed-${Date.now()}`, startMs: start, endMs: end, speed: nextSpeed }]
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
}

export function splitTimedRegion<T extends TimedRegion>(region: T, atMs: number): [T, T] | null {
  const at = Math.round(atMs);
  if (at <= region.startMs || at >= region.endMs) return null;
  return [
    { ...region, endMs: at },
    { ...region, id: `${region.id}-split-${at}`, startMs: at },
  ];
}
