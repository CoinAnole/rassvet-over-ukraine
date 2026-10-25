import { epochToMs, climbRate, rateIsStale } from "../orbit/climb-rate.ts";
import { REENTRY_ALT_KM, type ReentryRecord } from "./reentries.mjs";
import type { HistoryRow } from "./altitude-history.mjs";
import type { CatalogPayload, LiveObject } from "./types.ts";

export { REENTRY_ALT_KM };

/**
 * SATCAT-confirmed reentries become decayed. A tracked object with no decay
 * date, a newest epoch more than 72 hours behind the catalog, and either a
 * last altitude under 250 km or a decaying rate, is reentering. Both are
 * dropped from propagation.
 */
export function applyReentries(
  payload: CatalogPayload,
  records: ReentryRecord[] | null,
  rows: HistoryRow[] | null,
): CatalogPayload {
  const byRecord = new Map<number, ReentryRecord>();
  for (const record of records ?? []) byRecord.set(record.norad, record);
  const byHistory = new Map<number, HistoryRow[]>();
  let referenceMs = 0;
  for (const row of rows ?? []) {
    const list = byHistory.get(row.norad);
    if (list) list.push(row);
    else byHistory.set(row.norad, [row]);
    const t = epochToMs(row.epoch);
    if (t != null && t > referenceMs) referenceMs = t;
  }
  for (const obj of payload.objects) {
    const t = epochToMs(obj.epoch);
    if (t != null && t > referenceMs) referenceMs = t;
  }

  const objects = payload.objects.map((obj) =>
    classify(obj, byRecord.get(obj.norad) ?? null, byHistory.get(obj.norad) ?? [], referenceMs || null),
  );
  const missingKnownIds = objects.filter((obj) => obj.status === "missing").map((obj) => obj.norad);
  const decayed = objects.filter((obj) => obj.status === "decayed").map((obj) => obj.norad);
  return { ...payload, objects, missingKnownIds, decayed };
}

function classify(
  obj: LiveObject,
  record: ReentryRecord | null,
  history: HistoryRow[],
  referenceMs: number | null,
): LiveObject {
  if (record) {
    return {
      ...obj,
      status: "decayed",
      omm: null,
      stale: false,
      climbKmPerDay: null,
      decayDate: record.decay_date,
      epoch: record.last_epoch ?? obj.epoch,
      approxAltitudeKm: record.last_alt_km ?? obj.approxAltitudeKm,
    };
  }
  if (obj.status === "decayed" || obj.status === "missing") return obj;

  let newestMs = epochToMs(obj.epoch);
  let alt = obj.approxAltitudeKm;
  let epoch = obj.epoch;
  for (const row of history) {
    const t = epochToMs(row.epoch);
    if (t == null) continue;
    if (newestMs == null || t >= newestMs) {
      newestMs = t;
      alt = row.alt_km;
      epoch = row.epoch;
    }
  }
  if (!rateIsStale(newestMs, referenceMs)) return obj;
  const fitted = history.length > 0 ? climbRate(history) : null;
  const low = alt != null && alt < REENTRY_ALT_KM;
  const decaying = fitted?.klass === "decaying";
  if (!low && !decaying) return obj;
  return {
    ...obj,
    status: "reentering",
    omm: null,
    epoch,
    approxAltitudeKm: alt,
    climbKmPerDay: null,
    decayDate: null,
  };
}
