import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HISTORY_KEEP_MS,
  mergeHistory,
  parseHistoryDocument,
  experimentalGpUrls,
  rassvetGpUrl,
  rowsForCatalog,
  rowsFromGp,
} from "../src/lib/catalog/altitude-history.mjs";

const NOW = new Date("2026-10-15T17:17:00Z");

function row(norad, epoch, alt, name = "RASSVET-3 1") {
  return { norad, name, epoch, alt_km: alt };
}

describe("altitude history file", () => {
  it("uses the single Rassvet name query", () => {
    const url = rassvetGpUrl({
      celestrak: {
        queries: [
          "https://celestrak.org/NORAD/elements/gp.php?NAME=RASSVET&FORMAT=json",
          "https://celestrak.org/NORAD/elements/gp.php?INTDES=2023-091&FORMAT=json",
        ],
      },
    });
    assert.equal(url, "https://celestrak.org/NORAD/elements/gp.php?NAME=RASSVET&FORMAT=json");
  });

  it("selects only the experimental launch queries", () => {
    const urls = experimentalGpUrls({
      celestrak: {
        queries: [
          "https://celestrak.org/NORAD/elements/gp.php?NAME=RASSVET&FORMAT=json",
          "https://celestrak.org/NORAD/elements/gp.php?INTDES=2026-061&FORMAT=json",
          "https://celestrak.org/NORAD/elements/gp.php?INTDES=2024-092&FORMAT=json",
          "https://celestrak.org/NORAD/elements/gp.php?INTDES=2023-091&FORMAT=json",
        ],
      },
      groups: [
        { id: "exp-2023", kind: "experimental" },
        { id: "exp-2024", kind: "experimental" },
        { id: "prod-2026-03", kind: "production" },
      ],
      objects: [
        { norad: 57179, name: "Rassvet-1 No. 1", cospar: "2023-091P", group: "exp-2023" },
        { norad: 59779, name: "Rassvet-2 No. 1", cospar: "2024-092G", group: "exp-2024" },
        { norad: 68360, name: "RASSVET-3 1", cospar: "2026-061A", group: "prod-2026-03" },
      ],
    });
    assert.deepEqual(urls, [
      "https://celestrak.org/NORAD/elements/gp.php?INTDES=2024-092&FORMAT=json",
      "https://celestrak.org/NORAD/elements/gp.php?INTDES=2023-091&FORMAT=json",
    ]);
  });

  it("keeps catalogued NORADs and replaces OBJECT P with the display name", () => {
    const rows = rowsForCatalog(
      [
        {
          OBJECT_NAME: "OBJECT P",
          NORAD_CAT_ID: 57179,
          EPOCH: "2026-10-26T06:00:00.000000",
          MEAN_MOTION: 15.18532325,
          ECCENTRICITY: 0.00011197,
          INCLINATION: 82.2883,
        },
        {
          OBJECT_NAME: "NOT RASSVET",
          NORAD_CAT_ID: 99999,
          EPOCH: "2026-10-26T06:00:00.000000",
          MEAN_MOTION: 15.18532325,
          ECCENTRICITY: 0.00011197,
          INCLINATION: 82.2883,
        },
      ],
      [{ norad: 57179, name: "Rassvet-1 No. 1" }],
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, "Rassvet-1 No. 1");
    assert.equal(rows[0].norad, 57179);
  });

  it("turns a GP object into a Brouwer altitude row", () => {
    const rows = rowsFromGp([
      {
        OBJECT_NAME: "RASSVET-3 1",
        NORAD_CAT_ID: 68360,
        EPOCH: "2026-10-11T04:42:57.334752",
        MEAN_MOTION: 15.18532325,
        ECCENTRICITY: 0.00011197,
        INCLINATION: 82.2883,
      },
      { NORAD_CAT_ID: 1 },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].norad, 68360);
    assert.equal(rows[0].name, "RASSVET-3 1");
    assert.equal(rows[0].epoch, "2026-10-11T04:42:57.334752");
    assert.ok(Math.abs(rows[0].alt_km - 507.256) < 0.001, `${rows[0].alt_km}`);
  });

  it("de-dupes by norad and epoch, letting the later copy win", () => {
    const epoch = "2026-10-15T04:00:00.000000";
    const merged = mergeHistory(
      [row(68360, epoch, 500, "OLD")],
      [row(68360, epoch, 501.5, "RASSVET-3 1"), row(68361, epoch, 510)],
      NOW,
    );
    assert.equal(merged.length, 2);
    assert.deepEqual(merged[0], row(68360, epoch, 501.5, "RASSVET-3 1"));
    assert.equal(merged[1].norad, 68361);
  });

  it("drops epochs older than 60 days and keeps one on the boundary", () => {
    assert.equal(HISTORY_KEEP_MS, 60 * 24 * 60 * 60 * 1000);
    const old = new Date(NOW.getTime() - HISTORY_KEEP_MS - 60_000).toISOString().replace(/Z$/, "");
    const edge = new Date(NOW.getTime() - HISTORY_KEEP_MS).toISOString().replace(/Z$/, "");
    const fresh = "2026-10-15T05:00:00.000000";
    const merged = mergeHistory(
      [row(1, old, 100), row(1, edge, 101), { norad: "nope", epoch: fresh, alt_km: 1 }],
      [row(2, fresh, 102)],
      NOW,
    );
    assert.deepEqual(
      merged.map((item) => item.norad),
      [1, 2],
    );
    assert.equal(merged[0].epoch, edge);
  });

  it("parses a document and rejects a payload without rows", () => {
    const rows = parseHistoryDocument({
      v: 1,
      rows: [row(68370, "2026-10-15T00:00:00", 340.125)],
    });
    assert.equal(rows?.length, 1);
    assert.equal(rows?.[0].alt_km, 340.125);
    assert.equal(parseHistoryDocument({ objects: [] }), null);
    assert.equal(parseHistoryDocument(null), null);
  });
});
