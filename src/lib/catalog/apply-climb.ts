import { climbRate, epochToMs, rateIsStale } from "../orbit/climb-rate.ts";
import { classifyStatus, getObjectsConfig } from "./build.ts";
import type { HistoryRow } from "./altitude-history.mjs";
import type { CatalogPayload, LiveObject } from "./types.ts";

/**
 * Fold a history into the catalog. The live element set is one more sample,
 * de-duped by epoch. Raised, decayed, and missing stay on those rules.
 * Under 450 km, no current rate — including a history that has fallen more
 * than three days behind the catalog — is rate pending, not climbing.
 */
export function applyClimbRates(
  payload: CatalogPayload,
  rows: HistoryRow[] | null,
): CatalogPayload {
  if (!rows) return payload;
  const cfg = getObjectsConfig();
  const byNorad = new Map<number, HistoryRow[]>();
  let referenceMs = 0;
  for (const row of rows) {
    const list = byNorad.get(row.norad);
    if (list) list.push(row);
    else byNorad.set(row.norad, [row]);
    const t = epochToMs(row.epoch);
    if (t != null && t > referenceMs) referenceMs = t;
  }
  for (const obj of payload.objects) {
    const t = epochToMs(obj.epoch);
    if (t != null && t > referenceMs) referenceMs = t;
  }

  const objects = payload.objects.map((obj) =>
    withRate(obj, byNorad.get(obj.norad) ?? [], referenceMs || null, {
      decayPerigeeKm: cfg.decayPerigeeKm,
      raisedAltitudeKm: payload.raisedAltitudeKm,
    }),
  );
  return { ...payload, objects };
}

function withRate(
  obj: LiveObject,
  history: HistoryRow[],
  referenceMs: number | null,
  flags: {
    decayPerigeeKm: number;
    raisedAltitudeKm: number;
  },
): LiveObject {
  if (obj.status === "decayed" || obj.status === "missing" || obj.omm == null) {
    return { ...obj, climbKmPerDay: null };
  }
  const samples = [...history];
  if (obj.epoch && obj.approxAltitudeKm != null) {
    samples.push({
      norad: obj.norad,
      name: obj.name,
      epoch: obj.epoch,
      alt_km: obj.approxAltitudeKm,
    });
  }
  let newestMs: number | null = null;
  for (const sample of samples) {
    const t = epochToMs(sample.epoch);
    if (t != null && (newestMs == null || t > newestMs)) newestMs = t;
  }
  const fitted = samples.length > 0 ? climbRate(samples) : null;
  const stale = rateIsStale(newestMs, referenceMs);
  const rate = stale ? null : fitted;
  const status = classifyStatus({
    manualDecayed: false,
    hasElements: true,
    perigeeKm: obj.perigeeKm,
    approxAltitudeKm: obj.approxAltitudeKm,
    decayPerigeeKm: flags.decayPerigeeKm,
    raisedAltitudeKm: flags.raisedAltitudeKm,
    climbClass: rate?.klass ?? null,
  });
  return {
    ...obj,
    status,
    climbKmPerDay: rate ? rate.kmPerDay : null,
  };
}
