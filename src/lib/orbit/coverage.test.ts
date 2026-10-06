import { describe, it } from "node:test";
import assert from "node:assert/strict";
import seed from "../../data/catalog-seed.json" with { type: "json" };
import { unionIntervals, unionMinutes, clipIntervals } from "./union.ts";
import { CITY_STRIP, PLACES } from "./constants.ts";
import { DICTS, coverageSentence, getDict } from "../i18n/index.ts";
import { methodSections } from "../i18n/method.ts";
import { buildCatalog, indexOmms } from "../catalog/build.ts";
import { computeCoverage, inPopulation } from "./coverage.ts";
import {
  CLOCK_WINDOW_MS,
  clampToClockWindow,
  formatClockOffset,
  holdFromHours,
  holdFromTarget,
  passInForwardWindow,
  PASS_HORIZON_MS,
} from "./clock.ts";
import { formatCivilInput, parseCivilInput, zonedDayBounds } from "./time.ts";
import {
  footprintRing,
  maxLonJump,
  ringIsDrawable,
  ringLonSpan,
  splitAntimeridianRing,
} from "./footprint.ts";
import { orbitFromOmm } from "./kepler.ts";
import { json2satrec, propagate } from "./satellite-js.ts";
import type { CatalogOmm } from "../catalog/types.ts";

describe("preset places", () => {
  it("lists Lviv on the city strip and Vinnytsia in the picker only", () => {
    const ids = PLACES.map((p) => p.id);
    assert.ok(ids.includes("lviv"));
    assert.ok(ids.includes("vinnytsia"));
    assert.deepEqual(
      CITY_STRIP.filter((id) => id === "lviv" || id === "vinnytsia"),
      ["lviv"],
    );

    const lviv = PLACES.find((p) => p.id === "lviv");
    const vinnytsia = PLACES.find((p) => p.id === "vinnytsia");
    assert.ok(lviv);
    assert.ok(vinnytsia);
    assert.equal(lviv.lat, 49.8397);
    assert.equal(lviv.lon, 24.0297);
    assert.equal(vinnytsia.lat, 49.2331);
    assert.equal(vinnytsia.lon, 28.4682);

    assert.equal(DICTS.en.places.lviv, "Lviv");
    assert.equal(DICTS.en.places.vinnytsia, "Vinnytsia");
    assert.equal(DICTS.uk.places.lviv, "Львів");
    assert.equal(DICTS.uk.places.vinnytsia, "Вінниця");
    assert.equal(DICTS.ru.places.lviv, "Львов");
    assert.equal(DICTS.ru.places.vinnytsia, "Винница");

    for (const id of ids) {
      for (const dict of [DICTS.en, DICTS.uk, DICTS.ru]) {
        assert.equal(typeof dict.places[id], "string");
        assert.ok(dict.places[id].length > 0);
      }
    }
  });
});

describe("union minutes", () => {
  it("counts overlapping passes once", () => {
    const t0 = Date.parse("2026-09-20T00:00:00Z");
    const a = { start: t0, end: t0 + 10 * 60_000, objects: [1] };
    const b = { start: t0 + 5 * 60_000, end: t0 + 12 * 60_000, objects: [2] };
    const unioned = unionIntervals([a, b]);
    assert.equal(unioned.length, 1);
    assert.equal(unionMinutes(unioned), 12);
    const sum = unionMinutes([a, b]);
    assert.ok(unionMinutes(unioned) < sum);
  });

  it("clips to the local day", () => {
    const t0 = Date.parse("2026-09-20T00:00:00Z");
    const iv = { start: t0 - 5 * 60_000, end: t0 + 10 * 60_000, objects: [1] };
    const clipped = clipIntervals([iv], t0, t0 + 24 * 3600_000);
    assert.equal(unionMinutes(clipped), 10);
  });
});

describe("caveat sentence snapshot", () => {
  it("matches the English fixture", () => {
    const s = coverageSentence("en", {
      el: 25,
      place: "Kyiv",
      windows: 2,
      minutes: 47,
    });
    assert.equal(
      s,
      "At 25° minimum elevation over Kyiv, the current catalog produces 2 windows today totalling 47 minutes. This is geometric line-of-sight from public orbit data, not proof that a terminal can attach, that capacity exists, or that inter-satellite links are on.",
    );
  });

  it("uses the singular window word", () => {
    const s = coverageSentence("en", { el: 40, place: "Odesa", windows: 1, minutes: 8 });
    assert.match(s, /produces 1 window today/);
  });
});

describe("decayed and stale classification", () => {
  it("excludes the manual decayed NORAD from raised/all populations", () => {
    const catalog = buildCatalog({
      omms: indexOmms([]),
      fetchedAt: "2026-09-20T00:00:00Z",
      source: "seed",
      warning: null,
      now: new Date("2026-09-20T12:00:00Z"),
    });
    const decayed = catalog.objects.find((o) => o.norad === 68363);
    assert.ok(decayed);
    assert.equal(decayed.status, "decayed");
    assert.equal(inPopulation(decayed, "all"), false);
    assert.equal(inPopulation(decayed, "raised"), false);
  });

  it("flags a TLE aged 80 hours as stale", () => {
    const now = new Date("2026-09-20T12:00:00Z");
    const omm: CatalogOmm = {
      OBJECT_NAME: "STALE-TEST",
      OBJECT_ID: "2026-061A",
      EPOCH: "2026-09-17T04:00:00.000000",
      MEAN_MOTION: 15.184,
      ECCENTRICITY: 0.0002,
      INCLINATION: 82.3,
      RA_OF_ASC_NODE: 10,
      ARG_OF_PERICENTER: 20,
      MEAN_ANOMALY: 30,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: "U",
      NORAD_CAT_ID: 68360,
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 1,
      BSTAR: 0,
      MEAN_MOTION_DOT: 0,
      MEAN_MOTION_DDOT: 0,
    };
    const catalog = buildCatalog({
      omms: indexOmms([omm]),
      fetchedAt: now.toISOString(),
      source: "seed",
      warning: null,
      now,
    });
    const obj = catalog.objects.find((o) => o.norad === 68360);
    assert.ok(obj?.stale);
  });
});

describe("altitude gate", () => {
  it("treats a ~500 km object as raised and a ~350 km object as climbing", () => {
    const raised = orbitFromOmm({ MEAN_MOTION: 15.184, ECCENTRICITY: 0.0002, INCLINATION: 82.3 });
    const climbing = orbitFromOmm({ MEAN_MOTION: 15.65, ECCENTRICITY: 0.0005, INCLINATION: 82.3 });
    assert.ok(raised.approxAltitudeKm >= 480, `raised ${raised.approxAltitudeKm}`);
    assert.ok(climbing.approxAltitudeKm < 480, `climbing ${climbing.approxAltitudeKm}`);
  });
});

describe("synthetic high-inclination object", () => {
  it("propagates a ~500 km, ~97 min, high-inclination satrec", () => {
    const omm: CatalogOmm = {
      OBJECT_NAME: "SYNTH-KYIV",
      OBJECT_ID: "1998-067A",
      EPOCH: "2026-09-20T12:00:00.000000",
      MEAN_MOTION: 15.184,
      ECCENTRICITY: 0.0002,
      INCLINATION: 82.3,
      RA_OF_ASC_NODE: 0,
      ARG_OF_PERICENTER: 0,
      MEAN_ANOMALY: 0,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: "U",
      NORAD_CAT_ID: 99999,
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 1,
      BSTAR: 0,
      MEAN_MOTION_DOT: 0,
      MEAN_MOTION_DDOT: 0,
    };
    const rec = json2satrec(omm);
    const pv = propagate(rec, new Date("2026-09-20T12:00:00Z"));
    assert.ok(pv && pv.position);
    const pos = pv.position;
    const r = Math.hypot(pos.x, pos.y, pos.z);
    assert.ok(r > 6800 && r < 7000, `radius ${r}`);
  });
});

describe("short-range clock", () => {
  const wall = Date.parse("2026-09-20T10:00:00Z");

  it("clamps targets outside ±48 hours and keeps in-range instants", () => {
    const inside = clampToClockWindow(wall - 47 * 3_600_000, wall);
    assert.equal(inside.clamped, false);
    assert.equal(inside.at, wall - 47 * 3_600_000);

    const past = clampToClockWindow(wall - 72 * 3_600_000, wall);
    assert.equal(past.clamped, true);
    assert.equal(past.at, wall - CLOCK_WINDOW_MS);

    const future = clampToClockWindow(wall + 49 * 3_600_000, wall);
    assert.equal(future.clamped, true);
    assert.equal(future.at, wall + CLOCK_WINDOW_MS);
  });

  it("treats a zero-hour scrub as live and holds a non-zero offset", () => {
    assert.equal(holdFromHours(0, wall), null);
    const held = holdFromHours(-21, wall);
    assert.ok(held);
    assert.equal(held.at, wall - 21 * 3_600_000);
    assert.equal(held.clamped, false);
    assert.equal(formatClockOffset(held.at - held.wall), "−21 h");
  });

  it("reads yesterday 13:00 Kyiv as 10:00 UTC and clamps a week earlier", () => {
    const yesterday13 = parseCivilInput("2026-09-19T13:00", "Europe/Kyiv");
    assert.ok(yesterday13);
    assert.equal(yesterday13.toISOString(), "2026-09-19T10:00:00.000Z");
    assert.equal(formatCivilInput(yesterday13, "Europe/Kyiv"), "2026-09-19T13:00");

    const hold = holdFromTarget(yesterday13.getTime(), wall);
    assert.ok(hold);
    assert.equal(hold.clamped, false);

    const weekAgo = parseCivilInput("2026-09-13T13:00", "Europe/Kyiv");
    assert.ok(weekAgo);
    const clamped = holdFromTarget(weekAgo.getTime(), wall);
    assert.ok(clamped);
    assert.equal(clamped.clamped, true);
    assert.equal(clamped.at, wall - CLOCK_WINDOW_MS);
  });

  it("keeps a forward pass and drops one that already ended or starts after 36 h", () => {
    assert.equal(passInForwardWindow(wall - 60_000, wall + 60_000, wall), true);
    assert.equal(passInForwardWindow(wall + 3_600_000, wall + 3_700_000, wall), true);
    assert.equal(passInForwardWindow(wall - 120_000, wall - 1, wall), false);
    assert.equal(
      passInForwardWindow(wall + PASS_HORIZON_MS, wall + PASS_HORIZON_MS + 60_000, wall),
      false,
    );
  });
});

describe("coverage follows the injected clock", () => {
  const kyiv = { lat: 50.4501, lon: 30.5234 };

  function catalogAt(now: Date) {
    return buildCatalog({
      omms: indexOmms(seed.objects),
      fetchedAt: "2026-09-20T12:32:36Z",
      source: "seed",
      warning: null,
      now,
    });
  }

  it("bounds today and the pass list to the selected instant, not a fixed wall day", () => {
    const live = new Date("2026-09-20T10:00:00Z");
    const yesterday = new Date("2026-09-19T10:00:00Z");
    const catalog = catalogAt(live);
    const opts = {
      catalog,
      lat: kyiv.lat,
      lon: kyiv.lon,
      minElevationDeg: 10,
      filter: "all" as const,
      tz: "kyiv" as const,
    };
    const atLive = computeCoverage({ ...opts, now: live });
    const atYesterday = computeCoverage({ ...opts, now: yesterday });

    for (const [now, result] of [
      [live, atLive],
      [yesterday, atYesterday],
    ] as const) {
      const day = zonedDayBounds(now, "Europe/Kyiv");
      for (const w of result.windowsToday) {
        assert.ok(w.start >= day.start.getTime() - 1);
        assert.ok(w.end <= day.end.getTime() + 1);
      }
      for (const row of result.passes36h) {
        assert.equal(passInForwardWindow(row.aos, row.los, now.getTime()), true);
      }
      if (result.next.state === "later") {
        assert.equal(result.next.inMs, result.next.aos - now.getTime());
        assert.ok(result.next.inMs > 0);
      }
      if (result.next.state === "open") {
        assert.equal(result.next.remainingMs, result.next.los - now.getTime());
      }
    }

    const liveDay = zonedDayBounds(live, "Europe/Kyiv").start.getTime();
    const yDay = zonedDayBounds(yesterday, "Europe/Kyiv").start.getTime();
    assert.equal(liveDay - yDay, 24 * 3_600_000);
    assert.ok(atLive.passes36h.length > 0, "expected passes over Kyiv in the seed snapshot");
    assert.ok(atYesterday.passes36h.length > 0);
    const liveFirst = atLive.passes36h[0].aos;
    const yFirst = atYesterday.passes36h[0].aos;
    assert.notEqual(liveFirst, yFirst);
  });

  it("uses the Moscow calendar day when that day differs from Kyiv", () => {
    const now = new Date("2026-01-15T21:30:00Z");
    const catalog = catalogAt(now);
    const base = {
      catalog,
      lat: kyiv.lat,
      lon: kyiv.lon,
      minElevationDeg: 25,
      filter: "raised" as const,
      now,
    };
    const kyivDay = zonedDayBounds(now, "Europe/Kyiv");
    const moscowDay = zonedDayBounds(now, "Europe/Moscow");
    assert.notEqual(kyivDay.start.getTime(), moscowDay.start.getTime());
    const inKyiv = computeCoverage({ ...base, tz: "kyiv" });
    const inMoscow = computeCoverage({ ...base, tz: "moscow" });
    for (const w of inKyiv.windowsToday) {
      assert.ok(w.end <= kyivDay.end.getTime() + 1);
      assert.ok(w.start >= kyivDay.start.getTime() - 1);
    }
    for (const w of inMoscow.windowsToday) {
      assert.ok(w.end <= moscowDay.end.getTime() + 1);
      assert.ok(w.start >= moscowDay.start.getTime() - 1);
    }
  });
});

describe("clock copy", () => {
  it("has the held-clock strings in EN, UK, and RU", () => {
    for (const lang of ["en", "uk", "ru"] as const) {
      const d = getDict(lang);
      assert.ok(d.clock.notLive.length > 0);
      assert.ok(d.clock.returnLive.length > 0);
      assert.match(d.clock.banner, /\{when\}/);
      assert.match(d.clock.banner, /\{offset\}/);
      assert.ok(d.passList.titleHeld.length > 0);
      assert.ok(d.sentenceHeld.includes("{day}"));
      const method = methodSections(lang)
        .flatMap((s) => [s.heading, ...s.paragraphs])
        .join("\n");
      assert.match(method, /48/);
      assert.match(method, /GP/);
    }
  });
});

describe("timezone day bounds", () => {
  it("puts Kyiv midnight ahead of UTC", () => {
    const noonUtc = new Date("2026-09-20T12:00:00Z");
    const { start, end } = zonedDayBounds(noonUtc, "Europe/Kyiv");
    assert.equal(start.toISOString(), "2026-09-19T21:00:00.000Z");
    assert.equal(end.toISOString(), "2026-09-20T21:00:00.000Z");
  });
});

describe("footprint antimeridian split", () => {
  it("keeps a Ukraine-local ring as one drawable polygon", () => {
    const ring = footprintRing(50.45, 30.52, 500, 25);
    assert.equal(ringIsDrawable(ring), true);
    const parts = splitAntimeridianRing(ring);
    assert.equal(parts.length, 1);
    assert.equal(ringIsDrawable(parts[0]), true);
    assert.ok(ringLonSpan(parts[0]) < 40);
  });

  it("does not hand Leaflet a world-spanning band near ±180", () => {
    const ring = footprintRing(48, 179.5, 800, 25);
    // Raw normalized coordinates jump across the date line — that is the bug.
    assert.ok(maxLonJump(ring) > 180 || ringLonSpan(ring) >= 180);
    const parts = splitAntimeridianRing(ring);
    assert.ok(parts.length >= 1);
    for (const part of parts) {
      assert.equal(ringIsDrawable(part), true);
      assert.ok(maxLonJump(part) < 180, `jump ${maxLonJump(part)}`);
      assert.ok(ringLonSpan(part) < 180, `span ${ringLonSpan(part)}`);
    }
  });

  it("drops a polar wrap instead of filling a latitude band", () => {
    const ring = footprintRing(88, 30, 800, 10);
    const parts = splitAntimeridianRing(ring);
    assert.equal(parts.length, 0);
  });
});
