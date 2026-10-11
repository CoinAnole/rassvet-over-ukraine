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

  it("keeps a stable anchor on the stale-element-set section", () => {
    assert.equal(
      methodSections("en").find((s) => s.heading === "Stale element sets")?.id,
      "stale-element-sets",
    );
    assert.equal(
      methodSections("uk").find((s) => s.heading === "Застарілі набори елементів")?.id,
      "stale-element-sets",
    );
    assert.equal(
      methodSections("ru").find((s) => s.heading === "Устаревшие наборы элементов")?.id,
      "stale-element-sets",
    );
  });

  it("names the default production set, the not-climbing list, and the CC BY source in each language", () => {
    const en = methodSections("en").find((s) => s.heading === "Which satellites count");
    assert.ok(en);
    const enText = en.paragraphs.join(" ");
    assert.match(enText, /production RASSVET-3/);
    assert.match(enText, /Rassvet-1/);
    assert.match(enText, /set=raised/);
    assert.match(enText, /RASSVET-3 11 is not on the list/);
    assert.match(enText, /RASSVET-3 14, 17, and 23/);
    assert.match(enText, /findrassvet\.ru \(V\. Bulybenko\)/);
    assert.match(enText, /CC BY 4\.0/);
    assert.equal(/RASSVET-3 11.{0,40}fail/i.test(enText), false);

    const uk = methodSections("uk").find((s) => s.heading === "Які супутники входять у рахунок");
    assert.ok(uk);
    const ukText = uk.paragraphs.join(" ");
    assert.match(ukText, /RASSVET-3/);
    assert.match(ukText, /не піднімається/);
    assert.match(ukText, /RASSVET-3 11 у списку немає/);
    assert.match(ukText, /findrassvet\.ru/);
    assert.match(ukText, /CC BY 4\.0/);

    const ru = methodSections("ru").find((s) => s.heading === "Какие спутники входят в счёт");
    assert.ok(ru);
    const ruText = ru.paragraphs.join(" ");
    assert.match(ruText, /не поднимается/);
    assert.match(ruText, /RASSVET-3 11 в списке нет/);
    assert.match(ruText, /findrassvet\.ru/);
    assert.match(ruText, /CC BY 4\.0/);
  });
});
