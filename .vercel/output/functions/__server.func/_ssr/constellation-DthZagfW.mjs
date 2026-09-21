import { i as __toESM } from "../_runtime.mjs";
import { n as getObjectsConfig } from "./build-DrYIAIh6.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { r as Route$2 } from "./router-D7mrBxJ1.mjs";
import { a as groupLabel, i as getDict, n as cn, t as LangFrame } from "./lang-frame-Ch5hd8Ay.mjs";
import { i as StatusChip, o as useSelection } from "./ukraine-board-DjWwiutf.mjs";
import { a as CartesianGrid, i as Scatter, n as YAxis, o as ResponsiveContainer, r as XAxis, s as Tooltip, t as ScatterChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/constellation-DthZagfW.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var GROUP_COLORS = {
	"exp-2023": "var(--color-muted)",
	"exp-2024": "var(--color-accent)",
	"prod-2026-03": "var(--color-status-raised)",
	"prod-2026-07": "var(--color-status-climbing)",
	unassigned: "var(--color-subtle)"
};
function ConstellationView({ lang, catalog }) {
	const t = getDict(lang);
	const cfg = getObjectsConfig();
	const [hideDecayed, setHideDecayed] = (0, import_react.useState)(true);
	const [group, setGroup] = (0, import_react.useState)("all");
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
	const points = (0, import_react.useMemo)(() => {
		const now = Date.now();
		return rows.filter((o) => o.approxAltitudeKm != null && o.launchDate).map((o) => {
			const days = (now - Date.parse(o.launchDate + "T00:00:00Z")) / 864e5;
			return {
				norad: o.norad,
				name: o.name,
				group: o.group,
				days: Number(days.toFixed(1)),
				alt: Number(o.approxAltitudeKm.toFixed(1)),
				fill: GROUP_COLORS[o.group] ?? "var(--color-fg)"
			};
		});
	}, [rows]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 md:grid-cols-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: t.constellation.onOrbit,
						value: onOrbit.length
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: t.constellation.raised,
						value: raised.length
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: t.constellation.climbing,
						value: climbing.length
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: t.constellation.decayed,
						value: decayed.length
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: t.constellation.groups,
						value: cfg.groups.filter((g) => g.id !== "unassigned").length
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center gap-2 text-sm text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: hideDecayed,
						onChange: (e) => setHideDecayed(e.target.checked)
					}), t.constellation.hideDecayed]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center gap-2 text-sm text-muted",
					children: [t.constellation.filterGroup, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "control-select w-auto min-w-48",
						value: group,
						onChange: (e) => setGroup(e.target.value),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "all",
							children: t.constellation.allGroups
						}), cfg.groups.filter((g) => g.id !== "unassigned").map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: g.id,
							children: g.label[lang]
						}, g.id))]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-[var(--radius-lg)] border border-border bg-surface p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-[320px] w-full",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
						width: "100%",
						height: "100%",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ScatterChart, {
							margin: {
								top: 12,
								right: 12,
								bottom: 28,
								left: 8
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
									stroke: "var(--color-border)",
									strokeDasharray: "3 3"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
									type: "number",
									dataKey: "days",
									name: "days",
									stroke: "var(--color-muted)",
									tick: {
										fill: "var(--color-muted)",
										fontSize: 11
									},
									label: {
										value: t.constellation.xAxis,
										position: "insideBottom",
										offset: -16,
										fill: "var(--color-muted)",
										fontSize: 11
									}
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
									type: "number",
									dataKey: "alt",
									name: "alt",
									stroke: "var(--color-muted)",
									tick: {
										fill: "var(--color-muted)",
										fontSize: 11
									},
									domain: [200, 600],
									label: {
										value: t.constellation.yAxis,
										angle: -90,
										position: "insideLeft",
										fill: "var(--color-muted)",
										fontSize: 11
									}
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
									cursor: { stroke: "var(--color-border-strong)" },
									content: ({ payload }) => {
										const p = payload?.[0]?.payload;
										if (!p) return null;
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-[var(--radius-sm)] border border-border bg-elevated px-2 py-1.5 text-xs",
											children: [
												p.name,
												" · ",
												p.norad,
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
												p.days.toFixed(0),
												" d · ",
												p.alt.toFixed(0),
												" km"
											]
										});
									}
								}),
								cfg.groups.map((g) => {
									const data = points.filter((p) => p.group === g.id);
									if (data.length === 0) return null;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scatter, {
										name: g.label[lang],
										data,
										fill: GROUP_COLORS[g.id] ?? "var(--color-fg)",
										onClick: (d) => {
											if (d?.norad) select(d.norad);
										}
									}, g.id);
								})
							]
						})
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-[75ch] text-xs text-muted",
					children: t.constellation.caption
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto rounded-[var(--radius-md)] border border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[980px] border-collapse text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "bg-elevated text-[11px] uppercase tracking-[0.12em] text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.constellation.table.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.constellation.table.norad
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.constellation.table.group
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.constellation.table.status
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.constellation.table.alt
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.constellation.table.inc
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.constellation.table.period
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.constellation.table.perigee
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.constellation.table.apogee
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.constellation.table.epoch
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						onClick: () => select(row.norad),
						className: cn("cursor-pointer border-t border-border hover:bg-elevated", selected === row.norad && "bg-elevated"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "px-3 py-2",
								children: [row.name, row.stale ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-2 text-[10px] uppercase text-status-stale",
									children: t.status.stale
								}) : null]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-mono text-xs",
								children: row.norad
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs",
								children: groupLabel(lang, row.group, row.group)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusChip, {
									lang,
									status: row.status
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-mono text-xs tabular",
								children: row.approxAltitudeKm != null ? row.approxAltitudeKm.toFixed(0) : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-mono text-xs tabular",
								children: row.inclinationDeg != null ? row.inclinationDeg.toFixed(2) : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-mono text-xs tabular",
								children: row.periodMin != null ? row.periodMin.toFixed(2) : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-mono text-xs tabular",
								children: row.perigeeKm != null ? row.perigeeKm.toFixed(0) : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-mono text-xs tabular",
								children: row.apogeeKm != null ? row.apogeeKm.toFixed(0) : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-mono text-xs tabular",
								children: row.epoch ? row.epoch.replace("T", " ").slice(0, 16) : "—"
							})
						]
					}, row.norad)) })]
				})
			})
		]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-[var(--radius-md)] border border-border bg-surface p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[11px] uppercase tracking-[0.12em] text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 font-mono text-2xl tabular",
			children: value
		})]
	});
}
function ConstellationPage() {
	const { catalog } = Route$2.useLoaderData();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LangFrame, {
		current: "/constellation",
		catalog,
		children: (lang) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConstellationView, {
			lang,
			catalog
		})
	});
}
//#endregion
export { ConstellationPage as component };
