import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BLOB_PATH } from "../src/lib/catalog/blob-data.mjs";
import { loadRemoteJson } from "../src/lib/catalog/remote-json.mjs";

describe("remote catalog files", () => {
  it("uses Blob when the public copy is present", async () => {
    const loaded = await loadRemoteJson({
      pathname: BLOB_PATH.gpLatest,
      readBlob: async () => ({
        ok: true,
        data: { fetchedAt: "2026-10-27T00:00:00Z", objects: [{}] },
      }),
    });
    assert.equal(loaded.source, "blob");
    assert.equal(loaded.data.fetchedAt, "2026-10-27T00:00:00Z");
  });

  it("reports snapshot when Blob is unconfigured, missing, or unreachable", async () => {
    for (const reason of ["unconfigured", "missing", "unreachable"]) {
      const loaded = await loadRemoteJson({
        pathname: BLOB_PATH.altitudeHistory,
        readBlob: async () => ({ ok: false, reason }),
      });
      assert.equal(loaded.source, "snapshot");
      assert.equal(loaded.data, null);
    }
  });
});
