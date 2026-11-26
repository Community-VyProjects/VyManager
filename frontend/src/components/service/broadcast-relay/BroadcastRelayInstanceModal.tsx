"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { InterfaceMultiSelect } from "@/components/ui/interface-multi-select";
import { AlertCircle, Loader2 } from "lucide-react";
import type { BroadcastRelayInstance } from "@/lib/api/broadcast-relay";
import {
  BROADCAST_RELAY_DESCRIPTION_MAX,
  broadcastRelayProblem,
  draftFromInstance,
  normalizeBroadcastRelayDraft,
  type BroadcastRelayDraft,
  type BroadcastRelayRanges,
} from "@/lib/api/broadcast-relay-save-ops";
import type { ApiError } from "@/lib/types/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The stored instance to edit, or null to add one. */
  instance: BroadcastRelayInstance | null;
  ranges: BroadcastRelayRanges;
  /** Configured instance ids; a new instance may not reuse one. */
  existingIds: string[];
  onSubmit: (instance: BroadcastRelayInstance) => Promise<void>;
}

/** Seeded from props on mount; the page remounts it with a new `key` on every open. */
export function BroadcastRelayInstanceModal({
  open,
  onOpenChange,
  instance,
  ranges,
  existingIds,
  onSubmit,
}: Props) {
  const t = useTranslations("broadcastRelay");
  const tc = useTranslations("common");
  const isEditMode = !!instance;

  const [draft, setDraft] = useState<BroadcastRelayDraft>(() => draftFromInstance(instance));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<BroadcastRelayDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    const problem = broadcastRelayProblem(draft, ranges, isEditMode ? [] : existingIds);
    if (problem) {
      setError(t(`modal.${problem.key}`, problem.values));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit(normalizeBroadcastRelayDraft(draft));
      onOpenChange(false);
    } catch (err: unknown) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t("modal.editTitle") : t("modal.addTitle")}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("modal.editDescription", { id: instance.id })
              : t("modal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pb-2">
          <div className="space-y-2">
            <Label htmlFor="br-instance-id">{t("modal.instanceId")}</Label>
            <Input
              id="br-instance-id"
              type="number"
              value={draft.id}
              onChange={(e) => update({ id: e.target.value })}
              min={ranges.id.min}
              max={ranges.id.max}
              disabled={isEditMode || loading}
              className={isEditMode ? "bg-muted font-mono" : "font-mono"}
              placeholder={t("modal.rangePlaceholder", { min: ranges.id.min, max: ranges.id.max })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="br-port">{t("modal.udpPort")}</Label>
            <Input
              id="br-port"
              type="number"
              value={draft.port}
              onChange={(e) => update({ port: e.target.value })}
              min={ranges.port.min}
              max={ranges.port.max}
              disabled={loading}
              placeholder={t("modal.udpPortPlaceholder")}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="br-interfaces">{t("modal.interfaces")}</Label>
            <InterfaceMultiSelect
              id="br-interfaces"
              values={draft.interfaces}
              onChange={(interfaces) => update({ interfaces })}
              placeholder={t("modal.selectInterface")}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="br-address">{t("modal.sourceAddress")}</Label>
            <Input
              id="br-address"
              value={draft.address}
              onChange={(e) => update({ address: e.target.value })}
              disabled={loading}
              placeholder={t("modal.sourceAddressPlaceholder")}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="br-description">{tc("description")}</Label>
            <Input
              id="br-description"
              value={draft.description}
              onChange={(e) => update({ description: e.target.value })}
              disabled={loading}
              placeholder={tc("optionalDescription")}
              maxLength={BROADCAST_RELAY_DESCRIPTION_MAX}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="br-disabled"
              checked={draft.disabled}
              onCheckedChange={(checked) => update({ disabled: checked === true })}
              disabled={loading}
            />
            <Label htmlFor="br-disabled" className="cursor-pointer">
              {t("modal.disableInstance")}
            </Label>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? tc("saving") : t("modal.adding")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              t("content.addInstance")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
