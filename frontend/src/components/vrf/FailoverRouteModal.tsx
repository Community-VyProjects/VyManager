"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { vrfService, VrfBatchOperation } from "@/lib/api/vrf";

type Raw = Record<string, unknown>;

interface Target {
  address: string;
  interface: string;
  vrf: string;
}
interface Hop {
  address: string;
  interface: string;
  metric: string;
  onlink: boolean;
  checkType: string;
  checkPolicy: string;
  checkPort: string;
  checkTimeout: string;
  targets: Target[];
}

interface FailoverRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vrfName: string;
  /** Destination of the route being edited, or null when adding. */
  destination: string | null;
  /** Raw config of the route being edited (failover.route[dest]), or null when adding. */
  routeRaw: Raw | null;
  canWrite: boolean;
  onSaved: () => void;
}

function str(v: unknown): string {
  return typeof v === "string" || typeof v === "number" ? String(v) : "";
}

function emptyHop(): Hop {
  return { address: "", interface: "", metric: "", onlink: false, checkType: "", checkPolicy: "", checkPort: "", checkTimeout: "", targets: [] };
}

function parseHops(node: unknown): Hop[] {
  if (!node || typeof node !== "object") return [];
  return Object.entries(node as Raw).map(([address, raw]) => {
    const h = (raw && typeof raw === "object" ? raw : {}) as Raw;
    const check = (h.check && typeof h.check === "object" ? h.check : {}) as Raw;
    const targetNode = (check.target && typeof check.target === "object" ? check.target : {}) as Raw;
    const targets: Target[] = Object.entries(targetNode).map(([taddr, traw]) => {
      const t = (traw && typeof traw === "object" ? traw : {}) as Raw;
      return { address: taddr, interface: str(t.interface), vrf: str(t.vrf) };
    });
    return {
      address,
      interface: str(h.interface),
      metric: str(h.metric),
      onlink: h && typeof h === "object" ? "onlink" in h : false,
      checkType: str(check.type),
      checkPolicy: str(check.policy),
      checkPort: str(check.port),
      checkTimeout: str(check.timeout),
      targets,
    };
  });
}

export function FailoverRouteModal({
  open,
  onOpenChange,
  vrfName,
  destination,
  routeRaw,
  canWrite,
  onSaved,
}: FailoverRouteModalProps) {
  const editing = destination !== null;
  const initial = useMemo(
    () => ({
      dest: destination ?? "",
      nextHops: parseHops(routeRaw?.["next-hop"]),
      dhcpInterfaces: parseHops(routeRaw?.["dhcp-interface"]),
    }),
    [destination, routeRaw]
  );

  const [dest, setDest] = useState(initial.dest);
  const [nextHops, setNextHops] = useState<Hop[]>(initial.nextHops);
  const [dhcpInterfaces, setDhcpInterfaces] = useState<Hop[]>(initial.dhcpInterfaces);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed when opened for a different route.
  const seedKey = `${destination}:${open}`;
  const [seed, setSeed] = useState(seedKey);
  if (seedKey !== seed) {
    setSeed(seedKey);
    setDest(initial.dest);
    setNextHops(initial.nextHops);
    setDhcpInterfaces(initial.dhcpInterfaces);
    setError(null);
  }

  const buildOps = (): VrfBatchOperation[] => {
    const ops: VrfBatchOperation[] = [];
    const d = dest.trim();
    if (editing) ops.push({ op: "delete_vrf_failover_route", value: `${vrfName},${destination}` });

    const addHop = (kind: "next_hop" | "dhcp_interface", hop: Hop) => {
      const a = hop.address.trim();
      if (!a) return;
      const b = `vrf_failover_route_${kind}`;
      const p = `${vrfName},${d},${a}`;
      ops.push({ op: `set_${b}`, value: p });
      if (hop.interface.trim()) ops.push({ op: `set_${b}_interface`, value: `${p},${hop.interface.trim()}` });
      if (hop.metric.trim()) ops.push({ op: `set_${b}_metric`, value: `${p},${hop.metric.trim()}` });
      if (hop.onlink) ops.push({ op: `set_${b}_onlink`, value: p });
      if (hop.checkType.trim()) ops.push({ op: `set_${b}_check_type`, value: `${p},${hop.checkType.trim()}` });
      if (hop.checkPolicy.trim()) ops.push({ op: `set_${b}_check_policy`, value: `${p},${hop.checkPolicy.trim()}` });
      if (hop.checkPort.trim()) ops.push({ op: `set_${b}_check_port`, value: `${p},${hop.checkPort.trim()}` });
      if (hop.checkTimeout.trim()) ops.push({ op: `set_${b}_check_timeout`, value: `${p},${hop.checkTimeout.trim()}` });
      for (const t of hop.targets) {
        const ta = t.address.trim();
        if (!ta) continue;
        ops.push({ op: `set_${b}_check_target`, value: `${p},${ta}` });
        if (t.interface.trim()) ops.push({ op: `set_${b}_check_target_interface`, value: `${p},${ta},${t.interface.trim()}` });
        if (t.vrf.trim()) ops.push({ op: `set_${b}_check_target_vrf`, value: `${p},${ta},${t.vrf.trim()}` });
      }
    };
    nextHops.forEach((h) => addHop("next_hop", h));
    dhcpInterfaces.forEach((h) => addHop("dhcp_interface", h));
    return ops;
  };

  const valid =
    dest.trim() &&
    [...nextHops, ...dhcpInterfaces].some((h) => h.address.trim());

  const handleSave = async () => {
    if (!valid) {
      setError("A destination and at least one next-hop (or DHCP interface) are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await vrfService.batchConfigure(buildOps());
      if (!result.success) {
        setError(result.error || "Operation failed");
        return;
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh]">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit Route — ${destination}` : "Add Failover Route"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[64vh] pr-4">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs">Destination</Label>
              <Input
                placeholder="10.0.0.0/24"
                value={dest}
                disabled={!canWrite || saving || editing}
                onChange={(e) => setDest(e.target.value)}
              />
            </div>

            <HopSection
              title="Next Hops"
              addLabel="next-hop"
              hops={nextHops}
              setHops={setNextHops}
              disabled={!canWrite || saving}
            />
            <HopSection
              title="DHCP Interfaces"
              addLabel="dhcp-interface"
              hops={dhcpInterfaces}
              setHops={setDhcpInterfaces}
              disabled={!canWrite || saving}
            />
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <pre className="whitespace-pre-wrap break-words font-mono text-xs">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canWrite || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Route
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HopSection({
  title,
  addLabel,
  hops,
  setHops,
  disabled,
}: {
  title: string;
  addLabel: string;
  hops: Hop[];
  setHops: (h: Hop[]) => void;
  disabled: boolean;
}) {
  const update = (i: number, patch: Partial<Hop>) =>
    setHops(hops.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        {!disabled && (
          <Button size="sm" variant="outline" onClick={() => setHops([...hops, emptyHop()])}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add {addLabel}
          </Button>
        )}
      </div>
      {hops.length === 0 && <p className="text-xs text-muted-foreground">None.</p>}
      {hops.map((hop, i) => (
        <div key={i} className="rounded-md border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              className="h-8 font-mono"
              placeholder={addLabel === "dhcp-interface" ? "Interface name" : "Next-hop address"}
              value={hop.address}
              disabled={disabled}
              onChange={(e) => update(i, { address: e.target.value })}
            />
            {!disabled && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setHops(hops.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Interface" value={hop.interface} disabled={disabled} onChange={(v) => update(i, { interface: v })} />
            <Field label="Metric" value={hop.metric} disabled={disabled} type="number" onChange={(v) => update(i, { metric: v })} />
            <label className="flex items-center gap-2 text-xs mt-5">
              <input type="checkbox" className="h-4 w-4" checked={hop.onlink} disabled={disabled} onChange={(e) => update(i, { onlink: e.target.checked })} />
              On-link
            </label>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Field label="Check type" value={hop.checkType} disabled={disabled} onChange={(v) => update(i, { checkType: v })} />
            <Field label="Check policy" value={hop.checkPolicy} disabled={disabled} onChange={(v) => update(i, { checkPolicy: v })} />
            <Field label="Check port" value={hop.checkPort} disabled={disabled} type="number" onChange={(v) => update(i, { checkPort: v })} />
            <Field label="Check timeout" value={hop.checkTimeout} disabled={disabled} type="number" onChange={(v) => update(i, { checkTimeout: v })} />
          </div>
          <TargetList
            targets={hop.targets}
            disabled={disabled}
            setTargets={(t) => update(i, { targets: t })}
          />
        </div>
      ))}
    </div>
  );
}

function TargetList({
  targets,
  setTargets,
  disabled,
}: {
  targets: Target[];
  setTargets: (t: Target[]) => void;
  disabled: boolean;
}) {
  const update = (i: number, patch: Partial<Target>) =>
    setTargets(targets.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  return (
    <div className="space-y-1.5 pl-2 border-l">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Check targets</span>
        {!disabled && (
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setTargets([...targets, { address: "", interface: "", vrf: "" }])}>
            <Plus className="h-3 w-3 mr-1" />
            Add target
          </Button>
        )}
      </div>
      {targets.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input className="h-7 font-mono" placeholder="Target address" value={t.address} disabled={disabled} onChange={(e) => update(i, { address: e.target.value })} />
          <Input className="h-7" placeholder="Interface" value={t.interface} disabled={disabled} onChange={(e) => update(i, { interface: e.target.value })} />
          <Input className="h-7" placeholder="VRF" value={t.vrf} disabled={disabled} onChange={(e) => update(i, { vrf: e.target.value })} />
          {!disabled && (
            <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => setTargets(targets.filter((_, idx) => idx !== i))}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      <Input className="h-8" type={type} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
