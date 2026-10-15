/**
 * Synthetic altitude history for a --gp-fixture launch.
 * RASSVET-3 11 gets a 48-hour line at +2.6 km/day so the constellation
 * table can show a rate without the data branch.
 */
import { orbitFromGp } from "../../../../src/lib/orbit/brouwer-altitude.mjs";

export const HISTORY_FIXTURE_NORAD = 68370;

/**
 * @param {Array<Record<string, unknown>>} gpObjects
 * @param {Date} [now]
 */
export function buildHistoryFixture(gpObjects, now = new Date()) {
  const row = gpObjects.find((item) => item.NORAD_CAT_ID === HISTORY_FIXTURE_NORAD);
  if (!row) throw new Error(`gp fixture has no NORAD ${HISTORY_FIXTURE_NORAD}`);
  const orbit = orbitFromGp(row);
  if (!orbit) throw new Error(`no altitude for NORAD ${HISTORY_FIXTURE_NORAD}`);
  const epoch = String(row.EPOCH ?? "");
  const end = Date.parse(epoch.endsWith("Z") ? epoch : `${epoch}Z`);
  if (!Number.isFinite(end)) throw new Error(`bad epoch for NORAD ${HISTORY_FIXTURE_NORAD}`);
  const alt = orbit.approxAltitudeKm;
  const rows = [48, 36, 24, 12, 0].map((hours) => ({
    norad: HISTORY_FIXTURE_NORAD,
    name: "RASSVET-3 11",
    epoch:
      hours === 0 ? epoch : new Date(end - hours * 3_600_000).toISOString().replace(/Z$/, ""),
    alt_km: Math.round((alt - 2.6 * (hours / 24)) * 1000) / 1000,
  }));
  return {
    v: 1,
    updated: now.toISOString(),
    rows,
  };
}
