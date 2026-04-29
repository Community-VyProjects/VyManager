"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  vppService,
  type VppCapabilities,
  type VppSubType,
  type VppBondingConfig,
  type VppBridgeConfig,
  type VppGreConfig,
  type VppIpipConfig,
  type VppLoopbackConfig,
  type VppVxlanConfig,
  type VppXconnectConfig,
  type VppBridgeMemberInput,
  type VppAnyConfig,
} from "@/lib/api/vpp";
import { showService } from "@/lib/api/show";
import { ApiError } from "@/lib/types/api";

const SUB_TYPE_LABELS: Record<VppSubType, string> = {
  bonding: "Bonding",
  bridge: "Bridge",
  gre: "GRE",
  ipip: "IPIP",
  loopback: "Loopback",
  vxlan: "VXLAN",
  xconnect: "XConnect",
};

// ── VIF form state ────────────────────────────────────────────────────────────

interface VifFormState {
  vlan_id: string;
  description: string;
  disabled: boolean;
  addresses: string[];
  addressInput: string;
  mtu: string;
}

const emptyVif = (): VifFormState => ({
  vlan_id: "",
  description: "",
  disabled: false,
  addresses: [],
  addressInput: "",
  mtu: "",
});

// ── Props ────────────────────────────────────────────────────────────────────

interface EditVppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: VppAnyConfig | null;
  subType: VppSubType | null;
  capabilities: VppCapabilities | null;
}

// ============================================================================
// Component
// ============================================================================

export function EditVppModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
  subType,
}: EditVppModalProps) {
  const [allIfaces, setAllIfaces] = useState<{ name: string; type: string }[]>([]);

  // Common
  const [description, setDescription] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [mtu, setMtu] = useState("");
  const [addresses, setAddresses] = useState<string[]>([]);
  const [addressInput, setAddressInput] = useState("");

  // Bonding-specific
  const [bondMode, setBondMode] = useState("802.3ad");
  const [bondHashPolicy, setBondHashPolicy] = useState("layer2");
  const [bondMac, setBondMac] = useState("");

  // GRE-specific
  const [greRemote, setGreRemote] = useState("");
  const [greSource, setGreSource] = useState("");
  const [greTunnelType, setGreTunnelType] = useState("l3");
  const [greKey, setGreKey] = useState("");

  // IPIP-specific
  const [ipipRemote, setIpipRemote] = useState("");
  const [ipipSource, setIpipSource] = useState("");

  // VXLAN-specific
  const [vxlanRemote, setVxlanRemote] = useState("");
  const [vxlanSource, setVxlanSource] = useState("");
  const [vxlanVni, setVxlanVni] = useState("");

  // Members
  const [members, setMembers] = useState<string[]>([]);
  const [bridgeMembers, setBridgeMembers] = useState<VppBridgeMemberInput[]>([]);

  // VIF sub-interfaces
  const [vifs, setVifs] = useState<VifFormState[]>([]);
  const [editingVifIdx, setEditingVifIdx] = useState<number | null>(null);
  const [vifDraft, setVifDraft] = useState<VifFormState>(emptyVif());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Populate form when data changes ──────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces().then((res) => setAllIfaces(res.interfaces)).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open || !interfaceData || !subType) return;
    setError(null);
    setEditingVifIdx(null);
    setVifDraft(emptyVif());
    setAddressInput("");

    setDescription(interfaceData.description ?? "");

    if (subType === "bonding") {
      const d = interfaceData as VppBondingConfig;
      setDisabled(d.disabled);
      setMtu(d.mtu ?? "");
      setAddresses([...d.addresses]);
      setBondMode(d.mode ?? "802.3ad");
      setBondHashPolicy(d.hash_policy ?? "layer2");
      setBondMac(d.mac ?? "");
      setMembers([...d.members]);
      setVifs(d.vif.map((v) => ({
        vlan_id: v.vlan_id, description: v.description ?? "",
        disabled: v.disabled, addresses: [...v.addresses],
        addressInput: "", mtu: v.mtu ?? "",
      })));
    } else if (subType === "bridge") {
      const d = interfaceData as VppBridgeConfig;
      setBridgeMembers(d.members.map((m) => ({ interface: m.interface, bvi: m.bvi })));
    } else if (subType === "gre") {
      const d = interfaceData as VppGreConfig;
      setDisabled(d.disabled);
      setMtu(d.mtu ?? "");
      setAddresses([...d.addresses]);
      setGreRemote(d.remote ?? "");
      setGreSource(d.source_address ?? "");
      setGreTunnelType(d.tunnel_type ?? "l3");
      setGreKey(d.key ?? "");
    } else if (subType === "ipip") {
      const d = interfaceData as VppIpipConfig;
      setDisabled(d.disabled);
      setMtu(d.mtu ?? "");
      setAddresses([...d.addresses]);
      setIpipRemote(d.remote ?? "");
      setIpipSource(d.source_address ?? "");
    } else if (subType === "loopback") {
      const d = interfaceData as VppLoopbackConfig;
      setDisabled(d.disabled);
      setMtu(d.mtu ?? "");
      setAddresses([...d.addresses]);
      setVifs(d.vif.map((v) => ({
        vlan_id: v.vlan_id, description: v.description ?? "",
        disabled: v.disabled, addresses: [...v.addresses],
        addressInput: "", mtu: v.mtu ?? "",
      })));
    } else if (subType === "vxlan") {
      const d = interfaceData as VppVxlanConfig;
      setDisabled(d.disabled);
      setMtu(d.mtu ?? "");
      setAddresses([...d.addresses]);
      setVxlanRemote(d.remote ?? "");
      setVxlanSource(d.source_address ?? "");
      setVxlanVni(d.vni ?? "");
    } else if (subType === "xconnect") {
      const d = interfaceData as VppXconnectConfig;
      setDisabled(d.disabled);
      setMembers([...d.members]);
    }
  }, [open, interfaceData, subType]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!interfaceData || !subType) return;
    setLoading(true);
    setError(null);

    const name = interfaceData.name;

    try {
      let result;
      if (subType === "bonding") {
        result = await vppService.updateBonding(name, interfaceData as VppBondingConfig, {
          description: description.trim() || undefined, disabled,
          mode: bondMode, hash_policy: bondHashPolicy,
          mac: bondMac.trim() || undefined, mtu: mtu.trim() || undefined,
          addresses, members,
          vif: vifs.map((v) => ({
            vlan_id: v.vlan_id, description: v.description || undefined,
            disabled: v.disabled, addresses: v.addresses, mtu: v.mtu || undefined,
          })),
        });
      } else if (subType === "bridge") {
        result = await vppService.updateBridge(name, interfaceData as VppBridgeConfig, {
          description: description.trim() || undefined, members: bridgeMembers,
        });
      } else if (subType === "gre") {
        result = await vppService.updateGre(name, interfaceData as VppGreConfig, {
          description: description.trim() || undefined, disabled,
          remote: greRemote.trim() || undefined, source_address: greSource.trim() || undefined,
          tunnel_type: greTunnelType, key: greKey.trim() || undefined,
          mtu: mtu.trim() || undefined, addresses,
        });
      } else if (subType === "ipip") {
        result = await vppService.updateIpip(name, interfaceData as VppIpipConfig, {
          description: description.trim() || undefined, disabled,
          remote: ipipRemote.trim() || undefined, source_address: ipipSource.trim() || undefined,
          mtu: mtu.trim() || undefined, addresses,
        });
      } else if (subType === "loopback") {
        result = await vppService.updateLoopback(name, interfaceData as VppLoopbackConfig, {
          description: description.trim() || undefined, disabled,
          mtu: mtu.trim() || undefined, addresses,
          vif: vifs.map((v) => ({
            vlan_id: v.vlan_id, description: v.description || undefined,
            disabled: v.disabled, addresses: v.addresses, mtu: v.mtu || undefined,
          })),
        });
      } else if (subType === "vxlan") {
        result = await vppService.updateVxlan(name, interfaceData as VppVxlanConfig, {
          description: description.trim() || undefined, disabled,
          remote: vxlanRemote.trim() || undefined, source_address: vxlanSource.trim() || undefined,
          vni: vxlanVni.trim() || undefined, mtu: mtu.trim() || undefined, addresses,
        });
      } else {
        result = await vppService.updateXconnect(name, interfaceData as VppXconnectConfig, {
          description: description.trim() || undefined, disabled, members,
        });
      }

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Operation failed");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update VPP interface");
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const addAddress = () => {
    const v = addressInput.trim();
    if (v && !addresses.includes(v)) setAddresses((p) => [...p, v]);
    setAddressInput("");
  };

  const toggleBvi = (iface: string) => {
    setBridgeMembers((p) => p.map((m) => m.interface === iface ? { ...m, bvi: !m.bvi } : m));
  };

  const saveVif = () => {
    if (!vifDraft.vlan_id.trim()) return;
    if (editingVifIdx !== null) {
      setVifs((p) => p.map((v, i) => i === editingVifIdx ? { ...vifDraft } : v));
      setEditingVifIdx(null);
    } else {
      if (!vifs.some((v) => v.vlan_id === vifDraft.vlan_id.trim())) {
        setVifs((p) => [...p, { ...vifDraft }]);
      }
    }
    setVifDraft(emptyVif());
  };

  const addVifAddress = () => {
    const v = vifDraft.addressInput.trim();
    if (v && !vifDraft.addresses.includes(v)) {
      setVifDraft((d) => ({ ...d, addresses: [...d.addresses, v], addressInput: "" }));
    } else {
      setVifDraft((d) => ({ ...d, addressInput: "" }));
    }
  };

  if (!interfaceData || !subType) return null;

  // Filtered member options by sub-type: bonding → ethernet only; bridge/xconnect → ethernet + bonding
  const memberOptions =
    subType === "bonding"
      ? allIfaces.filter((i) => i.type === "ethernet").map((i) => i.name)
      : allIfaces.filter((i) => i.type === "ethernet" || i.type === "bonding").map((i) => i.name);

  const hasVifTab = subType === "bonding" || subType === "loopback";
  const hasMembersTab = subType === "bonding" || subType === "xconnect";
  const hasBridgeMembersTab = subType === "bridge";
  const hasAddressesTab = subType !== "bridge" && subType !== "xconnect";

  // ── VIF sub-form ──────────────────────────────────────────────────────────

  const renderVifForm = () => (
    <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {editingVifIdx !== null ? "Edit VIF" : "Add VIF"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">VLAN ID *</Label>
          <Input
            value={vifDraft.vlan_id}
            onChange={(e) => setVifDraft((d) => ({ ...d, vlan_id: e.target.value }))}
            placeholder="100"
            type="number"
            min={1}
            max={4094}
            disabled={editingVifIdx !== null}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">MTU</Label>
          <Input value={vifDraft.mtu} onChange={(e) => setVifDraft((d) => ({ ...d, mtu: e.target.value }))} placeholder="68–16000" type="number" min={68} max={16000} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Description</Label>
        <Input value={vifDraft.description} onChange={(e) => setVifDraft((d) => ({ ...d, description: e.target.value }))} />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="edit-vif-disabled" checked={vifDraft.disabled} onCheckedChange={(c) => setVifDraft((d) => ({ ...d, disabled: !!c }))} />
        <Label htmlFor="edit-vif-disabled" className="text-xs font-normal">Disabled</Label>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Addresses</Label>
        <div className="flex gap-2">
          <Input
            value={vifDraft.addressInput}
            onChange={(e) => setVifDraft((d) => ({ ...d, addressInput: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addVifAddress())}
            placeholder="192.168.1.1/24"
            className="text-xs"
          />
          <Button type="button" variant="outline" size="sm" onClick={addVifAddress}><Plus className="h-3 w-3" /></Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {vifDraft.addresses.map((a) => (
            <Badge key={a} variant="secondary" className="gap-1 pr-1 text-xs">
              {a}
              <button onClick={() => setVifDraft((d) => ({ ...d, addresses: d.addresses.filter((x) => x !== a) }))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={saveVif} disabled={!vifDraft.vlan_id.trim()}>
          {editingVifIdx !== null ? "Update VIF" : "Add VIF"}
        </Button>
        {editingVifIdx !== null && (
          <Button type="button" variant="outline" size="sm" onClick={() => { setEditingVifIdx(null); setVifDraft(emptyVif()); }}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit VPP {SUB_TYPE_LABELS[subType]}: <code className="font-mono text-base">{interfaceData.name}</code></DialogTitle>
          <DialogDescription>
            Modify the VPP {SUB_TYPE_LABELS[subType]} interface configuration.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="w-full flex">
            <TabsTrigger value="basic" className="flex-1">Basic</TabsTrigger>
            {hasAddressesTab && <TabsTrigger value="addresses" className="flex-1">Addresses</TabsTrigger>}
            {(hasMembersTab || hasBridgeMembersTab) && <TabsTrigger value="members" className="flex-1">Members</TabsTrigger>}
            {hasVifTab && <TabsTrigger value="vif" className="flex-1">VIF Sub-ifs</TabsTrigger>}
          </TabsList>

          {/* ── Basic Tab ─────────────────────────────────────────────── */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Interface Name</Label>
              <code className="block text-sm font-mono px-3 py-2 rounded-md bg-muted">{interfaceData.name}</code>
            </div>

            {subType === "bonding" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <Select value={bondMode} onValueChange={setBondMode}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["802.3ad", "active-backup", "broadcast", "round-robin", "xor-hash"].map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hash Policy</Label>
                    <Select value={bondHashPolicy} onValueChange={setBondHashPolicy}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["layer2", "layer2+3", "layer3+4"].map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>MAC Address</Label>
                    <Input value={bondMac} onChange={(e) => setBondMac(e.target.value)} placeholder="aa:bb:cc:dd:ee:ff" />
                  </div>
                  <div className="space-y-2">
                    <Label>MTU</Label>
                    <Input type="number" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="68–16000" min={68} max={16000} />
                  </div>
                </div>
              </>
            )}

            {subType === "gre" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Remote IP</Label>
                    <Input value={greRemote} onChange={(e) => setGreRemote(e.target.value)} placeholder="10.0.0.1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Source Address</Label>
                    <Input value={greSource} onChange={(e) => setGreSource(e.target.value)} placeholder="10.0.0.2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tunnel Type</Label>
                    <Select value={greTunnelType} onValueChange={setGreTunnelType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["l3", "teb", "erspan"].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Key</Label>
                    <Input type="number" value={greKey} onChange={(e) => setGreKey(e.target.value)} placeholder="Optional" min={0} max={4294967295} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>MTU</Label>
                  <Input type="number" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="68–16000" min={68} max={16000} />
                </div>
              </>
            )}

            {subType === "ipip" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Remote IP</Label>
                    <Input value={ipipRemote} onChange={(e) => setIpipRemote(e.target.value)} placeholder="10.0.0.1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Source Address</Label>
                    <Input value={ipipSource} onChange={(e) => setIpipSource(e.target.value)} placeholder="10.0.0.2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>MTU</Label>
                  <Input type="number" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="68–16000" min={68} max={16000} />
                </div>
              </>
            )}

            {subType === "loopback" && (
              <div className="space-y-2">
                <Label>MTU</Label>
                <Input type="number" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="68–16000" min={68} max={16000} />
              </div>
            )}

            {subType === "vxlan" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Remote IP</Label>
                    <Input value={vxlanRemote} onChange={(e) => setVxlanRemote(e.target.value)} placeholder="10.0.0.1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Source Address</Label>
                    <Input value={vxlanSource} onChange={(e) => setVxlanSource(e.target.value)} placeholder="10.0.0.2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>VNI</Label>
                    <Input type="number" value={vxlanVni} onChange={(e) => setVxlanVni(e.target.value)} placeholder="100" min={0} max={16777214} />
                  </div>
                  <div className="space-y-2">
                    <Label>MTU</Label>
                    <Input type="number" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="68–16000" min={68} max={16000} />
                  </div>
                </div>
              </>
            )}

            {subType !== "bridge" && (
              <>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="edit-disabled" checked={disabled} onCheckedChange={(c) => setDisabled(!!c)} />
                  <Label htmlFor="edit-disabled">Disabled</Label>
                </div>
              </>
            )}

            {subType === "bridge" && (
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
              </div>
            )}
          </TabsContent>

          {/* ── Addresses Tab ─────────────────────────────────────────── */}
          {hasAddressesTab && (
            <TabsContent value="addresses" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>IP Addresses</Label>
                <div className="flex gap-2">
                  <Input
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAddress())}
                    placeholder="e.g., 192.168.1.1/24"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addAddress}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {addresses.map((addr) => (
                    <Badge key={addr} variant="secondary" className="gap-1 pr-1">
                      {addr}
                      <button onClick={() => setAddresses((p) => p.filter((a) => a !== addr))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>
          )}

          {/* ── Members Tab ───────────────────────────────────────────── */}
          {(hasMembersTab || hasBridgeMembersTab) && (
            <TabsContent value="members" className="space-y-4 mt-4">
              {hasBridgeMembersTab ? (
                <div className="space-y-3">
                  <Label>Bridge Members</Label>
                  <Select
                    value=""
                    onValueChange={(v) => {
                      if (v && !bridgeMembers.some((m) => m.interface === v)) {
                        setBridgeMembers((p) => [...p, { interface: v, bvi: false }]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select interface to add…" />
                    </SelectTrigger>
                    <SelectContent>
                      {memberOptions
                        .filter((i) => !bridgeMembers.some((m) => m.interface === i))
                        .map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      {memberOptions.filter((i) => !bridgeMembers.some((m) => m.interface === i)).length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">All interfaces added</div>
                      )}
                    </SelectContent>
                  </Select>
                  <div className="space-y-2">
                    {bridgeMembers.map((m) => (
                      <div key={m.interface} className="flex items-center gap-3 rounded-md border px-3 py-2">
                        <code className="flex-1 text-sm font-mono">{m.interface}</code>
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            id={`edit-bvi-${m.interface}`}
                            checked={m.bvi}
                            onCheckedChange={() => toggleBvi(m.interface)}
                          />
                          <Label htmlFor={`edit-bvi-${m.interface}`} className="text-xs font-normal cursor-pointer">BVI</Label>
                        </div>
                        <Button
                          type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                          onClick={() => setBridgeMembers((p) => p.filter((x) => x.interface !== m.interface))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label>{subType === "xconnect" ? "XConnect Members" : "Bond Members"}</Label>
                  <Select
                    value=""
                    onValueChange={(v) => {
                      if (v && !members.includes(v)) setMembers((p) => [...p, v]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select interface to add…" />
                    </SelectTrigger>
                    <SelectContent>
                      {memberOptions
                        .filter((i) => !members.includes(i))
                        .map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      {memberOptions.filter((i) => !members.includes(i)).length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">All interfaces added</div>
                      )}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1">
                    {members.map((m) => (
                      <Badge key={m} variant="secondary" className="gap-1 pr-1">
                        <code className="font-mono">{m}</code>
                        <button onClick={() => setMembers((p) => p.filter((x) => x !== m))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          )}

          {/* ── VIF Sub-interfaces Tab ────────────────────────────────── */}
          {hasVifTab && (
            <TabsContent value="vif" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label>VIF Sub-interfaces</Label>
                {editingVifIdx === null && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setVifDraft(emptyVif())}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add VIF
                  </Button>
                )}
              </div>

              {vifs.length > 0 && (
                <div className="space-y-2">
                  {vifs.map((v, i) => (
                    <div key={v.vlan_id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                      <Badge variant="secondary" className="text-xs font-mono">VLAN {v.vlan_id}</Badge>
                      <span className="flex-1 text-xs text-muted-foreground truncate">
                        {v.addresses.length > 0 ? v.addresses.join(", ") : "no addresses"}
                        {v.description ? ` · ${v.description}` : ""}
                      </span>
                      {v.disabled && <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/20">Disabled</Badge>}
                      <Button
                        type="button" variant="ghost" size="sm" className="h-7 w-7 p-0"
                        onClick={() => { setEditingVifIdx(i); setVifDraft({ ...v }); }}
                      >
                        <span className="text-xs">Edit</span>
                      </Button>
                      <Button
                        type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                        onClick={() => setVifs((p) => p.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {renderVifForm()}
            </TabsContent>
          )}
        </Tabs>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap flex-1">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
