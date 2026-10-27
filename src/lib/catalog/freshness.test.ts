import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCatalog, indexOmms } from "./build.ts";
import { dataFreshness, newestPropagatedEpoch } from "./freshness.ts";
import { fallbackBannerText } from "../i18n/fallback-banner.ts";
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

function seedDate(): string {
  return "2026-09-20T12:32:36Z";
}

describe("data freshness", () => {
  it("treats a failed live fetch as a snapshot, and notes epochs past 72 hours", () => {
    const catalog = buildCatalog({
      omms: indexOmms([omm("2026-09-17T04:00:00.000000")]),
      fetchedAt: "2026-09-20T12:32:36Z",
      source: "seed",
      warning: "Live catalog fetch failed",
      now,
    });
    const freshness = dataFreshness(catalog, now);
    assert.equal(freshness.kind, "seed");
    if (freshness.kind !== "seed") return;
    assert.equal(freshness.snapshotDate, "2026-09-20");
    assert.equal(freshness.staleCount, 0);
    const later = dataFreshness(catalog, new Date("2026-09-24T12:00:00Z"));
    assert.equal(later.kind, "seed");
    if (later.kind !== "seed") return;
    assert.equal(later.staleCount, 1);
  });

  it("bases the saved-snapshot banner on that file's fetch time", () => {
    const catalog = buildCatalog({
      omms: indexOmms([omm("2026-10-26T06:00:00.000000")]),
      fetchedAt: "2026-10-26T18:00:00.000Z",
      source: "saved",
      warning: null,
      now: new Date("2026-10-27T12:00:00Z"),
    });
    const fresh = dataFreshness(catalog, new Date("2026-10-27T12:00:00Z"));
    assert.equal(fresh.kind, "saved");
    if (fresh.kind !== "saved") return;
    assert.equal(fresh.snapshotDate, "2026-10-26 18:00");
    assert.equal(fresh.staleCount, 0);
    assert.match(fallbackBannerText("en", fresh), /saved snapshot from 2026-10-26 18:00/);
    assert.equal(/older than 72 hours/.test(fallbackBannerText("en", fresh)), false);
    assert.match(fallbackBannerText("uk", fresh), /збережений знімок від 2026-10-26 18:00/);
    assert.match(fallbackBannerText("ru", fresh), /сохранённый снимок от 2026-10-26 18:00/);

    const old = dataFreshness(catalog, new Date("2026-10-30T18:00:00Z"));
    assert.equal(old.kind, "saved");
    if (old.kind !== "saved") return;
    assert.equal(old.staleCount, 1);
    assert.match(fallbackBannerText("en", old), /saved snapshot from 2026-10-26 18:00 is older than 72 hours/);
    assert.match(fallbackBannerText("uk", old), /Збережений знімок від 2026-10-26 18:00 старіший за 72 години/);
    assert.match(fallbackBannerText("ru", old), /Сохранённый снимок от 2026-10-26 18:00 старше 72 часов/);
  });

  it("ignores a history epoch on an object that is not being propagated", () => {
    const catalog = buildCatalog({
      omms: indexOmms([omm("2026-09-18T00:00:00.000000", 68360)]),
      fetchedAt: seedDate(),
      source: "seed",
      warning: null,
      now,
    });
    const withHistoryLabel = {
      ...catalog,
      objects: catalog.objects.map((obj) =>
        obj.norad === 100089
          ? { ...obj, omm: null, epoch: "2026-10-21T05:45:09.129600", status: "reentering" as const }
          : obj,
      ),
    };
    const shown = newestPropagatedEpoch(withHistoryLabel);
    assert.ok(shown);
    assert.equal(shown.startsWith("2026-10-21"), false);
    assert.equal(shown.startsWith("2026-09-18"), true);
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
