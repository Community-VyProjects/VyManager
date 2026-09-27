"use client";

import { useState, useEffect } from "react";
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
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RoutingTable } from "@/lib/api/static-routes";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  emptyRoutingTableDraft,
  routingTableDraftFrom,
  submitRoutingTableCreate,
  submitRoutingTableUpdate,
  validateRoutingTableCreate,
  type RoutingTableDraft,
} from "./static-routes-form";

interface RoutingTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existing?: RoutingTable | null;
}

export function RoutingTableModal({
  open,
  onOpenChange,
  onSuccess,
  existing,
}: RoutingTableModalProps) {
  const t = useTranslations("routingExtras");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RoutingTableDraft>(emptyRoutingTableDraft());

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDraft(routingTableDraftFrom(existing));
    } else {
      setDraft(emptyRoutingTableDraft());
    }
    setError(null);
  }, [open, existing]);

  const patch = (fields: Partial<RoutingTableDraft>) => setDraft((d) => ({ ...d, ...fields }));
  const lockedTableId = lockedIdentity(existing, (t) => t.table_id.toString(), draft.tableId);

  const handleSubmit = async () => {
    if (!isEdit) {
      const validationError = validateRoutingTableCreate(draft);
      if (validationError) {
        setError(t(`validation.${validationError}`));
        return;
      }
    }

    const write = modalWriteKind(existing ? { name: existing.table_id.toString() } : null);
    setLoading(true);
    setError(null);

    try {
      const result =
        write.kind === "update" && existing
          ? await submitRoutingTableUpdate(existing, draft)
          : await submitRoutingTableCreate(draft);
      if (result && result.success === false) {
        setError(result.error || tc("operationFailed"));
        return;
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? t("routingTableModal.updateFailed") : t("routingTableModal.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("routingTableModal.editTitle", { id: String(existing.table_id) }) : t("routingTableModal.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("routingTableModal.editDescription")
              : t("routingTableModal.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="table-id">{t("routingTableModal.tableId")}</Label>
            <Input
              id="table-id"
              type="number"
              min="1"
              max="200"
              placeholder="100"
              value={lockedTableId.value}
              disabled={lockedTableId.disabled}
              className={lockedTableId.disabled ? "bg-muted" : undefined}
              onChange={(e) => patch({ tableId: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("shared.descriptionOptional")}</Label>
            <Input
              id="description"
              placeholder={t("routingTableModal.descriptionPlaceholder")}
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>

          {isEdit && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("routingTableModal.ipv4Routes")}</span>
                <span className="font-mono">{existing.ipv4_routes.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("routingTableModal.ipv6Routes")}</span>
                <span className="font-mono">{existing.ipv6_routes.length}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? t("shared.saveChanges") : t("routingTableModal.createTable")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
