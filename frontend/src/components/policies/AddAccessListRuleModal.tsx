"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { accessListService, type AccessList } from "@/lib/api/access-list";

interface AddAccessListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  accessList: AccessList | null;
}

export function AddAccessListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  accessList,
}: AddAccessListRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [ruleNumber, setRuleNumber] = useState(100);
  const [action, setAction] = useState<"permit" | "deny">("permit");
  const [ruleDescription, setRuleDescription] = useState("");
  const [sourceType, setSourceType] = useState<"any" | "host" | "network">("any");
  const [sourceNetworkFormat, setSourceNetworkFormat] = useState<"network" | "inverse-mask">("network");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceMask, setSourceMask] = useState("");
  // IPv6 specific fields
  const [sourceAny, setSourceAny] = useState(false);
  const [sourceExactMatch, setSourceExactMatch] = useState(false);
  const [sourceNetwork, setSourceNetwork] = useState("");
  const [destinationType, setDestinationType] = useState<"any" | "host" | "network">("any");
  const [destinationNetworkFormat, setDestinationNetworkFormat] = useState<"network" | "inverse-mask">("network");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationMask, setDestinationMask] = useState("");

  useEffect(() => {
    if (open && accessList) {
      // Calculate next rule number
      const ruleNumbers = accessList.rules.map(r => r.rule_number);
      if (ruleNumbers.length === 0) {
        setRuleNumber(100);
      } else {
        setRuleNumber(Math.max(...ruleNumbers) + 1);
      }
    }
  }, [open, accessList]);

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

  // Mutual exclusivity for IPv6: exact-match and network are mutually exclusive
  // But "any" can coexist with either
  useEffect(() => {
    if (sourceNetwork.trim() && sourceExactMatch) {
      setSourceExactMatch(false);
    }
  }, [sourceNetwork]);

  useEffect(() => {
    if (sourceExactMatch && sourceNetwork.trim()) {
      setSourceNetwork("");
    }
  }, [sourceExactMatch]);

  const resetForm = () => {
    setRuleNumber(100);
    setAction("permit");
    setRuleDescription("");
    setSourceType("any");
    setSourceAddress("");
    setSourceMask("");
    setSourceAny(false);
    setSourceExactMatch(false);
    setSourceNetwork("");
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
    if (!accessList) return;

    const listType = accessList.list_type as "ipv4" | "ipv6";

    // Validation
    if (listType === "ipv4") {
      // IPv4 validation
      if (sourceType === "host" && !sourceAddress.trim()) {
        setError("Please enter a source address for host type");
        return;
      }
      if (sourceType === "network" && !sourceAddress.trim()) {
        setError("Please enter a source address for network type");
        return;
      }
      if (sourceType === "network" && !sourceMask.trim()) {
        setError("Please enter a source mask for network type");
        return;
      }

      // Destination validation (IPv4 only)
      if (destinationType === "host" && !destinationAddress.trim()) {
        setError("Please enter a destination address for host type");
        return;
      }
      if (destinationType === "network" && !destinationAddress.trim()) {
        setError("Please enter a destination address for network type");
        return;
      }
      if (destinationType === "network" && !destinationMask.trim()) {
        setError("Please enter a destination mask for network type");
        return;
      }
    } else {
      // IPv6 validation
      if (sourceNetwork.trim()) {
        // Validate IPv6 CIDR format
        if (!sourceNetwork.includes('/')) {
          setError("IPv6 network must be in CIDR format (e.g., 2001:db8::/32)");
          return;
        }
      }

      // At least one option must be selected
      if (!sourceAny && !sourceExactMatch && !sourceNetwork.trim()) {
        setError("Please select at least one source option (Any, Exact Match, or Network)");
        return;
      }

      // Exact-match and network are mutually exclusive
      if (sourceExactMatch && sourceNetwork.trim()) {
        setError("Exact Match and Network cannot be used together");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      let newRule: any = {
        rule_number: ruleNumber,
        action,
        description: ruleDescription || null,
      };

      if (listType === "ipv4") {
        // IPv4 rule - map network type to inverse-mask
        const actualSourceType = sourceType === "network" ? "inverse-mask" : sourceType;
        const actualDestinationType = destinationType === "network" ? "inverse-mask" : destinationType;

        newRule.source_type = actualSourceType;
        newRule.source_address = sourceAddress || null;
        newRule.source_mask = sourceMask || null;
        newRule.destination_type = actualDestinationType;
        newRule.destination_address = destinationAddress || null;
        newRule.destination_mask = destinationMask || null;
      } else {
        // IPv6 rule - handle combinations
        // any can coexist with network or exact-match
        // exact-match and network are mutually exclusive
        if (sourceAny) {
          newRule.source_type = "any";
        }

        if (sourceNetwork.trim()) {
          newRule.source_address = sourceNetwork;
          // If we don't have "any" already set, set source_type to "network"
          if (!sourceAny) {
            newRule.source_type = "network";
          }
        }

        if (sourceExactMatch) {
          newRule.source_exact_match = true;
        }
      }

      await accessListService.addRule(
        accessList.number,
        accessList.list_type,
        newRule
      );
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add rule");
    } finally {
      setLoading(false);
    }
  };

  if (!accessList) return null;

  const listType = accessList.list_type as "ipv4" | "ipv6";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Rule to {accessList.number}</DialogTitle>
          <DialogDescription>
            Create a new rule for this access list
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rule-number">Rule Number</Label>
              <Input
                id="rule-number"
                type="number"
                value={ruleNumber}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Auto-calculated based on existing rules</p>
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

            {listType === "ipv4" ? (
              /* IPv4 Source - Radio Buttons */
              <>
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
                      placeholder="e.g., 192.168.1.1"
                      disabled={loading}
                    />
                  </div>
                )}

                {sourceType === "network" && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
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
                )}
              </>
            ) : (
              /* IPv6 Source - Checkboxes for Any/Exact-Match, separate Network field */
              <>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="source-any-v6"
                      checked={sourceAny}
                      onCheckedChange={(checked) => setSourceAny(checked as boolean)}
                      disabled={loading}
                    />
                    <Label htmlFor="source-any-v6" className="font-normal cursor-pointer">Any</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="source-exact-match"
                      checked={sourceExactMatch}
                      onCheckedChange={(checked) => setSourceExactMatch(checked as boolean)}
                      disabled={loading || !!sourceNetwork.trim()}
                    />
                    <Label htmlFor="source-exact-match" className="font-normal cursor-pointer">Exact Match</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Any can coexist with Exact Match OR Network. Exact Match and Network are mutually exclusive.
                  </p>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="source-network-v6">Network (CIDR)</Label>
                  <Input
                    id="source-network-v6"
                    value={sourceNetwork}
                    onChange={(e) => setSourceNetwork(e.target.value)}
                    placeholder="e.g., 2001:db8::/32"
                    disabled={loading || sourceExactMatch}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must include prefix length (e.g., /32, /64). Can coexist with Any, but not Exact Match.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Destination Configuration (IPv4 only) */}
          {listType === "ipv4" && (
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
          )}
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
            {loading ? "Adding..." : "Add Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
