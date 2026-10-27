import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { persistLang, isLang, getDict, LANG_KEY } from "@/lib/i18n";
import { resolveLang } from "@/lib/i18n/resolve-lang";
import type { ProfileLang } from "@/lib/i18n/profile-lang";
import { dataFreshness, newestPropagatedEpoch } from "@/lib/catalog/freshness";
import { summarizeStale } from "@/lib/catalog/stale-summary";
import type { Lang, CatalogPayload } from "@/lib/catalog/types";
import { viewFromSearch, type ViewSearch } from "@/lib/view-state";

function fetchedLabel(catalog: CatalogPayload | undefined): string | null {
  if (!catalog?.fetchedAt) return null;
  return catalog.fetchedAt.replace("T", " ").replace("Z", "").slice(0, 16);
}

export function LangFrame({
  current,
  catalog,
  langParam,
  profile,
  search,
  children,
}: {
  current: "/" | "/constellation" | "/method";
  catalog: CatalogPayload;
  langParam?: string;
  profile: ProfileLang;
  search?: ViewSearch;
  children: (lang: Lang) => React.ReactNode;
}) {
  const navigate = useNavigate();
  const [picked, setPicked] = useState<Lang | null>(null);
  const lang = resolveLang({
    urlLang: current === "/" ? langParam : null,
    cookie: picked ?? profile.cookie,
    acceptLanguage: profile.acceptLanguage,
  });

  useEffect(() => {
    if (profile.cookie) return;
    const stored = window.localStorage.getItem(LANG_KEY);
    if (!isLang(stored)) return;
    persistLang(stored);
    if (current === "/" && isLang(langParam)) return;
    setPicked(stored);
  }, [current, langParam, profile.cookie]);

  const onLang = useCallback(
    (next: Lang) => {
      setPicked(next);
      persistLang(next);
      if (current === "/") {
        void navigate({
          to: "/",
          search: (prev: Record<string, unknown>) => ({
            ...prev,
            lang: next === "en" ? undefined : next,
          }),
          replace: true,
          resetScroll: false,
        });
      }
    },
    [navigate, current],
  );

  const t = getDict(lang);
  const coverage = search ? viewFromSearch(search, lang) : null;
  const cityLabel = coverage
    ? coverage.place === "custom"
      ? t.places.custom
      : t.places[coverage.place]
    : null;

  return (
    <AppShell
      lang={lang}
      onLang={onLang}
      fetchedAt={fetchedLabel(catalog)}
      newestEpoch={newestPropagatedEpoch(catalog)}
      source={catalog.source}
      freshness={dataFreshness(catalog)}
      stale={summarizeStale(catalog, {
        now: new Date(catalog.fetchedAt),
        set: coverage?.set ?? null,
      })}
      cityLabel={cityLabel}
      warning={catalog.source === "live" ? catalog.warning : null}
      current={current}
    >
      {children(lang)}
    </AppShell>
  );
}
