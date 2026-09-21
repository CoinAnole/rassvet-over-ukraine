import type { SatRec } from "./satellite-js.ts";
import { MIN_PASS_SECONDS, STEP_SECONDS } from "./constants.ts";
import { footprintHalfAngleRad } from "./footprint.ts";
import { lookAt, subpoint, type Observer } from "./sgp4.ts";

export type ObjectPass = {
  norad: number;
  aos: number;
  los: number;
  maxElevationDeg: number;
  peakAt: number;
};

function interpolateCrossing(
  t0: number,
  e0: number,
  t1: number,
  e1: number,
  mask: number,
): number {
  const denom = e1 - e0;
  if (Math.abs(denom) < 1e-9) return t1;
  const f = (mask - e0) / denom;
  return t0 + Math.max(0, Math.min(1, f)) * (t1 - t0);
}

function angularDistanceRad(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const x = Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return Math.acos(Math.min(1, Math.max(-1, x)));
}

function elevationAt(
  satrec: SatRec,
  date: Date,
  observer: Observer,
  minElevationDeg: number,
): number {
  const sp = subpoint(satrec, date);
  if (!sp) return -90;
  const gamma = footprintHalfAngleRad(sp.altitudeKm, Math.max(0, minElevationDeg - 2));
  if (angularDistanceRad(sp.lat, sp.lon, observer.lat, observer.lon) > gamma + 0.04) {
    return -90;
  }
  const look = lookAt(satrec, date, observer);
  return look?.elevationDeg ?? -90;
}

export function findPasses(
  satrec: SatRec,
  norad: number,
  observer: Observer,
  startMs: number,
  endMs: number,
  minElevationDeg: number,
  stepSeconds = STEP_SECONDS,
  minPassSeconds = MIN_PASS_SECONDS,
): ObjectPass[] {
  const stepMs = stepSeconds * 1000;
  const passes: ObjectPass[] = [];
  let inPass = false;
  let aos = 0;
  let prevT = startMs;
  let prevEl = -90;
  let maxEl = -90;
  let peakAt = startMs;

  prevEl = elevationAt(satrec, new Date(startMs), observer, minElevationDeg);
  if (prevEl >= minElevationDeg) {
    inPass = true;
    aos = startMs;
    maxEl = prevEl;
    peakAt = startMs;
  }

  for (let t = startMs + stepMs; t <= endMs + stepMs; t += stepMs) {
    const sampleT = Math.min(t, endMs);
    const el = elevationAt(satrec, new Date(sampleT), observer, minElevationDeg);

    if (!inPass && prevEl < minElevationDeg && el >= minElevationDeg) {
      inPass = true;
      aos = interpolateCrossing(prevT, prevEl, sampleT, el, minElevationDeg);
      maxEl = el;
      peakAt = sampleT;
    } else if (inPass) {
      if (el > maxEl) {
        maxEl = el;
        peakAt = sampleT;
      }
      if (prevEl >= minElevationDeg && el < minElevationDeg) {
        const los = interpolateCrossing(prevT, prevEl, sampleT, el, minElevationDeg);
        if (los - aos >= minPassSeconds * 1000) {
          passes.push({ norad, aos, los, maxElevationDeg: maxEl, peakAt });
        }
        inPass = false;
        maxEl = -90;
      }
    }

    prevT = sampleT;
    prevEl = el;
    if (sampleT >= endMs) break;
  }

  if (inPass) {
    const los = endMs;
    if (los - aos >= minPassSeconds * 1000) {
      passes.push({ norad, aos, los, maxElevationDeg: maxEl, peakAt });
    }
  }

  return passes;
}
