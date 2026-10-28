import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BLOB_PATH } from "./blob-data.mjs";
import { loadCatalog } from "./fetch.server.ts";
import type { RemoteFileSource } from "./types.ts";

const NOW = new Date("2026-10-28T09:00:00Z");

function githubResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

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
      return { ok: false as const, reason: "missing" as const };
    },
    fetchImpl: async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(`github:${url}`);
      if (source === "snapshot") return githubResponse(null, 404);
      if (url.includes("altitude-history.json")) {
        return githubResponse({ v: 1, updated: NOW.toISOString(), rows: [] });
      }
      if (url.includes("reentries.json")) return githubResponse({ v: 1, records: [] });
      return githubResponse({
        v: 1,
        fetchedAt: "2026-10-27T00:00:00Z",
        objects: [{ NORAD_CAT_ID: 1, EPOCH: "2026-10-27T00:00:00Z" }],
      });
    },
  };
}

describe("altitude history source", () => {
  for (const source of ["blob", "github", "snapshot"] as const) {
    it(`reports historySource ${source}`, async () => {
      const deps = depsFor(source);
      const payload = await loadCatalog(NOW, deps);
      assert.equal(payload.historySource, source);
      assert.equal(payload.sources.history, source);
      if (source === "blob") {
        assert.equal(payload.sources.reentries, "github");
        assert.equal(payload.sources.gpLatest, "github");
        assert.equal(
          deps.calls.some(
            (call) => call.startsWith("github:") && call.includes("altitude-history.json"),
          ),
          false,
        );
      }
      if (source === "github") {
        assert.equal(payload.sources.reentries, "github");
        assert.equal(payload.sources.gpLatest, "github");
        assert.equal(
          deps.calls.some(
            (call) => call.startsWith("github:") && call.includes("altitude-history.json"),
          ),
          true,
        );
      }
      if (source === "snapshot") {
        assert.deepEqual(payload.sources, {
          history: "snapshot",
          reentries: "snapshot",
          gpLatest: "snapshot",
        });
      }
      const text = JSON.stringify(payload);
      assert.equal(text.includes("BLOB_READ_WRITE_TOKEN"), false);
      assert.equal(text.includes("public.blob.vercel-storage.com"), false);
      assert.equal(/error/i.test(payload.historySource), false);
    });
  }

  it("does not copy a failed fetch message into the catalog", async () => {
    const payload = await loadCatalog(NOW, {
      fetchGp: async () => null,
      readBlob: async () => ({ ok: false, reason: "unreachable", error: "token=secret store=abc" }),
      fetchImpl: async () => {
        throw new Error("token=secret store=abc");
      },
    });
    assert.equal(payload.historySource, "snapshot");
    const text = JSON.stringify(payload);
    assert.equal(text.includes("secret"), false);
    assert.equal(text.includes("store=abc"), false);
  });
});
