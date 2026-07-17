import { clampPlaybackSpeed, type PlaybackSpeed, type SpeedRegion, type ZoomRegion } from './types';

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

/** Resizes a trim range and re-merges any overlapping ranges. */
export function resizeTrimRange(
  regions: TimedRegion[],
  id: string,
  newStartMs: number,
  newEndMs: number,
  durationMs: number,
): TimedRegion[] {
  const target = regions.find((r) => r.id === id);
  if (!target) return regions;

  const start = boundedTime(newStartMs, durationMs);
  const end = boundedTime(newEndMs, durationMs);
  if (end <= start) return regions;

  const updatedRegions = regions.map((r) => {
    if (r.id === id) {
      return { ...r, startMs: start, endMs: end };
    }
    return { ...r };
  });

  const sorted = updatedRegions
    .filter((r) => r.endMs > r.startMs)
    .sort((a, b) => a.startMs - b.startMs);

  return sorted.reduce<TimedRegion[]>((merged, region) => {
    const previous = merged[merged.length - 1];
    if (previous && region.startMs <= previous.endMs) {
      previous.endMs = Math.max(previous.endMs, region.endMs);
      if (region.id === id || previous.id === id) {
        previous.id = id;
      }
    } else {
      merged.push({ ...region });
    }
    return merged;
  }, []);
}

/** Splits a specific trim region by ID at a playhead position. */
export function splitTrimRange(regions: TimedRegion[], id: string, playheadMs: number): TimedRegion[] {
  const target = regions.find((r) => r.id === id);
  if (!target) return regions;

  const split = splitTimedRegion(target, playheadMs);
  if (!split) return regions;

  return regions.flatMap((r) => {
    if (r.id === id) {
      return split;
    }
    return [r];
  });
}

/** Resizes an existing speed range using the 'new range wins in overlap' rule. */
export function resizeSpeedRange(
  regions: SpeedRegion[],
  id: string,
  newStartMs: number,
  newEndMs: number,
  durationMs: number,
): SpeedRegion[] {
  const target = regions.find((r) => r.id === id);
  if (!target) return regions;

  const start = boundedTime(newStartMs, durationMs);
  const end = boundedTime(newEndMs, durationMs);
  if (end <= start) return regions;

  const filtered = regions.filter((r) => r.id !== id);
  return addSpeedRange(filtered, start, end, target.speed, durationMs);
}

/**
 * Add a zoom range while preserving non-overlapping portions of existing zoom ranges.
 * The newly added/modified range wins where it intersects an older one.
 */
export function addZoomRange(
  regions: ZoomRegion[],
  newRegion: ZoomRegion,
  durationMs: number,
): ZoomRegion[] {
  const start = boundedTime(Math.min(newRegion.startMs, newRegion.endMs), durationMs);
  const end = boundedTime(Math.max(newRegion.startMs, newRegion.endMs), durationMs);
  if (end <= start) return regions;

  const preserved = regions.filter(r => r.id !== newRegion.id).flatMap((region) => {
    if (region.endMs <= start || region.startMs >= end) return [{ ...region }];
    const portions: ZoomRegion[] = [];
    if (region.startMs < start) portions.push({ ...region, id: `${region.id}-before-${start}`, endMs: start });
    if (region.endMs > end) portions.push({ ...region, id: `${region.id}-after-${end}`, startMs: end });
    return portions;
  });

  return [...preserved, { ...newRegion, startMs: start, endMs: end }]
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
}

/** Resizes an existing zoom range using the 'new range wins in overlap' rule. */
export function resizeZoomRange(
  regions: ZoomRegion[],
  id: string,
  newStartMs: number,
  newEndMs: number,
  durationMs: number,
): ZoomRegion[] {
  const target = regions.find((r) => r.id === id);
  if (!target) return regions;

  const start = boundedTime(newStartMs, durationMs);
  const end = boundedTime(newEndMs, durationMs);
  if (end <= start) return regions;

  const filtered = regions.filter((r) => r.id !== id);
  return addZoomRange(filtered, { ...target, startMs: start, endMs: end }, durationMs);
}
