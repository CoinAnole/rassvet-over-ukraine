import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogPayload, Lang, PopulationFilter, TimezoneId } from "@/lib/catalog/types";
import { inPopulation, type CoverageResult } from "@/lib/orbit/coverage";
import { dataFreshness } from "@/lib/catalog/freshness";
import { CLOCK_WINDOW_MS, formatClockOffset } from "@/lib/orbit/clock";
import {
  scrubBandAtFraction,
  scrubBandFrame,
  scrubBands,
  type ScrubBand,
} from "@/lib/orbit/scrub-windows";
import type { Interval } from "@/lib/orbit/union";
import { PLACES, type PlaceId } from "@/lib/orbit/constants";
import { getDict, coverageSentence, groupLabel } from "@/lib/i18n";
import {
  formatCivilDay,
  formatCivilInput,
  formatClock,
  formatCountdown,
  formatDayClock,
  tzName,
} from "@/lib/orbit/time";
import { cn } from "@/lib/cn";
import { useSelection } from "@/lib/selection";
import type { ViewSearch, ViewState } from "@/lib/view-state";
import { Button } from "@/components/ui/button";
import { ShareLink } from "@/components/share-link";

export type ClockControl = {
  /** Instant the current coverage result was computed for. */
  coverageAt: Date;
  /** Instant shown on the scrubber. May lead coverage during a short debounce. */
  displayAt: Date;
  live: boolean;
  offsetMs: number;
  /** Wall-clock ms the ±48 h window is measured from. Stable across SSR. */
  wallMs: number;
  clamped: boolean;
  onHours: (hours: number) => void;
  onCommit: () => void;
  onAbsolute: (civil: string) => void;
  onLive: () => void;
  /** Unioned geometric LOS, possibly extending past the visible ±48 h edges. */
  windows: Interval[];
  /** Hold the clock at this window's acquisition. */
  onWindow: (aosMs: number) => void;
};

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
  clock,
  onChange,
  linkSearch,
  syncLink,
}: {
  lang: Lang;
  view: ViewState;
  catalog: CatalogPayload;
  result: CoverageResult | null;
  clock: ClockControl;
  onChange: (next: Partial<ViewState>) => void;
  linkSearch: ViewSearch;
  syncLink: () => void;
}) {
  const t = getDict(lang);
  const freshness = dataFreshness(catalog);
  const populationStale = catalog.objects.some((o) => o.stale && inPopulation(o, view.set));
  const todayNote =
    freshness.kind === "seed"
      ? t.freshness.todaySeed
      : populationStale
        ? t.freshness.todayStale
        : null;
  const zone = tzName(view.tz);
  const placeLabel = view.place === "custom" ? t.places.custom : t.places[view.place as PlaceId];
  const heldDay = clock.live ? undefined : formatCivilDay(clock.coverageAt, zone);
  const sentence = result
    ? coverageSentence(lang, {
        el: view.el,
        place: placeLabel,
        windows: result.todayWindowCount,
        minutes: result.todayMinutes,
        day: heldDay,
      })
    : "…";
  const offsetLabel = formatClockOffset(clock.offsetMs, t.units.hour, t.units.min);
  const banner = t.clock.banner
    .replaceAll("{when}", `${formatDayClock(clock.displayAt, zone)} ${t.tz[view.tz]}`)
    .replaceAll("{offset}", offsetLabel);

  const nowNames = result?.nowVisible ?? [];
  const shown = nowNames.slice(0, 4);
  const extra = Math.max(0, nowNames.length - 4);

  const longestObjs = (result?.longestToday?.objects ?? [])
    .map((id) => catalog.objects.find((o) => o.norad === id)?.name ?? String(id))
    .join(", ");

  return (
    <div className="flex flex-col gap-3">
      {clock.live ? null : (
        <div className="flex flex-col gap-2">
          <p
            role="status"
            className="rounded-[var(--radius-md)] border border-border bg-elevated px-3 py-2 text-xs leading-relaxed text-status-climbing"
          >
            <span className="font-medium uppercase tracking-[0.12em]">{t.clock.notLive}</span>
            {" · "}
            {banner}
          </p>
          {clock.clamped ? (
            <div
              role="status"
              className="max-w-[75ch] rounded-[var(--radius-md)] border border-border-strong bg-elevated"
            >
              <div className="border-l-2 border-status-climbing px-3 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-status-climbing">
                  {t.clock.clampedKicker}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-fg">{t.clock.clamped}</p>
              </div>
            </div>
          ) : null}
        </div>
      )}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label={t.tiles.now} hint={clock.live ? t.tiles.nowHint : t.tiles.nowHintHeld}>
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
        <Tile label={t.tiles.today} hint={clock.live ? t.tiles.todayHint : t.tiles.todayHintHeld}>
          <p className="font-mono text-3xl font-medium tracking-[-0.04em] tabular">
            {result ? result.todayMinutes : "—"}
            <span className="ml-2 text-lg text-muted">{t.units.min}</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            {result ? `${result.todayWindowCount} ${t.tiles.windows}` : "—"}
            {heldDay ? ` · ${heldDay}` : null}
          </p>
          {todayNote ? (
            <p className="mt-1 text-[11px] font-medium leading-snug text-status-decay">
              {todayNote}
            </p>
          ) : null}
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

      <p
        key={`${lang}-${placeLabel}-${result?.todayMinutes}`}
        className="max-w-[75ch] text-[13px] leading-snug text-fg/90"
      >
        {sentence}
      </p>

      <ControlRow
        lang={lang}
        view={view}
        clock={clock}
        onChange={onChange}
        linkSearch={linkSearch}
        syncLink={syncLink}
      />
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
  clock,
  onChange,
  linkSearch,
  syncLink,
}: {
  lang: Lang;
  view: ViewState;
  clock: ClockControl;
  onChange: (next: Partial<ViewState>) => void;
  linkSearch: ViewSearch;
  syncLink: () => void;
}) {
  const t = getDict(lang);
  const [latDraft, setLatDraft] = useState(String(view.lat));
  const [lonDraft, setLonDraft] = useState(String(view.lon));

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-3">
      <ShareLink lang={lang} search={linkSearch} syncUrl={syncLink} />
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
      <p className="text-xs leading-snug text-muted">{t.altitudeGloss}</p>
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
      <ClockScrub lang={lang} tz={view.tz} clock={clock} />
    </div>
  );
}

function ClockScrub({ lang, tz, clock }: { lang: Lang; tz: TimezoneId; clock: ClockControl }) {
  const t = getDict(lang);
  const zone = tzName(tz);
  const offsetLabel = formatClockOffset(clock.offsetMs, t.units.hour, t.units.min);
  const hours = clock.live ? 0 : clock.offsetMs / 3_600_000;
  const bands = useMemo(
    () => scrubBands(clock.windows, clock.wallMs),
    [clock.windows, clock.wallMs],
  );
  const minCivil = formatCivilInput(new Date(clock.wallMs - CLOCK_WINDOW_MS), zone);
  const maxCivil = formatCivilInput(new Date(clock.wallMs + CLOCK_WINDOW_MS), zone);

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            {t.clock.label}
          </span>
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className={
                clock.live
                  ? "text-[10px] font-medium uppercase tracking-[0.14em] text-status-raised"
                  : "text-[10px] font-medium uppercase tracking-[0.14em] text-status-climbing"
              }
            >
              {clock.live ? t.clock.live : t.clock.notLive}
            </span>
            <span className="font-mono text-sm text-fg tabular">
              {formatCivilDay(clock.displayAt, zone)} {formatClock(clock.displayAt, zone)}
            </span>
            <span className="text-xs text-muted">{t.tz[tz]}</span>
            {clock.live ? null : (
              <span className="font-mono text-xs text-status-climbing tabular">{offsetLabel}</span>
            )}
          </p>
        </div>
        <Button
          type="button"
          variant={clock.live ? "outline" : "primary"}
          size="md"
          onClick={clock.onLive}
          aria-pressed={clock.live}
        >
          {t.clock.returnLive}
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <ScrubTrack
          bands={bands}
          clock={clock}
          hours={hours}
          offsetLabel={offsetLabel}
          scrubLabel={t.clock.scrub}
          bandLabel={(band) => scrubBandText(t.clock.band, band, zone)}
        />
        <div className="flex justify-between font-mono text-[10px] text-subtle tabular">
          <span>−48 {t.units.hour}</span>
          <span>0</span>
          <span>+48 {t.units.hour}</span>
        </div>
      </div>
      <CivilTimeField
        label={t.clock.absolute}
        at={clock.displayAt}
        timeZone={zone}
        min={minCivil}
        max={maxCivil}
        clamped={clock.clamped}
        onAbsolute={clock.onAbsolute}
      />
      <p className="text-xs normal-case tracking-normal text-subtle">{t.clock.hint}</p>
      <p id="clock-scrub-bands" className="text-xs normal-case tracking-normal text-subtle">
        {t.clock.bands}
      </p>
      {bands.length === 0 ? (
        <p className="text-xs normal-case tracking-normal text-muted">{t.clock.bandsEmpty}</p>
      ) : null}
    </div>
  );
}

/** Matches the styled range thumb so bands and clicks share the thumb's travel. */
const SCRUB_THUMB_PX = 16;
/** Short windows stay visible. Pointer hits snap to the nearest window within this many pixels. */
const SCRUB_BAND_MIN_PX = 4;
const SCRUB_HIT_PX = 10;

function scrubBandText(template: string, band: ScrubBand, zone: string): string {
  const minutes = Math.max(1, Math.round((band.visibleEnd - band.visibleStart) / 60_000));
  return template
    .replaceAll("{start}", formatDayClock(new Date(band.visibleStart), zone))
    .replaceAll("{end}", formatDayClock(new Date(band.visibleEnd), zone))
    .replaceAll("{minutes}", String(minutes));
}

function hoursFromClientX(clientX: number, rect: DOMRect): number {
  const usable = rect.width - SCRUB_THUMB_PX;
  const x = clientX - rect.left - SCRUB_THUMB_PX / 2;
  const frac = usable <= 0 ? 0.5 : Math.min(1, Math.max(0, x / usable));
  return -48 + frac * 96;
}

function ScrubTrack({
  bands,
  clock,
  hours,
  offsetLabel,
  scrubLabel,
  bandLabel,
}: {
  bands: ScrubBand[];
  clock: ClockControl;
  hours: number;
  offsetLabel: string;
  scrubLabel: string;
  bandLabel: (band: ScrubBand) => string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const tapRef = useRef<{ aos: number; x: number; y: number; pointerId: number } | null>(null);
  const scrubDragRef = useRef(false);
  const [roving, setRoving] = useState<number | null>(null);
  const displayMs = clock.displayAt.getTime();
  const suggested = useMemo(() => {
    const open = bands.findIndex((b) => displayMs >= b.visibleStart && displayMs < b.visibleEnd);
    if (open >= 0) return open;
    const upcoming = bands.findIndex((b) => b.aos >= displayMs);
    return upcoming >= 0 ? upcoming : 0;
  }, [bands, displayMs]);
  const tabAt = roving != null && roving >= 0 && roving < bands.length ? roving : suggested;

  useEffect(() => {
    if (roving == null) return;
    const el = buttons.current[roving];
    if (el && document.activeElement !== el) el.focus();
  }, [roving]);

  const bandAtClientX = (clientX: number): ScrubBand | null => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const usable = rect.width - SCRUB_THUMB_PX;
    const x = clientX - rect.left - SCRUB_THUMB_PX / 2;
    const fraction = usable <= 0 ? 0 : x / usable;
    return scrubBandAtFraction(
      bands,
      fraction,
      usable,
      clock.wallMs,
      CLOCK_WINDOW_MS,
      SCRUB_BAND_MIN_PX,
      SCRUB_HIT_PX,
    );
  };

  const focusBand = (index: number) => {
    setRoving(Math.max(0, Math.min(bands.length - 1, index)));
  };

  return (
    <div ref={trackRef} className="clock-scrub">
      <div className="clock-scrub-rail" aria-hidden="true" />
      <div className="scrub-bands" role="group" aria-labelledby="clock-scrub-bands">
        {bands.map((band, i) => {
          const frame = scrubBandFrame(band, clock.wallMs);
          const open = displayMs >= band.visibleStart && displayMs < band.visibleEnd;
          const label = bandLabel(band);
          return (
            <button
              key={`${band.aos}:${band.los}`}
              ref={(node) => {
                buttons.current[i] = node;
              }}
              type="button"
              className="scrub-band"
              data-scrub-band=""
              data-aos={String(band.aos)}
              data-open={open ? "true" : "false"}
              aria-current={open ? "true" : undefined}
              aria-label={label}
              tabIndex={i === tabAt ? 0 : -1}
              style={{
                left: `min(${frame.leftPct}%, calc(100% - ${SCRUB_BAND_MIN_PX}px))`,
                width: `max(${frame.widthPct}%, ${SCRUB_BAND_MIN_PX}px)`,
              }}
              onClick={() => {
                setRoving(i);
                clock.onWindow(band.aos);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  focusBand(i + 1);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  focusBand(i - 1);
                } else if (e.key === "Home") {
                  e.preventDefault();
                  focusBand(0);
                } else if (e.key === "End") {
                  e.preventDefault();
                  focusBand(bands.length - 1);
                } else if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setRoving(i);
                  clock.onWindow(band.aos);
                }
              }}
            >
              <span className="scrub-band-fill" />
            </button>
          );
        })}
      </div>
      <input
        type="range"
        className="clock-range"
        min={-48}
        max={48}
        step="any"
        value={Number.isFinite(hours) ? Math.max(-48, Math.min(48, hours)) : 0}
        aria-label={scrubLabel}
        aria-valuemin={-48}
        aria-valuemax={48}
        aria-valuenow={Math.round(hours * 100) / 100}
        aria-valuetext={offsetLabel}
        onChange={(e) => clock.onHours(Number(e.target.value))}
        onKeyUp={clock.onCommit}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const band = bandAtClientX(e.clientX);
          if (!band) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          tapRef.current = { aos: band.aos, x: e.clientX, y: e.clientY, pointerId: e.pointerId };
          scrubDragRef.current = false;
        }}
        onPointerMove={(e) => {
          const tap = tapRef.current;
          if (!tap || tap.pointerId !== e.pointerId) return;
          if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) <= 6) return;
          scrubDragRef.current = true;
          const rect = trackRef.current?.getBoundingClientRect();
          if (rect) clock.onHours(hoursFromClientX(e.clientX, rect));
        }}
        onPointerUp={(e) => {
          const tap = tapRef.current;
          tapRef.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
          if (tap && tap.pointerId === e.pointerId && !scrubDragRef.current) {
            const moved = Math.hypot(e.clientX - tap.x, e.clientY - tap.y);
            if (moved <= 6) {
              clock.onWindow(tap.aos);
              return;
            }
          }
          scrubDragRef.current = false;
          clock.onCommit();
        }}
      />
    </div>
  );
}

function CivilTimeField({
  label,
  at,
  timeZone,
  min,
  max,
  clamped,
  onAbsolute,
}: {
  label: string;
  at: Date;
  timeZone: string;
  min: string;
  max: string;
  clamped: boolean;
  onAbsolute: (civil: string) => void;
}) {
  const formatted = formatCivilInput(at, timeZone);
  const [draft, setDraft] = useState(formatted);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused || clamped) setDraft(formatted);
  }, [formatted, focused, clamped]);

  const shown = !focused || clamped ? formatted : draft;

  return (
    <Field label={label}>
      <input
        type="datetime-local"
        className="control-select max-w-xs"
        value={shown}
        min={min}
        max={max}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setDraft(formatted);
        }}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          if (next) onAbsolute(next);
        }}
      />
    </Field>
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
  held = false,
}: {
  lang: Lang;
  result: CoverageResult | null;
  held?: boolean;
}) {
  const t = getDict(lang);
  return (
    <section className="flex flex-col gap-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
        {t.cityStrip.label}
      </p>
      <p className="text-xs text-subtle">{held ? t.cityStrip.hintHeld : t.cityStrip.hint}</p>
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
  nowMs,
  held = false,
}: {
  lang: Lang;
  catalog: CatalogPayload;
  result: CoverageResult | null;
  tz: TimezoneId;
  nowMs: number;
  held?: boolean;
}) {
  const t = getDict(lang);
  const zone = tzName(tz);
  const selected = useSelection((s) => s.norad);
  const select = useSelection((s) => s.select);
  const rows = result?.passes36h ?? [];

  const nextId = useMemo(() => {
    const open = rows.find((r) => r.aos <= nowMs && r.los > nowMs);
    if (open) return open.norad + ":" + open.aos;
    const upcoming = rows.find((r) => r.aos > nowMs);
    return upcoming ? upcoming.norad + ":" + upcoming.aos : null;
  }, [rows, nowMs]);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{held ? t.passList.titleHeld : t.passList.title}</h2>
      <p className="max-w-[75ch] text-xs text-muted">
        {held ? t.passList.hintHeld : t.passList.hint}
      </p>
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
                  {held ? t.passList.emptyHeld : t.passList.empty}
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
                      {row.name} <span className="font-mono text-xs text-muted">{row.norad}</span>
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
