import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { historyDocument, rowsForCatalog } from "../src/lib/catalog/altitude-history.mjs";
import { backoffMs, satcatCandidates } from "../src/lib/catalog/celestrak-fetch.mjs";
import { recordAltitudes } from "./record-altitude-history.mjs";

const GP_URL = "https://celestrak.org/NORAD/elements/gp.php?NAME=RASSVET&FORMAT=json";

function gpRow(norad, epoch, name = `RASSVET ${norad}`) {
  return {
    OBJECT_NAME: name,
    NORAD_CAT_ID: norad,
    EPOCH: epoch,
    MEAN_MOTION: 15.18532325,
    ECCENTRICITY: 0.00011197,
    INCLINATION: 82.2883,
  };
}

const INTDES_2023 = "https://celestrak.org/NORAD/elements/gp.php?INTDES=2023-091&FORMAT=json";

function experimentalConfig() {
  return {
    userAgent: "RassvetOverUkraine/0.1 (test)",
    celestrak: { queries: [GP_URL, INTDES_2023, "https://celestrak.org/NORAD/elements/gp.php?INTDES=2026-061&FORMAT=json"] },
    groups: [
      { id: "exp-2023", kind: "experimental" },
      { id: "prod-2026-03", kind: "production" },
    ],
    objects: [
      { norad: 68360, name: "RASSVET-3 1", cospar: "2026-061A", group: "prod-2026-03" },
      { norad: 100089, name: "RASSVET-3 23", cospar: "2026-165G", group: "prod-2026-07" },
      { norad: 57179, name: "Rassvet-1 No. 1", cospar: "2023-091P", group: "exp-2023" },
    ],
  };
}

function config(objects = [{ norad: 68360, name: "RASSVET-3 1" }]) {
  return {
    userAgent: "RassvetOverUkraine/0.1 (test)",
    celestrak: { queries: [GP_URL] },
    objects,
  };
}

function jsonResponse(status, body) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
  };
}

function scriptedFetch(steps) {
  const calls = [];
  let i = 0;
  const fetchImpl = async (url, init) => {
    calls.push({ url, userAgent: init.headers["User-Agent"] });
    const step = steps[Math.min(i, steps.length - 1)];
    i += 1;
    if (step === "hang") {
      return new Promise((_, reject) => {
        init.signal.addEventListener("abort", () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    }
    return jsonResponse(step.status, step.body);
  };
  return { fetchImpl, calls };
}

function dir() {
  return mkdtempSync(join(tmpdir(), "alt-hist-"));
}

describe("CelesTrak retry", () => {
  it("waits 2s then 4s", () => {
    assert.equal(backoffMs(0), 2_000);
    assert.equal(backoffMs(1), 4_000);
  });

  it("retries HTTP 500 and then saves the GP rows", async () => {
    const root = dir();
    const file = join(root, "altitude-history.json");
    const sleeps = [];
    const { fetchImpl, calls } = scriptedFetch([
      { status: 500, body: "upstream broke" },
      { status: 200, body: [gpRow(68360, "2026-10-26T06:50:43.131552")] },
    ]);
    const result = await recordAltitudes({
      file,
      config: config(),
      fetchImpl,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      now: new Date("2026-10-26T12:00:00Z"),
      log() {},
      warn() {},
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.changed, true);
    assert.deepEqual(sleeps, [2_000]);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].userAgent, "RassvetOverUkraine/0.1 (test)");
    assert.equal(calls[0].url, GP_URL);
    const saved = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(saved.rows.length, 1);
    assert.equal(saved.rows[0].epoch, "2026-10-26T06:50:43.131552");
    assert.equal(saved.updated, "2026-10-26T12:00:00.000Z");
  });

  it("does not retry a 403 and fails the run", async () => {
    const root = dir();
    const file = join(root, "altitude-history.json");
    const { fetchImpl, calls } = scriptedFetch([{ status: 403, body: "blocked" }]);
    const result = await recordAltitudes({
      file,
      config: config(),
      fetchImpl,
      sleep: async () => {},
      log() {},
      warn() {},
    });
    assert.equal(result.exitCode, 1);
    assert.equal(result.changed, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, GP_URL);
  });

  it("fails the run when every GP attempt returns HTTP 500", async () => {
    const root = dir();
    const file = join(root, "altitude-history.json");
    writeFileSync(file, '{"v":1,"updated":"2026-10-24T19:29:06.569Z","rows":[]}\n');
    const { fetchImpl, calls } = scriptedFetch([{ status: 500, body: "" }]);
    const result = await recordAltitudes({
      file,
      config: config(),
      fetchImpl,
      sleep: async () => {},
      attempts: 3,
      log() {},
      warn() {},
    });
    assert.equal(result.exitCode, 1);
    assert.equal(result.changed, false);
    assert.equal(calls.length, 3);
    assert.equal(calls.every((call) => call.url === GP_URL), true);
    assert.equal(readFileSync(file, "utf8").includes("2026-10-24T19:29:06.569Z"), true);
  });

  it("fails when the request times out", async () => {
    const root = dir();
    const { fetchImpl, calls } = scriptedFetch(["hang", "hang"]);
    const result = await recordAltitudes({
      file: join(root, "altitude-history.json"),
      config: config(),
      fetchImpl,
      sleep: async () => {},
      attempts: 2,
      timeoutMs: 30,
      log() {},
      warn() {},
    });
    assert.equal(result.exitCode, 1);
    assert.equal(calls.length, 2);
  });

  it("succeeds quietly when the GP epochs are already stored", async () => {
    const root = dir();
    const file = join(root, "altitude-history.json");
    const epoch = "2026-10-24T07:24:27.060192";
    const catalog = config();
    const rows = rowsForCatalog([gpRow(68360, epoch)], catalog.objects);
    writeFileSync(file, `${JSON.stringify(historyDocument(rows, new Date("2026-10-24T19:29:06.569Z")))}\n`);
    const lines = [];
    const { fetchImpl } = scriptedFetch([{ status: 200, body: [gpRow(68360, epoch)] }]);
    const result = await recordAltitudes({
      file,
      config: catalog,
      fetchImpl,
      sleep: async () => {},
      now: new Date("2026-10-25T19:36:00Z"),
      log: (msg) => lines.push(msg),
      warn() {},
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.changed, false);
    assert.match(lines.join("\n"), /No new GP epochs/);
    const saved = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(saved.updated, "2026-10-24T19:29:06.569Z");
  });

  it("keeps a good GP fetch when the one SATCAT candidate fails", async () => {
    const root = dir();
    const file = join(root, "altitude-history.json");
    const warnings = [];
    const { fetchImpl, calls } = scriptedFetch([
      { status: 200, body: [gpRow(68360, "2026-10-26T06:50:43.131552")] },
      { status: 500, body: "satcat down" },
      { status: 500, body: "satcat down" },
      { status: 500, body: "satcat down" },
    ]);
    const result = await recordAltitudes({
      file,
      config: config([
        { norad: 68360, name: "RASSVET-3 1" },
        { norad: 68363, name: "RASSVET-3 4" },
      ]),
      fetchImpl,
      sleep: async () => {},
      now: new Date("2026-10-26T12:00:00Z"),
      log() {},
      warn: (msg) => warnings.push(msg),
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.changed, true);
    assert.equal(JSON.parse(readFileSync(file, "utf8")).rows.length, 1);
    assert.equal(calls.filter((call) => call.url.includes("satcat")).length, 3);
    assert.equal(calls.filter((call) => call.url.includes("CATNR=68360")).length, 0);
    assert.match(warnings.join("\n"), /SATCAT 68363/);
  });

  it("stores an experimental INTDES row under the display name and drops the rideshare", async () => {
    const root = dir();
    const file = join(root, "altitude-history.json");
    const fresh = "2026-10-26T06:50:43.131552";
    const stale = "2026-10-21T05:45:09.129600";
    const { fetchImpl, calls } = scriptedFetch([
      {
        status: 200,
        body: [gpRow(68360, fresh, "RASSVET-3 1"), gpRow(100089, stale, "RASSVET-3 23")],
      },
      {
        status: 200,
        body: [
          gpRow(57179, fresh, "OBJECT P"),
          gpRow(99999, fresh, "NOT RASSVET"),
        ],
      },
      { status: 200, body: [{ DECAY_DATE: "", OPS_STATUS_CODE: "+" }] },
    ]);
    const lines = [];
    const result = await recordAltitudes({
      file,
      config: experimentalConfig(),
      fetchImpl,
      sleep: async () => {},
      now: new Date("2026-10-26T12:00:00Z"),
      log: (msg) => lines.push(msg),
      warn() {},
    });
    assert.equal(result.exitCode, 0);
    const saved = JSON.parse(readFileSync(file, "utf8")).rows;
    assert.deepEqual(
      saved.map((row) => [row.norad, row.name]).sort((a, b) => a[0] - b[0]),
      [
        [57179, "Rassvet-1 No. 1"],
        [68360, "RASSVET-3 1"],
        [100089, "RASSVET-3 23"],
      ],
    );
    assert.equal(saved.some((row) => row.name === "OBJECT P" || row.norad === 99999), false);
    assert.equal(calls.some((call) => call.url.includes("INTDES=2026-061")), false);
    const satcat = calls.filter((call) => call.url.includes("satcat"));
    assert.deepEqual(
      satcat.map((call) => call.url),
      ["https://celestrak.org/satcat/records.php?CATNR=100089&FORMAT=JSON"],
    );
    assert.match(lines.join("\n"), /SATCAT candidates: 1/);
  });

  it("warns when an experimental launch query fails and still saves the RASSVET rows", async () => {
    const root = dir();
    const file = join(root, "altitude-history.json");
    const warnings = [];
    const { fetchImpl } = scriptedFetch([
      { status: 200, body: [gpRow(68360, "2026-10-26T06:50:43.131552", "RASSVET-3 1")] },
      { status: 500, body: "intdes down" },
    ]);
    const result = await recordAltitudes({
      file,
      config: experimentalConfig(),
      fetchImpl,
      sleep: async () => {},
      now: new Date("2026-10-26T12:00:00Z"),
      log() {},
      warn: (msg) => warnings.push(msg),
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.changed, true);
    const saved = JSON.parse(readFileSync(file, "utf8")).rows;
    assert.deepEqual(
      saved.map((row) => row.norad),
      [68360],
    );
    assert.match(warnings.join("\n"), /INTDES=2023-091 unavailable/);
  });
});

describe("SATCAT candidates", () => {
  it("asks only about a missing or stale object that is not already recorded", () => {
    const fresh = "2026-10-26T06:50:43.131552";
    const stale = "2026-10-21T05:45:09.129600";
    const gp = new Map([
      [68360, { EPOCH: fresh }],
      [100089, { EPOCH: stale }],
    ]);
    const tracked = [
      { norad: 68360, name: "RASSVET-3 1" },
      { norad: 100089, name: "RASSVET-3 23" },
      { norad: 68363, name: "RASSVET-3 4" },
    ];
    const open = satcatCandidates(tracked, gp, new Set());
    assert.deepEqual(
      open.map((obj) => obj.norad),
      [100089, 68363],
    );
    const recorded = satcatCandidates(tracked, gp, new Set([68363]));
    assert.deepEqual(
      recorded.map((obj) => obj.norad),
      [100089],
    );
  });
});
