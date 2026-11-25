"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { routeService, type PolicyRouteRule, type RoutePolicyType } from "@/lib/api/route";
import type { ApiError } from "@/lib/types/api";
import { useTranslations } from "next-intl";

interface DeleteRouteRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  policyType: RoutePolicyType;
  policyName: string;
  rule: PolicyRouteRule | null;
}

export function DeleteRouteRuleModal({
  open,
  onOpenChange,
  onSuccess,
  policyType,
  policyName,
  rule,
}: DeleteRouteRuleModalProps) {
  const t = useTranslations("routePolicy.deleteRule");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!rule) return;
    setLoading(true);
    setError(null);

    try {
      await routeService.deleteRule(policyType, policyName, rule.rule_number);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("deleteFailed"));
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title", { number: String(rule?.rule_number ?? "") })}</DialogTitle>
          <DialogDescription>
            {t("description", { policyName })}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-yellow-900 dark:text-yellow-100">{t("warning")}</p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                {t.rich("warningText", {
                  mono: (chunks) => <span className="font-mono">{chunks}</span>,
                  number: String(rule?.rule_number ?? ""),
                  policyName,
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? tc("deleting") : t("submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
