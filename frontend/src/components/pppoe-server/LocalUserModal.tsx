"use client";

import { useState, useEffect } from "react";
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
import { ApiError } from "@/lib/types/api";

interface LocalUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingUser?: PPPoELocalUser | null;
}

export function LocalUserModal({ open, onOpenChange, onSuccess, existingUser }: LocalUserModalProps) {
  const t = useTranslations("pppoeServerSettings");
  const tc = useTranslations("common");
  const isEdit = !!existingUser;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [staticIp, setStaticIp] = useState("");
  const [rateDownload, setRateDownload] = useState("");
  const [rateUpload, setRateUpload] = useState("");
  const [disabled, setDisabled] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingUser) {
        setUsername(existingUser.username);
        setPassword("");
        setStaticIp(existingUser.static_ip || "");
        setRateDownload(existingUser.rate_limit?.download || "");
        setRateUpload(existingUser.rate_limit?.upload || "");
        setDisabled(existingUser.disabled || false);
      } else {
        setUsername("");
        setPassword("");
        setStaticIp("");
        setRateDownload("");
        setRateUpload("");
        setDisabled(false);
      }
      setError(null);
    }
  }, [open, existingUser]);

  const handleSubmit = async () => {
    if (!username.trim()) { setError(t("localUser.usernameRequired")); return; }
    if (!isEdit && !password.trim()) { setError(t("localUser.passwordRequired")); return; }

    setLoading(true);
    setError(null);

    try {
      let result;
      if (isEdit) {
        result = await pppoeServerService.updateLocalUser(existingUser!.username, existingUser!, {
          password: password || undefined,
          static_ip: staticIp,
          rate_download: rateDownload,
          rate_upload: rateUpload,
          disabled,
        });
      } else {
        result = await pppoeServerService.createLocalUser(username.trim(), {
          password,
          static_ip: staticIp || undefined,
          rate_download: rateDownload || undefined,
          rate_upload: rateUpload || undefined,
          disabled,
        });
      }

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("localUser.saveFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("localUser.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Label>{t("localUser.username")}</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="user@example.com" disabled={isEdit} />
          </div>
          <div className="space-y-2">
            <Label>{t("localUser.password")}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? t("leaveBlankToKeep") : t("localUser.enterPassword")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("localUser.staticIp")}</Label>
            <Input value={staticIp} onChange={(e) => setStaticIp(e.target.value)} placeholder="192.168.100.10" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("localUser.rateDownload")}</Label>
              <Input value={rateDownload} onChange={(e) => setRateDownload(e.target.value)} placeholder="10m" />
            </div>
            <div className="space-y-2">
              <Label>{t("localUser.rateUpload")}</Label>
              <Input value={rateUpload} onChange={(e) => setRateUpload(e.target.value)} placeholder="5m" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="user-disabled" checked={disabled} onCheckedChange={(v) => setDisabled(!!v)} />
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
