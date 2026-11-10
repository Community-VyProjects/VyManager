/** Known web-proxy time-period day tokens.

The value sent to VyOS stays the token. Call sites map a known token to
`webproxy.period.days.<token>` and pass anything else through unchanged.
 */
export const TIME_PERIOD_DAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "weekdays",
  "weekend",
  "all",
] as const;

export type TimePeriodDayKey = (typeof TIME_PERIOD_DAYS)[number];

export function timePeriodDayKey(day: string): TimePeriodDayKey | null {
  return (TIME_PERIOD_DAYS as readonly string[]).includes(day) ? (day as TimePeriodDayKey) : null;
}
