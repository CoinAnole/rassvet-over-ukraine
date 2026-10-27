import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chooseCatalogElements } from "./gp-source.ts";
import { indexOmms } from "./build.ts";
import type { CatalogOmm } from "./types.ts";

function omm(norad: number, epoch: string): CatalogOmm {
  return {
    OBJECT_NAME: "GP",
    OBJECT_ID: "2026-061A",
    EPOCH: epoch,
    MEAN_MOTION: 15.184,
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

const seedFetchedAt = "2026-09-20T12:32:36Z";
const now = new Date("2026-10-27T12:00:00Z");

describe("GP fallback order", () => {
  const wanted = new Set([68360, 57179]);
  const seedOmms = indexOmms([omm(68360, "2026-09-18T00:00:00.000000"), omm(57179, "2026-09-18T00:00:00.000000")]);
  const saved = {
    fetchedAt: "2026-10-26T18:00:00.000Z",
    objects: [omm(68360, "2026-10-26T06:00:00.000000"), omm(57179, "2026-10-26T06:00:00.000000")],
  };

  it("uses live rows when any CelesTrak query returns catalogued objects", () => {
    const chosen = chooseCatalogElements({
      wanted,
      seedOmms,
      seedFetchedAt,
      liveLists: [[omm(68360, "2026-10-27T06:00:00.000000")], null],
      saved,
      now,
    });
    assert.equal(chosen.source, "live");
    assert.equal(chosen.fetchedAt, now.toISOString());
    assert.equal(chosen.omms.get(68360)?.EPOCH, "2026-10-27T06:00:00.000000");
    assert.equal(chosen.omms.get(57179)?.EPOCH, "2026-09-18T00:00:00.000000");
  });

  it("uses the saved snapshot when every live query fails", () => {
    const chosen = chooseCatalogElements({
      wanted,
      seedOmms,
      seedFetchedAt,
      liveLists: [null, null],
      saved,
      now,
    });
    assert.equal(chosen.source, "saved");
    assert.equal(chosen.fetchedAt, "2026-10-26T18:00:00.000Z");
    assert.equal(chosen.omms.get(57179)?.EPOCH, "2026-10-26T06:00:00.000000");
  });

  it("uses the checked-in snapshot when the saved file is missing", () => {
    const chosen = chooseCatalogElements({
      wanted,
      seedOmms,
      seedFetchedAt,
      liveLists: [null],
      saved: null,
      now,
    });
    assert.equal(chosen.source, "seed");
    assert.equal(chosen.fetchedAt, seedFetchedAt);
    assert.equal(chosen.omms.get(68360)?.EPOCH, "2026-09-18T00:00:00.000000");
  });
});
