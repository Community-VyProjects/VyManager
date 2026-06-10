"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

interface Props {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  hint?: string;
  type?: "text" | "number";
  /** Optional fixed options offered as datalist suggestions. */
  suggestions?: string[];
}

/** Reusable editor for a VyOS multi-value list rendered as removable chips. */
export function MultiValueInput({
  label,
  values,
  onChange,
  placeholder,
  hint,
  type = "text",
  suggestions,
}: Props) {
  const [draft, setDraft] = useState("");
  const listId = suggestions ? `mv-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined;

  const add = () => {
    const v = draft.trim();
    if (!v || values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  };

  const remove = (idx: number) => onChange(values.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v, idx) => (
            <Badge key={`${v}-${idx}`} variant="secondary" className="font-mono gap-1 pr-1">
              {v}
              <button type="button" onClick={() => remove(idx)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          type={type}
          list={listId}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="flex-1 font-mono"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        {listId && suggestions && (
          <datalist id={listId}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
        <Button type="button" variant="outline" size="icon" onClick={add} disabled={!draft.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
