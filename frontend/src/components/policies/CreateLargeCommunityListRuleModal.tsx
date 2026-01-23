"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { largeCommunityListService, type LargeCommunityListCapabilities } from "@/lib/api/large-community-list";

interface CreateLargeCommunityListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  largeCommunityListName: string;
  capabilities: LargeCommunityListCapabilities | null;
}

export function CreateLargeCommunityListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  largeCommunityListName,
  capabilities,
}: CreateLargeCommunityListRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [ruleNumber, setRuleNumber] = useState<number>(100);
  const [description, setDescription] = useState("");
  const [action, setAction] = useState<"permit" | "deny">("permit");
  const [regex, setRegex] = useState("");

  useEffect(() => {
    if (open) {
      calculateNextRuleNumber();
      setError(null);
    }
  }, [open, largeCommunityListName]);

  const calculateNextRuleNumber = async () => {
    try {
      const config = await largeCommunityListService.getConfig();
      const largeCommunityList = config.large_community_lists.find((lcl) => lcl.name === largeCommunityListName);

      if (!largeCommunityList || largeCommunityList.rules.length === 0) {
        setRuleNumber(100);
      } else {
        const ruleNumbers = largeCommunityList.rules.map((r) => r.rule_number);
        setRuleNumber(Math.max(...ruleNumbers) + 1);
      }
    } catch (err) {
      console.error("Failed to calculate next rule number:", err);
      setRuleNumber(100);
    }
  };

  const resetForm = () => {
    setDescription("");
    setAction("permit");
    setRegex("");
    setError(null);
  };

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
      await largeCommunityListService.addRule(largeCommunityListName, {
        rule_number: ruleNumber,
        description: description.trim() || null,
        action,
        regex: regex.trim(),
      });

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rule");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Rule</DialogTitle>
          <DialogDescription>
            Add a new rule to large community list: {largeCommunityListName} (Rule #{ruleNumber})
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
            {loading ? "Creating..." : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
