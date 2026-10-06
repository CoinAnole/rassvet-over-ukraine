import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { LangFrame } from "@/components/lang-frame";
import { UkraineBoard, CityStrip, PassTable } from "@/components/ukraine-board";
import { UkraineMap } from "@/components/ukraine-map";
import { holdFromHours, holdFromTarget, type HeldClock } from "@/lib/orbit/clock";
import { computeCoverage } from "@/lib/orbit/coverage";
import { parseCivilInput, tzName } from "@/lib/orbit/time";
import { getDict } from "@/lib/i18n";
import { getCatalog } from "@/lib/catalog/get-catalog";
import type { Lang } from "@/lib/catalog/types";
import type { PlaceId } from "@/lib/orbit/constants";
import {
  searchFromView,
  viewFromSearch,
  type ViewSearch,
  type ViewState,
} from "@/lib/view-state";

function parseSearch(raw: Record<string, unknown>): ViewSearch {
  const num = (v: unknown) => {
    if (typeof v === "number") return v;
    if (typeof v === "string" && v !== "" && !Number.isNaN(Number(v))) return Number(v);
    return undefined;
  };
  return {
    lat: num(raw.lat),
    lon: num(raw.lon),
    el: num(raw.el),
    lang: raw.lang === "en" || raw.lang === "uk" || raw.lang === "ru" ? raw.lang : undefined,
    set: typeof raw.set === "string" ? (raw.set as ViewSearch["set"]) : undefined,
    tz: raw.tz === "kyiv" || raw.tz === "utc" || raw.tz === "moscow" ? raw.tz : undefined,
    place: typeof raw.place === "string" ? (raw.place as ViewSearch["place"]) : undefined,
  };
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => parseSearch(search),
  loader: async () => {
    const catalog = await getCatalog();
    return { catalog, nowIso: new Date().toISOString() };
  },
  component: Home,
});

function Home() {
  const { catalog } = Route.useLoaderData();
  const search = Route.useSearch();
  return (
    <LangFrame current="/" catalog={catalog} langParam={search.lang}>
      {(lang) => <UkraineToday lang={lang} />}
    </LangFrame>
  );
}

function UkraineToday({ lang }: { lang: Lang }) {
  const { catalog, nowIso } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const view = viewFromSearch(search, lang);
  const [liveNow, setLiveNow] = useState(() => new Date(nowIso));
  const [preview, setPreview] = useState<HeldClock | null>(null);
  const [held, setHeld] = useState<HeldClock | null>(null);
  const previewRef = useRef<HeldClock | null>(null);

  useEffect(() => {
    if (preview) return;
    const id = window.setInterval(() => setLiveNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [preview]);

  useEffect(() => {
    if (!preview) {
      setHeld(null);
      return;
    }
    const id = window.setTimeout(() => setHeld(preview), 200);
    return () => window.clearTimeout(id);
  }, [preview]);

  const coverageNow = held ? new Date(held.at) : liveNow;
  const displayNow = preview ? new Date(preview.at) : liveNow;
  const coverageKey = held
    ? `h:${held.at}`
    : `l:${Math.floor(coverageNow.getTime() / 30_000)}`;

  const result = useMemo(() => {
    return computeCoverage({
      catalog,
      lat: view.lat,
      lon: view.lon,
      minElevationDeg: view.el,
      filter: view.set,
      tz: view.tz,
      now: coverageNow,
    });
    // Live mode recomputes on 30 s buckets. A held clock recomputes when `held.at` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, view.lat, view.lon, view.el, view.set, view.tz, coverageKey]);

  const remember = (next: HeldClock | null, commit: boolean) => {
    previewRef.current = next;
    setPreview(next);
    if (commit) setHeld(next);
  };

  const onLive = () => {
    remember(null, true);
    setLiveNow(new Date());
  };

  const onHours = (hours: number) => {
    const next = holdFromHours(hours, Date.now());
    remember(next, next == null);
  };

  const onCommit = () => {
    setHeld(previewRef.current);
  };

  const onAbsolute = (civil: string) => {
    const parsed = parseCivilInput(civil, tzName(view.tz));
    if (!parsed) return;
    remember(holdFromTarget(parsed.getTime(), Date.now()), true);
  };

  const onChange = (patch: Partial<ViewState>) => {
    const next = { ...view, lang, ...patch };
    void navigate({
      search: searchFromView(next),
      replace: true,
    });
  };

  const t = getDict(lang);
  const placeLabel =
    view.place === "custom" ? t.places.custom : t.places[view.place as PlaceId];

  return (
    <div className="flex flex-col gap-4">
      <UkraineBoard
        lang={lang}
        view={{ ...view, lang }}
        catalog={catalog}
        result={result}
        clock={{
          coverageAt: coverageNow,
          displayAt: displayNow,
          live: preview == null,
          offsetMs: preview ? preview.at - preview.wall : 0,
          wallMs: preview ? preview.wall : liveNow.getTime(),
          clamped: preview?.clamped ?? false,
          onHours,
          onCommit,
          onAbsolute,
          onLive,
        }}
        onChange={onChange}
      />
      <UkraineMap
        lang={lang}
        result={result}
        lat={view.lat}
        lon={view.lon}
        el={view.el}
        placeLabel={placeLabel}
      />
      <CityStrip lang={lang} result={result} held={preview != null} />
      <PassTable
        lang={lang}
        catalog={catalog}
        result={result}
        tz={view.tz}
        nowMs={coverageNow.getTime()}
        held={preview != null}
      />
    </div>
  );
}
