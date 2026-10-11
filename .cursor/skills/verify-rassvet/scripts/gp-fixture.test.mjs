import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildGpFixture, GP_FIXTURES } from "./gp-fixture.mjs";

const now = new Date("2026-10-11T18:00:00.000Z");

function epochMs(row) {
  return Date.parse(`${row.EPOCH}Z`);
}

describe("gp fixtures", () => {
  it("names the two modes", () => {
    assert.deepEqual(GP_FIXTURES, ["stale-in-set", "stale-outside-set"]);
  });

  for (const mode of GP_FIXTURES) {
    it(`${mode} rewrites only epochs and keeps the 71 hour object inside the gate`, () => {
      const { objects, plan } = buildGpFixture(mode, now);
      assert.equal(plan.mode, mode);
      assert.ok(objects.length > 10);
      const byId = new Map(objects.map((row) => [row.NORAD_CAT_ID, row]));
      for (const row of plan.stale) {
        const ageH = (now.getTime() - epochMs(byId.get(row.norad))) / 3_600_000;
        assert.ok(ageH > 72, `${row.norad} should be past 72h, was ${ageH}`);
        assert.equal(Math.round(ageH), row.hours);
      }
      for (const row of plan.insideGate) {
        const ageH = (now.getTime() - epochMs(byId.get(row.norad))) / 3_600_000;
        assert.ok(ageH < 72 && ageH > 70, `${row.norad} should sit at 71h, was ${ageH}`);
      }
      const fresh = byId.get(68364);
      const freshAge = (now.getTime() - epochMs(fresh)) / 3_600_000;
      if (!plan.stale.some((row) => row.norad === 68364) && !plan.insideGate.some((row) => row.norad === 68364)) {
        assert.equal(Math.round(freshAge), plan.freshHours);
      }
      assert.equal(byId.get(68360).MEAN_MOTION, objects.find((row) => row.NORAD_CAT_ID === 68360).MEAN_MOTION);
    });
  }

  it("puts the stale objects on opposite sides of the default raised-production set", () => {
    const inside = buildGpFixture("stale-in-set", now).plan.stale.map((row) => row.norad);
    const outside = buildGpFixture("stale-outside-set", now).plan.stale.map((row) => row.norad);
    assert.deepEqual(inside, [68360, 68361]);
    assert.deepEqual(outside, [57179, 59779]);
  });
});
