"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { accessListService, type AccessListRule } from "@/lib/api/access-list";

interface EditAccessListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  rule: AccessListRule | null;
  listNumber: string;
  listType: "ipv4" | "ipv6";
}

export function EditAccessListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  rule,
  listNumber,
  listType,
}: EditAccessListRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [action, setAction] = useState<"permit" | "deny">("permit");
  const [ruleDescription, setRuleDescription] = useState("");
  const [sourceType, setSourceType] = useState<"any" | "host" | "network">("any");
  const [sourceNetworkFormat, setSourceNetworkFormat] = useState<"network" | "inverse-mask">("network");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceMask, setSourceMask] = useState("");
  const [destinationType, setDestinationType] = useState<"any" | "host" | "network">("any");
  const [destinationNetworkFormat, setDestinationNetworkFormat] = useState<"network" | "inverse-mask">("network");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationMask, setDestinationMask] = useState("");

  useEffect(() => {
    if (open && rule) {
      // Pre-populate form with existing rule data
      setAction(rule.action as "permit" | "deny");
      setRuleDescription(rule.description || "");

      // Map source type
      if (rule.source_type === "inverse-mask") {
        setSourceType("network");
        setSourceNetworkFormat("inverse-mask");
      } else {
        setSourceType((rule.source_type as any) || "any");
        setSourceNetworkFormat("network");
      }
      setSourceAddress(rule.source_address || "");
      setSourceMask(rule.source_mask || "");

      // Map destination type
      if (rule.destination_type === "inverse-mask") {
        setDestinationType("network");
        setDestinationNetworkFormat("inverse-mask");
      } else {
        setDestinationType((rule.destination_type as any) || "any");
        setDestinationNetworkFormat("network");
      }
      setDestinationAddress(rule.destination_address || "");
      setDestinationMask(rule.destination_mask || "");
    }
  }, [open, rule]);

  // Clear source fields when type changes
  useEffect(() => {
    if (sourceType === "any") {
      setSourceAddress("");
      setSourceMask("");
    } else if (sourceType === "host") {
      setSourceMask("");
    }
  }, [sourceType]);

  // Clear destination fields when type changes
  useEffect(() => {
    if (destinationType === "any") {
      setDestinationAddress("");
      setDestinationMask("");
    } else if (destinationType === "host") {
      setDestinationMask("");
    }
  }, [destinationType]);

  const resetForm = () => {
    setAction("permit");
    setRuleDescription("");
    setSourceType("any");
    setSourceAddress("");
    setSourceMask("");
    setDestinationType("any");
    setDestinationAddress("");
    setDestinationMask("");
  };

  const handleClose = () => {
    setError(null);
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!rule) return;

    // Validation
    if (sourceType === "host" && !sourceAddress.trim()) {
      setError("Please enter a source address for host type");
      return;
    }
    if (sourceType === "inverse-mask" && (!sourceAddress.trim() || !sourceMask.trim())) {
      setError("Please enter both source address and mask for inverse-mask type");
      return;
    }
    if (sourceType === "network" && !sourceAddress.trim()) {
      setError("Please enter a source address for network type");
      return;
    }
    if (sourceType === "network" && listType === "ipv4" && !sourceMask.trim()) {
      setError("Please enter a source mask for network type");
      return;
    }

    if (destinationType === "host" && !destinationAddress.trim()) {
      setError("Please enter a destination address for host type");
      return;
    }
    if (destinationType === "inverse-mask" && (!destinationAddress.trim() || !destinationMask.trim())) {
      setError("Please enter both destination address and mask for inverse-mask type");
      return;
    }
    if (destinationType === "network" && !destinationAddress.trim()) {
      setError("Please enter a destination address for network type");
      return;
    }
    if (destinationType === "network" && listType === "ipv4" && !destinationMask.trim()) {
      setError("Please enter a destination mask for network type");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Map network type to inverse-mask (always use inverse-mask for network in IPv4)
      const actualSourceType = sourceType === "network" ? "inverse-mask" : sourceType;
      const actualDestinationType = destinationType === "network" ? "inverse-mask" : destinationType;

      const updatedRule: any = {
        action,
        description: ruleDescription || null,
        source_type: actualSourceType,
        source_address: sourceAddress || null,
        source_mask: sourceMask || null,
        destination_type: actualDestinationType,
        destination_address: destinationAddress || null,
        destination_mask: destinationMask || null,
      };

      await accessListService.updateRule(
        listNumber,
        listType,
        rule.rule_number,
        updatedRule
      );
      handleClose();
      onSuccess();
    } catch (err: any) {
      console.error("Update rule error:", err);
      let errorMsg = "Failed to update rule";
      if (err.details?.detail) {
        if (Array.isArray(err.details.detail)) {
          errorMsg = err.details.detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join(", ");
        } else {
          errorMsg = err.details.detail;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Rule {rule.rule_number}</DialogTitle>
          <DialogDescription>
            Update the configuration for this access list rule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rule Number</Label>
              <Input value={rule.rule_number} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Rule number cannot be changed</p>
            </div>

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
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule-description">Rule Description</Label>
            <Input
              id="rule-description"
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              placeholder="Enter rule description (optional)"
              disabled={loading}
            />
          </div>

          {/* Source Configuration */}
          <div className="space-y-3 border rounded-lg p-4">
            <Label>Source</Label>
            <RadioGroup value={sourceType} onValueChange={(v: any) => setSourceType(v)} disabled={loading}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="any" id="source-any" />
                <Label htmlFor="source-any" className="font-normal cursor-pointer">Any</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="host" id="source-host" />
                <Label htmlFor="source-host" className="font-normal cursor-pointer">Host</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="network" id="source-network" />
                <Label htmlFor="source-network" className="font-normal cursor-pointer">Network</Label>
              </div>
            </RadioGroup>

            {sourceType === "host" && (
              <div className="space-y-2 mt-3">
                <Label htmlFor="source-address">Host Address *</Label>
                <Input
                  id="source-address"
                  value={sourceAddress}
                  onChange={(e) => setSourceAddress(e.target.value)}
                  placeholder={listType === "ipv4" ? "e.g., 192.168.1.1" : "e.g., 2001:db8::1"}
                  disabled={loading}
                />
              </div>
            )}

            {sourceType === "network" && (
              <div className="space-y-3 mt-3">
                {listType === "ipv4" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="source-address-net">Network Address *</Label>
                      <Input
                        id="source-address-net"
                        value={sourceAddress}
                        onChange={(e) => setSourceAddress(e.target.value)}
                        placeholder="e.g., 192.168.1.0"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="source-mask-net">Inverse Mask *</Label>
                      <Input
                        id="source-mask-net"
                        value={sourceMask}
                        onChange={(e) => setSourceMask(e.target.value)}
                        placeholder="e.g., 0.0.0.255"
                        disabled={loading}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="source-address-net6">Network (CIDR) *</Label>
                    <Input
                      id="source-address-net6"
                      value={sourceAddress}
                      onChange={(e) => setSourceAddress(e.target.value)}
                      placeholder="e.g., 2001:db8::/32"
                      disabled={loading}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Destination Configuration */}
          <div className="space-y-3 border rounded-lg p-4">
            <Label>Destination</Label>
            <RadioGroup value={destinationType} onValueChange={(v: any) => setDestinationType(v)} disabled={loading}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="any" id="dest-any" />
                <Label htmlFor="dest-any" className="font-normal cursor-pointer">Any</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="host" id="dest-host" />
                <Label htmlFor="dest-host" className="font-normal cursor-pointer">Host</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="network" id="dest-network" />
                <Label htmlFor="dest-network" className="font-normal cursor-pointer">Network</Label>
              </div>
            </RadioGroup>

            {destinationType === "host" && (
              <div className="space-y-2 mt-3">
                <Label htmlFor="dest-address">Host Address *</Label>
                <Input
                  id="dest-address"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder={listType === "ipv4" ? "e.g., 10.0.0.1" : "e.g., 2001:db8::2"}
                  disabled={loading}
                />
              </div>
            )}

            {destinationType === "network" && (
              <div className="space-y-3 mt-3">
                {listType === "ipv4" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dest-address-net">Network Address *</Label>
                      <Input
                        id="dest-address-net"
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        placeholder="e.g., 10.0.0.0"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dest-mask-net">Inverse Mask *</Label>
                      <Input
                        id="dest-mask-net"
                        value={destinationMask}
                        onChange={(e) => setDestinationMask(e.target.value)}
                        placeholder="e.g., 0.0.0.255"
                        disabled={loading}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="dest-address-net6">Network (CIDR) *</Label>
                    <Input
                      id="dest-address-net6"
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                      placeholder="e.g., 2001:db8:1::/48"
                      disabled={loading}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating..." : "Update Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
