"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { natService } from "@/lib/api/nat";
import type { StaticNATRule } from "@/lib/api/nat";

interface StaticNATModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: StaticNATRule | null;
  onSuccess: () => void;
}

export function StaticNATModal({ open, onOpenChange, existing, onSuccess }: StaticNATModalProps) {
  const isEdit = !!existing;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ruleNumber, setRuleNumber] = useState<number>(10);
  const [description, setDescription] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [inboundInterface, setInboundInterface] = useState("");
  const [translationAddress, setTranslationAddress] = useState("");

  useEffect(() => {
    if (!open) return;
    resetForm();
    if (existing) {
      populateForm(existing);
    } else {
      void calculateNextRuleNumber();
    }
  }, [open, existing]);

  const calculateNextRuleNumber = async () => {
    try {
      const config = await natService.getConfig();
      const staticRuleNumbers = config.static_rules.map((r) => r.rule_number);
      if (staticRuleNumbers.length === 0) {
        setRuleNumber(100);
      } else {
        setRuleNumber(Math.max(...staticRuleNumbers) + 1);
      }
    } catch (err) {
      console.error("Failed to calculate next rule number:", err);
      setRuleNumber(100);
    }
  };

  const resetForm = () => {
    setDescription("");
    setDestinationAddress("");
    setInboundInterface("");
    setTranslationAddress("");
    setError(null);
  };

  const populateForm = (rule: StaticNATRule) => {
    setDescription(rule.description || "");
    if (rule.destination?.address) {
      setDestinationAddress(rule.destination.address);
    }
    if (rule.inbound_interface) {
      setInboundInterface(rule.inbound_interface);
    }
    if (rule.translation?.address) {
      setTranslationAddress(rule.translation.address);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
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
      const config: Record<string, string> = {};
      config.description = description.trim();
      config.destination_address = destinationAddress.trim();
      if (inboundInterface) {
        config.inbound_interface = inboundInterface;
      }
      config.translation_address = translationAddress.trim();

      if (isEdit) {
        if (!existing) return;
        await natService.updateStaticRule(existing.rule_number, config);
      } else {
        await natService.createStaticRule(ruleNumber, config);
      }

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? "Failed to update static NAT rule" : "Failed to create static NAT rule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit Static NAT Rule ${existing?.rule_number}` : "Create Static NAT Rule"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modify the static NAT rule configuration (1:1 mapping)."
              : "Create a new static NAT rule for one-to-one address translation."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-2 bg-muted/30 border border-muted rounded-lg p-4">
            <Label htmlFor="rule-number">{isEdit ? "Rule Number" : "Rule Number (Auto-assigned)"}</Label>
            <div className="text-2xl font-mono font-bold text-primary">
              {isEdit ? existing?.rule_number : ruleNumber}
            </div>
            {!isEdit && (
              <p className="text-xs text-muted-foreground">
                This rule will be automatically assigned number {ruleNumber}
              </p>
            )}
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="destination-address">
              Destination Address {isEdit ? "(External)" : <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="destination-address"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="e.g., 203.0.113.10"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {isEdit ? "The external/public IP address" : "The external/public IP address to translate from"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inbound-interface">
              {isEdit ? "Inbound Interface (Optional)" : "Inbound Interface"}
            </Label>
            <InterfaceSelect
              value={inboundInterface}
              onValueChange={setInboundInterface}
              id="inbound-interface"
              placeholder={isEdit ? "Select interface (optional)" : "Select interface"}
            />
            {isEdit && inboundInterface && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInboundInterface("")}
                className="h-6 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear selection
              </Button>
            )}
            {!isEdit && (
              <p className="text-xs text-muted-foreground">
                The interface on which the traffic arrives
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="translation-address">
              Translation Address {isEdit ? "(Internal)" : <span className="text-destructive">*</span>}
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

          {!isEdit && (
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
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (isEdit ? "Updating..." : "Creating...") : isEdit ? "Update Rule" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
