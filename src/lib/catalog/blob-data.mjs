/**
 * Public Vercel Blob copies of the catalog files.
 * Pathnames stay stable so a reader can fetch
 * `https://<storeId>.public.blob.vercel-storage.com/data/<file>` with no token.
 * Writes use `BLOB_READ_WRITE_TOKEN` through `@vercel/blob`.
 */

/** @typedef {"unconfigured" | "missing" | "unreachable"} BlobReadFailure */

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
 * @param {string} pathname
 * @param {{
 *   token?: string | null,
 *   useCache?: boolean,
 *   get?: typeof import("@vercel/blob").get,
 * }} [options]
 * @returns {Promise<{ ok: true, data: unknown } | { ok: false, reason: BlobReadFailure, error?: string }>}
 */
export async function readBlobJson(pathname, options = {}) {
  const token = options.token === undefined ? blobReadWriteToken() : options.token;
  if (!token) return { ok: false, reason: "unconfigured" };
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
    return { ok: true, data: JSON.parse(text) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
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
 * }} [options]
 */
export async function writeBlobJson(pathname, value, options = {}) {
  const token = options.token === undefined ? blobReadWriteToken() : options.token;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not set.");
  const put = options.put ?? (await import("@vercel/blob")).put;
  const body = typeof value === "string" ? value : `${JSON.stringify(value)}\n`;
  return put(pathname, body, {
    access: "public",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: BLOB_CACHE_SECONDS,
  });
}
