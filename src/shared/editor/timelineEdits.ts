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

export function splitTimedRegion<T extends TimedRegion>(region: T, atMs: number): [T, T] | null {
  const at = Math.round(atMs);
  if (at <= region.startMs || at >= region.endMs) return null;
  return [
    { ...region, endMs: at },
    { ...region, id: `${region.id}-split-${at}`, startMs: at },
  ];
}
