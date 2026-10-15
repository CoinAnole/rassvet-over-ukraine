/**
 * Climb rate from a short history of Brouwer altitudes.
 *
 * Least-squares slope over the newest samples inside a 72-hour window
 * (about two to three days). At least three points must span at least
 * 36 hours. One point that sits far off the line of the others is dropped
 * and the line is fit again. A single element set's MEAN_MOTION_DOT is
 * not an input: that derivative is a short-arc fit and can have the wrong sign.
 */

/** Newest samples kept for the fit. */
export const CLIMB_WINDOW_MS = 72 * 60 * 60 * 1000;

/** The kept points must cover at least this long. */
export const CLIMB_MIN_SPAN_MS = 36 * 60 * 60 * 1000;

export const CLIMB_MIN_POINTS = 3;

/** More than this many km/day is climbing. Steeper than this downward is decaying. */
export const CLIMB_KM_PER_DAY = 0.8;

/** A lone residual must clear this many kilometres, and this multiple of the next one. */
export const OUTLIER_MIN_KM = 1.5;
export const OUTLIER_RATIO = 3;

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
 * Manual list versus a computed class. Decaying counts as not climbing.
 * @param {boolean} manualStuck
 * @param {"climbing" | "holding" | "decaying" | null | undefined} klass
 */
export function climbListDisagreement(manualStuck, klass) {
  if (klass !== "climbing" && klass !== "holding" && klass !== "decaying") return false;
  const computedNotClimbing = klass !== "climbing";
  return Boolean(manualStuck) !== computedNotClimbing;
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
 * @param {{ t0: number, slope: number, intercept: number }} fit
 * @param {TimedSample} sample
 */
function residualKm(fit, sample) {
  const tDays = (sample.t - fit.t0) / DAY_MS;
  return Math.abs(sample.altKm - (fit.intercept + fit.slope * tDays));
}

/**
 * @param {TimedSample[]} samples
 * @returns {{ samples: TimedSample[], dropped: boolean }}
 */
function dropSingleOutlier(samples) {
  if (samples.length < CLIMB_MIN_POINTS + 1) return { samples, dropped: false };
  let bestIndex = -1;
  let bestErr = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const rest = samples.filter((_, j) => j !== i);
    const fit = fitSamples(rest);
    if (!fit || !sample) continue;
    const err = residualKm(fit, sample);
    if (err < OUTLIER_MIN_KM) continue;
    // The remaining points have to sit on their own line. A second spike
    // does not, so it is not "one bad point".
    let worstOther = 0;
    for (const other of rest) worstOther = Math.max(worstOther, residualKm(fit, other));
    if (err >= OUTLIER_RATIO * Math.max(worstOther, 1e-9) && err > bestErr) {
      bestIndex = i;
      bestErr = err;
    }
  }
  if (bestIndex < 0) return { samples, dropped: false };
  return { samples: samples.filter((_, i) => i !== bestIndex), dropped: true };
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
  const newest = deduped[deduped.length - 1];
  if (!newest) return null;
  const windowed = deduped.filter((s) => newest.t - s.t <= CLIMB_WINDOW_MS);
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
