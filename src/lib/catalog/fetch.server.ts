import seed from "../../data/catalog-seed.json" with { type: "json" };
import { applyClimbRates } from "./apply-climb.ts";
import { applyReentries } from "./reentry.ts";
import { parseHistoryDocument } from "./altitude-history.mjs";
import { parseReentryDocument } from "./reentries.mjs";
import { getObjectsConfig, buildCatalog, indexOmms } from "./build.ts";
import type { CatalogOmm, CatalogPayload } from "./types.ts";

type Cache = { at: number; payload: CatalogPayload };
let cache: Cache | null = null;
const CACHE_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const HISTORY_TIMEOUT_MS = 8000;

const seedOmms = indexOmms((seed as { objects: unknown[] }).objects);
const seedFetchedAt = (seed as { fetched_at: string }).fetched_at;

async function fetchJson(url: string, userAgent: string): Promise<unknown[] | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHistory(url: string, userAgent: string): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), HISTORY_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function loadCatalog(now = new Date()): Promise<CatalogPayload> {
  if (cache && now.getTime() - cache.at < CACHE_MS) return cache.payload;
  const cfg = getObjectsConfig();
  const wanted = new Set(cfg.objects.map((o) => o.norad));
  const merged = new Map<number, CatalogOmm>(seedOmms);

  const [results, historyDoc, reentryDoc] = await Promise.all([
    Promise.all(cfg.celestrak.queries.map((url) => fetchJson(url, cfg.userAgent))),
    cfg.altitudeHistoryUrl
      ? fetchHistory(cfg.altitudeHistoryUrl, cfg.userAgent)
      : Promise.resolve(null),
    cfg.reentriesUrl ? fetchHistory(cfg.reentriesUrl, cfg.userAgent) : Promise.resolve(null),
  ]);
  let liveHits = 0;
  for (const list of results) {
    if (!list) continue;
    const idx = indexOmms(list);
    for (const [id, omm] of idx) {
      if (!wanted.has(id)) continue;
      merged.set(id, omm);
      liveHits += 1;
    }
  }

  const liveOk = liveHits > 0;
  const historyRows = parseHistoryDocument(historyDoc);
  const payload = applyReentries(
    applyClimbRates(
      buildCatalog({
        omms: merged,
        fetchedAt: liveOk ? now.toISOString() : seedFetchedAt,
        source: liveOk ? "live" : "seed",
        warning: liveOk
          ? null
          : "Live catalog fetch failed; using a checked-in public GP snapshot from 2026-09-20.",
        now,
      }),
      historyRows,
    ),
    parseReentryDocument(reentryDoc),
    historyRows,
  );

  if (liveOk && payload.missingKnownIds.length > 0) {
    payload.warning = `Known NORAD IDs missing from the public catalog: ${payload.missingKnownIds.join(", ")}.`;
  }

  cache = { at: now.getTime(), payload };
  return payload;
}

export function catalogFromSeed(now = new Date()): CatalogPayload {
  return buildCatalog({
    omms: seedOmms,
    fetchedAt: seedFetchedAt,
    source: "seed",
    warning: "Using checked-in public GP snapshot.",
    now,
  });
}
