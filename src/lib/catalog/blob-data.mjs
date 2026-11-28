/**
 * Public Vercel Blob copies of the catalog files.
 * Page reads fetch `https://<storeId>.public.blob.vercel-storage.com/<pathname>`
 * with no token. The store id comes from `BLOB_STORE_ID`, `BLOB_PUBLIC_BASE_URL`,
 * or the read-write token. Writes use `BLOB_READ_WRITE_TOKEN` through `@vercel/blob`.
 * A recorder read (`useCache: false` with a token) takes the ifMatch etag from
 * `head()`, because `put` rejects the public CDN etag header.
 */
import { BlobNotFoundError, BlobPreconditionFailedError } from "@vercel/blob";

/** @typedef {"unconfigured" | "missing" | "unreachable"} BlobReadFailure */

/**
 * @typedef {{ ok: true, data: unknown, etag?: string | null } | { ok: false, reason: BlobReadFailure, error?: string, etag?: string | null }} BlobReadResult
 */

export const BLOB_PATH = {
  altitudeHistory: "data/altitude-history.json",
  reentries: "data/reentries.json",
  gpLatest: "data/gp-latest.json",
};

/** Public CDN cache. The SDK rejects anything under 60 seconds. */
export const BLOB_CACHE_SECONDS = 60;

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string | null}
 */
export function blobReadWriteToken(env = process.env) {
  const token = env.BLOB_READ_WRITE_TOKEN;
  return typeof token === "string" && token.trim().length > 0 ? token.trim() : null;
}

/**
 * Store id embedded in a Vercel Blob read-write token, or null.
 * @param {string | null | undefined} token
 */
export function blobStoreIdFromToken(token) {
  if (!token) return null;
  const parts = token.split("_");
  if (parts[0] !== "vercel" || parts[1] !== "blob" || parts[2] !== "rw") return null;
  return parts[3] ? parts[3] : null;
}

/**
 * Origin of the public Blob store, with no trailing slash. Null when unknown.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function blobPublicBase(env = process.env) {
  const explicit =
    typeof env.BLOB_PUBLIC_BASE_URL === "string" ? env.BLOB_PUBLIC_BASE_URL.trim() : "";
  if (explicit) return explicit.replace(/\/$/, "");
  const fromEnv = typeof env.BLOB_STORE_ID === "string" ? env.BLOB_STORE_ID.trim() : "";
  const storeId = fromEnv || blobStoreIdFromToken(blobReadWriteToken(env));
  if (!storeId) return null;
  return `https://${storeId}.public.blob.vercel-storage.com`;
}

/**
 * @param {unknown} err
 * @param {string | null | undefined} token
 */
function scrubToken(err, token) {
  let message = err instanceof Error ? err.message : String(err);
  if (typeof token === "string" && token.length > 0)
    message = message.split(token).join("[redacted]");
  return message;
}

/**
 * @param {unknown} err
 */
function isBlobMissing(err) {
  if (err instanceof BlobNotFoundError) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /requested blob does not exist/i.test(message);
}

/**
 * The SDK class extends Error and does not set `name`, so it stays `"Error"`.
 * @param {unknown} err
 */
function isPreconditionFailure(err) {
  if (err instanceof BlobPreconditionFailedError) return true;
  if (err && typeof err === "object" && "code" in err && err.code === "precondition_failed")
    return true;
  const message = err instanceof Error ? err.message : String(err);
  return /precondition failed/i.test(message) || /etag mismatch/i.test(message);
}

/**
 * @param {string} url
 * @param {typeof fetch} fetchImpl
 * @param {{ useCache?: boolean }} [options]
 * @returns {Promise<BlobReadResult>}
 */
async function readPublicBlobUrl(url, fetchImpl, options = {}) {
  const useCache = options.useCache !== false;
  const target = useCache ? url : `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    /** @type {RequestInit} */
    const init = {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    };
    if (!useCache) init.cache = "no-store";
    const res = await fetchImpl(target, init);
    if (res.status === 404) return { ok: false, reason: "missing", etag: null };
    if (!res.ok)
      return { ok: false, reason: "unreachable", error: `HTTP ${res.status}`, etag: null };
    const etag = typeof res.headers?.get === "function" ? res.headers.get("etag") : null;
    return { ok: true, data: await res.json(), etag };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: "unreachable", error: message, etag: null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string} pathname
 * @param {{
 *   token?: string | null,
 *   publicBase?: string | null,
 *   useCache?: boolean,
 *   fetchImpl?: typeof fetch,
 *   get?: typeof import("@vercel/blob").get,
 *   head?: typeof import("@vercel/blob").head,
 * }} [options]
 * @returns {Promise<BlobReadResult>}
 */
export async function readBlobJson(pathname, options = {}) {
  const token = options.token === undefined ? blobReadWriteToken() : options.token;
  const publicBase =
    options.publicBase !== undefined
      ? options.publicBase
      : options.token === undefined
        ? blobPublicBase()
        : null;
  // The recorder asks for a fresh copy. `get()` on a public blob still returns
  // the CDN etag, and @vercel/blob 2.8.2 only applies useCache:false to private
  // access, so the ifMatch value comes from head() and the body is cache-busted.
  if (options.useCache === false && token) {
    return readFreshBlobJson(pathname, token, publicBase, options);
  }
  if (!options.get && publicBase) {
    const base = publicBase.replace(/\/$/, "");
    return readPublicBlobUrl(`${base}/${pathname}`, options.fetchImpl ?? fetch, {
      useCache: options.useCache !== false,
    });
  }
  if (!token) return { ok: false, reason: "unconfigured" };
  return readBlobWithSdk(pathname, token, options);
}

/**
 * @param {string} pathname
 * @param {string} token
 * @param {string | null} publicBase
 * @param {{
 *   fetchImpl?: typeof fetch,
 *   head?: typeof import("@vercel/blob").head,
 * }} options
 * @returns {Promise<BlobReadResult>}
 */
async function readFreshBlobJson(pathname, token, publicBase, options) {
  const head = options.head ?? (await import("@vercel/blob")).head;
  /** @type {string | null} */
  let apiEtag = null;
  try {
    const meta = await head(pathname, { token });
    apiEtag = meta && typeof meta.etag === "string" && meta.etag.length > 0 ? meta.etag : null;
  } catch (err) {
    if (isBlobMissing(err)) return { ok: false, reason: "missing", etag: null };
    const message = scrubToken(err, token);
    if (/credentials|BLOB_READ_WRITE_TOKEN|store ID/i.test(message)) {
      return { ok: false, reason: "unconfigured", error: message, etag: null };
    }
    return { ok: false, reason: "unreachable", error: message, etag: null };
  }
  if (!publicBase) {
    const body = await readBlobWithSdk(pathname, token, { ...options, useCache: false });
    if (!body.ok) return body;
    return { ok: true, data: body.data, etag: apiEtag };
  }
  const base = publicBase.replace(/\/$/, "");
  const body = await readPublicBlobUrl(`${base}/${pathname}`, options.fetchImpl ?? fetch, {
    useCache: false,
  });
  if (!body.ok) {
    if (body.reason === "missing") {
      return {
        ok: false,
        reason: "unreachable",
        error: `Blob ${pathname} has metadata but the body was missing.`,
        etag: null,
      };
    }
    return body;
  }
  return { ok: true, data: body.data, etag: apiEtag };
}

/**
 * @param {string} pathname
 * @param {string} token
 * @param {{
 *   useCache?: boolean,
 *   get?: typeof import("@vercel/blob").get,
 * }} options
 * @returns {Promise<BlobReadResult>}
 */
async function readBlobWithSdk(pathname, token, options) {
  const get = options.get ?? (await import("@vercel/blob")).get;
  try {
    const result = await get(pathname, {
      access: "public",
      token,
      useCache: options.useCache !== false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return { ok: false, reason: "missing" };
    }
    const text = await new Response(result.stream).text();
    return { ok: true, data: JSON.parse(text), etag: result.blob?.etag ?? null };
  } catch (err) {
    if (isBlobMissing(err)) return { ok: false, reason: "missing", etag: null };
    const message = scrubToken(err, token);
    if (/credentials|BLOB_READ_WRITE_TOKEN|store ID/i.test(message)) {
      return { ok: false, reason: "unconfigured", error: message };
    }
    return { ok: false, reason: "unreachable", error: message };
  }
}

/**
 * @param {string} pathname
 * @param {unknown} value JSON value, or an already-serialized document
 * @param {{
 *   token?: string | null,
 *   put?: typeof import("@vercel/blob").put,
 *   ifMatch?: string | null,
 * }} [options]
 */
export async function writeBlobJson(pathname, value, options = {}) {
  const token = options.token === undefined ? blobReadWriteToken() : options.token;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not set.");
  const put = options.put ?? (await import("@vercel/blob")).put;
  const body = typeof value === "string" ? value : `${JSON.stringify(value)}\n`;
  /** @type {import("@vercel/blob").PutCommandOptions} */
  const putOptions = {
    access: "public",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: BLOB_CACHE_SECONDS,
  };
  if (options.ifMatch) putOptions.ifMatch = options.ifMatch;
  try {
    return await put(pathname, body, putOptions);
  } catch (err) {
    if (isPreconditionFailure(err)) {
      const conflict = /** @type {Error & { code: string }} */ (
        new Error("Blob was updated by another recorder run.")
      );
      conflict.code = "BLOB_CONFLICT";
      throw conflict;
    }
    if (err instanceof Error && token && err.message.includes(token)) {
      const clean = new Error(scrubToken(err, token));
      throw clean;
    }
    throw err;
  }
}
