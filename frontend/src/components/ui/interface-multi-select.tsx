"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { InterfaceName } from "@/lib/api/show";

export interface InterfaceMultiSelectProps {
  /** Currently selected interface names. */
  values: string[];
  /** Called with the new list whenever an interface is added or removed. */
  onChange: (values: string[]) => void;
  /**
   * Pre-fetched list of interfaces. When omitted, the underlying
   * `InterfaceSelect` fetches the full list itself.
   */
  interfaces?: InterfaceName[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  /** Class applied to the dropdown trigger. */
  className?: string;
}

/**
 * Multi-value interface picker: a dropdown that appends the chosen interface
 * to the list (hiding values already selected) plus removable badge chips for
 * the current selection.
 */
export function InterfaceMultiSelect({
  values,
  onChange,
  interfaces,
  placeholder,
  disabled,
  id,
  className,
}: InterfaceMultiSelectProps) {
  const tc = useTranslations("common");
  return (
    <div className="space-y-2">
      <InterfaceSelect
        id={id}
        value=""
        onValueChange={(v) => {
          if (v && !values.includes(v)) onChange([...values, v]);
        }}
        interfaces={interfaces}
        filter={(iface) => !values.includes(iface.name)}
        placeholder={placeholder ?? tc("addInterface")}
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
