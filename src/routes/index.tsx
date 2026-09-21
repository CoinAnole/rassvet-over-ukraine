import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LangFrame } from "@/components/lang-frame";
import { UkraineBoard, CityStrip, PassTable } from "@/components/ukraine-board";
import { UkraineMap } from "@/components/ukraine-map";
import { computeCoverage } from "@/lib/orbit/coverage";
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
  const [now, setNow] = useState(() => new Date(nowIso));

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const nowBucket = Math.floor(now.getTime() / 30_000);

  const result = useMemo(() => {
    return computeCoverage({
      catalog,
      lat: view.lat,
      lon: view.lon,
      minElevationDeg: view.el,
      filter: view.set,
      tz: view.tz,
      now,
    });
    // Recompute on 30 s buckets, not every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, view.lat, view.lon, view.el, view.set, view.tz, nowBucket]);

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
      <CityStrip lang={lang} result={result} />
      <PassTable lang={lang} catalog={catalog} result={result} tz={view.tz} />
    </div>
  );
}
