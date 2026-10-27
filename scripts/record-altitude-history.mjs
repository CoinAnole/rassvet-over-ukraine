#!/usr/bin/env node
/**
 * Fetch the Rassvet name query and each experimental launch query, and append
 * altitudes for catalogued NORADs. Then ask SATCAT only about objects that
 * are missing or stale in that combined fetch.
 *
 * A GP fetch that still fails after retries exits 1, so the Action goes red.
 * A feed with no new epochs exits 0 and says so. A SATCAT miss is a warning;
 * the GP rows already fetched are still saved.
 *
 *   node scripts/record-altitude-history.mjs --file /tmp/altitude-data/altitude-history.json
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  historyDocument,
  experimentalGpUrls,
  mergeHistory,
  parseHistoryDocument,
  rassvetGpUrl,
  rowsForCatalog,
} from "../src/lib/catalog/altitude-history.mjs";
import {
  CELESTRAK_ATTEMPTS,
  fetchCelestrakJson,
  satcatCandidates,
} from "../src/lib/catalog/celestrak-fetch.mjs";
import {
  confirmedDecay,
  mergeReentryRecords,
  parseReentryDocument,
  reentryDocument,
  satcatUrl,
} from "../src/lib/catalog/reentries.mjs";
import { gpLatestDocument } from "../src/lib/catalog/gp-latest.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

function output(key, value) {
  const line = `${key}=${value}`;
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`);
  console.log(line);
}

function readConfig() {
  return JSON.parse(readFileSync(resolve(root, "src/config/objects.json"), "utf8"));
}

function readExisting(file) {
  try {
    return parseHistoryDocument(JSON.parse(readFileSync(file, "utf8"))) ?? [];
  } catch {
    return [];
  }
}

function readReentries(file) {
  try {
    return parseReentryDocument(JSON.parse(readFileSync(file, "utf8")));
  } catch {
    return [];
  }
}

function newestSample(rows, norad) {
  let best = null;
  for (const row of rows) {
    if (row.norad !== norad) continue;
    if (!best || String(row.epoch) > String(best.epoch)) best = row;
  }
  return best;
}

function writeSummary(lines) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
}

/**
 * @param {object} opts
 * @param {string} opts.file
 * @param {object} opts.config
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {(ms: number) => Promise<void>} [opts.sleep]
 * @param {Date} [opts.now]
 * @param {(msg: string) => void} [opts.log]
 * @param {(msg: string) => void} [opts.warn]
 * @param {number} [opts.attempts]
 * @param {number} [opts.timeoutMs]
 */
export async function recordAltitudes(opts) {
  const log = opts.log ?? ((msg) => console.log(msg));
  const warn = opts.warn ?? ((msg) => console.error(`::warning::${msg}`));
  const now = opts.now ?? new Date();
  const attempts = opts.attempts ?? CELESTRAK_ATTEMPTS;
  const file = opts.file;
  const reentryFile = file.replace(/altitude-history\.json$/, "reentries.json");
  const config = opts.config;
  const userAgent = String(
    config.userAgent || "RassvetOverUkraine/0.1 (unofficial geometric coverage tracker)",
  );
  const tracked = Array.isArray(config.objects) ? config.objects : [];
  const queries = [];
  const nameUrl = rassvetGpUrl(config);
  if (nameUrl) queries.push({ url: nameUrl, label: "NAME=RASSVET" });
  for (const url of experimentalGpUrls(config)) {
    let label = url;
    try {
      label = `INTDES=${new URL(url).searchParams.get("INTDES")}`;
    } catch {
      /* keep the raw url */
    }
    queries.push({ url, label });
  }
  const summary = [];
  /** @type {string[]} */
  const warnings = [];
  const note = (msg) => {
    warnings.push(msg);
    warn(msg);
  };

  if (queries.length === 0) {
    const msg = "objects.json has no GP queries. Altitude history was not updated.";
    note(msg);
    summary.push(`GP: ${msg}`);
    writeSummary(summary);
    return { exitCode: 1, changed: false, warnings };
  }

  /** @type {object[]} */
  const gpRows = [];
  let successfulQueries = 0;
  for (const query of queries) {
    const fetched = await fetchCelestrakJson(query.url, {
      userAgent,
      fetchImpl: opts.fetchImpl,
      sleep: opts.sleep,
      attempts,
      timeoutMs: opts.timeoutMs,
    });
    if (!fetched.ok || !Array.isArray(fetched.data)) {
      const why = fetched.ok ? "response was not a JSON array" : fetched.error;
      note(`${query.label} unavailable (${why}).`);
      continue;
    }
    successfulQueries += 1;
    gpRows.push(...fetched.data);
  }

  const incoming = rowsForCatalog(gpRows, tracked);
  if (incoming.length === 0) {
    const msg = "CelesTrak returned no usable altitudes for catalogued objects. Altitude history was not updated.";
    console.error(`::error::${msg}`);
    summary.push(`GP: ${msg}`);
    for (const msg of warnings) summary.push(`Warning: ${msg}`);
    writeSummary(summary);
    log(msg);
    return { exitCode: 1, changed: false, warnings };
  }

  const existing = readExisting(file);
  const rows = mergeHistory(existing, incoming, now);
  let changed = false;
  if (JSON.stringify(existing) === JSON.stringify(rows)) {
    log(`Altitude history unchanged (${rows.length} rows). No new GP epochs.`);
    summary.push(
      `GP: ${incoming.length} catalogued objects, no new epochs (${rows.length} rows already stored, ${successfulQueries} of ${queries.length} queries).`,
    );
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(historyDocument(rows, now))}\n`);
    log(`Wrote ${rows.length} altitude rows (${incoming.length} from this fetch, ${successfulQueries} queries).`);
    summary.push(
      `GP: wrote ${rows.length} rows (${incoming.length} from this fetch, ${successfulQueries} of ${queries.length} queries).`,
    );
    changed = true;
  }

  const trackedIds = new Set(tracked.map((obj) => Number(obj.norad)));
  if (successfulQueries === queries.length) {
    const byNorad = new Map();
    for (const row of gpRows) {
      const norad = Number(row?.NORAD_CAT_ID);
      if (!trackedIds.has(norad) || !row?.EPOCH || row.MEAN_MOTION == null) continue;
      byNorad.set(norad, row);
    }
    if (byNorad.size > 0) {
      const gpFile = file.replace(/altitude-history\.json$/, "gp-latest.json");
      const next = `${JSON.stringify(gpLatestDocument([...byNorad.values()], now.toISOString()))}\n`;
      let prev = null;
      try {
        prev = readFileSync(gpFile, "utf8");
      } catch {
        prev = null;
      }
      if (prev !== next) {
        mkdirSync(dirname(gpFile), { recursive: true });
        writeFileSync(gpFile, next);
        log(`Wrote gp-latest.json (${byNorad.size} objects).`);
        summary.push(`GP snapshot: ${byNorad.size} objects at ${now.toISOString()}.`);
        changed = true;
      }
    }
  } else {
    log("Left gp-latest.json unchanged because a CelesTrak query failed.");
  }
  const gpByNorad = new Map();
  for (const row of gpRows) {
    const norad = Number(row?.NORAD_CAT_ID);
    if (trackedIds.has(norad)) gpByNorad.set(norad, row);
  }
  const recorded = readReentries(reentryFile);
  const confirmed = new Set(recorded.map((record) => record.norad));
  const candidates = satcatCandidates(tracked, gpByNorad, confirmed);
  log(
    `SATCAT candidates: ${candidates.length} (missing from this GP fetch, or more than 72 h behind its newest epoch, and not already recorded).`,
  );

  const updates = [];
  let satcatFailures = 0;
  for (const obj of candidates) {
    const sat = await fetchCelestrakJson(satcatUrl(obj.norad), {
      userAgent,
      fetchImpl: opts.fetchImpl,
      sleep: opts.sleep,
      attempts,
      timeoutMs: opts.timeoutMs,
    });
    if (!sat.ok || !Array.isArray(sat.data)) {
      satcatFailures += 1;
      note(`SATCAT ${obj.norad} (${obj.name}) unavailable (${sat.error || "not a JSON array"}).`);
      continue;
    }
    const decay = confirmedDecay(sat.data[0]);
    if (!decay) continue;
    const last = newestSample(rows, obj.norad);
    updates.push({
      norad: obj.norad,
      name: obj.name,
      decay_date: decay.decay_date,
      last_epoch: last?.epoch ?? null,
      last_alt_km: last?.alt_km ?? null,
    });
  }
  if (satcatFailures > 0) {
    summary.push(`SATCAT: ${satcatFailures} of ${candidates.length} candidate queries failed. GP rows were kept.`);
  } else {
    summary.push(`SATCAT: checked ${candidates.length} candidate${candidates.length === 1 ? "" : "s"}.`);
  }

  const records = mergeReentryRecords(recorded, updates, now.toISOString());
  if (JSON.stringify(recorded) === JSON.stringify(records)) {
    log(`Reentries unchanged (${records.length} records).`);
  } else {
    mkdirSync(dirname(reentryFile), { recursive: true });
    writeFileSync(reentryFile, `${JSON.stringify(reentryDocument(records, now.toISOString()))}\n`);
    log(`Wrote ${records.length} reentry records (${updates.length} confirmed this run).`);
    changed = true;
  }

  for (const msg of warnings) summary.push(`Warning: ${msg}`);
  writeSummary(summary);
  return { exitCode: 0, changed, warnings };
}

async function main() {
  const file = arg("--file");
  if (!file) {
    console.error("usage: node scripts/record-altitude-history.mjs --file <altitude-history.json>");
    process.exitCode = 1;
    return;
  }
  const result = await recordAltitudes({ file, config: readConfig() });
  output("changed", result.changed ? "true" : "false");
  process.exitCode = result.exitCode;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    output("changed", "false");
    process.exitCode = 1;
  });
}
