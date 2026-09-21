import { useEffect, useRef } from "react";
import type { CoverageResult, SatMapState } from "@/lib/orbit/coverage";
import { MAP_BOUNDS, MAP_CENTER, MAP_DEFAULT_ZOOM } from "@/lib/orbit/constants";
import { useSelection } from "@/lib/selection";
import { getDict } from "@/lib/i18n";
import type { Lang } from "@/lib/catalog/types";
import region from "../data/region.json" with { type: "json" };
import { Button } from "@/components/ui/button";

type Props = {
  lang: Lang;
  result: CoverageResult | null;
  lat: number;
  lon: number;
  el: number;
  placeLabel: string;
};

function statusClass(s: SatMapState["status"], selected: boolean): string {
  if (selected) return "sat-dot sat-dot-selected sat-dot-raised";
  if (s === "climbing") return "sat-dot sat-dot-climbing";
  if (s === "decayed") return "sat-dot sat-dot-decayed";
  return "sat-dot sat-dot-raised";
}

export function UkraineMap({ lang, result, lat, lon, el, placeLabel }: Props) {
  const t = getDict(lang);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const select = useSelection((s) => s.select);
  const selected = useSelection((s) => s.norad);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapEl.current || mapRef.current) return;
      const map = L.map(mapEl.current, {
        zoomControl: true,
        attributionControl: true,
        minZoom: 5,
        maxZoom: 9,
      }).setView(MAP_CENTER, MAP_DEFAULT_ZOOM);
      map.fitBounds(MAP_BOUNDS);
      L.geoJSON(region as GeoJSON.GeoJsonObject, {
        style: (feat) => {
          const name = (feat?.properties as { name?: string } | undefined)?.name;
          const isUa = name === "Ukraine";
          return {
            color: isUa ? "rgba(232,234,238,0.55)" : "rgba(232,234,238,0.18)",
            weight: isUa ? 1.2 : 0.8,
            fillColor: isUa ? "rgba(158,182,196,0.06)" : "transparent",
            fillOpacity: 1,
          };
        },
      }).addTo(map);
      const layers = L.layerGroup().addTo(map);
      layerRef.current = layers;
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layerRef.current;
    if (!map || !layers || !result) return;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled) return;
      layers.clearLayers();
      const observer = L.circleMarker([lat, lon], {
        radius: 5,
        color: "var(--color-accent)",
        weight: 1.5,
        fillColor: "var(--color-fg)",
        fillOpacity: 1,
      }).bindTooltip(`${t.map.observer}: ${placeLabel} · ${el}° ${t.map.mask}`, {
        className: "rassvet-tip",
        sticky: true,
      });
      observer.addTo(layers);

      for (const sat of result.map) {
        const selectedSat = sat.norad === selected;
        const color =
          sat.status === "climbing"
            ? "var(--color-status-climbing)"
            : "var(--color-status-raised)";
        const fillOp = selectedSat ? 0.22 : 0.08;
        L.polygon(sat.footprint, {
          color,
          weight: selectedSat ? 1.4 : 1,
          opacity: sat.stale ? 0.4 : 0.7,
          fillColor: color,
          fillOpacity: fillOp,
        }).addTo(layers);

        const track = splitTrack(sat.track);
        for (const seg of track) {
          L.polyline(seg, {
            color,
            weight: 1,
            opacity: selectedSat ? 0.9 : 0.35,
            dashArray: sat.stale ? "3 4" : undefined,
          }).addTo(layers);
        }

        const icon = L.divIcon({
          className: statusClass(sat.status, selectedSat),
          iconSize: [10, 10],
        });
        const marker = L.marker([sat.lat, sat.lon], { icon, zIndexOffset: selectedSat ? 500 : 0 });
        const elNow =
          sat.elevationDeg != null && sat.elevationDeg > -0.5
            ? `${sat.elevationDeg.toFixed(1)}°`
            : "—";
        marker.bindTooltip(
          `${sat.name} · ${sat.norad}<br/>${sat.altitudeKm.toFixed(0)} km · el ${elNow}${sat.stale ? " · stale" : ""}`,
          { className: "rassvet-tip", sticky: true, opacity: 1 },
        );
        marker.on("click", () => select(sat.norad));
        marker.addTo(layers);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result, lat, lon, el, placeLabel, selected, select, t.map.mask, t.map.observer]);

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
      <div ref={mapEl} className="h-[340px] w-full md:h-[420px]" />
      <div className="absolute right-3 top-3 z-[400]">
        <Button
          variant="outline"
          onClick={() => mapRef.current?.fitBounds(MAP_BOUNDS)}
        >
          {t.map.reset}
        </Button>
      </div>
    </div>
  );
}

function splitTrack(track: [number, number][]): [number, number][][] {
  const segs: [number, number][][] = [];
  let cur: [number, number][] = [];
  for (const pt of track) {
    const prev = cur[cur.length - 1];
    if (prev && Math.abs(prev[1] - pt[1]) > 180) {
      segs.push(cur);
      cur = [pt];
    } else {
      cur.push(pt);
    }
  }
  if (cur.length) segs.push(cur);
  return segs;
}
