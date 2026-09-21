import en from "../../config/i18n/en.json" with { type: "json" };
import uk from "../../config/i18n/uk.json" with { type: "json" };
import ru from "../../config/i18n/ru.json" with { type: "json" };
import type { Lang } from "../catalog/types.ts";

export const DICTS = { en, uk, ru } as const;
export type Dict = typeof en;

const STORAGE_KEY = "rassvet-lang";

export function isLang(v: unknown): v is Lang {
  return v === "en" || v === "uk" || v === "ru";
}

export function detectLang(override?: string | null, acceptLanguage?: string | null): Lang {
  if (isLang(override)) return override;
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) return stored;
    const nav = window.navigator.language.toLowerCase();
    if (nav.startsWith("uk")) return "uk";
    if (nav.startsWith("ru")) return "ru";
  }
  const al = (acceptLanguage ?? "").toLowerCase();
  if (al.includes("uk")) return "uk";
  if (al.includes("ru")) return "ru";
  return "en";
}

export function persistLang(lang: Lang) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, lang);
}

export function getDict(lang: Lang): Dict {
  return DICTS[lang] as Dict;
}

function slavicPlural(n: number, one: string, few: string, many: string): string {
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
  args: { el: number; place: string; windows: number; minutes: number },
): string {
  const d = getDict(lang);
  return d.sentence
    .replaceAll("{el}", String(args.el))
    .replaceAll("{place}", args.place)
    .replaceAll("{n}", String(args.windows))
    .replaceAll("{windows}", windowWord(lang, args.windows))
    .replaceAll("{minutes}", String(args.minutes));
}

export function groupLabel(lang: Lang, groupId: string, fallback: string): string {
  const d = getDict(lang);
  const key = groupId as keyof typeof d.population;
  return d.population[key] ?? fallback;
}
