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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Boxes, Loader2, Plus, Trash2 } from "lucide-react";
import { vxlanService, type VxlanCapabilities } from "@/lib/api/vxlan";
import { showService, type InterfaceName } from "@/lib/api/show";
import { ApiError } from "@/lib/types/api";

interface CreateVxlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: VxlanCapabilities | null;
  existingInterfaces: string[];
}

interface VlanToVniRow {
  vlan_id: string;
  vni: string;
  description: string;
}

export function CreateVxlanModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
}: CreateVxlanModalProps) {
  // Basic form state
  const [name, setName] = useState("vxlan0");
  const [vni, setVni] = useState("");
  const [description, setDescription] = useState("");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceInterface, setSourceInterface] = useState("");
  const [group, setGroup] = useState("");
  const [remotes, setRemotes] = useState("");
  const [port, setPort] = useState("");
  const [mtu, setMtu] = useState("");
  const [addresses, setAddresses] = useState("");
  const [mac, setMac] = useState("");
  const [vrf, setVrf] = useState("");
  const [redirect, setRedirect] = useState("");

  // Advanced state
  const [disabled, setDisabled] = useState(false);
  const [gpe, setGpe] = useState(false);
  const [external, setExternal] = useState(false);
  const [nolearning, setNolearning] = useState(false);
  const [neighborSuppress, setNeighborSuppress] = useState(false);
  const [vniFilter, setVniFilter] = useState(false);
  const [ipDf, setIpDf] = useState("");
  const [ipTos, setIpTos] = useState("");
  const [ipTtl, setIpTtl] = useState("");
  const [ipv6Flowlabel, setIpv6Flowlabel] = useState("");
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");

  // VLAN-to-VNI state
  const [vlanToVni, setVlanToVni] = useState<VlanToVniRow[]>([]);

  // Available interfaces for dropdowns
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch(() => {});
    }
  }, [open]);

  const getNextInterfaceName = (): string => {
    let i = 0;
    while (existingInterfaces.includes(`vxlan${i}`)) {
      i++;
    }
    return `vxlan${i}`;
  };

  const resetForm = () => {
    setName(getNextInterfaceName());
    setVni("");
    setDescription("");
    setSourceAddress("");
    setSourceInterface("");
    setGroup("");
    setRemotes("");
    setPort("");
    setMtu("");
    setAddresses("");
    setMac("");
    setVrf("");
    setRedirect("");
    setDisabled(false);
    setGpe(false);
    setExternal(false);
    setNolearning(false);
    setNeighborSuppress(false);
    setVniFilter(false);
    setIpDf("");
    setIpTos("");
    setIpTtl("");
    setIpv6Flowlabel("");
    setMirrorIngress("");
    setMirrorEgress("");
    setVlanToVni([]);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName(getNextInterfaceName());
    } else {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const validateForm = (): string | null => {
    if (!name.trim()) return "Interface name is required";
    if (!/^vxlan\d+$/.test(name.trim())) return "Name must be in format 'vxlan0', 'vxlan1', etc.";
    if (existingInterfaces.includes(name.trim())) return `Interface ${name} already exists`;
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const config: Parameters<typeof vxlanService.createInterface>[0] = {
        name: name.trim(),
      };

      if (vni.trim()) config.vni = vni.trim();
      if (description.trim()) config.description = description.trim();
      if (sourceAddress.trim()) config.source_address = sourceAddress.trim();
      if (sourceInterface.trim()) config.source_interface = sourceInterface.trim();
      if (group.trim()) config.group = group.trim();
      if (port.trim()) config.port = port.trim();
      if (mtu.trim()) config.mtu = mtu.trim();
      if (mac.trim()) config.mac = mac.trim();
      if (vrf.trim()) config.vrf = vrf.trim();
      if (redirect.trim()) config.redirect = redirect.trim();
      if (disabled) config.disabled = true;
      if (gpe) config.gpe = true;

      if (addresses.trim()) {
        config.addresses = addresses.split(",").map((a) => a.trim()).filter(Boolean);
      }
      if (remotes.trim()) {
        config.remotes = remotes.split(",").map((r) => r.trim()).filter(Boolean);
      }

      // Parameters
      const params: NonNullable<typeof config.parameters> = {};
      if (external) params.external = true;
      if (nolearning) params.nolearning = true;
      if (neighborSuppress) params.neighbor_suppress = true;
      if (vniFilter) params.vni_filter = true;
      if (ipDf.trim()) params.ip_df = ipDf.trim();
      if (ipTos.trim()) params.ip_tos = ipTos.trim();
      if (ipTtl.trim()) params.ip_ttl = ipTtl.trim();
      if (ipv6Flowlabel.trim()) params.ipv6_flowlabel = ipv6Flowlabel.trim();
      if (Object.keys(params).length > 0) config.parameters = params;

      // Mirror
      const mirror: NonNullable<typeof config.mirror> = {};
      if (mirrorIngress.trim()) mirror.ingress = mirrorIngress.trim();
      if (mirrorEgress.trim()) mirror.egress = mirrorEgress.trim();
      if (Object.keys(mirror).length > 0) config.mirror = mirror;

      // VLAN-to-VNI
      const validMappings = vlanToVni.filter((m) => m.vlan_id.trim());
      if (validMappings.length > 0) {
        config.vlan_to_vni = validMappings.map((m) => ({
          vlan_id: m.vlan_id.trim(),
          vni: m.vni.trim() || "",
          description: m.description.trim() || undefined,
        }));
      }

      const result = await vxlanService.createInterface(config);

      if (result.success) {
        handleClose();
        onSuccess();
      } else {
        setError(result.error || "Failed to create VXLAN interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to create VXLAN interface");
    } finally {
      setLoading(false);
    }
  };

  const addVlanMapping = () => {
    setVlanToVni([...vlanToVni, { vlan_id: "", vni: "", description: "" }]);
  };

  const removeVlanMapping = (index: number) => {
    setVlanToVni(vlanToVni.filter((_, i) => i !== index));
  };

  const updateVlanMapping = (index: number, field: keyof VlanToVniRow, value: string) => {
    const updated = [...vlanToVni];
    updated[index] = { ...updated[index], [field]: value };
    setVlanToVni(updated);
  };

  const supportsVlanDescription = capabilities?.features.vlan_to_vni_description?.supported ?? false;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            Create VXLAN Interface
          </DialogTitle>
          <DialogDescription>
            Create a new VXLAN tunnel interface for overlay networking.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="vlan-vni">VLAN-to-VNI</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Interface Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="vxlan0" />
                <p className="text-xs text-muted-foreground">Format: vxlan0, vxlan1, etc.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vni">VNI</Label>
                <Input id="vni" value={vni} onChange={(e) => setVni(e.target.value)} placeholder="0-16777214" />
                <p className="text-xs text-muted-foreground">Virtual Network Identifier</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="VXLAN tunnel description" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sourceAddress">Source Address</Label>
                <Input id="sourceAddress" value={sourceAddress} onChange={(e) => setSourceAddress(e.target.value)} placeholder="192.168.1.1" />
                <p className="text-xs text-muted-foreground">Local tunnel endpoint IP</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceInterface">Source Interface</Label>
                <Select value={sourceInterface || "__none__"} onValueChange={(v) => setSourceInterface(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select interface" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {availableInterfaces.map((iface) => (
                      <SelectItem key={iface.name} value={iface.name}>{iface.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remotes">Remote Addresses</Label>
              <Input id="remotes" value={remotes} onChange={(e) => setRemotes(e.target.value)} placeholder="10.0.0.2, 10.0.0.3" />
              <p className="text-xs text-muted-foreground">Comma-separated remote tunnel endpoint IPs</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="group">Multicast Group</Label>
                <Input id="group" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="239.1.1.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">UDP Port</Label>
                <Input id="port" value={port} onChange={(e) => setPort(e.target.value)} placeholder="4789" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addresses">IP Addresses</Label>
              <Input id="addresses" value={addresses} onChange={(e) => setAddresses(e.target.value)} placeholder="10.10.10.1/24, fd00::1/64" />
              <p className="text-xs text-muted-foreground">Comma-separated with CIDR notation</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mtu">MTU</Label>
                <Input id="mtu" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="1500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mac">MAC Address</Label>
                <Input id="mac" value={mac} onChange={(e) => setMac(e.target.value)} placeholder="00:11:22:33:44:55" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vrf">VRF</Label>
                <Input id="vrf" value={vrf} onChange={(e) => setVrf(e.target.value)} placeholder="VRF name" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tunnel Parameters</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="external" checked={external} onCheckedChange={(c) => setExternal(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="external" className="cursor-pointer text-sm">External</Label>
                    <p className="text-xs text-muted-foreground">Use external control plane</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="nolearning" checked={nolearning} onCheckedChange={(c) => setNolearning(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="nolearning" className="cursor-pointer text-sm">No Learning</Label>
                    <p className="text-xs text-muted-foreground">Disable MAC learning</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="neighborSuppress" checked={neighborSuppress} onCheckedChange={(c) => setNeighborSuppress(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="neighborSuppress" className="cursor-pointer text-sm">Neighbor Suppress</Label>
                    <p className="text-xs text-muted-foreground">ARP/ND suppression</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="vniFilter" checked={vniFilter} onCheckedChange={(c) => setVniFilter(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="vniFilter" className="cursor-pointer text-sm">VNI Filter</Label>
                    <p className="text-xs text-muted-foreground">Enable VNI filtering</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="gpe" checked={gpe} onCheckedChange={(c) => setGpe(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="gpe" className="cursor-pointer text-sm">GPE</Label>
                    <p className="text-xs text-muted-foreground">Generic Protocol Extension</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="disabled" checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="disabled" className="cursor-pointer text-sm">Disabled</Label>
                    <p className="text-xs text-muted-foreground">Administratively disable</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">IP Parameters</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ipDf" className="text-xs">Don&apos;t Fragment</Label>
                  <Select value={ipDf} onValueChange={setIpDf}>
                    <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Default</SelectItem>
                      <SelectItem value="set">Set</SelectItem>
                      <SelectItem value="unset">Unset</SelectItem>
                      <SelectItem value="inherit">Inherit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ipTos" className="text-xs">Type of Service</Label>
                  <Input id="ipTos" value={ipTos} onChange={(e) => setIpTos(e.target.value)} placeholder="0-255 or inherit" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ipTtl" className="text-xs">TTL</Label>
                  <Input id="ipTtl" value={ipTtl} onChange={(e) => setIpTtl(e.target.value)} placeholder="0-255" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">IPv6 Parameters</Label>
              <div className="space-y-2">
                <Label htmlFor="ipv6Flowlabel" className="text-xs">Flow Label</Label>
                <Input id="ipv6Flowlabel" value={ipv6Flowlabel} onChange={(e) => setIpv6Flowlabel(e.target.value)} placeholder="0x0-0xfffff" />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Mirror</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mirrorIngress" className="text-xs">Ingress Interface</Label>
                  <Select value={mirrorIngress || "__none__"} onValueChange={(v) => setMirrorIngress(v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select interface" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {availableInterfaces.map((iface) => (
                        <SelectItem key={iface.name} value={iface.name}>{iface.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mirrorEgress" className="text-xs">Egress Interface</Label>
                  <Select value={mirrorEgress || "__none__"} onValueChange={(v) => setMirrorEgress(v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select interface" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {availableInterfaces.map((iface) => (
                        <SelectItem key={iface.name} value={iface.name}>{iface.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="redirect">Redirect Interface</Label>
              <Select value={redirect || "__none__"} onValueChange={(v) => setRedirect(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select interface" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {availableInterfaces.map((iface) => (
                    <SelectItem key={iface.name} value={iface.name}>{iface.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Redirect received packets to another interface</p>
            </div>
          </TabsContent>

          <TabsContent value="vlan-vni" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">VLAN-to-VNI Mappings</Label>
                  <p className="text-xs text-muted-foreground mt-1">Map VLANs to VNIs for EVPN-VXLAN bridging</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVlanMapping} className="gap-1">
                  <Plus className="h-3 w-3" /> Add Mapping
                </Button>
              </div>

              {vlanToVni.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">No VLAN-to-VNI mappings configured</p>
                  <Button type="button" variant="outline" size="sm" onClick={addVlanMapping} className="mt-3 gap-1">
                    <Plus className="h-3 w-3" /> Add First Mapping
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {vlanToVni.map((mapping, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-lg border p-3">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">VLAN ID</Label>
                          <Input
                            value={mapping.vlan_id}
                            onChange={(e) => updateVlanMapping(index, "vlan_id", e.target.value)}
                            placeholder="1-4094"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">VNI</Label>
                          <Input
                            value={mapping.vni}
                            onChange={(e) => updateVlanMapping(index, "vni", e.target.value)}
                            placeholder="0-16777214"
                          />
                        </div>
                      </div>
                      {supportsVlanDescription && (
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={mapping.description}
                            onChange={(e) => updateVlanMapping(index, "description", e.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                      )}
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeVlanMapping(index)} className="shrink-0 mt-5">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
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
