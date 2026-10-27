import type { DataFreshness } from "../catalog/freshness.ts";
import type { Lang } from "../catalog/types.ts";
import { getDict } from "./index.ts";

export function fallbackBannerText(
  lang: Lang,
  freshness: Extract<DataFreshness, { kind: "seed" | "saved" }>,
): string {
  const t = getDict(lang).freshness;
  const template =
    freshness.kind === "saved"
      ? freshness.staleCount > 0
        ? t.savedStale
        : t.saved
      : freshness.staleCount > 0
        ? t.seedStale
        : t.seed;
  return template.replaceAll("{date}", freshness.snapshotDate);
}
