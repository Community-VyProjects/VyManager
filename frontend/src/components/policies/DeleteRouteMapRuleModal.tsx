"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { routeMapService, type RouteMapRule } from "@/lib/api/route-map";
import type { ApiError } from "@/lib/types/api";

interface DeleteRouteMapRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  routeMapName: string;
  rule: RouteMapRule;
}

/** Deletes one rule (the others keep their numbers); a rejected commit stays open with its error. */
export function DeleteRouteMapRuleModal({ open, onOpenChange, onSuccess, routeMapName, rule }: DeleteRouteMapRuleModalProps) {
  const t = useTranslations("routeMap");
  const tr = useTranslations("routeMapRuleModal");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await routeMapService.deleteRule(routeMapName, rule.rule_number);
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

  const action = rule.action === "permit" ? tr("permit") : rule.action === "deny" ? tr("deny") : rule.action;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("deleteRule.title")}</DialogTitle>
          <DialogDescription>{t("deleteRule.description", { name: routeMapName })}</DialogDescription>
        </DialogHeader>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {t("deleteRule.ruleBadge", { number: String(rule.rule_number) })}
              </Badge>
              {action && <Badge variant="outline">{action}</Badge>}
            </div>
            {rule.description && <p className="text-sm text-muted-foreground">{rule.description}</p>}
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
            {loading ? tc("deleting") : tc("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
