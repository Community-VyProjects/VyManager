"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { largeCommunityListService } from "@/lib/api/large-community-list";

interface CreateLargeCommunityListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateLargeCommunityListModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateLargeCommunityListModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ruleNumber, setRuleNumber] = useState("100");
  const [ruleDescription, setRuleDescription] = useState("");
  const [action, setAction] = useState<"permit" | "deny">("permit");
  const [regex, setRegex] = useState("");

  const resetForm = () => {
    setName("");
    setDescription("");
    setRuleNumber("100");
    setRuleDescription("");
    setAction("permit");
    setRegex("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Large community list name is required");
      return;
    }

    if (!ruleNumber || isNaN(Number(ruleNumber))) {
      setError("Valid rule number is required");
      return;
    }

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
      await largeCommunityListService.createLargeCommunityList(
        name.trim(),
        description.trim() || null,
        {
          rule_number: Number(ruleNumber),
          description: ruleDescription.trim() || null,
          action,
          regex: regex.trim(),
        }
      );

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create large community list");
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Large Community List</DialogTitle>
          <DialogDescription>
            Create a new BGP large community list with an initial rule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Large Community List Fields */}
          <div className="space-y-2">
            <Label htmlFor="name">Large Community List Name *</Label>
            <Input
              id="name"
              placeholder="e.g., ALLOW_AS65000"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={2}
            />
          </div>

          {/* Initial Rule */}
          <div className="pt-4 border-t">
            <h3 className="font-semibold text-sm mb-4">Initial Rule (Rule #{ruleNumber})</h3>

            <div className="space-y-4">
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
                <Label htmlFor="ruleDescription">Rule Description</Label>
                <Input
                  id="ruleDescription"
                  placeholder="Optional rule description"
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
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
            {loading ? "Creating..." : "Create Large Community List"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
