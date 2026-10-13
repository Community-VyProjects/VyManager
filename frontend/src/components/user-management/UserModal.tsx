"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { SiteRole, type UserListItem } from "@/lib/api/user-management";
import { ApiError } from "@/lib/types/api";
import { modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  emptyUserDraft,
  submitUserCreate,
  submitUserUpdate,
  userDraftFrom,
  validateUserCreate,
  validateUserShared,
  type UserDraft,
} from "./user-form";

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existing?: UserListItem | null;
}

export function UserModal({ open, onOpenChange, onSuccess, existing }: UserModalProps) {
  const t = useTranslations("userManagement");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const [draft, setDraft] = useState<UserDraft>(emptyUserDraft());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDraft(userDraftFrom(existing));
    } else {
      setDraft(emptyUserDraft());
    }
    setError(null);
  }, [open, existing]);

  const patch = (fields: Partial<UserDraft>) => setDraft((d) => ({ ...d, ...fields }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = isEdit ? validateUserShared(draft) : validateUserCreate(draft);
    if (validationError) {
      setError(t(validationError));
      return;
    }

    const write = modalWriteKind(existing ? { name: existing.id } : null);
    setLoading(true);
    setError(null);

    try {
      if (write.kind === "update" && existing) {
        await submitUserUpdate(existing, draft);
      } else {
        await submitUserCreate(draft);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(
        (err as ApiError).message ||
          (isEdit ? t("form.updateFailed") : t("form.createFailed")),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("form.editDescription")
              : t("form.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              {tc("name")} <span className="text-muted-foreground text-xs">({tc("optional")})</span>
            </Label>
            <Input
              id="name"
              placeholder={t("form.namePlaceholder")}
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              {t("form.email")} {!isEdit && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={draft.email}
              onChange={(e) => patch({ email: e.target.value })}
              disabled={loading}
              required={!isEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteRole">
              {t("form.siteRole")} {!isEdit && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={draft.siteRole}
              onValueChange={(value) => patch({ siteRole: value as SiteRole })}
              disabled={loading}
            >
              <SelectTrigger id="siteRole">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SiteRole.ADMIN}>
                  <div className="flex flex-col">
                    <span className="font-medium">{t("roles.admin")}</span>
                    <span className="text-xs text-muted-foreground">{t("form.adminHint")}</span>
                  </div>
                </SelectItem>
                <SelectItem value={SiteRole.VIEWER}>
                  <div className="flex flex-col">
                    <span className="font-medium">{t("roles.viewer")}</span>
                    <span className="text-xs text-muted-foreground">{t("form.viewerHint")}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {!isEdit && (
              <p className="text-xs text-muted-foreground">
                {t("form.siteRoleHint")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {isEdit ? (
                <>
                  {t("form.newPassword")}{" "}
                  <span className="text-muted-foreground text-xs">{t("form.keepCurrent")}</span>
                </>
              ) : (
                <>
                  {t("form.password")} <span className="text-destructive">*</span>
                </>
              )}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={t("form.passwordPlaceholder")}
              value={draft.password}
              onChange={(e) => patch({ password: e.target.value })}
              disabled={loading}
              required={!isEdit}
              minLength={isEdit ? undefined : 8}
            />
            {!isEdit && (
              <p className="text-xs text-muted-foreground">{t("form.passwordHint")}</p>
            )}
          </div>

          {(!isEdit || draft.password) && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {isEdit ? t("form.confirmNewPassword") : (
                  <>
                    {t("form.confirmPassword")} <span className="text-destructive">*</span>
                  </>
                )}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={isEdit ? t("form.reenterNewPassword") : t("form.reenterPassword")}
                value={draft.confirmPassword}
                onChange={(e) => patch({ confirmPassword: e.target.value })}
                disabled={loading}
                required={!isEdit || !!draft.password}
              />
            </div>
          )}

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
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading
                ? isEdit
                  ? t("form.updating")
                  : tc("creating")
                : isEdit
                  ? t("form.updateSubmit")
                  : t("form.createTitle")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
