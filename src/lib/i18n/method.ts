import type { Lang } from "@/lib/catalog/types";

export type MethodSection = {
  id?: string;
  heading: string;
  paragraphs: string[];
  quote?: string;
  bullets?: string[];
};

export function methodSections(lang: Lang): MethodSection[] {
  return CONTENT[lang];
}

const CONTENT: Record<Lang, MethodSection[]> = {
  en: [
    {
      heading: "Data source and refresh",
      paragraphs: [
        "Orbital data are public general-perturbations (GP) element sets from CelesTrak (JSON GP). Element sets are what catalogs often call TLEs (two-line elements). The server fetches them about every ten minutes and caches the result. If the live fetch fails, a dated checked-in snapshot is used and labelled as such. This site does not invent ephemeris and does not fit custom orbits.",
        "The user-agent on catalog requests identifies this app as an unofficial geometric coverage tracker. No Space-Track credentials are shipped to the browser.",
      ],
    },
    {
      heading: "Propagation and Earth model",
      paragraphs: [
        "Positions are propagated with SGP4/SDP4 as implemented by satellite.js from the published element set. Elevation, footprints, and the altitude proxy use a spherical Earth with Re = 6371 km. That is good enough for an MVP coverage clock; it is not a precision orbit determination.",
        "Sampling step is 30 seconds. Displayed AOS/LOS are linearly interpolated between steps and should be read as ±30 s. Passes shorter than 60 seconds after interpolation are discarded.",
      ],
    },
    {
      heading: "Coverage (this site)",
      quote:
        "Coverage (this site): at least one catalogued Rassvet object is above elevation E over point P, using public element sets.",
      paragraphs: [
        "That is the only definition used for the Now tile, the Today minutes, the city chips, the map footprints, and the next-window countdown.",
      ],
    },
    {
      heading: "Geometric line-of-sight only",
      paragraphs: [
        "Every minute, window, and footprint is geometric line-of-sight: at least one catalogued object above the elevation mask. That is the whole claim.",
      ],
      bullets: [
        "Never linked — not a terminal attached, not a session, not inter-satellite links.",
        "Never encrypted.",
        "Never military-ready.",
        "Never 24-hour service.",
      ],
    },
    {
      heading: "Why 10° / 25° / 40°",
      paragraphs: [
        "10° is near-horizon geometric visibility. 25° is a conservative comms-like mask and the default. 40° is a stricter mask. None of these is a measured Bureau 1440 requirement. They exist so a reader can see how sensitive the minutes are to the assumed minimum elevation.",
      ],
    },
    {
      heading: "Why 480 km is the Raised gate",
      paragraphs: [
        "Public reporting on the first production batch describes flattening near about 500–550 km, not the 800 km figure that appears in filings and brochures. This site treats 480 km as a product constant for “raised”: catalogued, not decayed, with an approximate altitude from the latest element set of at least 480 km. The 800 km figure is not used as an operational gate.",
        "Approximate altitude is a − Re from mean motion (semi-major axis minus 6371 km), labelled approx. Perigee and apogee use the same a with the published eccentricity.",
      ],
    },
    {
      heading: "Which satellites count",
      paragraphs: [
        "The default coverage set is production RASSVET-3 at or above 480 km. Experimental Rassvet-1 (2023) and Rassvet-2 (2024) stay out of that default. They are separate choices in the population list. They are included when the choice is every raised object or every catalogued object. A shared link with no set parameter opens the default. A link that still says set=raised or set=operational opens every raised object, including the experimentals.",
        "An object below 480 km counts as climbing only when it is not on the manual not-climbing list. That list is a curated override, the same kind of list as the decayed NORADs. Objects on it still have an element set. They can appear in a launch-group count or in all catalogued objects, with the status not climbing. They are left out of the climbing population, so the clock does not describe them as climbing toward service.",
        "This site stores one latest element set per object. It does not keep altitude history, and it does not turn that element set’s mean-motion derivative into a kilometres-per-day rate. A single derivative is a short-arc fit. Checked on 2026-10-11, it disagreed in size with rates from a history of element sets, and for one still-climbing object it disagreed in sign. The not-climbing entries checked that day are RASSVET-3 14, 17, and 23. RASSVET-3 11 is not on the list. The check used the public altitude history at findrassvet.ru (V. Bulybenko). That site’s figures are available under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). This page names the objects. It does not copy those rates. If an object on the list later reaches 480 km, the raised gate wins and the catalog check asks for the list to be updated.",
      ],
    },
    {
      heading: "Window versus pass",
      paragraphs: [
        "A pass is one object above the mask. A window is the union of all such intervals: overlapping satellites do not double-count minutes. The Today tile and city chips use windows. The pass list is per-object so an analyst can see who is contributing. That split is deliberate.",
      ],
    },
    {
      id: "stale-element-sets",
      heading: "Stale element sets",
      paragraphs: [
        "If the newest GP epoch for an object is older than 72 hours, the object is marked stale and still propagated, with a warning. Missing IDs that remain in the curated list but have no element set are marked missing and are omitted from Now / Today / footprints. Decayed IDs on the manual override list (and any object whose perigee is persistently below 150 km) are excluded from coverage.",
        "A failed live fetch, or any element set past 72 hours, is called out in the header. Today minutes stay on screen, with a short mark when that snapshot or those element sets are what the count uses.",
      ],
    },
    {
      heading: "Clock within ±48 hours",
      paragraphs: [
        "The Ukraine page can hold its clock anywhere within 48 hours of wall-clock now. While the clock is held, the live tick pauses. Map positions, who is above the mask, footprints, tracks, the Today tile, city minutes, the next-window countdown, and the pass list are recomputed at that instant. “Today” is the held clock’s calendar day in the timezone you picked (Kyiv, UTC, or Moscow). The pass list is the 36 hours after the held clock, not the next 36 hours from wall-clock now.",
        "The scrubber shades the union of geometric line-of-sight windows across the whole ±48 hours. Those bands are sampled every 60 seconds so the strip can be recomputed without following the one-second tick; the pass list stays on a 30-second step. Choosing a band holds the clock at that window’s acquisition, not at peak elevation.",
        "The elements are still the latest public GP from CelesTrak, not an archived historical set. Geometric line-of-sight is propagated from those elements to the selected instant. Accuracy degrades away from the element epoch. Climbing or maneuvering objects can look wrong in the past or the future, because an orbit raise is not replayed.",
      ],
    },
  ],
  uk: [
    {
      heading: "Джерело даних і оновлення",
      paragraphs: [
        "Орбітальні дані — публічні набори елементів загальних збурень (GP) з CelesTrak (JSON GP). Набори елементів — це те, що в каталогах часто називають TLE (дворядкові елементи). Сервер запитує їх приблизно кожні десять хвилин і кешує результат. Якщо живе завантаження не вдається, використовується датований збережений знімок і це позначено. Сайт не вигадує ефемериди і не підганяє власні орбіти.",
        "User-agent запитів до каталогу називає цей застосунок неофіційним трекером геометричного покриття. Облікові дані Space-Track у браузер не потрапляють.",
      ],
    },
    {
      heading: "Прогноз і модель Землі",
      paragraphs: [
        "Положення прогнозуються SGP4/SDP4 у реалізації satellite.js з опублікованого набору елементів. Кут місця, зони видимості й наближена висота використовують сферичну Землю з Re = 6371 км. Цього досить для годинника покриття MVP; це не точне визначення орбіти.",
        "Крок дискретизації — 30 секунд. Показані AOS/LOS лінійно інтерполюються між кроками і їх слід читати як ±30 с. Проходження коротші за 60 секунд після інтерполяції відкидаються.",
      ],
    },
    {
      heading: "Покриття (цей сайт)",
      quote:
        "Покриття (цей сайт): принаймні один каталожний об’єкт Rassvet є вище кута місця E над точкою P за публічними наборами елементів.",
      paragraphs: [
        "Це єдине визначення для плитки «Зараз», хвилин «Сьогодні», міських чипів, контурів на карті та зворотного відліку до наступного вікна.",
      ],
    },
    {
      heading: "Лише геометрична пряма видимість",
      paragraphs: [
        "Кожна хвилина, вікно й контур — геометрична пряма видимість: принаймні один каталожний об’єкт вище маски кута місця. Це й усе твердження.",
      ],
      bullets: [
        "Ніколи не зв’язок — не захоплений термінал, не сеанс, не міжсупутникові канали.",
        "Ніколи не шифрування.",
        "Ніколи не військова готовність.",
        "Ніколи не цілодобова служба.",
      ],
    },
    {
      heading: "Навіщо 10° / 25° / 40°",
      paragraphs: [
        "10° — майже горизонтна геометрична видимість. 25° — консервативна «зв’язкова» маска і значення за замовчуванням. 40° — суворіша маска. Жодне з них не є виміряною вимогою Бюро 1440. Вони потрібні, щоб читач бачив, наскільки хвилини залежать від припущеного мінімального кута місця.",
      ],
    },
    {
      heading: "Чому 480 км — поріг «піднятих»",
      paragraphs: [
        "Публічні матеріали про першу серійну партію описують вирівнювання біля 500–550 км, а не 800 км із заявок і буклетів. Цей сайт бере 480 км як продуктову сталу для «піднятий»: у каталозі, не зійшов, наближена висота з останнього набору елементів не менша за 480 км. Цифра 800 км не використовується як робочий поріг.",
        "Наближена висота — a − Re з середнього руху (велика піввісь мінус 6371 км). Перигей і апогей — той самий a з опублікованим ексцентриситетом.",
      ],
    },
    {
      heading: "Які супутники входять у рахунок",
      paragraphs: [
        "Набір покриття за замовчуванням — серійні RASSVET-3 на висоті від 480 км. Експериментальні Рассвет-1 (2023) і Рассвет-2 (2024) у цей набір не входять. Вони є окремими пунктами списку. Вони входять, коли обрано всі підняті або всі каталожні об’єкти. Посилання без параметра набору відкриває набір за замовчуванням. Посилання, у якому й далі написано set=raised або set=operational, відкриває всі підняті об’єкти, включно з експериментальними.",
        "Об’єкт нижче 480 км вважається таким, що піднімається, лише якщо його немає в ручному списку «не піднімається». Цей список — курована підміна, того ж роду, що й список зійшлих NORAD. Об’єкти з нього й далі мають набір елементів. Вони можуть з’явитися в ліку групи запуску або серед усіх каталожних, зі статусом «не піднімається». З набору «піднімаються» їх виключено, тож годинник не описує їх як підйом до робочої висоти.",
        "Сайт зберігає один найновіший набір елементів на об’єкт. Він не тримає історії висоти і не перетворює похідну середнього руху цього набору на темп у кілометрах за добу. Одна похідна — це підгонка короткої дуги. На перевірці 2026-10-11 вона розійшлася за величиною з темпами з історії наборів, а для одного об’єкта, що й далі піднімається, розійшлася й за знаком. Записи «не піднімається», звірені того дня: RASSVET-3 14, 17 і 23. RASSVET-3 11 у списку немає. Звірку зроблено за публічною історією висоти на findrassvet.ru (В. Булибенко). Матеріали того сайту доступні на умовах CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Ця сторінка називає об’єкти. Вона не копіює ті темпи. Якщо об’єкт зі списку згодом досягає 480 км, поріг «піднятий» перемагає, а перевірка каталогу просить оновити список.",
      ],
    },
    {
      heading: "Вікно і проходження",
      paragraphs: [
        "Проходження — один об’єкт вище маски. Вікно — об’єднання всіх таких інтервалів: перетини не подвоюють хвилини. Плитка «Сьогодні» і міські чипи використовують вікна. Таблиця проходжень — пооб’єктна, щоб було видно, хто додається. Цей поділ навмисний.",
      ],
    },
    {
      id: "stale-element-sets",
      heading: "Застарілі набори елементів",
      paragraphs: [
        "Якщо найновіша епоха GP для об’єкта старіша за 72 години, об’єкт позначається як застарілий і все одно прогнозується, з попередженням. Ідентифікатори з курованого списку без набору елементів позначаються як відсутні й не входять у «Зараз» / «Сьогодні» / контури. Зійшлі ідентифікатори з ручного списку (і будь-який об’єкт із перигеєм нижче 150 км) з покриття виключені.",
        "Невдале живе завантаження або набір елементів старший за 72 години позначено в шапці. Хвилини «Сьогодні» лишаються на екрані, з короткою позначкою, якщо лік узято з того знімка чи з тих наборів.",
      ],
    },
    {
      heading: "Годинник у межах ±48 годин",
      paragraphs: [
        "Сторінка «Україна» може утримати годинник будь-де в межах 48 годин від стінного зараз. Поки годинник утримано, живий секундний хід зупинено. Позиції на карті, хто вище маски, контури, треки, плитка «Сьогодні», міські хвилини, відлік до наступного вікна і список проходжень перераховуються на цей момент. «Сьогодні» — календарний день утриманого годинника в обраному поясі (Київ, UTC або Москва). Список проходжень — 36 годин після утриманого годинника, а не наступні 36 годин від стінного зараз.",
        "На шкалі годинника зафарбовано об’єднання вікон геометричної прямої видимості на всі ±48 годин. Ці смуги дискретизовано кожні 60 секунд, щоб смуга перераховувалась без секундного ходу; список проходжень лишається з кроком 30 секунд. Вибір смуги утримує годинник на заході цього вікна, а не на максимумі кута місця.",
        "Елементи й далі є найновішим публічним GP з CelesTrak, а не архівним історичним набором. Геометричну пряму видимість прогнозовано з цих елементів на вибраний момент. Точність падає далі від епохи елементів. Апарати, що піднімаються чи маневрують, можуть виглядати хибно в минулому чи майбутньому, бо підйом орбіти не відтворюється.",
      ],
    },
  ],
  ru: [
    {
      heading: "Источник данных и обновление",
      paragraphs: [
        "Орбитальные данные — публичные наборы элементов общих возмущений (GP) с CelesTrak (JSON GP). Наборы элементов — это то, что в каталогах часто называют TLE (двухстрочные элементы). Сервер запрашивает их примерно каждые десять минут и кэширует результат. Если живая загрузка не удаётся, используется датированный сохранённый снимок, и это обозначено. Сайт не выдумывает эфемериды и не подгоняет собственные орбиты.",
        "User-agent запросов к каталогу называет это приложение неофициальным трекером геометрического покрытия. Учётные данные Space-Track в браузер не попадают.",
      ],
    },
    {
      heading: "Прогноз и модель Земли",
      paragraphs: [
        "Положения прогнозируются SGP4/SDP4 в реализации satellite.js по опубликованному набору элементов. Угол места, зоны видимости и приближённая высота используют сферическую Землю с Re = 6371 км. Этого достаточно для часов покрытия MVP; это не точное определение орбиты.",
        "Шаг дискретизации — 30 секунд. Показанные AOS/LOS линейно интерполируются между шагами и их следует читать как ±30 с. Прохождения короче 60 секунд после интерполяции отбрасываются.",
      ],
    },
    {
      heading: "Покрытие (этот сайт)",
      quote:
        "Покрытие (этот сайт): по крайней мере один каталожный объект Rassvet находится выше угла места E над точкой P по публичным наборам элементов.",
      paragraphs: [
        "Это единственное определение для плитки «Сейчас», минут «Сегодня», городских чипов, контуров на карте и обратного отсчёта до следующего окна.",
      ],
    },
    {
      heading: "Только геометрическая прямая видимость",
      paragraphs: [
        "Каждая минута, окно и контур — геометрическая прямая видимость: по крайней мере один каталожный объект выше маски угла места. Это и всё утверждение.",
      ],
      bullets: [
        "Никогда не связь — не захваченный терминал, не сеанс, не межспутниковые каналы.",
        "Никогда не шифрование.",
        "Никогда не военная готовность.",
        "Никогда не круглосуточная служба.",
      ],
    },
    {
      heading: "Зачем 10° / 25° / 40°",
      paragraphs: [
        "10° — почти горизонтная геометрическая видимость. 25° — консервативная «связная» маска и значение по умолчанию. 40° — более строгая маска. Ни одно из них не является измеренным требованием Бюро 1440. Они нужны, чтобы читатель видел, насколько минуты зависят от предполагаемого минимального угла места.",
      ],
    },
    {
      heading: "Почему 480 км — порог «поднятых»",
      paragraphs: [
        "Публичные материалы о первой серийной партии описывают выравнивание около 500–550 км, а не 800 км из заявок и буклетов. Этот сайт берёт 480 км как продуктовую константу для «поднят»: в каталоге, не сошёл, приближённая высота из последнего набора элементов не меньше 480 км. Цифра 800 км не используется как рабочий порог.",
        "Приближённая высота — a − Re из среднего движения (большая полуось минус 6371 км). Перигей и апогей — тот же a с опубликованным эксцентриситетом.",
      ],
    },
    {
      heading: "Какие спутники входят в счёт",
      paragraphs: [
        "Набор покрытия по умолчанию — серийные RASSVET-3 на высоте от 480 км. Экспериментальные Рассвет-1 (2023) и Рассвет-2 (2024) в этот набор не входят. Они стоят отдельными пунктами списка. Они входят, когда выбраны все поднятые или все каталожные объекты. Ссылка без параметра набора открывает набор по умолчанию. Ссылка, в которой по-прежнему написано set=raised или set=operational, открывает все поднятые объекты, включая экспериментальные.",
        "Объект ниже 480 км считается поднимающимся, только если его нет в ручном списке «не поднимается». Этот список — курируемая подмена, того же рода, что и список сошедших NORAD. Объекты из него по-прежнему имеют набор элементов. Они могут появиться в счёте группы запуска или среди всех каталожных, со статусом «не поднимается». Из набора «поднимаются» они исключены, поэтому часы не описывают их как подъём к рабочей высоте.",
        "Сайт хранит один новейший набор элементов на объект. Он не хранит историю высоты и не превращает производную среднего движения этого набора в темп в километрах в сутки. Одна производная — это подгонка короткой дуги. На проверке 2026-10-11 она разошлась по величине с темпами из истории наборов, а для одного объекта, который продолжает подниматься, разошлась и по знаку. Записи «не поднимается», сверенные в тот день: RASSVET-3 14, 17 и 23. RASSVET-3 11 в списке нет. Сверку сделали по публичной истории высоты на findrassvet.ru (В. Булыбенко). Материалы того сайта доступны на условиях CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Эта страница называет объекты. Она не копирует те темпы. Если объект из списка позже достигает 480 км, порог «поднят» побеждает, а проверка каталога просит обновить список.",
      ],
    },
    {
      heading: "Окно и прохождение",
      paragraphs: [
        "Прохождение — один объект выше маски. Окно — объединение всех таких интервалов: пересечения не удваивают минуты. Плитка «Сегодня» и городские чипы используют окна. Таблица прохождений — пообъектная, чтобы было видно, кто добавляется. Это разделение намеренное.",
      ],
    },
    {
      id: "stale-element-sets",
      heading: "Устаревшие наборы элементов",
      paragraphs: [
        "Если новейшая эпоха GP для объекта старше 72 часов, объект помечается как устаревший и всё равно прогнозируется, с предупреждением. Идентификаторы из курируемого списка без набора элементов помечаются как отсутствующие и не входят в «Сейчас» / «Сегодня» / контуры. Сошедшие идентификаторы из ручного списка (и любой объект с перигеем ниже 150 км) из покрытия исключены.",
        "Неудавшаяся живая загрузка или набор элементов старше 72 часов отмечены в шапке. Минуты «Сегодня» остаются на экране, с короткой пометкой, если счёт взят из того снимка или из тех наборов.",
      ],
    },
    {
      heading: "Часы в пределах ±48 часов",
      paragraphs: [
        "Страница «Украина» может удержать часы в любой точке в пределах 48 часов от стенного сейчас. Пока часы удержаны, живой секундный ход остановлен. Позиции на карте, кто выше маски, контуры, треки, плитка «Сегодня», городские минуты, отсчёт до следующего окна и список прохождений пересчитываются на этот момент. «Сегодня» — календарный день удержанных часов в выбранном поясе (Киев, UTC или Москва). Список прохождений — 36 часов после удержанных часов, а не следующие 36 часов от стенного сейчас.",
        "На шкале часов закрашено объединение окон геометрической прямой видимости на все ±48 часов. Эти полосы дискретизированы каждые 60 секунд, чтобы шкала пересчитывалась без секундного хода; список прохождений остаётся с шагом 30 секунд. Выбор полосы удерживает часы на захвате этого окна, а не на максимуме угла места.",
        "Элементы по-прежнему новейший публичный GP с CelesTrak, а не архивный исторический набор. Геометрическая прямая видимость прогнозируется из этих элементов на выбранный момент. Точность падает дальше от эпохи элементов. Аппараты, которые поднимаются или маневрируют, могут выглядеть неверно в прошлом или будущем, потому что подъём орбиты не воспроизводится.",
      ],
    },
  ],
};
