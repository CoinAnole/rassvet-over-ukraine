import { EARTH_RADIUS_KM } from "./constants.ts";

/**
 * Earth-central half-angle of the locus of points that see a satellite
 * at elevation ≥ E, spherical Earth, Re = 6371 km.
 *
 * γ = acos( ρ · cos E ) − E   where ρ = Re / (Re + h)
 */
export function footprintHalfAngleRad(altitudeKm: number, minElevationDeg: number, re = EARTH_RADIUS_KM): number {
  const h = Math.max(altitudeKm, 1);
  const el = (minElevationDeg * Math.PI) / 180;
  const rho = re / (re + h);
  const arg = Math.min(1, Math.max(-1, rho * Math.cos(el)));
  return Math.acos(arg) - el;
}

export function destinationPoint(
  latDeg: number,
  lonDeg: number,
  distanceKm: number,
  bearingDeg: number,
  re = EARTH_RADIUS_KM,
): [number, number] {
  const δ = distanceKm / re;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (latDeg * Math.PI) / 180;
  const λ1 = (lonDeg * Math.PI) / 180;
  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);
  const φ2 = Math.asin(sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * sinδ * cosφ1, cosδ - sinφ1 * Math.sin(φ2));
  return [((φ2 * 180) / Math.PI), normalizeLon((λ2 * 180) / Math.PI)];
}

export function normalizeLon(lon: number): number {
  let x = lon;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

export function footprintRing(
  lat: number,
  lon: number,
  altitudeKm: number,
  minElevationDeg: number,
  steps = 64,
): [number, number][] {
  const gamma = footprintHalfAngleRad(altitudeKm, minElevationDeg);
  const dist = gamma * EARTH_RADIUS_KM;
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i += 1) {
    ring.push(destinationPoint(lat, lon, dist, (360 * i) / steps));
  }
  return ring;
}
