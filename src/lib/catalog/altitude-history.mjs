/**
 * Compact altitude history shared by the scheduled recorder and the app.
 * One row is one published GP epoch. The file lives on the `data` branch.
 */
import { orbitFromGp } from "../orbit/brouwer-altitude.mjs";
import { epochToMs } from "../orbit/climb-rate.mjs";

/** Drop an epoch older than this. "About 60 days." */
export const HISTORY_KEEP_MS = 60 * 24 * 60 * 60 * 1000;

/**
 * @typedef {{ norad: number, name: string, epoch: string, alt_km: number }} HistoryRow
 */

/**
 * The Rassvet name query. Production objects are named RASSVET on CelesTrak.
 * @param {{ celestrak?: { queries?: string[] } } | null | undefined} config
 * @returns {string | null}
 */
export function rassvetGpUrl(config) {
  const queries = Array.isArray(config?.celestrak?.queries) ? config.celestrak.queries : [];
  const named = queries.find((url) => typeof url === "string" && url.includes("NAME=RASSVET"));
  return named ?? null;
}

/**
 * Launch queries for experimental groups. CelesTrak still calls those
 * objects `OBJECT <letter>`, so the name query never returns them.
 * One URL per designator already listed in `celestrak.queries`.
 * Production INTDES queries are left out: the name query already covers them.
 * @param {{ celestrak?: { queries?: string[] }, groups?: { id: string, kind?: string }[], objects?: { group?: string, cospar?: string }[] } | null | undefined} config
 * @returns {string[]}
 */
export function experimentalGpUrls(config) {
  const queries = Array.isArray(config?.celestrak?.queries) ? config.celestrak.queries : [];
  const groups = Array.isArray(config?.groups) ? config.groups : [];
  const objects = Array.isArray(config?.objects) ? config.objects : [];
  const experimental = new Set(
    groups.filter((group) => group?.kind === "experimental").map((group) => group.id),
  );
  const designators = new Set();
  for (const obj of objects) {
    const groupId = obj?.group;
    if (typeof groupId !== "string" || !experimental.has(groupId)) continue;
    const match = /^(\d{4}-\d{3})/.exec(String(obj?.cospar ?? ""));
    if (match) designators.add(match[1]);
  }
  return queries.filter((url) => {
    if (typeof url !== "string") return false;
    try {
      const intdes = new URL(url).searchParams.get("INTDES");
      return intdes != null && designators.has(intdes);
    } catch {
      return false;
    }
  });
}

/**
 * @param {unknown} list
 * @returns {HistoryRow[]}
 */
export function rowsFromGp(list) {
  /** @type {HistoryRow[]} */
  const rows = [];
  if (!Array.isArray(list)) return rows;
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const rec = /** @type {Record<string, unknown>} */ (raw);
    const norad = Number(rec.NORAD_CAT_ID);
    const epoch = typeof rec.EPOCH === "string" ? rec.EPOCH : "";
    if (!Number.isFinite(norad) || epoch.length === 0) continue;
    const orbit = orbitFromGp(rec);
    if (!orbit || !Number.isFinite(orbit.approxAltitudeKm)) continue;
    rows.push({
      norad,
      name: typeof rec.OBJECT_NAME === "string" ? rec.OBJECT_NAME : "",
      epoch,
      alt_km: Math.round(orbit.approxAltitudeKm * 1000) / 1000,
    });
  }
  return rows;
}

/**
 * Keep GP rows whose NORAD is in the catalog and store our display name.
 * An INTDES rideshare and a CelesTrak `OBJECT P` label both drop out.
 * @param {unknown} list
 * @param {Array<{ norad?: number, name?: string }> | null | undefined} objects
 * @returns {HistoryRow[]}
 */
export function rowsForCatalog(list, objects) {
  /** @type {Map<number, string>} */
  const names = new Map();
  for (const obj of objects ?? []) {
    const norad = Number(obj?.norad);
    if (!Number.isFinite(norad)) continue;
    names.set(norad, typeof obj?.name === "string" ? obj.name : "");
  }
  return rowsFromGp(list)
    .filter((row) => names.has(row.norad))
    .map((row) => ({ ...row, name: names.get(row.norad) || row.name }));
}

/**
 * @param {unknown} list
 * @returns {HistoryRow[]}
 */
export function normalizeHistoryRows(list) {
  /** @type {HistoryRow[]} */
  const rows = [];
  if (!Array.isArray(list)) return rows;
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const rec = /** @type {Record<string, unknown>} */ (raw);
    const norad = Number(rec.norad);
    const epoch = typeof rec.epoch === "string" ? rec.epoch : "";
    const alt = Number(rec.alt_km);
    if (!Number.isFinite(norad) || epoch.length === 0 || !Number.isFinite(alt)) continue;
    rows.push({
      norad,
      name: typeof rec.name === "string" ? rec.name : "",
      epoch,
      alt_km: alt,
    });
  }
  return rows;
}

/**
 * @param {unknown} data
 * @returns {HistoryRow[] | null}
 */
export function parseHistoryDocument(data) {
  if (!data || typeof data !== "object") return null;
  const rows = /** @type {{ rows?: unknown }} */ (data).rows;
  if (!Array.isArray(rows)) return null;
  return normalizeHistoryRows(rows);
}

/**
 * De-dupe by (norad, epoch), keep the later row, drop epochs older than 60 days.
 * @param {unknown} existing
 * @param {unknown} incoming
 * @param {Date} now
 * @returns {HistoryRow[]}
 */
export function mergeHistory(existing, incoming, now) {
  /** @type {Map<string, HistoryRow>} */
  const byKey = new Map();
  for (const row of [...normalizeHistoryRows(existing), ...normalizeHistoryRows(incoming)]) {
    byKey.set(`${row.norad}|${row.epoch}`, row);
  }
  const cutoff = now.getTime() - HISTORY_KEEP_MS;
  /** @type {HistoryRow[]} */
  const rows = [];
  for (const row of byKey.values()) {
    const t = epochToMs(row.epoch);
    if (t == null || t < cutoff) continue;
    rows.push(row);
  }
  rows.sort((a, b) => a.norad - b.norad || (epochToMs(a.epoch) ?? 0) - (epochToMs(b.epoch) ?? 0));
  return rows;
}

/**
 * @param {HistoryRow[]} rows
 * @param {Date} now
 */
export function historyDocument(rows, now) {
  return { v: 1, updated: now.toISOString(), rows };
}
