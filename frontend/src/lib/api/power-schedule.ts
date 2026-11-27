import type { PowerActionRequest } from "./power";

// Same checks as backend/routers/power/power.py: powerctrl reads 'at' as HH:MM
// (24-hour) and 'in' as a whole number of minutes, here 1 to 9999999
// (leading zeros dropped).
const AT_TIME = /^(?:[01]?[0-9]|2[0-3]):[0-5]?[0-9]$/;
const IN_MINUTES = /^[1-9][0-9]{0,6}$/;

export type ScheduleProblem = "enterTime" | "invalidTime" | "enterMinutes" | "invalidMinutes";

export type ScheduleCheck =
  | { request: PowerActionRequest; problem?: undefined }
  | { request?: undefined; problem: ScheduleProblem };

/** Request for a reboot/poweroff modal, or the message key that blocks it. */
export function scheduleRequest(
  action: "now" | "at" | "in",
  timeValue: string,
  minutesValue: string,
): ScheduleCheck {
  if (action === "at") {
    const value = timeValue.trim();
    if (!value) return { problem: "enterTime" };
    if (!AT_TIME.test(value)) return { problem: "invalidTime" };
    return { request: { action, value } };
  }
  if (action === "in") {
    const value = minutesValue.trim();
    if (!value) return { problem: "enterMinutes" };
    const minutes = value.replace(/^0+/, "");
    if (!IN_MINUTES.test(minutes)) return { problem: "invalidMinutes" };
    return { request: { action, value: minutes } };
  }
  return { request: { action } };
}
