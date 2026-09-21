import type { CatalogPayload, LiveObject, PopulationFilter, TimezoneId } from "../catalog/types.ts";
import { CITY_STRIP, PLACES, STEP_SECONDS, TRACK_HALF_MINUTES, type PlaceId } from "./constants.ts";
import { footprintRing } from "./footprint.ts";
import { findPasses, type ObjectPass } from "./passes.ts";
import { satrecFromOmm, subpoint, lookAt, type Observer } from "./sgp4.ts";
import { tzName, zonedDayBounds } from "./time.ts";
import { clipIntervals, longestInterval, unionIntervals, unionMinutes, type Interval } from "./union.ts";

export type VisibleNow = {
  norad: number;
  name: string;
  elevationDeg: number;
};

export type WindowInfo = {
  start: number;
  end: number;
  durationMin: number;
  peakElevationDeg: number;
  objects: number[];
};

export type NextWindow =
  | { state: "open"; los: number; remainingMs: number }
  | { state: "later"; aos: number; inMs: number }
  | { state: "none" };

export type PassRow = ObjectPass & {
  name: string;
  group: string;
  altitudeKm: number | null;
  status: LiveObject["status"];
  stale: boolean;
};

export type SatMapState = {
  norad: number;
  name: string;
  group: string;
  status: LiveObject["status"];
  stale: boolean;
  lat: number;
  lon: number;
  altitudeKm: number;
  elevationDeg: number | null;
  track: [number, number][];
  footprint: [number, number][];
};

export type CoverageResult = {
  nowVisible: VisibleNow[];
  todayMinutes: number;
  todayWindowCount: number;
  longestToday: WindowInfo | null;
  next: NextWindow;
  windowsToday: Interval[];
  passes36h: PassRow[];
  cityMinutes: { placeId: PlaceId; minutes: number }[];
  map: SatMapState[];
};

export function inPopulation(obj: LiveObject, filter: PopulationFilter): boolean {
  if (obj.status === "decayed") return false;
  if (!obj.omm) return false;
  if (filter === "all") return true;
  if (filter === "raised") return obj.status === "raised";
  if (filter === "climbing") return obj.status === "climbing";
  return obj.group === filter;
}

function passesToIntervals(passes: ObjectPass[]): Interval[] {
  return passes.map((p) => ({ start: p.aos, end: p.los, objects: [p.norad] }));
}

function peakInWindow(passes: ObjectPass[], window: Interval): number {
  let peak = -90;
  for (const p of passes) {
    if (p.los <= window.start || p.aos >= window.end) continue;
    if (p.maxElevationDeg > peak) peak = p.maxElevationDeg;
  }
  return peak;
}

export function computeCoverage(opts: {
  catalog: CatalogPayload;
  lat: number;
  lon: number;
  minElevationDeg: number;
  filter: PopulationFilter;
  tz: TimezoneId;
  now: Date;
}): CoverageResult {
  const { catalog, lat, lon, minElevationDeg, filter, tz, now } = opts;
  const observer: Observer = { lat, lon };
  const zone = tzName(tz);
  const day = zonedDayBounds(now, zone);
  const horizonEnd = now.getTime() + 36 * 3600_000;
  const spanStart = Math.min(day.start.getTime(), now.getTime());
  const spanEnd = Math.max(day.end.getTime(), horizonEnd);

  const selected = catalog.objects.filter((o) => inPopulation(o, filter));
  const allPasses: ObjectPass[] = [];
  const rows: PassRow[] = [];
  const nowVisible: VisibleNow[] = [];
  const map: SatMapState[] = [];
  const recs = selected
    .map((obj) => {
      if (!obj.omm) return null;
      try {
        return { obj, satrec: satrecFromOmm(obj.omm) };
      } catch {
        return null;
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  for (const { obj, satrec } of recs) {
    const found = findPasses(
      satrec,
      obj.norad,
      observer,
      spanStart,
      spanEnd,
      minElevationDeg,
      catalog.stepSeconds || STEP_SECONDS,
      catalog.minPassSeconds,
    );
    allPasses.push(...found);
    for (const p of found) {
      if (p.los <= now.getTime() || p.aos >= horizonEnd) continue;
      if (p.aos >= horizonEnd) continue;
      const aos = Math.max(p.aos, now.getTime() - 1);
      if (p.los <= now.getTime() && p.aos < now.getTime()) {
        // currently open; keep
      }
      if (p.los > now.getTime() && p.aos < horizonEnd) {
        rows.push({
          ...p,
          name: obj.name,
          group: obj.group,
          altitudeKm: obj.approxAltitudeKm,
          status: obj.status,
          stale: obj.stale,
        });
      }
    }

    const look = lookAt(satrec, now, observer);
    if (look && look.elevationDeg >= minElevationDeg) {
      nowVisible.push({
        norad: obj.norad,
        name: obj.name,
        elevationDeg: look.elevationDeg,
      });
    }

    const here = subpoint(satrec, now);
    if (here) {
      const track: [number, number][] = [];
      const half = TRACK_HALF_MINUTES * 60 * 1000;
      const trackStep = 30 * 1000;
      for (let t = now.getTime() - half; t <= now.getTime() + half; t += trackStep) {
        const sp = subpoint(satrec, new Date(t));
        if (sp) track.push([sp.lat, sp.lon]);
      }
      map.push({
        norad: obj.norad,
        name: obj.name,
        group: obj.group,
        status: obj.status,
        stale: obj.stale,
        lat: here.lat,
        lon: here.lon,
        altitudeKm: here.altitudeKm,
        elevationDeg: look?.elevationDeg ?? null,
        track,
        footprint: footprintRing(here.lat, here.lon, here.altitudeKm, minElevationDeg),
      });
    }
  }

  nowVisible.sort((a, b) => b.elevationDeg - a.elevationDeg);

  const unioned = unionIntervals(passesToIntervals(allPasses));
  const todayWindows = clipIntervals(unioned, day.start.getTime(), day.end.getTime()).filter(
    (w) => w.end - w.start >= (catalog.minPassSeconds || 60) * 1000,
  );
  const longest = longestInterval(todayWindows);
  let longestToday: WindowInfo | null = null;
  if (longest) {
    longestToday = {
      start: longest.start,
      end: longest.end,
      durationMin: Math.round((longest.end - longest.start) / 60_000),
      peakElevationDeg: peakInWindow(allPasses, longest),
      objects: longest.objects,
    };
  }

  const open = todayWindows.find((w) => w.start <= now.getTime() && w.end > now.getTime());
  const future = unioned
    .filter((w) => w.end > now.getTime())
    .sort((a, b) => a.start - b.start);
  let next: NextWindow = { state: "none" };
  if (open) {
    next = { state: "open", los: open.end, remainingMs: open.end - now.getTime() };
  } else {
    const upcoming = future.find((w) => w.start >= now.getTime()) ?? future[0];
    if (upcoming && upcoming.start > now.getTime()) {
      next = { state: "later", aos: upcoming.start, inMs: upcoming.start - now.getTime() };
    } else if (upcoming && upcoming.start <= now.getTime() && upcoming.end > now.getTime()) {
      next = { state: "open", los: upcoming.end, remainingMs: upcoming.end - now.getTime() };
    }
  }

  const cityMinutes = CITY_STRIP.map((placeId) => {
    const place = PLACES.find((p) => p.id === placeId)!;
    if (Math.abs(place.lat - lat) < 1e-4 && Math.abs(place.lon - lon) < 1e-4) {
      return { placeId, minutes: unionMinutes(todayWindows) };
    }
    const cityPasses: ObjectPass[] = [];
    const cityObs = { lat: place.lat, lon: place.lon };
    for (const { obj, satrec } of recs) {
      cityPasses.push(
        ...findPasses(
          satrec,
          obj.norad,
          cityObs,
          day.start.getTime(),
          day.end.getTime(),
          minElevationDeg,
          60,
          catalog.minPassSeconds,
        ),
      );
    }
    const cityUnion = clipIntervals(
      unionIntervals(passesToIntervals(cityPasses)),
      day.start.getTime(),
      day.end.getTime(),
    );
    return { placeId, minutes: unionMinutes(cityUnion) };
  });

  rows.sort((a, b) => a.aos - b.aos);

  return {
    nowVisible,
    todayMinutes: unionMinutes(todayWindows),
    todayWindowCount: todayWindows.length,
    longestToday,
    next,
    windowsToday: todayWindows,
    passes36h: rows,
    cityMinutes,
    map,
  };
}

export { type PlaceId };
