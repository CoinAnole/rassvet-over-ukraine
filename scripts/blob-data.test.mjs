import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BlobPreconditionFailedError } from "@vercel/blob";
import {
  BLOB_CACHE_SECONDS,
  BLOB_PATH,
  blobPublicBase,
  blobStoreIdFromToken,
  readBlobJson,
  writeBlobJson,
} from "../src/lib/catalog/blob-data.mjs";
import { blobDataStore } from "./record-altitude-history.mjs";

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

  it("reads a store id from the read-write token", () => {
    assert.equal(blobStoreIdFromToken("vercel_blob_rw_store123_secret"), "store123");
    assert.equal(blobStoreIdFromToken("nope"), null);
    assert.equal(
      blobPublicBase({ BLOB_STORE_ID: "store123" }),
      "https://store123.public.blob.vercel-storage.com",
    );
  });

  it("fetches the public URL and does not send a token", async () => {
    const calls = [];
    const result = await readBlobJson(BLOB_PATH.gpLatest, {
      token: null,
      publicBase: "https://store.public.blob.vercel-storage.com",
      fetchImpl: async (url, init) => {
        calls.push({
          url,
          authorization: init.headers.authorization ?? init.headers.Authorization ?? null,
        });
        return { ok: true, status: 200, json: async () => ({ rows: [] }) };
      },
    });
    assert.deepEqual(result, { ok: true, data: { rows: [] }, etag: null });
    assert.equal(calls[0].url, "https://store.public.blob.vercel-storage.com/data/gp-latest.json");
    assert.equal(calls[0].authorization, null);
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
    assert.deepEqual(result, { ok: true, data: { rows: [] }, etag: null });
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

  it("keeps a normal read on the public URL when a token is also available", async () => {
    let headed = false;
    const calls = [];
    const result = await readBlobJson(BLOB_PATH.gpLatest, {
      token: "vercel_blob_rw_storeABC_test",
      publicBase: "https://storeABC.public.blob.vercel-storage.com",
      fetchImpl: async (url, init) => {
        calls.push({
          url: String(url),
          cache: init.cache ?? null,
          authorization: init.headers.authorization ?? null,
        });
        return { ok: true, status: 200, json: async () => ({ rows: [] }) };
      },
      head: async () => {
        headed = true;
        return { etag: "sdk-etag" };
      },
    });
    assert.equal(headed, false);
    assert.equal(
      calls[0].url,
      "https://storeABC.public.blob.vercel-storage.com/data/gp-latest.json",
    );
    assert.equal(calls[0].cache, null);
    assert.equal(calls[0].authorization, null);
    assert.deepEqual(result, { ok: true, data: { rows: [] }, etag: null });
  });

  it("bypasses the public cache when useCache is false", async () => {
    const calls = [];
    const result = await readBlobJson(BLOB_PATH.altitudeHistory, {
      token: null,
      publicBase: "https://store.public.blob.vercel-storage.com",
      useCache: false,
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), cache: init.cache });
        return {
          ok: true,
          status: 200,
          headers: { get: (name) => (name === "etag" ? '"cdn-etag"' : null) },
          json: async () => ({ rows: [] }),
        };
      },
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].cache, "no-store");
    assert.match(
      calls[0].url,
      /^https:\/\/store\.public\.blob\.vercel-storage\.com\/data\/altitude-history\.json\?t=\d+$/,
    );
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.etag, '"cdn-etag"');
  });

  it("passes the Blob API etag to put, not the CDN header", async () => {
    /** @type {unknown[]} */
    const puts = [];
    const store = blobDataStore({
      readBlobJson: (pathname, options) =>
        readBlobJson(pathname, {
          ...options,
          token: "vercel_blob_rw_storeABC_test",
          publicBase: "https://storeABC.public.blob.vercel-storage.com",
          fetchImpl: async (url, init) => {
            assert.equal(init.cache, "no-store");
            assert.match(String(url), /\?t=\d+$/);
            return {
              ok: true,
              status: 200,
              headers: { get: (name) => (name === "etag" ? '"cdn-etag"' : null) },
              json: async () => ({ v: 1, updated: "2026-11-28T00:00:00.000Z", rows: [] }),
            };
          },
          head: async (pathname, headOptions) => {
            assert.equal(pathname, BLOB_PATH.altitudeHistory);
            assert.equal(headOptions.token, "vercel_blob_rw_storeABC_test");
            return { etag: "sdk-etag" };
          },
        }),
      writeBlobJson: (pathname, value, options) =>
        writeBlobJson(pathname, value, {
          token: "test-token",
          ...options,
          put: async (putPath, _body, putOptions) => {
            puts.push({ putPath, ifMatch: putOptions.ifMatch });
            return { url: `https://example.public.blob.vercel-storage.com/${putPath}` };
          },
        }),
    });
    const rows = await store.readHistory();
    assert.deepEqual(rows, []);
    await store.writeHistory({ v: 1, updated: "2026-11-28T00:00:00.000Z", rows: [] });
    assert.deepEqual(puts, [{ putPath: BLOB_PATH.altitudeHistory, ifMatch: "sdk-etag" }]);
  });

  it("writes a missing object without ifMatch", async () => {
    /** @type {unknown[]} */
    const puts = [];
    const store = blobDataStore({
      readBlobJson: async () => ({ ok: false, reason: "missing", etag: null }),
      writeBlobJson: (pathname, value, options) =>
        writeBlobJson(pathname, value, {
          token: "test-token",
          ...options,
          put: async (_pathname, _body, putOptions) => {
            puts.push(putOptions.ifMatch);
            return {
              url: "https://example.public.blob.vercel-storage.com/data/altitude-history.json",
            };
          },
        }),
    });
    assert.deepEqual(await store.readHistory(), []);
    await store.writeHistory({ v: 1, updated: "2026-11-28T00:00:00.000Z", rows: [] });
    assert.deepEqual(puts, [undefined]);
  });

  it("turns the SDK precondition error into BLOB_CONFLICT", async () => {
    await assert.rejects(
      () =>
        writeBlobJson(
          BLOB_PATH.altitudeHistory,
          { rows: [] },
          {
            token: "test-token",
            ifMatch: "sdk-etag",
            put: async () => {
              throw new BlobPreconditionFailedError();
            },
          },
        ),
      (err) => {
        assert.equal(err instanceof Error, true);
        assert.equal(err.name, "Error");
        assert.equal(err.code, "BLOB_CONFLICT");
        assert.match(err.message, /another recorder run/);
        assert.equal(String(err.message).includes("test-token"), false);
        return true;
      },
    );
  });
});
