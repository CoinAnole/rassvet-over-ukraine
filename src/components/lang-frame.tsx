import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useDocumentLang } from "@/components/document-lang";
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

function langQuery(next: Lang): Lang | undefined {
  return next === "en" ? undefined : next;
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
  const documentLang = useDocumentLang();
  const [picked, setPicked] = useState<Lang | null>(null);
  const lang = resolveLang({
    urlLang: langParam,
    cookie: picked ?? profile.cookie,
    acceptLanguage: profile.acceptLanguage,
  });

  useLayoutEffect(() => {
    documentLang?.setLang(lang);
  }, [documentLang, lang]);

  useEffect(() => {
    if (profile.cookie || isLang(langParam)) return;
    const stored = window.localStorage.getItem(LANG_KEY);
    if (!isLang(stored) || stored === lang) return;
    persistLang(stored);
  }, [lang, langParam, profile.cookie]);

  const onLang = useCallback(
    (next: Lang) => {
      setPicked(next);
      persistLang(next);
      const searchUpdate = (prev: { lang?: Lang }) => ({ ...prev, lang: langQuery(next) });
      const opts = { replace: true, resetScroll: false } as const;
      if (current === "/") {
        void navigate({ to: "/", search: searchUpdate, ...opts });
      } else if (current === "/constellation") {
        void navigate({ to: "/constellation", search: searchUpdate, ...opts });
      } else {
        void navigate({ to: "/method", search: searchUpdate, ...opts });
      }
    },
    [current, navigate],
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
