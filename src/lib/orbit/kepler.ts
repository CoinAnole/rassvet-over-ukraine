import { EARTH_RADIUS_KM, MU_KM3_S2 } from "./constants.ts";

export type OrbitProxy = {
  semiMajorKm: number;
  approxAltitudeKm: number;
  perigeeKm: number;
  apogeeKm: number;
  periodMin: number;
  inclinationDeg: number;
};

export function meanMotionToSmaKm(meanMotionRevPerDay: number, mu = MU_KM3_S2): number {
  const n = (meanMotionRevPerDay * (2 * Math.PI)) / 86400;
  return Math.cbrt(mu / (n * n));
}

export function orbitFromOmm(omm: {
  MEAN_MOTION: number | string;
  ECCENTRICITY: number | string;
  INCLINATION: number | string;
}): OrbitProxy {
  const n = Number(omm.MEAN_MOTION);
  const e = Number(omm.ECCENTRICITY);
  const i = Number(omm.INCLINATION);
  const a = meanMotionToSmaKm(n);
  return {
    semiMajorKm: a,
    approxAltitudeKm: a - EARTH_RADIUS_KM,
    perigeeKm: a * (1 - e) - EARTH_RADIUS_KM,
    apogeeKm: a * (1 + e) - EARTH_RADIUS_KM,
    periodMin: 1440 / n,
    inclinationDeg: i,
  };
}
