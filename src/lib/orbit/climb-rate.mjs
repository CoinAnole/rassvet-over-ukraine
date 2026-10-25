/**
 * Climb rate from a short history of Brouwer altitudes.
 *
 * Least-squares slope over the newest samples inside a 72-hour window,
 * anchored on each object's own newest epoch. If that window has fewer
 * than three points or spans under 36 hours, older epochs are added one
 * at a time, up to five days from the newest epoch, until the minimum is
 * met. One interior point that misses the track between its neighbors is
 * dropped and the line is fit again. The newest epoch stays: it is the
 * current altitude, and a burn or a change of rate shows up there. A
 * single element set's MEAN_MOTION_DOT is not an input: that derivative
 * is a short-arc fit and can have the wrong sign.
 */

/** First window. Older epochs stay out while this one already qualifies. */
export const CLIMB_WINDOW_MS = 72 * 60 * 60 * 1000;

/** Furthest lookback when the 72-hour window is too short. */
export const CLIMB_WINDOW_MAX_MS = 120 * 60 * 60 * 1000;

/**
 * A history whose newest epoch is more than three days behind the newest
 * epoch in the catalog is not a live rate. The clock is the catalog, not
 * wall time, so a late fetch does not blank every object at once.
 */
export const HISTORY_STALE_MS = 72 * 60 * 60 * 1000;

/**
 * @param {number | null | undefined} newestMs
 * @param {number | null | undefined} referenceMs
 */
export function rateIsStale(newestMs, referenceMs) {
  if (newestMs == null || referenceMs == null) return false;
  return referenceMs - newestMs > HISTORY_STALE_MS;
}

/** The kept points must cover at least this long. */
export const CLIMB_MIN_SPAN_MS = 36 * 60 * 60 * 1000;

export const CLIMB_MIN_POINTS = 3;

/** More than this many km/day is climbing. Steeper than this downward is decaying. */
export const CLIMB_KM_PER_DAY = 0.8;

/**
 * An interior point this far off the chord between its neighbors is a
 * spike, not a change of rate. A couple of kilometres of curvature is
 * normal for thrusting. The October 2026 history bows by under 2 km.
 */
export const OUTLIER_MIN_KM = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param {string | number | null | undefined} epoch
 * @returns {number | null}
 */
export function epochToMs(epoch) {
  if (typeof epoch === "number" && Number.isFinite(epoch)) return epoch;
  if (typeof epoch !== "string" || epoch.length === 0) return null;
  const iso = epoch.endsWith("Z") ? epoch : `${epoch}Z`;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/**
 * @param {{ tDays: number, altKm: number }[]} points
 * @returns {{ slope: number, intercept: number } | null} slope is km per day
 */
export function leastSquaresSlope(points) {
  const n = points.length;
  if (n < 2) return null;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    sx += p.tDays;
    sy += p.altKm;
    sxx += p.tDays * p.tDays;
    sxy += p.tDays * p.altKm;
  }
  const denom = n * sxx - sx * sx;
  if (!(Math.abs(denom) > 1e-18)) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return null;
  return { slope, intercept };
}

/**
 * @param {number} kmPerDay
 * @returns {"climbing" | "holding" | "decaying"}
 */
export function climbClass(kmPerDay) {
  // A fit of a line that sits on the gate can land a fraction of a millimetre
  // per day to either side. That is not a different class.
  const gate = CLIMB_KM_PER_DAY;
  if (kmPerDay > gate + 1e-6) return "climbing";
  if (kmPerDay < -gate - 1e-6) return "decaying";
  return "holding";
}

/**
 * @param {number} kmPerDay
 * @returns {string | null}
 */
export function formatClimbRate(kmPerDay) {
  if (!Number.isFinite(kmPerDay)) return null;
  const rounded = Math.round(kmPerDay * 10) / 10;
  const digits = Math.abs(rounded).toFixed(1);
  if (rounded > 0) return `+${digits}`;
  if (rounded < 0) return `-${digits}`;
  return `+${digits}`;
}

/**
 * @typedef {{ t: number, altKm: number }} TimedSample
 * @typedef {{
 *   kmPerDay: number,
 *   klass: "climbing" | "holding" | "decaying",
 *   points: number,
 *   spanHours: number,
 *   droppedOutlier: boolean,
 * }} ClimbRateResult
 */

/**
 * @param {TimedSample[]} samples sorted by t
 * @returns {{ t0: number, slope: number, intercept: number } | null}
 */
function fitSamples(samples) {
  const t0 = samples[0]?.t;
  if (t0 == null) return null;
  const points = samples.map((s) => ({ tDays: (s.t - t0) / DAY_MS, altKm: s.altKm }));
  const fit = leastSquaresSlope(points);
  if (!fit) return null;
  return { t0, slope: fit.slope, intercept: fit.intercept };
}

/**
 * Kilometres by which an interior point misses the straight line between
 * the epochs on either side of it. Endpoints have no such chord: the newest
 * epoch is the current altitude, and dropping it is what hid real burns.
 * @param {TimedSample[]} samples
 * @param {number} index
 */
function neighborChordMissKm(samples, index) {
  const prev = samples[index - 1];
  const point = samples[index];
  const next = samples[index + 1];
  if (!prev || !point || !next) return 0;
  const span = next.t - prev.t;
  if (!(span > 0)) return 0;
  const fraction = (point.t - prev.t) / span;
  const predicted = prev.altKm + fraction * (next.altKm - prev.altKm);
  return Math.abs(point.altKm - predicted);
}

/**
 * @param {TimedSample[]} samples
 * @returns {{ samples: TimedSample[], dropped: boolean }}
 */
function dropSingleOutlier(samples) {
  if (samples.length < CLIMB_MIN_POINTS + 1) return { samples, dropped: false };
  /** @type {{ index: number, missKm: number }[]} */
  const spikes = [];
  for (let i = 1; i < samples.length - 1; i++) {
    const missKm = neighborChordMissKm(samples, i);
    if (missKm >= OUTLIER_MIN_KM) spikes.push({ index: i, missKm });
  }
  // Two bends are a curve, not one bad point. A neighbor's chord runs
  // through the spike, so it is not a second vote.
  if (spikes.length !== 1) return { samples, dropped: false };
  const spike = spikes[0];
  if (!spike) return { samples, dropped: false };
  return { samples: samples.filter((_, i) => i !== spike.index), dropped: true };
}

/**
 * @param {TimedSample[]} samples
 */
function longEnough(samples) {
  if (samples.length < CLIMB_MIN_POINTS) return false;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return false;
  return last.t - first.t >= CLIMB_MIN_SPAN_MS;
}

/**
 * Prefer the newest 72 hours. When that set is short, add the next older
 * epoch, and only that epoch, until the minimum is met or five days is
 * reached. A 72-hour window that already qualifies does not grow.
 * @param {TimedSample[]} deduped sorted by t, newest last
 * @returns {TimedSample[]}
 */
function selectWindow(deduped) {
  const newest = deduped[deduped.length - 1];
  if (!newest) return [];
  const primary = deduped.filter((s) => newest.t - s.t <= CLIMB_WINDOW_MS);
  if (longEnough(primary)) return primary;
  const older = deduped.filter(
    (s) => newest.t - s.t > CLIMB_WINDOW_MS && newest.t - s.t <= CLIMB_WINDOW_MAX_MS,
  );
  const window = primary.slice();
  for (let i = older.length - 1; i >= 0 && !longEnough(window); i--) {
    const sample = older[i];
    if (sample) window.unshift(sample);
  }
  return window;
}

/**
 * @param {Array<{ epoch?: string | number, altKm?: number, alt_km?: number }> | null | undefined} rows
 * @returns {ClimbRateResult | null}
 */
export function climbRate(rows) {
  /** @type {TimedSample[]} */
  const parsed = [];
  for (const row of rows ?? []) {
    const t = epochToMs(row?.epoch);
    const altKm = Number(row?.altKm ?? row?.alt_km);
    if (t == null || !Number.isFinite(altKm)) continue;
    parsed.push({ t, altKm });
  }
  parsed.sort((a, b) => a.t - b.t);
  /** @type {TimedSample[]} */
  const deduped = [];
  for (const sample of parsed) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.t === sample.t) deduped[deduped.length - 1] = sample;
    else deduped.push(sample);
  }
  if (deduped.length === 0) return null;
  const windowed = selectWindow(deduped);
  if (!longEnough(windowed)) return null;
  const { samples, dropped } = dropSingleOutlier(windowed);
  if (!longEnough(samples)) return null;
  const fit = fitSamples(samples);
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!fit || !first || !last) return null;
  return {
    kmPerDay: fit.slope,
    klass: climbClass(fit.slope),
    points: samples.length,
    spanHours: (last.t - first.t) / 3_600_000,
    droppedOutlier: dropped,
  };
}
