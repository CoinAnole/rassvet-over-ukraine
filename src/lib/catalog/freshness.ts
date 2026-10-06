import type { CatalogPayload } from "./types.ts";

export type DataFreshness =
  | { kind: "seed"; snapshotDate: string; staleCount: number }
  | { kind: "stale"; staleCount: number }
  | { kind: "current" };

/** On-orbit objects whose element set is older than the stale gate. */
export function onOrbitStaleCount(catalog: CatalogPayload): number {
  let n = 0;
  for (const obj of catalog.objects) {
    if (!obj.stale) continue;
    if (obj.status === "raised" || obj.status === "climbing") n += 1;
  }
  return n;
}

export function snapshotDate(fetchedAt: string): string {
  return fetchedAt.slice(0, 10);
}

/**
 * Catalog-level freshness. A failed live fetch is `seed` even when the
 * snapshot itself is younger than 72 hours. `stale` is a live catalog with
 * at least one on-orbit element set past the gate.
 */
export function dataFreshness(catalog: CatalogPayload): DataFreshness {
  const staleCount = onOrbitStaleCount(catalog);
  if (catalog.source === "seed") {
    return { kind: "seed", snapshotDate: snapshotDate(catalog.fetchedAt), staleCount };
  }
  if (staleCount > 0) return { kind: "stale", staleCount };
  return { kind: "current" };
}
