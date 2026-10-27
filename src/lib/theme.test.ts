import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseTheme,
  themeAttribute,
  themeFromCookieHeader,
  themeKeyAction,
} from "./theme.ts";

describe("theme resolution", () => {
  it("treats a missing or unknown cookie as system", () => {
    assert.equal(parseTheme(undefined), "system");
    assert.equal(parseTheme("auto"), "system");
    assert.equal(themeFromCookieHeader(null), "system");
    assert.equal(themeFromCookieHeader("rassvet-lang=uk"), "system");
    assert.equal(themeAttribute("system"), undefined);
  });

  it("lets an explicit light or dark cookie win over system", () => {
    assert.equal(themeFromCookieHeader("rassvet-theme=light"), "light");
    assert.equal(themeFromCookieHeader("rassvet-lang=uk; rassvet-theme=dark"), "dark");
    assert.equal(themeAttribute("light"), "light");
    assert.equal(themeAttribute("dark"), "dark");
  });
});

describe("theme control keyboard", () => {
  it("moves System, Light, and Dark with arrows, Home, and End", () => {
    assert.equal(themeKeyAction("ArrowRight", "system"), "light");
    assert.equal(themeKeyAction("ArrowDown", "light"), "dark");
    assert.equal(themeKeyAction("ArrowRight", "dark"), "system");
    assert.equal(themeKeyAction("ArrowLeft", "system"), "dark");
    assert.equal(themeKeyAction("ArrowUp", "dark"), "light");
    assert.equal(themeKeyAction("Home", "dark"), "system");
    assert.equal(themeKeyAction("End", "system"), "dark");
    assert.equal(themeKeyAction("Tab", "light"), null);
  });
});
