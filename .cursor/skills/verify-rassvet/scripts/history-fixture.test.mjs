import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildHistoryFixture, HISTORY_FIXTURE_NORAD } from "./history-fixture.mjs";
import { climbRate, formatClimbRate } from "../../../../src/lib/orbit/climb-rate.mjs";
import { orbitFromGp } from "../../../../src/lib/orbit/brouwer-altitude.mjs";

const gp = {
  NORAD_CAT_ID: 68370,
  OBJECT_NAME: "RASSVET-3 11",
  EPOCH: "2026-10-15T12:00:00.000000",
  MEAN_MOTION: 15.64860983,
  ECCENTRICITY: 0.00048014,
  INCLINATION: 82.2868,
};

describe("history fixture", () => {
  it("lays a +2.6 km/day line on RASSVET-3 11 that survives the live altitude", () => {
    const doc = buildHistoryFixture([gp], new Date("2026-10-15T18:00:00Z"));
    assert.equal(doc.rows.length, 5);
    assert.equal(doc.rows.every((row) => row.norad === HISTORY_FIXTURE_NORAD), true);
    const orbit = orbitFromGp(gp);
    assert.ok(orbit);
    const withLive = [
      ...doc.rows,
      { epoch: gp.EPOCH, alt_km: orbit.approxAltitudeKm },
    ];
    const rate = climbRate(withLive);
    assert.ok(rate);
    assert.equal(formatClimbRate(rate.kmPerDay), "+2.6");
    assert.equal(rate.klass, "climbing");
    assert.equal(rate.droppedOutlier, false);
    assert.ok(rate.spanHours >= 36);
  });
});