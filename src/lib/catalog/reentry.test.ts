import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyReentries } from "./reentry.ts";
import { applyClimbRates } from "./apply-climb.ts";
import { buildCatalog, indexOmms } from "./build.ts";
import { inPopulation } from "../orbit/population.ts";
import type { CatalogOmm } from "./types.ts";
import type { HistoryRow } from "./altitude-history.mjs";
import type { ReentryRecord } from "./reentries.mjs";
import octoberRows from "./history-2026-10-24.json" with { type: "json" };

function omm(norad: number, meanMotion: number, epoch: string): CatalogOmm {
  return {
    OBJECT_NAME: "CLASSIFY",
    OBJECT_ID: "2026-061A",
    EPOCH: epoch,
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
    MEAN_MOTION_DOT: 0,
    MEAN_MOTION_DDOT: 0,
  };
}

function catalogFor(rows: CatalogOmm[]) {
  return buildCatalog({
    omms: indexOmms(rows),
    fetchedAt: "2026-10-24T12:00:00Z",
    source: "live",
    warning: null,
    now: new Date("2026-10-24T12:00:00Z"),
  });
}

describe("reentries", () => {
  const LOW = 15.65;
  const HIGH = 15.184;

  it("marks a SATCAT decay record decayed and drops its element set", () => {
    const record: ReentryRecord = {
      norad: 68363,
      name: "RASSVET-3 4",
      decay_date: "2026-06-06",
      last_epoch: null,
      last_alt_km: null,
      first_seen: "2026-06-07T00:00:00.000Z",
    };
    const rated = applyReentries(catalogFor([]), [record], null);
    const four = rated.objects.find((obj) => obj.norad === 68363);
    assert.ok(four);
    assert.equal(four.status, "decayed");
    assert.equal(four.decayDate, "2026-06-06");
    assert.equal(four.omm, null);
    assert.equal(inPopulation(four, "all"), false);
    assert.equal(rated.missingKnownIds.includes(68363), false);
    assert.deepEqual(rated.decayed, [68363]);
  });

  it("treats a stale low orbit as reentering and a stale high orbit as rate pending", () => {
    const fresh = "2026-10-24T07:39:07.751808";
    const rows = (octoberRows as HistoryRow[]).filter((row) => row.norad === 100089);
    rows.push({ norad: 68370, name: "RASSVET-3 11", epoch: fresh, alt_km: 458 });
    const catalog = applyClimbRates(
      catalogFor([
        omm(68370, HIGH, fresh),
        omm(100089, LOW, "2026-10-21T05:45:09.129600"),
        omm(100092, LOW, "2026-10-20T00:00:00.000000"),
      ]),
      rows,
    );
    const rated = applyReentries(catalog, [], rows);
    const twentyThree = rated.objects.find((obj) => obj.norad === 100089);
    const high = rated.objects.find((obj) => obj.norad === 100092);
    assert.equal(twentyThree?.status, "reentering");
    assert.equal(twentyThree?.omm, null);
    assert.equal(twentyThree?.climbKmPerDay, null);
    assert.ok(twentyThree?.approxAltitudeKm != null && twentyThree.approxAltitudeKm < 250);
    assert.equal(twentyThree?.epoch?.slice(0, 10), "2026-10-21");
    assert.equal(inPopulation(twentyThree!, "all"), false);
    assert.equal(inPopulation(twentyThree!, "prod-2026-07"), false);
    assert.equal(high?.status, "pending");
    assert.ok(high?.approxAltitudeKm != null && high.approxAltitudeKm > 250);
    assert.ok(high?.omm);
  });

  it("does not call a fresh low decay reentering", () => {
    const rows = (octoberRows as HistoryRow[]).filter((row) => row.norad === 100083);
    const catalog = applyClimbRates(
      catalogFor([omm(100083, LOW, "2026-09-01T00:00:00.000000")]),
      rows,
    );
    const rated = applyReentries(catalog, [], rows);
    const seventeen = rated.objects.find((obj) => obj.norad === 100083);
    assert.equal(seventeen?.status, "stuck");
    assert.ok(seventeen?.climbKmPerDay != null && seventeen.climbKmPerDay < -0.8);
  });
});
