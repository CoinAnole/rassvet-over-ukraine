import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BLOB_PATH } from "../src/lib/catalog/blob-data.mjs";
import { loadRemoteJson } from "../src/lib/catalog/remote-json.mjs";

const GITHUB = "https://raw.githubusercontent.com/example/data/gp-latest.json";

function githubFetch(body, calls) {
  return async (url) => {
    calls.push(url);
    return {
      ok: body != null,
      status: body != null ? 200 : 404,
      json: async () => body,
    };
  };
}

describe("remote catalog files", () => {
  it("uses Blob and does not fetch GitHub when the blob is present", async () => {
    const calls = [];
    const loaded = await loadRemoteJson({
      pathname: BLOB_PATH.gpLatest,
      githubUrl: GITHUB,
      userAgent: "test",
      readBlob: async () => ({
        ok: true,
        data: { fetchedAt: "2026-10-27T00:00:00Z", objects: [{}] },
      }),
      fetchImpl: githubFetch(null, calls),
    });
    assert.equal(loaded.source, "blob");
    assert.equal(loaded.data.fetchedAt, "2026-10-27T00:00:00Z");
    assert.deepEqual(calls, []);
  });

  it("falls back to GitHub when Blob is unconfigured, missing, or unreachable", async () => {
    for (const reason of ["unconfigured", "missing", "unreachable"]) {
      const calls = [];
      const loaded = await loadRemoteJson({
        pathname: BLOB_PATH.altitudeHistory,
        githubUrl: GITHUB,
        userAgent: "test",
        readBlob: async () => ({ ok: false, reason }),
        fetchImpl: githubFetch({ rows: [1] }, calls),
      });
      assert.equal(loaded.source, "github");
      assert.deepEqual(loaded.data, { rows: [1] });
      assert.deepEqual(calls, [GITHUB]);
    }
  });

  it("returns null when Blob and GitHub both fail", async () => {
    const loaded = await loadRemoteJson({
      pathname: BLOB_PATH.reentries,
      githubUrl: GITHUB,
      userAgent: "test",
      readBlob: async () => ({ ok: false, reason: "unreachable" }),
      fetchImpl: githubFetch(null, []),
    });
    assert.equal(loaded.source, "snapshot");
    assert.equal(loaded.data, null);
  });
});
