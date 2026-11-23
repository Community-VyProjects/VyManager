"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InterfaceMultiSelect } from "@/components/ui/interface-multi-select";
import { AlertCircle } from "lucide-react";
import { flowtablesService, type Flowtable } from "@/lib/api/firewall-flowtables";
import {
  FLOWTABLE_DESCRIPTION_MAX,
  flowtableDraft,
  flowtableProblem,
  type FlowtableDraft,
} from "@/lib/api/firewall-flowtables-save-ops";
import {
  NONE_SENTINEL,
  fromNamedListValue,
  listedNames,
  toNamedListValue,
} from "@/lib/named-list-select-options";
import type { ApiError } from "@/lib/types/api";

interface FlowtableModalProps {
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingFlowtables: Flowtable[];
  existing?: Flowtable | null;
  /** Offload values from capabilities (`offload_types`). */
  offloadTypes: string[];
}

/** Mount with a key per flowtable: the form is seeded from props once. */
export function FlowtableModal({
  onOpenChange,
  onSuccess,
  existingFlowtables,
  existing,
  offloadTypes,
}: FlowtableModalProps) {
  const t = useTranslations("firewallFlowtables");
  const tc = useTranslations("common");
  const isEdit = !!existing;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<FlowtableDraft>(() => flowtableDraft(existing));

  const set = <K extends keyof FlowtableDraft>(key: K) => (value: FlowtableDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const close = (open: boolean) => {
    if (!loading) onOpenChange(open);
  };

  const handleSubmit = async () => {
    setError(null);
    const problem = flowtableProblem(
      existing ?? null,
      draft,
      existingFlowtables.map((ft) => ft.name)
    );
    if (problem) {
      setError(t(`modal.${problem}`, { max: FLOWTABLE_DESCRIPTION_MAX }));
      return;
    }
    setLoading(true);
    try {
      await flowtablesService.saveFlowtable(existing ?? null, draft);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(
        (err as ApiError).message || (isEdit ? t("modal.updateFailed") : t("modal.createFailed"))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("modal.editTitle", { name: existing.name }) : t("createFlowtable")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("modal.editDescription") : t("modal.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              {tc("name")} {isEdit ? null : <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="name"
              value={draft.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder={t("modal.namePlaceholder")}
              className={isEdit ? "font-mono bg-muted" : "font-mono"}
              disabled={isEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{tc("description")}</Label>
            <Textarea
              id="description"
              value={draft.description}
              onChange={(e) => set("description")(e.target.value)}
              placeholder={tc("optionalDescription")}
              maxLength={FLOWTABLE_DESCRIPTION_MAX}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interfaces">
              {t("interfaces")} <span className="text-destructive">*</span>
            </Label>
            <InterfaceMultiSelect
              id="interfaces"
              values={draft.interfaces}
              onChange={set("interfaces")}
              placeholder={tc("selectInterface")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="offload">{t("offloadType")}</Label>
            <Select
              value={toNamedListValue(draft.offload)}
              onValueChange={(value) => set("offload")(fromNamedListValue(value))}
            >
              <SelectTrigger id="offload">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                {listedNames(offloadTypes, draft.offload).map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? isEdit
                ? tc("saving")
                : tc("creating")
              : isEdit
                ? tc("saveChanges")
                : t("createFlowtable")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
