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
import { VrfSelect } from "@/components/ui/vrf-select";
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
import { vxlanService, type VxlanInterface, type VxlanCapabilities } from "@/lib/api/vxlan";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";

interface VxlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: VxlanCapabilities | null;
  existingInterfaces: string[];
  existing?: VxlanInterface | null;
}

interface VlanToVniRow {
  vlan_id: string;
  vni: string;
  description: string;
}

export function VxlanModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
  existing,
}: VxlanModalProps) {
  const isEdit = modalIsEdit(existing);

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

  const populateForm = (interfaceData: VxlanInterface) => {
    setName(interfaceData.name);
    setVni(interfaceData.vni || "");
    setDescription(interfaceData.description || "");
    setSourceAddress(interfaceData.source_address || "");
    setSourceInterface(interfaceData.source_interface || "");
    setGroup(interfaceData.group || "");
    setRemotes(interfaceData.remotes.join(", "));
    setPort(interfaceData.port || "");
    setMtu(interfaceData.mtu || "");
    setAddresses(interfaceData.addresses.join(", "));
    setMac(interfaceData.mac || "");
    setVrf(interfaceData.vrf || "");
    setRedirect(interfaceData.redirect || "");
    setDisabled(interfaceData.disabled);
    setGpe(interfaceData.gpe);
    setExternal(interfaceData.parameters.external);
    setNolearning(interfaceData.parameters.nolearning);
    setNeighborSuppress(interfaceData.parameters.neighbor_suppress);
    setVniFilter(interfaceData.parameters.vni_filter);
    setIpDf(interfaceData.parameters.ip.df || "");
    setIpTos(interfaceData.parameters.ip.tos || "");
    setIpTtl(interfaceData.parameters.ip.ttl || "");
    setIpv6Flowlabel(interfaceData.parameters.ipv6.flowlabel || "");
    setMirrorIngress(interfaceData.mirror.ingress || "");
    setMirrorEgress(interfaceData.mirror.egress || "");
    setVlanToVni(
      interfaceData.vlan_to_vni.map((m) => ({
        vlan_id: m.vlan_id,
        vni: m.vni || "",
        description: m.description || "",
      }))
    );
    setError(null);
  };

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch(() => {});
    if (existing) {
      populateForm(existing);
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing]);

  const lockedName = lockedIdentity(existing, (i) => i.name, name);

  const validateCreate = (): string | null => {
    if (!name.trim()) return "Interface name is required";
    if (!/^vxlan\d+$/.test(name.trim())) return "Name must be in format 'vxlan0', 'vxlan1', etc.";
    if (existingInterfaces.includes(name.trim())) return `Interface ${name} already exists`;
    return null;
  };

  const submitCreate = async () => {
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

    const effectiveIpDf = ipDf === "__none__" ? "" : ipDf;
    const params: NonNullable<typeof config.parameters> = {};
    if (external) params.external = true;
    if (nolearning) params.nolearning = true;
    if (neighborSuppress) params.neighbor_suppress = true;
    if (vniFilter) params.vni_filter = true;
    if (effectiveIpDf.trim()) params.ip_df = effectiveIpDf.trim();
    if (ipTos.trim()) params.ip_tos = ipTos.trim();
    if (ipTtl.trim()) params.ip_ttl = ipTtl.trim();
    if (ipv6Flowlabel.trim()) params.ipv6_flowlabel = ipv6Flowlabel.trim();
    if (Object.keys(params).length > 0) config.parameters = params;

    const mirror: NonNullable<typeof config.mirror> = {};
    if (mirrorIngress.trim()) mirror.ingress = mirrorIngress.trim();
    if (mirrorEgress.trim()) mirror.egress = mirrorEgress.trim();
    if (Object.keys(mirror).length > 0) config.mirror = mirror;

    const validMappings = vlanToVni.filter((m) => m.vlan_id.trim());
    if (validMappings.length > 0) {
      config.vlan_to_vni = validMappings.map((m) => ({
        vlan_id: m.vlan_id.trim(),
        vni: m.vni.trim() || "",
        description: m.description.trim() || undefined,
      }));
    }

    return vxlanService.createInterface(config);
  };

  const submitUpdate = async (current: VxlanInterface, targetName: string) => {
    const parseList = (val: string) => val.split(",").map((s) => s.trim()).filter(Boolean);

    const updated: Parameters<typeof vxlanService.updateInterface>[2] = {};

    if (vni.trim() !== (current.vni || "")) updated.vni = vni.trim() || null;
    if (description.trim() !== (current.description || "")) updated.description = description.trim() || null;
    if (sourceAddress.trim() !== (current.source_address || "")) updated.source_address = sourceAddress.trim() || null;
    if (sourceInterface.trim() !== (current.source_interface || "")) updated.source_interface = sourceInterface.trim() || null;
    if (group.trim() !== (current.group || "")) updated.group = group.trim() || null;
    if (port.trim() !== (current.port || "")) updated.port = port.trim() || null;
    if (mtu.trim() !== (current.mtu || "")) updated.mtu = mtu.trim() || null;
    if (mac.trim() !== (current.mac || "")) updated.mac = mac.trim() || null;
    if (vrf.trim() !== (current.vrf || "")) updated.vrf = vrf.trim() || null;
    if (redirect.trim() !== (current.redirect || "")) updated.redirect = redirect.trim() || null;

    if (disabled !== current.disabled) updated.disabled = disabled;
    if (gpe !== current.gpe) updated.gpe = gpe;

    const newAddresses = parseList(addresses);
    if (JSON.stringify(newAddresses) !== JSON.stringify(current.addresses)) {
      updated.addresses = newAddresses;
    }
    const newRemotes = parseList(remotes);
    if (JSON.stringify(newRemotes) !== JSON.stringify(current.remotes)) {
      updated.remotes = newRemotes;
    }

    const cp = current.parameters;
    const paramChanges: NonNullable<typeof updated.parameters> = {};
    if (external !== cp.external) paramChanges.external = external;
    if (nolearning !== cp.nolearning) paramChanges.nolearning = nolearning;
    if (neighborSuppress !== cp.neighbor_suppress) paramChanges.neighbor_suppress = neighborSuppress;
    if (vniFilter !== cp.vni_filter) paramChanges.vni_filter = vniFilter;
    const effectiveIpDf = ipDf === "__none__" ? "" : ipDf;
    if (effectiveIpDf.trim() !== (cp.ip.df || "")) paramChanges.ip_df = effectiveIpDf.trim() || null;
    if (ipTos.trim() !== (cp.ip.tos || "")) paramChanges.ip_tos = ipTos.trim() || null;
    if (ipTtl.trim() !== (cp.ip.ttl || "")) paramChanges.ip_ttl = ipTtl.trim() || null;
    if (ipv6Flowlabel.trim() !== (cp.ipv6.flowlabel || "")) paramChanges.ipv6_flowlabel = ipv6Flowlabel.trim() || null;
    if (Object.keys(paramChanges).length > 0) updated.parameters = paramChanges;

    const mirrorChanges: NonNullable<typeof updated.mirror> = {};
    if (mirrorIngress.trim() !== (current.mirror.ingress || "")) mirrorChanges.ingress = mirrorIngress.trim() || null;
    if (mirrorEgress.trim() !== (current.mirror.egress || "")) mirrorChanges.egress = mirrorEgress.trim() || null;
    if (Object.keys(mirrorChanges).length > 0) updated.mirror = mirrorChanges;

    const validMappings = vlanToVni.filter((m) => m.vlan_id.trim());
    const currentMappings = current.vlan_to_vni.map((m) => ({
      vlan_id: m.vlan_id,
      vni: m.vni || "",
      description: m.description || "",
    }));
    if (JSON.stringify(validMappings) !== JSON.stringify(currentMappings)) {
      updated.vlan_to_vni = validMappings.map((m) => ({
        vlan_id: m.vlan_id.trim(),
        vni: m.vni.trim() || null,
        description: m.description.trim() || null,
      }));
    }

    return vxlanService.updateInterface(targetName, current, updated);
  };

  const handleSubmit = async () => {
    const write = modalWriteKind(existing);

    if (write.kind === "create") {
      const validationError = validateCreate();
      if (validationError) {
        setError(validationError);
        return;
      }
    } else if (!existing) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result =
        write.kind === "update" && existing
          ? await submitUpdate(existing, write.name)
          : await submitCreate();

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || (isEdit ? "Failed to update VXLAN interface" : "Failed to create VXLAN interface"));
      }
    } catch (err) {
      setError(
        (err as ApiError).message ||
          (isEdit ? "Failed to update VXLAN interface" : "Failed to create VXLAN interface"),
      );
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            {isEdit ? `Edit: ${existing.name}` : "Create VXLAN Interface"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modify VXLAN interface configuration. Changes are applied atomically."
              : "Create a new VXLAN tunnel interface for overlay networking."}
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
                <Label htmlFor="vxlan-name">Interface Name</Label>
                <Input
                  id="vxlan-name"
                  value={lockedName.value}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="vxlan0"
                  disabled={lockedName.disabled}
                  className={lockedName.disabled ? "bg-muted" : undefined}
                />
                <p className="text-xs text-muted-foreground">
                  {lockedName.disabled ? "Interface name cannot be changed." : "Format: vxlan0, vxlan1, etc."}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vxlan-vni">VNI</Label>
                <Input id="vxlan-vni" value={vni} onChange={(e) => setVni(e.target.value)} placeholder="0-16777214" />
                <p className="text-xs text-muted-foreground">Virtual Network Identifier</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vxlan-description">Description</Label>
              <Input id="vxlan-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="VXLAN tunnel description" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vxlan-sourceAddress">Source Address</Label>
                <Input id="vxlan-sourceAddress" value={sourceAddress} onChange={(e) => setSourceAddress(e.target.value)} placeholder="192.168.1.1" />
                <p className="text-xs text-muted-foreground">Local tunnel endpoint IP</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vxlan-sourceInterface">Source Interface</Label>
                <InterfaceSelect
                  value={sourceInterface || "__none__"}
                  onValueChange={(v) => setSourceInterface(v === "__none__" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: "None", value: "__none__" }}
                  placeholder="Select interface"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vxlan-remotes">Remote Addresses</Label>
              <Input id="vxlan-remotes" value={remotes} onChange={(e) => setRemotes(e.target.value)} placeholder="10.0.0.2, 10.0.0.3" />
              <p className="text-xs text-muted-foreground">Comma-separated remote tunnel endpoint IPs</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vxlan-group">Multicast Group</Label>
                <Input id="vxlan-group" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="239.1.1.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vxlan-port">UDP Port</Label>
                <Input id="vxlan-port" value={port} onChange={(e) => setPort(e.target.value)} placeholder="4789" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vxlan-addresses">IP Addresses</Label>
              <Input id="vxlan-addresses" value={addresses} onChange={(e) => setAddresses(e.target.value)} placeholder="10.10.10.1/24, fd00::1/64" />
              <p className="text-xs text-muted-foreground">Comma-separated with CIDR notation</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vxlan-mtu">MTU</Label>
                <Input id="vxlan-mtu" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="1500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vxlan-mac">MAC Address</Label>
                <Input id="vxlan-mac" value={mac} onChange={(e) => setMac(e.target.value)} placeholder="00:11:22:33:44:55" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vxlan-vrf">VRF</Label>
                <VrfSelect id="vxlan-vrf" value={vrf} onValueChange={setVrf} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tunnel Parameters</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="vxlan-external" checked={external} onCheckedChange={(c) => setExternal(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="vxlan-external" className="cursor-pointer text-sm">External</Label>
                    <p className="text-xs text-muted-foreground">Use external control plane</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="vxlan-nolearning" checked={nolearning} onCheckedChange={(c) => setNolearning(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="vxlan-nolearning" className="cursor-pointer text-sm">No Learning</Label>
                    <p className="text-xs text-muted-foreground">Disable MAC learning</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="vxlan-neighborSuppress" checked={neighborSuppress} onCheckedChange={(c) => setNeighborSuppress(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="vxlan-neighborSuppress" className="cursor-pointer text-sm">Neighbor Suppress</Label>
                    <p className="text-xs text-muted-foreground">ARP/ND suppression</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="vxlan-vniFilter" checked={vniFilter} onCheckedChange={(c) => setVniFilter(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="vxlan-vniFilter" className="cursor-pointer text-sm">VNI Filter</Label>
                    <p className="text-xs text-muted-foreground">Enable VNI filtering</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="vxlan-gpe" checked={gpe} onCheckedChange={(c) => setGpe(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="vxlan-gpe" className="cursor-pointer text-sm">GPE</Label>
                    <p className="text-xs text-muted-foreground">Generic Protocol Extension</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="vxlan-disabled" checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="vxlan-disabled" className="cursor-pointer text-sm">Disabled</Label>
                    <p className="text-xs text-muted-foreground">Administratively disable</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">IP Parameters</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vxlan-ipDf" className="text-xs">Don&apos;t Fragment</Label>
                  <Select value={ipDf || "__none__"} onValueChange={setIpDf}>
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
                  <Label htmlFor="vxlan-ipTos" className="text-xs">Type of Service</Label>
                  <Input id="vxlan-ipTos" value={ipTos} onChange={(e) => setIpTos(e.target.value)} placeholder="0-255 or inherit" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vxlan-ipTtl" className="text-xs">TTL</Label>
                  <Input id="vxlan-ipTtl" value={ipTtl} onChange={(e) => setIpTtl(e.target.value)} placeholder="0-255" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">IPv6 Parameters</Label>
              <div className="space-y-2">
                <Label htmlFor="vxlan-ipv6Flowlabel" className="text-xs">Flow Label</Label>
                <Input id="vxlan-ipv6Flowlabel" value={ipv6Flowlabel} onChange={(e) => setIpv6Flowlabel(e.target.value)} placeholder="0x0-0xfffff" />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Mirror</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vxlan-mirrorIngress" className="text-xs">Ingress Interface</Label>
                  <InterfaceSelect
                    value={mirrorIngress || "__none__"}
                    onValueChange={(v) => setMirrorIngress(v === "__none__" ? "" : v)}
                    interfaces={availableInterfaces}
                    noneOption={{ label: "None", value: "__none__" }}
                    placeholder="Select interface"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vxlan-mirrorEgress" className="text-xs">Egress Interface</Label>
                  <InterfaceSelect
                    value={mirrorEgress || "__none__"}
                    onValueChange={(v) => setMirrorEgress(v === "__none__" ? "" : v)}
                    interfaces={availableInterfaces}
                    noneOption={{ label: "None", value: "__none__" }}
                    placeholder="Select interface"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vxlan-redirect">Redirect Interface</Label>
              <InterfaceSelect
                value={redirect || "__none__"}
                onValueChange={(v) => setRedirect(v === "__none__" ? "" : v)}
                interfaces={availableInterfaces}
                noneOption={{ label: "None", value: "__none__" }}
                placeholder="Select interface"
              />
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Saving..." : "Creating..."}
              </>
            ) : (
              isEdit ? "Save Changes" : "Create Interface"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
