import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BLOB_PATH } from "./blob-data.mjs";
import { loadCatalog } from "./fetch.server.ts";
import type { RemoteFileSource } from "./types.ts";

const NOW = new Date("2026-10-28T09:00:00Z");

function depsFor(source: RemoteFileSource) {
  const calls: string[] = [];
  return {
    calls,
    fetchGp: async () => null,
    readBlob: async (pathname: string) => {
      calls.push(`blob:${pathname}`);
      if (source === "blob" && pathname === BLOB_PATH.altitudeHistory) {
        return { ok: true as const, data: { v: 1, updated: NOW.toISOString(), rows: [] } };
      }
      if (source === "blob" && pathname === BLOB_PATH.reentries) {
        return { ok: true as const, data: { v: 1, records: [] } };
      }
      if (source === "blob" && pathname === BLOB_PATH.gpLatest) {
        return {
          ok: true as const,
          data: { v: 1, fetchedAt: "2026-10-27T00:00:00Z", objects: [] },
        };
      }
      return { ok: false as const, reason: "missing" as const };
    },
  };
}

describe("altitude history source", () => {
  for (const source of ["blob", "snapshot"] as const) {
    it(`reports historySource ${source}`, async () => {
      const deps = depsFor(source);
      const payload = await loadCatalog(NOW, deps);
      assert.equal(payload.historySource, source);
      assert.deepEqual(payload.sources, {
        history: source,
        reentries: source,
        gpLatest: source,
      });
      const text = JSON.stringify(payload);
      assert.equal(text.includes("BLOB_READ_WRITE_TOKEN"), false);
      assert.equal(text.includes("githubusercontent"), false);
      assert.equal(/error/i.test(payload.historySource), false);
    });
  }

  it("does not copy a failed Blob read into the catalog", async () => {
    const payload = await loadCatalog(NOW, {
      fetchGp: async () => null,
      readBlob: async () => ({ ok: false, reason: "unreachable", error: "token=secret store=abc" }),
    });
    assert.equal(payload.historySource, "snapshot");
    const text = JSON.stringify(payload);
    assert.equal(text.includes("secret"), false);
    assert.equal(text.includes("store=abc"), false);
  });
});
