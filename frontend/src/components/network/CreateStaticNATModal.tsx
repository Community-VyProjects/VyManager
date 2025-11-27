"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { natService } from "@/lib/api/nat";
import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetInterface } from "@/lib/api/types/ethernet";

interface CreateStaticNATModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateStaticNATModal({ open, onOpenChange, onSuccess }: CreateStaticNATModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown data
  const [interfaces, setInterfaces] = useState<EthernetInterface[]>([]);

  // Auto-calculated rule number
  const [ruleNumber, setRuleNumber] = useState<number>(10);

  // Form fields
  const [description, setDescription] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [inboundInterface, setInboundInterface] = useState("");
  const [translationAddress, setTranslationAddress] = useState("");

  // Load interfaces and calculate next rule number on mount
  useEffect(() => {
    if (open) {
      loadInterfaces();
      calculateNextRuleNumber();
    }
  }, [open]);

  const loadInterfaces = async () => {
    try {
      const config = await ethernetService.getConfig();
      setInterfaces(config.interfaces);
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  const calculateNextRuleNumber = async () => {
    try {
      const config = await natService.getConfig();

      // Find the maximum rule number for STATIC NAT rules only
      const staticRuleNumbers = config.static_rules.map(r => r.rule_number);

      if (staticRuleNumbers.length === 0) {
        setRuleNumber(100); // Start at 100 if no static rules exist
      } else {
        const maxRuleNumber = Math.max(...staticRuleNumbers);
        setRuleNumber(maxRuleNumber + 1);
      }
    } catch (err) {
      console.error("Failed to calculate next rule number:", err);
      setRuleNumber(100); // Default to 100 on error
    }
  };

  const resetForm = () => {
    // Don't reset ruleNumber - it's auto-calculated
    setDescription("");
    setDestinationAddress("");
    setInboundInterface("");
    setTranslationAddress("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    // Validation
    if (!destinationAddress.trim()) {
      setError("Destination address is required");
      return;
    }

    if (!translationAddress.trim()) {
      setError("Translation address is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const config: any = {};

      if (description.trim()) {
        config.description = description.trim();
      }

      config.destination_address = destinationAddress.trim();

      if (inboundInterface) {
        config.inbound_interface = inboundInterface;
      }

      config.translation_address = translationAddress.trim();

      // Use auto-calculated rule number
      await natService.createStaticRule(ruleNumber, config);

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create static NAT rule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Static NAT Rule</DialogTitle>
          <DialogDescription>
            Create a new static NAT rule for one-to-one address translation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Alert */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Rule Number (Auto-calculated) */}
          <div className="space-y-2 bg-muted/30 border border-muted rounded-lg p-4">
            <Label htmlFor="rule-number">Rule Number (Auto-assigned)</Label>
            <div className="text-2xl font-mono font-bold text-primary">
              {ruleNumber}
            </div>
            <p className="text-xs text-muted-foreground">
              This rule will be automatically assigned number {ruleNumber}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this rule"
              rows={2}
            />
          </div>

          {/* Destination Address */}
          <div className="space-y-2">
            <Label htmlFor="destination-address">
              Destination Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="destination-address"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="e.g., 203.0.113.10"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              The external/public IP address to translate from
            </p>
          </div>

          {/* Inbound Interface */}
          <div className="space-y-2">
            <Label htmlFor="inbound-interface">Inbound Interface</Label>
            <Select value={inboundInterface} onValueChange={setInboundInterface}>
              <SelectTrigger id="inbound-interface">
                <SelectValue placeholder="Select interface" />
              </SelectTrigger>
              <SelectContent>
                {interfaces.map((iface) => (
                  <SelectItem key={iface.name} value={iface.name}>
                    {iface.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The interface on which the traffic arrives
            </p>
          </div>

          {/* Translation Address */}
          <div className="space-y-2">
            <Label htmlFor="translation-address">
              Translation Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="translation-address"
              value={translationAddress}
              onChange={(e) => setTranslationAddress(e.target.value)}
              placeholder="e.g., 192.168.1.10"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              The internal/private IP address to translate to
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-blue-500">Static NAT Mapping</p>
            <p className="text-xs text-muted-foreground">
              Static NAT creates a one-to-one mapping between external and internal IP addresses.
              Traffic arriving at the destination address will be translated to the translation address.
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {destinationAddress || "203.0.113.10"} → {translationAddress || "192.168.1.10"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
