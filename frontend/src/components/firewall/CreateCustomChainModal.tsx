"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { AlertCircle, RefreshCw } from "lucide-react";
import { firewallIPv4Service } from "@/lib/api/firewall-ipv4";
import { firewallIPv6Service } from "@/lib/api/firewall-ipv6";

interface CreateCustomChainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingChainNames: string[];
  protocol?: "ipv4" | "ipv6";
}

export function CreateCustomChainModal({
  open,
  onOpenChange,
  onSuccess,
  existingChainNames,
  protocol = "ipv4",
}: CreateCustomChainModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chainName, setChainName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultAction, setDefaultAction] = useState("drop");

  const resetForm = () => {
    setChainName("");
    setDescription("");
    setDefaultAction("drop");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateChainName = (name: string): string | null => {
    if (!name.trim()) {
      return "Chain name is required";
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      return "Chain name must start with a letter and contain only letters, numbers, hyphens, and underscores";
    }
    if (existingChainNames.includes(name.toLowerCase())) {
      return "A chain with this name already exists";
    }
    if (["forward", "input", "output"].includes(name.toLowerCase())) {
      return "Cannot use base chain names";
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateChainName(chainName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const service = protocol === "ipv4" ? firewallIPv4Service : firewallIPv6Service;
      await service.createCustomChain(
        chainName.trim(),
        description.trim() || undefined,
        defaultAction
      );

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create custom chain");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Custom Chain</DialogTitle>
          <DialogDescription>
            Create a new custom firewall chain that can be referenced from base chains
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/90">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chainName">Chain Name *</Label>
            <Input
              id="chainName"
              value={chainName}
              onChange={(e) => setChainName(e.target.value)}
              placeholder="my-custom-chain"
            />
            <p className="text-xs text-muted-foreground">
              Must start with a letter and contain only letters, numbers, hyphens, and underscores
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this chain"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultAction">Default Action</Label>
            <Select value={defaultAction} onValueChange={setDefaultAction}>
              <SelectTrigger id="defaultAction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="drop">Drop</SelectItem>
                <SelectItem value="accept">Accept</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
                <SelectItem value="return">Return</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Action to take if no rules match in this chain
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
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
