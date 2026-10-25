export {
  CLIMB_KM_PER_DAY,
  CLIMB_MIN_POINTS,
  CLIMB_MIN_SPAN_MS,
  CLIMB_WINDOW_MS,
  HISTORY_STALE_MS,
  climbClass,
  climbRate,
  epochToMs,
  formatClimbRate,
  leastSquaresSlope,
  rateIsStale,
} from "./climb-rate.mjs";

export type ClimbClass = "climbing" | "holding" | "decaying";

export type ClimbRate = {
  kmPerDay: number;
  klass: ClimbClass;
  points: number;
  spanHours: number;
  droppedOutlier: boolean;
};
