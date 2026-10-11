import { orbitFromGp } from "./brouwer-altitude.mjs";

export type OrbitProxy = {
  semiMajorKm: number;
  approxAltitudeKm: number;
  perigeeKm: number;
  apogeeKm: number;
  periodMin: number;
  inclinationDeg: number;
};

/**
 * Brouwer mean altitude for one element set. Perigee and apogee use the same
 * semi-major axis and the WGS-72 equatorial radius.
 */
export function orbitFromOmm(omm: {
  MEAN_MOTION: number | string;
  ECCENTRICITY: number | string;
  INCLINATION: number | string;
  EPOCH?: string;
  NORAD_CAT_ID?: number | string;
  RA_OF_ASC_NODE?: number | string;
  ARG_OF_PERICENTER?: number | string;
  MEAN_ANOMALY?: number | string;
  BSTAR?: number | string;
  MEAN_MOTION_DOT?: number | string;
  MEAN_MOTION_DDOT?: number | string;
}): OrbitProxy {
  const orbit = orbitFromGp(omm);
  if (!orbit) {
    throw new Error("element set is missing mean motion, eccentricity, or inclination");
  }
  return orbit;
}
