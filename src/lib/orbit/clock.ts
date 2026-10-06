/** Geometric coverage may be evaluated this far from wall-clock now. */
export const CLOCK_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Pass list and next-window search run this far after the selected clock. */
export const PASS_HORIZON_MS = 36 * 60 * 60 * 1000;

export type ClockClamp = {
  at: number;
  clamped: boolean;
};

/** Freeze of the coverage clock. `wall` is the real now used to measure the offset. */
export type HeldClock = {
  at: number;
  wall: number;
  clamped: boolean;
};

export function clampToClockWindow(
  targetMs: number,
  wallNowMs: number,
  windowMs = CLOCK_WINDOW_MS,
): ClockClamp {
  if (!Number.isFinite(wallNowMs)) return { at: 0, clamped: true };
  if (!Number.isFinite(targetMs)) return { at: wallNowMs, clamped: true };
  const min = wallNowMs - windowMs;
  const max = wallNowMs + windowMs;
  if (targetMs < min) return { at: min, clamped: true };
  if (targetMs > max) return { at: max, clamped: true };
  return { at: targetMs, clamped: false };
}

/** `null` means stay on the live tick (offset 0). */
export function holdFromHours(hours: number, wallNowMs: number): HeldClock | null {
  if (!Number.isFinite(hours) || hours === 0) return null;
  const { at, clamped } = clampToClockWindow(wallNowMs + hours * 3_600_000, wallNowMs);
  if (at === wallNowMs) return null;
  return { at, wall: wallNowMs, clamped };
}

export function holdFromTarget(targetMs: number, wallNowMs: number): HeldClock | null {
  const { at, clamped } = clampToClockWindow(targetMs, wallNowMs);
  if (!clamped && at === wallNowMs) return null;
  return { at, wall: wallNowMs, clamped };
}

/** A pass belongs on the list when it is still open at `now` or starts inside the forward horizon. */
export function passInForwardWindow(
  aos: number,
  los: number,
  nowMs: number,
  horizonMs = PASS_HORIZON_MS,
): boolean {
  return los > nowMs && aos < nowMs + horizonMs;
}

export function formatClockOffset(ms: number, hour = "h", minute = "min"): string {
  const sign = ms < 0 ? "−" : ms > 0 ? "+" : "";
  const totalMin = Math.round(Math.abs(ms) / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (totalMin === 0) return `0 ${hour}`;
  if (h === 0) return `${sign}${m} ${minute}`;
  if (m === 0) return `${sign}${h} ${hour}`;
  return `${sign}${h} ${hour} ${m} ${minute}`;
}
