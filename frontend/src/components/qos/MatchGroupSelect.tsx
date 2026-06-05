"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface MatchGroupSelectProps {
  label: string;
  available: string[]; // traffic-match-group names that can be referenced
  selected: string[];
  onChange: (selected: string[]) => void;
}

/** Pick traffic-match-group references from a dropdown; shows chosen as chips. */
export function MatchGroupSelect({ label, available, selected, onChange }: MatchGroupSelectProps) {
  const options = available.filter((g) => !selected.includes(g));

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{label}</Label>
      {available.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No traffic match groups defined yet. Create one under the Match Groups tab first.
        </p>
      ) : (
        <Select
          value=""
          onValueChange={(v) => {
            if (v && !selected.includes(v)) onChange([...selected, v]);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={options.length === 0 ? "All groups added" : "Add a match group"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((g) => (
              <SelectItem key={g} value={g}>
                <span className="font-mono">{g}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((g) => (
            <Badge key={g} variant="secondary" className="font-mono gap-1 pr-1">
              {g}
              <button
                type="button"
                onClick={() => onChange(selected.filter((x) => x !== g))}
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
