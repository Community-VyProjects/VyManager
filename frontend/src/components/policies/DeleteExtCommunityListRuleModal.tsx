"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { extcommunityListService, type ExtCommunityListRule } from "@/lib/api/extcommunity-list";

interface DeleteExtCommunityListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  extcommunityListName: string;
  rule: ExtCommunityListRule | null;
}

export function DeleteExtCommunityListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  extcommunityListName,
  rule,
}: DeleteExtCommunityListRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!rule) return;

    setLoading(true);
    setError(null);

    try {
      await extcommunityListService.deleteRule(extcommunityListName, rule.rule_number);
      onOpenChange(false);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Rule</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this rule? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              Deleting rule {rule.rule_number} from ExtCommunity list: {extcommunityListName}
            </p>
            {rule.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {rule.description}
              </p>
            )}
            {rule.regex && (
              <p className="text-sm text-muted-foreground mt-1">
                Pattern: <code className="text-xs bg-muted px-1 py-0.5 rounded">{rule.regex}</code>
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
