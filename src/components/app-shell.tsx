import { useLayoutEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FreshnessBanner } from "@/components/freshness-banner";
import { getDict } from "@/lib/i18n";
import type { Lang } from "@/lib/catalog/types";
import type { DataFreshness } from "@/lib/catalog/freshness";
import type { StaleSummary } from "@/lib/catalog/stale-summary";
import { readRememberedHome, resolveNavSearch, type AppRoute, type ViewSearch } from "@/lib/view-state";
import { ThemeSwitch } from "@/components/theme-switch";
import { cn } from "@/lib/cn";

const NAV = [
  { to: "/", key: "ukraine" },
  { to: "/constellation", key: "constellation" },
  { to: "/method", key: "method" },
] as const;

export function AppShell({
  lang,
  onLang,
  fetchedAt,
  newestEpoch,
  source,
  freshness,
  stale,
  cityLabel,
  warning,
  children,
  current,
}: {
  lang: Lang;
  onLang: (lang: Lang) => void;
  fetchedAt: string | null;
  newestEpoch: string | null;
  source: "live" | "saved" | "seed" | null;
  freshness: DataFreshness;
  stale: StaleSummary;
  cityLabel: string | null;
  warning: string | null;
  current: "/" | "/constellation" | "/method";
  children: React.ReactNode;
}) {
  const t = getDict(lang);
  const [remembered, setRemembered] = useState<ViewSearch | null>(null);
  useLayoutEffect(() => {
    setRemembered(readRememberedHome());
  }, [current]);
  const linkSearch = (to: AppRoute, prev: ViewSearch) =>
    resolveNavSearch({
      to,
      current,
      currentSearch: prev,
      remembered,
      lang,
    });
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-sm)] focus:bg-elevated focus:px-3 focus:py-2 focus:text-fg"
      >
        {t.skip}
      </a>
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-2 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <h1 className="font-sans text-lg font-medium tracking-[-0.03em] text-fg md:text-xl">
                {t.productTitle}
              </h1>
              <p className="mt-0.5 text-[11px] text-muted">{t.productSubtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-[var(--radius-sm)] border border-border bg-surface p-0.5">
                {(["en", "uk", "ru"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onLang(code)}
                    className={cn(
                      "min-h-9 min-w-10 rounded-[6px] px-2 text-xs font-medium",
                      lang === code ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                    )}
                    aria-pressed={lang === code}
                  >
                    {t.lang[code]}
                  </button>
                ))}
              </div>
              <ThemeSwitch lang={lang} />
              <div className="font-mono text-[10px] leading-snug text-muted tabular">
                <div>
                  {t.header.catalogEpoch}{" "}
                  <span className="text-fg">{newestEpoch ? `${newestEpoch} UTC` : "—"}</span>
                </div>
                <div>
                  {t.header.fetchedAt}{" "}
                  <span className="text-fg">{fetchedAt ? `${fetchedAt} UTC` : "—"}</span>
                  {source
                    ? ` · ${
                        source === "live"
                          ? t.header.sourceLive
                          : source === "saved"
                            ? t.header.sourceSaved
                            : t.header.sourceSeed
                      }`
                    : null}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <nav className="flex flex-wrap gap-1" aria-label={t.nav.primary}>
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  search={(prev) => linkSearch(item.to, prev)}
                  aria-current={current === item.to ? "page" : undefined}
                  className={cn(
                    "min-h-9 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm",
                    current === item.to
                      ? "bg-elevated text-fg"
                      : "text-muted hover:bg-surface hover:text-fg",
                  )}
                >
                  {t.nav[item.key]}
                </Link>
              ))}
            </nav>
            {warning ? (
              <p className="max-w-[60ch] text-[11px] leading-snug text-fg/80">
                {t.warning}: {warning}
              </p>
            ) : null}
          </div>
          <FreshnessBanner lang={lang} freshness={freshness} summary={stale} cityLabel={cityLabel} />
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-[1400px] px-4 py-3 md:px-6">
        {children}
      </main>
    </div>
  );
}
