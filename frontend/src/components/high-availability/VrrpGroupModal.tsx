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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AlertCircle, ChevronDown, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";
import type { VrrpGroup, VrrpGroupAddress } from "@/lib/api/high-availability";

// ============================================================================
// Form State
// ============================================================================

interface AddressEntry {
  address: string;
  interface: string;
}

interface FormState {
  name: string;
  vrid: string;
  interface: string;
  description: string;
  addresses: AddressEntry[];
  priority: string;
  advertise_interval: string;
  // Auth
  auth_type: string;
  auth_password: string;
  // Preempt
  no_preempt: boolean;
  preempt_delay: string;
  // Advanced
  hello_source_address: string;
  peer_addresses: string[];
  track_interfaces: string[];
  rfc3768_compatibility: boolean;
  // Health check
  hc_failure_count: string;
  hc_interval: string;
  hc_ping: string;
  hc_script: string;
}

const emptyForm = (): FormState => ({
  name: "",
  vrid: "",
  interface: "",
  description: "",
  addresses: [{ address: "", interface: "" }],
  priority: "",
  advertise_interval: "",
  auth_type: "",
  auth_password: "",
  no_preempt: false,
  preempt_delay: "",
  hello_source_address: "",
  peer_addresses: [],
  track_interfaces: [],
  rfc3768_compatibility: false,
  hc_failure_count: "",
  hc_interval: "",
  hc_ping: "",
  hc_script: "",
});

function groupToForm(g: VrrpGroup): FormState {
  return {
    name: g.name,
    vrid: g.vrid ?? "",
    interface: g.interface ?? "",
    description: g.description ?? "",
    addresses: g.addresses.length > 0
      ? g.addresses.map((a) => ({ address: a.address, interface: a.interface ?? "" }))
      : [{ address: "", interface: "" }],
    priority: g.priority ?? "",
    advertise_interval: g.advertise_interval ?? "",
    auth_type: g.authentication?.type ?? "",
    auth_password: g.authentication?.password ?? "",
    no_preempt: g.no_preempt,
    preempt_delay: g.preempt_delay ?? "",
    hello_source_address: g.hello_source_address ?? "",
    peer_addresses: [...g.peer_addresses],
    track_interfaces: [...g.track.interfaces],
    rfc3768_compatibility: g.rfc3768_compatibility,
    hc_failure_count: g.health_check.failure_count ?? "",
    hc_interval: g.health_check.interval ?? "",
    hc_ping: g.health_check.ping ?? "",
    hc_script: g.health_check.script ?? "",
  };
}

function formToGroup(f: FormState, originalGroup?: VrrpGroup): VrrpGroup {
  const validAddresses: VrrpGroupAddress[] = f.addresses
    .filter((a) => a.address.trim())
    .map((a) => ({ address: a.address.trim(), interface: a.interface.trim() || null }));

  return {
    name: f.name.trim(),
    vrid: f.vrid.trim() || null,
    interface: f.interface.trim() || null,
    description: f.description.trim() || null,
    addresses: validAddresses,
    excluded_addresses: originalGroup?.excluded_addresses ?? [],
    priority: f.priority.trim() || null,
    advertise_interval: f.advertise_interval.trim() || null,
    authentication: f.auth_type
      ? { type: f.auth_type, password: f.auth_password.trim() || null }
      : null,
    no_preempt: f.no_preempt,
    preempt_delay: f.preempt_delay.trim() || null,
    hello_source_address: f.hello_source_address.trim() || null,
    peer_addresses: f.peer_addresses.filter((p) => p.trim()),
    track: {
      interfaces: f.track_interfaces.filter((i) => i.trim()),
      exclude_vrrp_interface: originalGroup?.track.exclude_vrrp_interface ?? false,
    },
    rfc3768_compatibility: f.rfc3768_compatibility,
    disabled: originalGroup?.disabled ?? false,
    health_check: {
      failure_count: f.hc_failure_count.trim() || null,
      interval: f.hc_interval.trim() || null,
      ping: f.hc_ping.trim() || null,
      script: f.hc_script.trim() || null,
    },
    transition_script: originalGroup?.transition_script ?? {
      backup: null, fault: null, master: null, stop: null,
    },
  };
}

// ============================================================================
// Interface Select Helper
// ============================================================================

function InterfaceSelect({
  value,
  onChange,
  interfaces,
  placeholder = "Select interface",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  interfaces: string[];
  placeholder?: string;
  className?: string;
}) {
  // If we have no interfaces loaded yet, fall back to a plain input
  if (interfaces.length === 0) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <Select
      value={value || "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? "" : v)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">
          <span className="text-muted-foreground">{placeholder}</span>
        </SelectItem>
        {interfaces.map((iface) => (
          <SelectItem key={iface} value={iface}>
            <span className="font-mono">{iface}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ============================================================================
// Component
// ============================================================================

interface VrrpGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingGroup?: VrrpGroup | null;
  onSubmit: (group: VrrpGroup) => Promise<void>;
}

export function VrrpGroupModal({
  open,
  onOpenChange,
  existingGroup,
  onSubmit,
}: VrrpGroupModalProps) {
  const isEdit = !!existingGroup;
  const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [newPeer, setNewPeer] = useState("");

  // Interfaces fetched from the router
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [trackIfaceSelection, setTrackIfaceSelection] = useState("");

  useEffect(() => {
    if (open) {
      setForm(existingGroup ? groupToForm(existingGroup) : emptyForm());
      setError(null);
      setAdvancedOpen(false);
      setNewPeer("");
      setTrackIfaceSelection("");

      // Fetch interfaces
      apiClient
        .get<{ interfaces: { name: string; type: string }[] }>("/vyos/show/all-interfaces")
        .then((r) => setInterfaces(r.interfaces.map((i) => i.name).sort()))
        .catch(() => setInterfaces([]));
    }
  }, [open, existingGroup]);

  const set = (field: keyof FormState) => (value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setAddress = (idx: number, field: keyof AddressEntry, value: string) => {
    setForm((prev) => {
      const addresses = [...prev.addresses];
      addresses[idx] = { ...addresses[idx], [field]: value };
      return { ...prev, addresses };
    });
  };

  const addAddress = () =>
    setForm((prev) => ({ ...prev, addresses: [...prev.addresses, { address: "", interface: "" }] }));

  const removeAddress = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== idx),
    }));

  const addPeer = () => {
    const p = newPeer.trim();
    if (p && !form.peer_addresses.includes(p)) {
      setForm((prev) => ({ ...prev, peer_addresses: [...prev.peer_addresses, p] }));
      setNewPeer("");
    }
  };

  const removePeer = (peer: string) =>
    setForm((prev) => ({ ...prev, peer_addresses: prev.peer_addresses.filter((p) => p !== peer) }));

  const addTrackIface = (iface: string) => {
    if (iface && !form.track_interfaces.includes(iface)) {
      setForm((prev) => ({ ...prev, track_interfaces: [...prev.track_interfaces, iface] }));
      setTrackIfaceSelection("");
    }
  };

  const removeTrackIface = (iface: string) =>
    setForm((prev) => ({ ...prev, track_interfaces: prev.track_interfaces.filter((i) => i !== iface) }));

  const availableTrackInterfaces = interfaces.filter((i) => !form.track_interfaces.includes(i));

  const handleSubmit = async () => {
    setError(null);

    if (!form.name.trim()) { setError("Group name is required"); return; }
    if (!form.vrid.trim()) { setError("VRID is required"); return; }
    if (!form.interface.trim()) { setError("Interface is required"); return; }
    const validAddrs = form.addresses.filter((a) => a.address.trim());
    if (validAddrs.length === 0) { setError("At least one virtual IP address is required"); return; }

    setLoading(true);
    try {
      await onSubmit(formToGroup(form, existingGroup ?? undefined));
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? "Edit VRRP Group" : "Add VRRP Group"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Editing VRRP group "${existingGroup!.name}"`
              : "Configure a new VRRP group for router redundancy"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          <div className="space-y-5 py-2">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive whitespace-pre-wrap font-mono leading-relaxed">{error}</p>
              </div>
            )}

            {/* Basic Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Group Name <span className="text-destructive">*</span></Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name")(e.target.value)}
                  disabled={isEdit}
                  placeholder="e.g. WAN-GROUP"
                  className={isEdit ? "opacity-60" : ""}
                />
                {isEdit && <p className="text-xs text-muted-foreground">Name cannot be changed</p>}
              </div>
              <div className="space-y-1.5">
                <Label>VRID <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={1}
                  max={255}
                  value={form.vrid}
                  onChange={(e) => set("vrid")(e.target.value)}
                  placeholder="1–255"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Interface <span className="text-destructive">*</span></Label>
                <InterfaceSelect
                  value={form.interface}
                  onChange={(v) => set("interface")(v)}
                  interfaces={interfaces}
                  placeholder="Select interface"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Input
                  type="number"
                  min={1}
                  max={255}
                  value={form.priority}
                  onChange={(e) => set("priority")(e.target.value)}
                  placeholder="100 (default)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Advertise Interval (s)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.advertise_interval}
                  onChange={(e) => set("advertise_interval")(e.target.value)}
                  placeholder="1 (default)"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => set("description")(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>

            {/* Virtual IP Addresses */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Virtual IP Addresses <span className="text-destructive">*</span></Label>
                  <p className="text-xs text-muted-foreground mt-0.5">IP/prefix assigned to the virtual router</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addAddress}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add IP
                </Button>
              </div>
              <div className="space-y-2">
                {form.addresses.map((addr, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={addr.address}
                      onChange={(e) => setAddress(idx, "address", e.target.value)}
                      placeholder="192.168.1.1/24"
                      className="font-mono"
                    />
                    <div className="w-44 shrink-0">
                      <InterfaceSelect
                        value={addr.interface}
                        onChange={(v) => setAddress(idx, "interface", v)}
                        interfaces={interfaces}
                        placeholder="Interface (opt.)"
                      />
                    </div>
                    {form.addresses.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeAddress(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Advanced Settings */}
            <Separator />
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="w-full justify-between px-0 font-medium">
                  Advanced Settings
                  <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-5 pt-3">
                {/* Authentication */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Authentication</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Type</Label>
                      <Select value={form.auth_type} onValueChange={(v) => set("auth_type")(v === "none" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="plaintext-password">Plaintext Password</SelectItem>
                          <SelectItem value="ah">AH (IPAuth)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {form.auth_type && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Password</Label>
                        <Input
                          type="password"
                          value={form.auth_password}
                          onChange={(e) => set("auth_password")(e.target.value)}
                          placeholder="Password"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Preempt */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Preemption</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <Checkbox
                        id="no_preempt"
                        checked={form.no_preempt}
                        onCheckedChange={(v) => set("no_preempt")(v === true)}
                      />
                      <div>
                        <label htmlFor="no_preempt" className="text-sm font-medium cursor-pointer">Disable Preemption</label>
                        <p className="text-xs text-muted-foreground">Prevent higher-priority router from preempting</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Preempt Delay (s)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.preempt_delay}
                        onChange={(e) => set("preempt_delay")(e.target.value)}
                        placeholder="0"
                        disabled={form.no_preempt}
                      />
                    </div>
                  </div>
                </div>

                {/* Peer Addresses */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Peer Addresses</Label>
                  <p className="text-xs text-muted-foreground">Unicast peer addresses for VRRP communication</p>
                  <div className="flex gap-2">
                    <Input
                      value={newPeer}
                      onChange={(e) => setNewPeer(e.target.value)}
                      placeholder="192.168.1.2"
                      className="font-mono"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPeer())}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addPeer}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {form.peer_addresses.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {form.peer_addresses.map((p) => (
                        <Badge key={p} variant="secondary" className="gap-1 font-mono">
                          {p}
                          <button type="button" onClick={() => removePeer(p)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Track Interfaces */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Track Interfaces</Label>
                  <p className="text-xs text-muted-foreground">Decrease priority if these interfaces go down</p>
                  <div className="flex gap-2">
                    <InterfaceSelect
                      value={trackIfaceSelection}
                      onChange={(v) => {
                        setTrackIfaceSelection(v);
                        if (v) addTrackIface(v);
                      }}
                      interfaces={availableTrackInterfaces}
                      placeholder="Select interface to track"
                      className="flex-1"
                    />
                  </div>
                  {form.track_interfaces.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {form.track_interfaces.map((i) => (
                        <Badge key={i} variant="secondary" className="gap-1 font-mono">
                          {i}
                          <button type="button" onClick={() => removeTrackIface(i)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Health Check */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Health Check</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Ping Target</Label>
                      <Input
                        value={form.hc_ping}
                        onChange={(e) => set("hc_ping")(e.target.value)}
                        placeholder="IP to ping"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Interval (s)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.hc_interval}
                        onChange={(e) => set("hc_interval")(e.target.value)}
                        placeholder="10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Failure Count</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.hc_failure_count}
                        onChange={(e) => set("hc_failure_count")(e.target.value)}
                        placeholder="3"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Script Path</Label>
                      <Input
                        value={form.hc_script}
                        onChange={(e) => set("hc_script")(e.target.value)}
                        placeholder="/path/to/script.sh"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Misc */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Other Options</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Hello Source Address</Label>
                      <Input
                        value={form.hello_source_address}
                        onChange={(e) => set("hello_source_address")(e.target.value)}
                        placeholder="Source IP for hellos"
                        className="font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <Checkbox
                        id="rfc3768"
                        checked={form.rfc3768_compatibility}
                        onCheckedChange={(v) => set("rfc3768_compatibility")(v === true)}
                      />
                      <div>
                        <label htmlFor="rfc3768" className="text-sm font-medium cursor-pointer">RFC 3768 Compatibility</label>
                        <p className="text-xs text-muted-foreground">Use virtual MAC addresses</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
