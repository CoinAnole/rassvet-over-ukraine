import { isLang } from "./index.ts";
import type { Lang } from "../catalog/types.ts";

export function langFromAcceptLanguage(acceptLanguage?: string | null): Lang {
  const header = (acceptLanguage ?? "").toLowerCase();
  if (header.includes("uk")) return "uk";
  if (header.includes("ru")) return "ru";
  return "en";
}

export function resolveLang(input: {
  urlLang?: string | null;
  cookie?: string | null;
  acceptLanguage?: string | null;
}): Lang {
  if (isLang(input.urlLang)) return input.urlLang;
  if (isLang(input.cookie)) return input.cookie;
  return langFromAcceptLanguage(input.acceptLanguage);
}
