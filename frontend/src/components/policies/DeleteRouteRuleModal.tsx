"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { routeService } from "@/lib/api/route";

interface DeleteRouteRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  policyType: string;
  policyName: string;
  rule: any;
}

export function DeleteRouteRuleModal({
  open,
  onOpenChange,
  onSuccess,
  policyType,
  policyName,
  rule,
}: DeleteRouteRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await routeService.deleteRule(policyType, policyName, rule.rule_number);
      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to delete rule");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Rule {rule?.rule_number}</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this rule from policy {policyName}?
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-yellow-900 dark:text-yellow-100">Warning</p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                This will permanently delete rule <span className="font-mono">{rule?.rule_number}</span> from policy <span className="font-mono">{policyName}</span>.
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete Rule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
