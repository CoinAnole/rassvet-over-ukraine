import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { auditCatalog, epochAgeHours, orbitFromGp, renderAudit } from "./catalog-hygiene.mjs";
import { readObjectsConfig } from "./verify-catalog.mjs";

const EARTH = { muKm3s2: 398600.4418, earthRadiusKm: 6371 };

function config(overrides = {}) {
  return {
    raisedAltitudeKm: 480,
    staleHours: 72,
    earthRadiusKm: 6371,
    muKm3s2: 398600.4418,
    decayPerigeeKm: 150,
    groups: [
      { id: "batch", launchDate: "2026-03-23", label: { en: "Batch", uk: "Batch", ru: "Batch" } },
    ],
    decayed: [],
    objects: [
      {
        norad: 1,
        name: "RASSVET-3 1",
        catalogName: "RASSVET-3 1",
        cospar: "2026-061A",
        group: "batch",
      },
    ],
    ...overrides,
  };
}

function row(overrides = {}) {
  return {
    NORAD_CAT_ID: 1,
    OBJECT_ID: "2026-061A",
    OBJECT_NAME: "RASSVET-3 1",
    EPOCH: "2026-10-05T12:00:00.000000",
    MEAN_MOTION: 15.184,
    ECCENTRICITY: 0.0002,
    INCLINATION: 82.3,
    ...overrides,
  };
}

function live(cfg, records, extra = {}) {
  return auditCatalog({
    config: cfg,
    records,
    queries: [
      {
        url: "https://celestrak.org/NORAD/elements/gp.php?NAME=RASSVET&FORMAT=json",
        ok: true,
        error: null,
        count: records.length,
        objects: records,
      },
    ],
    source: "live",
    now: new Date("2026-10-06T00:00:00Z"),
    ...extra,
  });
}

describe("orbit proxy", () => {
  it("uses the same semi-major altitude as the site", () => {
    const orbit = orbitFromGp({ MEAN_MOTION: 15.184, ECCENTRICITY: 0.0002 }, EARTH);
    assert.ok(orbit);
    assert.ok(orbit.approxAltitudeKm >= 480, `alt ${orbit.approxAltitudeKm}`);
    assert.ok(orbit.perigeeKm > 150);
  });

  it("reads a CelesTrak epoch as UTC", () => {
    const age = epochAgeHours("2026-10-05T00:00:00.000000", new Date("2026-10-06T00:00:00Z"));
    assert.equal(age, 24);
  });
});

describe("auditCatalog", () => {
  it("accepts a matching GP row", () => {
    const report = live(config(), [row()]);
    assert.equal(report.exitCode, 0);
    assert.equal(report.present.length, 1);
    assert.equal(report.failures.length, 0);
    assert.match(renderAudit(report), /Result: ok/);
  });

  it("fails a COSPAR or catalogName mismatch", () => {
    const report = live(config(), [row({ OBJECT_ID: "2026-061B", OBJECT_NAME: "OTHER" })]);
    assert.equal(report.exitCode, 1);
    assert.ok(report.failures.some((line) => line.includes("cospar")));
    assert.ok(report.failures.some((line) => line.includes("catalogName")));
  });

  it("does not fail a curated display name that differs from OBJECT_NAME", () => {
    const cfg = config({
      objects: [
        {
          norad: 57179,
          name: "Rassvet-1 No. 1",
          catalogName: "OBJECT P",
          cospar: "2023-091P",
          group: "batch",
        },
      ],
    });
    const report = live(cfg, [
      row({ NORAD_CAT_ID: 57179, OBJECT_ID: "2023-091P", OBJECT_NAME: "OBJECT P" }),
    ]);
    assert.equal(report.exitCode, 0);
    assert.equal(report.displayDiffs.length, 1);
  });

  it("fails a curated ID that is missing and not decayed", () => {
    const report = live(config(), []);
    assert.equal(report.exitCode, 1);
    assert.match(report.failures[0], /not in GP/);
  });

  it("accepts a decayed ID that GP no longer publishes", () => {
    const report = live(config({ decayed: [1] }), []);
    assert.equal(report.exitCode, 0);
    assert.equal(report.missing.length, 1);
    assert.match(renderAudit(report), /on decayed list/);
  });

  it("fails a decayed override that still has a healthy GP row", () => {
    const report = live(config({ decayed: [1] }), [row()]);
    assert.equal(report.exitCode, 1);
    assert.match(report.failures[0], /still in GP/);
  });

  it("notes a low perigee without failing", () => {
    const report = live(config(), [row({ MEAN_MOTION: 16.6, ECCENTRICITY: 0.01 })]);
    assert.equal(report.exitCode, 0);
    assert.equal(report.lowPerigee.length, 1);
    assert.match(report.notes[0], /under 150 km/);
  });

  it("fails an unexpected RASSVET name and ignores rideshare extras", () => {
    const records = [
      row(),
      row({
        NORAD_CAT_ID: 42,
        OBJECT_ID: "2026-200A",
        OBJECT_NAME: "RASSVET-3 99",
      }),
      row({
        NORAD_CAT_ID: 99,
        OBJECT_ID: "2024-092A",
        OBJECT_NAME: "COSMOS 2576",
      }),
    ];
    const report = live(config(), records);
    assert.equal(report.exitCode, 1);
    assert.equal(report.unexpected.length, 1);
    assert.equal(report.rideshare.length, 1);
    assert.equal(report.rideshare[0].count, 1);
  });

  it("does not score presence when a query failed", () => {
    const report = auditCatalog({
      config: config(),
      records: [],
      queries: [
        { url: "https://example.test/gp", ok: false, error: "timeout", count: 0, objects: [] },
      ],
      source: "live",
      now: new Date("2026-10-06T00:00:00Z"),
    });
    assert.equal(report.exitCode, 2);
    assert.equal(report.failures.length, 0);
    assert.match(renderAudit(report), /Result: incomplete fetch/);
  });

  it("fails a decayed ID that is not in objects", () => {
    const report = live(config({ decayed: [68363] }), [row()]);
    assert.equal(report.exitCode, 1);
    assert.match(report.failures[0], /not in objects/);
  });
});

describe("checked-in catalog", () => {
  it("is structurally consistent when GP echoes catalogName and COSPAR", () => {
    const cfg = readObjectsConfig();
    const now = new Date("2026-10-06T00:00:00Z");
    const records = cfg.objects
      .filter((obj) => !cfg.decayed.includes(obj.norad))
      .map((obj) =>
        row({
          NORAD_CAT_ID: obj.norad,
          OBJECT_ID: obj.cospar,
          OBJECT_NAME: obj.catalogName,
          EPOCH: "2026-10-05T12:00:00.000000",
        }),
      );
    const report = live(cfg, records, { now });
    assert.equal(report.exitCode, 0, report.failures.join("\n"));
    assert.deepEqual(
      report.missing.map((obj) => obj.norad),
      cfg.decayed,
    );
  });
});
