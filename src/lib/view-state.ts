import type { Lang, PopulationFilter, TimezoneId } from "./catalog/types.ts";
import { holdFromTarget, type HeldClock } from "./orbit/clock.ts";
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
   * Held clock as an absolute ISO-8601 UTC instant (`Date.toISOString()`).
   * Omitted when the clock is live. An instant outside ±48 h of the opener's
   * wall now is clamped to the nearest edge; the original `at` stays in the
   * URL until the scrubber leaves that edge, so a refresh still shows the
   * clamped banner.
   */
  at?: string;
};

const SEARCH_KEYS = ["place", "lat", "lon", "el", "set", "tz", "lang", "at"] as const;

/** The held instant written into `at`, plus the wall now used to clamp it. */
export type UrlClock = { at: number; wall: number };

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

const SET_VALUES: readonly PopulationFilter[] = [
  "prod-raised",
  "all",
  "raised",
  "climbing",
  "exp-2023",
  "exp-2024",
  "prod-2026-03",
  "prod-2026-07",
];

export function parseSet(v: unknown): PopulationFilter {
  // `raised` and the older alias `operational` stay "every object at or above 450 km",
  // including experimentals. A link that names that selection still opens it.
  // A missing or unknown value is the default: raised production only.
  if (v === "operational" || v === "raised") return "raised";
  if (typeof v === "string" && (SET_VALUES as readonly string[]).includes(v)) {
    return v as PopulationFilter;
  }
  return "prod-raised";
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
    set: "prod-raised",
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

/**
 * Normalize a query value to ISO-8601 UTC. Junk and empty values mean live.
 * Accepts any `Date.parse` instant, including offsets, then stores `Z`.
 */
export function parseClockInstant(v: unknown): string | undefined {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const ms = Date.parse(v.trim());
  if (!Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString();
}

/**
 * Hold `at` against `wallNowMs`.
 * `null` means stay on the live tick (missing instant, or exactly wall now).
 * Instants outside ±48 h come back clamped with `clamped: true`.
 */
export function heldFromClockInstant(at: string | undefined, wallNowMs: number): HeldClock | null {
  if (!at) return null;
  const target = Date.parse(at);
  if (!Number.isFinite(target)) return null;
  return holdFromTarget(target, wallNowMs);
}

/** Short query for this view. Defaults are omitted; live omits `at`. */
export function searchFromView(view: ViewState, heldAtMs?: number | null): ViewSearch {
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
  if (view.set !== "prod-raised") search.set = view.set;
  if (view.tz !== "kyiv") search.tz = view.tz;
  if (view.lang !== "en") search.lang = view.lang;
  if (heldAtMs != null && Number.isFinite(heldAtMs)) search.at = new Date(heldAtMs).toISOString();
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
 * written until the visitor actually picks one. `clock` is the on-screen hold
 * (`null` when live). An out-of-range `at` is kept while the on-screen clock
 * is still the clamp of that instant, so a refresh shows the clamped banner.
 */
export function canonicalSearch(
  incoming: ViewSearch,
  view: ViewState,
  clock: UrlClock | null,
): ViewSearch {
  const lang: Lang = incoming.lang === "uk" || incoming.lang === "ru" ? incoming.lang : "en";
  const next = searchFromView({ ...view, lang }, clock?.at ?? null);
  if (!clock || !incoming.at) return next;
  const authoredMs = Date.parse(incoming.at);
  if (!Number.isFinite(authoredMs)) return next;
  const clamped = holdFromTarget(authoredMs, clock.wall);
  if (clamped?.clamped && clamped.at === clock.at) next.at = new Date(authoredMs).toISOString();
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

/** Same rules as the Ukraine route's search validator. */
export function parseViewSearch(raw: Record<string, unknown>): ViewSearch {
  const num = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v !== "" && Number.isFinite(Number(v))) return Number(v);
    return undefined;
  };
  return {
    lat: num(raw.lat),
    lon: num(raw.lon),
    el: num(raw.el),
    lang: raw.lang === "en" || raw.lang === "uk" || raw.lang === "ru" ? raw.lang : undefined,
    set: typeof raw.set === "string" ? (raw.set as ViewSearch["set"]) : undefined,
    tz: raw.tz === "kyiv" || raw.tz === "utc" || raw.tz === "moscow" ? raw.tz : undefined,
    place: typeof raw.place === "string" ? (raw.place as ViewSearch["place"]) : undefined,
    at: parseClockInstant(raw.at),
  };
}

const HOME_QUERY_KEY = "rassvet-home";

/** Last Ukraine-today query, without a held clock. */
export function homeQueryWithoutClock(search: ViewSearch): ViewSearch {
  const view = viewFromSearch(search, search.lang ?? "en");
  const lang: Lang = search.lang === "uk" || search.lang === "ru" ? search.lang : "en";
  return searchFromView({ ...view, lang }, null);
}

export function parseHomeQueryString(qs: string): ViewSearch {
  const params = new URLSearchParams(qs.startsWith("?") ? qs.slice(1) : qs);
  const raw: Record<string, unknown> = {};
  for (const key of SEARCH_KEYS) {
    if (key === "at") continue;
    const value = params.get(key);
    if (value != null) raw[key] = value;
  }
  return homeQueryWithoutClock(parseViewSearch(raw));
}

export function rememberHomeSearch(search: ViewSearch, storage?: Storage): void {
  const store = storage ?? (typeof sessionStorage === "undefined" ? null : sessionStorage);
  if (!store) return;
  store.setItem(HOME_QUERY_KEY, shareSearchString(homeQueryWithoutClock(search)));
}

export function readRememberedHome(storage?: Storage): ViewSearch | null {
  const store = storage ?? (typeof sessionStorage === "undefined" ? null : sessionStorage);
  if (!store) return null;
  const raw = store.getItem(HOME_QUERY_KEY);
  if (raw == null) return null;
  return parseHomeQueryString(raw);
}

/** Ukraine-today href when leaving Constellation or Method. Current language wins. `at` stays off. */
export function ukraineReturnSearch(remembered: ViewSearch | null, lang: Lang): ViewSearch {
  const next: ViewSearch = { ...(remembered ?? {}) };
  delete next.at;
  if (lang === "en") delete next.lang;
  else next.lang = lang;
  return next;
}

export type AppRoute = "/" | "/constellation" | "/method";

/**
 * Search object for a primary nav link.
 * On Ukraine today the current query wins, including a held clock.
 * Elsewhere the Ukraine link uses the remembered query and the page's language.
 */
export function resolveNavSearch(args: {
  to: AppRoute;
  current: AppRoute;
  currentSearch: ViewSearch;
  remembered: ViewSearch | null;
  lang: Lang;
}): ViewSearch {
  if (args.to !== "/") {
    return args.lang === "en" ? {} : { lang: args.lang };
  }
  if (args.current === "/") {
    const next: ViewSearch = { ...args.currentSearch };
    if (args.lang === "en") delete next.lang;
    else next.lang = args.lang;
    return next;
  }
  return ukraineReturnSearch(args.remembered, args.lang);
}
