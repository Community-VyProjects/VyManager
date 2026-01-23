"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { localRouteService, type LocalRouteRule, type LocalRouteCapabilitiesResponse } from "@/lib/api/local-route";
import { apiClient } from "@/lib/api/client";

interface EditLocalRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  rule: LocalRouteRule;
  ruleType: "ipv4" | "ipv6";
}

export function EditLocalRouteModal({
  open,
  onOpenChange,
  onSuccess,
  rule,
  ruleType,
}: EditLocalRouteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<LocalRouteCapabilitiesResponse | null>(null);

  // Form fields
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [inboundInterface, setInboundInterface] = useState("");
  const [routingType, setRoutingType] = useState<"table" | "vrf">("table");
  const [table, setTable] = useState("");
  const [vrf, setVrf] = useState("");

  useEffect(() => {
    if (open && rule) {
      loadCapabilities();
      loadInterfaces();
      // Pre-populate form with existing rule data
      setSource(rule.source || "");
      setDestination(rule.destination || "");
      setInboundInterface(rule.inbound_interface || "");
      setTable(rule.table || "");
      setVrf(rule.vrf || "");
      // Set routing type based on what the rule has
      setRoutingType(rule.vrf ? "vrf" : "table");
    }
  }, [open, rule]);

  const loadCapabilities = async () => {
    try {
      const caps = await localRouteService.getCapabilities();
      setCapabilities(caps);
    } catch (err) {
      console.error("Error loading capabilities:", err);
    }
  };

  const loadInterfaces = async () => {
    const interfaceNames: string[] = [];

    // Fetch ethernet interfaces
    try {
      const ethernetConfig = await apiClient.get<{ interfaces: Array<{ name: string }> }>("/vyos/ethernet/config");
      interfaceNames.push(...ethernetConfig.interfaces.map(iface => iface.name));
    } catch (err) {
      console.error("Failed to load ethernet interfaces:", err);
    }

    // Fetch dummy interfaces
    try {
      const dummyConfig = await apiClient.get<{ interfaces: Array<{ name: string }> }>("/vyos/dummy/config");
      interfaceNames.push(...dummyConfig.interfaces.map(iface => iface.name));
    } catch (err) {
      console.error("Failed to load dummy interfaces:", err);
    }

    // TODO: Add more interface types as they become available:
    // - Bridge: /vyos/bridge/config
    // - Bonding: /vyos/bonding/config
    // - VTI: /vyos/vti/config
    // - WireGuard: /vyos/wireguard/config
    // etc.

    setInterfaces(interfaceNames);
  };

  const resetForm = () => {
    setSource("");
    setDestination("");
    setInboundInterface("");
    setRoutingType("table");
    setTable("");
    setVrf("");
    setError(null);
  };

  // Handle routing type change - clear the other field
  const handleRoutingTypeChange = (type: "table" | "vrf") => {
    setRoutingType(type);
    if (type === "table") {
      setVrf("");
    } else {
      setTable("");
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Validate IPv4 address or CIDR
  const validateIPv4 = (value: string): boolean => {
    if (!value) return true; // Optional field

    // Check if it's CIDR notation
    if (value.includes("/")) {
      const parts = value.split("/");
      if (parts.length !== 2) return false;

      const [ip, prefix] = parts;
      const prefixNum = parseInt(prefix, 10);
      if (isNaN(prefixNum) || prefixNum < 0 || prefixNum > 32) return false;

      const ipParts = ip.split(".");
      if (ipParts.length !== 4) return false;
      return ipParts.every((part) => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    }

    // Plain IP address
    const ipParts = value.split(".");
    if (ipParts.length !== 4) return false;
    return ipParts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  };

  // Validate IPv6 address or CIDR (basic validation)
  const validateIPv6 = (value: string): boolean => {
    if (!value) return true; // Optional field

    // Check if it's CIDR notation
    if (value.includes("/")) {
      const parts = value.split("/");
      if (parts.length !== 2) return false;

      const prefixNum = parseInt(parts[1], 10);
      if (isNaN(prefixNum) || prefixNum < 0 || prefixNum > 128) return false;

      // Basic IPv6 format check
      return parts[0].includes(":");
    }

    // Plain IPv6 address
    return value.includes(":");
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation based on selected routing type
    if (routingType === "table") {
      if (!table) {
        setError("Table is required. Please enter 'main' or a table number (1-200).");
        return;
      }
      if (table !== "main") {
        const tableNum = parseInt(table, 10);
        if (isNaN(tableNum) || tableNum < 1 || tableNum > 200) {
          setError("Table must be 'main' or a number between 1-200");
          return;
        }
      }
    } else {
      // VRF validation
      if (!vrf) {
        setError("VRF is required. Please enter a VRF name or 'default'.");
        return;
      }
    }

    // At least one matching criterion must be specified
    if (!source && !destination && !inboundInterface) {
      setError("At least one matching criterion is required (source, destination, or inbound interface)");
      return;
    }

    // Validate source
    if (source) {
      const isValid = ruleType === "ipv4" ? validateIPv4(source) : validateIPv6(source);
      if (!isValid) {
        setError(`Invalid ${ruleType.toUpperCase()} source address format`);
        return;
      }
    }

    // Validate destination
    if (destination) {
      const isValid = ruleType === "ipv4" ? validateIPv4(destination) : validateIPv6(destination);
      if (!isValid) {
        setError(`Invalid ${ruleType.toUpperCase()} destination address format`);
        return;
      }
    }

    setLoading(true);

    try {
      await localRouteService.updateRule(rule.rule_number, ruleType, {
        source: source || null,
        destination: destination || null,
        inbound_interface: inboundInterface === "__none__" ? null : (inboundInterface || null),
        // Only send the selected routing type, send null for the other to clear it
        table: routingType === "table" ? table : null,
        vrf: routingType === "vrf" ? vrf : null,
      });
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Rule {rule.rule_number}</DialogTitle>
          <DialogDescription>
            Update this {ruleType.toUpperCase()} policy-based routing rule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rule Number */}
          <div className="space-y-2">
            <Label htmlFor="rule-number">Rule Number</Label>
            <Input
              id="rule-number"
              type="number"
              value={rule.rule_number}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Rule number cannot be changed
            </p>
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label htmlFor="source">Source Address/Prefix</Label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={ruleType === "ipv4" ? "e.g., 192.168.1.0/24 or 10.0.0.1" : "e.g., 2001:db8::/32"}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Match traffic from this source (leave empty to remove)
            </p>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination">Destination Address/Prefix</Label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={ruleType === "ipv4" ? "e.g., 172.16.0.0/16 or 8.8.8.8" : "e.g., 2001:4860::/32"}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Match traffic to this destination (leave empty to remove)
            </p>
          </div>

          {/* Inbound Interface */}
          <div className="space-y-2">
            <Label htmlFor="inbound-interface">Inbound Interface</Label>
            <Select value={inboundInterface || "__none__"} onValueChange={setInboundInterface} disabled={loading}>
              <SelectTrigger id="inbound-interface">
                <SelectValue placeholder="Select interface" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {interfaces.map((iface) => (
                  <SelectItem key={iface} value={iface}>
                    {iface}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Match traffic arriving on this interface
            </p>
          </div>

          {/* Routing Selection - Table or VRF */}
          <div className="space-y-3 border border-border rounded-lg p-4">
            <Label>Routing Destination *</Label>

            {/* Radio buttons for selection */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="routing-table"
                  checked={routingType === "table"}
                  onChange={() => handleRoutingTypeChange("table")}
                  disabled={loading}
                  className="h-4 w-4"
                />
                <Label htmlFor="routing-table" className="font-normal cursor-pointer">
                  Routing Table
                </Label>
              </div>

              {capabilities?.features.vrf_support.supported && (
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="routing-vrf"
                    checked={routingType === "vrf"}
                    onChange={() => handleRoutingTypeChange("vrf")}
                    disabled={loading}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="routing-vrf" className="font-normal cursor-pointer">
                    VRF Instance
                  </Label>
                </div>
              )}
            </div>

            {/* Conditionally show table or VRF input */}
            {routingType === "table" ? (
              <div className="space-y-2">
                <Input
                  id="table"
                  value={table}
                  onChange={(e) => setTable(e.target.value)}
                  placeholder="Enter 'main' or table number (1-200)"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Routing table to use for matched traffic
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  id="vrf"
                  value={vrf}
                  onChange={(e) => setVrf(e.target.value)}
                  placeholder="Enter VRF name or 'default'"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  VRF instance to use for matched traffic (VyOS 1.5+)
                </p>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Update Rule</p>
                <ul className="space-y-1 text-xs">
                  <li>• At least one matching criterion (source, destination, or interface) is required</li>
                  <li>• Choose either Routing Table OR VRF - you cannot specify both</li>
                  <li>• Switching between Table and VRF will clear the other field</li>
                  {capabilities?.features.vrf_support.supported ? (
                    <li>• VRF option is available on VyOS 1.5+</li>
                  ) : (
                    <li>• VRF requires VyOS 1.5+ (currently unavailable)</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
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
