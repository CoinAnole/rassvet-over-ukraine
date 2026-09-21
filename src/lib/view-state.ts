import type { Lang, PopulationFilter, TimezoneId } from "./catalog/types";
import { PLACES, type PlaceId } from "./orbit/constants";

export type ViewSearch = {
  lat?: number;
  lon?: number;
  el?: number;
  lang?: Lang;
  set?: PopulationFilter | "operational";
  tz?: TimezoneId;
  place?: PlaceId | "custom";
};

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

export function searchFromView(view: ViewState): ViewSearch {
  return {
    lat: Number(view.lat.toFixed(4)),
    lon: Number(view.lon.toFixed(4)),
    el: view.el,
    lang: view.lang,
    set: view.set,
    tz: view.tz,
    place: view.place,
  };
}
