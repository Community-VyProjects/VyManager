"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { routeMapService, type RouteMapRule } from "@/lib/api/route-map";

interface DeleteRouteMapRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  routeMapName: string;
  rule: RouteMapRule | null;
}

export function DeleteRouteMapRuleModal({
  open,
  onOpenChange,
  onSuccess,
  routeMapName,
  rule,
}: DeleteRouteMapRuleModalProps) {
  const t = useTranslations("routeMap");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!rule) return;

    setLoading(true);
    setError(null);

    try {
      await routeMapService.deleteRule(routeMapName, rule.rule_number);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deleteRule.deleteFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteRule.title")}</DialogTitle>
          <DialogDescription>
            {t("deleteRule.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              {t("deleteRule.deleting", { number: String(rule.rule_number), name: routeMapName })}
            </p>
            {rule.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {rule.description}
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
            {loading ? tc("deleting") : t("deleteRule.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
