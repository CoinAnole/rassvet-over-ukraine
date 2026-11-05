/**
 * Public Vercel Blob copies of the catalog files.
 * Reads fetch `https://<storeId>.public.blob.vercel-storage.com/<pathname>`
 * with no token. The store id comes from `BLOB_STORE_ID`, `BLOB_PUBLIC_BASE_URL`,
 * or the read-write token. Writes use `BLOB_READ_WRITE_TOKEN` through `@vercel/blob`.
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
  const explicit = typeof env.BLOB_PUBLIC_BASE_URL === "string" ? env.BLOB_PUBLIC_BASE_URL.trim() : "";
  if (explicit) return explicit.replace(/\/$/, "");
  const fromEnv = typeof env.BLOB_STORE_ID === "string" ? env.BLOB_STORE_ID.trim() : "";
  const storeId = fromEnv || blobStoreIdFromToken(blobReadWriteToken(env));
  if (!storeId) return null;
  return `https://${storeId}.public.blob.vercel-storage.com`;
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
/**
 * @param {string} url
 * @param {typeof fetch} fetchImpl
 */
/**
 * @param {string} url
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<{ ok: true, data: unknown } | { ok: false, reason: BlobReadFailure, error?: string }>}
 */
async function readPublicBlobUrl(url, fetchImpl) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetchImpl(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) return { ok: false, reason: "missing" };
    if (!res.ok) return { ok: false, reason: "unreachable", error: `HTTP ${res.status}` };
    return { ok: true, data: await res.json() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: "unreachable", error: message };
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
 * }} [options]
 * @returns {Promise<{ ok: true, data: unknown } | { ok: false, reason: BlobReadFailure, error?: string }>}
 */
export async function readBlobJson(pathname, options = {}) {
  const token = options.token === undefined ? blobReadWriteToken() : options.token;
  const publicBase =
    options.publicBase !== undefined
      ? options.publicBase
      : options.token === undefined
        ? blobPublicBase()
        : null;
  if (!options.get && publicBase) {
    const base = publicBase.replace(/\/$/, "");
    return readPublicBlobUrl(`${base}/${pathname}`, options.fetchImpl ?? fetch);
  }
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
