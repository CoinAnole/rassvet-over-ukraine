import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { json2satrec } from "./satellite-js.ts";
import { orbitFromOmm } from "./kepler.ts";
import { WGS72_EQUATORIAL_RADIUS_KM, WGS72_MU_KM3_S2 } from "./brouwer-altitude.mjs";
import type { CatalogOmm } from "../catalog/types.ts";

/**
 * RASSVET-3 1, CelesTrak GP epoch 2026-10-11T04:42:57.334752.
 * Hand check, independent of `satrec.a`, using satellite.js WGS-72 constants
 * and the SGP4 `initl` un-Kozai steps:
 *
 *   n_kozai = 15.18532325 / xpdotp = 0.0662584721730365 rad/min
 *   ak = (xke / n_kozai)^(2/3) = 1.080004512293086 ER
 *   d1 = 0.75 * J2 * (3 cos²i − 1) / ((1−e²)^(3/2)) = −0.0007681000734454565
 *   δ′ = d1 / adel² = −0.0006582280774923994
 *   n_brouwer = n_kozai / (1+δ′) = 0.06630211408612509 rad/min
 *   a = (μ / n²)^(1/3) = 6885.391483048604 km
 *     with μ = 398600.8 km³/s² and n in rad/s
 *   altitude = a − 6378.135 = 507.256483048604 km
 *   perigee = a(1−e) − 6378.135 = 506.485525764247 km
 *   apogee  = a(1+e) − 6378.135 = 508.027440332961 km
 *
 * After SGP4 init, `satrec.no` is n_brouwer and `satrec.nokozai` is n_kozai.
 * `satrec.a` is the same semi-major axis in Earth radii.
 */
const RASSVET_3_1: CatalogOmm = {
  OBJECT_NAME: "RASSVET-3 1",
  OBJECT_ID: "2026-061A",
  EPOCH: "2026-10-11T04:42:57.334752",
  MEAN_MOTION: 15.18532325,
  ECCENTRICITY: 0.00011197,
  INCLINATION: 82.2883,
  RA_OF_ASC_NODE: 253.7721,
  ARG_OF_PERICENTER: 72.2487,
  MEAN_ANOMALY: 287.8869,
  EPHEMERIS_TYPE: 0,
  CLASSIFICATION_TYPE: "U",
  NORAD_CAT_ID: 68360,
  ELEMENT_SET_NO: 999,
  REV_AT_EPOCH: 3117,
  BSTAR: 0.00038875282,
  MEAN_MOTION_DOT: 0.00008053,
  MEAN_MOTION_DDOT: 0,
};

const HAND_ALT_KM = 507.256483048604;
const HAND_PERIGEE_KM = 506.485525764247;
const HAND_APOGEE_KM = 508.027440332961;

describe("Brouwer altitude", () => {
  it("uses satellite.js WGS-72 μ and equatorial radius", () => {
    assert.equal(WGS72_MU_KM3_S2, 398600.8);
    assert.equal(WGS72_EQUATORIAL_RADIUS_KM, 6378.135);
  });

  it("matches a hand-checked element set and satrec.a", () => {
    const orbit = orbitFromOmm(RASSVET_3_1);
    assert.ok(Math.abs(orbit.approxAltitudeKm - HAND_ALT_KM) < 1e-6, `${orbit.approxAltitudeKm}`);
    assert.ok(Math.abs(orbit.perigeeKm - HAND_PERIGEE_KM) < 1e-6, `${orbit.perigeeKm}`);
    assert.ok(Math.abs(orbit.apogeeKm - HAND_APOGEE_KM) < 1e-6, `${orbit.apogeeKm}`);

    const satrec = json2satrec(RASSVET_3_1);
    assert.ok(Math.abs(satrec.no - 0.06630211408612509) < 1e-12);
    assert.ok(Math.abs(satrec.nokozai - 0.0662584721730365) < 1e-12);
    assert.ok(satrec.no > satrec.nokozai);
    const fromField = (satrec.a - 1) * WGS72_EQUATORIAL_RADIUS_KM;
    assert.ok(Math.abs(orbit.approxAltitudeKm - fromField) < 1e-9);
    assert.ok(
      Math.abs(orbit.perigeeKm - (satrec.altp * WGS72_EQUATORIAL_RADIUS_KM)) < 1e-6,
    );
    assert.ok(Math.abs(orbit.apogeeKm - satrec.alta * WGS72_EQUATORIAL_RADIUS_KM) < 1e-6);

    const keplerN = (RASSVET_3_1.MEAN_MOTION * 2 * Math.PI) / 86400;
    const keplerAlt = Math.cbrt(398600.4418 / (keplerN * keplerN)) - 6371;
    const highBy = keplerAlt - orbit.approxAltitudeKm;
    assert.ok(highBy > 9.5 && highBy < 10.5, `old proxy was ${highBy} km high`);
  });
});
