import { useMemo, useState } from "react";
import type { CatalogPayload, Lang, PopulationFilter, TimezoneId } from "@/lib/catalog/types";
import type { CoverageResult } from "@/lib/orbit/coverage";
import { PLACES, type PlaceId } from "@/lib/orbit/constants";
import { getDict, coverageSentence, groupLabel } from "@/lib/i18n";
import { formatClock, formatCountdown, formatDayClock, tzName } from "@/lib/orbit/time";
import { cn } from "@/lib/cn";
import { useSelection } from "@/lib/selection";
import type { ViewState } from "@/lib/view-state";
import { Button } from "@/components/ui/button";

const ELS = [10, 25, 40] as const;
const SETS: PopulationFilter[] = [
  "raised",
  "all",
  "climbing",
  "exp-2023",
  "exp-2024",
  "prod-2026-03",
  "prod-2026-07",
];

export function UkraineBoard({
  lang,
  view,
  catalog,
  result,
  onChange,
}: {
  lang: Lang;
  view: ViewState;
  catalog: CatalogPayload;
  result: CoverageResult | null;
  onChange: (next: Partial<ViewState>) => void;
}) {
  const t = getDict(lang);
  const zone = tzName(view.tz);
  const placeLabel =
    view.place === "custom" ? t.places.custom : t.places[view.place as PlaceId];
  const sentence = result
    ? coverageSentence(lang, {
        el: view.el,
        place: placeLabel,
        windows: result.todayWindowCount,
        minutes: result.todayMinutes,
      })
    : "…";

  const nowNames = result?.nowVisible ?? [];
  const shown = nowNames.slice(0, 4);
  const extra = Math.max(0, nowNames.length - 4);

  const longestObjs = (result?.longestToday?.objects ?? [])
    .map((id) => catalog.objects.find((o) => o.norad === id)?.name ?? String(id))
    .join(", ");

  return (
    <div className="flex flex-col gap-3">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label={t.tiles.now} hint={t.tiles.nowHint}>
          <p className="font-mono text-3xl font-medium tracking-[-0.04em] tabular">
            {result ? nowNames.length : "—"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {result && nowNames.length === 0
              ? t.tiles.emptyNow
              : shown.map((o) => o.name).join(" · ")}
            {extra ? ` ${t.tiles.more.replace("{n}", String(extra))}` : null}
          </p>
        </Tile>
        <Tile label={t.tiles.today} hint={t.tiles.todayHint}>
          <p className="font-mono text-3xl font-medium tracking-[-0.04em] tabular">
            {result ? result.todayMinutes : "—"}
            <span className="ml-2 text-lg text-muted">{t.units.min}</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            {result ? `${result.todayWindowCount} ${t.tiles.windows}` : "—"}
          </p>
        </Tile>
        <Tile label={t.tiles.longest} hint={t.tiles.longestHint}>
          {result?.longestToday ? (
            <>
              <p className="font-mono text-2xl font-medium tabular">
                {formatClock(new Date(result.longestToday.start), zone)}–
                {formatClock(new Date(result.longestToday.end), zone)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {result.longestToday.durationMin} {t.units.min} ·{" "}
                {result.longestToday.peakElevationDeg.toFixed(0)}
                {t.units.deg} · {longestObjs || "—"}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">{result ? t.tiles.none : "—"}</p>
          )}
        </Tile>
        <Tile
          label={result?.next.state === "open" ? t.tiles.windowOpen : t.tiles.next}
          hint={result?.next.state === "open" ? t.tiles.toLos : t.tiles.toAos}
        >
          {result?.next.state === "open" ? (
            <>
              <p className="font-mono text-4xl font-medium tabular">
                {formatCountdown(result.next.remainingMs)}
              </p>
              <p className="mt-1 text-xs text-muted">
                LOS {formatClock(new Date(result.next.los), zone)}
              </p>
            </>
          ) : result?.next.state === "later" ? (
            <>
              <p className="font-mono text-4xl font-medium tabular">
                {formatCountdown(result.next.inMs)}
              </p>
              <p className="mt-1 text-xs text-muted">
                AOS {formatDayClock(new Date(result.next.aos), zone)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">{result ? t.tiles.none : "—"}</p>
          )}
        </Tile>
      </section>

      <p key={`${lang}-${placeLabel}-${result?.todayMinutes}`} className="max-w-[75ch] text-[13px] leading-snug text-fg/90">
        {sentence}
      </p>

      <ControlRow lang={lang} view={view} onChange={onChange} />
    </div>
  );
}

function Tile({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-3 shadow-[var(--shadow-panel)]">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mb-1 text-[10px] text-subtle">{hint}</p>
      {children}
    </article>
  );
}

function ControlRow({
  lang,
  view,
  onChange,
}: {
  lang: Lang;
  view: ViewState;
  onChange: (next: Partial<ViewState>) => void;
}) {
  const t = getDict(lang);
  const [latDraft, setLatDraft] = useState(String(view.lat));
  const [lonDraft, setLonDraft] = useState(String(view.lon));

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label={t.controls.location}>
          <select
            className="control-select"
            value={view.place}
            onChange={(e) => {
              const id = e.target.value as PlaceId | "custom";
              if (id === "custom") {
                onChange({ place: "custom" });
                return;
              }
              const p = PLACES.find((x) => x.id === id)!;
              onChange({ place: id, lat: p.lat, lon: p.lon });
              setLatDraft(String(p.lat));
              setLonDraft(String(p.lon));
            }}
          >
            {PLACES.map((p) => (
              <option key={p.id} value={p.id}>
                {t.places[p.id]}
              </option>
            ))}
            <option value="custom">{t.controls.custom}</option>
          </select>
        </Field>
        <Field label={t.controls.minEl}>
          <select
            className="control-select"
            value={view.el}
            onChange={(e) => onChange({ el: Number(e.target.value) as 10 | 25 | 40 })}
          >
            {ELS.map((el) => (
              <option key={el} value={el}>
                {el}°
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.controls.population}>
          <select
            className="control-select"
            value={view.set}
            onChange={(e) => onChange({ set: e.target.value as PopulationFilter })}
          >
            {SETS.map((id) => (
              <option key={id} value={id}>
                {t.population[id]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.controls.timezone}>
          <select
            className="control-select"
            value={view.tz}
            onChange={(e) => onChange({ tz: e.target.value as TimezoneId })}
          >
            <option value="kyiv">{t.tz.kyiv}</option>
            <option value="utc">{t.tz.utc}</option>
            <option value="moscow">{t.tz.moscow}</option>
          </select>
        </Field>
      </div>
      {view.place === "custom" ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t.controls.lat}>
            <input
              className="control-select w-36"
              inputMode="decimal"
              value={latDraft}
              onChange={(e) => setLatDraft(e.target.value)}
            />
          </Field>
          <Field label={t.controls.lon}>
            <input
              className="control-select w-36"
              inputMode="decimal"
              value={lonDraft}
              onChange={(e) => setLonDraft(e.target.value)}
            />
          </Field>
          <Button
            variant="primary"
            onClick={() => {
              const lat = Number(latDraft);
              const lon = Number(lonDraft);
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
              onChange({
                place: "custom",
                lat: Math.max(-90, Math.min(90, lat)),
                lon: Math.max(-180, Math.min(180, lon)),
              });
            }}
          >
            {t.controls.apply}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
      {label}
      {children}
    </label>
  );
}

export function CityStrip({
  lang,
  result,
}: {
  lang: Lang;
  result: CoverageResult | null;
}) {
  const t = getDict(lang);
  return (
    <section className="flex flex-col gap-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
        {t.cityStrip.label}
      </p>
      <p className="text-xs text-subtle">{t.cityStrip.hint}</p>
      <div className="flex flex-wrap gap-2">
        {(result?.cityMinutes ?? []).map((c) => (
          <div
            key={c.placeId}
            className="rounded-full border border-border bg-elevated px-3 py-2 text-sm"
          >
            <span className="text-muted">{t.places[c.placeId]}</span>{" "}
            <span className="font-mono tabular">{c.minutes}</span> {t.units.min}
          </div>
        ))}
      </div>
    </section>
  );
}

export function PassTable({
  lang,
  catalog,
  result,
  tz,
}: {
  lang: Lang;
  catalog: CatalogPayload;
  result: CoverageResult | null;
  tz: TimezoneId;
}) {
  const t = getDict(lang);
  const zone = tzName(tz);
  const selected = useSelection((s) => s.norad);
  const select = useSelection((s) => s.select);
  const now = Date.now();
  const rows = result?.passes36h ?? [];

  const nextId = useMemo(() => {
    const open = rows.find((r) => r.aos <= now && r.los > now);
    if (open) return open.norad + ":" + open.aos;
    const upcoming = rows.find((r) => r.aos > now);
    return upcoming ? upcoming.norad + ":" + upcoming.aos : null;
  }, [rows, now]);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{t.passList.title}</h2>
      <p className="max-w-[75ch] text-xs text-muted">{t.passList.hint}</p>
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="bg-elevated text-[11px] uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">{t.passList.aos}</th>
              <th className="px-3 py-2 font-medium">{t.passList.los}</th>
              <th className="px-3 py-2 font-medium">{t.passList.duration}</th>
              <th className="px-3 py-2 font-medium">{t.passList.maxEl}</th>
              <th className="px-3 py-2 font-medium">{t.passList.objects}</th>
              <th className="px-3 py-2 font-medium">{t.passList.batch}</th>
              <th className="px-3 py-2 font-medium">{t.passList.altitude}</th>
              <th className="px-3 py-2 font-medium">{t.passList.status}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-muted">
                  {t.passList.empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const key = row.norad + ":" + row.aos;
                const isSel = selected === row.norad || nextId === key;
                return (
                  <tr
                    key={key}
                    onClick={() => select(row.norad)}
                    className={cn(
                      "cursor-pointer border-t border-border hover:bg-elevated",
                      isSel && "bg-elevated",
                    )}
                  >
                    <td className="px-3 py-2 font-mono text-xs tabular">
                      {formatDayClock(new Date(row.aos), zone)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs tabular">
                      {formatDayClock(new Date(row.los), zone)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs tabular">
                      {Math.round((row.los - row.aos) / 60_000)} {t.units.min}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs tabular">
                      {row.maxElevationDeg.toFixed(0)}°
                    </td>
                    <td className="px-3 py-2">
                      {row.name}{" "}
                      <span className="font-mono text-xs text-muted">{row.norad}</span>
                      {row.stale ? (
                        <span className="ml-2 text-[10px] uppercase text-status-stale">
                          {t.status.stale}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {groupLabel(lang, row.group, row.group)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs tabular">
                      {row.altitudeKm != null ? `${row.altitudeKm.toFixed(0)} km` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <StatusChip lang={lang} status={row.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function StatusChip({
  lang,
  status,
}: {
  lang: Lang;
  status: "climbing" | "raised" | "decayed" | "missing";
}) {
  const t = getDict(lang);
  const color =
    status === "raised"
      ? "text-status-raised"
      : status === "climbing"
        ? "text-status-climbing"
        : status === "decayed"
          ? "text-status-decay"
          : "text-status-stale";
  return <span className={cn("text-xs font-medium", color)}>{t.status[status]}</span>;
}
