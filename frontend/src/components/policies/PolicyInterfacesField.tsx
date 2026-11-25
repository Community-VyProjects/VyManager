"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InterfaceMultiSelect } from "@/components/ui/interface-multi-select";
import { interfacePatternValid } from "@/lib/api/route-save-ops";

interface PolicyInterfacesFieldProps {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  /** The typed pattern, held by the modal so a submit can add it (see `interfacesWithPending`). */
  pattern: string;
  onPatternChange: (pattern: string) => void;
  disabled: boolean;
}

/**
 * Interfaces a policy is applied to: picks from the interface list plus a
 * typed pattern (the lab takes wildcards such as `eth*`). Every value, picked,
 * typed or loaded, shows as a removable chip. A pattern still in the box is
 * added by the modal's submit.
 */
export function PolicyInterfacesField({
  id,
  label,
  values,
  onChange,
  pattern,
  onPatternChange,
  disabled,
}: PolicyInterfacesFieldProps) {
  const t = useTranslations("routePolicy.interfacesField");
  const trimmed = pattern.trim();
  const canAdd = interfacePatternValid(trimmed) && !values.includes(trimmed);

  const add = () => {
    if (!canAdd) return;
    onChange([...values, trimmed]);
    onPatternChange("");
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <InterfaceMultiSelect id={id} values={values} onChange={onChange} disabled={disabled} />
      <div className="flex gap-2">
        <Input
          id={`${id}-pattern`}
          aria-label={t("pattern")}
          value={pattern}
          onChange={(e) => onPatternChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={t("patternPlaceholder", { example: "eth*" })}
          disabled={disabled}
          className="flex-1 font-mono"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={disabled || !canAdd}>
          <Plus className="h-4 w-4 mr-1" />
          {t("add")}
        </Button>
      </div>
    </div>
  );
}
