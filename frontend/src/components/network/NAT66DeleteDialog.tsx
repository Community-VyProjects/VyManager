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
import { AlertCircle } from "lucide-react";
import {
  nat66Service,
  type NAT66SourceRule,
  type NAT66DestinationRule,
} from "@/lib/api/nat66";

interface NAT66DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: NAT66SourceRule | NAT66DestinationRule | null;
  ruleType: "source" | "destination";
  onSuccess: () => void;
}

export function NAT66DeleteDialog({
  open,
  onOpenChange,
  rule,
  ruleType,
  onSuccess,
}: NAT66DeleteDialogProps) {
  const t = useTranslations("nat66");
  const tc = useTranslations("common");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!rule) return;
    setSaving(true);
    setError(null);
    try {
      if (ruleType === "source") {
        await nat66Service.deleteAndCompactSourceRules(rule.rule_number);
      } else {
        await nat66Service.deleteAndCompactDestinationRules(rule.rule_number);
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deleteDialog.deleteFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t("deleteDialog.title", { type: ruleType, number: String(rule.rule_number) })}
          </DialogTitle>
          <DialogDescription>
            {rule.description
              ? t("deleteDialog.messageWithDescription", {
                  number: String(rule.rule_number),
                  description: rule.description,
                })
              : t("deleteDialog.message", { number: String(rule.rule_number) })}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={saving}>
            {saving ? tc("deleting") : t("deleteDialog.deleteRule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
