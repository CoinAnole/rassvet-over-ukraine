import type { Lang, PopulationFilter, TimezoneId } from "./catalog/types.ts";
import { CLOCK_WINDOW_MS, holdFromHours, type HeldClock } from "./orbit/clock.ts";
import { PLACES, type PlaceId } from "./orbit/constants.ts";

export type ViewSearch = {
  lat?: number;
  lon?: number;
  el?: number;
  lang?: Lang;
  set?: PopulationFilter | "operational";
  tz?: TimezoneId;
  place?: PlaceId | "custom";
  /**
   * Held clock as hours relative to the reader's wall-clock now.
   * Omitted when the clock is live. Values outside ±48 are kept so a
   * refresh still clamps and shows the existing clamped banner.
   */
  h?: number;
};

/** `h` is rounded to this many decimal hours after snapping to the nearest minute. */
const CLOCK_URL_HOUR_DIGITS = 4;
const WINDOW_HOURS = CLOCK_WINDOW_MS / 3_600_000;

const SEARCH_KEYS = ["place", "lat", "lon", "el", "set", "tz", "lang", "h"] as const;

export type ViewState = {
  place: PlaceId | "custom";
  lat: number;
  lon: number;
  el: 10 | 25 | 40;
  set: PopulationFilter;
  tz: TimezoneId;
  lang: Lang;
};

const PLACE_SET = new Set(PLACES.map((p) => p.id));

export function parseEl(v: unknown): 10 | 25 | 40 {
  const n = Number(v);
  if (n === 10 || n === 25 || n === 40) return n;
  return 25;
}

export function parseSet(v: unknown): PopulationFilter {
  if (v === "operational" || v === "raised") return "raised";
  if (
    v === "all" ||
    v === "climbing" ||
    v === "exp-2023" ||
    v === "exp-2024" ||
    v === "prod-2026-03" ||
    v === "prod-2026-07"
  ) {
    return v;
  }
  return "raised";
}

export function parseTz(v: unknown): TimezoneId {
  if (v === "utc" || v === "moscow" || v === "kyiv") return v;
  return "kyiv";
}

export function clampLat(n: number): number {
  if (!Number.isFinite(n)) return 50.4501;
  return Math.max(-90, Math.min(90, n));
}

export function clampLon(n: number): number {
  if (!Number.isFinite(n)) return 30.5234;
  return Math.max(-180, Math.min(180, n));
}

export function matchPlace(lat: number, lon: number): PlaceId | "custom" {
  for (const p of PLACES) {
    if (Math.abs(p.lat - lat) < 0.02 && Math.abs(p.lon - lon) < 0.02) return p.id;
  }
  return "custom";
}

export function defaultView(lang: Lang = "en"): ViewState {
  const kyiv = PLACES[0];
  return {
    place: "kyiv",
    lat: kyiv.lat,
    lon: kyiv.lon,
    el: 25,
    set: "raised",
    tz: "kyiv",
    lang,
  };
}

export function viewFromSearch(search: ViewSearch, lang: Lang): ViewState {
  const base = defaultView(lang);
  const el = parseEl(search.el);
  const set = parseSet(search.set);
  const tz = parseTz(search.tz);
  let lat = search.lat != null ? clampLat(Number(search.lat)) : base.lat;
  let lon = search.lon != null ? clampLon(Number(search.lon)) : base.lon;
  let place: PlaceId | "custom" = "kyiv";
  if (search.place && (PLACE_SET.has(search.place as PlaceId) || search.place === "custom")) {
    place = search.place as PlaceId | "custom";
    if (place !== "custom") {
      const p = PLACES.find((x) => x.id === place)!;
      if (search.lat == null) lat = p.lat;
      if (search.lon == null) lon = p.lon;
    }
  } else {
    place = matchPlace(lat, lon);
  }
  return { place, lat, lon, el, set, tz, lang: search.lang ?? lang };
}

/** Finite non-zero hour offset from a query value. `0` and junk mean live. */
export function parseClockHours(v: unknown): number | undefined {
  let n: number;
  if (typeof v === "number") n = v;
  else if (typeof v === "string" && v.trim() !== "") n = Number(v);
  else return undefined;
  if (!Number.isFinite(n) || n === 0) return undefined;
  return n;
}

/**
 * Nearest-minute offset expressed in hours, so the restored clock matches the
 * minute label on the scrubber. `undefined` means live (omit `h`).
 * 0.0001 h is about 0.36 s, which stays inside the same displayed minute.
 */
export function clockHoursFromOffsetMs(offsetMs: number): number | undefined {
  if (!Number.isFinite(offsetMs)) return undefined;
  const minutes = Math.round(offsetMs / 60_000);
  if (minutes === 0) return undefined;
  const scale = 10 ** CLOCK_URL_HOUR_DIGITS;
  const hours = Math.round((minutes / 60) * scale) / scale;
  if (hours === 0) return undefined;
  return hours;
}

/**
 * Apply `h` to `wallNowMs` and clamp to ±48 h.
 * `null` means stay on the live tick. Out-of-range hours come back clamped
 * with `clamped: true` (the existing banner). Overflowing magnitudes are
 * bounded before the multiply so they clamp instead of collapsing to live.
 */
export function heldFromClockHours(hours: number | undefined, wallNowMs: number): HeldClock | null {
  if (hours == null || !Number.isFinite(hours) || hours === 0) return null;
  const bounded = Math.max(-1e6, Math.min(1e6, hours));
  return holdFromHours(bounded, wallNowMs);
}

/** Short query for this view. Defaults are omitted; live omits `h`. */
export function searchFromView(view: ViewState, offsetMs = 0): ViewSearch {
  const search: ViewSearch = {};
  if (view.place === "custom") {
    search.lat = Number(view.lat.toFixed(4));
    search.lon = Number(view.lon.toFixed(4));
    // Within 0.02° of a preset, lat/lon alone would snap back to that city.
    if (matchPlace(view.lat, view.lon) !== "custom") search.place = "custom";
  } else if (view.place !== "kyiv") {
    search.place = view.place;
  }
  if (view.el !== 25) search.el = view.el;
  if (view.set !== "raised") search.set = view.set;
  if (view.tz !== "kyiv") search.tz = view.tz;
  if (view.lang !== "en") search.lang = view.lang;
  const h = clockHoursFromOffsetMs(offsetMs);
  if (h != null) search.h = h;
  return search;
}

export function viewSearchEqual(a: ViewSearch, b: ViewSearch): boolean {
  for (const key of SEARCH_KEYS) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/**
 * Address-bar form of `view` + clock.
 * Language is taken from the incoming query so a detected UI language is not
 * written until the visitor actually picks one. An out-of-range `h` is kept
 * while the on-screen clock is still the clamped edge of that request.
 */
export function canonicalSearch(
  incoming: ViewSearch,
  view: ViewState,
  offsetMs: number,
): ViewSearch {
  const lang: Lang = incoming.lang === "uk" || incoming.lang === "ru" ? incoming.lang : "en";
  const next = searchFromView({ ...view, lang }, offsetMs);
  const authored = incoming.h;
  if (authored != null && Math.abs(authored) > WINDOW_HOURS) {
    const edge = authored > 0 ? WINDOW_HOURS : -WINDOW_HOURS;
    if (next.h === edge) next.h = authored;
  }
  return next;
}

/** Query string TanStack Router writes for this search object (`""` when live defaults). */
export function shareSearchString(search: ViewSearch): string {
  const params = new URLSearchParams();
  for (const key of SEARCH_KEYS) {
    const value = search[key];
    if (value == null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function shareUrl(origin: string, pathname: string, search: ViewSearch): string {
  const root = origin.replace(/\/$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname || ""}`;
  return `${root}${path}${shareSearchString(search)}`;
}
