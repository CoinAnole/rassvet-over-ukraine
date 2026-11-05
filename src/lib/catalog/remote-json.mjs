/**
 * Catalog files from the public Blob store. A miss leaves the checked-in
 * snapshot to supply element sets, and leaves altitude history empty.
 */
import { readBlobJson } from "./blob-data.mjs";

/**
 * @typedef {"blob" | "snapshot"} RemoteFileSource
 */

/**
 * @param {{
 *   pathname: string,
 *   readBlob?: typeof readBlobJson,
 * }} args
 * @returns {Promise<{ data: unknown | null, source: RemoteFileSource }>}
 */
export async function loadRemoteJson(args) {
  const readBlob = args.readBlob ?? readBlobJson;
  const blob = await readBlob(args.pathname);
  if (blob.ok) return { data: blob.data, source: "blob" };
  return { data: null, source: "snapshot" };
}
