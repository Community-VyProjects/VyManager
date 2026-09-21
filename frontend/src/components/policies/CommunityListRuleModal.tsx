"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { communityListService, type CommunityListCapabilities, type CommunityListRule } from "@/lib/api/community-list";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  emptyRegexListRuleDraft,
  nextRuleNumber,
  regexListRuleDraftFrom,
  submitCommunityRuleCreate,
  submitCommunityRuleUpdate,
  validateRegexListRule,
  type RegexListRuleDraft,
} from "./policy-list-rule-form";

interface CommunityListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  communityListName: string;
  existing?: CommunityListRule | null;
  capabilities: CommunityListCapabilities | null;
}

export function CommunityListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  communityListName,
  existing,
}: CommunityListRuleModalProps) {
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RegexListRuleDraft>(emptyRegexListRuleDraft());

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDraft(regexListRuleDraftFrom(existing));
    } else {
      setDraft(emptyRegexListRuleDraft());
      communityListService.getConfig().then((config) => {
        const list = config.community_lists.find((apl) => apl.name === communityListName);
        setDraft((d) => ({ ...d, ruleNumber: nextRuleNumber(list?.rules ?? []) }));
      }).catch((err) => {
        console.error("Failed to calculate next rule number:", err);
      });
    }
    setError(null);
  }, [open, existing, communityListName]);

  const patch = (fields: Partial<RegexListRuleDraft>) => setDraft((d) => ({ ...d, ...fields }));
  const lockedRule = lockedIdentity(existing, (r) => String(r.rule_number), String(draft.ruleNumber));

  const handleSubmit = async () => {
    const validationError = validateRegexListRule(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    const write = modalWriteKind(existing ? { name: String(existing.rule_number) } : null);
    setLoading(true);
    setError(null);

    try {
      const result =
        write.kind === "update" && existing
          ? await submitCommunityRuleUpdate(communityListName, existing, draft)
          : await submitCommunityRuleCreate(communityListName, draft);
      if (result && result.success === false) {
        setError(result.error || "Operation failed");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? "Failed to update rule" : "Failed to create rule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !loading) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit Rule #${lockedRule.value}` : "Add Rule"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Editing rule in community list: ${communityListName}`
              : `Add a new rule to community list: ${communityListName} (Rule #${draft.ruleNumber})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="action">Action *</Label>
            <Select value={draft.action} onValueChange={(v) => patch({ action: v as "permit" | "deny" })} disabled={loading}>
              <SelectTrigger id="action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permit">Permit</SelectItem>
                <SelectItem value="deny">Deny</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="regex">Regex Pattern *</Label>
            <Input
              id="regex"
              placeholder="e.g., _65000:"
              value={draft.regex}
              onChange={(e) => patch({ regex: e.target.value })}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Regular expression to match BGP communities (e.g., &quot;64501 64502&quot;)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Optional description"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save Changes" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
