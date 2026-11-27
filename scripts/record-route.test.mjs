import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleRecordAltitudes } from "../src/lib/catalog/record-route.mjs";
import { RECORDER_STATUS_PATH } from "./record-altitude-history.mjs";

const GP_URL = "https://celestrak.org/NORAD/elements/gp.php?NAME=RASSVET&FORMAT=json";
const INTDES_2023 = "https://celestrak.org/NORAD/elements/gp.php?INTDES=2023-091&FORMAT=json";

function config() {
  return {
    userAgent: "RassvetOverUkraine/0.1 (test)",
    celestrak: { queries: [GP_URL, INTDES_2023] },
    groups: [
      { id: "exp-2023", kind: "experimental" },
      { id: "prod-2026-03", kind: "production" },
    ],
    objects: [
      { norad: 68360, name: "RASSVET-3 1", cospar: "2026-061A", group: "prod-2026-03" },
      { norad: 57179, name: "Rassvet-1 No. 1", cospar: "2023-091P", group: "exp-2023" },
    ],
  };
}

function request(authorization) {
  return new Request("http://127.0.0.1/api/record-altitudes", {
    headers: authorization ? { authorization } : {},
  });
}

describe("record altitudes route", () => {
  it("rejects a missing or wrong bearer token and does not record", async () => {
    let ran = false;
    const missing = await handleRecordAltitudes(request(), {
      secret: "s3cret",
      store: {
        async readHistory() {
          ran = true;
          return [];
        },
      },
      writeStatus: false,
    });
    assert.equal(missing.status, 401);
    assert.deepEqual(await missing.json(), { ok: false, error: "unauthorized" });

    const wrong = await handleRecordAltitudes(request("Bearer nope"), {
      secret: "s3cret",
      writeStatus: false,
    });
    assert.equal(wrong.status, 401);
    const body = await wrong.json();
    assert.equal(body.ok, false);
    assert.equal(JSON.stringify(body).includes("s3cret"), false);
    assert.equal(ran, false);
  });

  it("fails fast, writes nothing but the status, and returns that status", async () => {
    const calls = [];
    let historyWrites = 0;
    const statuses = [];
    const response = await handleRecordAltitudes(request("Bearer s3cret"), {
      secret: "s3cret",
      config: config(),
      attempts: 3,
      now: new Date("2026-11-27T22:00:00Z"),
      sleep: async () => {},
      fetchImpl: async (url) => {
        calls.push(String(url));
        return { ok: false, status: 500, text: async () => "down" };
      },
      store: {
        async readHistory() {
          throw new Error("history should not be read");
        },
        async writeHistory() {
          historyWrites += 1;
        },
        async readReentries() {
          return [];
        },
        async writeReentries() {},
        async readGpLatestText() {
          return null;
        },
        async writeGpLatestText() {},
      },
      writeStatusBlob: async (pathname, body) => {
        statuses.push({ pathname, body });
        return { url: "https://example.public.blob.vercel-storage.com/data/recorder-status.json" };
      },
      log() {},
      warn() {},
    });
    assert.equal(response.status, 500);
    const status = await response.json();
    assert.equal(status.ok, false);
    assert.equal(status.ranAt, "2026-11-27T22:00:00.000Z");
    assert.match(status.error, /exhausted CelesTrak retries/);
    assert.equal(status.rowsBefore, null);
    assert.equal(status.rowsAfter, null);
    assert.deepEqual(status.unlisted, []);
    assert.equal(calls.length, 3);
    assert.equal(calls.every((url) => url === GP_URL), true);
    assert.equal(historyWrites, 0);
    assert.equal(statuses.length, 1);
    assert.equal(statuses[0].pathname, RECORDER_STATUS_PATH);
    assert.equal(statuses[0].body.ok, false);
  });
});
