/** Radix Select cannot use an empty-string value. */
export const NONE_SENTINEL = "__none__";

/** Names to show, keeping a configured value the loaded list does not include. */
export function listedNames(names: string[], current: string): string[] {
  const cleaned = names.filter((name) => name && name !== NONE_SENTINEL);
  if (current && current !== NONE_SENTINEL && !cleaned.includes(current)) {
    return [current, ...cleaned];
  }
  return cleaned;
}

/** Map an external value onto the Radix item value. */
export function toNamedListValue(value: string): string {
  return value || NONE_SENTINEL;
}

/** Map a Radix item value back onto the external value. */
export function fromNamedListValue(value: string): string {
  return value === NONE_SENTINEL ? "" : value;
}
