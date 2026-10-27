/**
 * Latest raw GP records from a successful altitude-history run.
 * The app reads the public Blob copy first, then this file on the data branch,
 * when a live CelesTrak fetch fails.
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
