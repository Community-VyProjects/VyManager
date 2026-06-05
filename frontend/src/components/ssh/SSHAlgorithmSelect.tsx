"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface SSHAlgorithmSelectProps {
  label: string;
  description?: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}

/**
 * Toggle-badge multi-select for a fixed list of algorithm options.
 * Empty selection means "use the VyOS defaults".
 */
export function SSHAlgorithmSelect({
  label,
  description,
  options,
  selected,
  onChange,
}: SSHAlgorithmSelectProps) {
  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {selected.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange([])}
          >
            Clear ({selected.length})
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <Badge
              key={opt}
              variant={isSelected ? "default" : "outline"}
              className="font-mono text-xs cursor-pointer gap-1 select-none"
              onClick={() => toggle(opt)}
            >
              {isSelected && <Check className="h-3 w-3" />}
              {opt}
            </Badge>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-muted-foreground">
          None selected — VyOS defaults apply.
        </p>
      )}
    </div>
  );
}
