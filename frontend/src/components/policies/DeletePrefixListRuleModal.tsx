"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { prefixListService, type PrefixListRule, type PrefixListType } from "@/lib/api/prefix-list";
import type { ApiError } from "@/lib/types/api";

interface DeletePrefixListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  rule: PrefixListRule;
  listName: string;
  listType: PrefixListType;
}

export function DeletePrefixListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  rule,
  listName,
  listType,
}: DeletePrefixListRuleModalProps) {
  const t = useTranslations("prefixList");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await prefixListService.deleteRule(listType, listName, rule.rule_number);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("deleteRule.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("deleteRule.title")}</DialogTitle>
          <DialogDescription>{t("deleteRule.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {t("deleteRule.ruleBadge", { number: String(rule.rule_number) })}
              </Badge>
              {rule.action && (
                <Badge
                  variant="outline"
                  className={
                    rule.action === "permit"
                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                      : "bg-red-500/10 text-red-500 border-red-500/20"
                  }
                >
                  {rule.action === "permit" ? t("form.permit") : rule.action === "deny" ? t("form.deny") : rule.action}
                </Badge>
              )}
            </div>
            {rule.description && <p className="text-sm text-muted-foreground">{rule.description}</p>}
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <span className="text-muted-foreground min-w-24">{t("deleteRule.prefixLabel")}</span>
                <span className="font-mono">{rule.prefix || "—"}</span>
              </div>
              {rule.ge != null && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground min-w-24">{t("page.colGe")}</span>
                  <span className="font-mono">{rule.ge}</span>
                </div>
              )}
              {rule.le != null && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground min-w-24">{t("page.colLe")}</span>
                  <span className="font-mono">{rule.le}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">{t("deleteRule.warning")}</p>
              <p className="text-sm text-muted-foreground">{t("deleteRule.warningDetail")}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? tc("deleting") : t("deleteRule.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
