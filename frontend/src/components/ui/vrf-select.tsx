"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { vrfService, VrfInstance } from "@/lib/api/vrf";

/**
 * Radix Select cannot use an empty-string value, so the built-in "None" option
 * is represented by this sentinel and mapped back to `""` for callers.
 */
const NONE_SENTINEL = "__none__";

export interface VrfSelectProps {
  /** Currently selected VRF name. An empty string means "None"/default. */
  value: string;
  /** Called with the newly selected VRF name (`""` when "None" is chosen). */
  onValueChange: (value: string) => void;
  /**
   * Pre-fetched list of VRF instances to display. When provided, the component
   * uses this list as-is and does NOT fetch. When omitted, it fetches the full
   * VRF list itself.
   */
  vrfs?: VrfInstance[];
  /** Optional predicate applied on top of the resolved list. */
  filter?: (vrf: VrfInstance) => boolean;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  /** Class applied to the trigger. */
  className?: string;
  /** Text for the disabled item shown when the list is empty. */
  emptyText?: string;
  /** Whether to render a "None" option at the top of the list. Defaults to true. */
  includeNone?: boolean;
  /** Label for the "None" option. Defaults to "None". */
  noneLabel?: string;
  /**
   * Extra non-VRF options rendered above the VRF list (e.g. `default`). Values
   * must be non-empty and are passed through to `onValueChange` unchanged.
   */
  extraOptions?: { label: string; value: string }[];
}

/**
 * Shared VRF picker. Renders each VRF as its name followed by a muted
 * description (nothing is shown when a VRF has no description). By default it
 * fetches the full VRF list; pass `vrfs` to supply a pre-fetched list while
 * keeping the same look.
 */
export function VrfSelect({
  value,
  onValueChange,
  vrfs,
  filter,
  placeholder = "Select VRF",
  disabled,
  id,
  className,
  emptyText = "No VRFs available",
  includeNone = true,
  noneLabel = "None",
  extraOptions,
}: VrfSelectProps) {
  const provided = vrfs !== undefined;
  const [fetched, setFetched] = useState<VrfInstance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (provided) return;
    let active = true;
    setLoading(true);
    vrfService
      .getConfig()
      .then((res) => {
        if (active) setFetched(res.instances);
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

  let list = provided ? vrfs! : fetched;
  if (filter) list = list.filter(filter);

  // Radix shows the placeholder only for an empty-string value, and forbids
  // "" as an item value. So map "" to the sentinel only when the "None" item
  // actually exists; otherwise leave it "" so the placeholder renders.
  const selected = value === "" && includeNone ? NONE_SENTINEL : value;

  // Ensure a configured value that isn't in the resolved list (e.g. a VRF that
  // was since removed) still displays instead of showing an empty trigger.
  const knownValues = new Set([
    ...(includeNone ? [NONE_SENTINEL] : []),
    ...(extraOptions?.map((o) => o.value) ?? []),
    ...list.map((v) => v.name),
  ]);
  const orphanValue = value !== "" && !knownValues.has(value) ? value : null;

  return (
    <Select
      value={selected}
      onValueChange={(v) => onValueChange(v === NONE_SENTINEL ? "" : v)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={loading ? "Loading VRFs..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeNone && <SelectItem value={NONE_SENTINEL}>{noneLabel}</SelectItem>}
        {extraOptions?.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
        {orphanValue && (
          <SelectItem value={orphanValue}>
            <span className="font-mono">{orphanValue}</span>
          </SelectItem>
        )}
        {list.length === 0 && !includeNone && !extraOptions?.length ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          list.map((vrf) => (
            <SelectItem key={vrf.name} value={vrf.name}>
              <span className="font-mono">{vrf.name}</span>
              {vrf.description && (
                <span className="text-muted-foreground ml-2 text-xs">{vrf.description}</span>
              )}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
