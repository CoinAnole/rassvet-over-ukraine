import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BLOB_CACHE_SECONDS,
  BLOB_PATH,
  readBlobJson,
  writeBlobJson,
} from "../src/lib/catalog/blob-data.mjs";

function streamOf(text) {
  return new Response(text).body;
}

describe("blob documents", () => {
  it("names the stable public pathnames", () => {
    assert.deepEqual(BLOB_PATH, {
      altitudeHistory: "data/altitude-history.json",
      reentries: "data/reentries.json",
      gpLatest: "data/gp-latest.json",
    });
  });

  it("does not call Blob when the token is missing", async () => {
    let called = false;
    const result = await readBlobJson(BLOB_PATH.gpLatest, {
      token: null,
      get: async () => {
        called = true;
        return null;
      },
    });
    assert.equal(called, false);
    assert.deepEqual(result, { ok: false, reason: "unconfigured" });
  });

  it("treats a 404 as missing and a thrown read as unreachable", async () => {
    const missing = await readBlobJson("data/gp-latest.json", {
      token: "test-token",
      get: async () => null,
    });
    assert.deepEqual(missing, { ok: false, reason: "missing" });
    const down = await readBlobJson("data/gp-latest.json", {
      token: "test-token",
      get: async () => {
        throw new Error("HTTP 500");
      },
    });
    assert.equal(down.ok, false);
    if (down.ok) return;
    assert.equal(down.reason, "unreachable");
    assert.match(down.error, /HTTP 500/);
  });

  it("parses a public blob body", async () => {
    const result = await readBlobJson(BLOB_PATH.altitudeHistory, {
      token: "test-token",
      get: async (pathname, options) => {
        assert.equal(pathname, BLOB_PATH.altitudeHistory);
        assert.equal(options.access, "public");
        assert.equal(options.token, "test-token");
        return { statusCode: 200, stream: streamOf('{"rows":[]}\n') };
      },
    });
    assert.deepEqual(result, { ok: true, data: { rows: [] } });
  });

  it("writes a public blob at a stable pathname", async () => {
    /** @type {unknown[]} */
    const calls = [];
    const blob = await writeBlobJson(
      BLOB_PATH.reentries,
      { records: [] },
      {
        token: "test-token",
        put: async (pathname, body, options) => {
          calls.push({ pathname, body, options });
          return { url: `https://example.public.blob.vercel-storage.com/${pathname}` };
        },
      },
    );
    assert.equal(blob.url, "https://example.public.blob.vercel-storage.com/data/reentries.json");
    assert.equal(calls[0].pathname, BLOB_PATH.reentries);
    assert.equal(calls[0].body, '{"records":[]}\n');
    assert.equal(calls[0].options.access, "public");
    assert.equal(calls[0].options.addRandomSuffix, false);
    assert.equal(calls[0].options.allowOverwrite, true);
    assert.equal(calls[0].options.cacheControlMaxAge, BLOB_CACHE_SECONDS);
    assert.equal(calls[0].options.token, "test-token");
  });

  it("refuses to write without a token", async () => {
    await assert.rejects(
      () => writeBlobJson(BLOB_PATH.gpLatest, "{}", { token: null }),
      /BLOB_READ_WRITE_TOKEN/,
    );
  });
});
