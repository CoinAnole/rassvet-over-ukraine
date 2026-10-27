import type { CatalogPayload } from "./types.ts";

export type DataFreshness =
  | { kind: "seed" | "saved"; snapshotDate: string; staleCount: number }
  | { kind: "stale"; staleCount: number }
  | { kind: "current" };

const FETCH_STALE_MS = 72 * 60 * 60 * 1000;

/** On-orbit objects whose element set is older than the stale gate. */
export function onOrbitStaleCount(catalog: CatalogPayload): number {
  let n = 0;
  for (const obj of catalog.objects) {
    if (!obj.stale) continue;
    if (
      obj.status === "raised" ||
      obj.status === "climbing" ||
      obj.status === "stuck" ||
      obj.status === "pending"
    ) {
      n += 1;
    }
  }
  return n;
}

export function snapshotDate(fetchedAt: string): string {
  return fetchedAt.slice(0, 10);
}

/**
 * Catalog-level freshness. A failed live fetch is `saved` or `seed`.
 * The 72-hour line in that banner follows the snapshot's own fetch time.
 * `stale` is a live catalog with at least one on-orbit element set past the gate.
 */
export function dataFreshness(catalog: CatalogPayload, now = new Date()): DataFreshness {
  const staleCount = onOrbitStaleCount(catalog);
  if (catalog.source === "seed" || catalog.source === "saved") {
    const fetched = Date.parse(catalog.fetchedAt);
    const fetchStale = Number.isFinite(fetched) && now.getTime() - fetched > FETCH_STALE_MS;
    const label =
      catalog.source === "saved"
        ? catalog.fetchedAt.replace("T", " ").replace(/Z$/, "").slice(0, 16)
        : snapshotDate(catalog.fetchedAt);
    return {
      kind: catalog.source,
      snapshotDate: label,
      staleCount: fetchStale ? 1 : 0,
    };
  }
  if (staleCount > 0) return { kind: "stale", staleCount };
  return { kind: "current" };
}

/** Newest epoch among element sets that are actually propagated. */
export function newestPropagatedEpoch(catalog: CatalogPayload | undefined): string | null {
  if (!catalog) return null;
  let best: string | null = null;
  for (const obj of catalog.objects) {
    if (!obj.omm || !obj.epoch) continue;
    if (!best || obj.epoch > best) best = obj.epoch;
  }
  return best ? best.replace("T", " ").slice(0, 16) : null;
}
