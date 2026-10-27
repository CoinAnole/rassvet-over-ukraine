#!/usr/bin/env node
/**
 * Copy the current GitHub `data` branch files into the public Blob store.
 * Requires BLOB_READ_WRITE_TOKEN and nothing else. Fetches every file before
 * writing, so a failed download does not leave a partial copy.
 *
 * Run this once before the first `npm run record:altitudes`. The recorder
 * treats a missing Blob object as an empty log.
 *
 *   npm run seed:blob
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BLOB_PATH, writeBlobJson } from "../src/lib/catalog/blob-data.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TIMEOUT_MS = 20_000;

function readConfig() {
  return JSON.parse(readFileSync(resolve(root, "src/config/objects.json"), "utf8"));
}

/**
 * @param {object} opts
 * @param {object} opts.config
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {{ token?: string | null, put?: typeof import("@vercel/blob").put }} [opts.blob]
 */
export async function seedBlobFromGithub(opts) {
  const config = opts.config;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const userAgent = String(
    config.userAgent || "RassvetOverUkraine/0.1 (unofficial geometric coverage tracker)",
  );
  const files = [
    [BLOB_PATH.altitudeHistory, config.altitudeHistoryUrl],
    [BLOB_PATH.reentries, config.reentriesUrl],
    [BLOB_PATH.gpLatest, config.gpLatestUrl],
  ];
  /** @type {{ pathname: string, body: string }[]} */
  const bodies = [];
  for (const [pathname, url] of files) {
    if (typeof url !== "string" || url.length === 0) {
      throw new Error(`objects.json has no URL for ${pathname}. Blob was not updated.`);
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetchImpl(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": userAgent, Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`Could not read ${url} (HTTP ${res.status}). Blob was not updated.`);
      }
      const text = await res.text();
      JSON.parse(text);
      bodies.push({ pathname, body: text.endsWith("\n") ? text : `${text}\n` });
    } finally {
      clearTimeout(timer);
    }
  }
  /** @type {{ pathname: string, url: string }[]} */
  const written = [];
  for (const file of bodies) {
    const blob = await writeBlobJson(file.pathname, file.body, opts.blob);
    written.push({ pathname: file.pathname, url: blob.url });
  }
  return written;
}

async function main() {
  const written = await seedBlobFromGithub({ config: readConfig() });
  for (const file of written) console.log(`${file.pathname} ${file.url}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
