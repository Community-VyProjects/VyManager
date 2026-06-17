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
import { vxlanService, type VxlanInterface, type VxlanCapabilities } from "@/lib/api/vxlan";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface EditVxlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: VxlanCapabilities | null;
  interfaceData: VxlanInterface | null;
}

interface VlanToVniRow {
  vlan_id: string;
  vni: string;
  description: string;
}

export function EditVxlanModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  interfaceData,
}: EditVxlanModalProps) {
  // Basic form state
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

  // Populate form when interfaceData changes
  useEffect(() => {
    if (interfaceData && open) {
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
    }
  }, [interfaceData, open]);

  const handleSubmit = async () => {
    if (!interfaceData) return;

    setLoading(true);
    setError(null);

    try {
      const parseList = (val: string) => val.split(",").map((s) => s.trim()).filter(Boolean);

      const updated: Parameters<typeof vxlanService.updateInterface>[2] = {};

      // String fields
      if (vni.trim() !== (interfaceData.vni || "")) updated.vni = vni.trim() || null;
      if (description.trim() !== (interfaceData.description || "")) updated.description = description.trim() || null;
      if (sourceAddress.trim() !== (interfaceData.source_address || "")) updated.source_address = sourceAddress.trim() || null;
      if (sourceInterface.trim() !== (interfaceData.source_interface || "")) updated.source_interface = sourceInterface.trim() || null;
      if (group.trim() !== (interfaceData.group || "")) updated.group = group.trim() || null;
      if (port.trim() !== (interfaceData.port || "")) updated.port = port.trim() || null;
      if (mtu.trim() !== (interfaceData.mtu || "")) updated.mtu = mtu.trim() || null;
      if (mac.trim() !== (interfaceData.mac || "")) updated.mac = mac.trim() || null;
      if (vrf.trim() !== (interfaceData.vrf || "")) updated.vrf = vrf.trim() || null;
      if (redirect.trim() !== (interfaceData.redirect || "")) updated.redirect = redirect.trim() || null;

      // Booleans
      if (disabled !== interfaceData.disabled) updated.disabled = disabled;
      if (gpe !== interfaceData.gpe) updated.gpe = gpe;

      // Arrays
      const newAddresses = parseList(addresses);
      if (JSON.stringify(newAddresses) !== JSON.stringify(interfaceData.addresses)) {
        updated.addresses = newAddresses;
      }
      const newRemotes = parseList(remotes);
      if (JSON.stringify(newRemotes) !== JSON.stringify(interfaceData.remotes)) {
        updated.remotes = newRemotes;
      }

      // Parameters
      const cp = interfaceData.parameters;
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

      // Mirror
      const mirrorChanges: NonNullable<typeof updated.mirror> = {};
      if (mirrorIngress.trim() !== (interfaceData.mirror.ingress || "")) mirrorChanges.ingress = mirrorIngress.trim() || null;
      if (mirrorEgress.trim() !== (interfaceData.mirror.egress || "")) mirrorChanges.egress = mirrorEgress.trim() || null;
      if (Object.keys(mirrorChanges).length > 0) updated.mirror = mirrorChanges;

      // VLAN-to-VNI
      const validMappings = vlanToVni.filter((m) => m.vlan_id.trim());
      const currentMappings = interfaceData.vlan_to_vni.map((m) => ({
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

      const result = await vxlanService.updateInterface(interfaceData.name, interfaceData, updated);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update VXLAN interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update VXLAN interface");
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

  if (!interfaceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            Edit: {interfaceData.name}
          </DialogTitle>
          <DialogDescription>
            Modify VXLAN interface configuration. Changes are applied atomically.
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
                <Label>Interface Name</Label>
                <Input value={interfaceData.name} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-vni">VNI</Label>
                <Input id="edit-vni" value={vni} onChange={(e) => setVni(e.target.value)} placeholder="0-16777214" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="VXLAN tunnel description" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sourceAddress">Source Address</Label>
                <Input id="edit-sourceAddress" value={sourceAddress} onChange={(e) => setSourceAddress(e.target.value)} placeholder="192.168.1.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sourceInterface">Source Interface</Label>
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
              <Label htmlFor="edit-remotes">Remote Addresses</Label>
              <Input id="edit-remotes" value={remotes} onChange={(e) => setRemotes(e.target.value)} placeholder="10.0.0.2, 10.0.0.3" />
              <p className="text-xs text-muted-foreground">Comma-separated remote tunnel endpoint IPs</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-group">Multicast Group</Label>
                <Input id="edit-group" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="239.1.1.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-port">UDP Port</Label>
                <Input id="edit-port" value={port} onChange={(e) => setPort(e.target.value)} placeholder="4789" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-addresses">IP Addresses</Label>
              <Input id="edit-addresses" value={addresses} onChange={(e) => setAddresses(e.target.value)} placeholder="10.10.10.1/24, fd00::1/64" />
              <p className="text-xs text-muted-foreground">Comma-separated with CIDR notation</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-mtu">MTU</Label>
                <Input id="edit-mtu" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="1500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mac">MAC Address</Label>
                <Input id="edit-mac" value={mac} onChange={(e) => setMac(e.target.value)} placeholder="00:11:22:33:44:55" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-vrf">VRF</Label>
                <Input id="edit-vrf" value={vrf} onChange={(e) => setVrf(e.target.value)} placeholder="VRF name" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tunnel Parameters</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="edit-external" checked={external} onCheckedChange={(c) => setExternal(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="edit-external" className="cursor-pointer text-sm">External</Label>
                    <p className="text-xs text-muted-foreground">Use external control plane</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="edit-nolearning" checked={nolearning} onCheckedChange={(c) => setNolearning(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="edit-nolearning" className="cursor-pointer text-sm">No Learning</Label>
                    <p className="text-xs text-muted-foreground">Disable MAC learning</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="edit-neighborSuppress" checked={neighborSuppress} onCheckedChange={(c) => setNeighborSuppress(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="edit-neighborSuppress" className="cursor-pointer text-sm">Neighbor Suppress</Label>
                    <p className="text-xs text-muted-foreground">ARP/ND suppression</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="edit-vniFilter" checked={vniFilter} onCheckedChange={(c) => setVniFilter(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="edit-vniFilter" className="cursor-pointer text-sm">VNI Filter</Label>
                    <p className="text-xs text-muted-foreground">Enable VNI filtering</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="edit-gpe" checked={gpe} onCheckedChange={(c) => setGpe(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="edit-gpe" className="cursor-pointer text-sm">GPE</Label>
                    <p className="text-xs text-muted-foreground">Generic Protocol Extension</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="edit-disabled" checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="edit-disabled" className="cursor-pointer text-sm">Disabled</Label>
                    <p className="text-xs text-muted-foreground">Administratively disable</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">IP Parameters</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-ipDf" className="text-xs">Don&apos;t Fragment</Label>
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
                  <Label htmlFor="edit-ipTos" className="text-xs">Type of Service</Label>
                  <Input id="edit-ipTos" value={ipTos} onChange={(e) => setIpTos(e.target.value)} placeholder="0-255 or inherit" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-ipTtl" className="text-xs">TTL</Label>
                  <Input id="edit-ipTtl" value={ipTtl} onChange={(e) => setIpTtl(e.target.value)} placeholder="0-255" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">IPv6 Parameters</Label>
              <div className="space-y-2">
                <Label htmlFor="edit-ipv6Flowlabel" className="text-xs">Flow Label</Label>
                <Input id="edit-ipv6Flowlabel" value={ipv6Flowlabel} onChange={(e) => setIpv6Flowlabel(e.target.value)} placeholder="0x0-0xfffff" />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Mirror</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-mirrorIngress" className="text-xs">Ingress Interface</Label>
                  <InterfaceSelect
                    value={mirrorIngress || "__none__"}
                    onValueChange={(v) => setMirrorIngress(v === "__none__" ? "" : v)}
                    interfaces={availableInterfaces}
                    noneOption={{ label: "None", value: "__none__" }}
                    placeholder="Select interface"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-mirrorEgress" className="text-xs">Egress Interface</Label>
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
              <Label htmlFor="edit-redirect">Redirect Interface</Label>
              <InterfaceSelect
                value={redirect || "__none__"}
                onValueChange={(v) => setRedirect(v === "__none__" ? "" : v)}
                interfaces={availableInterfaces}
                noneOption={{ label: "None", value: "__none__" }}
                placeholder="Select interface"
              />
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
