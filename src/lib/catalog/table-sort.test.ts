import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { LiveObject, ObjectStatus } from "./types.ts";
import { nextColumnSort, nextConstellationSort, sortConstellationRows, sortPassRows } from "./table-sort.ts";
import type { PassSortRow } from "./table-sort.ts";

function row(partial: Partial<LiveObject> & { norad: number; name: string }): LiveObject {
  return {
    catalogName: partial.name,
    cospar: "2026-061A",
    group: "prod-2026-03",
    launchDate: "2026-03-23",
    omm: null,
    epoch: "2026-10-02T00:00:00.000000",
    status: "climbing",
    stale: false,
    approxAltitudeKm: 400,
    inclinationDeg: 82,
    periodMin: 95,
    perigeeKm: 390,
    apogeeKm: 410,
    elementSetCount: 1,
    climbKmPerDay: 1,
    decayDate: null,
    ...partial,
  };
}

const identity = (id: string) => id;

describe("constellation table sort", () => {
  it("leaves the catalog order alone until a header is chosen", () => {
    const rows = [row({ norad: 10, name: "RASSVET-3 10" }), row({ norad: 2, name: "RASSVET-3 2" })];
    assert.deepEqual(
      sortConstellationRows(rows, null, identity, "en").map((item) => item.norad),
      [10, 2],
    );
  });

  it("sorts names so RASSVET-3 2 comes before 10 in each language", () => {
    const rows = [
      row({ norad: 10, name: "RASSVET-3 10" }),
      row({ norad: 2, name: "RASSVET-3 2" }),
      row({ norad: 1, name: "Rassvet-1 No. 10" }),
      row({ norad: 3, name: "Rassvet-1 No. 2" }),
    ];
    for (const lang of ["en", "uk", "ru"] as const) {
      const names = sortConstellationRows(rows, { key: "name", dir: "asc" }, identity, lang).map(
        (item) => item.name,
      );
      assert.ok(names.indexOf("RASSVET-3 2") < names.indexOf("RASSVET-3 10"), lang);
      assert.ok(names.indexOf("Rassvet-1 No. 2") < names.indexOf("Rassvet-1 No. 10"), lang);
    }
    const desc = sortConstellationRows(rows, { key: "name", dir: "desc" }, identity, "en").map(
      (item) => item.name,
    );
    assert.ok(desc.indexOf("RASSVET-3 10") < desc.indexOf("RASSVET-3 2"));
  });

  it("orders status as climbing, raised, not climbing, then rate pending", () => {
    const statuses: ObjectStatus[] = [
      "decayed",
      "reentering",
      "stuck",
      "pending",
      "missing",
      "raised",
      "climbing",
    ];
    const rows = statuses.map((status, i) => row({ norad: i, name: status, status }));
    const asc = sortConstellationRows(rows, { key: "status", dir: "asc" }, identity, "en").map(
      (item) => item.status,
    );
    assert.deepEqual(asc, [
      "climbing",
      "raised",
      "stuck",
      "pending",
      "reentering",
      "decayed",
      "missing",
    ]);
    const desc = sortConstellationRows(rows, { key: "status", dir: "desc" }, identity, "uk").map(
      (item) => item.status,
    );
    assert.deepEqual(desc, [
      "missing",
      "decayed",
      "reentering",
      "pending",
      "stuck",
      "raised",
      "climbing",
    ]);
  });

  it("sorts altitude, perigee, apogee, and epoch numerically, with gaps last either way", () => {
    const rows = [
      row({
        norad: 1,
        name: "high",
        approxAltitudeKm: 500,
        perigeeKm: 490,
        apogeeKm: 510,
        epoch: "2026-10-10T00:00:00.000000",
      }),
      row({
        norad: 2,
        name: "low",
        approxAltitudeKm: 220,
        perigeeKm: null,
        apogeeKm: null,
        epoch: null,
      }),
      row({
        norad: 3,
        name: "mid",
        approxAltitudeKm: 340,
        perigeeKm: 330,
        apogeeKm: 350,
        epoch: "2026-10-02T12:00:00.000000",
      }),
    ];
    assert.deepEqual(
      sortConstellationRows(rows, { key: "alt", dir: "asc" }, identity, "en").map((item) => item.norad),
      [2, 3, 1],
    );
    assert.deepEqual(
      sortConstellationRows(rows, { key: "alt", dir: "desc" }, identity, "en").map((item) => item.norad),
      [1, 3, 2],
    );
    for (const key of ["perigee", "apogee"] as const) {
      assert.equal(
        sortConstellationRows(rows, { key, dir: "asc" }, identity, "ru").at(-1)?.norad,
        2,
      );
      assert.equal(
        sortConstellationRows(rows, { key, dir: "desc" }, identity, "ru").at(-1)?.norad,
        2,
      );
    }
    assert.deepEqual(
      sortConstellationRows(rows, { key: "epoch", dir: "asc" }, identity, "en").map((item) => item.norad),
      [3, 1, 2],
    );
    assert.deepEqual(
      sortConstellationRows(rows, { key: "epoch", dir: "desc" }, identity, "en").map(
        (item) => item.norad,
      ),
      [1, 3, 2],
    );
  });

  it("puts an unknown rate last when sorting up and when sorting down", () => {
    const rows = [
      row({ norad: 1, name: "up", climbKmPerDay: 5.9 }),
      row({ norad: 2, name: "none", climbKmPerDay: null }),
      row({ norad: 3, name: "down", climbKmPerDay: -3.8 }),
      row({ norad: 4, name: "slow", climbKmPerDay: 0.2 }),
    ];
    assert.deepEqual(
      sortConstellationRows(rows, { key: "rate", dir: "asc" }, identity, "en").map((item) => item.norad),
      [3, 4, 1, 2],
    );
    assert.deepEqual(
      sortConstellationRows(rows, { key: "rate", dir: "desc" }, identity, "en").map(
        (item) => item.norad,
      ),
      [1, 4, 3, 2],
    );
  });

  it("starts a column ascending and flips it on the next click", () => {
    assert.deepEqual(nextConstellationSort(null, "name"), { key: "name", dir: "asc" });
    assert.deepEqual(nextColumnSort(null, "aos"), { key: "aos", dir: "asc" });
    assert.deepEqual(nextConstellationSort({ key: "name", dir: "asc" }, "name"), {
      key: "name",
      dir: "desc",
    });
    assert.deepEqual(nextConstellationSort({ key: "name", dir: "desc" }, "alt"), {
      key: "alt",
      dir: "asc",
    });
  });
});

function pass(partial: Partial<PassSortRow> & { name: string; aos: number }): PassSortRow {
  return {
    group: "prod-2026-03",
    los: partial.aos + 10 * 60_000,
    maxElevationDeg: 25,
    altitudeKm: 500,
    status: "raised",
    ...partial,
  };
}

describe("pass list sort", () => {
  const rows: PassSortRow[] = [
    pass({
      name: "RASSVET-3 10",
      aos: 2_000,
      los: 2_000 + 8 * 60_000,
      maxElevationDeg: 12,
      altitudeKm: null,
      status: "stuck",
      group: "prod-2026-07",
    }),
    pass({
      name: "RASSVET-3 2",
      aos: 5_000,
      los: 5_000 + 20 * 60_000,
      maxElevationDeg: 40,
      altitudeKm: 510,
      status: "raised",
      group: "prod-2026-03",
    }),
    pass({
      name: "Rassvet-1 No. 2",
      aos: 1_000,
      los: 1_000 + 5 * 60_000,
      maxElevationDeg: 18,
      altitudeKm: 480,
      status: "climbing",
      group: "exp-2023",
    }),
  ];

  it("keeps acquisition order until a header is chosen, then again after the list is replaced", () => {
    assert.deepEqual(
      sortPassRows(rows, null, identity, "en").map((item) => item.name),
      ["RASSVET-3 10", "RASSVET-3 2", "Rassvet-1 No. 2"],
    );
    const sort = { key: "name" as const, dir: "asc" as const };
    const first = sortPassRows(rows, sort, identity, "en").map((item) => item.name);
    const refreshed = sortPassRows([...rows].reverse(), sort, identity, "uk");
    assert.deepEqual(first, refreshed.map((item) => item.name));
    assert.ok(first.indexOf("RASSVET-3 2") < first.indexOf("RASSVET-3 10"));
  });

  it("sorts AOS, LOS, duration, and max elevation as times and numbers", () => {
    assert.deepEqual(
      sortPassRows(rows, { key: "aos", dir: "asc" }, identity, "en").map((item) => item.aos),
      [1_000, 2_000, 5_000],
    );
    assert.deepEqual(
      sortPassRows(rows, { key: "aos", dir: "desc" }, identity, "ru").map((item) => item.aos),
      [5_000, 2_000, 1_000],
    );
    assert.deepEqual(
      sortPassRows(rows, { key: "los", dir: "asc" }, identity, "en").map((item) => item.name),
      ["Rassvet-1 No. 2", "RASSVET-3 10", "RASSVET-3 2"],
    );
    assert.deepEqual(
      sortPassRows(rows, { key: "duration", dir: "asc" }, identity, "en").map((item) => item.name),
      ["Rassvet-1 No. 2", "RASSVET-3 10", "RASSVET-3 2"],
    );
    assert.deepEqual(
      sortPassRows(rows, { key: "maxEl", dir: "desc" }, identity, "en").map((item) => item.name),
      ["RASSVET-3 2", "Rassvet-1 No. 2", "RASSVET-3 10"],
    );
  });

  it("sorts status in class order and leaves an unknown altitude last both ways", () => {
    assert.deepEqual(
      sortPassRows(rows, { key: "status", dir: "asc" }, identity, "en").map((item) => item.status),
      ["climbing", "raised", "stuck"],
    );
    assert.deepEqual(
      sortPassRows(rows, { key: "status", dir: "desc" }, identity, "uk").map((item) => item.status),
      ["stuck", "raised", "climbing"],
    );
    assert.equal(
      sortPassRows(rows, { key: "altitude", dir: "asc" }, identity, "en").at(-1)?.name,
      "RASSVET-3 10",
    );
    assert.equal(
      sortPassRows(rows, { key: "altitude", dir: "desc" }, identity, "ru").at(-1)?.name,
      "RASSVET-3 10",
    );
  });

  it("sorts the batch by its label in the active language", () => {
    const labels = (id: string) =>
      id === "exp-2023" ? "Experimental" : id === "prod-2026-03" ? "March" : "July";
    assert.deepEqual(
      sortPassRows(rows, { key: "batch", dir: "asc" }, labels, "en").map((item) => item.group),
      ["exp-2023", "prod-2026-07", "prod-2026-03"],
    );
  });
});
