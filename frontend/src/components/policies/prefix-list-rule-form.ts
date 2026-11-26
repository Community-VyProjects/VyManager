/**
 * Form-only helpers of the prefix-list rule modal. Every emit and save check
 * lives in `@/lib/api/prefix-list-save-ops`.
 */

import type { PrefixListRange } from "@/lib/api/prefix-list";

/** A free rule number: the next after the highest, else the lowest unused one. */
export function nextRuleNumber(numbers: number[], range: PrefixListRange | null): string {
  const min = range?.min ?? 1;
  const max = range?.max ?? 65535;
  if (numbers.length === 0) return String(Math.min(Math.max(100, min), max));
  const next = Math.max(...numbers) + 1;
  if (next <= max) return String(next);
  for (let n = min; n <= max; n += 1) {
    if (!numbers.includes(n)) return String(n);
  }
  return "";
}

/** The length of a typed prefix, or null while it has none. */
export function prefixLength(prefix: string): number | null {
  const match = /\/(\d{1,3})$/.exec(prefix.trim());
  return match ? Number(match[1]) : null;
}
