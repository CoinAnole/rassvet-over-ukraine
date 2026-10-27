import seed from "../../data/catalog-seed.json" with { type: "json" };
import { applyClimbRates } from "./apply-climb.ts";
import { applyReentries } from "./reentry.ts";
import { parseHistoryDocument } from "./altitude-history.mjs";
import { BLOB_PATH } from "./blob-data.mjs";
import { parseReentryDocument } from "./reentries.mjs";
import { parseGpLatest } from "./gp-latest.mjs";
import { loadRemoteJson } from "./remote-json.mjs";
import { chooseCatalogElements } from "./gp-source.ts";
import { getObjectsConfig, buildCatalog, indexOmms } from "./build.ts";
import type { CatalogPayload } from "./types.ts";

type Cache = { at: number; payload: CatalogPayload };
let cache: Cache | null = null;
const CACHE_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

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

export async function loadCatalog(now = new Date()): Promise<CatalogPayload> {
  if (cache && now.getTime() - cache.at < CACHE_MS) return cache.payload;
  const cfg = getObjectsConfig();
  const wanted = new Set(cfg.objects.map((o) => o.norad));

  const [results, historyDoc, reentryDoc, gpLatestDoc] = await Promise.all([
    Promise.all(cfg.celestrak.queries.map((url) => fetchJson(url, cfg.userAgent))),
    loadRemoteJson({
      pathname: BLOB_PATH.altitudeHistory,
      githubUrl: cfg.altitudeHistoryUrl,
      userAgent: cfg.userAgent,
    }),
    loadRemoteJson({
      pathname: BLOB_PATH.reentries,
      githubUrl: cfg.reentriesUrl,
      userAgent: cfg.userAgent,
    }),
    loadRemoteJson({
      pathname: BLOB_PATH.gpLatest,
      githubUrl: cfg.gpLatestUrl,
      userAgent: cfg.userAgent,
    }),
  ]);
  const chosen = chooseCatalogElements({
    wanted,
    seedOmms,
    seedFetchedAt,
    liveLists: results,
    saved: parseGpLatest(gpLatestDoc),
    now,
  });
  const historyRows = parseHistoryDocument(historyDoc);
  const payload = applyReentries(
    applyClimbRates(
      buildCatalog({
        omms: chosen.omms,
        fetchedAt: chosen.fetchedAt,
        source: chosen.source,
        warning:
          chosen.source === "live"
            ? null
            : chosen.source === "saved"
              ? "Live catalog fetch failed; using the saved GP snapshot."
              : "Live catalog fetch failed; using a checked-in public GP snapshot from 2026-09-20.",
        now,
      }),
      historyRows,
    ),
    parseReentryDocument(reentryDoc),
    historyRows,
  );

  if (chosen.source === "live" && payload.missingKnownIds.length > 0) {
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
