"use client";

import { useState } from "react";
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
import { Loader2, AlertCircle, AlertTriangle } from "lucide-react";
import { userManagementService, UserListItem } from "@/lib/api/user-management";
import { ApiError } from "@/lib/types/api";
import { roleValueKey } from "./user-form";

interface DeleteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserListItem;
  onSuccess: () => void;
}

export function DeleteUserModal({ open, onOpenChange, user, onSuccess }: DeleteUserModalProps) {
  const t = useTranslations("userManagement");
  const tc = useTranslations("common");
  const roleKey = roleValueKey(user.site_role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    setError(null);
    setLoading(true);

    try {
      await userManagementService.deleteUser(user.id);
      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("deleteUser.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteUser.title")}</DialogTitle>
          <DialogDescription>
            {t("deleteUser.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning message */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-destructive mb-1">{t("deleteUser.warning")}</p>
              <p className="text-muted-foreground">
                {t("deleteUser.willRemove")}
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>{t("deleteUser.instanceAccess", { count: user.instance_count })}</li>
                <li>{t("deleteUser.siteRole", { role: roleKey ? t(roleKey) : user.site_role })}</li>
                <li>{t("deleteUser.accountData")}</li>
              </ul>
            </div>
          </div>

          {/* User info */}
          <div className="border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t("deleteUser.nameLabel")}</span>
              <span className="text-sm text-foreground font-medium">
                {user.name || t("unnamedUser")}
              </span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t("deleteUser.emailLabel")}</span>
              <span className="text-sm text-foreground">{user.email}</span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? tc("deleting") : t("deleteUser.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
