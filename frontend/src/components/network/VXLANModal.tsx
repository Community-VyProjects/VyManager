"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Network, Cloud, Radio, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import {
  vxlanService,
  type VXLANInterface,
  type VXLANCapabilities,
  type VXLANOperation,
} from "@/lib/api/vxlan";

interface VXLANModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingInterface: VXLANInterface | null;
  capabilities: VXLANCapabilities | null;
}

type VXLANMode = "unicast" | "multicast" | "evpn" | "svd";

interface VlanVniMapping {
  vlan: string;
  vni: string;
}

export function VXLANModal({
  open,
  onOpenChange,
  onSuccess,
  editingInterface,
  capabilities,
}: VXLANModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditing = !!editingInterface;

  // Form state
  const [name, setName] = useState("");
  const [mode, setMode] = useState<VXLANMode>("unicast");
  const [vni, setVni] = useState("");
  const [port, setPort] = useState("");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceInterface, setSourceInterface] = useState("");
  const [remote, setRemote] = useState("");
  const [group, setGroup] = useState("");
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");

  // EVPN settings
  const [nolearning, setNolearning] = useState(true);
  const [neighborSuppress, setNeighborSuppress] = useState(false);
  const [vniFilter, setVniFilter] = useState(false);

  // SVD mappings
  const [vlanVniMappings, setVlanVniMappings] = useState<VlanVniMapping[]>([]);

  // Reset form when modal opens/closes or editing interface changes
  useEffect(() => {
    if (open) {
      if (editingInterface) {
        setName(editingInterface.name);
        setVni(editingInterface.vni || "");
        setPort(editingInterface.port || "");
        setSourceAddress(editingInterface.source_address || "");
        setSourceInterface(editingInterface.source_interface || "");
        setRemote(editingInterface.remote || "");
        setGroup(editingInterface.group || "");
        setDescription(editingInterface.description || "");
        setMtu(editingInterface.mtu || "");
        setVrf(editingInterface.vrf || "");
        setNolearning(editingInterface.nolearning);
        setNeighborSuppress(editingInterface.neighbor_suppress);
        setVniFilter(editingInterface.vni_filter);
        setVlanVniMappings(
          editingInterface.vlan_to_vni.map((m) => ({
            vlan: m.vlan,
            vni: m.vni || "",
          }))
        );

        // Determine mode
        if (editingInterface.vlan_to_vni.length > 0) {
          setMode("svd");
        } else if (editingInterface.external) {
          setMode("evpn");
        } else if (editingInterface.group) {
          setMode("multicast");
        } else {
          setMode("unicast");
        }
      } else {
        // Reset for new interface
        setName("");
        setMode("unicast");
        setVni("");
        setPort(capabilities?.standard_port?.toString() || "4789");
        setSourceAddress("");
        setSourceInterface("");
        setRemote("");
        setGroup("");
        setDescription("");
        setMtu("");
        setVrf("");
        setNolearning(true);
        setNeighborSuppress(false);
        setVniFilter(false);
        setVlanVniMappings([]);
      }
    }
  }, [open, editingInterface, capabilities]);

  const addVlanVniMapping = () => {
    setVlanVniMappings([...vlanVniMappings, { vlan: "", vni: "" }]);
  };

  const removeVlanVniMapping = (index: number) => {
    setVlanVniMappings(vlanVniMappings.filter((_, i) => i !== index));
  };

  const updateVlanVniMapping = (index: number, field: "vlan" | "vni", value: string) => {
    const updated = [...vlanVniMappings];
    updated[index][field] = value;
    setVlanVniMappings(updated);
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toast.error("Validation Error", "Interface name is required");
      return;
    }

    if (!name.startsWith("vxlan")) {
      toast.error("Validation Error", "VXLAN interface name must start with 'vxlan'");
      return;
    }

    if (mode === "unicast" || mode === "evpn") {
      if (!vni.trim()) {
        toast.error("Validation Error", "VNI is required");
        return;
      }
      if (!sourceAddress.trim()) {
        toast.error("Validation Error", "Source address is required");
        return;
      }
    }

    if (mode === "unicast") {
      if (!remote.trim()) {
        toast.error("Validation Error", "Remote VTEP address is required for unicast mode");
        return;
      }
    }

    if (mode === "multicast") {
      if (!vni.trim()) {
        toast.error("Validation Error", "VNI is required");
        return;
      }
      if (!sourceInterface.trim()) {
        toast.error("Validation Error", "Source interface is required for multicast mode");
        return;
      }
      if (!group.trim()) {
        toast.error("Validation Error", "Multicast group is required");
        return;
      }
    }

    if (mode === "svd") {
      if (!sourceInterface.trim()) {
        toast.error("Validation Error", "Source interface is required for SVD mode");
        return;
      }
      if (vlanVniMappings.length === 0) {
        toast.error("Validation Error", "At least one VLAN-to-VNI mapping is required");
        return;
      }
      for (const mapping of vlanVniMappings) {
        if (!mapping.vlan.trim() || !mapping.vni.trim()) {
          toast.error("Validation Error", "All VLAN-to-VNI mappings must be complete");
          return;
        }
      }
    }

    setLoading(true);
    try {
      const operations: VXLANOperation[] = [];

      // Common settings
      if (description.trim()) {
        operations.push({ op: "set_description", value: description.trim() });
      } else if (isEditing && editingInterface?.description) {
        operations.push({ op: "delete_description" });
      }

      if (mtu.trim()) {
        operations.push({ op: "set_mtu", value: mtu.trim() });
      } else if (isEditing && editingInterface?.mtu) {
        operations.push({ op: "delete_mtu" });
      }

      if (port.trim()) {
        operations.push({ op: "set_port", value: port.trim() });
      }

      if (vrf.trim()) {
        operations.push({ op: "set_vrf", value: vrf.trim() });
      } else if (isEditing && editingInterface?.vrf) {
        operations.push({ op: "delete_vrf" });
      }

      // Mode-specific settings
      switch (mode) {
        case "unicast":
          operations.push({ op: "set_vni", value: vni.trim() });
          operations.push({ op: "set_source_address", value: sourceAddress.trim() });
          operations.push({ op: "set_remote", value: remote.trim() });
          // Clear EVPN settings
          if (isEditing && editingInterface?.external) {
            operations.push({ op: "disable_external" });
          }
          break;

        case "multicast":
          operations.push({ op: "set_vni", value: vni.trim() });
          operations.push({ op: "set_source_interface", value: sourceInterface.trim() });
          operations.push({ op: "set_group", value: group.trim() });
          // Clear EVPN settings
          if (isEditing && editingInterface?.external) {
            operations.push({ op: "disable_external" });
          }
          break;

        case "evpn":
          operations.push({ op: "set_vni", value: vni.trim() });
          operations.push({ op: "set_source_address", value: sourceAddress.trim() });
          operations.push({ op: "enable_external" });
          if (nolearning) {
            operations.push({ op: "enable_nolearning" });
          } else if (isEditing && editingInterface?.nolearning) {
            operations.push({ op: "disable_nolearning" });
          }
          if (neighborSuppress) {
            operations.push({ op: "enable_neighbor_suppress" });
          } else if (isEditing && editingInterface?.neighbor_suppress) {
            operations.push({ op: "disable_neighbor_suppress" });
          }
          if (vniFilter) {
            operations.push({ op: "enable_vni_filter" });
          } else if (isEditing && editingInterface?.vni_filter) {
            operations.push({ op: "disable_vni_filter" });
          }
          break;

        case "svd":
          operations.push({ op: "set_source_interface", value: sourceInterface.trim() });
          operations.push({ op: "enable_external" });

          // Remove old mappings if editing
          if (isEditing && editingInterface?.vlan_to_vni) {
            for (const oldMapping of editingInterface.vlan_to_vni) {
              if (!vlanVniMappings.some((m) => m.vlan === oldMapping.vlan)) {
                operations.push({ op: "delete_vlan_to_vni", value: oldMapping.vlan });
              }
            }
          }

          // Add new mappings
          for (const mapping of vlanVniMappings) {
            operations.push({
              op: "set_vlan_to_vni",
              value: { vlan: mapping.vlan, vni: mapping.vni },
            });
          }
          break;
      }

      const result = await vxlanService.configureBatch({
        interface: name.trim(),
        operations,
      });

      if (result.success) {
        toast.success(
          isEditing ? "Interface Updated" : "Interface Created",
          `VXLAN interface ${name} has been ${isEditing ? "updated" : "created"}`
        );
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error("Failed", result.error || "Operation failed");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as { message?: string })?.message || "Operation failed";
      toast.error("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            {isEditing ? "Edit VXLAN Interface" : "Create VXLAN Interface"}
          </DialogTitle>
          <DialogDescription>
            Configure a VXLAN overlay network interface
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Interface Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">Interface Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="vxlan0"
              disabled={isEditing}
            />
            <p className="text-xs text-muted-foreground">
              Must start with &apos;vxlan&apos; (e.g., vxlan0, vxlan100)
            </p>
          </div>

          {/* Mode Selection */}
          <div className="grid gap-2">
            <Label>Mode</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as VXLANMode)}
              className="grid grid-cols-2 gap-4"
              disabled={isEditing}
            >
              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <RadioGroupItem value="unicast" id="unicast" />
                <Label htmlFor="unicast" className="flex items-center gap-2 cursor-pointer">
                  <Network className="h-4 w-4" />
                  Unicast
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <RadioGroupItem value="multicast" id="multicast" />
                <Label htmlFor="multicast" className="flex items-center gap-2 cursor-pointer">
                  <Radio className="h-4 w-4" />
                  Multicast
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <RadioGroupItem value="evpn" id="evpn" />
                <Label htmlFor="evpn" className="flex items-center gap-2 cursor-pointer">
                  <Cloud className="h-4 w-4" />
                  EVPN
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <RadioGroupItem value="svd" id="svd" />
                <Label htmlFor="svd" className="flex items-center gap-2 cursor-pointer">
                  <Cloud className="h-4 w-4" />
                  SVD (Multi-VNI)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Mode-specific settings */}
          <Tabs value={mode} className="w-full">
            {/* Unicast Mode */}
            <TabsContent value="unicast" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="vni">VNI (VXLAN Network Identifier) *</Label>
                <Input
                  id="vni"
                  type="number"
                  value={vni}
                  onChange={(e) => setVni(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sourceAddress">Source Address *</Label>
                <Input
                  id="sourceAddress"
                  value={sourceAddress}
                  onChange={(e) => setSourceAddress(e.target.value)}
                  placeholder="192.168.1.1"
                />
                <p className="text-xs text-muted-foreground">
                  Underlay IP address for VXLAN encapsulation
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="remote">Remote VTEP Address *</Label>
                <Input
                  id="remote"
                  value={remote}
                  onChange={(e) => setRemote(e.target.value)}
                  placeholder="192.168.2.1"
                />
              </div>
            </TabsContent>

            {/* Multicast Mode */}
            <TabsContent value="multicast" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="vni-mc">VNI (VXLAN Network Identifier) *</Label>
                <Input
                  id="vni-mc"
                  type="number"
                  value={vni}
                  onChange={(e) => setVni(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sourceInterface">Source Interface *</Label>
                <Input
                  id="sourceInterface"
                  value={sourceInterface}
                  onChange={(e) => setSourceInterface(e.target.value)}
                  placeholder="eth0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="group">Multicast Group *</Label>
                <Input
                  id="group"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  placeholder="239.1.1.1"
                />
              </div>
            </TabsContent>

            {/* EVPN Mode */}
            <TabsContent value="evpn" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="vni-evpn">VNI (VXLAN Network Identifier) *</Label>
                <Input
                  id="vni-evpn"
                  type="number"
                  value={vni}
                  onChange={(e) => setVni(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sourceAddress-evpn">Source Address *</Label>
                <Input
                  id="sourceAddress-evpn"
                  value={sourceAddress}
                  onChange={(e) => setSourceAddress(e.target.value)}
                  placeholder="172.16.0.1"
                />
              </div>
              <div className="space-y-4 border rounded-lg p-4">
                <h4 className="font-medium">EVPN Features</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Disable FDB Learning</Label>
                    <p className="text-xs text-muted-foreground">
                      Let BGP control the FDB (recommended for EVPN)
                    </p>
                  </div>
                  <Switch checked={nolearning} onCheckedChange={setNolearning} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>ARP/ND Suppression</Label>
                    <p className="text-xs text-muted-foreground">
                      Minimize ARP/ND flooding in VXLAN network
                    </p>
                  </div>
                  <Switch checked={neighborSuppress} onCheckedChange={setNeighborSuppress} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>VNI Filtering</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable VNI filtering for received packets
                    </p>
                  </div>
                  <Switch checked={vniFilter} onCheckedChange={setVniFilter} />
                </div>
              </div>
            </TabsContent>

            {/* SVD Mode */}
            <TabsContent value="svd" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="sourceInterface-svd">Source Interface *</Label>
                <Input
                  id="sourceInterface-svd"
                  value={sourceInterface}
                  onChange={(e) => setSourceInterface(e.target.value)}
                  placeholder="dum0"
                />
                <p className="text-xs text-muted-foreground">
                  Usually a dummy interface for the underlay IP
                </p>
              </div>
              <div className="space-y-4 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">VLAN-to-VNI Mappings</h4>
                  <Button size="sm" variant="outline" onClick={addVlanVniMapping}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Mapping
                  </Button>
                </div>
                {vlanVniMappings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No mappings configured. Click &quot;Add Mapping&quot; to add one.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {vlanVniMappings.map((mapping, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder="VLAN ID"
                          value={mapping.vlan}
                          onChange={(e) => updateVlanVniMapping(index, "vlan", e.target.value)}
                          className="w-24"
                        />
                        <span className="text-muted-foreground">→</span>
                        <Input
                          placeholder="VNI"
                          value={mapping.vni}
                          onChange={(e) => updateVlanVniMapping(index, "vni", e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeVlanVniMapping(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Common Settings */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Common Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="port">UDP Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="4789"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mtu">MTU</Label>
                <Input
                  id="mtu"
                  type="number"
                  value={mtu}
                  onChange={(e) => setMtu(e.target.value)}
                  placeholder="1500"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vrf">VRF</Label>
              <Input
                id="vrf"
                value={vrf}
                onChange={(e) => setVrf(e.target.value)}
                placeholder="Optional VRF name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional interface description"
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update Interface" : "Create Interface"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
