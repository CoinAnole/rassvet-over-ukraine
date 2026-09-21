import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CatalogPayload, Lang } from "@/lib/catalog/types";
import { getDict, groupLabel } from "@/lib/i18n";
import { StatusChip } from "@/components/ukraine-board";
import { useSelection } from "@/lib/selection";
import { cn } from "@/lib/cn";
import { getObjectsConfig } from "@/lib/catalog/build";

const GROUP_COLORS: Record<string, string> = {
  "exp-2023": "var(--color-muted)",
  "exp-2024": "var(--color-accent)",
  "prod-2026-03": "var(--color-status-raised)",
  "prod-2026-07": "var(--color-status-climbing)",
  unassigned: "var(--color-subtle)",
};

export function ConstellationView({ lang, catalog }: { lang: Lang; catalog: CatalogPayload }) {
  const t = getDict(lang);
  const cfg = getObjectsConfig();
  const [hideDecayed, setHideDecayed] = useState(true);
  const [group, setGroup] = useState<string>("all");
  const select = useSelection((s) => s.select);
  const selected = useSelection((s) => s.norad);

  const onOrbit = catalog.objects.filter((o) => o.status !== "decayed" && o.status !== "missing");
  const raised = onOrbit.filter((o) => o.status === "raised");
  const climbing = onOrbit.filter((o) => o.status === "climbing");
  const decayed = catalog.objects.filter((o) => o.status === "decayed");

  const rows = catalog.objects.filter((o) => {
    if (hideDecayed && o.status === "decayed") return false;
    if (group !== "all" && o.group !== group) return false;
    return true;
  });

  const points = useMemo(() => {
    const now = Date.now();
    return rows
      .filter((o) => o.approxAltitudeKm != null && o.launchDate)
      .map((o) => {
        const days = (now - Date.parse(o.launchDate + "T00:00:00Z")) / 86400000;
        return {
          norad: o.norad,
          name: o.name,
          group: o.group,
          days: Number(days.toFixed(1)),
          alt: Number(o.approxAltitudeKm!.toFixed(1)),
          fill: GROUP_COLORS[o.group] ?? "var(--color-fg)",
        };
      });
  }, [rows]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label={t.constellation.onOrbit} value={onOrbit.length} />
        <Stat label={t.constellation.raised} value={raised.length} />
        <Stat label={t.constellation.climbing} value={climbing.length} />
        <Stat label={t.constellation.decayed} value={decayed.length} />
        <Stat
          label={t.constellation.groups}
          value={cfg.groups.filter((g) => g.id !== "unassigned").length}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={hideDecayed}
            onChange={(e) => setHideDecayed(e.target.checked)}
          />
          {t.constellation.hideDecayed}
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          {t.constellation.filterGroup}
          <select
            className="control-select w-auto min-w-48"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="all">{t.constellation.allGroups}</option>
            {cfg.groups
              .filter((g) => g.id !== "unassigned")
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label[lang]}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-3">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 12, bottom: 28, left: 8 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="days"
                name="days"
                stroke="var(--color-muted)"
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                label={{
                  value: t.constellation.xAxis,
                  position: "insideBottom",
                  offset: -16,
                  fill: "var(--color-muted)",
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="alt"
                name="alt"
                stroke="var(--color-muted)"
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                domain={[200, 600]}
                label={{
                  value: t.constellation.yAxis,
                  angle: -90,
                  position: "insideLeft",
                  fill: "var(--color-muted)",
                  fontSize: 11,
                }}
              />
              <Tooltip
                cursor={{ stroke: "var(--color-border-strong)" }}
                content={({ payload }) => {
                  const p = payload?.[0]?.payload as
                    | { name: string; norad: number; days: number; alt: number }
                    | undefined;
                  if (!p) return null;
                  return (
                    <div className="rounded-[var(--radius-sm)] border border-border bg-elevated px-2 py-1.5 text-xs">
                      {p.name} · {p.norad}
                      <br />
                      {p.days.toFixed(0)} d · {p.alt.toFixed(0)} km
                    </div>
                  );
                }}
              />
              {cfg.groups.map((g) => {
                const data = points.filter((p) => p.group === g.id);
                if (data.length === 0) return null;
                return (
                  <Scatter
                    key={g.id}
                    name={g.label[lang]}
                    data={data}
                    fill={GROUP_COLORS[g.id] ?? "var(--color-fg)"}
                    onClick={(d: { norad?: number }) => {
                      if (d?.norad) select(d.norad);
                    }}
                  />
                );
              })}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 max-w-[75ch] text-xs text-muted">{t.constellation.caption}</p>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-elevated text-[11px] uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">{t.constellation.table.name}</th>
              <th className="px-3 py-2 font-medium">{t.constellation.table.norad}</th>
              <th className="px-3 py-2 font-medium">{t.constellation.table.group}</th>
              <th className="px-3 py-2 font-medium">{t.constellation.table.status}</th>
              <th className="px-3 py-2 font-medium">{t.constellation.table.alt}</th>
              <th className="px-3 py-2 font-medium">{t.constellation.table.inc}</th>
              <th className="px-3 py-2 font-medium">{t.constellation.table.period}</th>
              <th className="px-3 py-2 font-medium">{t.constellation.table.perigee}</th>
              <th className="px-3 py-2 font-medium">{t.constellation.table.apogee}</th>
              <th className="px-3 py-2 font-medium">{t.constellation.table.epoch}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.norad}
                onClick={() => select(row.norad)}
                className={cn(
                  "cursor-pointer border-t border-border hover:bg-elevated",
                  selected === row.norad && "bg-elevated",
                )}
              >
                <td className="px-3 py-2">
                  {row.name}
                  {row.stale ? (
                    <span className="ml-2 text-[10px] uppercase text-status-stale">
                      {t.status.stale}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{row.norad}</td>
                <td className="px-3 py-2 text-xs">{groupLabel(lang, row.group, row.group)}</td>
                <td className="px-3 py-2">
                  <StatusChip lang={lang} status={row.status} />
                </td>
                <td className="px-3 py-2 font-mono text-xs tabular">
                  {row.approxAltitudeKm != null ? row.approxAltitudeKm.toFixed(0) : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs tabular">
                  {row.inclinationDeg != null ? row.inclinationDeg.toFixed(2) : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs tabular">
                  {row.periodMin != null ? row.periodMin.toFixed(2) : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs tabular">
                  {row.perigeeKm != null ? row.perigeeKm.toFixed(0) : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs tabular">
                  {row.apogeeKm != null ? row.apogeeKm.toFixed(0) : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs tabular">
                  {row.epoch ? row.epoch.replace("T", " ").slice(0, 16) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface p-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl tabular">{value}</p>
    </div>
  );
}
