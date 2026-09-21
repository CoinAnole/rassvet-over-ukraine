/** Spherical Earth radius used for altitude proxy, elevation, and footprints. */
export const EARTH_RADIUS_KM = 6371;

/** WGS-72 / SGP4 conventional GM, km^3/s^2. */
export const MU_KM3_S2 = 398600.4418;

/** Product constant: Raised filter gate. Shown on Method. */
export const RAISED_ALTITUDE_KM = 480;

/** TLE older than this is still propagated but marked stale. */
export const STALE_HOURS = 72;

export const STEP_SECONDS = 30;
export const MIN_PASS_SECONDS = 60;
export const DECAY_PERIGEE_KM = 150;
export const TRACK_HALF_MINUTES = 45;

export type TimezoneId = "kyiv" | "utc" | "moscow";

export const TIMEZONES: Record<TimezoneId, string> = {
  kyiv: "Europe/Kyiv",
  utc: "UTC",
  moscow: "Europe/Moscow",
};

export const PLACES = [
  { id: "kyiv", lat: 50.4501, lon: 30.5234 },
  { id: "kharkiv", lat: 49.9935, lon: 36.2304 },
  { id: "dnipro", lat: 48.4647, lon: 35.0462 },
  { id: "odesa", lat: 46.4825, lon: 30.7233 },
  { id: "zaporizhzhia", lat: 47.8388, lon: 35.1396 },
  { id: "donetsk", lat: 48.0159, lon: 37.8028 },
  { id: "sevastopol", lat: 44.6167, lon: 33.5254 },
] as const;

export type PlaceId = (typeof PLACES)[number]["id"];

export const CITY_STRIP: PlaceId[] = ["kyiv", "kharkiv", "odesa"];

export const MAP_BOUNDS: [[number, number], [number, number]] = [
  [41, 22],
  [54, 45],
];

export const MAP_CENTER: [number, number] = [48.4, 32.5];
export const MAP_DEFAULT_ZOOM = 6;
