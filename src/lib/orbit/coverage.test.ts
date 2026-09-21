import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { unionIntervals, unionMinutes, clipIntervals } from "./union.ts";
import { coverageSentence } from "../i18n/index.ts";
import { buildCatalog, indexOmms } from "../catalog/build.ts";
import { inPopulation } from "./coverage.ts";
import { orbitFromOmm } from "./kepler.ts";
import { zonedDayBounds } from "./time.ts";
import { json2satrec, propagate } from "./satellite-js.ts";
import type { CatalogOmm } from "../catalog/types.ts";

describe("union minutes", () => {
  it("counts overlapping passes once", () => {
    const t0 = Date.parse("2026-09-20T00:00:00Z");
    const a = { start: t0, end: t0 + 10 * 60_000, objects: [1] };
    const b = { start: t0 + 5 * 60_000, end: t0 + 12 * 60_000, objects: [2] };
    const unioned = unionIntervals([a, b]);
    assert.equal(unioned.length, 1);
    assert.equal(unionMinutes(unioned), 12);
    const sum = unionMinutes([a, b]);
    assert.ok(unionMinutes(unioned) < sum);
  });

  it("clips to the local day", () => {
    const t0 = Date.parse("2026-09-20T00:00:00Z");
    const iv = { start: t0 - 5 * 60_000, end: t0 + 10 * 60_000, objects: [1] };
    const clipped = clipIntervals([iv], t0, t0 + 24 * 3600_000);
    assert.equal(unionMinutes(clipped), 10);
  });
});

describe("caveat sentence snapshot", () => {
  it("matches the English fixture", () => {
    const s = coverageSentence("en", {
      el: 25,
      place: "Kyiv",
      windows: 2,
      minutes: 47,
    });
    assert.equal(
      s,
      "At 25° minimum elevation over Kyiv, the current catalog produces 2 windows today totalling 47 minutes. This is geometric line-of-sight from public orbit data, not proof that a terminal can attach, that capacity exists, or that inter-satellite links are on.",
    );
  });

  it("uses the singular window word", () => {
    const s = coverageSentence("en", { el: 40, place: "Odesa", windows: 1, minutes: 8 });
    assert.match(s, /produces 1 window today/);
  });
});

describe("decayed and stale classification", () => {
  it("excludes the manual decayed NORAD from raised/all populations", () => {
    const catalog = buildCatalog({
      omms: indexOmms([]),
      fetchedAt: "2026-09-20T00:00:00Z",
      source: "seed",
      warning: null,
      now: new Date("2026-09-20T12:00:00Z"),
    });
    const decayed = catalog.objects.find((o) => o.norad === 68363);
    assert.ok(decayed);
    assert.equal(decayed.status, "decayed");
    assert.equal(inPopulation(decayed, "all"), false);
    assert.equal(inPopulation(decayed, "raised"), false);
  });

  it("flags a TLE aged 80 hours as stale", () => {
    const now = new Date("2026-09-20T12:00:00Z");
    const omm: CatalogOmm = {
      OBJECT_NAME: "STALE-TEST",
      OBJECT_ID: "2026-061A",
      EPOCH: "2026-09-17T04:00:00.000000",
      MEAN_MOTION: 15.184,
      ECCENTRICITY: 0.0002,
      INCLINATION: 82.3,
      RA_OF_ASC_NODE: 10,
      ARG_OF_PERICENTER: 20,
      MEAN_ANOMALY: 30,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: "U",
      NORAD_CAT_ID: 68360,
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 1,
      BSTAR: 0,
      MEAN_MOTION_DOT: 0,
      MEAN_MOTION_DDOT: 0,
    };
    const catalog = buildCatalog({
      omms: indexOmms([omm]),
      fetchedAt: now.toISOString(),
      source: "seed",
      warning: null,
      now,
    });
    const obj = catalog.objects.find((o) => o.norad === 68360);
    assert.ok(obj?.stale);
  });
});

describe("altitude gate", () => {
  it("treats a ~500 km object as raised and a ~350 km object as climbing", () => {
    const raised = orbitFromOmm({ MEAN_MOTION: 15.184, ECCENTRICITY: 0.0002, INCLINATION: 82.3 });
    const climbing = orbitFromOmm({ MEAN_MOTION: 15.65, ECCENTRICITY: 0.0005, INCLINATION: 82.3 });
    assert.ok(raised.approxAltitudeKm >= 480, `raised ${raised.approxAltitudeKm}`);
    assert.ok(climbing.approxAltitudeKm < 480, `climbing ${climbing.approxAltitudeKm}`);
  });
});

describe("synthetic high-inclination object", () => {
  it("propagates a ~500 km, ~97 min, high-inclination satrec", () => {
    const omm: CatalogOmm = {
      OBJECT_NAME: "SYNTH-KYIV",
      OBJECT_ID: "1998-067A",
      EPOCH: "2026-09-20T12:00:00.000000",
      MEAN_MOTION: 15.184,
      ECCENTRICITY: 0.0002,
      INCLINATION: 82.3,
      RA_OF_ASC_NODE: 0,
      ARG_OF_PERICENTER: 0,
      MEAN_ANOMALY: 0,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: "U",
      NORAD_CAT_ID: 99999,
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 1,
      BSTAR: 0,
      MEAN_MOTION_DOT: 0,
      MEAN_MOTION_DDOT: 0,
    };
    const rec = json2satrec(omm);
    const pv = propagate(rec, new Date("2026-09-20T12:00:00Z"));
    assert.ok(pv && pv.position);
    const pos = pv.position;
    const r = Math.hypot(pos.x, pos.y, pos.z);
    assert.ok(r > 6800 && r < 7000, `radius ${r}`);
  });
});

describe("timezone day bounds", () => {
  it("puts Kyiv midnight ahead of UTC", () => {
    const noonUtc = new Date("2026-09-20T12:00:00Z");
    const { start, end } = zonedDayBounds(noonUtc, "Europe/Kyiv");
    assert.equal(start.toISOString(), "2026-09-19T21:00:00.000Z");
    assert.equal(end.toISOString(), "2026-09-20T21:00:00.000Z");
  });
});
