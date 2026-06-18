"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showService, InterfaceName } from "@/lib/api/show";

export interface InterfaceSelectProps {
  /** Currently selected interface name (or sentinel `noneOption.value`). */
  value: string;
  /** Called with the newly selected value. */
  onValueChange: (value: string) => void;
  /**
   * Pre-filtered list of interfaces to display. When provided, the component
   * uses this list as-is and does NOT fetch — callers that need to filter
   * (e.g. ethernet-only, exclude already-used) pass their narrowed list here.
   * When omitted, the component fetches the full interface list itself.
   */
  interfaces?: InterfaceName[];
  /** Optional predicate applied on top of the resolved list. */
  filter?: (iface: InterfaceName) => boolean;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  /** Class applied to the trigger. */
  className?: string;
  /** Text for the disabled item shown when the list is empty. */
  emptyText?: string;
  /**
   * Optional sentinel option rendered at the top of the list (e.g. "None",
   * "Any", "All"). Radix Select cannot use an empty-string value, so the
   * value must be a non-empty sentinel such as "__none__".
   */
  noneOption?: { label: string; value: string };
}

/**
 * Shared interface picker. Renders each interface as its name followed by a
 * muted description (nothing is shown when an interface has no description).
 * By default it fetches the full interface list; pass `interfaces` to supply a
 * pre-filtered list while keeping the same look.
 */
export function InterfaceSelect({
  value,
  onValueChange,
  interfaces,
  filter,
  placeholder = "Select an interface",
  disabled,
  id,
  className,
  emptyText = "No interfaces available",
  noneOption,
}: InterfaceSelectProps) {
  const provided = interfaces !== undefined;
  const [fetched, setFetched] = useState<InterfaceName[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (provided) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show loading while fetching interface options
    setLoading(true);
    showService
      .getAllInterfaces()
      .then((res) => {
        if (active) setFetched(res.interfaces);
      })
      .catch(() => {
        if (active) setFetched([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [provided]);

  let list = provided ? interfaces! : fetched;
  if (filter) list = list.filter(filter);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={loading ? "Loading interfaces..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {noneOption && <SelectItem value={noneOption.value}>{noneOption.label}</SelectItem>}
        {list.length === 0 && !noneOption ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          list.map((iface) => (
            <SelectItem key={iface.name} value={iface.name}>
              <span className="font-mono">{iface.name}</span>
              {iface.description && (
                <span className="text-muted-foreground ml-2 text-xs">{iface.description}</span>
              )}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
