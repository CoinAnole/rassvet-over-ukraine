import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  confirmedDecay,
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
});
