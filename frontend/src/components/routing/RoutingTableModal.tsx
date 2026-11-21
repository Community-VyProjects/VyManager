"use client";

import { useMemo, useState } from "react";
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
import { staticRoutesService, type RoutingTable } from "@/lib/api/static-routes";
import {
  TABLE_RANGE,
  routingTableProblem,
  type RoutingTableFields,
  type RoutingTableProblem,
} from "@/lib/api/static-routes-save-ops";
import { lockedIdentity, modalIsEdit } from "@/lib/modal-mode";
import type { ApiError } from "@/lib/types/api";

interface RoutingTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existing?: RoutingTable | null;
  /** Table ids the device already has. */
  configured: number[];
}

function tableFields(table: RoutingTable | null | undefined): RoutingTableFields {
  return { tableId: table ? String(table.table_id) : "", description: table?.description ?? "" };
}

export function RoutingTableModal({
  open,
  onOpenChange,
  onSuccess,
  existing,
  configured,
}: RoutingTableModalProps) {
  const t = useTranslations("routingExtras");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const initial = useMemo(() => tableFields(existing), [existing]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RoutingTableFields>(initial);

  const seedKey = open ? JSON.stringify(initial) : "";
  const [seed, setSeed] = useState(seedKey);
  if (seedKey !== seed) {
    setSeed(seedKey);
    setDraft(initial);
    setError(null);
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && saving) return;
    onOpenChange(next);
  };

  const patch = (fields: Partial<RoutingTableFields>) => setDraft((d) => ({ ...d, ...fields }));
  const lockedTableId = lockedIdentity(existing, (table) => table.table_id.toString(), draft.tableId);

  const problemMessage = (problem: RoutingTableProblem): string => {
    switch (problem.key) {
      case "tableIdRange":
        return t("validation.tableIdRange", { min: problem.min, max: problem.max });
      case "tableExists":
        return t("validation.tableExists", { name: problem.name });
      case "descriptionTooLong":
        return t("validation.descriptionTooLong", { max: problem.max });
      default:
        return t("validation.tableIdRequired");
    }
  };

  const handleSubmit = async () => {
    const original = isEdit ? initial : null;
    const problem = routingTableProblem(original, draft, configured);
    if (problem) {
      setError(problemMessage(problem));
      return;
    }
    const failed = isEdit ? t("routingTableModal.updateFailed") : t("routingTableModal.createFailed");
    setSaving(true);
    setError(null);
    try {
      const result = await staticRoutesService.saveRoutingTable(original, draft);
      if (result && !result.success) {
        setError(result.error || failed);
        return;
      }
      if (result) onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || failed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
              <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="table-id">{t("routingTableModal.tableId", { min: TABLE_RANGE.min, max: TABLE_RANGE.max })}</Label>
            <Input
              id="table-id"
              type="number"
              min={TABLE_RANGE.min}
              max={TABLE_RANGE.max}
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
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? tc("saveChanges") : t("routingTableModal.createTable")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
