import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultStringifySearch } from "@tanstack/router-core";
import { getDict } from "./i18n/index.ts";
import { CLOCK_WINDOW_MS, formatClockOffset } from "./orbit/clock.ts";
import { PLACES } from "./orbit/constants.ts";
import {
  canonicalSearch,
  defaultView,
  heldFromClockInstant,
  parseClockInstant,
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
    assert.deepEqual(searchFromView(view, null), {});
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
    const search = searchFromView(view, null);
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
    const search = searchFromView(custom, null);
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
    assert.deepEqual(canonicalSearch(incoming, view, null), {});

    const detected = viewFromSearch({}, "uk");
    assert.equal(detected.lang, "uk");
    assert.deepEqual(canonicalSearch({}, detected, null), {});
    assert.deepEqual(canonicalSearch({ lang: "uk" }, detected, null), { lang: "uk" });
  });
});

describe("held clock query", () => {
  it("parses an absolute UTC instant and treats junk as live", () => {
    assert.equal(parseClockInstant("2026-10-05T15:00:00.000Z"), "2026-10-05T15:00:00.000Z");
    assert.equal(parseClockInstant("2026-10-05T18:00:00+03:00"), "2026-10-05T15:00:00.000Z");
    assert.equal(parseClockInstant("2026-10-05T15:00:00Z"), "2026-10-05T15:00:00.000Z");
    assert.equal(parseClockInstant("nope"), undefined);
    assert.equal(parseClockInstant(""), undefined);
    assert.equal(parseClockInstant(21), undefined);
    assert.equal(heldFromClockInstant(undefined, wall), null);
    assert.equal(heldFromClockInstant(new Date(wall).toISOString(), wall), null);
  });

  it("round-trips every minute inside ±48 h onto the same instant", () => {
    for (let minutes = -48 * 60; minutes <= 48 * 60; minutes += 1) {
      const atMs = wall + minutes * 60_000;
      if (minutes === 0) {
        assert.equal(searchFromView(defaultView(), null).at, undefined);
        assert.equal(heldFromClockInstant(new Date(atMs).toISOString(), wall), null);
        continue;
      }
      const iso = new Date(atMs).toISOString();
      const held = heldFromClockInstant(iso, wall);
      assert.ok(held);
      assert.equal(held.clamped, false);
      assert.equal(held.at, atMs);
      assert.equal(formatClockOffset(held.at - held.wall), formatClockOffset(minutes * 60_000));
      const search = searchFromView(defaultView(), atMs);
      assert.equal(search.at, iso);
      const again = canonicalSearch({ at: iso }, defaultView(), { at: atMs, wall });
      assert.equal(again.at, iso);
    }
  });

  it("clamps an instant outside ±48 h and keeps that at so a refresh still clamps", () => {
    const future = new Date(wall + 72 * 3_600_000).toISOString();
    const held = heldFromClockInstant(future, wall);
    assert.ok(held);
    assert.equal(held.clamped, true);
    assert.equal(held.at, wall + CLOCK_WINDOW_MS);
    const view = defaultView();
    const search = canonicalSearch({ at: future }, view, { at: held.at, wall: held.wall });
    assert.equal(search.at, future);
    assert.equal(new URLSearchParams(shareSearchString(search).slice(1)).get("at"), future);

    const pastIso = new Date(wall - 100 * 3_600_000).toISOString();
    const past = heldFromClockInstant(pastIso, wall);
    assert.ok(past);
    assert.equal(past.clamped, true);
    assert.equal(past.at, wall - CLOCK_WINDOW_MS);
    assert.equal(
      canonicalSearch({ at: pastIso }, view, { at: past.at, wall: past.wall }).at,
      pastIso,
    );
  });

  it("replaces the authored instant once the scrubber leaves the clamped edge", () => {
    const view = defaultView();
    const future = new Date(wall + 72 * 3_600_000).toISOString();
    const movedAt = wall - 5 * 3_600_000;
    const moved = canonicalSearch(
      { at: future, place: "lviv" },
      { ...view, place: "lviv" },
      {
        at: movedAt,
        wall,
      },
    );
    assert.deepEqual(moved, { place: "lviv", at: new Date(movedAt).toISOString() });
  });

  it("matches the query string the router writes", () => {
    const view: ViewState = {
      ...defaultView("ru"),
      place: "lviv",
      el: 40,
      tz: "moscow",
      set: "climbing",
    };
    const atMs = wall - 90 * 60_000;
    const search = searchFromView(view, atMs);
    assert.equal(defaultStringifySearch(search), shareSearchString(search));
    assert.equal(defaultStringifySearch({}), shareSearchString({}));
    assert.equal(search.at, new Date(atMs).toISOString());
  });

  it("builds a share URL without a clock param while live", () => {
    const href = shareUrl("https://rassvet-over-ukraine.vercel.app", "/", { el: 40 });
    assert.equal(href, "https://rassvet-over-ukraine.vercel.app/?el=40");
    assert.equal(viewSearchEqual({ el: 40 }, { el: 40, at: undefined }), true);
    const a = new Date(wall - 21 * 3_600_000).toISOString();
    const b = new Date(wall - 5 * 3_600_000).toISOString();
    assert.equal(viewSearchEqual({ at: a }, { at: b }), false);
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
