import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { methodSections } from "./method.ts";

const removed = [
  "Unofficial status",
  "Неофіційний статус",
  "Неофициальный статус",
  "What this site will never show",
  "Чого цей сайт ніколи не покаже",
  "Чего этот сайт никогда не покажет",
];

describe("method copy", () => {
  it("keeps removed disclaimer sections out", () => {
    for (const lang of ["en", "uk", "ru"] as const) {
      const headings = methodSections(lang).map((s) => s.heading);
      for (const heading of removed) {
        assert.equal(headings.includes(heading), false, heading);
      }
    }
  });

  it("states geometric line-of-sight and the four exclusions in each language", () => {
    const en = methodSections("en").find((s) => s.heading === "Geometric line-of-sight only");
    assert.ok(en);
    const enText = [...en.paragraphs, ...(en.bullets ?? [])].join(" ");
    assert.match(enText, /geometric line-of-sight/i);
    assert.match(enText, /Never linked/);
    assert.match(enText, /Never encrypted/);
    assert.match(enText, /Never military-ready/);
    assert.match(enText, /Never 24-hour service/);

    const uk = methodSections("uk").find((s) => s.heading === "Лише геометрична пряма видимість");
    assert.ok(uk);
    const ukText = [...uk.paragraphs, ...(uk.bullets ?? [])].join(" ");
    assert.match(ukText, /геометричн/);
    assert.match(ukText, /зв’язок/);
    assert.match(ukText, /шифруван/);
    assert.match(ukText, /військов/);
    assert.match(ukText, /цілодобов/);

    const ru = methodSections("ru").find(
      (s) => s.heading === "Только геометрическая прямая видимость",
    );
    assert.ok(ru);
    const ruText = [...ru.paragraphs, ...(ru.bullets ?? [])].join(" ");
    assert.match(ruText, /геометрическ/);
    assert.match(ruText, /связь/);
    assert.match(ruText, /шифрован/);
    assert.match(ruText, /военн/);
    assert.match(ruText, /круглосуточн/);
  });
});
