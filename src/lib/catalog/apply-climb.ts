import { climbRate } from "../orbit/climb-rate.ts";
import { classifyStatus, getObjectsConfig } from "./build.ts";
import type { HistoryRow } from "./altitude-history.mjs";
import type { CatalogPayload, LiveObject } from "./types.ts";

/**
 * Fold a history into the catalog. A missing history leaves the manual list
 * in place. The live element set is one more sample, de-duped by epoch.
 * Raised, decayed, and missing stay on those rules. Under 450 km, a known
 * rate replaces the manual not-climbing list.
 */
export function applyClimbRates(
  payload: CatalogPayload,
  rows: HistoryRow[] | null,
): CatalogPayload {
  if (!rows) return payload;
  const cfg = getObjectsConfig();
  const stuck = new Set(cfg.stuck ?? []);
  const decayed = new Set(cfg.decayed);
  const byNorad = new Map<number, HistoryRow[]>();
  for (const row of rows) {
    const list = byNorad.get(row.norad);
    if (list) list.push(row);
    else byNorad.set(row.norad, [row]);
  }

  const objects = payload.objects.map((obj) =>
    withRate(obj, byNorad.get(obj.norad) ?? [], {
      stuck: stuck.has(obj.norad),
      decayed: decayed.has(obj.norad),
      decayPerigeeKm: cfg.decayPerigeeKm,
      raisedAltitudeKm: payload.raisedAltitudeKm,
    }),
  );
  return { ...payload, objects };
}

function withRate(
  obj: LiveObject,
  history: HistoryRow[],
  flags: {
    stuck: boolean;
    decayed: boolean;
    decayPerigeeKm: number;
    raisedAltitudeKm: number;
  },
): LiveObject {
  if (flags.decayed || obj.status === "missing" || obj.omm == null) {
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
  const rate = samples.length > 0 ? climbRate(samples) : null;
  const status = classifyStatus({
    manualDecayed: flags.decayed,
    manualStuck: flags.stuck,
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
