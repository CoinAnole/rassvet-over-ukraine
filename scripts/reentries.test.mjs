import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  confirmedDecay,
  gpEpochAfterDecay,
  gpSupersedesReentry,
  mergeReentryRecords,
  parseReentryDocument,
  REENTRY_ALT_KM,
} from "../src/lib/catalog/reentries.mjs";

describe("SATCAT reentry records", () => {
  it("reads a decay date and an ops code of D, and ignores an operational row", () => {
    assert.equal(REENTRY_ALT_KM, 250);
    assert.deepEqual(confirmedDecay({ DECAY_DATE: "2026-06-06", OPS_STATUS_CODE: "D" }), {
      decay_date: "2026-06-06",
    });
    assert.deepEqual(confirmedDecay({ DECAY_DATE: "", OPS_STATUS_CODE: "D" }), {
      decay_date: null,
    });
    assert.equal(confirmedDecay({ DECAY_DATE: "", OPS_STATUS_CODE: "+" }), null);
    assert.equal(confirmedDecay({ DECAY_DATE: "  ", OPS_STATUS_CODE: "+" }), null);
  });

  it("keeps old records and does not prune them", () => {
    const existing = [
      {
        norad: 68363,
        name: "RASSVET-3 4",
        decay_date: "2026-06-06",
        last_epoch: null,
        last_alt_km: null,
        first_seen: "2026-06-07T00:00:00.000Z",
      },
    ];
    const merged = mergeReentryRecords(
      existing,
      [
        {
          norad: 68363,
          name: "RASSVET-3 4",
          decay_date: "2026-06-06",
          last_epoch: "2026-06-05T00:00:00.000000",
          last_alt_km: 160,
        },
      ],
      "2026-10-25T00:00:00.000Z",
    );
    assert.equal(merged.length, 1);
    assert.equal(merged[0].first_seen, "2026-06-07T00:00:00.000Z");
    assert.equal(merged[0].last_epoch, "2026-06-05T00:00:00.000000");
    assert.equal(merged[0].last_alt_km, 160);
    const again = mergeReentryRecords(merged, [], "2026-12-01T00:00:00.000Z");
    assert.deepEqual(again, merged);
  });

  it("adds a newly confirmed decay and leaves an operational id out", () => {
    const merged = mergeReentryRecords(
      [],
      [{ norad: 100089, name: "RASSVET-3 23", decay_date: null }],
      "2026-10-25T00:00:00.000Z",
    );
    assert.equal(merged.length, 1);
    assert.equal(merged[0].decay_date, null);
    assert.equal(merged[0].first_seen, "2026-10-25T00:00:00.000Z");
    const parsed = parseReentryDocument({ v: 1, records: merged });
    assert.equal(parsed[0].norad, 100089);
    assert.equal(parseReentryDocument({ rows: [] }).length, 0);
  });

  it("drops a record SATCAT no longer confirms and keeps a real decay", () => {
    const existing = [
      {
        norad: 100089,
        name: "RASSVET-3 23",
        decay_date: "2026-10-24",
        last_epoch: "2026-10-21T05:45:09.129600",
        last_alt_km: 221,
        first_seen: "2026-10-29T00:00:00.000Z",
      },
      {
        norad: 68363,
        name: "RASSVET-3 4",
        decay_date: "2026-06-06",
        last_epoch: "2026-06-05T00:00:00.000000",
        last_alt_km: 160,
        first_seen: "2026-06-07T00:00:00.000Z",
      },
    ];
    const merged = mergeReentryRecords(existing, [], "2026-11-02T00:00:00.000Z", {
      withdrawnNorads: [100089],
    });
    assert.deepEqual(
      merged.map((record) => record.norad),
      [68363],
    );
  });

  it("drops a record when a GP epoch is on a later day than the decay date", () => {
    assert.equal(gpEpochAfterDecay("2026-11-01T00:23:00.000000", "2026-10-24"), true);
    assert.equal(gpEpochAfterDecay("2026-10-24T18:00:00.000000", "2026-10-24"), false);
    assert.equal(gpEpochAfterDecay("2026-06-05T00:00:00.000000", "2026-06-06"), false);
    const existing = [
      {
        norad: 100089,
        name: "RASSVET-3 23",
        decay_date: "2026-10-24",
        last_epoch: "2026-10-21T05:45:09.129600",
        last_alt_km: 221,
        first_seen: "2026-10-29T00:00:00.000Z",
      },
      {
        norad: 100083,
        name: "RASSVET-3 17",
        decay_date: "2026-10-29",
        last_epoch: "2026-10-28T00:00:00.000000",
        last_alt_km: 180,
        first_seen: "2026-10-29T12:00:00.000Z",
      },
    ];
    const gpEpochByNorad = new Map([
      [100089, "2026-11-01T00:23:00.000000"],
      [100083, "2026-10-28T00:00:00.000000"],
    ]);
    assert.equal(gpSupersedesReentry(gpEpochByNorad.get(100089), existing[0]), true);
    assert.equal(gpSupersedesReentry(gpEpochByNorad.get(100083), existing[1]), false);
    const merged = mergeReentryRecords(existing, [], "2026-11-02T00:00:00.000Z", {
      gpEpochByNorad,
    });
    assert.deepEqual(
      merged.map((record) => record.norad),
      [100083],
    );
  });
});
