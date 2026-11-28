import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
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

const FS_PROBE = `
import { mock } from "node:test";
const calls = [];
function note(kind, file) {
  calls.push(kind + " " + file);
  throw new Error(kind + " " + file);
}
mock.module("node:fs", {
  namedExports: {
    readFileSync(...args) { note("read", args[0]); },
    writeFileSync(...args) { note("write", args[0]); },
    appendFileSync(...args) { note("append", args[0]); },
    mkdirSync(...args) { note("mkdir", args[0]); },
    existsSync() { return false; },
  },
});
const { readConfig } = await import("./scripts/record-altitude-history.mjs");
const { handleRecordAltitudes } = await import("./src/lib/catalog/record-route.mjs");
const loaded = readConfig();
if (!loaded.objects?.length) throw new Error("empty catalog");
const response = await handleRecordAltitudes(new Request("http://127.0.0.1/api/record-altitudes", {
  headers: { authorization: "Bearer s3cret" },
}), {
  secret: "s3cret",
  attempts: 1,
  sleep: async () => {},
  fetchImpl: async () => ({ ok: false, status: 500, text: async () => "down" }),
  store: {
    async readHistory() { return []; },
    async writeHistory() {},
    async readReentries() { return []; },
    async writeReentries() {},
    async readGpLatestText() { return null; },
    async writeGpLatestText() {},
  },
  writeStatus: false,
  log() {},
  warn() {},
});
const body = await response.json();
if (response.status !== 500) throw new Error("status " + response.status + " " + body.error);
if (!/exhausted CelesTrak retries/.test(body.error || "")) throw new Error(body.error || "missing error");
if (calls.length) throw new Error("filesystem calls: " + calls.join(", "));
`;

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
    assert.equal(
      calls.every((url) => url === GP_URL),
      true,
    );
    assert.equal(historyWrites, 0);
    assert.equal(statuses.length, 1);
    assert.equal(statuses[0].pathname, RECORDER_STATUS_PATH);
    assert.equal(statuses[0].body.ok, false);
  });

  it("loads objects.json from the module, not the filesystem", () => {
    const root = fileURLToPath(new URL("..", import.meta.url));
    const probe = spawnSync(
      process.execPath,
      ["--experimental-test-module-mocks", "--input-type=module", "-e", FS_PROBE],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(probe.status, 0, `${probe.stdout}\n${probe.stderr}`);
  });

  it("writes recorder status when the authorized path throws", async () => {
    const statuses = [];
    const response = await handleRecordAltitudes(request("Bearer s3cret"), {
      secret: "s3cret",
      now: new Date("2026-11-27T22:00:00Z"),
      readConfig() {
        throw new Error("ENOENT: src/config/objects.json token s3cret");
      },
      writeStatusBlob: async (pathname, body) => {
        statuses.push({ pathname, body });
      },
      log() {},
      warn() {},
    });
    assert.equal(response.status, 500);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.equal(body.ranAt, "2026-11-27T22:00:00.000Z");
    assert.match(body.error, /ENOENT/);
    assert.equal(body.error.includes("s3cret"), false);
    assert.equal(JSON.stringify(body).includes("s3cret"), false);
    assert.equal(body.rowsBefore, null);
    assert.equal(body.rowsAfter, null);
    assert.deepEqual(body.unlisted, []);
    assert.equal(statuses.length, 1);
    assert.equal(statuses[0].pathname, RECORDER_STATUS_PATH);
    assert.equal(statuses[0].body.ok, false);
    assert.equal(statuses[0].body.error.includes("s3cret"), false);
  });
});
