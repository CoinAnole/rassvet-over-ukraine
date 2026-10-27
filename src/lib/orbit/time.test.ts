import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatCivilDay, formatDayClock } from "./time.ts";

const instant = new Date("2026-10-27T12:00:00Z");

describe("locale dates", () => {
  it("formats the same instant in the UI language", () => {
    const en = formatDayClock(instant, "UTC", "en");
    const uk = formatDayClock(instant, "UTC", "uk");
    const ru = formatDayClock(instant, "UTC", "ru");
    assert.match(en, /Oct/);
    assert.match(uk, /жовт/i);
    assert.match(ru, /окт/i);
    assert.notEqual(uk, en);
    assert.notEqual(ru, en);
    assert.match(formatCivilDay(instant, "UTC", "uk"), /2026/);
    assert.match(formatCivilDay(instant, "UTC", "uk"), /жовт/i);
    assert.match(formatCivilDay(instant, "UTC", "en"), /Oct/);
  });
});
