import type { InterfaceName } from "@/lib/api/show";

/** Radix Select cannot use "" as an item value; this stands in for it. */
export const EMPTY_SELECT_VALUE = "__interface_select_empty__";

/**
 * The options an InterfaceSelect renders. A current value that is not in the
 * list (an interface the device no longer reports, a value a list fetch did
 * not return, or a saved literal) is kept as an option so editing a record
 * never hides what is configured.
 */
export function interfaceSelectOptions(
  list: InterfaceName[],
  value: string,
  noneValue: string | undefined,
): InterfaceName[] {
  if (!value || value === noneValue || list.some((iface) => iface.name === value)) {
    return list;
  }
  return [{ name: value, type: "", description: null }, ...list];
}

/** Map an external value onto the Radix item value. */
export function toSelectValue(value: string, noneValue: string | undefined): string {
  return value === "" && noneValue === "" ? EMPTY_SELECT_VALUE : value;
}

/** Map a Radix item value back onto the external value. */
export function fromSelectValue(value: string): string {
  return value === EMPTY_SELECT_VALUE ? "" : value;
}
