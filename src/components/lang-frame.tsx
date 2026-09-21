import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { detectLang, persistLang, isLang } from "@/lib/i18n";
import type { Lang, CatalogPayload } from "@/lib/catalog/types";

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
  children,
}: {
  current: "/" | "/constellation" | "/method";
  catalog: CatalogPayload;
  langParam?: string;
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
          search: (prev: Record<string, unknown>) => ({ ...prev, lang: next }),
          replace: true,
        });
      }
    },
    [navigate, current],
  );

  return (
    <AppShell
      lang={lang}
      onLang={onLang}
      fetchedAt={fetchedLabel(catalog)}
      newestEpoch={newestEpoch(catalog)}
      source={catalog.source}
      warning={catalog.warning}
      current={current}
    >
      {children(lang)}
    </AppShell>
  );
}
