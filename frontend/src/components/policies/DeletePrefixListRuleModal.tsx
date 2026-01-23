"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { prefixListService, type PrefixListRule } from "@/lib/api/prefix-list";

interface DeletePrefixListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  rule: PrefixListRule | null;
  listName: string | null;
  listType: string;
}

export function DeletePrefixListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  rule,
  listName,
  listType,
}: DeletePrefixListRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!rule || !listName) return;

    setLoading(true);
    setError(null);

    try {
      await prefixListService.deleteRule(listName, listType, rule.rule_number);
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rule");
    } finally {
      setLoading(false);
    }
  };

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Delete Prefix List Rule</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this rule? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* Rule Details */}
        <div className="space-y-4 py-4">
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    Rule {rule.rule_number}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      rule.action === "permit"
                        ? "capitalize bg-green-500/10 text-green-500 border-green-500/20"
                        : "capitalize bg-red-500/10 text-red-500 border-red-500/20"
                    }
                  >
                    {rule.action}
                  </Badge>
                </div>
                {rule.description && (
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                )}
                <div className="space-y-1 text-sm">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground min-w-24">Prefix:</span>
                    <span className="font-mono">{rule.prefix || "—"}</span>
                  </div>
                  {(rule.ge !== null && rule.ge !== undefined) && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-24">GE:</span>
                      <span className="font-mono">{rule.ge}</span>
                    </div>
                  )}
                  {(rule.le !== null && rule.le !== undefined) && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-24">LE:</span>
                      <span className="font-mono">{rule.le}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                This will permanently delete the rule
              </p>
              <p className="text-sm text-muted-foreground">
                Route filtering configured in this rule will be removed.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
