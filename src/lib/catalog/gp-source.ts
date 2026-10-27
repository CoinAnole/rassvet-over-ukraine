import { indexOmms } from "./build.ts";
import type { CatalogOmm } from "./types.ts";

export type GpSource = "live" | "saved" | "seed";

/**
 * Live CelesTrak wins. If every live query failed, use the saved GP snapshot
 * over the checked-in seed. A saved file still fills gaps from the seed.
 */
export function chooseCatalogElements(args: {
  wanted: Set<number>;
  seedOmms: Map<number, CatalogOmm>;
  seedFetchedAt: string;
  liveLists: (unknown[] | null)[];
  saved: { fetchedAt: string; objects: unknown[] } | null;
  now: Date;
}): { omms: Map<number, CatalogOmm>; source: GpSource; fetchedAt: string } {
  const live = new Map(args.seedOmms);
  let liveHits = 0;
  for (const list of args.liveLists) {
    if (!list) continue;
    for (const [id, omm] of indexOmms(list)) {
      if (!args.wanted.has(id)) continue;
      live.set(id, omm);
      liveHits += 1;
    }
  }
  if (liveHits > 0) {
    return { omms: live, source: "live", fetchedAt: args.now.toISOString() };
  }

  if (args.saved && args.saved.objects.length > 0) {
    const saved = new Map(args.seedOmms);
    let savedHits = 0;
    for (const [id, omm] of indexOmms(args.saved.objects)) {
      if (!args.wanted.has(id)) continue;
      saved.set(id, omm);
      savedHits += 1;
    }
    if (savedHits > 0) {
      return { omms: saved, source: "saved", fetchedAt: args.saved.fetchedAt };
    }
  }

  return { omms: new Map(args.seedOmms), source: "seed", fetchedAt: args.seedFetchedAt };
}
