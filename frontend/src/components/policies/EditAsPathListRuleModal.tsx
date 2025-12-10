"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { asPathListService, type AsPathListCapabilities, type AsPathListRule } from "@/lib/api/as-path-list";

interface EditAsPathListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  asPathListName: string;
  rule: AsPathListRule;
  capabilities: AsPathListCapabilities | null;
}

export function EditAsPathListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  asPathListName,
  rule,
  capabilities,
}: EditAsPathListRuleModalProps) {
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

    setLoading(true);
    setError(null);

    try {
      await asPathListService.updateRule(asPathListName, rule.rule_number, {
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
            Editing rule in AS path list: {asPathListName}
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
              placeholder="e.g., ^65000_"
              value={regex}
              onChange={(e) => setRegex(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Regular expression to match AS paths (e.g., "64501 64502")
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
