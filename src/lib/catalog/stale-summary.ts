import type { CatalogPayload, ObjectStatus, PopulationFilter } from "./types.ts";
import { getObjectsConfig } from "./build.ts";
import { inPopulation } from "../orbit/population.ts";
import { hoursOld } from "../orbit/time.ts";

/**
 * Objects the live stale note is about: an element set past the catalog's
 * 72-hour gate, still on orbit (raised, climbing, not climbing, or rate pending).
 * The gate itself stays in catalog build. Decayed and missing ids are not
 * flagged stale, and a perigee-decayed object is left out of this note.
 */
const ON_ORBIT: readonly ObjectStatus[] = ["raised", "climbing", "stuck", "pending"];

export type StaleRole =
  | "production-raised"
  | "experimental-raised"
  | "climbing"
  | "experimental-climbing"
  | "not-climbing"
  | "experimental-not-climbing"
  | "rate-pending"
  | "experimental-rate-pending"
  | "decayed"
  | "missing";

export type StaleObjectSummary = {
  norad: number;
  name: string;
  epoch: string;
  ageHours: number;
  ageDays: number;
  ageHoursPart: number;
  status: ObjectStatus;
  group: string;
  role: StaleRole;
  inCoverageSet: boolean;
};

export type StaleSummary = {
  objects: StaleObjectSummary[];
  count: number;
  inSetCount: number;
  /** Stale objects exist, and none of them feed the coverage set being judged. */
  quiet: boolean;
  set: PopulationFilter;
  /** True on pages that have no coverage picker. The set is then the default. */
  usedDefaultSet: boolean;
};

const DEFAULT_SET: PopulationFilter = "prod-raised";

export function ageParts(ageHours: number): { days: number; hours: number } {
  const whole = Math.floor(Math.max(0, ageHours));
  return { days: Math.floor(whole / 24), hours: whole % 24 };
}

export function staleObjectRole(obj: { status: ObjectStatus; group: string }): StaleRole {
  const kind = getObjectsConfig().groups.find((g) => g.id === obj.group)?.kind;
  const experimental = kind === "experimental";
  if (obj.status === "decayed") return "decayed";
  if (obj.status === "missing") return "missing";
  if (obj.status === "stuck") return experimental ? "experimental-not-climbing" : "not-climbing";
  if (obj.status === "pending") return experimental ? "experimental-rate-pending" : "rate-pending";
  if (obj.status === "climbing") return experimental ? "experimental-climbing" : "climbing";
  if (obj.status === "raised") return experimental ? "experimental-raised" : "production-raised";
  return "missing";
}

/**
 * `set: null` means the page has no coverage picker. Membership is then
 * judged against the default raised-production set, and `usedDefaultSet` is set.
 * Ages are relative to `now`, which for a live catalog is the fetch instant
 * the 72-hour gate already used.
 */
export function summarizeStale(
  catalog: CatalogPayload,
  opts: { now: Date; set: PopulationFilter | null },
): StaleSummary {
  const usedDefaultSet = opts.set == null;
  const set = opts.set ?? DEFAULT_SET;
  const objects: StaleObjectSummary[] = [];
  for (const obj of catalog.objects) {
    if (!obj.stale || !obj.epoch) continue;
    if (!ON_ORBIT.includes(obj.status)) continue;
    const ageHours = hoursOld(obj.epoch, opts.now);
    if (!Number.isFinite(ageHours)) continue;
    const age = ageParts(ageHours);
    objects.push({
      norad: obj.norad,
      name: obj.name,
      epoch: obj.epoch,
      ageHours,
      ageDays: age.days,
      ageHoursPart: age.hours,
      status: obj.status,
      group: obj.group,
      role: staleObjectRole(obj),
      inCoverageSet: inPopulation(obj, set),
    });
  }
  objects.sort((a, b) => b.ageHours - a.ageHours || a.norad - b.norad);
  const inSetCount = objects.reduce((n, obj) => n + (obj.inCoverageSet ? 1 : 0), 0);
  return {
    objects,
    count: objects.length,
    inSetCount,
    quiet: objects.length > 0 && inSetCount === 0,
    set,
    usedDefaultSet,
  };
}
