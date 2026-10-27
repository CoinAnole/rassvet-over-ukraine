import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { DataFreshness } from "@/lib/catalog/freshness";
import type { StaleSummary } from "@/lib/catalog/stale-summary";
import type { Lang } from "@/lib/catalog/types";
import { getDict, groupLabel } from "@/lib/i18n";
import { fallbackBannerText } from "@/lib/i18n/fallback-banner";
import { staleBannerLine } from "@/lib/i18n/stale";
import { cn } from "@/lib/cn";

function epochText(epoch: string): string {
  return `${epoch.replace("T", " ").replace(/Z$/, "").slice(0, 16)} UTC`;
}

function fill(template: string, values: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(values)) out = out.replaceAll(`{${key}}`, value);
  return out;
}

export function FreshnessBanner({
  lang,
  freshness,
  summary,
  cityLabel,
}: {
  lang: Lang;
  freshness: DataFreshness;
  summary: StaleSummary;
  cityLabel: string | null;
}) {
  const t = getDict(lang);
  const [open, setOpen] = useState(false);

  if (freshness.kind === "seed" || freshness.kind === "saved") {
    const text = fallbackBannerText(lang, freshness);
    return (
      <p
        role="status"
        className="border-l-2 border-status-decay bg-elevated px-3 py-2 text-[13px] leading-snug text-fg"
      >
        <span className="mr-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-status-decay">
          {t.freshness.seedKicker}
        </span>
        {text}
      </p>
    );
  }

  if (freshness.kind !== "stale" || summary.count === 0) return null;

  const quiet = summary.quiet;
  const line = staleBannerLine(lang, summary);
  const setLabel = t.population[summary.set];
  const namedCity = !summary.usedDefaultSet && cityLabel != null;
  const action = namedCity
    ? fill(quiet ? t.freshness.doQuiet : t.freshness.doAlarm, { set: setLabel, city: cityLabel })
    : fill(quiet ? t.freshness.doQuietDefault : t.freshness.doAlarmDefault, { set: setLabel });

  return (
    <div
      className={cn(
        "border-l-2",
        quiet ? "border-border-strong bg-surface" : "border-status-decay bg-elevated",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="stale-gp-details"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2 text-left"
      >
        <span role="status" className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className={cn(
              "font-mono text-[10px] font-medium uppercase tracking-[0.14em]",
              quiet ? "text-muted" : "text-status-decay",
            )}
          >
            {quiet ? t.freshness.quietKicker : t.freshness.staleKicker}
          </span>
          <span className="text-[13px] leading-snug text-fg">{line}</span>
        </span>
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
          {open ? t.freshness.hide : t.freshness.details}
        </span>
      </button>
      {open ? (
        <div id="stale-gp-details" className="max-w-[72ch] px-3 pb-3">
          <p className="text-[13px] leading-relaxed text-fg/90">{t.freshness.what}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-fg/90">{t.freshness.why}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-fg/90">{t.freshness.accuracy}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-fg">{action}</p>
          <ul className="mt-3 flex flex-col gap-3">
            {summary.objects.map((obj) => {
              const affect = namedCity
                ? fill(obj.inCoverageSet ? t.freshness.affects : t.freshness.spares, {
                    set: setLabel,
                    city: cityLabel,
                  })
                : fill(obj.inCoverageSet ? t.freshness.affectsDefault : t.freshness.sparesDefault, {
                    set: setLabel,
                  });
              return (
                <li key={obj.norad} className="border-t border-border pt-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-sm text-fg">{obj.name}</span>
                    <span className="font-mono text-xs text-muted tabular">
                      {t.constellation.table.norad} {obj.norad}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {t.freshness.roles[obj.role]}
                    {" · "}
                    {groupLabel(lang, obj.group, obj.group)}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-fg/80 tabular">
                    {t.freshness.epochLabel} {epochText(obj.epoch)}
                    {" · "}
                    {t.freshness.ageLabel} {obj.ageDays} {t.units.day} {obj.ageHoursPart}{" "}
                    {t.units.hour}
                  </p>
                  <p className="mt-1 text-[13px] leading-snug text-fg/90">{affect}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[13px]">
            <Link
              to="/method"
              hash="stale-element-sets"
              className="text-accent underline decoration-border-strong underline-offset-2"
            >
              {t.freshness.methodLink}
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
