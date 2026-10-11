import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { detectLang, persistLang, isLang, getDict } from "@/lib/i18n";
import { dataFreshness } from "@/lib/catalog/freshness";
import { summarizeStale } from "@/lib/catalog/stale-summary";
import type { Lang, CatalogPayload } from "@/lib/catalog/types";
import { viewFromSearch, type ViewSearch } from "@/lib/view-state";

function newestEpoch(catalog: CatalogPayload | undefined): string | null {
  if (!catalog) return null;
  let best: string | null = null;
  for (const o of catalog.objects) {
    if (!o.epoch) continue;
    if (!best || o.epoch > best) best = o.epoch;
  }
  return best ? best.replace("T", " ").slice(0, 16) : null;
}

function fetchedLabel(catalog: CatalogPayload | undefined): string | null {
  if (!catalog?.fetchedAt) return null;
  return catalog.fetchedAt.replace("T", " ").replace("Z", "").slice(0, 16);
}

export function LangFrame({
  current,
  catalog,
  langParam,
  search,
  children,
}: {
  current: "/" | "/constellation" | "/method";
  catalog: CatalogPayload;
  langParam?: string;
  /** Ukraine today search. Other pages have no coverage set, so the note uses the default. */
  search?: ViewSearch;
  children: (lang: Lang) => React.ReactNode;
}) {
  const navigate = useNavigate();
  const [stored, setStored] = useState<Lang>(() => detectLang(langParam));
  const lang: Lang = isLang(langParam) ? langParam : stored;

  const onLang = useCallback(
    (next: Lang) => {
      setStored(next);
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
      newestEpoch={newestEpoch(catalog)}
      source={catalog.source}
      freshness={dataFreshness(catalog)}
      stale={summarizeStale(catalog, {
        now: new Date(catalog.fetchedAt),
        set: coverage?.set ?? null,
      })}
      cityLabel={cityLabel}
      warning={catalog.source === "seed" ? null : catalog.warning}
      current={current}
    >
      {children(lang)}
    </AppShell>
  );
}
