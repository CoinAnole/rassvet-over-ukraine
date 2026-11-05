#!/usr/bin/env node
/**
 * Verify curated NORAD / COSPAR IDs against the CelesTrak GP queries in
 * src/config/objects.json. See docs/new-launch-group.md.
 *
 *   npm run verify:catalog
 *   npm run verify:catalog -- --seed
 *
 * Exit 0: catalog matches GP (or the seed snapshot).
 * Exit 1: identity, unexpected-name, or stale-decay failure.
 * Exit 2: a query failed, so presence was not scored.
 */
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseHistoryDocument } from "../src/lib/catalog/altitude-history.mjs";
import { BLOB_PATH } from "../src/lib/catalog/blob-data.mjs";
import { loadRemoteJson } from "../src/lib/catalog/remote-json.mjs";
import { parseReentryDocument } from "../src/lib/catalog/reentries.mjs";
import { auditCatalog, renderAudit } from "./catalog-hygiene.mjs";

function isMainModule(moduleUrl) {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(moduleUrl);
  } catch {
    return false;
  }
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TIMEOUT_MS = 30_000;

export function readObjectsConfig(path = join(root, "src/config/objects.json")) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function readSeedIndex(path = join(root, "src/data/catalog-seed.json")) {
  const seed = JSON.parse(readFileSync(path, "utf8"));
  const objects = Array.isArray(seed.objects) ? seed.objects : [];
  return {
    fetchedAt: typeof seed.fetched_at === "string" ? seed.fetched_at : null,
    ids: objects.map((row) => Number(row.NORAD_CAT_ID)).filter((id) => Number.isFinite(id)),
    objects,
  };
}

export async function fetchGpQuery(url, userAgent) {
  let lastError = "unknown error";
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          "User-Agent": userAgent,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        continue;
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        lastError = "response was not a JSON array";
        continue;
      }
      return { url, ok: true, error: null, count: data.length, objects: data };
    } catch (err) {
      const aborted = err && typeof err === "object" && "name" in err && err.name === "AbortError";
      lastError = aborted ? `timeout after ${TIMEOUT_MS}ms` : String(err?.message || err);
    } finally {
      clearTimeout(timer);
    }
  }
  return { url, ok: false, error: lastError, count: 0, objects: [] };
}

/**
 * Blob first, then the frozen GitHub data branch. `source` says which copy answered.
 * @param {object} config
 * @param {string} userAgent
 */
export async function loadAltitudeHistory(config, userAgent) {
  const loaded = await loadRemoteJson({
    pathname: BLOB_PATH.altitudeHistory,
    githubUrl: config.altitudeHistoryUrl,
    userAgent,
  });
  if (loaded.data == null) {
    return {
      ok: false,
      error:
        loaded.source === "snapshot"
          ? "no altitude history from Blob or the data branch"
          : "empty history document",
      rows: [],
      source: loaded.source,
    };
  }
  const rows = parseHistoryDocument(loaded.data);
  if (!rows) {
    return { ok: false, error: "history JSON has no rows array", rows: [], source: loaded.source };
  }
  return { ok: true, error: null, rows, source: loaded.source };
}

/**
 * @param {object} config
 * @param {string} userAgent
 */
export async function loadReentries(config, userAgent) {
  const loaded = await loadRemoteJson({
    pathname: BLOB_PATH.reentries,
    githubUrl: config.reentriesUrl,
    userAgent,
  });
  if (loaded.data == null) {
    return {
      ok: false,
      error:
        loaded.source === "snapshot"
          ? "no reentries from Blob or the data branch"
          : "empty reentry document",
      records: [],
      source: loaded.source,
    };
  }
  return {
    ok: true,
    error: null,
    records: parseReentryDocument(loaded.data),
    source: loaded.source,
  };
}

export async function verifyCatalog({ seedOnly = false, now = new Date() } = {}) {
  const config = readObjectsConfig();
  const seed = readSeedIndex();
  const userAgent = String(config.userAgent || "RassvetOverUkraine/0.1 (catalog hygiene)");
  let queries;
  let records;
  let source;

  if (seedOnly) {
    source = "seed";
    queries = [
      {
        url: "seed://src/data/catalog-seed.json",
        ok: true,
        error: null,
        count: seed.objects.length,
        objects: seed.objects,
      },
    ];
    records = seed.objects;
  } else {
    source = "live";
    const urls = Array.isArray(config.celestrak?.queries) ? config.celestrak.queries : [];
    queries = await Promise.all(urls.map((url) => fetchGpQuery(url, userAgent)));
    records = queries.flatMap((query) => (query.ok ? query.objects : []));
  }

  const history = seedOnly ? null : await loadAltitudeHistory(config, userAgent);
  const reentryDoc = seedOnly ? null : await loadReentries(config, userAgent);
  const reentries = reentryDoc?.ok ? reentryDoc.records : [];

  const report = auditCatalog({
    config,
    records,
    queries,
    source,
    now,
    seed: { fetchedAt: seed.fetchedAt, ids: seed.ids },
    history,
    reentries,
    reentriesSource: reentryDoc?.source ?? null,
    reentriesError: reentryDoc && !reentryDoc.ok ? reentryDoc.error : null,
  });
  return { report, text: renderAudit(report) };
}

async function main() {
  const seedOnly = process.argv.includes("--seed");
  const { report, text } = await verifyCatalog({ seedOnly });
  process.stdout.write(text);
  process.exitCode = report.exitCode;
}

if (isMainModule(import.meta.url)) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 2;
  });
}
