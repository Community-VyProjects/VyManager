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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, AlertCircle } from "lucide-react";
import { bridgeFirewallService } from "@/lib/api/firewall-bridge";

interface CreateCustomBridgeChainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCustomBridgeChainModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateCustomBridgeChainModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [chainName, setChainName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultAction, setDefaultAction] = useState("_none_");

  const resetForm = () => {
    setChainName("");
    setDescription("");
    setDefaultAction("_none_");
    setError(null);
  };

  const validateChainName = (name: string): string | null => {
    if (!name) {
      return "Chain name is required";
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      return "Chain name must start with a letter and contain only letters, numbers, underscores, and hyphens";
    }
    if (name.length > 28) {
      return "Chain name must be 28 characters or less";
    }
    const reserved = ["forward", "input", "output", "prerouting"];
    if (reserved.includes(name.toLowerCase())) {
      return "Cannot use reserved chain names (forward, input, output, prerouting)";
    }
    return null;
  };

  const handleSubmit = async () => {
    const nameError = validateChainName(chainName);
    if (nameError) {
      setError(nameError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await bridgeFirewallService.createCustomChain(chainName, {
        description: description || undefined,
        default_action: defaultAction !== "_none_" ? defaultAction : undefined,
      });

      if (response.success) {
        resetForm();
        onSuccess();
      } else {
        setError(response.error || "Failed to create custom chain");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create custom chain");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Custom Chain</DialogTitle>
          <DialogDescription>
            Create a new custom bridge firewall chain. Custom chains can be used as jump targets from base chains.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chainName">Chain Name *</Label>
            <Input
              id="chainName"
              placeholder="e.g., my-custom-chain"
              value={chainName}
              onChange={(e) => setChainName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Must start with a letter. Only letters, numbers, underscores, and hyphens allowed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultAction">Default Action</Label>
            <Select value={defaultAction} onValueChange={setDefaultAction}>
              <SelectTrigger>
                <SelectValue placeholder="Not Set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">Not Set</SelectItem>
                <SelectItem value="accept">Accept</SelectItem>
                <SelectItem value="drop">Drop</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Chain"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
