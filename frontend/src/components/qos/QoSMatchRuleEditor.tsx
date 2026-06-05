"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { MatchDraft } from "@/lib/api/qos";
import { MATCH_GROUPS } from "@/lib/qos-schema";
import { QoSFieldForm } from "./QoSFieldForm";

interface QoSMatchRuleEditorProps {
  rule: MatchDraft;
  onChange: (rule: MatchDraft) => void;
  onRemove: () => void;
  dscpNames: string[];
  idPrefix: string;
}

/** Editor for a single match rule (shared by class matches and traffic-match-groups). */
export function QoSMatchRuleEditor({ rule, onChange, onRemove, dscpNames, idPrefix }: QoSMatchRuleEditorProps) {
  const setValue = (key: string, value: string) => {
    const values = { ...rule.values };
    if (value === "") delete values[key];
    else values[key] = value;
    onChange({ ...rule, values });
  };

  const toggleFlag = (key: string, on: boolean) => {
    const flags = on ? [...new Set([...rule.flags, key])] : rule.flags.filter((fl) => fl !== key);
    onChange({ ...rule, flags });
  };

  return (
    <div className="space-y-4 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor={`${idPrefix}-name`} className="text-xs font-medium">Rule Name</Label>
          <Input
            id={`${idPrefix}-name`}
            placeholder="e.g. web-traffic"
            value={rule.name}
            onChange={(e) => onChange({ ...rule, name: e.target.value })}
            className="font-mono"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 mt-5 text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {MATCH_GROUPS.map((group) => (
        <div key={group.id} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">{group.label}</p>
          <QoSFieldForm
            fields={group.fields}
            values={rule.values}
            onChange={setValue}
            dscpNames={dscpNames}
            idPrefix={`${idPrefix}-${group.id}`}
          />
          {group.flags && (
            <div className="flex flex-wrap gap-4 pt-1">
              {group.flags.map((flag) => (
                <div key={flag.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`${idPrefix}-${flag.key}`}
                    checked={rule.flags.includes(flag.key)}
                    onCheckedChange={(c) => toggleFlag(flag.key, !!c)}
                  />
                  <Label htmlFor={`${idPrefix}-${flag.key}`} className="text-xs cursor-pointer">
                    {flag.label}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
