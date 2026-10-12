import en from "../../config/i18n/en.json" with { type: "json" };
import uk from "../../config/i18n/uk.json" with { type: "json" };
import ru from "../../config/i18n/ru.json" with { type: "json" };
import type { Lang } from "../catalog/types.ts";
import type { PlaceId } from "../orbit/constants.ts";

export const DICTS = { en, uk, ru } as const;
export type Dict = typeof en;

/** Every preset place, plus the custom point, must have a label in each language. */
type PlaceLabels = Record<PlaceId | "custom", string>;
const _placeLabels = {
  en: en.places,
  uk: uk.places,
  ru: ru.places,
} satisfies Record<Lang, PlaceLabels>;

export const LANG_KEY = "rassvet-lang";

export function isLang(v: unknown): v is Lang {
  return v === "en" || v === "uk" || v === "ru";
}

export function persistLang(lang: Lang) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANG_KEY, lang);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LANG_KEY}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function getDict(lang: Lang): Dict {
  return DICTS[lang] as Dict;
}

export function slavicPlural(n: number, one: string, few: string, many: string): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

export function windowWord(lang: Lang, n: number): string {
  const d = getDict(lang) as Dict & { windowWordFew?: string };
  if (lang === "en") return n === 1 ? d.windowWordOne : d.windowWordMany;
  return slavicPlural(n, d.windowWordOne, d.windowWordFew ?? d.windowWordMany, d.windowWordMany);
}

export function coverageSentence(
  lang: Lang,
  args: { el: number; place: string; windows: number; minutes: number; day?: string },
): string {
  const d = getDict(lang);
  const template = args.day ? d.sentenceHeld : d.sentence;
  return template
    .replaceAll("{el}", String(args.el))
    .replaceAll("{place}", args.place)
    .replaceAll("{n}", String(args.windows))
    .replaceAll("{windows}", windowWord(lang, args.windows))
    .replaceAll("{minutes}", String(args.minutes))
    .replaceAll("{day}", args.day ?? "");
}

export function groupLabel(lang: Lang, groupId: string, fallback: string): string {
  const d = getDict(lang);
  const key = groupId as keyof typeof d.population;
  return d.population[key] ?? fallback;
}
