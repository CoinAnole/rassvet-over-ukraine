import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { historyDocument, rowsForCatalog } from "../src/lib/catalog/altitude-history.mjs";
import { backoffMs, satcatCandidates } from "../src/lib/catalog/celestrak-fetch.mjs";
import { blobDataStore, recordAltitudes } from "./record-altitude-history.mjs";

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
    celestrak: {
      queries: [
        GP_URL,
        INTDES_2023,
        "https://celestrak.org/NORAD/elements/gp.php?INTDES=2026-061&FORMAT=json",
      ],
    },
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
  it("waits 15s then 30s", () => {
    assert.equal(backoffMs(0), 15_000);
    assert.equal(backoffMs(1), 30_000);
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
    assert.deepEqual(sleeps, [15_000]);
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
    assert.equal(
      calls.every((call) => call.url === GP_URL),
      true,
    );
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
    writeFileSync(
      file,
      `${JSON.stringify(historyDocument(rows, new Date("2026-10-24T19:29:06.569Z")))}\n`,
    );
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
    assert.equal(result.changed, true);
    assert.match(lines.join("\n"), /No new GP epochs/);
    const saved = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(saved.updated, "2026-10-24T19:29:06.569Z");
    const snap = JSON.parse(readFileSync(join(root, "gp-latest.json"), "utf8"));
    assert.equal(snap.fetchedAt, "2026-10-25T19:36:00.000Z");
    assert.equal(snap.objects.length, 1);
    assert.equal(snap.objects[0].NORAD_CAT_ID, 68360);
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
        body: [gpRow(57179, fresh, "OBJECT P"), gpRow(99999, fresh, "NOT RASSVET")],
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
    assert.equal(
      saved.some((row) => row.name === "OBJECT P" || row.norad === 99999),
      false,
    );
    assert.equal(
      calls.some((call) => call.url.includes("INTDES=2026-061")),
      false,
    );
    const satcat = calls.filter((call) => call.url.includes("satcat"));
    assert.deepEqual(
      satcat.map((call) => call.url),
      ["https://celestrak.org/satcat/records.php?CATNR=100089&FORMAT=JSON"],
    );
    assert.match(lines.join("\n"), /SATCAT candidates: 1/);
    const snap = JSON.parse(readFileSync(join(root, "gp-latest.json"), "utf8"));
    assert.equal(snap.fetchedAt, "2026-10-26T12:00:00.000Z");
    assert.deepEqual(
      snap.objects.map((row) => [row.NORAD_CAT_ID, row.OBJECT_NAME]).sort((a, b) => a[0] - b[0]),
      [
        [57179, "OBJECT P"],
        [68360, "RASSVET-3 1"],
        [100089, "RASSVET-3 23"],
      ],
    );
  });

  it("stops after the first GP query exhausts retries and does not write", async () => {
    const root = dir();
    const file = join(root, "altitude-history.json");
    const historyBefore = '{"v":1,"updated":"2026-10-24T19:29:06.569Z","rows":[]}\n';
    const reentriesBefore = '{"v":1,"records":[{"norad":68363}]}\n';
    const gpBefore = '{"fetchedAt":"keep"}\n';
    writeFileSync(file, historyBefore);
    writeFileSync(join(root, "reentries.json"), reentriesBefore);
    writeFileSync(join(root, "gp-latest.json"), gpBefore);
    const sleeps = [];
    const { fetchImpl, calls } = scriptedFetch([{ status: 500, body: "upstream broke" }]);
    const result = await recordAltitudes({
      file,
      config: experimentalConfig(),
      fetchImpl,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      attempts: 3,
      now: new Date("2026-10-26T12:00:00Z"),
      log() {},
      warn() {},
    });
    assert.equal(result.exitCode, 1);
    assert.equal(result.changed, false);
    assert.deepEqual(sleeps, [15_000, 30_000]);
    assert.equal(calls.length, 3);
    assert.equal(
      calls.every((call) => call.url === GP_URL),
      true,
    );
    assert.equal(
      calls.some((call) => call.url.includes("INTDES=") || call.url.includes("satcat")),
      false,
    );
    assert.equal(readFileSync(file, "utf8"), historyBefore);
    assert.equal(readFileSync(join(root, "reentries.json"), "utf8"), reentriesBefore);
    assert.equal(readFileSync(join(root, "gp-latest.json"), "utf8"), gpBefore);
  });

  it("does not read or write Blob when the first GP query exhausts retries", async () => {
    let reads = 0;
    let writes = 0;
    const store = blobDataStore({
      readBlobJson: async () => {
        reads += 1;
        return { ok: false, reason: "missing" };
      },
      writeBlobJson: async () => {
        writes += 1;
        return { url: "https://example.invalid/blob" };
      },
    });
    const { fetchImpl, calls } = scriptedFetch([{ status: 500, body: "down" }]);
    const result = await recordAltitudes({
      store,
      config: experimentalConfig(),
      fetchImpl,
      sleep: async () => {},
      attempts: 3,
      log() {},
      warn() {},
    });
    assert.equal(result.exitCode, 1);
    assert.equal(result.changed, false);
    assert.equal(reads, 0);
    assert.equal(writes, 0);
    assert.equal(calls.length, 3);
    assert.equal(
      calls.some((call) => call.url.includes("INTDES=") || call.url.includes("satcat")),
      false,
    );
  });

  it("does not retry a 403 and still runs the next GP query", async () => {
    const root = dir();
    const file = join(root, "altitude-history.json");
    const fresh = "2026-10-26T06:50:43.131552";
    const { fetchImpl, calls } = scriptedFetch([
      { status: 403, body: "blocked" },
      { status: 200, body: [gpRow(57179, fresh, "OBJECT P")] },
    ]);
    const result = await recordAltitudes({
      file,
      config: {
        userAgent: "RassvetOverUkraine/0.1 (test)",
        celestrak: { queries: [GP_URL, INTDES_2023] },
        groups: [{ id: "exp-2023", kind: "experimental" }],
        objects: [{ norad: 57179, name: "Rassvet-1 No. 1", cospar: "2023-091P", group: "exp-2023" }],
      },
      fetchImpl,
      sleep: async () => {},
      now: new Date("2026-10-26T12:00:00Z"),
      log() {},
      warn() {},
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.changed, true);
    assert.deepEqual(
      calls.map((call) => call.url),
      [GP_URL, INTDES_2023],
    );
    assert.deepEqual(
      JSON.parse(readFileSync(file, "utf8")).rows.map((row) => row.norad),
      [57179],
    );
    assert.equal(existsSync(join(root, "gp-latest.json")), false);
  });

  it("counts RASSVET names that are not in objects.json", async () => {
    const root = dir();
    const warnings = [];
    const { fetchImpl } = scriptedFetch([
      {
        status: 200,
        body: [
          gpRow(68360, "2026-10-26T06:50:43.131552", "RASSVET-3 1"),
          gpRow(70001, "2026-10-26T06:50:43.131552", "RASSVET-3 27"),
          gpRow(70001, "2026-10-26T07:50:43.131552", "RASSVET-3 27"),
          gpRow(99999, "2026-10-26T06:50:43.131552", "OBJECT Z"),
        ],
      },
    ]);
    const result = await recordAltitudes({
      file: join(root, "altitude-history.json"),
      config: config(),
      fetchImpl,
      sleep: async () => {},
      now: new Date("2026-10-26T12:00:00Z"),
      log() {},
      warn: (msg) => warnings.push(msg),
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.unlistedRassvet, 1);
    assert.match(
      warnings.join("\n"),
      /1 object named RASSVET that is not in objects.json: 70001 RASSVET-3 27/,
    );
    assert.equal(warnings.join("\n").includes("OBJECT Z"), false);
  });

  it("does not write when Blob history cannot be read", async () => {
    const writes = [];
    const store = blobDataStore({
      readBlobJson: async (pathname) => {
        if (pathname.endsWith("altitude-history.json")) {
          return { ok: false, reason: "unreachable", error: "HTTP 500" };
        }
        return { ok: false, reason: "missing" };
      },
      writeBlobJson: async (pathname) => {
        writes.push(pathname);
        return { url: `https://example.public.blob.vercel-storage.com/${pathname}` };
      },
    });
    const { fetchImpl } = scriptedFetch([
      { status: 200, body: [gpRow(68360, "2026-10-26T06:50:43.131552")] },
    ]);
    const result = await recordAltitudes({
      store,
      config: config(),
      fetchImpl,
      sleep: async () => {},
      now: new Date("2026-10-26T12:00:00Z"),
      log() {},
      warn() {},
    });
    assert.equal(result.exitCode, 1);
    assert.equal(result.changed, false);
    assert.deepEqual(writes, []);
  });

  it("merges the prior Blob history and writes the public pathnames", async () => {
    /** @type {Record<string, unknown>} */
    const saved = {};
    const store = blobDataStore({
      readBlobJson: async (pathname) => {
        if (pathname.endsWith("altitude-history.json")) {
          return {
            ok: true,
            data: {
              rows: [
                {
                  norad: 68360,
                  name: "RASSVET-3 1",
                  epoch: "2026-10-25T06:50:43.131552",
                  alt_km: 500,
                },
              ],
            },
          };
        }
        if (pathname.endsWith("reentries.json")) return { ok: true, data: { records: [] } };
        return { ok: false, reason: "missing" };
      },
      writeBlobJson: async (pathname, body) => {
        saved[pathname] = typeof body === "string" ? JSON.parse(body) : body;
        return { url: `https://example.public.blob.vercel-storage.com/${pathname}` };
      },
    });
    const { fetchImpl } = scriptedFetch([
      { status: 200, body: [gpRow(68360, "2026-10-26T06:50:43.131552")] },
    ]);
    const result = await recordAltitudes({
      store,
      config: config(),
      fetchImpl,
      sleep: async () => {},
      now: new Date("2026-10-26T12:00:00Z"),
      log() {},
      warn() {},
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.unlistedRassvet, 0);
    assert.deepEqual(
      saved["data/altitude-history.json"].rows.map((row) => row.epoch),
      ["2026-10-25T06:50:43.131552", "2026-10-26T06:50:43.131552"],
    );
    assert.equal(saved["data/gp-latest.json"].fetchedAt, "2026-10-26T12:00:00.000Z");
    assert.equal(saved["data/reentries.json"], undefined);
  });
});

describe("withdrawn reentries", () => {
  it("removes a record SATCAT no longer confirms and keeps a real decay", async () => {
    const root = dir();
    const file = join(root, "altitude-history.json");
    writeFileSync(
      join(root, "reentries.json"),
      `${JSON.stringify({
        v: 1,
        updated: "2026-10-29T00:00:00.000Z",
        records: [
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
            last_epoch: null,
            last_alt_km: null,
            first_seen: "2026-06-07T00:00:00.000Z",
          },
        ],
      })}\n`,
    );
    const { fetchImpl, calls } = scriptedFetch([
      { status: 200, body: [gpRow(100089, "2026-11-01T00:23:00.000000", "RASSVET-3 23")] },
      { status: 200, body: [{ DECAY_DATE: "", OPS_STATUS_CODE: "+" }] },
      { status: 200, body: [{ DECAY_DATE: "2026-06-06", OPS_STATUS_CODE: "D" }] },
    ]);
    const result = await recordAltitudes({
      file,
      config: config([
        { norad: 100089, name: "RASSVET-3 23" },
        { norad: 68363, name: "RASSVET-3 4" },
      ]),
      fetchImpl,
      sleep: async () => {},
      now: new Date("2026-11-02T00:00:00Z"),
      log() {},
      warn() {},
    });
    assert.equal(result.exitCode, 0);
    const records = JSON.parse(readFileSync(join(root, "reentries.json"), "utf8")).records;
    assert.deepEqual(
      records.map((record) => record.norad),
      [68363],
    );
    assert.deepEqual(
      calls.filter((call) => call.url.includes("satcat")).map((call) => call.url),
      [
        "https://celestrak.org/satcat/records.php?CATNR=100089&FORMAT=JSON",
        "https://celestrak.org/satcat/records.php?CATNR=68363&FORMAT=JSON",
      ],
    );
  });

  it("drops a decay SATCAT still lists when the GP epoch is a later day", async () => {
    const root = dir();
    const file = join(root, "altitude-history.json");
    writeFileSync(
      join(root, "reentries.json"),
      `${JSON.stringify({
        v: 1,
        records: [
          {
            norad: 100089,
            name: "RASSVET-3 23",
            decay_date: "2026-10-24",
            last_epoch: "2026-10-21T05:45:09.129600",
            last_alt_km: 221,
            first_seen: "2026-10-29T00:00:00.000Z",
          },
        ],
      })}\n`,
    );
    const { fetchImpl } = scriptedFetch([
      { status: 200, body: [gpRow(100089, "2026-11-01T00:23:00.000000", "RASSVET-3 23")] },
      { status: 200, body: [{ DECAY_DATE: "2026-10-24", OPS_STATUS_CODE: "D" }] },
    ]);
    const result = await recordAltitudes({
      file,
      config: config([{ norad: 100089, name: "RASSVET-3 23" }]),
      fetchImpl,
      sleep: async () => {},
      now: new Date("2026-11-02T00:00:00Z"),
      log() {},
      warn() {},
    });
    assert.equal(result.exitCode, 0);
    const records = JSON.parse(readFileSync(join(root, "reentries.json"), "utf8")).records;
    assert.deepEqual(records, []);
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
