/**
 * Approximate altitude from the Brouwer mean semi-major axis.
 *
 * satellite.js SGP4 init (`initl`) converts the catalog's Kozai mean motion
 * to the un-Kozai'd mean motion and stores it on `satrec.no` (radians per
 * minute). `satrec.nokozai` keeps the original Kozai value. `satrec.a` is the
 * Brouwer semi-major axis in WGS-72 Earth radii. Altitude is that axis in
 * kilometres minus the WGS-72 equatorial radius.
 *
 * μ = 398600.8 km³/s² and R_E = 6378.135 km, the same constants satellite.js
 * uses and the ones in findrassvet.ru methodology section 2. The method is
 * adapted; the text is not copied.
 */
import { json2satrec } from "../../../node_modules/satellite.js/dist/io.js";
import { earthRadius, mu } from "../../../node_modules/satellite.js/dist/constants.js";

/** WGS-72 equatorial radius, km. Units of `satrec.a`. */
export const WGS72_EQUATORIAL_RADIUS_KM = earthRadius;

/** WGS-72 gravitational parameter, km³/s². */
export const WGS72_MU_KM3_S2 = mu;

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function finiteOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {Record<string, unknown> | null | undefined} row GP / OMM fields.
 *   Mean motion, eccentricity, and inclination are required. Other angles do
 *   not enter the semi-major axis.
 * @returns {{
 *   semiMajorKm: number,
 *   approxAltitudeKm: number,
 *   perigeeKm: number,
 *   apogeeKm: number,
 *   periodMin: number,
 *   inclinationDeg: number,
 * } | null}
 */
export function orbitFromGp(row) {
  const n = Number(row?.MEAN_MOTION);
  const e = Number(row?.ECCENTRICITY);
  const i = Number(row?.INCLINATION);
  if (!Number.isFinite(n) || n <= 0 || !Number.isFinite(e) || !Number.isFinite(i)) return null;

  const omm = {
    OBJECT_NAME: typeof row?.OBJECT_NAME === "string" ? row.OBJECT_NAME : "",
    OBJECT_ID: typeof row?.OBJECT_ID === "string" ? row.OBJECT_ID : "",
    NORAD_CAT_ID: finiteOr(row?.NORAD_CAT_ID, 0),
    EPOCH:
      typeof row?.EPOCH === "string" && row.EPOCH.length > 0
        ? row.EPOCH
        : "2000-01-01T00:00:00.000000",
    MEAN_MOTION: n,
    ECCENTRICITY: e,
    INCLINATION: i,
    RA_OF_ASC_NODE: finiteOr(row?.RA_OF_ASC_NODE, 0),
    ARG_OF_PERICENTER: finiteOr(row?.ARG_OF_PERICENTER, 0),
    MEAN_ANOMALY: finiteOr(row?.MEAN_ANOMALY, 0),
    ELEMENT_SET_NO: finiteOr(row?.ELEMENT_SET_NO, 999),
    BSTAR: finiteOr(row?.BSTAR, 0),
    MEAN_MOTION_DOT: finiteOr(row?.MEAN_MOTION_DOT, 0),
    MEAN_MOTION_DDOT: finiteOr(row?.MEAN_MOTION_DDOT, 0),
    EPHEMERIS_TYPE: /** @type {0} */ (0),
    CLASSIFICATION_TYPE: /** @type {"U"} */ ("U"),
  };

  let satrec;
  try {
    satrec = json2satrec(omm);
  } catch {
    return null;
  }
  if (!satrec || !Number.isFinite(satrec.a)) return null;

  const semiMajorKm = satrec.a * WGS72_EQUATORIAL_RADIUS_KM;
  const radius = WGS72_EQUATORIAL_RADIUS_KM;
  return {
    semiMajorKm,
    approxAltitudeKm: semiMajorKm - radius,
    perigeeKm: semiMajorKm * (1 - satrec.ecco) - radius,
    apogeeKm: semiMajorKm * (1 + satrec.ecco) - radius,
    periodMin: 1440 / n,
    inclinationDeg: i,
  };
}
