"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { ClassDraft, MatchDraft, emptyMatchDraft } from "@/lib/api/qos";
import { FieldDef } from "@/lib/qos-schema";
import { QoSFieldForm } from "./QoSFieldForm";
import { QoSMatchRuleEditor } from "./QoSMatchRuleEditor";
import { MatchGroupSelect } from "./MatchGroupSelect";

interface QoSClassEditorProps {
  draft: ClassDraft;
  fields: FieldDef[];
  onChange: (draft: ClassDraft) => void;
  onRemove?: () => void;
  isDefault: boolean;
  classIdHelp?: string;
  dscpNames: string[];
  matchGroupSupported: boolean;
  availableMatchGroups: string[];
  idPrefix: string;
}

export function QoSClassEditor({
  draft,
  fields,
  onChange,
  onRemove,
  isDefault,
  classIdHelp,
  dscpNames,
  matchGroupSupported,
  availableMatchGroups,
  idPrefix,
}: QoSClassEditorProps) {
  const setValue = (key: string, value: string) => {
    const values = { ...draft.values };
    if (value === "") delete values[key];
    else values[key] = value;
    onChange({ ...draft, values });
  };

  const updateMatch = (index: number, rule: MatchDraft) => {
    onChange({ ...draft, matches: draft.matches.map((m, i) => (i === index ? rule : m)) });
  };

  return (
    <div className="space-y-4 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        {isDefault ? (
          <p className="text-sm font-semibold">Default Class</p>
        ) : (
          <div className="flex-1 space-y-1">
            <Label htmlFor={`${idPrefix}-id`} className="text-xs font-medium">Class ID</Label>
            <Input
              id={`${idPrefix}-id`}
              placeholder="e.g. 30"
              value={draft.classId}
              onChange={(e) => onChange({ ...draft, classId: e.target.value })}
              className="font-mono max-w-[160px]"
            />
            {classIdHelp && <p className="text-[11px] text-muted-foreground">{classIdHelp}</p>}
          </div>
        )}
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {fields.length > 0 && (
        <QoSFieldForm
          fields={fields}
          values={draft.values}
          onChange={setValue}
          dscpNames={dscpNames}
          idPrefix={idPrefix}
        />
      )}

      {!isDefault && (
        <>
          <Separator />
          {/* Match groups (1.5 only) */}
          {matchGroupSupported && (
            <MatchGroupSelect
              label="Match Groups"
              available={availableMatchGroups}
              selected={draft.matchGroups}
              onChange={(matchGroups) => onChange({ ...draft, matchGroups })}
            />
          )}

          {/* Match rules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Match Rules</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  onChange({ ...draft, matches: [...draft.matches, emptyMatchDraft("")] })
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Match
              </Button>
            </div>
            {draft.matches.map((m, i) => (
              <QoSMatchRuleEditor
                key={i}
                rule={m}
                onChange={(r) => updateMatch(i, r)}
                onRemove={() => onChange({ ...draft, matches: draft.matches.filter((_, idx) => idx !== i) })}
                dscpNames={dscpNames}
                idPrefix={`${idPrefix}-m${i}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
