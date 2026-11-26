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
import { AlertCircle, Loader2 } from "lucide-react";
import type { ApiError } from "@/lib/types/api";
import type { AdminGroup, TrafficEngineeringCapabilities } from "@/lib/api/traffic-engineering";
import {
  adminGroupFields,
  adminGroupProblem,
  teRange,
  type AdminGroupFields,
} from "@/lib/api/traffic-engineering-save-ops";
import { useTeProblemText } from "./useTeProblemText";

interface AdminGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Commits the save; a rejection keeps the dialog open with the device error. */
  onSubmit: (fields: AdminGroupFields) => Promise<void>;
  existingGroup: AdminGroup | null;
  /** Every configured admin group (name and bit-position checks). */
  groups: AdminGroup[];
  capabilities: TrafficEngineeringCapabilities | null;
}

export function AdminGroupModal({
  open,
  onOpenChange,
  onSubmit,
  existingGroup,
  groups,
  capabilities,
}: AdminGroupModalProps) {
  const t = useTranslations("trafficEngineering");
  const tc = useTranslations("common");
  const isEditMode = existingGroup !== null;
  const bitRange = teRange(capabilities, "bit_position");

  // The page remounts this dialog on every open, so the draft starts from the loaded group.
  const [fields, setFields] = useState<AdminGroupFields>(() => adminGroupFields(existingGroup));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problemText = useTeProblemText();

  const handleOpenChange = (next: boolean) => {
    // A close while the commit runs would drop its error.
    if (!next && loading) return;
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    const problem = adminGroupProblem(fields, existingGroup, groups, capabilities);
    if (problem) {
      setError(problemText(problem));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(fields);
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || t("errors.saveGroup"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t("groupModal.editTitle") : t("groups.add")}</DialogTitle>
          <DialogDescription>
            {t("groupModal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ag-name">{tc("name")}</Label>
            <Input
              id="ag-name"
              value={fields.name}
              onChange={(e) => setFields((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t("groupModal.namePlaceholder")}
              disabled={isEditMode || loading}
              className={isEditMode ? "bg-muted" : ""}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ag-bit">{t("groups.bitPosition")}</Label>
            <Input
              id="ag-bit"
              type="number"
              min={bitRange?.min}
              max={bitRange?.max}
              value={fields.bitPosition}
              onChange={(e) => setFields((prev) => ({ ...prev, bitPosition: e.target.value }))}
              placeholder={bitRange ? `${bitRange.min}-${bitRange.max}` : undefined}
              disabled={loading}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="whitespace-pre-wrap">{error}</span>
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
                {isEditMode ? tc("saving") : tc("creating")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              t("groups.add")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
