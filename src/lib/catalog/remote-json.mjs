/**
 * Catalog files: public Blob first, then the GitHub raw `data` branch.
 * A missing pathname falls through too, so connecting the store before the
 * one-time seed still serves the GitHub copies.
 */
import { readBlobJson } from "./blob-data.mjs";

const TIMEOUT_MS = 8000;

/**
 * @param {string} url
 * @param {string} userAgent
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<unknown | null>}
 */
async function fetchGithubJson(url, userAgent, fetchImpl = fetch) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
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

/**
 * @param {{
 *   pathname: string,
 *   githubUrl: string,
 *   userAgent: string,
 *   readBlob?: typeof readBlobJson,
 *   fetchImpl?: typeof fetch,
 * }} args
 * @returns {Promise<unknown | null>}
 */
export async function loadRemoteJson(args) {
  const readBlob = args.readBlob ?? readBlobJson;
  const blob = await readBlob(args.pathname);
  if (blob.ok) return blob.data;
  if (!args.githubUrl) return null;
  return fetchGithubJson(args.githubUrl, args.userAgent, args.fetchImpl);
}
