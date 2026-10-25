import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { auditCatalog, epochAgeHours, orbitFromGp, renderAudit } from "./catalog-hygiene.mjs";
import { readObjectsConfig } from "./verify-catalog.mjs";

function config(overrides = {}) {
  return {
    raisedAltitudeKm: 450,
    staleHours: 72,
    earthRadiusKm: 6371,
    muKm3s2: 398600.4418,
    decayPerigeeKm: 150,
    groups: [
      { id: "batch", launchDate: "2026-03-23", label: { en: "Batch", uk: "Batch", ru: "Batch" } },
    ],
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
  it("uses the Brouwer semi-major altitude", () => {
    const orbit = orbitFromGp({
      MEAN_MOTION: 15.18532325,
      ECCENTRICITY: 0.00011197,
      INCLINATION: 82.2883,
    });
    assert.ok(orbit);
    assert.ok(Math.abs(orbit.approxAltitudeKm - 507.256483) < 1e-4, `alt ${orbit.approxAltitudeKm}`);
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

  it("accepts a confirmed reentry that GP no longer publishes", () => {
    const report = live(config(), [], {
      reentries: [{ norad: 1, decay_date: "2026-06-06" }],
    });
    assert.equal(report.exitCode, 0, report.failures.join("\n"));
    assert.equal(report.missing.length, 1);
    assert.match(renderAudit(report), /confirmed reentry/);
  });

  it("fails a leftover manual decayed list", () => {
    const report = live(config({ decayed: [1] }), [row()]);
    assert.equal(report.exitCode, 1);
    assert.match(report.failures.join("\n"), /manual reentry list/);
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

  it("still fails a curated ID with neither GP nor a reentry record", () => {
    const report = live(config(), [row({ NORAD_CAT_ID: 99, OBJECT_ID: "2026-061B", OBJECT_NAME: "OTHER" })]);
    assert.equal(report.exitCode, 1);
    assert.match(report.failures.join("\n"), /has no confirmed reentry/);
  });
});

describe("checked-in catalog", () => {
  it("is structurally consistent when GP echoes catalogName and COSPAR", () => {
    const cfg = readObjectsConfig();
    const now = new Date("2026-10-06T00:00:00Z");
    assert.equal(cfg.stuck, undefined);
    assert.equal(cfg.decayed, undefined);
    const reentries = [{ norad: 68363, decay_date: "2026-06-06", name: "RASSVET-3 4" }];
    const records = cfg.objects
      .filter((obj) => obj.norad !== 68363)
      .map((obj) =>
        row({
          NORAD_CAT_ID: obj.norad,
          OBJECT_ID: obj.cospar,
          OBJECT_NAME: obj.catalogName,
          EPOCH: "2026-10-05T12:00:00.000000",
          MEAN_MOTION: 15.184,
        }),
      );
    const report = live(cfg, records, {
      now,
      history: { ok: true, error: null, rows: [] },
      reentries,
    });
    assert.equal(report.exitCode, 0, report.failures.join("\n"));
    assert.deepEqual(
      report.missing.map((obj) => obj.norad),
      [68363],
    );
    assert.equal(report.climbing.length, 0);
    assert.equal(report.notClimbing.length, 0);
    assert.equal(report.ratePending.length, 0);
  });
});

describe("climb rate warnings", () => {
  it("rejects a leftover manual not-climbing list", () => {
    const report = live(config({ stuck: [1] }), [row({ MEAN_MOTION: 15.65 })]);
    assert.equal(report.exitCode, 1);
    assert.match(report.failures.join("\n"), /manual not-climbing list/);
  });

  it("warns on an unknown rate under 450 km and still exits 0", () => {
    const gp = row({ MEAN_MOTION: 15.65, EPOCH: "2026-10-05T12:00:00.000000" });
    const orbit = orbitFromGp(gp);
    assert.ok(orbit && orbit.approxAltitudeKm < 450);
    const end = Date.parse("2026-10-05T12:00:00Z");
    const rising = [48, 24, 0].map((hours) => ({
      norad: 1,
      name: "RASSVET-3 1",
      epoch: new Date(end - hours * 3_600_000).toISOString().replace(/Z$/, ""),
      alt_km: orbit.approxAltitudeKm - 2.6 * (hours / 24),
    }));
    const climbing = live(config(), [gp], {
      history: { ok: true, error: null, rows: rising },
    });
    assert.equal(climbing.exitCode, 0, climbing.failures.join("\n"));
    assert.deepEqual(
      climbing.climbing.map((entry) => entry.obj.norad),
      [1],
    );
    assert.equal(climbing.notes.some((line) => /unknown rate/.test(line)), false);

    const flat = [48, 24, 0].map((hours) => ({
      norad: 1,
      name: "RASSVET-3 1",
      epoch: new Date(end - hours * 3_600_000).toISOString().replace(/Z$/, ""),
      alt_km: orbit.approxAltitudeKm,
    }));
    const holding = live(config(), [gp], {
      history: { ok: true, error: null, rows: flat },
    });
    assert.deepEqual(
      holding.notClimbing.map((entry) => entry.obj.norad),
      [1],
    );
    assert.match(renderAudit(holding), /Not climbing \(holding or decaying/);

    const staleEnd = end - 80 * 3_600_000;
    const staleGp = row({
      MEAN_MOTION: 15.65,
      EPOCH: new Date(staleEnd).toISOString().replace(/Z$/, ""),
    });
    const staleRising = [48, 24, 0].map((hours) => ({
      norad: 1,
      name: "RASSVET-3 1",
      epoch: new Date(staleEnd - hours * 3_600_000).toISOString().replace(/Z$/, ""),
      alt_km: orbit.approxAltitudeKm - 2.6 * (hours / 24),
    }));
    const reference = {
      norad: 2,
      name: "RASSVET-3 2",
      epoch: new Date(end).toISOString().replace(/Z$/, ""),
      alt_km: 500,
    };
    const stale = live(config(), [staleGp], {
      history: { ok: true, error: null, rows: [...staleRising, reference] },
    });
    assert.equal(stale.exitCode, 0, stale.failures.join("\n"));
    assert.deepEqual(
      stale.ratePending.map((entry) => entry.obj.norad),
      [1],
    );
    assert.equal(stale.climbing.length, 0);
    assert.match(stale.notes.join("\n"), /Stale altitude history/);
    assert.match(stale.notes.join("\n"), /unknown rate/);
    assert.match(renderAudit(stale), /warning, not a failure/);

    const raised = live(config(), [row({ MEAN_MOTION: 15.184 })], {
      history: { ok: true, error: null, rows: rising },
    });
    assert.equal(raised.climbing.length, 0);
    assert.equal(raised.ratePending.length, 0);

    const missing = live(config(), [gp], {
      history: { ok: false, error: "HTTP 404", rows: [] },
    });
    assert.equal(missing.exitCode, 0);
    assert.match(missing.notes.join("\n"), /Altitude history was not loaded/);
    assert.match(missing.notes.join("\n"), /unknown rate/);
    assert.deepEqual(
      missing.ratePending.map((entry) => entry.obj.norad),
      [1],
    );
  });
});
