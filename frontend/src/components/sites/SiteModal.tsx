"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, Building2 } from "lucide-react";
import type { Site } from "@/lib/api/session";
import { ApiError } from "@/lib/types/api";
import { modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  emptySiteDraft,
  siteDraftFrom,
  submitSiteCreate,
  submitSiteUpdate,
  validateSiteDraft,
  type SiteDraft,
} from "./sites-form";

interface SiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existing?: Site | null;
}

export function SiteModal({
  open,
  onOpenChange,
  onSuccess,
  existing,
}: SiteModalProps) {
  const t = useTranslations("sites");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const [draft, setDraft] = useState<SiteDraft>(emptySiteDraft());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDraft(siteDraftFrom(existing));
    } else {
      setDraft(emptySiteDraft());
    }
    setError(null);
  }, [open, existing]);

  const patch = (fields: Partial<SiteDraft>) => setDraft((d) => ({ ...d, ...fields }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateSiteDraft(draft);
    if (validationError) {
      setError(t(`validation.${validationError}`));
      return;
    }

    const write = modalWriteKind(existing ? { name: existing.id } : null);
    setLoading(true);
    setError(null);

    try {
      if (write.kind === "update" && existing) {
        await submitSiteUpdate(existing, draft);
      } else {
        await submitSiteCreate(draft);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(
        (err as ApiError).message ||
          (isEdit ? t("siteModal.updateFailed") : t("siteModal.createFailed")),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{isEdit ? t("editSite") : t("siteModal.createTitle")}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? t("siteModal.editDescription")
                  : t("siteModal.createDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="required">
                {t("siteModal.nameLabel")}
              </Label>
              <Input
                id="name"
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder={t("siteModal.namePlaceholder")}
                disabled={loading}
                required
              />
              {!isEdit && (
                <p className="text-xs text-muted-foreground">
                  {t("siteModal.nameHint")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("descriptionOptional")}</Label>
              <Textarea
                id="description"
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder={t("siteModal.descriptionPlaceholder")}
                rows={3}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEdit ? tc("saving") : t("creating")}
                </>
              ) : isEdit ? (
                t("saveChanges")
              ) : (
                t("siteModal.createButton")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
