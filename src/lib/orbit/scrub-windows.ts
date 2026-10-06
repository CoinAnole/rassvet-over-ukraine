import type { CatalogPayload, PopulationFilter } from "../catalog/types.ts";
import { CLOCK_WINDOW_MS } from "./clock.ts";
import { MIN_PASS_SECONDS } from "./constants.ts";
import { inPopulation } from "./coverage.ts";
import { findPasses } from "./passes.ts";
import { satrecFromOmm } from "./sgp4.ts";
import { unionIntervals, type Interval } from "./union.ts";

/**
 * Sample step for the ±48 h scrub bands.
 * Coarser than the 30 s pass list, and the same 60 s step the city strip uses for a day.
 */
export const SCRUB_STEP_SECONDS = 60;

/**
 * Wall-clock quantum for recomputing scrub bands.
 * A minute of drift is about 0.02% of the 96 h track, so a 5 min bucket stays visually
 * still and does not follow the 1 s live tick.
 */
export const SCRUB_ANCHOR_MS = 5 * 60 * 1000;

/**
 * Search past the scrub edges so a window already open at −48 h keeps its real AOS
 * instead of the search boundary. Longer than a typical geometric pass.
 */
export const SCRUB_EDGE_PAD_MS = 60 * 60 * 1000;

export function scrubAnchorMs(wallNowMs: number, bucketMs = SCRUB_ANCHOR_MS): number {
  if (!Number.isFinite(wallNowMs) || !(bucketMs > 0)) return 0;
  return Math.floor(wallNowMs / bucketMs) * bucketMs;
}

/** Unioned geometric LOS intervals for the scrub span, padded past ±48 h. */
export function findScrubWindows(opts: {
  catalog: CatalogPayload;
  lat: number;
  lon: number;
  minElevationDeg: number;
  filter: PopulationFilter;
  wallNowMs: number;
  stepSeconds?: number;
  windowMs?: number;
  edgePadMs?: number;
}): Interval[] {
  const {
    catalog,
    lat,
    lon,
    minElevationDeg,
    filter,
    wallNowMs,
    stepSeconds = SCRUB_STEP_SECONDS,
    windowMs = CLOCK_WINDOW_MS,
    edgePadMs = SCRUB_EDGE_PAD_MS,
  } = opts;
  const anchor = scrubAnchorMs(wallNowMs);
  const from = anchor - windowMs - edgePadMs;
  const to = anchor + windowMs + edgePadMs;
  const minPassSeconds = catalog.minPassSeconds || MIN_PASS_SECONDS;
  const observer = { lat, lon };
  const intervals: Interval[] = [];

  for (const obj of catalog.objects) {
    if (!inPopulation(obj, filter) || !obj.omm) continue;
    let satrec;
    try {
      satrec = satrecFromOmm(obj.omm);
    } catch {
      continue;
    }
    const found = findPasses(
      satrec,
      obj.norad,
      observer,
      from,
      to,
      minElevationDeg,
      stepSeconds,
      minPassSeconds,
    );
    for (const pass of found) {
      intervals.push({ start: pass.aos, end: pass.los, objects: [pass.norad] });
    }
  }

  return unionIntervals(intervals);
}

export type ScrubBand = {
  /** Union acquisition. May lie before the visible scrub; holding the clock clamps it. */
  aos: number;
  los: number;
  visibleStart: number;
  visibleEnd: number;
  objects: number[];
};

/** Clip unioned windows to the visible ±48 h span without forgetting the real AOS. */
export function scrubBands(
  windows: Interval[],
  wallNowMs: number,
  windowMs = CLOCK_WINDOW_MS,
): ScrubBand[] {
  if (!Number.isFinite(wallNowMs)) return [];
  const from = wallNowMs - windowMs;
  const to = wallNowMs + windowMs;
  const out: ScrubBand[] = [];
  for (const w of windows) {
    const visibleStart = Math.max(w.start, from);
    const visibleEnd = Math.min(w.end, to);
    if (visibleEnd - visibleStart < 1) continue;
    out.push({
      aos: w.start,
      los: w.end,
      visibleStart,
      visibleEnd,
      objects: w.objects,
    });
  }
  return out;
}

/**
 * Window painted under a point along the thumb travel (`fraction` 0..1).
 * Short windows use a minimum paint width, so several bands can cover one pixel.
 * The closest painted center wins. That is the band the user aimed at, not a later
 * window that happens to contain the same instant. Outside every band, the nearest
 * edge within `slopPx` still counts so a hairline window stays hittable.
 */
export function scrubBandAtFraction(
  bands: readonly ScrubBand[],
  fraction: number,
  usablePx: number,
  wallNowMs: number,
  windowMs = CLOCK_WINDOW_MS,
  minPx = 4,
  slopPx = 10,
): ScrubBand | null {
  if (!Number.isFinite(fraction) || !Number.isFinite(wallNowMs) || !(usablePx > 0)) return null;
  const clickPx = Math.min(1, Math.max(0, fraction)) * usablePx;
  const painted = bands.map((b) => {
    const frame = scrubBandFrame(b, wallNowMs, windowMs);
    const left = Math.min((frame.leftPct / 100) * usablePx, Math.max(0, usablePx - minPx));
    const width = Math.max((frame.widthPct / 100) * usablePx, minPx);
    const right = Math.min(usablePx, left + width);
    return { b, left, right, center: left + (right - left) / 2 };
  });
  const hits = painted.filter((p) => clickPx >= p.left - 0.01 && clickPx <= p.right + 0.01);
  if (hits.length > 0) {
    hits.sort((a, c) => Math.abs(a.center - clickPx) - Math.abs(c.center - clickPx));
    return hits[0].b;
  }
  let best: (typeof painted)[number] | null = null;
  let bestDist = slopPx;
  for (const p of painted) {
    const dist = clickPx < p.left ? p.left - clickPx : clickPx - p.right;
    if (dist >= 0 && dist <= bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  return best?.b ?? null;
}

/**
 * Window under a scrub instant. Exact containment wins.
 * Otherwise the nearest window within `slopMs`, so a short band stays hittable.
 */
export function scrubBandAtTime(
  bands: readonly ScrubBand[],
  timeMs: number,
  slopMs = 0,
): ScrubBand | null {
  if (!Number.isFinite(timeMs)) return null;
  const inside = bands.find((b) => timeMs >= b.visibleStart && timeMs < b.visibleEnd);
  if (inside) return inside;
  if (!(slopMs > 0)) return null;
  let best: ScrubBand | null = null;
  let bestDist = slopMs;
  for (const b of bands) {
    const dist = timeMs < b.visibleStart ? b.visibleStart - timeMs : timeMs - b.visibleEnd;
    if (dist >= 0 && dist <= bestDist) {
      bestDist = dist;
      best = b;
    }
  }
  return best;
}

/** Percent geometry along the scrub. `leftPct` is the visible AOS edge. */
export function scrubBandFrame(
  band: Pick<ScrubBand, "visibleStart" | "visibleEnd">,
  wallNowMs: number,
  windowMs = CLOCK_WINDOW_MS,
): { leftPct: number; widthPct: number } {
  const span = windowMs * 2;
  if (!(span > 0) || !Number.isFinite(wallNowMs)) return { leftPct: 0, widthPct: 0 };
  const from = wallNowMs - windowMs;
  const leftPct = ((band.visibleStart - from) / span) * 100;
  const widthPct = ((band.visibleEnd - band.visibleStart) / span) * 100;
  return { leftPct, widthPct: Math.max(0, widthPct) };
}
