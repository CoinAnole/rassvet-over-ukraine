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

/** `<html lang>` for one router match. The address wins, then the cookie. */
export function langFromMatch(
  match: { search?: unknown; loaderData?: unknown } | undefined,
): Lang {
  const search = (match?.search ?? null) as { lang?: unknown } | null;
  const data = (match?.loaderData ?? null) as {
    profile?: { cookie?: unknown; acceptLanguage?: string | null };
  } | null;
  return resolveLang({
    urlLang: typeof search?.lang === "string" ? search.lang : null,
    cookie: typeof data?.profile?.cookie === "string" ? data.profile.cookie : null,
    acceptLanguage: data?.profile?.acceptLanguage ?? null,
  });
}

export function parseLangSearch(raw: Record<string, unknown>): { lang?: Lang } {
  if (raw.lang === "en" || raw.lang === "uk" || raw.lang === "ru") return { lang: raw.lang };
  return {};
}
