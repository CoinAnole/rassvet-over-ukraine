import { getObjectsConfig } from "../catalog/build.ts";
import type { LiveObject, PopulationFilter } from "../catalog/types.ts";

const productionGroups = new Set(
  getObjectsConfig()
    .groups.filter((g) => g.kind === "production")
    .map((g) => g.id),
);

/** Whether this object is propagated for the coverage set the clock is using. */
export function inPopulation(obj: LiveObject, filter: PopulationFilter): boolean {
  if (obj.status === "decayed" || obj.status === "reentering" || obj.status === "missing") return false;
  if (!obj.omm) return false;
  if (filter === "all") return true;
  if (filter === "raised") return obj.status === "raised";
  if (filter === "prod-raised") return obj.status === "raised" && productionGroups.has(obj.group);
  if (filter === "climbing") return obj.status === "climbing";
  return obj.group === filter;
}
