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
import { AlertCircle } from "lucide-react";
import {
  nat64Service,
  type NAT64SourceRule,
  type NAT64TranslationPool,
} from "@/lib/api/nat64";

interface NAT64DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: {
    type: "rule" | "pool";
    rule: NAT64SourceRule;
    pool?: NAT64TranslationPool;
  } | null;
  onSuccess: () => void;
}

export function NAT64DeleteDialog({
  open,
  onOpenChange,
  target,
  onSuccess,
}: NAT64DeleteDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      if (target.type === "rule") {
        await nat64Service.deleteAndCompactRules(target.rule.rule_number);
      } else if (target.pool) {
        await nat64Service.deletePool(
          target.rule.rule_number,
          target.pool.pool_number
        );
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  if (!target) return null;

  const isRule = target.type === "rule";
  const title = isRule
    ? `Delete Rule ${target.rule.rule_number}`
    : `Delete Pool ${target.pool?.pool_number}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isRule ? (
              <>
                This will permanently delete Rule {target.rule.rule_number}
                {target.rule.translation_pools.length > 0 && (
                  <> and its {target.rule.translation_pools.length} translation{" "}
                    {target.rule.translation_pools.length === 1 ? "pool" : "pools"}</>
                )}
                . Remaining rules will be renumbered starting from 100.
              </>
            ) : (
              <>
                This will permanently delete Pool {target.pool?.pool_number} from
                Rule {target.rule.rule_number}. This action cannot be undone.
              </>
            )}
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
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={saving}>
            {saving ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
