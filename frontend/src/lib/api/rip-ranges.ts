// Lab val_help bounds for RIP numeric leaves (the same on VyOS 1.4 and 1.5).
export const DISTANCE_RANGE = { min: 1, max: 255 };
export const METRIC_RANGE = { min: 1, max: 16 };
export const TIMER_RANGE = { min: 5, max: 2147483647 };

export interface NumberRange {
  min: number;
  max: number;
}

/** True for an empty value or a plain decimal integer inside the range. */
export function inRange(value: string, range: NumberRange): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (!/^\d{1,10}$/.test(trimmed)) return false;
  const n = Number(trimmed);
  return n >= range.min && n <= range.max;
}

/** First out-of-range overview value, as a `validation.*` message key. */
export function overviewProblem(
  distance: string,
  metric: string,
  timers: string[],
): "distanceRange" | "metricRange" | "timerRange" | null {
  if (!inRange(distance, DISTANCE_RANGE)) return "distanceRange";
  if (!inRange(metric, METRIC_RANGE)) return "metricRange";
  if (!timers.every((v) => inRange(v, TIMER_RANGE))) return "timerRange";
  return null;
}
