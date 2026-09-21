import { Link } from "@tanstack/react-router";
import { getDict } from "@/lib/i18n";
import type { Lang } from "@/lib/catalog/types";
import { cn } from "@/lib/cn";

const NAV = [
  { to: "/", key: "ukraine" as const },
  { to: "/constellation", key: "constellation" as const },
  { to: "/method", key: "method" as const },
];

export function AppShell({
  lang,
  onLang,
  fetchedAt,
  newestEpoch,
  source,
  warning,
  children,
  current,
}: {
  lang: Lang;
  onLang: (lang: Lang) => void;
  fetchedAt: string | null;
  newestEpoch: string | null;
  source: "live" | "seed" | null;
  warning: string | null;
  current: "/" | "/constellation" | "/method";
  children: React.ReactNode;
}) {
  const t = getDict(lang);
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-2 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="font-sans text-lg font-medium tracking-[-0.03em] text-fg md:text-xl">
                  {t.productTitle}
                </h1>
                <p className="rounded-[var(--radius-xs)] border border-border-strong bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-accent">
                  {t.badge}
                </p>
              </div>
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
              <div className="font-mono text-[10px] leading-snug text-muted tabular">
                <div>
                  {t.header.catalogEpoch}{" "}
                  <span className="text-fg">{newestEpoch ? `${newestEpoch} UTC` : "—"}</span>
                </div>
                <div>
                  {t.header.fetchedAt}{" "}
                  <span className="text-fg">{fetchedAt ? `${fetchedAt} UTC` : "—"}</span>
                  {source ? ` · ${source === "live" ? t.header.sourceLive : t.header.sourceSeed}` : null}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <nav className="flex flex-wrap gap-1" aria-label="Primary">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
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
              <p className="max-w-[60ch] text-[11px] text-status-climbing">
                {t.warning}: {warning}
              </p>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-3 md:px-6">{children}</main>
    </div>
  );
}
