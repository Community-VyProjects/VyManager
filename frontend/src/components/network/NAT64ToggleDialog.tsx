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
import { AlertCircle } from "lucide-react";
import { nat64Service, type NAT64SourceRule } from "@/lib/api/nat64";
import type { ApiError } from "@/lib/types/api";

interface NAT64ToggleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: NAT64SourceRule | null;
  onSuccess: () => void;
}

export function NAT64ToggleDialog({
  open,
  onOpenChange,
  rule,
  onSuccess,
}: NAT64ToggleDialogProps) {
  const t = useTranslations("nat64");
  const tc = useTranslations("common");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  if (!rule) return null;

  const enabling = rule.disable;
  const number = String(rule.rule_number);

  const handleApply = async () => {
    setSaving(true);
    setError(null);
    try {
      await nat64Service.toggleRuleDisable(rule.rule_number, rule.disable);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("page.toggleFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {enabling
              ? t("toggleDialog.enableTitle", { number })
              : t("toggleDialog.disableTitle", { number })}
          </DialogTitle>
          <DialogDescription>
            {enabling
              ? t("toggleDialog.enableMessage", { number })
              : t("toggleDialog.disableMessage", { number })}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleApply} disabled={saving}>
            {saving ? tc("saving") : enabling ? t("page.enable") : t("page.disable")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
