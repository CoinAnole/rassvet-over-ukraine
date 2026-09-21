export type Interval = {
  start: number;
  end: number;
  objects: number[];
};

export function unionIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (!last || iv.start > last.end) {
      out.push({ start: iv.start, end: iv.end, objects: [...iv.objects] });
    } else {
      last.end = Math.max(last.end, iv.end);
      for (const id of iv.objects) {
        if (!last.objects.includes(id)) last.objects.push(id);
      }
    }
  }
  return out;
}

export function clipIntervals(intervals: Interval[], from: number, to: number): Interval[] {
  const out: Interval[] = [];
  for (const iv of intervals) {
    const start = Math.max(iv.start, from);
    const end = Math.min(iv.end, to);
    if (end - start >= 1) out.push({ start, end, objects: [...iv.objects] });
  }
  return out;
}

/** Integer minutes, rounded to nearest from total union duration. */
export function unionMinutes(intervals: Interval[]): number {
  let ms = 0;
  for (const iv of intervals) ms += Math.max(0, iv.end - iv.start);
  return Math.round(ms / 60_000);
}

export function longestInterval(intervals: Interval[]): Interval | null {
  let best: Interval | null = null;
  for (const iv of intervals) {
    if (!best || iv.end - iv.start > best.end - best.start) best = iv;
  }
  return best;
}
