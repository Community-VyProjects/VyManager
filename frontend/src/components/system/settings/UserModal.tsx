"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, UserPlus, Edit2 } from "lucide-react";
import { systemSettingsService, type LoginUser } from "@/lib/api/system-settings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: LoginUser | null; // null = create mode
  onSuccess: () => void;
}

export function UserModal({ open, onOpenChange, user, onSuccess }: Props) {
  const t = useTranslations("systemLogin");
  const tc = useTranslations("common");
  const isEdit = !!user;
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUsername(user?.username ?? "");
      setFullName(user?.full_name ?? "");
      setPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }, [open, user]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isEdit && !username.trim()) {
      setError(t("userModal.usernameRequired"));
      return;
    }
    if (password && password !== confirmPassword) {
      setError(t("userModal.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isEdit) {
        result = await systemSettingsService.updateUser(
          user!.username,
          fullName || null,
          password || null,
        );
      } else {
        result = await systemSettingsService.createUser(
          username.trim(),
          fullName || undefined,
          password || undefined,
        );
      }

      if (!result.success) {
        setError(result.error ?? tc("operationFailed"));
        return;
      }

      handleClose();
      onSuccess();
    } catch {
      setError(t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <>
                <Edit2 className="h-5 w-5" />
                {t("userModal.editTitle", { name: user?.username ?? "" })}
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                {t("users.addUser")}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("userModal.editDescription")
              : t("userModal.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono break-words">
                  {error}
                </pre>
              </div>
            </div>
          )}

          {/* Username — only editable when creating */}
          <div className="space-y-2">
            <Label htmlFor="username">{t("users.username")}</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isEdit}
              placeholder={tc("shown.admin")}
              autoComplete="off"
            />
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullname">{t("userModal.fullNameOptional")}</Label>
            <Input
              id="fullname"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("userModal.fullNamePlaceholder")}
              autoComplete="off"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              {isEdit ? t("userModal.newPassword") : t("userModal.passwordOptional")}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          {password && (
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t("userModal.confirmPassword")}</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("saving") : isEdit ? t("userModal.saveChanges") : t("userModal.createUser")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
