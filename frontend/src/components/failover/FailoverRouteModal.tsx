"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { showService, InterfaceName } from "@/lib/api/show";
import type {
  FailoverRoute,
  FailoverCapabilities,
  FailoverNextHop,
  FailoverDhcpInterface,
  FailoverCheck,
  FailoverCheckTarget,
} from "@/lib/api/failover";

// ============================================================================
// Form State Types
// ============================================================================

interface TargetFormEntry {
  address: string;
  interface: string;
  vrf: string;
}

interface NextHopFormEntry {
  address: string;
  metric: string;
  interface: string;
  onlink: boolean;
  checkType: string;
  checkPolicy: string;
  checkPort: string;
  checkTimeout: string;
  targets: TargetFormEntry[];
}

interface DhcpInterfaceFormEntry {
  name: string;
  metric: string;
  interface: string;
  onlink: boolean;
  checkType: string;
  checkPolicy: string;
  checkPort: string;
  checkTimeout: string;
  targets: TargetFormEntry[];
}

// ============================================================================
// Helpers
// ============================================================================

function emptyTarget(): TargetFormEntry {
  return { address: "", interface: "", vrf: "" };
}

function emptyNextHop(): NextHopFormEntry {
  return {
    address: "",
    metric: "",
    interface: "",
    onlink: false,
    checkType: "",
    checkPolicy: "",
    checkPort: "",
    checkTimeout: "",
    targets: [],
  };
}

function emptyDhcpInterface(): DhcpInterfaceFormEntry {
  return {
    name: "",
    metric: "",
    interface: "",
    onlink: false,
    checkType: "",
    checkPolicy: "",
    checkPort: "",
    checkTimeout: "",
    targets: [],
  };
}

function nhToForm(nh: FailoverNextHop): NextHopFormEntry {
  return {
    address: nh.address,
    metric: nh.metric != null ? String(nh.metric) : "",
    interface: nh.interface || "",
    onlink: nh.onlink,
    checkType: nh.check.type || "",
    checkPolicy: nh.check.policy || "",
    checkPort: nh.check.port != null ? String(nh.check.port) : "",
    checkTimeout: nh.check.timeout != null ? String(nh.check.timeout) : "",
    targets: nh.check.targets.map((t) => ({
      address: t.address,
      interface: t.interface || "",
      vrf: t.vrf || "",
    })),
  };
}

function dhcpToForm(d: FailoverDhcpInterface): DhcpInterfaceFormEntry {
  return {
    name: d.name,
    metric: d.metric != null ? String(d.metric) : "",
    interface: d.interface || "",
    onlink: d.onlink,
    checkType: d.check.type || "",
    checkPolicy: d.check.policy || "",
    checkPort: d.check.port != null ? String(d.check.port) : "",
    checkTimeout: d.check.timeout != null ? String(d.check.timeout) : "",
    targets: d.check.targets.map((t) => ({
      address: t.address,
      interface: t.interface || "",
      vrf: t.vrf || "",
    })),
  };
}

function formToCheck(entry: NextHopFormEntry | DhcpInterfaceFormEntry): FailoverCheck {
  const targets: FailoverCheckTarget[] = entry.targets
    .filter((t) => t.address.trim())
    .map((t) => ({
      address: t.address.trim(),
      interface: t.interface.trim() || null,
      vrf: t.vrf.trim() || null,
    }));

  return {
    type: entry.checkType || null,
    policy: entry.checkPolicy || null,
    port: entry.checkPort.trim() ? parseInt(entry.checkPort.trim(), 10) : null,
    timeout: entry.checkTimeout.trim() ? parseInt(entry.checkTimeout.trim(), 10) : null,
    targets,
  };
}

function formToNextHop(entry: NextHopFormEntry): FailoverNextHop {
  return {
    address: entry.address.trim(),
    metric: entry.metric.trim() ? parseInt(entry.metric.trim(), 10) : null,
    interface: entry.interface.trim() || null,
    onlink: entry.onlink,
    check: formToCheck(entry),
  };
}

function formToDhcpInterface(entry: DhcpInterfaceFormEntry): FailoverDhcpInterface {
  return {
    name: entry.name.trim(),
    metric: entry.metric.trim() ? parseInt(entry.metric.trim(), 10) : null,
    interface: entry.interface.trim() || null,
    onlink: entry.onlink,
    check: formToCheck(entry),
  };
}

// ============================================================================
// Interface Select Component
// ============================================================================

function InterfaceSelect({
  id,
  value,
  onChange,
  interfaces,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  interfaces: InterfaceName[];
  placeholder?: string;
}) {
  return (
    <Select
      value={value || "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? "" : v)}
    >
      <SelectTrigger id={id} className="h-8 text-xs">
        <SelectValue placeholder={placeholder || "Select interface"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">None</SelectItem>
        {interfaces.map((iface) => (
          <SelectItem key={iface.name} value={iface.name}>
            <span className="font-mono">{iface.name}</span>
            {iface.description && (
              <span className="text-muted-foreground ml-2 text-xs">{iface.description}</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ============================================================================
// Component
// ============================================================================

interface FailoverRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (route: FailoverRoute) => Promise<void>;
  existingRoute?: FailoverRoute | null;
  capabilities?: FailoverCapabilities | null;
}

export function FailoverRouteModal({
  open,
  onOpenChange,
  onSubmit,
  existingRoute,
  capabilities,
}: FailoverRouteModalProps) {
  const isEditMode = !!existingRoute;
  const showDhcp = capabilities?.features.dhcp_interface.supported ?? false;
  const showTargetProps = capabilities?.features.check_target_properties.supported ?? false;

  // Form state
  const [destination, setDestination] = useState("");
  const [nextHops, setNextHops] = useState<NextHopFormEntry[]>([emptyNextHop()]);
  const [dhcpInterfaces, setDhcpInterfaces] = useState<DhcpInterfaceFormEntry[]>([]);

  // Interface list from device
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Load interfaces when modal opens
      showService.getAllInterfaces().then((res) => {
        const sorted = [...res.interfaces].sort((a, b) => a.name.localeCompare(b.name));
        setAvailableInterfaces(sorted);
      }).catch(() => {
        // Silently fail — dropdowns will just be empty
      });

      if (existingRoute) {
        setDestination(existingRoute.destination);
        setNextHops(
          existingRoute.next_hops.length > 0
            ? existingRoute.next_hops.map(nhToForm)
            : [emptyNextHop()]
        );
        setDhcpInterfaces(existingRoute.dhcp_interfaces.map(dhcpToForm));
      } else {
        resetForm();
      }
    }
  }, [open, existingRoute]);

  const resetForm = () => {
    setDestination("");
    setNextHops([emptyNextHop()]);
    setDhcpInterfaces([]);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // ==========================================================================
  // Next-hop array mutators
  // ==========================================================================

  const updateNextHop = (index: number, updates: Partial<NextHopFormEntry>) => {
    setNextHops((prev) => prev.map((nh, i) => (i === index ? { ...nh, ...updates } : nh)));
  };

  const removeNextHop = (index: number) => {
    setNextHops((prev) => prev.filter((_, i) => i !== index));
  };

  const addNextHopTarget = (nhIndex: number) => {
    setNextHops((prev) =>
      prev.map((nh, i) =>
        i === nhIndex ? { ...nh, targets: [...nh.targets, emptyTarget()] } : nh
      )
    );
  };

  const updateNextHopTarget = (nhIndex: number, tIndex: number, updates: Partial<TargetFormEntry>) => {
    setNextHops((prev) =>
      prev.map((nh, i) =>
        i === nhIndex
          ? {
              ...nh,
              targets: nh.targets.map((t, j) => (j === tIndex ? { ...t, ...updates } : t)),
            }
          : nh
      )
    );
  };

  const removeNextHopTarget = (nhIndex: number, tIndex: number) => {
    setNextHops((prev) =>
      prev.map((nh, i) =>
        i === nhIndex ? { ...nh, targets: nh.targets.filter((_, j) => j !== tIndex) } : nh
      )
    );
  };

  // ==========================================================================
  // DHCP interface array mutators
  // ==========================================================================

  const updateDhcpInterface = (index: number, updates: Partial<DhcpInterfaceFormEntry>) => {
    setDhcpInterfaces((prev) => prev.map((d, i) => (i === index ? { ...d, ...updates } : d)));
  };

  const removeDhcpInterface = (index: number) => {
    setDhcpInterfaces((prev) => prev.filter((_, i) => i !== index));
  };

  const addDhcpTarget = (dIndex: number) => {
    setDhcpInterfaces((prev) =>
      prev.map((d, i) =>
        i === dIndex ? { ...d, targets: [...d.targets, emptyTarget()] } : d
      )
    );
  };

  const updateDhcpTarget = (dIndex: number, tIndex: number, updates: Partial<TargetFormEntry>) => {
    setDhcpInterfaces((prev) =>
      prev.map((d, i) =>
        i === dIndex
          ? {
              ...d,
              targets: d.targets.map((t, j) => (j === tIndex ? { ...t, ...updates } : t)),
            }
          : d
      )
    );
  };

  const removeDhcpTarget = (dIndex: number, tIndex: number) => {
    setDhcpInterfaces((prev) =>
      prev.map((d, i) =>
        i === dIndex ? { ...d, targets: d.targets.filter((_, j) => j !== tIndex) } : d
      )
    );
  };

  // ==========================================================================
  // Validation
  // ==========================================================================

  const validateForm = (): string | null => {
    if (!destination.trim()) return "Destination is required";
    if (!destination.includes("/")) return "Destination must be in CIDR format (e.g. 10.0.0.0/24)";

    const validNhs = nextHops.filter((nh) => nh.address.trim());
    const validDhcps = dhcpInterfaces.filter((d) => d.name.trim());

    if (validNhs.length === 0 && validDhcps.length === 0) {
      return "At least one next-hop or DHCP interface is required";
    }

    for (let i = 0; i < validNhs.length; i++) {
      const nh = validNhs[i];
      if (!nh.address.includes(".") && !nh.address.includes(":")) {
        return `Next-hop #${i + 1}: address must be a valid IP`;
      }
      if (nh.metric.trim()) {
        const val = parseInt(nh.metric.trim(), 10);
        if (isNaN(val) || val < 1) return `Next-hop #${i + 1}: metric must be a positive number`;
      }
      if (nh.checkType === "tcp" && !nh.checkPort.trim()) {
        return `Next-hop #${i + 1}: port is required for TCP check type`;
      }
      for (let j = 0; j < nh.targets.length; j++) {
        if (!nh.targets[j].address.trim()) {
          return `Next-hop #${i + 1}, target #${j + 1}: address is required`;
        }
      }
    }

    for (let i = 0; i < validDhcps.length; i++) {
      const d = validDhcps[i];
      if (d.checkType === "tcp" && !d.checkPort.trim()) {
        return `DHCP interface #${i + 1}: port is required for TCP check type`;
      }
      for (let j = 0; j < d.targets.length; j++) {
        if (!d.targets[j].address.trim()) {
          return `DHCP interface #${i + 1}, target #${j + 1}: address is required`;
        }
      }
    }

    return null;
  };

  // ==========================================================================
  // Submit
  // ==========================================================================

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const route: FailoverRoute = {
        destination: destination.trim(),
        next_hops: nextHops.filter((nh) => nh.address.trim()).map(formToNextHop),
        dhcp_interfaces: dhcpInterfaces.filter((d) => d.name.trim()).map(formToDhcpInterface),
      };
      await onSubmit(route);
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Operation failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Render: Health Check Card (shared between next-hop and DHCP)
  // ==========================================================================

  const renderHealthCheck = (
    entry: NextHopFormEntry | DhcpInterfaceFormEntry,
    prefix: string,
    onUpdate: (updates: Partial<NextHopFormEntry>) => void,
    onAddTarget: () => void,
    onUpdateTarget: (tIndex: number, updates: Partial<TargetFormEntry>) => void,
    onRemoveTarget: (tIndex: number) => void
  ) => (
    <div className="space-y-3 mt-3">
      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Health Check
      </h5>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={`${prefix}-check-type`}>Type</Label>
          <Select
            value={entry.checkType || "__none__"}
            onValueChange={(v) => onUpdate({ checkType: v === "__none__" ? "" : v } as Partial<NextHopFormEntry>)}
          >
            <SelectTrigger id={`${prefix}-check-type`} className="h-8 text-xs">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              <SelectItem value="arp">ARP</SelectItem>
              <SelectItem value="icmp">ICMP</SelectItem>
              <SelectItem value="tcp">TCP</SelectItem>
              <SelectItem value="none">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={`${prefix}-check-policy`}>Policy</Label>
          <Select
            value={entry.checkPolicy || "__none__"}
            onValueChange={(v) => onUpdate({ checkPolicy: v === "__none__" ? "" : v } as Partial<NextHopFormEntry>)}
          >
            <SelectTrigger id={`${prefix}-check-policy`} className="h-8 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Default</SelectItem>
              <SelectItem value="all-pass">All Pass</SelectItem>
              <SelectItem value="any-pass">Any Pass</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {entry.checkType === "tcp" && (
          <div className="space-y-1">
            <Label className="text-xs" htmlFor={`${prefix}-check-port`}>Port</Label>
            <Input
              id={`${prefix}-check-port`}
              type="number"
              className="h-8 text-xs"
              value={entry.checkPort}
              onChange={(e) => onUpdate({ checkPort: e.target.value } as Partial<NextHopFormEntry>)}
              placeholder="e.g. 80"
              min={1}
              max={65535}
            />
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={`${prefix}-check-timeout`}>Timeout</Label>
          <Input
            id={`${prefix}-check-timeout`}
            type="number"
            className="h-8 text-xs"
            value={entry.checkTimeout}
            onChange={(e) => onUpdate({ checkTimeout: e.target.value } as Partial<NextHopFormEntry>)}
            placeholder="seconds"
            min={1}
          />
        </div>
      </div>

      {/* Check Targets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Check Targets</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={onAddTarget}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Target
          </Button>
        </div>
        {entry.targets.map((target, tIndex) => (
          <div key={tIndex} className="flex items-start gap-2">
            <div className={`grid ${showTargetProps ? "grid-cols-3" : "grid-cols-1"} gap-2 flex-1`}>
              <Input
                className="h-8 text-xs"
                value={target.address}
                onChange={(e) => onUpdateTarget(tIndex, { address: e.target.value })}
                placeholder="Target IP"
              />
              {showTargetProps && (
                <>
                  <InterfaceSelect
                    value={target.interface}
                    onChange={(v) => onUpdateTarget(tIndex, { interface: v })}
                    interfaces={availableInterfaces}
                    placeholder="Interface"
                  />
                  <Input
                    className="h-8 text-xs"
                    value={target.vrf}
                    onChange={(e) => onUpdateTarget(tIndex, { vrf: e.target.value })}
                    placeholder="VRF"
                  />
                </>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onRemoveTarget(tIndex)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Failover Route" : "Add Failover Route"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modify failover route configuration for ${existingRoute?.destination}.`
              : "Configure a new failover route with health-checked next-hops."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* Destination */}
            <div className="space-y-2">
              <Label htmlFor="failover-destination">Destination</Label>
              <Input
                id="failover-destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. 10.0.0.0/24"
                disabled={isEditMode}
                className={isEditMode ? "bg-muted" : ""}
              />
              <p className="text-xs text-muted-foreground">
                Network destination in CIDR notation.
              </p>
            </div>

            <Separator />

            {/* Next-Hops Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Next-Hops</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setNextHops((prev) => [...prev, emptyNextHop()])}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Next-Hop
                </Button>
              </div>

              {nextHops.map((nh, nhIndex) => (
                <div key={nhIndex} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Next-Hop #{nhIndex + 1}
                    </span>
                    {nextHops.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeNextHop(nhIndex)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs" htmlFor={`nh-${nhIndex}-addr`}>Address *</Label>
                      <Input
                        id={`nh-${nhIndex}-addr`}
                        className="h-8 text-xs"
                        value={nh.address}
                        onChange={(e) => updateNextHop(nhIndex, { address: e.target.value })}
                        placeholder="e.g. 192.168.1.1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs" htmlFor={`nh-${nhIndex}-metric`}>Metric</Label>
                      <Input
                        id={`nh-${nhIndex}-metric`}
                        type="number"
                        className="h-8 text-xs"
                        value={nh.metric}
                        onChange={(e) => updateNextHop(nhIndex, { metric: e.target.value })}
                        placeholder="e.g. 10"
                        min={1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs" htmlFor={`nh-${nhIndex}-iface`}>Interface</Label>
                      <InterfaceSelect
                        id={`nh-${nhIndex}-iface`}
                        value={nh.interface}
                        onChange={(v) => updateNextHop(nhIndex, { interface: v })}
                        interfaces={availableInterfaces}
                      />
                    </div>
                    <div className="flex items-center space-x-2 pb-1">
                      <Checkbox
                        id={`nh-${nhIndex}-onlink`}
                        checked={nh.onlink}
                        onCheckedChange={(checked) =>
                          updateNextHop(nhIndex, { onlink: checked === true })
                        }
                      />
                      <Label htmlFor={`nh-${nhIndex}-onlink`} className="text-xs cursor-pointer">
                        Onlink
                      </Label>
                    </div>
                  </div>

                  {renderHealthCheck(
                    nh,
                    `nh-${nhIndex}`,
                    (updates) => updateNextHop(nhIndex, updates),
                    () => addNextHopTarget(nhIndex),
                    (tIndex, updates) => updateNextHopTarget(nhIndex, tIndex, updates),
                    (tIndex) => removeNextHopTarget(nhIndex, tIndex)
                  )}
                </div>
              ))}
            </div>

            {/* DHCP Interfaces Section (1.5 only) */}
            {showDhcp && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">DHCP Interfaces</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setDhcpInterfaces((prev) => [...prev, emptyDhcpInterface()])}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add DHCP Interface
                    </Button>
                  </div>

                  {dhcpInterfaces.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No DHCP interfaces configured. Click &quot;Add DHCP Interface&quot; to add one.
                    </p>
                  )}

                  {dhcpInterfaces.map((d, dIndex) => (
                    <div key={dIndex} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          DHCP Interface #{dIndex + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeDhcpInterface(dIndex)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs" htmlFor={`dhcp-${dIndex}-name`}>Name *</Label>
                          <InterfaceSelect
                            id={`dhcp-${dIndex}-name`}
                            value={d.name}
                            onChange={(v) => updateDhcpInterface(dIndex, { name: v })}
                            interfaces={availableInterfaces}
                            placeholder="Select interface"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs" htmlFor={`dhcp-${dIndex}-metric`}>Metric</Label>
                          <Input
                            id={`dhcp-${dIndex}-metric`}
                            type="number"
                            className="h-8 text-xs"
                            value={d.metric}
                            onChange={(e) => updateDhcpInterface(dIndex, { metric: e.target.value })}
                            placeholder="e.g. 10"
                            min={1}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs" htmlFor={`dhcp-${dIndex}-iface`}>Interface</Label>
                          <InterfaceSelect
                            id={`dhcp-${dIndex}-iface`}
                            value={d.interface}
                            onChange={(v) => updateDhcpInterface(dIndex, { interface: v })}
                            interfaces={availableInterfaces}
                          />
                        </div>
                        <div className="flex items-center space-x-2 pb-1">
                          <Checkbox
                            id={`dhcp-${dIndex}-onlink`}
                            checked={d.onlink}
                            onCheckedChange={(checked) =>
                              updateDhcpInterface(dIndex, { onlink: checked === true })
                            }
                          />
                          <Label htmlFor={`dhcp-${dIndex}-onlink`} className="text-xs cursor-pointer">
                            Onlink
                          </Label>
                        </div>
                      </div>

                      {renderHealthCheck(
                        d,
                        `dhcp-${dIndex}`,
                        (updates) => updateDhcpInterface(dIndex, updates as Partial<DhcpInterfaceFormEntry>),
                        () => addDhcpTarget(dIndex),
                        (tIndex, updates) => updateDhcpTarget(dIndex, tIndex, updates),
                        (tIndex) => removeDhcpTarget(dIndex, tIndex)
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "Saving..." : "Creating..."}
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Add Route"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
