//#region node_modules/.nitro/vite/services/ssr/assets/time-BqVPJKsl.js
/** Spherical Earth radius used for altitude proxy, elevation, and footprints. */
var EARTH_RADIUS_KM = 6371;
/** WGS-72 / SGP4 conventional GM, km^3/s^2. */
var MU_KM3_S2 = 398600.4418;
var TIMEZONES = {
	kyiv: "Europe/Kyiv",
	utc: "UTC",
	moscow: "Europe/Moscow"
};
var PLACES = [
	{
		id: "kyiv",
		lat: 50.4501,
		lon: 30.5234
	},
	{
		id: "kharkiv",
		lat: 49.9935,
		lon: 36.2304
	},
	{
		id: "dnipro",
		lat: 48.4647,
		lon: 35.0462
	},
	{
		id: "odesa",
		lat: 46.4825,
		lon: 30.7233
	},
	{
		id: "zaporizhzhia",
		lat: 47.8388,
		lon: 35.1396
	},
	{
		id: "donetsk",
		lat: 48.0159,
		lon: 37.8028
	},
	{
		id: "sevastopol",
		lat: 44.6167,
		lon: 33.5254
	}
];
var CITY_STRIP = [
	"kyiv",
	"kharkiv",
	"odesa"
];
var MAP_BOUNDS = [[41, 22], [54, 45]];
var MAP_CENTER = [48.4, 32.5];
function tzName(id) {
	return TIMEZONES[id];
}
function wallParts(date, timeZone) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		hour12: false,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23"
	}).formatToParts(date);
	const get = (type) => parts.find((p) => p.type === type)?.value ?? "0";
	const hourRaw = get("hour");
	return {
		year: Number(get("year")),
		month: Number(get("month")),
		day: Number(get("day")),
		hour: Number(hourRaw === "24" ? "0" : hourRaw),
		minute: Number(get("minute")),
		second: Number(get("second"))
	};
}
/** Milliseconds the zone wall clock is ahead of UTC at `date`. */
function zoneOffsetMs(date, timeZone) {
	const w = wallParts(date, timeZone);
	return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - date.getTime();
}
/** Convert a wall-clock civil time in `timeZone` to a UTC Date. */
function zonedLocalToUtc(year, month, day, hour, minute, second, timeZone) {
	const guess = Date.UTC(year, month - 1, day, hour, minute, second);
	const instant = guess - zoneOffsetMs(new Date(guess), timeZone);
	return new Date(guess - zoneOffsetMs(new Date(instant), timeZone));
}
function zonedDayBounds(date, timeZone) {
	const w = wallParts(date, timeZone);
	const start = zonedLocalToUtc(w.year, w.month, w.day, 0, 0, 0, timeZone);
	const next = new Date(Date.UTC(w.year, w.month - 1, w.day + 1));
	return {
		start,
		end: zonedLocalToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0, 0, timeZone)
	};
}
function formatInZone(date, timeZone, opts = {
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23"
}) {
	return new Intl.DateTimeFormat("en-GB", {
		timeZone,
		...opts
	}).format(date);
}
function formatClock(date, timeZone) {
	return formatInZone(date, timeZone, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23"
	});
}
function formatDayClock(date, timeZone) {
	return formatInZone(date, timeZone, {
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23"
	});
}
function hoursOld(epochIso, now) {
	const iso = epochIso.endsWith("Z") ? epochIso : `${epochIso}Z`;
	return (now.getTime() - Date.parse(iso)) / 36e5;
}
function formatCountdown(ms) {
	const sign = ms < 0 ? "-" : "";
	const totalSec = Math.floor(Math.abs(ms) / 1e3);
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor(totalSec % 3600 / 60);
	const s = totalSec % 60;
	if (h > 48) return `${sign}${Math.floor(h / 24)}d ${h % 24}h`;
	return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
//#endregion
export { MU_KM3_S2 as a, formatCountdown as c, tzName as d, zonedDayBounds as f, MAP_CENTER as i, formatDayClock as l, EARTH_RADIUS_KM as n, PLACES as o, MAP_BOUNDS as r, formatClock as s, CITY_STRIP as t, hoursOld as u };
