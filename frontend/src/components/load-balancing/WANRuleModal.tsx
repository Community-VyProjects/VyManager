"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AlertCircle, ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { lbService, WANRule, WANRuleInterface, WANInterfaceHealth, LBCapabilities } from "@/lib/api/load-balancing";

// ============================================================================
// Form types
// ============================================================================

interface IfaceForm {
  interface: string;
  weight: string;
}

interface FormState {
  rule_id: string;
  description: string;
  inbound_interface: string;
  protocol: string;
  failover: boolean;
  per_packet_balancing: boolean;
  exclude: boolean;
  interfaces: IfaceForm[];
  source_address: string;
  source_port: string;
  destination_address: string;
  destination_port: string;
}

const emptyForm = (): FormState => ({
  rule_id: "", description: "", inbound_interface: "", protocol: "",
  failover: false, per_packet_balancing: false, exclude: false,
  interfaces: [{ interface: "", weight: "" }],
  source_address: "", source_port: "",
  destination_address: "", destination_port: "",
});

function ruleToForm(r: WANRule): FormState {
  return {
    rule_id: r.rule_id,
    description: r.description ?? "",
    inbound_interface: r.inbound_interface ?? "",
    protocol: r.protocol ?? "",
    failover: r.failover,
    per_packet_balancing: r.per_packet_balancing,
    exclude: r.exclude,
    interfaces: r.interfaces.length > 0
      ? r.interfaces.map((i) => ({ interface: i.interface, weight: i.weight ?? "" }))
      : [{ interface: "", weight: "" }],
    source_address: r.source?.address ?? "",
    source_port: r.source?.port ?? "",
    destination_address: r.destination?.address ?? "",
    destination_port: r.destination?.port ?? "",
  };
}

function formToRule(f: FormState): WANRule {
  const ifaces: WANRuleInterface[] = f.interfaces
    .filter((i) => i.interface.trim())
    .map((i) => ({ interface: i.interface.trim(), weight: i.weight || null }));

  const hasSrc = !!(f.source_address || f.source_port);
  const hasDst = !!(f.destination_address || f.destination_port);

  return {
    rule_id: f.rule_id.trim(),
    description: f.description || null,
    inbound_interface: f.inbound_interface || null,
    protocol: f.protocol || null,
    failover: f.failover,
    per_packet_balancing: f.per_packet_balancing,
    exclude: f.exclude,
    interfaces: ifaces,
    limit: null,
    source: hasSrc ? {
      address: f.source_address || null,
      port: f.source_port || null,
      group: null,
    } : null,
    destination: hasDst ? {
      address: f.destination_address || null,
      port: f.destination_port || null,
      group: null,
    } : null,
  };
}

// ============================================================================
// Props
// ============================================================================

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rule?: WANRule | null;
  interfaceHealth: WANInterfaceHealth[];
  capabilities: LBCapabilities | null;
  onSuccess: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function WANRuleModal({ open, onOpenChange, rule, interfaceHealth, onSuccess }: Props) {
  const isEdit = !!rule;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchOpen, setMatchOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(rule ? ruleToForm(rule) : emptyForm());
      setError(null);
      setMatchOpen(false);
    }
  }, [open, rule]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const setIface = <K extends keyof IfaceForm>(idx: number, key: K, val: IfaceForm[K]) =>
    setForm((f) => {
      const interfaces = [...f.interfaces];
      interfaces[idx] = { ...interfaces[idx], [key]: val };
      return { ...f, interfaces };
    });

  const addIface = () =>
    setForm((f) => ({ ...f, interfaces: [...f.interfaces, { interface: "", weight: "" }] }));

  const removeIface = (idx: number) =>
    setForm((f) => ({ ...f, interfaces: f.interfaces.filter((_, i) => i !== idx) }));

  const handleSubmit = async () => {
    if (!form.rule_id.trim()) { setError("Rule ID is required"); return; }
    if (form.interfaces.filter((i) => i.interface.trim()).length === 0 && !form.exclude) {
      setError("At least one outbound interface is required"); return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = formToRule(form);
      if (isEdit && rule) {
        await lbService.updateWANRule(rule, data);
      } else {
        await lbService.createWANRule(data);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const healthyInterfaces = interfaceHealth.map((i) => i.interface);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit WAN Rule" : "Add WAN Rule"}</DialogTitle>
          <DialogDescription>
            Define traffic matching criteria and outbound interface selection for WAN load balancing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Basic */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Rule ID <span className="text-destructive">*</span></Label>
              <Input
                value={form.rule_id}
                onChange={(e) => set("rule_id", e.target.value)}
                placeholder="10"
                type="number"
                disabled={isEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Inbound Interface</Label>
              <Input
                value={form.inbound_interface}
                onChange={(e) => set("inbound_interface", e.target.value)}
                placeholder="eth0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Protocol</Label>
              <Select
                value={form.protocol || "_any"}
                onValueChange={(v) => set("protocol", v === "_any" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_any">Any</SelectItem>
                  <SelectItem value="tcp">TCP</SelectItem>
                  <SelectItem value="udp">UDP</SelectItem>
                  <SelectItem value="tcp_udp">TCP + UDP</SelectItem>
                  <SelectItem value="icmp">ICMP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={form.failover} onCheckedChange={(c) => set("failover", !!c)} />
              Failover mode
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={form.per_packet_balancing}
                onCheckedChange={(c) => set("per_packet_balancing", !!c)}
              />
              Per-packet balancing
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={form.exclude} onCheckedChange={(c) => set("exclude", !!c)} />
              Exclude (bypass LB)
            </label>
          </div>

          <Separator />

          {/* Outbound Interfaces */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Outbound Interfaces</Label>
              <Button type="button" variant="outline" size="sm" onClick={addIface}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>

            {form.interfaces.map((iface, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Interface</Label>
                  <Select
                    value={iface.interface || "_custom"}
                    onValueChange={(v) => setIface(idx, "interface", v === "_custom" ? "" : v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select or type" />
                    </SelectTrigger>
                    <SelectContent>
                      {healthyInterfaces.map((hi) => (
                        <SelectItem key={hi} value={hi}>{hi}</SelectItem>
                      ))}
                      <SelectItem value="_custom">Custom…</SelectItem>
                    </SelectContent>
                  </Select>
                  {(iface.interface === "" || !healthyInterfaces.includes(iface.interface)) && (
                    <Input
                      className="h-7 text-xs mt-1"
                      value={iface.interface}
                      onChange={(e) => setIface(idx, "interface", e.target.value)}
                      placeholder="eth1"
                    />
                  )}
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">Weight</Label>
                  <Input
                    className="h-8 text-sm"
                    value={iface.weight}
                    onChange={(e) => setIface(idx, "weight", e.target.value)}
                    placeholder="1"
                    type="number"
                  />
                </div>
                {form.interfaces.length > 1 && (
                  <Button
                    type="button" variant="ghost" size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive mb-0"
                    onClick={() => removeIface(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Separator />

          {/* Match criteria */}
          <Collapsible open={matchOpen} onOpenChange={setMatchOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-sm font-semibold hover:text-foreground text-muted-foreground transition-colors">
              Match Criteria (Source / Destination)
              <ChevronDown className={cn("h-4 w-4 transition-transform", matchOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Address / Network</Label>
                  <Input
                    value={form.source_address}
                    onChange={(e) => set("source_address", e.target.value)}
                    placeholder="192.168.1.0/24"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Port</Label>
                  <Input
                    value={form.source_port}
                    onChange={(e) => set("source_port", e.target.value)}
                    placeholder="1024-65535"
                  />
                </div>
              </div>

              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">Destination</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Address / Network</Label>
                  <Input
                    value={form.destination_address}
                    onChange={(e) => set("destination_address", e.target.value)}
                    placeholder="0.0.0.0/0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Port</Label>
                  <Input
                    value={form.destination_port}
                    onChange={(e) => set("destination_port", e.target.value)}
                    placeholder="80,443"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {error && (
          <div className="flex gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
