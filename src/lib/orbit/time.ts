import { TIMEZONES, type TimezoneId } from "./constants.ts";

export function tzName(id: TimezoneId): string {
  return TIMEZONES[id];
}

function wallParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const hourRaw = get("hour");
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(hourRaw === "24" ? "0" : hourRaw),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

/** Milliseconds the zone wall clock is ahead of UTC at `date`. */
export function zoneOffsetMs(date: Date, timeZone: string): number {
  const w = wallParts(date, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - date.getTime();
}

/** Convert a wall-clock civil time in `timeZone` to a UTC Date. */
export function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const instant = guess - zoneOffsetMs(new Date(guess), timeZone);
  return new Date(guess - zoneOffsetMs(new Date(instant), timeZone));
}

export function zonedDayBounds(date: Date, timeZone: string): { start: Date; end: Date } {
  const w = wallParts(date, timeZone);
  const start = zonedLocalToUtc(w.year, w.month, w.day, 0, 0, 0, timeZone);
  const next = new Date(Date.UTC(w.year, w.month - 1, w.day + 1));
  const end = zonedLocalToUtc(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    0,
    0,
    0,
    timeZone,
  );
  return { start, end };
}

export function formatInZone(
  date: Date,
  timeZone: string,
  opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  },
): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, ...opts }).format(date);
}

export function formatClock(date: Date, timeZone: string): string {
  return formatInZone(date, timeZone, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

export function formatDayClock(date: Date, timeZone: string): string {
  return formatInZone(date, timeZone, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export function hoursOld(epochIso: string, now: Date): number {
  const iso = epochIso.endsWith("Z") ? epochIso : `${epochIso}Z`;
  return (now.getTime() - Date.parse(iso)) / 3_600_000;
}

export function formatCountdown(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const abs = Math.abs(ms);
  const totalSec = Math.floor(abs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 48) {
    const d = Math.floor(h / 24);
    return `${sign}${d}d ${h % 24}h`;
  }
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
