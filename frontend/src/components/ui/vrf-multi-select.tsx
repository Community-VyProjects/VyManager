"use client";

import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { VrfSelect } from "@/components/ui/vrf-select";
import { VrfInstance } from "@/lib/api/vrf";

export interface VrfMultiSelectProps {
  /** Currently selected VRF names. */
  values: string[];
  /** Called with the new list whenever a VRF is added or removed. */
  onChange: (values: string[]) => void;
  /**
   * Pre-fetched list of VRF instances. When omitted, the underlying
   * `VrfSelect` fetches the full list itself.
   */
  vrfs?: VrfInstance[];
  /**
   * Extra non-VRF options selectable from the dropdown (e.g. `default`).
   * Already-selected values are hidden automatically.
   */
  extraOptions?: { label: string; value: string }[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  /** Class applied to the dropdown trigger. */
  className?: string;
}

/**
 * Multi-value VRF picker: a dropdown that appends the chosen VRF to the list
 * (hiding values already selected) plus removable badge chips for the current
 * selection.
 */
export function VrfMultiSelect({
  values,
  onChange,
  vrfs,
  extraOptions,
  placeholder = "Add VRF",
  disabled,
  id,
  className,
}: VrfMultiSelectProps) {
  return (
    <div className="space-y-2">
      <VrfSelect
        id={id}
        value=""
        onValueChange={(v) => {
          if (v && !values.includes(v)) onChange([...values, v]);
        }}
        vrfs={vrfs}
        filter={(vrf) => !values.includes(vrf.name)}
        extraOptions={extraOptions?.filter((o) => !values.includes(o.value))}
        includeNone={false}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((val) => (
            <Badge key={val} variant="secondary" className="font-mono gap-1 pr-1">
              {val}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(values.filter((v) => v !== val))}
                className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
