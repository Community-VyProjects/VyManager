"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { OspfAuthDraft, OspfAuthMode } from "@/lib/api/ospf-save-ops";

const NONE = "__none__";

interface OspfAuthFieldsProps {
  idPrefix: string;
  draft: OspfAuthDraft;
  onChange: (draft: OspfAuthDraft) => void;
  /** Modes this device has, from capabilities. */
  modes: string[];
}

/** Authentication mode, MD5 keys, or plaintext password for one interface or virtual link. */
export function OspfAuthFields({ idPrefix, draft, onChange, modes }: OspfAuthFieldsProps) {
  const t = useTranslations("ospf");
  const tc = useTranslations("common");
  const options = draft.mode && !modes.includes(draft.mode) ? [...modes, draft.mode] : modes;

  const setRow = (idx: number, field: "id" | "value", value: string) => {
    const keys = draft.keys.map((row, i) => (i === idx ? { ...row, [field]: value } : row));
    onChange({ ...draft, keys });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-auth-mode`}>{t("fields.authentication")}</Label>
        <Select
          value={draft.mode || NONE}
          onValueChange={(v) => onChange({ ...draft, mode: (v === NONE ? "" : v) as OspfAuthMode })}
        >
          <SelectTrigger id={`${idPrefix}-auth-mode`}>
            <SelectValue placeholder={tc("none")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{tc("none")}</SelectItem>
            {options.map((mode) => (
              <SelectItem key={mode} value={mode}>{mode}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {draft.mode === "plaintext-password" && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-auth-plaintext`}>{t("fields.plaintextPassword")}</Label>
          <Input
            id={`${idPrefix}-auth-plaintext`}
            type="password"
            autoComplete="new-password"
            value={draft.password}
            onChange={(e) => onChange({ ...draft, password: e.target.value })}
            maxLength={8}
          />
        </div>
      )}

      {draft.mode === "md5" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t("interfaceModal.md5Keys")}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange({ ...draft, keys: [...draft.keys, { id: "", value: "" }] })}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t("interfaceModal.addKey")}
            </Button>
          </div>
          {draft.keys.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                aria-label={t("interfaceModal.keyId")}
                type="number"
                min={1}
                max={255}
                value={row.id}
                onChange={(e) => setRow(idx, "id", e.target.value)}
                placeholder={t("interfaceModal.keyId")}
                className="w-24"
              />
              <Input
                aria-label={t("interfaceModal.md5Key")}
                type="password"
                autoComplete="new-password"
                value={row.value}
                onChange={(e) => setRow(idx, "value", e.target.value)}
                placeholder={t("interfaceModal.md5Key")}
                maxLength={16}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={tc("delete")}
                onClick={() => onChange({ ...draft, keys: draft.keys.filter((_, i) => i !== idx) })}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
