/**
 * One CelesTrak read per scheduled run, with a short retry.
 *
 * CelesTrak asks clients to identify themselves and not to re-download data
 * that has not changed. This module retries only transient failures
 * (429 and 5xx, plus network errors). A 403 is not retried.
 */

import { epochToMs } from "../orbit/climb-rate.mjs";

/** Status codes worth another try. A 403 is a refusal, not a blip. */
export const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export const CELESTRAK_ATTEMPTS = 3;
export const CELESTRAK_TIMEOUT_MS = 20_000;

/** An epoch this far behind the newest GP epoch is worth a SATCAT look. */
export const SATCAT_STALE_MS = 72 * 60 * 60 * 1000;

/**
 * Wait after attempt 0 fails, then after attempt 1. Two seconds, then four.
 * @param {number} failedAttempt zero-based index of the attempt that just failed
 */
export function backoffMs(failedAttempt) {
  return 2_000 * 2 ** failedAttempt;
}

/**
 * @param {string} url
 * @param {{
 *   userAgent: string,
 *   fetchImpl?: typeof fetch,
 *   sleep?: (ms: number) => Promise<void>,
 *   attempts?: number,
 *   timeoutMs?: number,
 * }} opts
 */
export async function fetchCelestrakJson(url, opts) {
  const attempts = opts.attempts ?? CELESTRAK_ATTEMPTS;
  const timeoutMs = opts.timeoutMs ?? CELESTRAK_TIMEOUT_MS;
  const sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const fetchImpl = opts.fetchImpl ?? fetch;
  let last = "no attempt";
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(backoffMs(attempt - 1));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        signal: ctrl.signal,
        headers: {
          "User-Agent": opts.userAgent,
          Accept: "application/json",
        },
      });
      const body = await res.text();
      const snippet = body.replace(/\s+/g, " ").trim().slice(0, 160);
      if (!res.ok) {
        last = snippet ? `HTTP ${res.status} ${snippet}` : `HTTP ${res.status}`;
        if (!RETRYABLE_STATUS.has(res.status)) {
          return { ok: false, error: last, retryable: false, data: null };
        }
        continue;
      }
      try {
        return { ok: true, error: null, retryable: false, data: JSON.parse(body) };
      } catch {
        return { ok: false, error: "response was not JSON", retryable: false, data: null };
      }
    } catch (err) {
      const aborted = err && typeof err === "object" && "name" in err && err.name === "AbortError";
      const message = err instanceof Error ? err.message : String(err);
      const cause =
        err instanceof Error && err.cause instanceof Error ? `: ${err.cause.message}` : "";
      last = aborted ? `timeout after ${timeoutMs}ms` : `${message}${cause}`;
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, error: last, retryable: true, data: null };
}

/**
 * SATCAT is only for a tracked object that is missing from this GP fetch,
 * or whose epoch is more than 72 hours behind the newest epoch in that fetch.
 * An object already recorded as decayed is not asked again.
 * @param {Array<{ norad: number, name?: string }>} tracked
 * @param {Map<number, { EPOCH?: string }>} gpByNorad
 * @param {Set<number>} confirmedNorads
 */
export function satcatCandidates(tracked, gpByNorad, confirmedNorads) {
  let referenceMs = 0;
  for (const row of gpByNorad.values()) {
    const t = epochToMs(row?.EPOCH);
    if (t != null && t > referenceMs) referenceMs = t;
  }
  /** @type {Array<{ norad: number, name?: string }>} */
  const out = [];
  for (const obj of tracked) {
    const norad = Number(obj?.norad);
    if (!Number.isFinite(norad) || confirmedNorads.has(norad)) continue;
    const gp = gpByNorad.get(norad);
    if (!gp) {
      out.push(obj);
      continue;
    }
    const t = epochToMs(gp.EPOCH);
    if (referenceMs && t != null && referenceMs - t > SATCAT_STALE_MS) out.push(obj);
  }
  return out;
}
