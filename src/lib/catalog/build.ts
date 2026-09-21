import objectsConfig from "../../config/objects.json" with { type: "json" };
import type {
  CatalogOmm,
  CatalogPayload,
  ConfigObject,
  LiveObject,
  ObjectsConfig,
} from "./types.ts";
import { orbitFromOmm } from "../orbit/kepler.ts";
import { DECAY_PERIGEE_KM, RAISED_ALTITUDE_KM, STALE_HOURS } from "../orbit/constants.ts";
import { hoursOld } from "../orbit/time.ts";

const config = objectsConfig as ObjectsConfig;

export function getObjectsConfig(): ObjectsConfig {
  return config;
}

function asOmm(raw: Record<string, unknown>): CatalogOmm | null {
  const norad = Number(raw.NORAD_CAT_ID);
  if (!Number.isFinite(norad) || !raw.EPOCH || raw.MEAN_MOTION == null) return null;
  return {
    OBJECT_NAME: String(raw.OBJECT_NAME ?? ""),
    OBJECT_ID: String(raw.OBJECT_ID ?? ""),
    EPOCH: String(raw.EPOCH),
    MEAN_MOTION: Number(raw.MEAN_MOTION),
    ECCENTRICITY: Number(raw.ECCENTRICITY),
    INCLINATION: Number(raw.INCLINATION),
    RA_OF_ASC_NODE: Number(raw.RA_OF_ASC_NODE),
    ARG_OF_PERICENTER: Number(raw.ARG_OF_PERICENTER),
    MEAN_ANOMALY: Number(raw.MEAN_ANOMALY),
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: "U",
    NORAD_CAT_ID: norad,
    ELEMENT_SET_NO: Number(raw.ELEMENT_SET_NO ?? 999),
    REV_AT_EPOCH: Number(raw.REV_AT_EPOCH ?? 0),
    BSTAR: Number(raw.BSTAR ?? 0),
    MEAN_MOTION_DOT: Number(raw.MEAN_MOTION_DOT ?? 0),
    MEAN_MOTION_DDOT: Number(raw.MEAN_MOTION_DDOT ?? 0),
  };
}

export function indexOmms(list: unknown[]): Map<number, CatalogOmm> {
  const map = new Map<number, CatalogOmm>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const omm = asOmm(item as Record<string, unknown>);
    if (!omm) continue;
    map.set(omm.NORAD_CAT_ID, omm);
  }
  return map;
}

export function buildCatalog(opts: {
  omms: Map<number, CatalogOmm>;
  fetchedAt: string;
  source: "live" | "seed";
  warning: string | null;
  now?: Date;
}): CatalogPayload {
  const now = opts.now ?? new Date();
  const decayedSet = new Set(config.decayed);
  const groupById = new Map(config.groups.map((g) => [g.id, g]));
  const objects: LiveObject[] = [];
  const missingKnownIds: number[] = [];

  for (const meta of config.objects as ConfigObject[]) {
    const omm = opts.omms.get(meta.norad) ?? null;
    const group = groupById.get(meta.group);
    if (decayedSet.has(meta.norad)) {
      objects.push({
        norad: meta.norad,
        name: meta.name,
        catalogName: meta.catalogName,
        cospar: meta.cospar,
        group: meta.group,
        launchDate: group?.launchDate ?? null,
        omm: null,
        epoch: null,
        status: "decayed",
        stale: false,
        approxAltitudeKm: null,
        inclinationDeg: null,
        periodMin: null,
        perigeeKm: null,
        apogeeKm: null,
        elementSetCount: omm ? 1 : 0,
      });
      continue;
    }
    if (!omm) {
      missingKnownIds.push(meta.norad);
      objects.push({
        norad: meta.norad,
        name: meta.name,
        catalogName: meta.catalogName,
        cospar: meta.cospar,
        group: meta.group,
        launchDate: group?.launchDate ?? null,
        omm: null,
        epoch: null,
        status: "missing",
        stale: false,
        approxAltitudeKm: null,
        inclinationDeg: null,
        periodMin: null,
        perigeeKm: null,
        apogeeKm: null,
        elementSetCount: 0,
      });
      continue;
    }
    const orbit = orbitFromOmm(omm);
    const stale = hoursOld(String(omm.EPOCH), now) > (config.staleHours || STALE_HOURS);
    let status: LiveObject["status"] = "climbing";
    if (orbit.perigeeKm < (config.decayPerigeeKm || DECAY_PERIGEE_KM)) status = "decayed";
    else if (orbit.approxAltitudeKm >= (config.raisedAltitudeKm || RAISED_ALTITUDE_KM)) status = "raised";
    objects.push({
      norad: meta.norad,
      name: meta.name,
      catalogName: meta.catalogName,
      cospar: meta.cospar,
      group: meta.group,
      launchDate: group?.launchDate ?? null,
      omm,
      epoch: String(omm.EPOCH),
      status,
      stale,
      approxAltitudeKm: orbit.approxAltitudeKm,
      inclinationDeg: orbit.inclinationDeg,
      periodMin: orbit.periodMin,
      perigeeKm: orbit.perigeeKm,
      apogeeKm: orbit.apogeeKm,
      elementSetCount: 1,
    });
  }

  return {
    fetchedAt: opts.fetchedAt,
    source: opts.source,
    warning: opts.warning,
    missingKnownIds,
    objects,
    decayed: [...config.decayed],
    raisedAltitudeKm: config.raisedAltitudeKm,
    staleHours: config.staleHours,
    stepSeconds: config.stepSeconds,
    minPassSeconds: config.minPassSeconds,
    configUpdated: config.updated,
  };
}
