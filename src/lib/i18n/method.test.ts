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

  it("names the default production set and rate pending in each language", () => {
    const en = methodSections("en").find((s) => s.heading === "Which satellites count");
    assert.ok(en);
    const enText = en.paragraphs.join(" ");
    assert.match(enText, /production RASSVET-3/);
    assert.match(enText, /Rassvet-1/);
    assert.match(enText, /set=raised/);
    assert.match(enText, /least-squares/);
    assert.match(enText, /36 hours/);
    assert.match(enText, /up to five days/);
    assert.match(enText, /0\.8 km\/day/);
    assert.match(enText, /mean-motion derivative/);
    assert.match(enText, /rate pending/);
    assert.match(enText, /more than three days behind/);
    assert.equal(enText.includes("manual not-climbing list"), false);
    assert.equal(enText.includes("findrassvet.ru"), false);
    assert.equal(enText.includes("does not keep altitude history"), false);

    const uk = methodSections("uk").find((s) => s.heading === "Які супутники входять у рахунок");
    assert.ok(uk);
    const ukText = uk.paragraphs.join(" ");
    assert.match(ukText, /найменших квадратів/);
    assert.match(ukText, /36 годин/);
    assert.match(ukText, /п’яти діб/);
    assert.match(ukText, /0\.8 км\/добу/);
    assert.match(ukText, /RASSVET-3/);
    assert.match(ukText, /не піднімається/);
    assert.match(ukText, /темп очікується/);
    assert.match(ukText, /три доби/);
    assert.equal(ukText.includes("findrassvet.ru"), false);

    const ru = methodSections("ru").find((s) => s.heading === "Какие спутники входят в счёт");
    assert.ok(ru);
    const ruText = ru.paragraphs.join(" ");
    assert.match(ruText, /наименьших квадратов/);
    assert.match(ruText, /36 часов/);
    assert.match(ruText, /пяти суток/);
    assert.match(ruText, /0\.8 км\/сут/);
    assert.match(ruText, /не поднимается/);
    assert.match(ruText, /темп ожидается/);
    assert.match(ruText, /трое суток/);
    assert.equal(ruText.includes("findrassvet.ru"), false);
  });

  it("describes the Brouwer altitude and the 450 km gate without a Kepler proxy", () => {
    const en = methodSections("en");
    const enText = en.flatMap((s) => [s.heading, ...s.paragraphs]).join("\n");
    assert.match(enText, /Why 450 km is the Raised gate/);
    assert.match(enText, /Brouwer mean semi-major axis/);
    assert.match(enText, /6378\.135/);
    assert.match(enText, /398600\.8/);
    assert.match(enText, /findrassvet\.ru \(V\. Bulybenko\)/);
    assert.match(enText, /We adapted the method/);
    assert.match(enText, /did not copy their text/);
    assert.match(enText, /https:\/\/creativecommons\.org\/licenses\/by\/4\.0\//);
    assert.match(enText, /800 km/);
    assert.equal(enText.includes("480"), false);
    assert.equal(/minus 6371/.test(enText), false);
    assert.equal(/Kepler/i.test(enText), false);
    assert.match(enText, /ellipsoidal \(WGS-84\) observer position/);
    assert.match(enText, /every coverage window and minute/);
    assert.match(enText, /look angles/);
    assert.match(enText, /footprint rings drawn on the map/);
    assert.match(enText, /pre-filter/);
    assert.match(enText, /spherical small-circle formula with Re = 6371 km/);
    assert.equal(/Elevation and footprints use a spherical Earth/.test(enText), false);

    const uk = methodSections("uk")
      .flatMap((s) => [s.heading, ...s.paragraphs])
      .join("\n");
    assert.match(uk, /Брауера/);
    assert.match(uk, /6378\.135/);
    assert.match(uk, /адаптували метод/);
    assert.match(uk, /не копіювали їхній текст/);
    assert.match(uk, /еліпсоїді WGS-84/);
    assert.match(uk, /сферичного малого кола з Re = 6371 км/);
    assert.equal(/зони видимості використовують сферичну Землю/.test(uk), false);
    assert.equal(uk.includes("480"), false);

    const ru = methodSections("ru")
      .flatMap((s) => [s.heading, ...s.paragraphs])
      .join("\n");
    assert.match(ru, /Брауэра/);
    assert.match(ru, /6378\.135/);
    assert.match(ru, /адаптировали метод/);
    assert.match(ru, /не копировали их текст/);
    assert.match(ru, /эллипсоиде WGS-84/);
    assert.match(ru, /сферической малой окружности с Re = 6371 км/);
    assert.equal(/зоны видимости используют сферическую Землю/.test(ru), false);
    assert.equal(ru.includes("480"), false);
  });
});
