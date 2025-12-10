"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { largeCommunityListService, type LargeCommunityListCapabilities, type LargeCommunityListRule } from "@/lib/api/large-community-list";

interface EditLargeCommunityListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  largeCommunityListName: string;
  rule: LargeCommunityListRule;
  capabilities: LargeCommunityListCapabilities | null;
}

export function EditLargeCommunityListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  largeCommunityListName,
  rule,
  capabilities,
}: EditLargeCommunityListRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [description, setDescription] = useState("");
  const [action, setAction] = useState<"permit" | "deny">("permit");
  const [regex, setRegex] = useState("");

  useEffect(() => {
    if (open && rule) {
      setDescription(rule.description || "");
      setAction(rule.action as "permit" | "deny");
      setRegex(rule.regex || "");
      setError(null);
    }
  }, [open, rule]);

  const handleSubmit = async () => {
    if (!regex.trim()) {
      setError("Regex pattern is required");
      return;
    }

    // Validate large community format: ASN:NN:NN or IP:NN:NN
    const parts = regex.trim().split(':');
    if (parts.length !== 3) {
      setError("Large community must be in format ASN:NN:NN or IP:NN:NN (e.g., 4242420696:10[0-1]:.*)" );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await largeCommunityListService.updateRule(largeCommunityListName, rule.rule_number, {
        description: description.trim() || undefined,
        action,
        regex: regex.trim(),
      });

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rule");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Rule #{rule.rule_number}</DialogTitle>
          <DialogDescription>
            Editing rule in large community list: {largeCommunityListName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="action">Action *</Label>
            <Select value={action} onValueChange={(v) => setAction(v as "permit" | "deny")} disabled={loading}>
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
              placeholder="e.g., 4242420696:10[0-1]:.*"
              value={regex}
              onChange={(e) => setRegex(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Large community pattern (ASN:NN:NN or IP:NN:NN format)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
