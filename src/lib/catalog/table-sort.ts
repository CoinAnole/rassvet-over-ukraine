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

export type ColumnSort<K extends string = string> = {
  key: K;
  dir: SortDirection;
};

export type ConstellationSort = ColumnSort<ConstellationSortKey>;

export type PassSortKey =
  | "aos"
  | "los"
  | "duration"
  | "maxEl"
  | "name"
  | "batch"
  | "altitude"
  | "status";

export type PassSort = ColumnSort<PassSortKey>;

/** Fields the pass list can sort without knowing how a row is rendered. */
export type PassSortRow = {
  name: string;
  group: string;
  aos: number;
  los: number;
  maxElevationDeg: number;
  altitudeKm: number | null;
  status: ObjectStatus;
};

/**
 * Climbing, then raised, then not climbing, then rate pending.
 * Decayed and missing follow so they stay out of that class order.
 */
const STATUS_RANK: Record<ObjectStatus, number> = {
  climbing: 0,
  raised: 1,
  stuck: 2,
  pending: 3,
  decayed: 4,
  missing: 5,
};

export function nextColumnSort<K extends string>(
  current: ColumnSort<K> | null,
  key: K,
): ColumnSort<K> {
  if (current?.key === key) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { key, dir: "asc" };
}

export function nextConstellationSort(
  current: ConstellationSort | null,
  key: ConstellationSortKey,
): ConstellationSort {
  return nextColumnSort(current, key);
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

function compareSortValue(
  a: number | string | null,
  b: number | string | null,
  dir: SortDirection,
  collator: Intl.Collator,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return compareNullable(a, b, dir);
  const cmp = collator.compare(String(a), String(b));
  return dir === "asc" ? cmp : -cmp;
}

/**
 * Shared column sort. A null sort keeps the input order. Missing numbers
 * and empty text stay last whether the direction is ascending or descending.
 * Strings use numeric collation so "2" precedes "10".
 */
export function sortByColumn<T, K extends string>(
  rows: readonly T[],
  sort: ColumnSort<K> | null,
  valueOf: (row: T, key: K) => number | string | null,
  lang: Lang,
): T[] {
  if (!sort) return [...rows];
  const collator = new Intl.Collator(lang, { numeric: true, sensitivity: "base" });
  const copy = [...rows];
  copy.sort((a, b) =>
    compareSortValue(valueOf(a, sort.key), valueOf(b, sort.key), sort.dir, collator),
  );
  return copy;
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
  return sortByColumn(
    rows,
    sort,
    (row, key) => {
      switch (key) {
        case "name":
          return row.name;
        case "norad":
          return row.norad;
        case "group":
          return groupName(row.group);
        case "status":
          return STATUS_RANK[row.status];
        case "alt":
          return row.approxAltitudeKm;
        case "rate":
          return row.climbKmPerDay;
        case "inc":
          return row.inclinationDeg;
        case "period":
          return row.periodMin;
        case "perigee":
          return row.perigeeKm;
        case "apogee":
          return row.apogeeKm;
        case "epoch":
          return epochMs(row.epoch);
        default:
          return null;
      }
    },
    lang,
  );
}

export function sortPassRows<T extends PassSortRow>(
  rows: readonly T[],
  sort: PassSort | null,
  groupName: (groupId: string) => string,
  lang: Lang,
): T[] {
  return sortByColumn(
    rows,
    sort,
    (row, key) => {
      switch (key) {
        case "aos":
          return row.aos;
        case "los":
          return row.los;
        case "duration":
          return row.los - row.aos;
        case "maxEl":
          return row.maxElevationDeg;
        case "name":
          return row.name;
        case "batch":
          return groupName(row.group);
        case "altitude":
          return row.altitudeKm;
        case "status":
          return STATUS_RANK[row.status];
        default:
          return null;
      }
    },
    lang,
  );
}
