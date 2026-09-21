import { i as __toESM } from "../_runtime.mjs";
import { c as formatCountdown, d as tzName, l as formatDayClock, o as PLACES, s as formatClock } from "./time-BqVPJKsl.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { a as groupLabel, i as getDict, n as cn, r as coverageSentence } from "./lang-frame-Ch5hd8Ay.mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ukraine-board-DjWwiutf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var useSelection = create((set) => ({
	norad: null,
	select: (norad) => set({ norad })
}));
var buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] text-sm font-medium transition-opacity duration-[var(--motion-quick,150ms)] disabled:opacity-40 disabled:pointer-events-none", {
	variants: {
		variant: {
			primary: "bg-accent text-accent-fg hover:opacity-90 px-3 py-2",
			ghost: "bg-transparent text-fg hover:bg-elevated border border-transparent px-3 py-2",
			outline: "border border-border bg-surface text-fg hover:border-border-strong px-3 py-2",
			chip: "border border-border bg-surface text-muted hover:text-fg px-2.5 py-1.5 text-xs"
		},
		size: {
			sm: "min-h-9",
			md: "min-h-11"
		}
	},
	defaultVariants: {
		variant: "outline",
		size: "sm"
	}
});
function Button({ className, variant, size, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
var ELS = [
	10,
	25,
	40
];
var SETS = [
	"raised",
	"all",
	"climbing",
	"exp-2023",
	"exp-2024",
	"prod-2026-03",
	"prod-2026-07"
];
function UkraineBoard({ lang, view, catalog, result, onChange }) {
	const t = getDict(lang);
	const zone = tzName(view.tz);
	const placeLabel = view.place === "custom" ? t.places.custom : t.places[view.place];
	const sentence = result ? coverageSentence(lang, {
		el: view.el,
		place: placeLabel,
		windows: result.todayWindowCount,
		minutes: result.todayMinutes
	}) : "…";
	const nowNames = result?.nowVisible ?? [];
	const shown = nowNames.slice(0, 4);
	const extra = Math.max(0, nowNames.length - 4);
	const longestObjs = (result?.longestToday?.objects ?? []).map((id) => catalog.objects.find((o) => o.norad === id)?.name ?? String(id)).join(", ");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tile, {
						label: t.tiles.now,
						hint: t.tiles.nowHint,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-3xl font-medium tracking-[-0.04em] tabular",
							children: result ? nowNames.length : "—"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-xs leading-relaxed text-muted",
							children: [result && nowNames.length === 0 ? t.tiles.emptyNow : shown.map((o) => o.name).join(" · "), extra ? ` ${t.tiles.more.replace("{n}", String(extra))}` : null]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tile, {
						label: t.tiles.today,
						hint: t.tiles.todayHint,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-3xl font-medium tracking-[-0.04em] tabular",
							children: [result ? result.todayMinutes : "—", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ml-2 text-lg text-muted",
								children: t.units.min
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted",
							children: result ? `${result.todayWindowCount} ${t.tiles.windows}` : "—"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tile, {
						label: t.tiles.longest,
						hint: t.tiles.longestHint,
						children: result?.longestToday ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-2xl font-medium tabular",
							children: [
								formatClock(new Date(result.longestToday.start), zone),
								"–",
								formatClock(new Date(result.longestToday.end), zone)
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-xs text-muted",
							children: [
								result.longestToday.durationMin,
								" ",
								t.units.min,
								" ·",
								" ",
								result.longestToday.peakElevationDeg.toFixed(0),
								t.units.deg,
								" · ",
								longestObjs || "—"
							]
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: result ? t.tiles.none : "—"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tile, {
						label: result?.next.state === "open" ? t.tiles.windowOpen : t.tiles.next,
						hint: result?.next.state === "open" ? t.tiles.toLos : t.tiles.toAos,
						children: result?.next.state === "open" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-4xl font-medium tabular",
							children: formatCountdown(result.next.remainingMs)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-xs text-muted",
							children: ["LOS ", formatClock(new Date(result.next.los), zone)]
						})] }) : result?.next.state === "later" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-4xl font-medium tabular",
							children: formatCountdown(result.next.inMs)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-xs text-muted",
							children: ["AOS ", formatDayClock(new Date(result.next.aos), zone)]
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: result ? t.tiles.none : "—"
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-[75ch] text-[13px] leading-snug text-fg/90",
				children: sentence
			}, `${lang}-${placeLabel}-${result?.todayMinutes}`),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ControlRow, {
				lang,
				view,
				onChange
			})
		]
	});
}
function Tile({ label, hint, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "rounded-[var(--radius-md)] border border-border bg-surface px-3 py-3 shadow-[var(--shadow-panel)]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[10px] font-medium uppercase tracking-[0.14em] text-muted",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-1 text-[10px] text-subtle",
				children: hint
			}),
			children
		]
	});
}
function ControlRow({ lang, view, onChange }) {
	const t = getDict(lang);
	const [latDraft, setLatDraft] = (0, import_react.useState)(String(view.lat));
	const [lonDraft, setLonDraft] = (0, import_react.useState)(String(view.lon));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: t.controls.location,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "control-select",
						value: view.place,
						onChange: (e) => {
							const id = e.target.value;
							if (id === "custom") {
								onChange({ place: "custom" });
								return;
							}
							const p = PLACES.find((x) => x.id === id);
							onChange({
								place: id,
								lat: p.lat,
								lon: p.lon
							});
							setLatDraft(String(p.lat));
							setLonDraft(String(p.lon));
						},
						children: [PLACES.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: p.id,
							children: t.places[p.id]
						}, p.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "custom",
							children: t.controls.custom
						})]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: t.controls.minEl,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						className: "control-select",
						value: view.el,
						onChange: (e) => onChange({ el: Number(e.target.value) }),
						children: ELS.map((el) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: el,
							children: [el, "°"]
						}, el))
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: t.controls.population,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						className: "control-select",
						value: view.set,
						onChange: (e) => onChange({ set: e.target.value }),
						children: SETS.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: id,
							children: t.population[id]
						}, id))
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: t.controls.timezone,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "control-select",
						value: view.tz,
						onChange: (e) => onChange({ tz: e.target.value }),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "kyiv",
								children: t.tz.kyiv
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "utc",
								children: t.tz.utc
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "moscow",
								children: t.tz.moscow
							})
						]
					})
				})
			]
		}), view.place === "custom" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-end gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: t.controls.lat,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "control-select w-36",
						inputMode: "decimal",
						value: latDraft,
						onChange: (e) => setLatDraft(e.target.value)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: t.controls.lon,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "control-select w-36",
						inputMode: "decimal",
						value: lonDraft,
						onChange: (e) => setLonDraft(e.target.value)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "primary",
					onClick: () => {
						const lat = Number(latDraft);
						const lon = Number(lonDraft);
						if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
						onChange({
							place: "custom",
							lat: Math.max(-90, Math.min(90, lat)),
							lon: Math.max(-180, Math.min(180, lon))
						});
					},
					children: t.controls.apply
				})
			]
		}) : null]
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted",
		children: [label, children]
	});
}
function CityStrip({ lang, result }) {
	const t = getDict(lang);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] font-medium uppercase tracking-[0.14em] text-muted",
				children: t.cityStrip.label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: t.cityStrip.hint
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-2",
				children: (result?.cityMinutes ?? []).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-full border border-border bg-elevated px-3 py-2 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted",
							children: t.places[c.placeId]
						}),
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono tabular",
							children: c.minutes
						}),
						" ",
						t.units.min
					]
				}, c.placeId))
			})
		]
	});
}
function PassTable({ lang, catalog, result, tz }) {
	const t = getDict(lang);
	const zone = tzName(tz);
	const selected = useSelection((s) => s.norad);
	const select = useSelection((s) => s.select);
	const now = Date.now();
	const rows = result?.passes36h ?? [];
	const nextId = (0, import_react.useMemo)(() => {
		const open = rows.find((r) => r.aos <= now && r.los > now);
		if (open) return open.norad + ":" + open.aos;
		const upcoming = rows.find((r) => r.aos > now);
		return upcoming ? upcoming.norad + ":" + upcoming.aos : null;
	}, [rows, now]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm font-medium",
				children: t.passList.title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-[75ch] text-xs text-muted",
				children: t.passList.hint
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto rounded-[var(--radius-md)] border border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[860px] border-collapse text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "bg-elevated text-[11px] uppercase tracking-[0.12em] text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.passList.aos
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.passList.los
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.passList.duration
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.passList.maxEl
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.passList.objects
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.passList.batch
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.passList.altitude
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: t.passList.status
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						colSpan: 8,
						className: "px-3 py-6 text-muted",
						children: t.passList.empty
					}) }) : rows.map((row) => {
						const key = row.norad + ":" + row.aos;
						const isSel = selected === row.norad || nextId === key;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							onClick: () => select(row.norad),
							className: cn("cursor-pointer border-t border-border hover:bg-elevated", isSel && "bg-elevated"),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-mono text-xs tabular",
									children: formatDayClock(new Date(row.aos), zone)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-mono text-xs tabular",
									children: formatDayClock(new Date(row.los), zone)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-3 py-2 font-mono text-xs tabular",
									children: [
										Math.round((row.los - row.aos) / 6e4),
										" ",
										t.units.min
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-3 py-2 font-mono text-xs tabular",
									children: [row.maxElevationDeg.toFixed(0), "°"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-3 py-2",
									children: [
										row.name,
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-xs text-muted",
											children: row.norad
										}),
										row.stale ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "ml-2 text-[10px] uppercase text-status-stale",
											children: t.status.stale
										}) : null
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-xs text-muted",
									children: groupLabel(lang, row.group, row.group)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-mono text-xs tabular",
									children: row.altitudeKm != null ? `${row.altitudeKm.toFixed(0)} km` : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusChip, {
										lang,
										status: row.status
									})
								})
							]
						}, key);
					}) })]
				})
			})
		]
	});
}
function StatusChip({ lang, status }) {
	const t = getDict(lang);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("text-xs font-medium", status === "raised" ? "text-status-raised" : status === "climbing" ? "text-status-climbing" : status === "decayed" ? "text-status-decay" : "text-status-stale"),
		children: t.status[status]
	});
}
//#endregion
export { UkraineBoard as a, StatusChip as i, CityStrip as n, useSelection as o, PassTable as r, Button as t };
