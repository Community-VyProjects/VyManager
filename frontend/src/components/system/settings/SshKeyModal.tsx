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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Key } from "lucide-react";
import { systemSettingsService } from "@/lib/api/system-settings";

const KEY_TYPES = ["ssh-rsa", "ecdsa", "ssh-ed25519", "ssh-dss"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  onSuccess: () => void;
}

export function SshKeyModal({ open, onOpenChange, username, onSuccess }: Props) {
  const t = useTranslations("systemLogin");
  const tc = useTranslations("common");
  const [keyName, setKeyName] = useState("");
  const [keyType, setKeyType] = useState("ssh-rsa");
  const [keyData, setKeyData] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setKeyName("");
      setKeyType("ssh-rsa");
      setKeyData("");
      setError(null);
    }
  }, [open]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!keyName.trim()) {
      setError(t("sshModal.keyNameRequired"));
      return;
    }
    if (!keyData.trim()) {
      setError(t("sshModal.keyDataRequired"));
      return;
    }

    setLoading(true);
    try {
      const result = await systemSettingsService.addSshKey(
        username,
        keyName.trim(),
        keyType,
        keyData.trim(),
      );

      if (!result.success) {
        setError(result.error ?? t("sshModal.addFailed"));
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
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t("sshModal.title", { name: username })}
          </DialogTitle>
          <DialogDescription>
            {t("sshModal.description")}
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

          <div className="space-y-2">
            <Label htmlFor="keyname">{t("sshModal.keyName")}</Label>
            <Input
              id="keyname"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="my-laptop"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keytype">{t("sshModal.keyType")}</Label>
            <Select value={keyType} onValueChange={setKeyType}>
              <SelectTrigger id="keytype">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KEY_TYPES.map((kt) => (
                  <SelectItem key={kt} value={kt}>
                    {kt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keydata">{t("sshModal.keyData")}</Label>
            <Textarea
              id="keydata"
              value={keyData}
              onChange={(e) => setKeyData(e.target.value)}
              placeholder="AAAA..."
              rows={4}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              {t("sshModal.keyDataHint")}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("sshModal.adding") : t("sshModal.addKey")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
