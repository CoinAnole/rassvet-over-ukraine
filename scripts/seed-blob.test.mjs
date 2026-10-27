import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BLOB_PATH } from "../src/lib/catalog/blob-data.mjs";
import { seedBlobFromGithub } from "./seed-blob.mjs";

const config = {
  userAgent: "RassvetOverUkraine/0.1 (test)",
  altitudeHistoryUrl: "https://example.invalid/altitude-history.json",
  reentriesUrl: "https://example.invalid/reentries.json",
  gpLatestUrl: "https://example.invalid/gp-latest.json",
};

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
}

describe("seed blob from the data branch", () => {
  it("writes all three files only after every download succeeds", async () => {
    const calls = [];
    const puts = [];
    const written = await seedBlobFromGithub({
      config,
      fetchImpl: async (url) => {
        calls.push(url);
        if (url.endsWith("altitude-history.json")) return jsonResponse(200, { rows: [] });
        if (url.endsWith("reentries.json")) return jsonResponse(200, '{"records":[]}\n');
        return jsonResponse(200, { v: 1, fetchedAt: "2026-10-27T00:00:00Z", objects: [] });
      },
      blob: {
        token: "test-token",
        put: async (pathname, body) => {
          puts.push({ pathname, body });
          return { url: `https://store.public.blob.vercel-storage.com/${pathname}` };
        },
      },
    });
    assert.deepEqual(calls, [config.altitudeHistoryUrl, config.reentriesUrl, config.gpLatestUrl]);
    assert.deepEqual(
      puts.map((put) => put.pathname),
      [BLOB_PATH.altitudeHistory, BLOB_PATH.reentries, BLOB_PATH.gpLatest],
    );
    assert.equal(puts[1].body, '{"records":[]}\n');
    assert.equal(
      written[0].url,
      "https://store.public.blob.vercel-storage.com/data/altitude-history.json",
    );
  });

  it("does not write when one data-branch file is missing", async () => {
    let puts = 0;
    await assert.rejects(
      () =>
        seedBlobFromGithub({
          config,
          fetchImpl: async (url) => {
            if (url.endsWith("reentries.json")) return jsonResponse(404, "missing");
            return jsonResponse(200, {});
          },
          blob: {
            token: "test-token",
            put: async () => {
              puts += 1;
              return { url: "https://example.invalid/nope" };
            },
          },
        }),
      /HTTP 404/,
    );
    assert.equal(puts, 0);
  });
});
