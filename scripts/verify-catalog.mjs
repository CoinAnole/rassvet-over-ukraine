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
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { auditCatalog, renderAudit } from "./catalog-hygiene.mjs";
import { isMainModule } from "./with-app-env.mjs";

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

  const report = auditCatalog({
    config,
    records,
    queries,
    source,
    now,
    seed: { fetchedAt: seed.fetchedAt, ids: seed.ids },
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
