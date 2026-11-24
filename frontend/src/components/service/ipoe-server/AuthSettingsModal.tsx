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
import { Label } from "@/components/ui/label";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertCircle, Key, Loader2 } from "lucide-react";
import { ipoeServerService, IPoECapabilities } from "@/lib/api/ipoe-server";
import { ApiError } from "@/lib/types/api";

interface AuthSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentMode?: string | null;
  capabilities: IPoECapabilities | null;
}

export function AuthSettingsModal({ open, onOpenChange, onSuccess, currentMode, capabilities }: AuthSettingsModalProps) {
  const t = useTranslations("ipoeServer");
  const tc = useTranslations("common");
  // Empty is the unset leaf (the lab default); choosing it deletes the mode.
  const [mode, setMode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(currentMode || "");
      setError(null);
    }
  }, [open, currentMode]);

  const handleOpenChange = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ipoeServerService.updateAuthMode(currentMode, mode);
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("authModal.updateFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("authModal.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            {t("authModal.title")}
          </DialogTitle>
          <DialogDescription>{t("authModal.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("authModal.mode")}</Label>
            <NamedListSelect
              value={mode}
              names={capabilities?.values.auth_modes || []}
              onValueChange={setMode}
              noneLabel={tc("default")}
            />
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tc("saving")}</> : tc("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
