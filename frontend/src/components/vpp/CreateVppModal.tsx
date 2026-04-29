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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ArrowLeft, ChevronRight, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  vppService,
  type VppCapabilities,
  type VppSubType,
  type VppVifInput,
  type VppBridgeMemberInput,
} from "@/lib/api/vpp";
import { showService } from "@/lib/api/show";
import { ApiError } from "@/lib/types/api";

// ── Name validation patterns per type ────────────────────────────────────────

const NAME_PATTERNS: Record<VppSubType, RegExp> = {
  bonding: /^vppbond\d+$/,
  bridge: /^vppbr(?!0$)\d+$/,
  gre: /^vppgre\d+$/,
  ipip: /^vppipip\d+$/,
  loopback: /^vpplo\d+$/,
  vxlan: /^vppvxlan\d+$/,
  xconnect: /^vppxcon\d+$/,
};

const NAME_EXAMPLES: Record<VppSubType, string> = {
  bonding: "vppbond0",
  bridge: "vppbr1",
  gre: "vppgre0",
  ipip: "vppipip0",
  loopback: "vpplo0",
  vxlan: "vppvxlan0",
  xconnect: "vppxcon0",
};

const SUB_TYPE_LABELS: Record<VppSubType, string> = {
  bonding: "Bonding",
  bridge: "Bridge",
  gre: "GRE",
  ipip: "IPIP",
  loopback: "Loopback",
  vxlan: "VXLAN",
  xconnect: "XConnect",
};

const SUB_TYPE_DESCRIPTIONS: Record<VppSubType, string> = {
  bonding: "Bond/LAG interfaces for link aggregation",
  bridge: "Bridge domain interfaces (vppbr0 reserved)",
  gre: "GRE tunnel interfaces",
  ipip: "IP-in-IP tunnel interfaces",
  loopback: "Loopback interfaces",
  vxlan: "VXLAN tunnel interfaces",
  xconnect: "Layer 2 cross-connect interfaces",
};

const ALL_SUB_TYPES: VppSubType[] = ["bonding", "bridge", "gre", "ipip", "loopback", "vxlan", "xconnect"];

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

interface CreateVppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: VppCapabilities | null;
  existingNames: string[];
}

// ============================================================================
// Component
// ============================================================================

export function CreateVppModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingNames,
}: CreateVppModalProps) {
  const [selectedSubType, setSelectedSubType] = useState<VppSubType | null>(null);
  const [allIfaces, setAllIfaces] = useState<{ name: string; type: string }[]>([]);

  // Common
  const [name, setName] = useState("");
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

  // Members (bonding, bridge, xconnect)
  const [members, setMembers] = useState<string[]>([]);
  const [bridgeMembers, setBridgeMembers] = useState<VppBridgeMemberInput[]>([]);

  // VIF sub-interfaces (bonding, loopback)
  const [vifs, setVifs] = useState<VifFormState[]>([]);
  const [editingVifIdx, setEditingVifIdx] = useState<number | null>(null);
  const [vifDraft, setVifDraft] = useState<VifFormState>(emptyVif());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Reset on open ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces().then((res) => setAllIfaces(res.interfaces)).catch(() => {});
    setSelectedSubType(null);
    setName("");
    setDescription("");
    setDisabled(false);
    setMtu("");
    setAddresses([]);
    setAddressInput("");
    setBondMode("802.3ad");
    setBondHashPolicy("layer2");
    setBondMac("");
    setGreRemote("");
    setGreSource("");
    setGreTunnelType("l3");
    setGreKey("");
    setIpipRemote("");
    setIpipSource("");
    setVxlanRemote("");
    setVxlanSource("");
    setVxlanVni("");
    setMembers([]);
    setBridgeMembers([]);
    setVifs([]);
    setEditingVifIdx(null);
    setVifDraft(emptyVif());
    setError(null);
  }, [open]);

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): string | null => {
    if (!selectedSubType) return "Please select an interface type.";
    const n = name.trim();
    if (!n) return "Interface name is required.";
    if (!NAME_PATTERNS[selectedSubType].test(n)) {
      return `Interface name must match pattern ${NAME_PATTERNS[selectedSubType]} (e.g., ${NAME_EXAMPLES[selectedSubType]}).`;
    }
    if (existingNames.includes(n)) return `Interface '${n}' already exists.`;
    if (mtu) {
      const m = Number(mtu);
      if (!Number.isInteger(m) || m < 68 || m > 16000) return "MTU must be between 68 and 16000.";
    }
    if (selectedSubType === "gre") {
      if (!greRemote.trim()) return "Remote IP is required for GRE.";
      if (!greSource.trim()) return "Source address is required for GRE.";
    }
    if (selectedSubType === "ipip") {
      if (!ipipRemote.trim()) return "Remote IP is required for IPIP.";
      if (!ipipSource.trim()) return "Source address is required for IPIP.";
    }
    if (selectedSubType === "vxlan") {
      if (!vxlanRemote.trim()) return "Remote IP is required for VXLAN.";
      if (!vxlanSource.trim()) return "Source address is required for VXLAN.";
      if (!vxlanVni.trim()) return "VNI is required for VXLAN.";
      const vni = Number(vxlanVni);
      if (!Number.isInteger(vni) || vni < 0 || vni > 16777214) return "VNI must be between 0 and 16777214.";
    }
    return null;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    if (!selectedSubType) return;
    setLoading(true);
    setError(null);

    const n = name.trim();

    try {
      let result;
      if (selectedSubType === "bonding") {
        result = await vppService.createBonding({
          name: n, description: description.trim() || undefined, disabled,
          mode: bondMode, hash_policy: bondHashPolicy,
          mac: bondMac.trim() || undefined, mtu: mtu.trim() || undefined,
          addresses, members,
          vif: vifs.map((v) => ({
            vlan_id: v.vlan_id, description: v.description || undefined,
            disabled: v.disabled, addresses: v.addresses, mtu: v.mtu || undefined,
          })),
        });
      } else if (selectedSubType === "bridge") {
        result = await vppService.createBridge({
          name: n, description: description.trim() || undefined, members: bridgeMembers,
        });
      } else if (selectedSubType === "gre") {
        result = await vppService.createGre({
          name: n, description: description.trim() || undefined, disabled,
          remote: greRemote.trim(), source_address: greSource.trim(),
          tunnel_type: greTunnelType, key: greKey.trim() || undefined,
          mtu: mtu.trim() || undefined, addresses,
        });
      } else if (selectedSubType === "ipip") {
        result = await vppService.createIpip({
          name: n, description: description.trim() || undefined, disabled,
          remote: ipipRemote.trim(), source_address: ipipSource.trim(),
          mtu: mtu.trim() || undefined, addresses,
        });
      } else if (selectedSubType === "loopback") {
        result = await vppService.createLoopback({
          name: n, description: description.trim() || undefined, disabled,
          mtu: mtu.trim() || undefined, addresses,
          vif: vifs.map((v) => ({
            vlan_id: v.vlan_id, description: v.description || undefined,
            disabled: v.disabled, addresses: v.addresses, mtu: v.mtu || undefined,
          })),
        });
      } else if (selectedSubType === "vxlan") {
        result = await vppService.createVxlan({
          name: n, description: description.trim() || undefined, disabled,
          remote: vxlanRemote.trim(), source_address: vxlanSource.trim(),
          vni: vxlanVni.trim(), mtu: mtu.trim() || undefined, addresses,
        });
      } else {
        result = await vppService.createXconnect({
          name: n, description: description.trim() || undefined, disabled, members,
        });
      }

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Operation failed");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to create VPP interface");
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

  // Filtered member options by sub-type: bonding → ethernet only; bridge/xconnect → ethernet + bonding
  const memberOptions =
    selectedSubType === "bonding"
      ? allIfaces.filter((i) => i.type === "ethernet").map((i) => i.name)
      : allIfaces.filter((i) => i.type === "ethernet" || i.type === "bonding").map((i) => i.name);

  const hasVifTab = selectedSubType === "bonding" || selectedSubType === "loopback";
  const hasMembersTab = selectedSubType === "bonding" || selectedSubType === "xconnect";
  const hasBridgeMembersTab = selectedSubType === "bridge";
  const hasAddressesTab = selectedSubType !== "bridge" && selectedSubType !== "xconnect";

  // ── Type picker ───────────────────────────────────────────────────────────

  const renderTypePicker = () => (
    <div className="grid grid-cols-2 gap-3 py-2">
      {ALL_SUB_TYPES.map((t) => {
        const supported = capabilities?.features?.[t]?.supported ?? false;
        if (!supported) return null;
        return (
          <button
            key={t}
            onClick={() => { setSelectedSubType(t); setName(NAME_EXAMPLES[t]); }}
            className="flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-accent transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{SUB_TYPE_LABELS[t]}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{SUB_TYPE_DESCRIPTIONS[t]}</div>
              <code className="text-xs text-muted-foreground mt-1 block">{NAME_EXAMPLES[t]}</code>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          </button>
        );
      })}
    </div>
  );

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
        <Checkbox id="vif-disabled" checked={vifDraft.disabled} onCheckedChange={(c) => setVifDraft((d) => ({ ...d, disabled: !!c }))} />
        <Label htmlFor="vif-disabled" className="text-xs font-normal">Disabled</Label>
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

  // ── Form render ───────────────────────────────────────────────────────────

  const renderForm = () => {
    if (!selectedSubType) return null;

    return (
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
            <Label htmlFor="iface-name">Interface Name *</Label>
            <Input
              id="iface-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={NAME_EXAMPLES[selectedSubType]}
            />
          </div>

          {selectedSubType === "bonding" && (
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

          {selectedSubType === "gre" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Remote IP *</Label>
                  <Input value={greRemote} onChange={(e) => setGreRemote(e.target.value)} placeholder="10.0.0.1" />
                </div>
                <div className="space-y-2">
                  <Label>Source Address *</Label>
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
                  <Label>Key (0–4294967295)</Label>
                  <Input type="number" value={greKey} onChange={(e) => setGreKey(e.target.value)} placeholder="Optional" min={0} max={4294967295} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>MTU</Label>
                <Input type="number" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="68–16000" min={68} max={16000} />
              </div>
            </>
          )}

          {selectedSubType === "ipip" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Remote IP *</Label>
                  <Input value={ipipRemote} onChange={(e) => setIpipRemote(e.target.value)} placeholder="10.0.0.1" />
                </div>
                <div className="space-y-2">
                  <Label>Source Address *</Label>
                  <Input value={ipipSource} onChange={(e) => setIpipSource(e.target.value)} placeholder="10.0.0.2" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>MTU</Label>
                <Input type="number" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="68–16000" min={68} max={16000} />
              </div>
            </>
          )}

          {selectedSubType === "loopback" && (
            <div className="space-y-2">
              <Label>MTU</Label>
              <Input type="number" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="68–16000" min={68} max={16000} />
            </div>
          )}

          {selectedSubType === "vxlan" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Remote IP *</Label>
                  <Input value={vxlanRemote} onChange={(e) => setVxlanRemote(e.target.value)} placeholder="10.0.0.1" />
                </div>
                <div className="space-y-2">
                  <Label>Source Address *</Label>
                  <Input value={vxlanSource} onChange={(e) => setVxlanSource(e.target.value)} placeholder="10.0.0.2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>VNI (0–16777214) *</Label>
                  <Input type="number" value={vxlanVni} onChange={(e) => setVxlanVni(e.target.value)} placeholder="100" min={0} max={16777214} />
                </div>
                <div className="space-y-2">
                  <Label>MTU</Label>
                  <Input type="number" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="68–16000" min={68} max={16000} />
                </div>
              </div>
            </>
          )}

          {selectedSubType === "bridge" && (
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
          )}

          {selectedSubType !== "bridge" && (
            <>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="create-disabled" checked={disabled} onCheckedChange={(c) => setDisabled(!!c)} />
                <Label htmlFor="create-disabled">Disabled</Label>
              </div>
            </>
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
                          id={`bvi-${m.interface}`}
                          checked={m.bvi}
                          onCheckedChange={() => toggleBvi(m.interface)}
                        />
                        <Label htmlFor={`bvi-${m.interface}`} className="text-xs font-normal cursor-pointer">BVI</Label>
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
                <Label>{selectedSubType === "xconnect" ? "XConnect Members" : "Bond Members"}</Label>
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
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedSubType ? (
              <button
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setSelectedSubType(null)}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-normal">VPP</span>
                <span className="text-sm text-muted-foreground mx-1">/</span>
                <span className="font-semibold text-foreground">{SUB_TYPE_LABELS[selectedSubType]}</span>
              </button>
            ) : (
              "Create VPP Interface"
            )}
          </DialogTitle>
          <DialogDescription>
            {selectedSubType
              ? `Configure a new VPP ${SUB_TYPE_LABELS[selectedSubType]} interface.`
              : "Select the VPP interface type to create."}
          </DialogDescription>
        </DialogHeader>

        {selectedSubType ? renderForm() : renderTypePicker()}

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
          {selectedSubType && (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create ${SUB_TYPE_LABELS[selectedSubType]}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
