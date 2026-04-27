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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  virtualEthernetService,
  type VirtualEthernetCapabilities,
  type VirtualEthernetCreateConfig,
  type VirtualEthernetDhcpv6PdInterfaceInput,
} from "@/lib/api/virtual-ethernet";
import { ApiError } from "@/lib/types/api";

const VETH_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_.-]{0,14}$/;

const SOURCE_VALIDATION_OPTIONS = [
  { value: "strict", label: "Strict" },
  { value: "loose", label: "Loose" },
  { value: "disable", label: "Disable" },
];

interface PdInstanceForm {
  instance: string;
  length: string;
  interfaces: VirtualEthernetDhcpv6PdInterfaceInput[];
}

interface CreateVirtualEthernetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: VirtualEthernetCapabilities | null;
  existingNames: string[];
}

export function CreateVirtualEthernetModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingNames,
}: CreateVirtualEthernetModalProps) {
  const feat = (key: string) => capabilities?.features?.[key]?.supported ?? false;

  // Basic
  const [name, setName] = useState("veth0");
  const [peerName, setPeerName] = useState("veth1");
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [netns, setNetns] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState<string[]>([]);
  const [addressInput, setAddressInput] = useState("");

  // DHCP Options
  const [dhcpClientId, setDhcpClientId] = useState("");
  const [dhcpHostName, setDhcpHostName] = useState("");
  const [dhcpVendorClassId, setDhcpVendorClassId] = useState("");
  const [dhcpUserClass, setDhcpUserClass] = useState("");
  const [dhcpNoDefaultRoute, setDhcpNoDefaultRoute] = useState(false);
  const [dhcpDefaultRouteDistance, setDhcpDefaultRouteDistance] = useState("");
  const [dhcpReject, setDhcpReject] = useState<string[]>([]);
  const [dhcpRejectInput, setDhcpRejectInput] = useState("");
  const [dhcpMtu, setDhcpMtu] = useState(false);

  // DHCPv6
  const [dhcpv6Duid, setDhcpv6Duid] = useState("");
  const [dhcpv6NoRelease, setDhcpv6NoRelease] = useState(false);
  const [dhcpv6NoRequestDns, setDhcpv6NoRequestDns] = useState(false);
  const [dhcpv6NoRequestDomainName, setDhcpv6NoRequestDomainName] = useState(false);
  const [dhcpv6ParametersOnly, setDhcpv6ParametersOnly] = useState(false);
  const [dhcpv6RapidCommit, setDhcpv6RapidCommit] = useState(false);
  const [dhcpv6Temporary, setDhcpv6Temporary] = useState(false);
  const [pdInstances, setPdInstances] = useState<PdInstanceForm[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("veth0");
    setPeerName("veth1");
    setDescription("");
    setMtu("");
    setVrf("");
    setNetns("");
    setDisabled(false);
    setAddresses([]);
    setAddressInput("");
    setDhcpClientId(""); setDhcpHostName(""); setDhcpVendorClassId(""); setDhcpUserClass("");
    setDhcpNoDefaultRoute(false); setDhcpDefaultRouteDistance(""); setDhcpReject([]); setDhcpRejectInput(""); setDhcpMtu(false);
    setDhcpv6Duid(""); setDhcpv6NoRelease(false); setDhcpv6NoRequestDns(false);
    setDhcpv6NoRequestDomainName(false); setDhcpv6ParametersOnly(false);
    setDhcpv6RapidCommit(false); setDhcpv6Temporary(false); setPdInstances([]);
    setError(null);
  }, [open]);

  const addAddress = () => {
    const v = addressInput.trim();
    if (v && !addresses.includes(v)) setAddresses((p) => [...p, v]);
    setAddressInput("");
  };

  const addDhcpReject = () => {
    const v = dhcpRejectInput.trim();
    if (v && !dhcpReject.includes(v)) setDhcpReject((p) => [...p, v]);
    setDhcpRejectInput("");
  };

  const validate = (): string | null => {
    const n = name.trim();
    if (!n) return "Interface name is required.";
    if (!VETH_NAME_RE.test(n)) return "Interface name must start with a letter and contain only letters, digits, underscores, hyphens, or dots (max 15 chars).";
    if (existingNames.includes(n)) return `Interface '${n}' already exists.`;
    if (!peerName.trim()) return "Peer name is required.";
    if (!VETH_NAME_RE.test(peerName.trim())) return "Peer name must follow the same naming rules as the interface name.";
    if (mtu) {
      const m = Number(mtu);
      if (!Number.isInteger(m) || m < 68 || m > 16000) return "MTU must be between 68 and 16000.";
    }
    return null;
  };

  const buildConfig = (): VirtualEthernetCreateConfig => {
    const hasDhcp = dhcpClientId || dhcpHostName || dhcpVendorClassId || dhcpUserClass ||
      dhcpNoDefaultRoute || dhcpDefaultRouteDistance || dhcpReject.length > 0 || dhcpMtu;

    const hasDhcpv6 = dhcpv6Duid || dhcpv6NoRelease || dhcpv6NoRequestDns ||
      dhcpv6NoRequestDomainName || dhcpv6ParametersOnly || dhcpv6RapidCommit ||
      dhcpv6Temporary || pdInstances.length > 0;

    return {
      name: name.trim(),
      description: description.trim() || undefined,
      disabled,
      peer_name: peerName.trim() || undefined,
      netns: netns.trim() || undefined,
      mtu: mtu.trim() || undefined,
      vrf: vrf.trim() || undefined,
      addresses,
      dhcp_options: hasDhcp ? {
        client_id: dhcpClientId.trim() || undefined,
        host_name: dhcpHostName.trim() || undefined,
        vendor_class_id: dhcpVendorClassId.trim() || undefined,
        user_class: dhcpUserClass.trim() || undefined,
        no_default_route: dhcpNoDefaultRoute,
        default_route_distance: dhcpDefaultRouteDistance.trim() || undefined,
        reject: dhcpReject,
        mtu: dhcpMtu,
      } : undefined,
      dhcpv6_options: hasDhcpv6 ? {
        duid: dhcpv6Duid.trim() || undefined,
        no_release: dhcpv6NoRelease,
        no_request_dns: dhcpv6NoRequestDns,
        no_request_domain_name: dhcpv6NoRequestDomainName,
        parameters_only: dhcpv6ParametersOnly,
        rapid_commit: dhcpv6RapidCommit,
        temporary: dhcpv6Temporary,
        pd: pdInstances.map((p) => ({
          instance: p.instance.trim(),
          length: p.length.trim() || undefined,
          interfaces: p.interfaces.filter((i) => i.name?.trim()).map((i) => ({
            name: i.name!.trim(),
            address: i.address?.trim() || undefined,
            sla_id: i.sla_id?.trim() || undefined,
          })),
        })),
      } : undefined,
    };
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await virtualEthernetService.createInterface(buildConfig());
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Operation failed");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to create interface");
    } finally {
      setLoading(false);
    }
  };

  const hasDhcpAddress = addresses.some((a) => a === "dhcp" || a === "dhcpv6");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Virtual Ethernet Interface</DialogTitle>
          <DialogDescription>
            Configure a new kernel veth pair. Both ends of the pair are created together.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Interface Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="veth0"
                />
                <p className="text-xs text-muted-foreground">e.g. veth0, veth-ns1</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="peerName">Peer Name *</Label>
                <Input
                  id="peerName"
                  value={peerName}
                  onChange={(e) => setPeerName(e.target.value)}
                  placeholder="veth1"
                />
                <p className="text-xs text-muted-foreground">The other end of the veth pair</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mtu">MTU</Label>
                <Input
                  id="mtu"
                  type="number"
                  value={mtu}
                  onChange={(e) => setMtu(e.target.value)}
                  placeholder="68–16000"
                  min={68}
                  max={16000}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vrf">VRF</Label>
                <Input
                  id="vrf"
                  value={vrf}
                  onChange={(e) => setVrf(e.target.value)}
                  placeholder="VRF instance name"
                />
              </div>
            </div>

            {feat("netns") && (
              <div className="space-y-2">
                <Label htmlFor="netns">Network Namespace</Label>
                <Input
                  id="netns"
                  value={netns}
                  onChange={(e) => setNetns(e.target.value)}
                  placeholder="myns"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox id="disabled" checked={disabled} onCheckedChange={(c) => setDisabled(!!c)} />
              <Label htmlFor="disabled">Disabled</Label>
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>IP Addresses</Label>
              <div className="flex gap-2">
                <Input
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAddress())}
                  placeholder="192.0.2.1/24 or dhcp or dhcpv6"
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

            {(hasDhcpAddress || dhcpClientId || dhcpHostName || dhcpVendorClassId || dhcpUserClass || dhcpNoDefaultRoute || dhcpReject.length > 0 || dhcpMtu) && (
              <>
                <Separator />
                <p className="text-sm font-medium">DHCP Options</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input value={dhcpClientId} onChange={(e) => setDhcpClientId(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hostname</Label>
                    <Input value={dhcpHostName} onChange={(e) => setDhcpHostName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vendor Class ID</Label>
                    <Input value={dhcpVendorClassId} onChange={(e) => setDhcpVendorClassId(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>User Class</Label>
                    <Input value={dhcpUserClass} onChange={(e) => setDhcpUserClass(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={dhcpNoDefaultRoute} onCheckedChange={(c) => setDhcpNoDefaultRoute(!!c)} id="dhcpNoDef" />
                    <Label htmlFor="dhcpNoDef">No Default Route</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Route Distance</Label>
                    <Input type="number" value={dhcpDefaultRouteDistance} onChange={(e) => setDhcpDefaultRouteDistance(e.target.value)} min={1} max={255} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={dhcpMtu} onCheckedChange={(c) => setDhcpMtu(!!c)} id="dhcpMtu" />
                  <Label htmlFor="dhcpMtu">Request MTU from DHCP</Label>
                </div>
                <div className="space-y-2">
                  <Label>Reject Servers</Label>
                  <div className="flex gap-2">
                    <Input
                      value={dhcpRejectInput}
                      onChange={(e) => setDhcpRejectInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDhcpReject())}
                      placeholder="Server IP to reject"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addDhcpReject}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {dhcpReject.map((s) => (
                      <Badge key={s} variant="secondary" className="gap-1 pr-1">
                        {s}
                        <button onClick={() => setDhcpReject((p) => p.filter((x) => x !== s))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
            {!hasDhcpAddress && !dhcpClientId && (
              <Button type="button" variant="outline" size="sm" onClick={() => setDhcpClientId(" ")}>
                Expand DHCP Options
              </Button>
            )}

            <Separator />
            <p className="text-sm font-medium">DHCPv6 Options</p>
            <div className="space-y-2">
              <Label>DUID</Label>
              <Input value={dhcpv6Duid} onChange={(e) => setDhcpv6Duid(e.target.value)} placeholder="DHCPv6 unique identifier" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                [dhcpv6NoRelease, setDhcpv6NoRelease, "No Release"],
                [dhcpv6ParametersOnly, setDhcpv6ParametersOnly, "Parameters Only"],
                [dhcpv6RapidCommit, setDhcpv6RapidCommit, "Rapid Commit"],
                [dhcpv6Temporary, setDhcpv6Temporary, "Temporary"],
              ] as const).map(([val, setter, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <Checkbox checked={val} onCheckedChange={(c) => setter(!!c)} id={`dhcpv6-${label}`} />
                  <Label htmlFor={`dhcpv6-${label}`} className="text-sm font-normal">{label}</Label>
                </div>
              ))}
              {feat("dhcpv6_no_request_dns") && (
                <div className="flex items-center gap-2">
                  <Checkbox checked={dhcpv6NoRequestDns} onCheckedChange={(c) => setDhcpv6NoRequestDns(!!c)} id="dhcpv6NoDns" />
                  <Label htmlFor="dhcpv6NoDns" className="text-sm font-normal">No Request DNS</Label>
                </div>
              )}
              {feat("dhcpv6_no_request_domain_name") && (
                <div className="flex items-center gap-2">
                  <Checkbox checked={dhcpv6NoRequestDomainName} onCheckedChange={(c) => setDhcpv6NoRequestDomainName(!!c)} id="dhcpv6NoDomain" />
                  <Label htmlFor="dhcpv6NoDomain" className="text-sm font-normal">No Request Domain Name</Label>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>PD Instances</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setPdInstances((p) => [...p, { instance: String(p.length + 1), length: "", interfaces: [] }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add PD
                </Button>
              </div>
              {pdInstances.map((pd, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">PD Instance {pd.instance}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPdInstances((p) => p.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Instance ID</Label>
                      <Input value={pd.instance} onChange={(e) => setPdInstances((p) => p.map((r, j) => j === i ? { ...r, instance: e.target.value } : r))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Length (32–64)</Label>
                      <Input type="number" min={32} max={64} value={pd.length} onChange={(e) => setPdInstances((p) => p.map((r, j) => j === i ? { ...r, length: e.target.value } : r))} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Delegated Interfaces</Label>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-xs" onClick={() => setPdInstances((p) => p.map((r, j) => j === i ? { ...r, interfaces: [...r.interfaces, { name: "", address: "", sla_id: "" }] } : r))}>
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </div>
                    {pd.interfaces.map((di, k) => (
                      <div key={k} className="flex gap-2 items-center">
                        <Input className="flex-1" placeholder="Interface" value={di.name ?? ""} onChange={(e) => setPdInstances((p) => p.map((r, j) => j === i ? { ...r, interfaces: r.interfaces.map((x, l) => l === k ? { ...x, name: e.target.value } : x) } : r))} />
                        <Input className="flex-1" placeholder="Address" value={di.address ?? ""} onChange={(e) => setPdInstances((p) => p.map((r, j) => j === i ? { ...r, interfaces: r.interfaces.map((x, l) => l === k ? { ...x, address: e.target.value } : x) } : r))} />
                        <Input className="w-20" placeholder="SLA ID" value={di.sla_id ?? ""} onChange={(e) => setPdInstances((p) => p.map((r, j) => j === i ? { ...r, interfaces: r.interfaces.map((x, l) => l === k ? { ...x, sla_id: e.target.value } : x) } : r))} />
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPdInstances((p) => p.map((r, j) => j === i ? { ...r, interfaces: r.interfaces.filter((_, l) => l !== k) } : r))}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
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
                Creating...
              </>
            ) : (
              "Create Interface"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
