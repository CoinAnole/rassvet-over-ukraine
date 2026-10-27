/**
 * Latest raw GP records from a successful altitude-history run.
 * The file lives on the data branch and is the app's fallback when CelesTrak is down.
 */

/**
 * @param {unknown[]} objects raw CelesTrak GP rows for catalogued NORADs
 * @param {string} fetchedAt
 */
export function gpLatestDocument(objects, fetchedAt) {
  return { v: 1, fetchedAt, objects };
}

/**
 * @param {unknown} data
 * @returns {{ fetchedAt: string, objects: unknown[] } | null}
 */
export function parseGpLatest(data) {
  if (!data || typeof data !== "object") return null;
  const rec = /** @type {{ fetchedAt?: unknown, objects?: unknown }} */ (data);
  if (typeof rec.fetchedAt !== "string" || rec.fetchedAt.length === 0) return null;
  if (!Array.isArray(rec.objects) || rec.objects.length === 0) return null;
  return { fetchedAt: rec.fetchedAt, objects: rec.objects };
}
