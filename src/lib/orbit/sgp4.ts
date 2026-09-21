import {
  json2satrec,
  propagate,
  gstime,
  eciToEcf,
  eciToGeodetic,
  ecfToLookAngles,
  degreesLat,
  degreesLong,
  degreesToRadians,
  type SatRec,
} from "./satellite-js.ts";
import type { CatalogOmm } from "../catalog/types.ts";

export function satrecFromOmm(omm: CatalogOmm): SatRec {
  return json2satrec(omm as Parameters<typeof json2satrec>[0]);
}

export type Observer = { lat: number; lon: number; altKm?: number };

export function lookAt(
  satrec: SatRec,
  date: Date,
  observer: Observer,
): { elevationDeg: number; azimuthDeg: number; rangeKm: number } | null {
  const pv = propagate(satrec, date);
  if (!pv || !pv.position) return null;
  const gmst = gstime(date);
  const ecf = eciToEcf(pv.position, gmst);
  const gd = {
    latitude: degreesToRadians(observer.lat),
    longitude: degreesToRadians(observer.lon),
    height: observer.altKm ?? 0,
  };
  const look = ecfToLookAngles(gd, ecf);
  return {
    elevationDeg: (look.elevation * 180) / Math.PI,
    azimuthDeg: (look.azimuth * 180) / Math.PI,
    rangeKm: look.rangeSat,
  };
}

export function subpoint(
  satrec: SatRec,
  date: Date,
): { lat: number; lon: number; altitudeKm: number } | null {
  const pv = propagate(satrec, date);
  if (!pv || !pv.position) return null;
  const gmst = gstime(date);
  const gd = eciToGeodetic(pv.position, gmst);
  return {
    lat: degreesLat(gd.latitude),
    lon: degreesLong(gd.longitude),
    altitudeKm: gd.height,
  };
}
