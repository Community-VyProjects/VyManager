"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { asPathListService, type AsPathListRule } from "@/lib/api/as-path-list";

interface DeleteAsPathListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  asPathListName: string;
  rule: AsPathListRule | null;
}

export function DeleteAsPathListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  asPathListName,
  rule,
}: DeleteAsPathListRuleModalProps) {
  const t = useTranslations("bgpLists");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!rule) return;

    setLoading(true);
    setError(null);

    try {
      await asPathListService.deleteRule(asPathListName, rule.rule_number);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shared.failedToDeleteRule"));
    } finally {
      setLoading(false);
    }
  };

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("shared.deleteRule")}</DialogTitle>
          <DialogDescription>
            {t("shared.deleteRuleConfirm")}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              {t("shared.deletingRule", { number: String(rule.rule_number), listType: t("types.asPath.modalName"), name: asPathListName })}
            </p>
            {rule.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {rule.description}
              </p>
            )}
            {rule.regex && (
              <p className="text-sm text-muted-foreground mt-1">
                {t("shared.patternLabel")} <code className="text-xs bg-muted px-1 py-0.5 rounded">{rule.regex}</code>
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? tc("deleting") : t("shared.deleteRule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
