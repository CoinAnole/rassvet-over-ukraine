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

/** Consecutive longitudes made continuous so a ring can cross ±180 without jumping. */
export function unwrapRing(ring: [number, number][]): [number, number][] {
  if (ring.length === 0) return [];
  const out: [number, number][] = [[ring[0][0], ring[0][1]]];
  for (let i = 1; i < ring.length; i += 1) {
    let lon = ring[i][1];
    const prev = out[i - 1][1];
    while (lon - prev > 180) lon -= 360;
    while (lon - prev < -180) lon += 360;
    out.push([ring[i][0], lon]);
  }
  return out;
}

function almostClosed(a: [number, number], b: [number, number]): boolean {
  if (Math.abs(a[0] - b[0]) > 1e-9) return false;
  const d = Math.abs(a[1] - b[1]);
  return d < 1e-9 || Math.abs(d - 360) < 1e-9;
}

function dropClosingDup(pts: [number, number][]): [number, number][] {
  if (pts.length < 2) return pts;
  const first = pts[0];
  const last = pts[pts.length - 1];
  return almostClosed(first, last) ? pts.slice(0, -1) : pts;
}

function closeRing(pts: [number, number][]): [number, number][] {
  if (pts.length === 0) return pts;
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (almostClosed(first, last)) return pts;
  return [...pts, [first[0], first[1]]];
}

function intersectAtLon(a: [number, number], b: [number, number], lon: number): [number, number] {
  const denom = b[1] - a[1];
  const t = Math.abs(denom) < 1e-12 ? 0 : (lon - a[1]) / denom;
  return [a[0] + t * (b[0] - a[0]), lon];
}

/** Sutherland–Hodgman clip of a closed ring against a longitude half-plane. */
function clipLonHalfPlane(
  pts: [number, number][],
  inside: (p: [number, number]) => boolean,
  edgeLon: number,
): [number, number][] {
  if (pts.length < 3) return [];
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const aIn = inside(a);
    const bIn = inside(b);
    if (aIn && bIn) {
      out.push(b);
    } else if (aIn && !bIn) {
      out.push(intersectAtLon(a, b, edgeLon));
    } else if (!aIn && bIn) {
      out.push(intersectAtLon(a, b, edgeLon));
      out.push(b);
    }
  }
  return out;
}

function clipLonWindow(pts: [number, number][], minLon: number, maxLon: number): [number, number][] {
  let cur = dropClosingDup(pts);
  cur = clipLonHalfPlane(cur, (p) => p[1] <= maxLon, maxLon);
  cur = clipLonHalfPlane(cur, (p) => p[1] >= minLon, minLon);
  if (cur.length < 3) return [];
  return closeRing(cur.map(([lat, lon]) => [lat, normalizeLon(lon)]));
}

export function ringLonSpan(ring: [number, number][]): number {
  if (ring.length === 0) return 0;
  const lons = ring.map((p) => p[1]);
  return Math.max(...lons) - Math.min(...lons);
}

export function maxLonJump(ring: [number, number][]): number {
  let max = 0;
  for (let i = 1; i < ring.length; i += 1) {
    max = Math.max(max, Math.abs(ring[i][1] - ring[i - 1][1]));
  }
  return max;
}

/**
 * True when Leaflet can fill this ring without painting a world-spanning band.
 * A jump or bbox wider than 180° of longitude is the classic antimeridian artefact.
 */
export function ringIsDrawable(ring: [number, number][]): boolean {
  if (ring.length < 4) return false;
  if (ring.some((p) => !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) return false;
  if (ringLonSpan(ring) >= 180) return false;
  if (maxLonJump(ring) > 180) return false;
  return true;
}

/**
 * Split a coverage ring on the antimeridian so each piece stays inside (−180, 180).
 * Polar wraps (the ring goes around a pole) cannot be a simple lat/lon polygon
 * without becoming a false global band — those are dropped.
 */
export function splitAntimeridianRing(ring: [number, number][]): [number, number][][] {
  if (ring.length < 4) return [];
  const unwrapped = unwrapRing(ring);
  if (ringLonSpan(unwrapped) > 270) return [];

  const parts = [
    clipLonWindow(unwrapped, -180, 180),
    clipLonWindow(unwrapped, 180, 540),
    clipLonWindow(unwrapped, -540, -180),
  ].filter(ringIsDrawable);

  return parts;
}

export function footprintPolygons(
  lat: number,
  lon: number,
  altitudeKm: number,
  minElevationDeg: number,
  steps = 64,
): [number, number][][] {
  return splitAntimeridianRing(footprintRing(lat, lon, altitudeKm, minElevationDeg, steps));
}
