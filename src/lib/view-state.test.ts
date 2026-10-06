import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultStringifySearch } from "@tanstack/router-core";
import { getDict } from "./i18n/index.ts";
import { CLOCK_WINDOW_MS, formatClockOffset } from "./orbit/clock.ts";
import { PLACES } from "./orbit/constants.ts";
import {
  canonicalSearch,
  clockHoursFromOffsetMs,
  defaultView,
  heldFromClockHours,
  parseClockHours,
  searchFromView,
  shareSearchString,
  shareUrl,
  viewFromSearch,
  viewSearchEqual,
  type ViewState,
} from "./view-state.ts";

const wall = Date.parse("2026-10-06T12:00:00Z");

describe("short view query", () => {
  it("omits every default, including a live clock", () => {
    const view = defaultView("en");
    assert.deepEqual(searchFromView(view, 0), {});
    assert.equal(shareSearchString({}), "");
    assert.deepEqual(viewFromSearch({}, "en"), view);
  });

  it("keeps a named place and non-default elevation, set, zone, and language", () => {
    const view: ViewState = {
      ...defaultView("uk"),
      place: "odesa",
      lat: PLACES.find((p) => p.id === "odesa")!.lat,
      lon: PLACES.find((p) => p.id === "odesa")!.lon,
      el: 10,
      set: "all",
      tz: "utc",
    };
    const search = searchFromView(view, 0);
    assert.deepEqual(search, {
      place: "odesa",
      el: 10,
      set: "all",
      tz: "utc",
      lang: "uk",
    });
    assert.equal(shareSearchString(search), "?place=odesa&el=10&set=all&tz=utc&lang=uk");
    assert.deepEqual(viewFromSearch(search, "en"), view);
  });

  it("writes lat/lon for a custom point and place=custom only when it would snap to a preset", () => {
    const custom: ViewState = {
      ...defaultView(),
      place: "custom",
      lat: 49.123456,
      lon: 32.987654,
    };
    const search = searchFromView(custom, 0);
    assert.deepEqual(search, { lat: 49.1235, lon: 32.9877 });
    const back = viewFromSearch(search, "en");
    assert.equal(back.place, "custom");
    assert.equal(back.lat, 49.1235);
    assert.equal(back.lon, 32.9877);

    const nearKyiv: ViewState = { ...defaultView(), place: "custom", lat: 50.45, lon: 30.52 };
    assert.equal(searchFromView(nearKyiv).place, "custom");
    const kept = viewFromSearch(searchFromView(nearKyiv), "en");
    assert.equal(kept.place, "custom");
    assert.equal(kept.lat, 50.45);
    assert.equal(kept.lon, 30.52);
  });

  it("drops noisy defaults and does not inject a detected language", () => {
    const incoming = {
      place: "kyiv" as const,
      lat: 50.4501,
      lon: 30.5234,
      el: 25,
      set: "operational" as const,
      tz: "kyiv" as const,
      lang: "en" as const,
    };
    const view = viewFromSearch(incoming, "uk");
    assert.equal(view.lang, "en");
    assert.equal(view.set, "raised");
    assert.deepEqual(canonicalSearch(incoming, view, 0), {});

    const detected = viewFromSearch({}, "uk");
    assert.equal(detected.lang, "uk");
    assert.deepEqual(canonicalSearch({}, detected, 0), {});
    assert.deepEqual(canonicalSearch({ lang: "uk" }, detected, 0), { lang: "uk" });
  });
});

describe("held clock query", () => {
  it("parses a relative hour offset and treats zero or junk as live", () => {
    assert.equal(parseClockHours("-21"), -21);
    assert.equal(parseClockHours(-21.5), -21.5);
    assert.equal(parseClockHours(0), undefined);
    assert.equal(parseClockHours("0"), undefined);
    assert.equal(parseClockHours("nope"), undefined);
    assert.equal(parseClockHours(""), undefined);
    assert.equal(heldFromClockHours(undefined, wall), null);
    assert.equal(heldFromClockHours(0, wall), null);
  });

  it("round-trips every minute inside ±48 h onto the same offset label", () => {
    for (let minutes = -48 * 60; minutes <= 48 * 60; minutes += 1) {
      const offsetMs = minutes * 60_000;
      const encoded = clockHoursFromOffsetMs(offsetMs);
      if (minutes === 0) {
        assert.equal(encoded, undefined);
        assert.equal(searchFromView(defaultView(), offsetMs).h, undefined);
        continue;
      }
      assert.ok(encoded != null);
      const held = heldFromClockHours(encoded, wall);
      assert.ok(held);
      assert.equal(held.clamped, false);
      assert.equal(formatClockOffset(held.at - held.wall), formatClockOffset(offsetMs));
      const search = searchFromView(defaultView(), offsetMs);
      assert.equal(search.h, encoded);
      assert.equal(viewFromSearch(search, "en").place, "kyiv");
    }
  });

  it("keeps an out-of-range h so the next open still clamps", () => {
    const held = heldFromClockHours(72, wall);
    assert.ok(held);
    assert.equal(held.clamped, true);
    assert.equal(held.at, wall + CLOCK_WINDOW_MS);
    const view = defaultView();
    const search = canonicalSearch({ h: 72 }, view, held.at - held.wall);
    assert.deepEqual(search, { h: 72 });
    assert.equal(shareSearchString(search), "?h=72");

    const past = heldFromClockHours(-100, wall);
    assert.ok(past);
    assert.equal(past.clamped, true);
    assert.equal(past.at, wall - CLOCK_WINDOW_MS);
    assert.equal(canonicalSearch({ h: -100 }, view, past.at - past.wall).h, -100);
  });

  it("replaces the authored clock once the scrubber leaves the clamped edge", () => {
    const view = defaultView();
    const moved = canonicalSearch(
      { h: 72, place: "lviv" },
      { ...view, place: "lviv" },
      -5 * 3_600_000,
    );
    assert.deepEqual(moved, { place: "lviv", h: -5 });
  });

  it("matches the query string the router writes", () => {
    const view: ViewState = {
      ...defaultView("ru"),
      place: "lviv",
      el: 40,
      tz: "moscow",
      set: "climbing",
    };
    const search = searchFromView(view, -90 * 60_000);
    assert.equal(defaultStringifySearch(search), shareSearchString(search));
    assert.equal(defaultStringifySearch({}), shareSearchString({}));
  });

  it("builds an absolute share URL without a clock param while live", () => {
    const href = shareUrl("https://rassvet-over-ukraine.vercel.app", "/", { el: 40 });
    assert.equal(href, "https://rassvet-over-ukraine.vercel.app/?el=40");
    assert.equal(viewSearchEqual({ el: 40 }, { el: 40, h: undefined }), true);
    assert.equal(viewSearchEqual({ h: -21 }, { h: -5 }), false);
  });
});

describe("share copy", () => {
  it("has copy, copied, and share strings in EN, UK, and RU", () => {
    for (const lang of ["en", "uk", "ru"] as const) {
      const share = getDict(lang).share;
      assert.ok(share.copy.length > 0);
      assert.ok(share.copied.length > 0);
      assert.ok(share.share.length > 0);
      assert.ok(share.hint.length > 0);
    }
  });
});
