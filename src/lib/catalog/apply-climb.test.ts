import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyClimbRates } from "./apply-climb.ts";
import { buildCatalog, indexOmms } from "./build.ts";
import type { CatalogOmm } from "./types.ts";
import type { HistoryRow } from "./altitude-history.mjs";
import liveRows from "../orbit/climb-rate.live.json" with { type: "json" };
import octoberRows from "./history-2026-10-24.json" with { type: "json" };
import { climbRate } from "../orbit/climb-rate.ts";

function omm(norad: number, meanMotion: number): CatalogOmm {
  return {
    OBJECT_NAME: "CLASSIFY",
    OBJECT_ID: "2026-061A",
    EPOCH: "2026-10-13T00:00:00.000000",
    MEAN_MOTION: meanMotion,
    ECCENTRICITY: 0.0002,
    INCLINATION: 82.3,
    RA_OF_ASC_NODE: 10,
    ARG_OF_PERICENTER: 20,
    MEAN_ANOMALY: 30,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: "U",
    NORAD_CAT_ID: norad,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 1,
    BSTAR: 0,
    MEAN_MOTION_DOT: 9,
    MEAN_MOTION_DDOT: 0,
  };
}

function catalogFor(rows: CatalogOmm[]) {
  return buildCatalog({
    omms: indexOmms(rows),
    fetchedAt: "2026-10-13T12:00:00Z",
    source: "live",
    warning: null,
    now: new Date("2026-10-13T12:00:00Z"),
  });
}

/** A line of `slope` km/day ending on the element epoch, plus older days outside the window. */
function history(norad: number, slope: number, endAlt: number): HistoryRow[] {
  const end = Date.parse("2026-10-13T00:00:00Z");
  const recent = [48, 24, 0].map((hours) => ({
    norad,
    name: "RASSVET",
    epoch: new Date(end - hours * 3_600_000).toISOString().replace(/Z$/, ""),
    alt_km: endAlt - slope * (hours / 24),
  }));
  const stale = [10, 9, 8].map((day) => ({
    norad,
    name: "RASSVET",
    epoch: new Date(end - day * 86_400_000).toISOString().replace(/Z$/, ""),
    alt_km: endAlt - 40,
  }));
  return [...stale, ...recent];
}

describe("applyClimbRates", () => {
  const LOW = 15.65;
  const HIGH = 15.184;

  it("marks every object under 450 km as rate pending when the history is missing", () => {
    const catalog = applyClimbRates(catalogFor([omm(68373, LOW), omm(68370, LOW)]), null);
    const fourteen = catalog.objects.find((o) => o.norad === 68373);
    const eleven = catalog.objects.find((o) => o.norad === 68370);
    assert.equal(fourteen?.status, "pending");
    assert.equal(fourteen?.climbKmPerDay, null);
    assert.equal(eleven?.status, "pending");
    assert.equal(eleven?.climbKmPerDay, null);
  });

  it("shows a computed climb, and holding when the slope is flat", () => {
    const low = catalogFor([omm(68373, LOW), omm(68370, LOW)]);
    const fourteenAlt = low.objects.find((o) => o.norad === 68373)?.approxAltitudeKm;
    const elevenAlt = low.objects.find((o) => o.norad === 68370)?.approxAltitudeKm;
    assert.ok(fourteenAlt != null && elevenAlt != null);
    const rated = applyClimbRates(low, [
      ...history(68373, 2.6, fourteenAlt),
      ...history(68370, 0.1, elevenAlt),
    ]);
    const fourteen = rated.objects.find((o) => o.norad === 68373);
    const eleven = rated.objects.find((o) => o.norad === 68370);
    assert.equal(fourteen?.status, "climbing");
    assert.ok(fourteen?.climbKmPerDay != null && fourteen.climbKmPerDay > 0.8);
    assert.equal(eleven?.status, "stuck");
    assert.ok(eleven?.climbKmPerDay != null && Math.abs(eleven.climbKmPerDay - 0.1) < 1e-6);
  });

  it("keeps a raised object raised and still reports its rate", () => {
    const raised = catalogFor([omm(68360, HIGH)]);
    const alt = raised.objects.find((o) => o.norad === 68360)?.approxAltitudeKm;
    assert.ok(alt != null && alt >= 450);
    const rated = applyClimbRates(raised, history(68360, -1.2, alt));
    const obj = rated.objects.find((o) => o.norad === 68360);
    assert.equal(obj?.status, "raised");
    assert.ok(obj?.climbKmPerDay != null && obj.climbKmPerDay < -0.8);
  });

  it("keeps a raised object raised when the history is climbing faster than 0.8 km/day", () => {
    const twenty = omm(100086, HIGH);
    const twentyEight = omm(100094, HIGH);
    twenty.EPOCH = "2026-09-01T00:00:00.000000";
    twentyEight.EPOCH = "2026-09-01T00:00:00.000000";
    const rated = applyClimbRates(catalogFor([twenty, twentyEight]), liveRows as HistoryRow[]);
    for (const norad of [100086, 100094]) {
      const obj = rated.objects.find((o) => o.norad === norad);
      assert.ok(obj);
      assert.ok(obj.approxAltitudeKm != null && obj.approxAltitudeKm >= 450);
      assert.equal(obj.status, "raised");
      assert.ok(obj.climbKmPerDay != null && obj.climbKmPerDay > 0.8, `${obj.climbKmPerDay}`);
    }
    const climbing = rated.objects.filter((o) => o.status === "climbing");
    assert.equal(climbing.length, 0);
  });

  it("marks a sustained loss under 450 km as not climbing", () => {
    const low = catalogFor([omm(100092, LOW)]);
    const alt = low.objects.find((o) => o.norad === 100092)?.approxAltitudeKm;
    assert.ok(alt != null);
    const rated = applyClimbRates(low, history(100092, -1.5, alt));
    const obj = rated.objects.find((o) => o.norad === 100092);
    assert.equal(obj?.status, "stuck");
    assert.ok(obj?.climbKmPerDay != null && obj.climbKmPerDay < -0.8);
  });

  it("classifies the 2026-10-24 history for 11, 14, 17, 23, and 26", () => {
    const rows = octoberRows as HistoryRow[];
    const byNorad = (norad: number) => rows.filter((row) => row.norad === norad);
    const twentyThree = climbRate(byNorad(100089));
    assert.ok(twentyThree);
    assert.equal(twentyThree.klass, "climbing");
    assert.ok(Math.abs(twentyThree.kmPerDay - 0.856) < 0.02, `${twentyThree.kmPerDay}`);

    const eleven = omm(68370, HIGH);
    const fourteen = omm(68373, LOW);
    const seventeen = omm(100083, LOW);
    const twenty = omm(100089, LOW);
    const twentySix = omm(100092, LOW);
    for (const obj of [eleven, fourteen, seventeen, twenty, twentySix]) {
      obj.EPOCH = "2026-09-01T00:00:00.000000";
    }
    const rated = applyClimbRates(
      catalogFor([eleven, fourteen, seventeen, twenty, twentySix]),
      rows,
    );
    const got = (norad: number) => rated.objects.find((obj) => obj.norad === norad);

    const raised = got(68370);
    assert.equal(raised?.status, "raised");
    assert.equal(raised?.climbKmPerDay, null);

    for (const norad of [68373, 100083, 100089]) {
      const pending = got(norad);
      assert.equal(pending?.status, "pending", String(norad));
      assert.equal(pending?.climbKmPerDay, null);
    }

    const stalled = got(100092);
    assert.equal(stalled?.status, "stuck");
    assert.ok(stalled?.climbKmPerDay != null && Math.abs(stalled.climbKmPerDay) < 0.1);
  });
});
