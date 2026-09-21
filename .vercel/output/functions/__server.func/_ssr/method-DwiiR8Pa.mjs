import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as Route$1 } from "./router-CCWJ48vk.mjs";
import { i as getDict, t as LangFrame } from "./lang-frame-Ch5hd8Ay.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/method-DwiiR8Pa.js
var import_jsx_runtime = require_jsx_runtime();
function methodSections(lang) {
	return CONTENT[lang];
}
var CONTENT = {
	en: [
		{
			heading: "Unofficial status",
			paragraphs: ["This is an unofficial public calculator. It is not a Bureau 1440 product, not a government product, and not affiliated with any ministry, armed force, or operator. Catalog names such as RASSVET-3 are transcribed from public NORAD / CelesTrak listings."]
		},
		{
			heading: "Data source and refresh",
			paragraphs: ["Orbital data are public general-perturbations (GP) element sets from CelesTrak (JSON GP). The server fetches them about every ten minutes and caches the result. If the live fetch fails, a dated checked-in snapshot is used and labelled as such. This site does not invent ephemeris and does not fit custom orbits.", "The user-agent on catalog requests identifies this app as an unofficial geometric coverage tracker. No Space-Track credentials are shipped to the browser."]
		},
		{
			heading: "Propagation and Earth model",
			paragraphs: ["Positions are propagated with SGP4/SDP4 as implemented by satellite.js from the published element set. Elevation, footprints, and the altitude proxy use a spherical Earth with Re = 6371 km. That is good enough for an MVP coverage clock; it is not a precision orbit determination.", "Sampling step is 30 seconds. Displayed AOS/LOS are linearly interpolated between steps and should be read as ±30 s. Passes shorter than 60 seconds after interpolation are discarded."]
		},
		{
			heading: "Coverage (this site)",
			quote: "Coverage (this site): at least one catalogued Rassvet object is above elevation E over point P, using public TLEs.",
			paragraphs: ["That is the only definition used for the Now tile, the Today minutes, the city chips, the map footprints, and the next-window countdown."]
		},
		{
			heading: "What the numbers are not",
			paragraphs: [
				"Not “a terminal has a lock”.",
				"Not “capacity for N users”.",
				"Not “24-hour service”.",
				"Not “the constellation is operational at 800 km”.",
				"Not proof of encryption, inter-satellite links, gateway routing, or any military function. Geometric line-of-sight is a necessary condition for a link, not a sufficient one."
			]
		},
		{
			heading: "Why 10° / 25° / 40°",
			paragraphs: ["10° is near-horizon geometric visibility. 25° is a conservative comms-like mask and the default. 40° is a stricter mask. None of these is a measured Bureau 1440 requirement. They exist so a reader can see how sensitive the minutes are to the assumed minimum elevation."]
		},
		{
			heading: "Why 480 km is the Raised gate",
			paragraphs: ["Public reporting on the first production batch describes flattening near about 500–550 km, not the 800 km figure that appears in filings and brochures. This site treats 480 km as a product constant for “raised”: catalogued, not decayed, with an approximate altitude from the latest element set of at least 480 km. The 800 km figure is not used as an operational gate.", "Approximate altitude is a − Re from mean motion (semi-major axis minus 6371 km), labelled approx. Perigee and apogee use the same a with the published eccentricity."]
		},
		{
			heading: "Window versus pass",
			paragraphs: ["A pass is one object above the mask. A window is the union of all such intervals: overlapping satellites do not double-count minutes. The Today tile and city chips use windows. The pass list is per-object so an analyst can see who is contributing. That split is deliberate."]
		},
		{
			heading: "Stale element sets",
			paragraphs: ["If the newest GP epoch for an object is older than 72 hours, the object is marked stale and still propagated, with a warning. Missing IDs that remain in the curated list but have no TLE are marked missing and are omitted from Now / Today / footprints. Decayed IDs on the manual override list (and any object whose perigee is persistently below 150 km) are excluded from coverage."]
		},
		{
			heading: "Public program figures (claims, not this site’s measurements)",
			paragraphs: [
				"Operator / state figures often cited: on the order of 250–292 satellites by 2027 for an initial operational constellation, later growth toward ~700–900.",
				"Analyst figures often cited: continuous service (not mere line-of-sight) discussed in the 200–250 satellite range.",
				"Reporting through mid/late 2026: production batches of 16, orbit raise to ~500 km rather than the 800 km filing, roughly two longer geometric windows per day over Ukraine once the first batch flattened, four line-of-sight passes of which only some are high elevation.",
				"Those sentences belong here, not on the homepage, unless the live calculator currently agrees."
			]
		},
		{
			heading: "What this site will never show",
			paragraphs: ["Unit positions, front lines, frequencies, waveforms, terminal installation guides, jamming recipes, or any targeting language. The curated NORAD list lives in a config file so a new launch group can be added without rewriting the app."]
		}
	],
	uk: [
		{
			heading: "Неофіційний статус",
			paragraphs: ["Це неофіційний публічний калькулятор. Це не продукт Бюро 1440, не державний продукт і не пов’язано з жодним міністерством, силою чи оператором. Каталожні назви на кшталт RASSVET-3 переписані з публічних переліків NORAD / CelesTrak."]
		},
		{
			heading: "Джерело даних і оновлення",
			paragraphs: ["Орбітальні дані — публічні набори елементів загальних збурень (GP) з CelesTrak (JSON GP). Сервер запитує їх приблизно кожні десять хвилин і кешує результат. Якщо живе завантаження не вдається, використовується датований збережений знімок і це позначено. Сайт не вигадує ефемериди і не підганяє власні орбіти.", "User-agent запитів до каталогу називає цей застосунок неофіційним трекером геометричного покриття. Облікові дані Space-Track у браузер не потрапляють."]
		},
		{
			heading: "Прогноз і модель Землі",
			paragraphs: ["Положення прогнозуються SGP4/SDP4 у реалізації satellite.js з опублікованого набору елементів. Кут місця, зони видимості й наближена висота використовують сферичну Землю з Re = 6371 км. Цього досить для годинника покриття MVP; це не точне визначення орбіти.", "Крок дискретизації — 30 секунд. Показані AOS/LOS лінійно інтерполюються між кроками і їх слід читати як ±30 с. Проходження коротші за 60 секунд після інтерполяції відкидаються."]
		},
		{
			heading: "Покриття (цей сайт)",
			quote: "Покриття (цей сайт): принаймні один каталожний об’єкт Rassvet є вище кута місця E над точкою P за публічними TLE.",
			paragraphs: ["Це єдине визначення для плитки «Зараз», хвилин «Сьогодні», міських чипів, контурів на карті та зворотного відліку до наступного вікна."]
		},
		{
			heading: "Чим ці числа не є",
			paragraphs: [
				"Не «термінал захопив сигнал».",
				"Не «ємність на N користувачів».",
				"Не «цілодобова служба».",
				"Не «угруповання робоче на 800 км».",
				"Не доказ шифрування, міжсупутникових каналів, маршрутизації через шлюзи чи будь-якої військової функції. Геометрична пряма видимість — необхідна, але не достатня умова зв’язку."
			]
		},
		{
			heading: "Навіщо 10° / 25° / 40°",
			paragraphs: ["10° — майже горизонтна геометрична видимість. 25° — консервативна «зв’язкова» маска і значення за замовчуванням. 40° — суворіша маска. Жодне з них не є виміряною вимогою Бюро 1440. Вони потрібні, щоб читач бачив, наскільки хвилини залежать від припущеного мінімального кута місця."]
		},
		{
			heading: "Чому 480 км — поріг «піднятих»",
			paragraphs: ["Публічні матеріали про першу серійну партію описують вирівнювання біля 500–550 км, а не 800 км із заявок і буклетів. Цей сайт бере 480 км як продуктову сталу для «піднятий»: у каталозі, не зійшов, наближена висота з останнього набору елементів не менша за 480 км. Цифра 800 км не використовується як робочий поріг.", "Наближена висота — a − Re з середнього руху (велика піввісь мінус 6371 км). Перигей і апогей — той самий a з опублікованим ексцентриситетом."]
		},
		{
			heading: "Вікно і проходження",
			paragraphs: ["Проходження — один об’єкт вище маски. Вікно — об’єднання всіх таких інтервалів: перетини не подвоюють хвилини. Плитка «Сьогодні» і міські чипи використовують вікна. Таблиця проходжень — пооб’єктна, щоб було видно, хто додається. Цей поділ навмисний."]
		},
		{
			heading: "Застарілі набори елементів",
			paragraphs: ["Якщо найновіша епоха GP для об’єкта старіша за 72 години, об’єкт позначається як застарілий і все одно прогнозується, з попередженням. Ідентифікатори з курованого списку без TLE позначаються як відсутні й не входять у «Зараз» / «Сьогодні» / контури. Зійшлі ідентифікатори з ручного списку (і будь-який об’єкт із перигеєм нижче 150 км) з покриття виключені."]
		},
		{
			heading: "Публічні цифри програми (твердження, не вимірювання цього сайту)",
			paragraphs: [
				"Цифри оператора / держави, які часто наводять: порядку 250–292 супутників до 2027 року для початкового робочого угруповання, далі зростання до ~700–900.",
				"Аналітичні оцінки, які часто наводять: безперервну службу (не лише пряму видимість) обговорюють у діапазоні 200–250 супутників.",
				"Репортажі до середини/кінця 2026: серійні партії по 16, підйом орбіти до ~500 км замість 800 км із заявки, приблизно два довші геометричні вікна на добу над Україною після вирівнювання першої партії, чотири проходження прямої видимості, з яких лише частина з високим кутом місця.",
				"Ці речення належать сюди, а не на головну, якщо живий калькулятор наразі з ними не збігається."
			]
		},
		{
			heading: "Чого цей сайт ніколи не покаже",
			paragraphs: ["Позиції підрозділів, лінію фронту, частоти, форми сигналу, інструкції з установлення терміналів, рецепти перешкод чи будь-яку мову цілевказання. Курований список NORAD лежить у конфігураційному файлі, щоб нову групу запуску можна було додати без переписування застосунку."]
		}
	],
	ru: [
		{
			heading: "Неофициальный статус",
			paragraphs: ["Это неофициальный публичный калькулятор. Это не продукт Бюро 1440, не государственный продукт и не связано ни с одним министерством, силой или оператором. Каталожные имена вроде RASSVET-3 переписаны из публичных перечней NORAD / CelesTrak."]
		},
		{
			heading: "Источник данных и обновление",
			paragraphs: ["Орбитальные данные — публичные наборы элементов общих возмущений (GP) с CelesTrak (JSON GP). Сервер запрашивает их примерно каждые десять минут и кэширует результат. Если живая загрузка не удаётся, используется датированный сохранённый снимок, и это обозначено. Сайт не выдумывает эфемериды и не подгоняет собственные орбиты.", "User-agent запросов к каталогу называет это приложение неофициальным трекером геометрического покрытия. Учётные данные Space-Track в браузер не попадают."]
		},
		{
			heading: "Прогноз и модель Земли",
			paragraphs: ["Положения прогнозируются SGP4/SDP4 в реализации satellite.js по опубликованному набору элементов. Угол места, зоны видимости и приближённая высота используют сферическую Землю с Re = 6371 км. Этого достаточно для часов покрытия MVP; это не точное определение орбиты.", "Шаг дискретизации — 30 секунд. Показанные AOS/LOS линейно интерполируются между шагами и их следует читать как ±30 с. Прохождения короче 60 секунд после интерполяции отбрасываются."]
		},
		{
			heading: "Покрытие (этот сайт)",
			quote: "Покрытие (этот сайт): по крайней мере один каталожный объект Rassvet находится выше угла места E над точкой P по публичным TLE.",
			paragraphs: ["Это единственное определение для плитки «Сейчас», минут «Сегодня», городских чипов, контуров на карте и обратного отсчёта до следующего окна."]
		},
		{
			heading: "Чем эти числа не являются",
			paragraphs: [
				"Не «терминал захватил сигнал».",
				"Не «ёмкость на N пользователей».",
				"Не «круглосуточная служба».",
				"Не «группировка рабочая на 800 км».",
				"Не доказательство шифрования, межспутниковых каналов, маршрутизации через шлюзы или какой-либо военной функции. Геометрическая прямая видимость — необходимое, но не достаточное условие связи."
			]
		},
		{
			heading: "Зачем 10° / 25° / 40°",
			paragraphs: ["10° — почти горизонтная геометрическая видимость. 25° — консервативная «связная» маска и значение по умолчанию. 40° — более строгая маска. Ни одно из них не является измеренным требованием Бюро 1440. Они нужны, чтобы читатель видел, насколько минуты зависят от предполагаемого минимального угла места."]
		},
		{
			heading: "Почему 480 км — порог «поднятых»",
			paragraphs: ["Публичные материалы о первой серийной партии описывают выравнивание около 500–550 км, а не 800 км из заявок и буклетов. Этот сайт берёт 480 км как продуктовую константу для «поднят»: в каталоге, не сошёл, приближённая высота из последнего набора элементов не меньше 480 км. Цифра 800 км не используется как рабочий порог.", "Приближённая высота — a − Re из среднего движения (большая полуось минус 6371 км). Перигей и апогей — тот же a с опубликованным эксцентриситетом."]
		},
		{
			heading: "Окно и прохождение",
			paragraphs: ["Прохождение — один объект выше маски. Окно — объединение всех таких интервалов: пересечения не удваивают минуты. Плитка «Сегодня» и городские чипы используют окна. Таблица прохождений — пообъектная, чтобы было видно, кто добавляется. Это разделение намеренное."]
		},
		{
			heading: "Устаревшие наборы элементов",
			paragraphs: ["Если новейшая эпоха GP для объекта старше 72 часов, объект помечается как устаревший и всё равно прогнозируется, с предупреждением. Идентификаторы из курируемого списка без TLE помечаются как отсутствующие и не входят в «Сейчас» / «Сегодня» / контуры. Сошедшие идентификаторы из ручного списка (и любой объект с перигеем ниже 150 км) из покрытия исключены."]
		},
		{
			heading: "Публичные цифры программы (утверждения, не измерения этого сайта)",
			paragraphs: [
				"Цифры оператора / государства, которые часто приводят: порядка 250–292 спутников к 2027 году для начальной рабочей группировки, далее рост к ~700–900.",
				"Аналитические оценки, которые часто приводят: непрерывную службу (не только прямую видимость) обсуждают в диапазоне 200–250 спутников.",
				"Репортажи к середине/концу 2026: серийные партии по 16, подъём орбиты к ~500 км вместо 800 км из заявки, примерно два более длинных геометрических окна в сутки над Украиной после выравнивания первой партии, четыре прохождения прямой видимости, из которых лишь часть с высоким углом места.",
				"Эти предложения принадлежат сюда, а не на главную, если живой калькулятор сейчас с ними не совпадает."
			]
		},
		{
			heading: "Чего этот сайт никогда не покажет",
			paragraphs: ["Позиции подразделений, линию фронта, частоты, формы сигнала, инструкции по установке терминалов, рецепты помех или любой язык целеуказания. Курируемый список NORAD лежит в конфигурационном файле, чтобы новую группу запуска можно было добавить без переписывания приложения."]
		}
	]
};
function MethodView({ lang }) {
	const t = getDict(lang);
	const sections = methodSections(lang);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "mx-auto max-w-[72ch] pb-16",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-2xl font-medium tracking-[-0.03em]",
				children: t.method.title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-muted",
				children: t.method.lede
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8 flex flex-col gap-10",
				children: sections.map((section) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-lg font-medium tracking-[-0.02em]",
						children: section.heading
					}),
					section.quote ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("blockquote", {
						className: "mt-4 border-l-2 border-accent bg-elevated px-4 py-3 text-sm leading-relaxed",
						children: section.quote
					}) : null,
					section.paragraphs.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm leading-relaxed text-fg/90",
						children: p
					}, p.slice(0, 40)))
				] }, section.heading))
			})
		]
	});
}
function MethodPage() {
	const { catalog } = Route$1.useLoaderData();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LangFrame, {
		current: "/method",
		catalog,
		children: (lang) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MethodView, { lang })
	});
}
//#endregion
export { MethodPage as component };
