import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCatalog, indexOmms } from "./build.ts";
import { dataFreshness, onOrbitStaleCount } from "./freshness.ts";
import { ageParts, staleObjectRole, summarizeStale, type StaleSummary } from "./stale-summary.ts";
import { staleBannerLine } from "../i18n/stale.ts";
import { getDict } from "../i18n/index.ts";
import type { CatalogOmm, Lang } from "./types.ts";

const now = new Date("2026-10-11T12:00:00Z");
const HIGH = 15.184;
const LOW = 15.65;

function omm(norad: number, epoch: string, meanMotion: number): CatalogOmm {
  return {
    OBJECT_NAME: "STALE-SUMMARY",
    OBJECT_ID: "2026-061A",
    EPOCH: epoch,
    MEAN_MOTION: meanMotion,
    ECCENTRICITY: 0.0002,
    INCLINATION: 82.3,
    RA_OF_ASC_NODE: 10,
    ARG_OF_PERICENTER: 20,
    MEAN_ANOMALY: 30,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: "U",
    NORAD_CAT_ID: norad,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 1,
    BSTAR: 0,
    MEAN_MOTION_DOT: 0,
    MEAN_MOTION_DDOT: 0,
  };
}

function catalog(rows: CatalogOmm[], source: "live" | "seed" = "live") {
  return buildCatalog({
    omms: indexOmms(rows),
    fetchedAt: now.toISOString(),
    source,
    warning: null,
    now,
  });
}

function lineOf(count: number, inSetCount: number, usedDefaultSet: boolean, lang: Lang): string {
  const summary: StaleSummary = {
    objects: [],
    count,
    inSetCount,
    quiet: count > 0 && inSetCount === 0,
    set: "prod-raised",
    usedDefaultSet,
  };
  return staleBannerLine(lang, summary);
}

describe("stale summary", () => {
  const mixed = catalog([
    omm(57179, "2026-10-07T08:00:00.000000", HIGH),
    omm(68370, "2026-10-07T18:00:00.000000", LOW),
    omm(68360, "2026-10-08T04:00:00.000000", HIGH),
    omm(68373, "2026-10-08T11:00:00.000000", LOW),
    omm(68362, "2026-10-08T12:00:00.000000", HIGH),
    omm(68361, "2026-10-11T06:00:00.000000", HIGH),
  ]);

  it("keeps the 72 hour gate: exactly 72 hours is not stale, and ages are whole days and hours", () => {
    const summary = summarizeStale(mixed, { now, set: "prod-raised" });
    assert.deepEqual(
      summary.objects.map((obj) => obj.norad),
      [57179, 68370, 68360, 68373],
    );
    assert.equal(summary.count, onOrbitStaleCount(mixed));
    const by = (norad: number) => summary.objects.find((obj) => obj.norad === norad);
    assert.deepEqual(
      [by(57179)?.ageDays, by(57179)?.ageHoursPart],
      [4, 4],
    );
    assert.deepEqual(
      [by(68370)?.ageDays, by(68370)?.ageHoursPart],
      [3, 18],
    );
    assert.deepEqual(
      [by(68360)?.ageDays, by(68360)?.ageHoursPart],
      [3, 8],
    );
    assert.deepEqual(
      [by(68373)?.ageDays, by(68373)?.ageHoursPart],
      [3, 1],
    );
    assert.equal(ageParts(72.9).days, 3);
    assert.equal(ageParts(72.9).hours, 0);
  });

  it("names the role and whether the object is in the selected coverage set", () => {
    const summary = summarizeStale(mixed, { now, set: "prod-raised" });
    const by = (norad: number) => {
      const obj = summary.objects.find((row) => row.norad === norad);
      assert.ok(obj);
      return obj;
    };
    assert.equal(by(57179).role, "experimental-raised");
    assert.equal(by(57179).inCoverageSet, false);
    assert.equal(by(68360).role, "production-raised");
    assert.equal(by(68360).inCoverageSet, true);
    assert.equal(by(68360).name, "RASSVET-3 1");
    assert.equal(by(68370).role, "climbing");
    assert.equal(by(68370).inCoverageSet, false);
    assert.equal(by(68373).role, "not-climbing");
    assert.equal(by(68373).inCoverageSet, false);
    assert.equal(summary.inSetCount, 1);
    assert.equal(summary.quiet, false);
    assert.equal(summary.usedDefaultSet, false);
    assert.equal(summary.set, "prod-raised");
  });

  it("stays quiet when no stale object is in the default raised-production set", () => {
    const experimental = catalog([omm(57179, "2026-10-07T08:00:00.000000", HIGH)]);
    const chosen = summarizeStale(experimental, { now, set: "prod-raised" });
    assert.equal(chosen.quiet, true);
    assert.equal(chosen.inSetCount, 0);
    assert.equal(chosen.usedDefaultSet, false);
    assert.equal(
      staleBannerLine("en", chosen),
      "1 element set is older than 72 hours. It is not in this coverage set.",
    );

    const implicit = summarizeStale(experimental, { now, set: null });
    assert.equal(implicit.quiet, true);
    assert.equal(implicit.set, "prod-raised");
    assert.equal(implicit.usedDefaultSet, true);
    assert.equal(
      staleBannerLine("en", implicit),
      "1 element set is older than 72 hours. It is not in the default raised-production set.",
    );
  });

  it("alarms when the selected set includes the stale object", () => {
    const experimental = catalog([omm(57179, "2026-10-07T08:00:00.000000", HIGH)]);
    const raised = summarizeStale(experimental, { now, set: "raised" });
    assert.equal(raised.quiet, false);
    assert.equal(raised.inSetCount, 1);
    assert.equal(
      staleBannerLine("en", raised),
      "1 element set older than 72 hours is in this coverage set.",
    );

    const group = summarizeStale(mixed, { now, set: "prod-2026-03" });
    assert.deepEqual(
      group.objects.filter((obj) => obj.inCoverageSet).map((obj) => obj.norad),
      [68370, 68360, 68373],
    );
    assert.equal(group.inSetCount, 3);
    assert.equal(group.quiet, false);

    const all = summarizeStale(mixed, { now, set: "all" });
    assert.equal(all.inSetCount, all.count);
    assert.equal(
      staleBannerLine("en", all),
      "4 element sets older than 72 hours are in this coverage set.",
    );
  });

  it("leaves a manually decayed id out even when its element set is old", () => {
    const withDecayed = catalog([
      omm(68363, "2026-10-01T00:00:00.000000", LOW),
      omm(57179, "2026-10-07T08:00:00.000000", HIGH),
    ]);
    const summary = summarizeStale(withDecayed, { now, set: "all" });
    assert.deepEqual(
      summary.objects.map((obj) => obj.norad),
      [57179],
    );
  });

  it("does not turn a failed live fetch into the live stale note", () => {
    const snapshot = catalog([omm(68360, "2026-10-08T04:00:00.000000", HIGH)], "seed");
    assert.equal(dataFreshness(snapshot).kind, "seed");
    assert.ok(summarizeStale(snapshot, { now, set: "prod-raised" }).count > 0);
  });

  it("labels experimental climbing and not-climbing, and decayed, without a coverage row", () => {
    assert.equal(staleObjectRole({ status: "climbing", group: "exp-2024" }), "experimental-climbing");
    assert.equal(
      staleObjectRole({ status: "stuck", group: "exp-2023" }),
      "experimental-not-climbing",
    );
    assert.equal(staleObjectRole({ status: "raised", group: "exp-2024" }), "experimental-raised");
    assert.equal(staleObjectRole({ status: "decayed", group: "prod-2026-03" }), "decayed");
    assert.equal(staleObjectRole({ status: "missing", group: "prod-2026-07" }), "missing");
  });
});

describe("stale banner line", () => {
  it("states the count and whether any are in the set, in each language", () => {
    assert.equal(
      lineOf(2, 0, false, "en"),
      "2 element sets are older than 72 hours. None are in this coverage set.",
    );
    assert.equal(
      lineOf(4, 1, false, "en"),
      "4 element sets are older than 72 hours. 1 is in this coverage set.",
    );
    assert.equal(
      lineOf(4, 2, false, "en"),
      "4 element sets are older than 72 hours. 2 are in this coverage set.",
    );
    assert.equal(
      lineOf(2, 0, true, "en"),
      "2 element sets are older than 72 hours. None are in the default raised-production set.",
    );

    assert.equal(
      lineOf(1, 0, false, "uk"),
      "1 набір елементів старіший за 72 години. Він не входить у цей набір покриття.",
    );
    assert.equal(
      lineOf(2, 0, false, "uk"),
      "Є 2 набори елементів, старіших за 72 години. Жоден не входить у цей набір покриття.",
    );
    assert.equal(
      lineOf(5, 0, false, "uk"),
      "Є 5 наборів елементів, старіших за 72 години. Жоден не входить у цей набір покриття.",
    );
    assert.equal(
      lineOf(2, 2, false, "uk"),
      "Є 2 набори елементів, старіших за 72 години. Усі вони входять у цей набір покриття.",
    );
    assert.equal(
      lineOf(5, 1, true, "uk"),
      "Є 5 наборів елементів, старіших за 72 години. 1 входить у типовий набір піднятих серійних.",
    );

    assert.equal(
      lineOf(1, 0, false, "ru"),
      "1 набор элементов старше 72 часов. Он не входит в этот набор покрытия.",
    );
    assert.equal(
      lineOf(2, 0, false, "ru"),
      "2 набора элементов старше 72 часов. Ни один не входит в этот набор покрытия.",
    );
    assert.equal(
      lineOf(5, 0, false, "ru"),
      "5 наборов элементов старше 72 часов. Ни один не входит в этот набор покрытия.",
    );
    assert.equal(
      lineOf(1, 1, false, "ru"),
      "1 набор элементов старше 72 часов, и он входит в этот набор покрытия.",
    );
    assert.equal(
      lineOf(5, 1, true, "ru"),
      "5 наборов элементов старше 72 часов. 1 входит в набор по умолчанию (поднятые серийные).",
    );
  });

  it("explains element sets without inventing a kilometres figure", () => {
    const roles = [
      "production-raised",
      "experimental-raised",
      "climbing",
      "experimental-climbing",
      "not-climbing",
      "experimental-not-climbing",
      "decayed",
      "missing",
    ] as const;
    for (const lang of ["en", "uk", "ru"] as const) {
      const freshness = getDict(lang).freshness;
      for (const role of roles) assert.ok(freshness.roles[role], `${lang} ${role}`);
      const blob = [
        freshness.what,
        freshness.why,
        freshness.accuracy,
        freshness.doQuiet,
        freshness.doAlarm,
        freshness.doQuietDefault,
        freshness.doAlarmDefault,
      ].join(" ");
      assert.equal(/\d+\s*(km|км)/i.test(blob), false, lang);
      assert.match(freshness.accuracy, lang === "en" ? /kilometres/ : /кілометр|километр/);
      assert.match(freshness.why, /CelesTrak/);
      assert.match(
        freshness.what,
        lang === "en" ? /element set/i : lang === "uk" ? /набір елементів/i : /набор элементов/i,
      );
      assert.ok(freshness.methodLink.length > 0);
    }
  });
});
