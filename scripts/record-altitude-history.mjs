#!/usr/bin/env node
/**
 * Fetch the Rassvet GP JSON once and append altitudes to the history file.
 *
 * CelesTrak errors leave the file untouched and exit 0. The workflow commits
 * the file only when this process reports changed=true, and only on the data branch.
 *
 *   node scripts/record-altitude-history.mjs --file /tmp/altitude-data/altitude-history.json
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  historyDocument,
  mergeHistory,
  parseHistoryDocument,
  rassvetGpUrl,
  rowsFromGp,
} from "../src/lib/catalog/altitude-history.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TIMEOUT_MS = 30_000;

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

async function fetchGp(url, userAgent) {
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
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, objects: [] };
    const data = await res.json();
    if (!Array.isArray(data)) return { ok: false, error: "response was not a JSON array", objects: [] };
    return { ok: true, error: null, objects: data };
  } catch (err) {
    const aborted = err && typeof err === "object" && "name" in err && err.name === "AbortError";
    const message = err instanceof Error ? err.message : String(err);
    const cause =
      err instanceof Error && err.cause instanceof Error ? `: ${err.cause.message}` : "";
    return {
      ok: false,
      error: aborted ? `timeout after ${TIMEOUT_MS}ms` : `${message}${cause}`,
      objects: [],
    };
  } finally {
    clearTimeout(timer);
  }
}

function readExisting(file) {
  try {
    return parseHistoryDocument(JSON.parse(readFileSync(file, "utf8"))) ?? [];
  } catch {
    return [];
  }
}

async function main() {
  const file = arg("--file");
  if (!file) {
    console.error("usage: node scripts/record-altitude-history.mjs --file <altitude-history.json>");
    process.exitCode = 1;
    return;
  }

  const config = readConfig();
  const url = rassvetGpUrl(config);
  const userAgent = String(
    config.userAgent || "RassvetOverUkraine/0.1 (unofficial geometric coverage tracker)",
  );
  if (!url) {
    console.error("objects.json has no NAME=RASSVET query. Leaving altitude history unchanged.");
    output("changed", "false");
    return;
  }

  const fetched = await fetchGp(url, userAgent);
  if (!fetched.ok) {
    console.error(`CelesTrak unavailable (${fetched.error}). Leaving altitude history unchanged.`);
    output("changed", "false");
    return;
  }
  const incoming = rowsFromGp(fetched.objects);
  if (incoming.length === 0) {
    console.error("CelesTrak returned no usable altitudes. Leaving altitude history unchanged.");
    output("changed", "false");
    return;
  }

  const existing = readExisting(file);
  const now = new Date();
  const rows = mergeHistory(existing, incoming, now);
  if (JSON.stringify(existing) === JSON.stringify(rows)) {
    console.log(`Altitude history unchanged (${rows.length} rows).`);
    output("changed", "false");
    return;
  }

  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(historyDocument(rows, now))}\n`);
  console.log(`Wrote ${rows.length} altitude rows (${incoming.length} from this fetch).`);
  output("changed", "true");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  output("changed", "false");
  process.exitCode = 1;
});
