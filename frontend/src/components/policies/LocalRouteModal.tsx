"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { VrfSelect } from "@/components/ui/vrf-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { AlertCircle } from "lucide-react";
import { localRouteService, type LocalRouteCapabilitiesResponse, type LocalRouteRule } from "@/lib/api/local-route";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  localRouteDraftFrom,
  nextRuleNumber,
  submitLocalRouteCreate,
  submitLocalRouteUpdate,
  validateLocalRoute,
  type LocalRouteDraft,
} from "./local-route-form";
import { apiClient } from "@/lib/api/client";

interface LocalRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  ruleType: "ipv4" | "ipv6";
  existing?: LocalRouteRule | null;
}

export function LocalRouteModal({
  open,
  onOpenChange,
  onSuccess,
  ruleType,
  existing,
}: LocalRouteModalProps) {
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<LocalRouteCapabilitiesResponse | null>(null);

  // Form fields
  const [ruleNumber, setRuleNumber] = useState(100);

  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [inboundInterface, setInboundInterface] = useState("");
  const [fwmark, setFwmark] = useState("");
  const [protocol, setProtocol] = useState("");
  const [sourcePort, setSourcePort] = useState("");
  const [destinationPort, setDestinationPort] = useState("");
  const [routingType, setRoutingType] = useState<"table" | "vrf">("table");
  const [table, setTable] = useState("");
  const [vrf, setVrf] = useState("");

  useEffect(() => {
    if (!open) return;
    loadCapabilities();
    loadInterfaces();
    setError(null);
    if (existing) {
      const d = localRouteDraftFrom(existing);
      setRuleNumber(d.ruleNumber);
      setSource(d.source);
      setDestination(d.destination);
      setInboundInterface(d.inboundInterface);
      setFwmark(d.fwmark);
      setProtocol(d.protocol);
      setSourcePort(d.sourcePort);
      setDestinationPort(d.destinationPort);
      setRoutingType(d.routingType);
      setTable(d.table);
      setVrf(d.vrf);
    } else {
      resetForm();
      localRouteService.getConfig().then((config) => {
        const rules = ruleType === "ipv4" ? config.ipv4_rules : config.ipv6_rules;
        setRuleNumber(nextRuleNumber(rules));
      }).catch((err) => {
        console.error("Error calculating rule number:", err);
        setRuleNumber(100);
      });
    }
  }, [open, existing, ruleType]);

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
    setFwmark("");
    setProtocol("");
    setSourcePort("");
    setDestinationPort("");
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

  const collectDraft = (): LocalRouteDraft => ({
    ruleNumber,
    source,
    destination,
    inboundInterface,
    fwmark,
    protocol,
    sourcePort,
    destinationPort,
    routingType,
    table,
    vrf,
  });

  const handleSubmit = async () => {
    const draft = collectDraft();
    const validationError = validateLocalRoute(draft, ruleType);
    if (validationError) {
      setError(validationError);
      return;
    }

    const write = modalWriteKind(existing ? { name: String(existing.rule_number) } : null);
    setLoading(true);
    setError(null);
    try {
      const result =
        write.kind === "update" && existing
          ? await submitLocalRouteUpdate(existing, draft, ruleType)
          : await submitLocalRouteCreate(draft, ruleType);
      if (result && result.success === false) {
        setError(result.error || "Operation failed");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? "Failed to update rule" : "Failed to create rule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${ruleType.toUpperCase()} Local Route Rule #${lockedIdentity(existing, (r) => String(r.rule_number), String(ruleNumber)).value}` : `Create ${ruleType.toUpperCase()} Local Route Rule`}</DialogTitle>
          <DialogDescription>
            {isEdit ? `Update policy-based routing rule #${existing.rule_number}` : `Create a new policy-based routing rule for ${ruleType.toUpperCase()} traffic`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rule Number */}
          <div className="space-y-2">
            <Label htmlFor="rule-number">Rule Number</Label>
            <Input
              id="rule-number"
              type="number"
              value={ruleNumber}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Auto-calculated based on existing rules
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
              Match traffic from this source (optional)
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
              Match traffic to this destination (optional)
            </p>
          </div>

          {/* Inbound Interface */}
          <div className="space-y-2">
            <Label htmlFor="inbound-interface">Inbound Interface</Label>
            <InterfaceSelect
              value={inboundInterface || "__none__"}
              onValueChange={setInboundInterface}
              disabled={loading}
              id="inbound-interface"
              interfaces={interfaces.map((n) => ({ name: n, type: "", description: null }))}
              noneOption={{ label: "None", value: "__none__" }}
              placeholder="Select interface (optional)"
            />
            <p className="text-xs text-muted-foreground">
              Match traffic arriving on this interface (optional)
            </p>
          </div>

          {capabilities?.features.protocol_matching?.supported !== false && (
            <div className="space-y-2">
              <Label htmlFor="protocol">Protocol</Label>
              <Input
                id="protocol"
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
                placeholder="e.g. tcp, udp, or 6"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Match this IP protocol name or number (optional)
              </p>
            </div>
          )}

          {capabilities?.features.source_port_matching?.supported !== false && (
            <div className="space-y-2">
              <Label htmlFor="source-port">Source Port</Label>
              <Input
                id="source-port"
                type="number"
                min={1}
                max={65535}
                value={sourcePort}
                onChange={(e) => setSourcePort(e.target.value)}
                placeholder="1-65535"
                disabled={loading}
              />
            </div>
          )}

          {capabilities?.features.destination_port_matching?.supported !== false && (
            <div className="space-y-2">
              <Label htmlFor="destination-port">Destination Port</Label>
              <Input
                id="destination-port"
                type="number"
                min={1}
                max={65535}
                value={destinationPort}
                onChange={(e) => setDestinationPort(e.target.value)}
                placeholder="1-65535"
                disabled={loading}
              />
            </div>
          )}

          {capabilities?.features.fwmark_matching?.supported !== false && (
            <div className="space-y-2">
              <Label htmlFor="fwmark">Fwmark</Label>
              <Input
                id="fwmark"
                type="number"
                min={1}
                max={2147483647}
                value={fwmark}
                onChange={(e) => setFwmark(e.target.value)}
                placeholder="1-2147483647"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Match this firewall mark (optional)
              </p>
            </div>
          )}

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
                <VrfSelect
                  id="vrf"
                  value={vrf}
                  onValueChange={setVrf}
                  disabled={loading}
                  includeNone={false}
                  placeholder="Select VRF"
                  extraOptions={[{ label: "Default", value: "default" }]}
                />
                <p className="text-xs text-muted-foreground">
                  VRF instance to use for matched traffic
                </p>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Policy-Based Routing</p>
                <ul className="space-y-1 text-xs">
                  <li>• At least one matching criterion (address, port, protocol, interface, or fwmark) is required</li>
                  <li>• Choose either Routing Table OR VRF - you cannot specify both</li>
                  {capabilities?.features.vrf_support.supported ? (
                    <li>• VRF option is available on this device</li>
                  ) : (
                    <li>• This device does not support VRF</li>
                  )}
                  <li>• Traffic matching all specified criteria will use the specified destination</li>
                  <li>• Rules are processed in numerical order</li>
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
            {loading ? "Creating..." : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
