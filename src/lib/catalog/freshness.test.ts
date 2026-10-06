import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCatalog, indexOmms } from "./build.ts";
import { dataFreshness } from "./freshness.ts";
import type { CatalogOmm } from "./types.ts";

function omm(epoch: string, norad = 68360): CatalogOmm {
  return {
    OBJECT_NAME: "FRESHNESS-TEST",
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

const now = new Date("2026-09-20T12:00:00Z");

describe("data freshness", () => {
  it("treats a failed live fetch as a snapshot, and notes epochs past 72 hours", () => {
    const catalog = buildCatalog({
      omms: indexOmms([omm("2026-09-17T04:00:00.000000")]),
      fetchedAt: "2026-09-20T12:32:36Z",
      source: "seed",
      warning: "Live catalog fetch failed",
      now,
    });
    const freshness = dataFreshness(catalog);
    assert.equal(freshness.kind, "seed");
    if (freshness.kind !== "seed") return;
    assert.equal(freshness.snapshotDate, "2026-09-20");
    assert.ok(freshness.staleCount >= 1);
  });

  it("marks a live catalog stale when an on-orbit epoch is past 72 hours", () => {
    const catalog = buildCatalog({
      omms: indexOmms([omm("2026-09-17T04:00:00.000000")]),
      fetchedAt: now.toISOString(),
      source: "live",
      warning: null,
      now,
    });
    const freshness = dataFreshness(catalog);
    assert.equal(freshness.kind, "stale");
  });

  it("stays current when the live epoch is inside 72 hours", () => {
    const catalog = buildCatalog({
      omms: indexOmms([omm("2026-09-20T06:00:00.000000")]),
      fetchedAt: now.toISOString(),
      source: "live",
      warning: null,
      now,
    });
    assert.equal(dataFreshness(catalog).kind, "current");
  });
});
