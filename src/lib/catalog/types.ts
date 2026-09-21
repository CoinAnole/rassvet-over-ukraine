import type { TimezoneId } from "../orbit/constants.ts";

export type { TimezoneId };

export type Lang = "en" | "uk" | "ru";

export type Localized = { en: string; uk: string; ru: string };

export type PopulationFilter =
  | "all"
  | "raised"
  | "climbing"
  | "exp-2023"
  | "exp-2024"
  | "prod-2026-03"
  | "prod-2026-07";

export type ObjectStatus = "climbing" | "raised" | "decayed" | "missing";

export type ConfigObject = {
  norad: number;
  name: string;
  catalogName: string;
  cospar: string;
  group: string;
};

export type GroupDef = {
  id: string;
  launchDate: string | null;
  label: Localized;
};

export type ObjectsConfig = {
  updated: string;
  raisedAltitudeKm: number;
  staleHours: number;
  stepSeconds: number;
  minPassSeconds: number;
  earthRadiusKm: number;
  muKm3s2: number;
  decayPerigeeKm: number;
  userAgent: string;
  celestrak: { queries: string[] };
  groups: GroupDef[];
  decayed: number[];
  objects: ConfigObject[];
};

export type CatalogOmm = {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  EPHEMERIS_TYPE: 0;
  CLASSIFICATION_TYPE: "U";
  NORAD_CAT_ID: number;
  ELEMENT_SET_NO: number;
  REV_AT_EPOCH: number;
  BSTAR: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
};

export type LiveObject = {
  norad: number;
  name: string;
  catalogName: string;
  cospar: string;
  group: string;
  launchDate: string | null;
  omm: CatalogOmm | null;
  epoch: string | null;
  status: ObjectStatus;
  stale: boolean;
  approxAltitudeKm: number | null;
  inclinationDeg: number | null;
  periodMin: number | null;
  perigeeKm: number | null;
  apogeeKm: number | null;
  elementSetCount: number;
};

export type CatalogPayload = {
  fetchedAt: string;
  source: "live" | "seed";
  warning: string | null;
  missingKnownIds: number[];
  objects: LiveObject[];
  decayed: number[];
  raisedAltitudeKm: number;
  staleHours: number;
  stepSeconds: number;
  minPassSeconds: number;
  configUpdated: string;
};
