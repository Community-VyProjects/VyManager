"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { Loader2, AlertCircle } from "lucide-react";
import type { IsisDefaultInfoEntry } from "@/lib/api/isis";
import type { ApiError } from "@/lib/types/api";
import {
  ISIS_FAMILIES,
  ISIS_ROUTE_METRIC,
  isisDefaultInfoForm,
  isisDefaultInfoFreeLevels,
  isisDefaultInfoProblem,
  type IsisDefaultInfoForm,
  type IsisFamily,
} from "@/lib/api/isis-save-ops";
import { useIsisProblemText } from "./useIsisProblemText";
import { useTranslations } from "next-intl";

interface IsisDefaultInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (family: IsisFamily, original: IsisDefaultInfoEntry | null, form: IsisDefaultInfoForm) => Promise<void>;
  /** The entry being edited, or null to add one. */
  existing: { family: IsisFamily; entry: IsisDefaultInfoEntry } | null;
  entries: Record<IsisFamily, IsisDefaultInfoEntry[]>;
  routeMapNames: string[];
}

/** Mount with a fresh ``key`` per open: the form is read once from ``existing``. */
export function IsisDefaultInfoModal({
  open,
  onOpenChange,
  onSubmit,
  existing,
  entries,
  routeMapNames,
}: IsisDefaultInfoModalProps) {
  const t = useTranslations("isis");
  const tc = useTranslations("common");
  const problemText = useIsisProblemText();
  const isEdit = !!existing;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [family, setFamily] = useState<IsisFamily>(existing?.family ?? "ipv4");
  const [form, setForm] = useState<IsisDefaultInfoForm>(() => isisDefaultInfoForm(existing?.entry ?? null));
  // Add offers only levels the family has no default-information at yet.
  const levelOptions: readonly string[] = isEdit ? [form.level] : isisDefaultInfoFreeLevels(entries[family]);

  const handleSubmit = async () => {
    const original = existing?.entry ?? null;
    const problem = isisDefaultInfoProblem(family, original, form, entries[family]);
    if (problem) {
      setError(problemText(problem));
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSubmit(family, original, form);
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || t("defaultInfoModal.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("defaultInfoModal.titleEdit") : t("defaultInfoModal.title")}</DialogTitle>
          <DialogDescription>{t("defaultInfoModal.description")}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="isis-di-family">{t("fields.addressFamily")}</Label>
            <Select value={family} disabled={isEdit} onValueChange={(v) => { setFamily(v as IsisFamily); setForm({ ...form, level: "" }); }}>
              <SelectTrigger id="isis-di-family">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISIS_FAMILIES.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="isis-di-level">{t("fields.isisLevel")}</Label>
            <Select value={form.level} disabled={isEdit} onValueChange={(v) => setForm({ ...form, level: v })}>
              <SelectTrigger id="isis-di-level">
                <SelectValue placeholder={t("fields.selectLevel")} />
              </SelectTrigger>
              <SelectContent>
                {levelOptions.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="isis-di-always" checked={form.always} onCheckedChange={(v) => setForm({ ...form, always: v === true })} />
            <Label htmlFor="isis-di-always">{t("fields.always")}</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="isis-di-metric">{t("fields.metricOptional")}</Label>
            <Input
              id="isis-di-metric"
              type="number"
              value={form.metric}
              onChange={(e) => setForm({ ...form, metric: e.target.value })}
              placeholder={tc("default")}
              min={ISIS_ROUTE_METRIC.min}
              max={ISIS_ROUTE_METRIC.max}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="isis-di-route-map">{t("fields.routeMapOptional")}</Label>
            <NamedListSelect
              id="isis-di-route-map"
              value={form.route_map}
              names={routeMapNames}
              onValueChange={(v) => setForm({ ...form, route_map: v })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? tc("saveChanges") : tc("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
