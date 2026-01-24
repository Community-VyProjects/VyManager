"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, AlertTriangle } from "lucide-react";
import {
  bridgeFirewallService,
  type BridgeRule,
} from "@/lib/api/firewall-bridge";

interface DeleteBridgeRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chain: string;
  rule: BridgeRule;
  onSuccess: () => void;
}

export function DeleteBridgeRuleModal({
  open,
  onOpenChange,
  chain,
  rule,
  onSuccess,
}: DeleteBridgeRuleModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const response = await bridgeFirewallService.deleteRule(chain, rule.rule_number);

      if (response.success) {
        onSuccess();
      } else {
        setError(response.error || "Failed to delete rule");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rule");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Bridge Firewall Rule
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this rule? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="bg-muted/50 rounded-md p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rule Number:</span>
            <span className="font-mono">{rule.rule_number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Chain:</span>
            <span className="font-medium">{chain}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Action:</span>
            <span className="font-medium">{rule.action || "—"}</span>
          </div>
          {rule.description && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Description:</span>
              <span className="truncate max-w-[200px]">{rule.description}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Rule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
