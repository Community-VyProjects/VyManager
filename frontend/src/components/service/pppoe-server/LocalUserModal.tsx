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
import { AlertCircle, Loader2, User } from "lucide-react";
import { pppoeServerService, PPPoELocalUser } from "@/lib/api/pppoe-server";
import { localUserProblem, type PPPoELocalUserDraft } from "@/lib/api/pppoe-server-save-ops";
import type { ApiError } from "@/lib/types/api";

interface LocalUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingUser: PPPoELocalUser | null;
  /** Configured usernames; Add rejects them. */
  configuredUsers: string[];
}

export function LocalUserModal({ open, onOpenChange, onSuccess, existingUser, configuredUsers }: LocalUserModalProps) {
  const t = useTranslations("pppoeServerSettings");
  const tc = useTranslations("common");
  const isEdit = !!existingUser;
  // The page remounts this modal (key) on every open, so state seeds from props.
  // The password is required, so it loads blank: blank keeps the stored one.
  const [draft, setDraft] = useState<PPPoELocalUserDraft>(() => ({
    username: existingUser?.username || "",
    password: "",
    static_ip: existingUser?.static_ip || "",
    rate_download: existingUser?.rate_limit.download || "",
    rate_upload: existingUser?.rate_limit.upload || "",
    disabled: existingUser?.disabled || false,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<PPPoELocalUserDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const handleOpenChange = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  const handleSubmit = async () => {
    const issue = localUserProblem(existingUser, draft, configuredUsers);
    if (issue) {
      setError(t(`localUser.${issue.problem}`, issue.params));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await pppoeServerService.saveLocalUser(existingUser, draft);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("localUser.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {isEdit ? t("localUser.editTitle") : t("localUser.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("localUser.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pppoe-user-name">{t("localUser.username")}</Label>
            <Input
              id="pppoe-user-name"
              value={draft.username}
              onChange={(e) => update({ username: e.target.value })}
              placeholder="user@example.com"
              disabled={isEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pppoe-user-password">{t("localUser.password")}</Label>
            <Input
              id="pppoe-user-password"
              type="password"
              autoComplete="new-password"
              value={draft.password}
              onChange={(e) => update({ password: e.target.value })}
              placeholder={existingUser?.password ? t("leaveBlankToKeep") : t("localUser.enterPassword")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pppoe-user-ip">{t("localUser.staticIp")}</Label>
            <Input
              id="pppoe-user-ip"
              value={draft.static_ip}
              onChange={(e) => update({ static_ip: e.target.value })}
              placeholder="192.168.100.10"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pppoe-user-down">{t("localUser.rateDownload")}</Label>
              <Input
                id="pppoe-user-down"
                value={draft.rate_download}
                onChange={(e) => update({ rate_download: e.target.value })}
                placeholder="10m"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-user-up">{t("localUser.rateUpload")}</Label>
              <Input
                id="pppoe-user-up"
                value={draft.rate_upload}
                onChange={(e) => update({ rate_upload: e.target.value })}
                placeholder="5m"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="user-disabled" checked={draft.disabled} onCheckedChange={(v) => update({ disabled: !!v })} />
            <Label htmlFor="user-disabled" className="cursor-pointer">{tc("disabled")}</Label>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? tc("saving") : t("adding")}</> : isEdit ? tc("saveChanges") : t("localUser.addUser")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
