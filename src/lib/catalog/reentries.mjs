/**
 * Confirmed reentries, from CelesTrak SATCAT. The recorder writes the public
 * Blob path `data/reentries.json`. The GitHub data branch is the fallback.
 * Records are never pruned. A missing decay date is not a record: the app
 * decides presumed reentry from a stale low orbit at read time.
 */

/** Last altitude under this, with a stale epoch, is presumed reentry. */
export const REENTRY_ALT_KM = 250;

/**
 * @typedef {{
 *   norad: number,
 *   name: string,
 *   decay_date: string | null,
 *   last_epoch: string | null,
 *   last_alt_km: number | null,
 *   first_seen: string,
 * }} ReentryRecord
 */

/**
 * @param {number} norad
 */
export function satcatUrl(norad) {
  return `https://celestrak.org/satcat/records.php?CATNR=${norad}&FORMAT=JSON`;
}

/**
 * A SATCAT row is a confirmed reentry when it has a decay date or ops code D.
 * Operational objects (`+`, empty decay date) return null.
 * @param {unknown} row
 * @returns {{ decay_date: string | null } | null}
 */
export function confirmedDecay(row) {
  if (!row || typeof row !== "object") return null;
  const rec = /** @type {Record<string, unknown>} */ (row);
  const decay = typeof rec.DECAY_DATE === "string" ? rec.DECAY_DATE.trim() : "";
  const ops = typeof rec.OPS_STATUS_CODE === "string" ? rec.OPS_STATUS_CODE.trim() : "";
  if (!decay && ops !== "D") return null;
  return { decay_date: decay || null };
}

/**
 * @param {unknown} data
 * @returns {ReentryRecord[]}
 */
export function parseReentryDocument(data) {
  if (!data || typeof data !== "object") return [];
  const records = /** @type {{ records?: unknown }} */ (data).records;
  if (!Array.isArray(records)) return [];
  /** @type {ReentryRecord[]} */
  const out = [];
  for (const raw of records) {
    if (!raw || typeof raw !== "object") continue;
    const rec = /** @type {Record<string, unknown>} */ (raw);
    const norad = Number(rec.norad);
    if (!Number.isFinite(norad)) continue;
    const alt = rec.last_alt_km == null ? null : Number(rec.last_alt_km);
    out.push({
      norad,
      name: typeof rec.name === "string" ? rec.name : "",
      decay_date: typeof rec.decay_date === "string" && rec.decay_date.trim() ? rec.decay_date.trim() : null,
      last_epoch: typeof rec.last_epoch === "string" && rec.last_epoch ? rec.last_epoch : null,
      last_alt_km: alt != null && Number.isFinite(alt) ? alt : null,
      first_seen: typeof rec.first_seen === "string" ? rec.first_seen : "",
    });
  }
  return out;
}

/**
 * Add or refresh confirmed reentries. Existing records stay, including ones
 * older than the altitude history window. `first_seen` is the run that
 * first recorded the decay.
 * @param {ReentryRecord[]} existing
 * @param {Array<Partial<ReentryRecord> & { norad: number }>} updates
 * @param {string} nowIso
 * @returns {ReentryRecord[]}
 */
export function mergeReentryRecords(existing, updates, nowIso) {
  /** @type {Map<number, ReentryRecord>} */
  const by = new Map();
  for (const record of existing) {
    if (!Number.isFinite(record?.norad)) continue;
    by.set(record.norad, { ...record });
  }
  for (const update of updates) {
    const norad = Number(update?.norad);
    if (!Number.isFinite(norad)) continue;
    const prev = by.get(norad);
    const decay =
      typeof update.decay_date === "string" && update.decay_date.trim()
        ? update.decay_date.trim()
        : null;
    const lastEpoch = typeof update.last_epoch === "string" && update.last_epoch ? update.last_epoch : null;
    const lastAlt = update.last_alt_km == null ? null : Number(update.last_alt_km);
    if (!prev) {
      by.set(norad, {
        norad,
        name: typeof update.name === "string" ? update.name : "",
        decay_date: decay,
        last_epoch: lastEpoch,
        last_alt_km: lastAlt != null && Number.isFinite(lastAlt) ? lastAlt : null,
        first_seen: nowIso,
      });
      continue;
    }
    if (typeof update.name === "string" && update.name) prev.name = update.name;
    if (decay) prev.decay_date = decay;
    if (lastEpoch) prev.last_epoch = lastEpoch;
    if (lastAlt != null && Number.isFinite(lastAlt)) prev.last_alt_km = lastAlt;
    if (!prev.first_seen) prev.first_seen = nowIso;
  }
  return [...by.values()].sort((a, b) => a.norad - b.norad);
}

/**
 * @param {ReentryRecord[]} records
 * @param {string} updated
 */
export function reentryDocument(records, updated) {
  return { v: 1, updated, records };
}
