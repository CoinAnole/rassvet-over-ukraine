import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { _ as Link, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/lang-frame-Ch5hd8Ay.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var DICTS = {
	en: {
		productTitle: "Rassvet over Ukraine",
		productSubtitle: "Unofficial geometric coverage estimate from public orbit catalogs",
		badge: "Not affiliated with Bureau 1440 or any government",
		nav: {
			"ukraine": "Ukraine today",
			"constellation": "Constellation",
			"method": "Method"
		},
		lang: {
			"en": "EN",
			"uk": "UK",
			"ru": "RU"
		},
		header: {
			"catalogEpoch": "Newest element-set epoch",
			"fetchedAt": "Last successful fetch",
			"sourceLive": "CelesTrak GP",
			"sourceSeed": "checked-in snapshot",
			"utc": "UTC"
		},
		tiles: {
			"now": "Now",
			"nowHint": "catalogued objects above the mask",
			"today": "Today",
			"todayHint": "union of geometric windows",
			"windows": "windows",
			"longest": "Longest window today",
			"longestHint": "start–end, duration, peak elevation",
			"next": "Next window",
			"windowOpen": "Window open",
			"toLos": "to line-of-sight end",
			"toAos": "to next acquisition",
			"none": "No window in the computed span",
			"emptyNow": "None above the mask",
			"more": "+{n} more"
		},
		units: {
			"min": "min",
			"deg": "°",
			"km": "km"
		},
		sentence: "At {el}° minimum elevation over {place}, the current catalog produces {n} {windows} today totalling {minutes} minutes. This is geometric line-of-sight from public orbit data, not proof that a terminal can attach, that capacity exists, or that inter-satellite links are on.",
		windowWordOne: "window",
		windowWordMany: "windows",
		controls: {
			"location": "Location",
			"minEl": "Min elevation",
			"population": "Population",
			"timezone": "Timezone",
			"custom": "Custom lat/lon",
			"lat": "Latitude",
			"lon": "Longitude",
			"apply": "Apply"
		},
		places: {
			"kyiv": "Kyiv",
			"kharkiv": "Kharkiv",
			"dnipro": "Dnipro",
			"odesa": "Odesa",
			"zaporizhzhia": "Zaporizhzhia",
			"donetsk": "Donetsk",
			"sevastopol": "Sevastopol",
			"custom": "Custom point"
		},
		population: {
			"raised": "Raised only (≥ 480 km)",
			"all": "All catalogued Rassvet",
			"climbing": "Climbing (< 480 km)",
			"exp-2023": "Experimental 2023",
			"exp-2024": "Experimental 2024",
			"prod-2026-03": "Production Mar 2026",
			"prod-2026-07": "Production Jul 2026"
		},
		tz: {
			"kyiv": "Kyiv",
			"utc": "UTC",
			"moscow": "Moscow"
		},
		passList: {
			"title": "Next 36 hours",
			"hint": "Per-object geometric passes. Overlapping objects are listed separately; the Today tile unions them into windows. AOS/LOS stepped at 30 s with linear interpolation, labelled ±30 s.",
			"aos": "AOS",
			"los": "LOS",
			"duration": "Duration",
			"maxEl": "Max el.",
			"objects": "Object",
			"batch": "Batch",
			"altitude": "Altitude",
			"status": "Status",
			"empty": "No geometric passes in the next 36 hours for this point, mask, and population."
		},
		status: {
			"climbing": "climbing",
			"raised": "raised",
			"decayed": "decayed",
			"missing": "missing",
			"stale": "stale TLE"
		},
		map: {
			"reset": "Reset view",
			"observer": "Ground point",
			"mask": "min elevation"
		},
		cityStrip: {
			"label": "Same mask and population, other cities",
			"hint": "Does not follow the location picker. Minutes are today’s union at the selected elevation."
		},
		constellation: {
			"title": "Constellation",
			"caption": "Each point is a public catalog element set. Objects raise themselves over weeks to months. A launch does not equal coverage that week.",
			"xAxis": "Days since launch",
			"yAxis": "Approx. altitude (a − Re), km",
			"onOrbit": "Catalogued on orbit",
			"raised": "Raised (≥ 480 km)",
			"climbing": "Climbing",
			"decayed": "Decayed / lost",
			"groups": "Launch groups",
			"hideDecayed": "Hide decayed",
			"filterGroup": "Launch group",
			"allGroups": "All groups",
			"table": {
				"name": "Name",
				"norad": "NORAD",
				"group": "Launch group",
				"status": "Status",
				"alt": "Approx. alt. km",
				"inc": "Incl. deg",
				"period": "Period min",
				"perigee": "Perigee km",
				"apogee": "Apogee km",
				"epoch": "TLE epoch",
				"sets": "Element sets"
			}
		},
		method: {
			"title": "Method",
			"lede": "This page is the contract. Numbers on the other screens are only as good as the definitions below."
		},
		warning: "Warning",
		staleBanner: "One or more element sets are older than 72 hours. Positions are still propagated, with a stale mark."
	},
	uk: {
		productTitle: "Рассвет над Україною",
		productSubtitle: "Неофіційна оцінка геометричного покриття з публічних орбітальних каталогів",
		badge: "Не пов’язано з Бюро 1440 і з жодним урядом",
		nav: {
			"ukraine": "Україна сьогодні",
			"constellation": "Угруповання",
			"method": "Метод"
		},
		lang: {
			"en": "EN",
			"uk": "UK",
			"ru": "RU"
		},
		header: {
			"catalogEpoch": "Найсвіжіша епоха елементів",
			"fetchedAt": "Останнє успішне завантаження",
			"sourceLive": "CelesTrak GP",
			"sourceSeed": "збережений знімок",
			"utc": "UTC"
		},
		tiles: {
			"now": "Зараз",
			"nowHint": "каталожні об’єкти вище маски",
			"today": "Сьогодні",
			"todayHint": "об’єднання геометричних вікон",
			"windows": "вікон",
			"longest": "Найдовше вікно сьогодні",
			"longestHint": "початок–кінець, тривалість, пік висоти",
			"next": "Наступне вікно",
			"windowOpen": "Вікно відкрите",
			"toLos": "до кінця прямої видимості",
			"toAos": "до наступного захоплення",
			"none": "Немає вікна в обчисленому інтервалі",
			"emptyNow": "Нічого вище маски",
			"more": "+ще {n}"
		},
		units: {
			"min": "хв",
			"deg": "°",
			"km": "км"
		},
		sentence: "За мінімальної висоти {el}° над пунктом «{place}» чинний каталог дає сьогодні {n} {windows} сумарно {minutes} хв. Це геометрична пряма видимість з відкритих орбітальних даних, а не доказ, що термінал може приєднатися, що є ємність або що міжсупутникові канали увімкнені.",
		windowWordOne: "вікно",
		windowWordFew: "вікна",
		windowWordMany: "вікон",
		controls: {
			"location": "Місце",
			"minEl": "Мін. висота",
			"population": "Сукупність",
			"timezone": "Часовий пояс",
			"custom": "Власні широта/довгота",
			"lat": "Широта",
			"lon": "Довгота",
			"apply": "Застосувати"
		},
		places: {
			"kyiv": "Київ",
			"kharkiv": "Харків",
			"dnipro": "Дніпро",
			"odesa": "Одеса",
			"zaporizhzhia": "Запоріжжя",
			"donetsk": "Донецьк",
			"sevastopol": "Севастополь",
			"custom": "Довільна точка"
		},
		population: {
			"raised": "Лише підняті (≥ 480 км)",
			"all": "Усі каталожні Rassvet",
			"climbing": "Ще піднімаються (< 480 км)",
			"exp-2023": "Експериментальні 2023",
			"exp-2024": "Експериментальні 2024",
			"prod-2026-03": "Серійні, бер. 2026",
			"prod-2026-07": "Серійні, лип. 2026"
		},
		tz: {
			"kyiv": "Київ",
			"utc": "UTC",
			"moscow": "Москва"
		},
		passList: {
			"title": "Наступні 36 годин",
			"hint": "Пооб’єктні геометричні проходження. Перетини в таблиці окремо; плитка «Сьогодні» об’єднує їх у вікна. AOS/LOS з кроком 30 с і лінійною інтерполяцією, позначка ±30 с.",
			"aos": "AOS",
			"los": "LOS",
			"duration": "Тривалість",
			"maxEl": "Макс. ел.",
			"objects": "Об’єкт",
			"batch": "Партія",
			"altitude": "Висота",
			"status": "Статус",
			"empty": "Немає геометричних проходжень у наступні 36 годин для цієї точки, маски й сукупності."
		},
		status: {
			"climbing": "піднімається",
			"raised": "піднятий",
			"decayed": "зійшов",
			"missing": "немає TLE",
			"stale": "застарілий TLE"
		},
		map: {
			"reset": "Скинути вид",
			"observer": "Наземна точка",
			"mask": "мін. висота"
		},
		cityStrip: {
			"label": "Та сама маска й сукупність, інші міста",
			"hint": "Не залежить від вибору місця. Хвилини — сьогоднішнє об’єднання на вибраній висоті."
		},
		constellation: {
			"title": "Угруповання",
			"caption": "Кожна точка — опублікований набір елементів. Апарати піднімають орбіту тижнями й місяцями. Запуск не означає покриття того ж тижня.",
			"xAxis": "Дні від запуску",
			"yAxis": "Наближена висота (a − Re), км",
			"onOrbit": "У каталозі на орбіті",
			"raised": "Підняті (≥ 480 км)",
			"climbing": "Піднімаються",
			"decayed": "Зійшли / втрачені",
			"groups": "Групи запусків",
			"hideDecayed": "Приховати зійшлі",
			"filterGroup": "Група запуску",
			"allGroups": "Усі групи",
			"table": {
				"name": "Назва",
				"norad": "NORAD",
				"group": "Група",
				"status": "Статус",
				"alt": "Вис. км (набл.)",
				"inc": "Нахил, °",
				"period": "Період, хв",
				"perigee": "Перигей, км",
				"apogee": "Апогей, км",
				"epoch": "Епоха TLE",
				"sets": "Наборів"
			}
		},
		method: {
			"title": "Метод",
			"lede": "Ця сторінка — договір. Цифри на інших екранах мають сенс лише разом із визначеннями нижче."
		},
		warning: "Увага",
		staleBanner: "Один або кілька наборів елементів старіші за 72 години. Позиції все одно прогнозуються, зі позначкою застарілості."
	},
	ru: {
		productTitle: "Рассвет над Украиной",
		productSubtitle: "Неофициальная оценка геометрического покрытия по публичным орбитальным каталогам",
		badge: "Не связано с Бюро 1440 и ни с одним правительством",
		nav: {
			"ukraine": "Украина сегодня",
			"constellation": "Группировка",
			"method": "Метод"
		},
		lang: {
			"en": "EN",
			"uk": "UK",
			"ru": "RU"
		},
		header: {
			"catalogEpoch": "Новейшая эпоха элементов",
			"fetchedAt": "Последняя успешная загрузка",
			"sourceLive": "CelesTrak GP",
			"sourceSeed": "сохранённый снимок",
			"utc": "UTC"
		},
		tiles: {
			"now": "Сейчас",
			"nowHint": "каталожные объекты выше маски",
			"today": "Сегодня",
			"todayHint": "объединение геометрических окон",
			"windows": "окон",
			"longest": "Самое длинное окно сегодня",
			"longestHint": "начало–конец, длительность, пик возвышения",
			"next": "Следующее окно",
			"windowOpen": "Окно открыто",
			"toLos": "до конца прямой видимости",
			"toAos": "до следующего захвата",
			"none": "Нет окна в расчётном интервале",
			"emptyNow": "Ничего выше маски",
			"more": "+ещё {n}"
		},
		units: {
			"min": "мин",
			"deg": "°",
			"km": "км"
		},
		sentence: "При минимальном угле места {el}° над точкой «{place}» текущий каталог даёт сегодня {n} {windows} суммарно {minutes} мин. Это геометрическая прямая видимость по открытым орбитальным данным, а не доказательство, что терминал может присоединиться, что есть ёмкость или что межспутниковые каналы включены.",
		windowWordOne: "окно",
		windowWordFew: "окна",
		windowWordMany: "окон",
		controls: {
			"location": "Место",
			"minEl": "Мин. угол места",
			"population": "Совокупность",
			"timezone": "Часовой пояс",
			"custom": "Свои широта/долгота",
			"lat": "Широта",
			"lon": "Долгота",
			"apply": "Применить"
		},
		places: {
			"kyiv": "Киев",
			"kharkiv": "Харьков",
			"dnipro": "Днепр",
			"odesa": "Одесса",
			"zaporizhzhia": "Запорожье",
			"donetsk": "Донецк",
			"sevastopol": "Севастополь",
			"custom": "Произвольная точка"
		},
		population: {
			"raised": "Только поднятые (≥ 480 км)",
			"all": "Все каталожные Rassvet",
			"climbing": "Ещё поднимаются (< 480 км)",
			"exp-2023": "Экспериментальные 2023",
			"exp-2024": "Экспериментальные 2024",
			"prod-2026-03": "Серийные, март 2026",
			"prod-2026-07": "Серийные, июль 2026"
		},
		tz: {
			"kyiv": "Киев",
			"utc": "UTC",
			"moscow": "Москва"
		},
		passList: {
			"title": "Следующие 36 часов",
			"hint": "Пообъектные геометрические прохождения. Пересечения в таблице отдельно; плитка «Сегодня» объединяет их в окна. AOS/LOS с шагом 30 с и линейной интерполяцией, метка ±30 с.",
			"aos": "AOS",
			"los": "LOS",
			"duration": "Длительность",
			"maxEl": "Макс. эл.",
			"objects": "Объект",
			"batch": "Партия",
			"altitude": "Высота",
			"status": "Статус",
			"empty": "Нет геометрических прохождений в ближайшие 36 часов для этой точки, маски и совокупности."
		},
		status: {
			"climbing": "поднимается",
			"raised": "поднят",
			"decayed": "сошёл",
			"missing": "нет TLE",
			"stale": "устаревший TLE"
		},
		map: {
			"reset": "Сбросить вид",
			"observer": "Наземная точка",
			"mask": "мин. угол места"
		},
		cityStrip: {
			"label": "Та же маска и совокупность, другие города",
			"hint": "Не следует за выбором места. Минуты — сегодняшнее объединение на выбранном угле места."
		},
		constellation: {
			"title": "Группировка",
			"caption": "Каждая точка — опубликованный набор элементов. Аппараты поднимают орбиту неделями и месяцами. Запуск не равен покрытию на той же неделе.",
			"xAxis": "Сутки с запуска",
			"yAxis": "Прибл. высота (a − Re), км",
			"onOrbit": "В каталоге на орбите",
			"raised": "Поднятые (≥ 480 км)",
			"climbing": "Поднимаются",
			"decayed": "Сошли / потеряны",
			"groups": "Группы запусков",
			"hideDecayed": "Скрыть сошедшие",
			"filterGroup": "Группа запуска",
			"allGroups": "Все группы",
			"table": {
				"name": "Имя",
				"norad": "NORAD",
				"group": "Группа",
				"status": "Статус",
				"alt": "Выс. км (прибл.)",
				"inc": "Накл., °",
				"period": "Период, мин",
				"perigee": "Перигей, км",
				"apogee": "Апогей, км",
				"epoch": "Эпоха TLE",
				"sets": "Наборов"
			}
		},
		method: {
			"title": "Метод",
			"lede": "Эта страница — договор. Цифры на других экранах имеют смысл только вместе с определениями ниже."
		},
		warning: "Внимание",
		staleBanner: "Один или несколько наборов элементов старше 72 часов. Положения всё равно прогнозируются, с пометкой устаревания."
	}
};
var STORAGE_KEY = "rassvet-lang";
function isLang(v) {
	return v === "en" || v === "uk" || v === "ru";
}
function detectLang(override, acceptLanguage) {
	if (isLang(override)) return override;
	if (typeof window !== "undefined") {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (isLang(stored)) return stored;
		const nav = window.navigator.language.toLowerCase();
		if (nav.startsWith("uk")) return "uk";
		if (nav.startsWith("ru")) return "ru";
	}
	const al = (acceptLanguage ?? "").toLowerCase();
	if (al.includes("uk")) return "uk";
	if (al.includes("ru")) return "ru";
	return "en";
}
function persistLang(lang) {
	if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, lang);
}
function getDict(lang) {
	return DICTS[lang];
}
function slavicPlural(n, one, few, many) {
	const n10 = n % 10;
	const n100 = n % 100;
	if (n10 === 1 && n100 !== 11) return one;
	if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
	return many;
}
function windowWord(lang, n) {
	const d = getDict(lang);
	if (lang === "en") return n === 1 ? d.windowWordOne : d.windowWordMany;
	return slavicPlural(n, d.windowWordOne, d.windowWordFew ?? d.windowWordMany, d.windowWordMany);
}
function coverageSentence(lang, args) {
	return getDict(lang).sentence.replaceAll("{el}", String(args.el)).replaceAll("{place}", args.place).replaceAll("{n}", String(args.windows)).replaceAll("{windows}", windowWord(lang, args.windows)).replaceAll("{minutes}", String(args.minutes));
}
function groupLabel(lang, groupId, fallback) {
	const d = getDict(lang);
	const key = groupId;
	return d.population[key] ?? fallback;
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var NAV = [
	{
		to: "/",
		key: "ukraine"
	},
	{
		to: "/constellation",
		key: "constellation"
	},
	{
		to: "/method",
		key: "method"
	}
];
function AppShell({ lang, onLang, fetchedAt, newestEpoch, source, warning, children, current }) {
	const t = getDict(lang);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "border-b border-border bg-bg",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-2 md:px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-x-4 gap-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-baseline gap-x-3 gap-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "font-sans text-lg font-medium tracking-[-0.03em] text-fg md:text-xl",
								children: t.productTitle
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "rounded-[var(--radius-xs)] border border-border-strong bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-accent",
								children: t.badge
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-0.5 text-[11px] text-muted",
							children: t.productSubtitle
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex rounded-[var(--radius-sm)] border border-border bg-surface p-0.5",
							children: [
								"en",
								"uk",
								"ru"
							].map((code) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => onLang(code),
								className: cn("min-h-9 min-w-10 rounded-[6px] px-2 text-xs font-medium", lang === code ? "bg-elevated text-fg" : "text-muted hover:text-fg"),
								"aria-pressed": lang === code,
								children: t.lang[code]
							}, code))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "font-mono text-[10px] leading-snug text-muted tabular",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								t.header.catalogEpoch,
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-fg",
									children: newestEpoch ? `${newestEpoch} UTC` : "—"
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								t.header.fetchedAt,
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-fg",
									children: fetchedAt ? `${fetchedAt} UTC` : "—"
								}),
								source ? ` · ${source === "live" ? t.header.sourceLive : t.header.sourceSeed}` : null
							] })]
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: "flex flex-wrap gap-1",
						"aria-label": "Primary",
						children: NAV.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: item.to,
							className: cn("min-h-9 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm", current === item.to ? "bg-elevated text-fg" : "text-muted hover:bg-surface hover:text-fg"),
							children: t.nav[item.key]
						}, item.to))
					}), warning ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "max-w-[60ch] text-[11px] text-status-climbing",
						children: [
							t.warning,
							": ",
							warning
						]
					}) : null]
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
			className: "mx-auto max-w-[1400px] px-4 py-3 md:px-6",
			children
		})]
	});
}
function newestEpoch(catalog) {
	if (!catalog) return null;
	let best = null;
	for (const o of catalog.objects) {
		if (!o.epoch) continue;
		if (!best || o.epoch > best) best = o.epoch;
	}
	return best ? best.replace("T", " ").slice(0, 16) : null;
}
function fetchedLabel(catalog) {
	if (!catalog?.fetchedAt) return null;
	return catalog.fetchedAt.replace("T", " ").replace("Z", "").slice(0, 16);
}
function LangFrame({ current, catalog, langParam, children }) {
	const navigate = useNavigate();
	const [stored, setStored] = (0, import_react.useState)(() => detectLang(langParam));
	const lang = isLang(langParam) ? langParam : stored;
	const onLang = (0, import_react.useCallback)((next) => {
		setStored(next);
		persistLang(next);
		if (current === "/") navigate({
			to: "/",
			search: (prev) => ({
				...prev,
				lang: next
			}),
			replace: true
		});
	}, [navigate, current]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		lang,
		onLang,
		fetchedAt: fetchedLabel(catalog),
		newestEpoch: newestEpoch(catalog),
		source: catalog.source,
		warning: catalog.warning,
		current,
		children: children(lang)
	});
}
//#endregion
export { groupLabel as a, getDict as i, cn as n, coverageSentence as r, LangFrame as t };
