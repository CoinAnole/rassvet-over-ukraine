import type { Lang, LiveObject, ObjectStatus } from "./types.ts";

export type ConstellationSortKey =
  | "name"
  | "norad"
  | "group"
  | "status"
  | "alt"
  | "rate"
  | "inc"
  | "period"
  | "perigee"
  | "apogee"
  | "epoch";

export type SortDirection = "asc" | "desc";

export type ConstellationSort = {
  key: ConstellationSortKey;
  dir: SortDirection;
};

/**
 * Climbing, then raised, then not climbing. Decayed and missing follow
 * so they stay out of that class order.
 */
const STATUS_RANK: Record<ObjectStatus, number> = {
  climbing: 0,
  raised: 1,
  stuck: 2,
  decayed: 3,
  missing: 4,
};

export function nextConstellationSort(
  current: ConstellationSort | null,
  key: ConstellationSortKey,
): ConstellationSort {
  if (current?.key === key) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { key, dir: "asc" };
}

/**
 * Missing numbers and epochs stay at the end in both directions.
 * A rate that has not been computed is one of those missing numbers.
 */
function compareNullable(a: number | null, b: number | null, dir: SortDirection): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return dir === "asc" ? a - b : b - a;
}

function epochMs(epoch: string | null): number | null {
  if (!epoch) return null;
  const iso = epoch.endsWith("Z") ? epoch : `${epoch}Z`;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export function sortConstellationRows<T extends LiveObject>(
  rows: readonly T[],
  sort: ConstellationSort | null,
  groupName: (groupId: string) => string,
  lang: Lang,
): T[] {
  if (!sort) return [...rows];
  const collator = new Intl.Collator(lang, { numeric: true, sensitivity: "base" });
  const text = (a: string, b: string) => {
    const cmp = collator.compare(a, b);
    return sort.dir === "asc" ? cmp : -cmp;
  };
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort.key) {
      case "name":
        return text(a.name, b.name);
      case "norad":
        return compareNullable(a.norad, b.norad, sort.dir);
      case "group":
        return text(groupName(a.group), groupName(b.group));
      case "status":
        return compareNullable(STATUS_RANK[a.status], STATUS_RANK[b.status], sort.dir);
      case "alt":
        return compareNullable(a.approxAltitudeKm, b.approxAltitudeKm, sort.dir);
      case "rate":
        return compareNullable(a.climbKmPerDay, b.climbKmPerDay, sort.dir);
      case "inc":
        return compareNullable(a.inclinationDeg, b.inclinationDeg, sort.dir);
      case "period":
        return compareNullable(a.periodMin, b.periodMin, sort.dir);
      case "perigee":
        return compareNullable(a.perigeeKm, b.perigeeKm, sort.dir);
      case "apogee":
        return compareNullable(a.apogeeKm, b.apogeeKm, sort.dir);
      case "epoch":
        return compareNullable(epochMs(a.epoch), epochMs(b.epoch), sort.dir);
      default:
        return 0;
    }
  });
  return copy;
}
