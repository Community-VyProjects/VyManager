"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  vrfService,
  type VRF,
  type VRFCapabilities,
  type VRFOperation,
} from "@/lib/api/vrf";
import { useToast } from "@/hooks/useToast";

interface VRFModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: VRFCapabilities | null;
  existingVRF?: VRF | null;
  existingVRFs: VRF[];
}

interface BGPNeighborForm {
  address: string;
  remoteAs: string;
}

export function VRFModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingVRF,
  existingVRFs,
}: VRFModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // General settings
  const [name, setName] = useState("");
  const [table, setTable] = useState("");
  const [description, setDescription] = useState("");

  // BGP settings
  const [bgpEnabled, setBgpEnabled] = useState(false);
  const [bgpAs, setBgpAs] = useState("");
  const [bgpRouterId, setBgpRouterId] = useState("");
  const [bgpNeighbors, setBgpNeighbors] = useState<BGPNeighborForm[]>([]);
  const [bgpRedistribute, setBgpRedistribute] = useState<string[]>([]);
  const [bgpImportVrfs, setBgpImportVrfs] = useState<string[]>([]);
  const [bgpImportVpn, setBgpImportVpn] = useState(false);
  const [bgpExportVpn, setBgpExportVpn] = useState(false);

  // OSPF settings
  const [ospfEnabled, setOspfEnabled] = useState(false);
  const [ospfNetworks, setOspfNetworks] = useState<{ area: string; network: string }[]>([]);
  const [ospfRedistribute, setOspfRedistribute] = useState<string[]>([]);

  const isEditing = !!existingVRF;

  useEffect(() => {
    if (open) {
      if (existingVRF) {
        setName(existingVRF.name);
        setTable(existingVRF.table || "");
        setDescription(existingVRF.description || "");

        // BGP
        if (existingVRF.bgp) {
          setBgpEnabled(true);
          setBgpAs(existingVRF.bgp.system_as || "");
          setBgpRouterId(existingVRF.bgp.router_id || "");
          setBgpNeighbors(
            existingVRF.bgp.neighbors.map((n) => ({
              address: n.address,
              remoteAs: n.remote_as || "",
            }))
          );
          const af = existingVRF.bgp.address_families.find(
            (a) => a.name === "ipv4-unicast"
          );
          if (af) {
            setBgpRedistribute(af.redistribute);
            setBgpImportVrfs(af.import_vrfs);
            setBgpImportVpn(af.import_vpn);
            setBgpExportVpn(af.export_vpn);
          }
        } else {
          setBgpEnabled(false);
          setBgpAs("");
          setBgpRouterId("");
          setBgpNeighbors([]);
          setBgpRedistribute([]);
          setBgpImportVrfs([]);
          setBgpImportVpn(false);
          setBgpExportVpn(false);
        }

        // OSPF
        if (existingVRF.ospf && existingVRF.ospf.areas.length > 0) {
          setOspfEnabled(true);
          setOspfNetworks(
            existingVRF.ospf.areas.flatMap((area) =>
              area.networks.map((network) => ({ area: area.id, network }))
            )
          );
          setOspfRedistribute(existingVRF.ospf.redistribute);
        } else {
          setOspfEnabled(false);
          setOspfNetworks([]);
          setOspfRedistribute([]);
        }
      } else {
        // Reset form for new VRF
        setName("");
        setTable("");
        setDescription("");
        setBgpEnabled(false);
        setBgpAs("");
        setBgpRouterId("");
        setBgpNeighbors([]);
        setBgpRedistribute([]);
        setBgpImportVrfs([]);
        setBgpImportVpn(false);
        setBgpExportVpn(false);
        setOspfEnabled(false);
        setOspfNetworks([]);
        setOspfRedistribute([]);
      }
      setActiveTab("general");
    }
  }, [open, existingVRF]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Validation Error", "VRF name is required");
      return;
    }
    if (!table.trim()) {
      toast.error("Validation Error", "Routing table number is required");
      return;
    }

    const tableNum = parseInt(table);
    if (isNaN(tableNum) || tableNum < 1 || tableNum > 65535) {
      toast.error("Validation Error", "Table must be between 1 and 65535");
      return;
    }

    setLoading(true);
    try {
      const operations: VRFOperation[] = [];

      if (isEditing) {
        // Update description
        if (description !== (existingVRF?.description || "")) {
          if (description) {
            operations.push({ op: "set_vrf_description", name, value: description });
          } else if (existingVRF?.description) {
            operations.push({ op: "delete_vrf_description", name });
          }
        }

        // Handle BGP changes
        if (bgpEnabled && bgpAs) {
          // Set BGP AS
          if (bgpAs !== existingVRF?.bgp?.system_as) {
            operations.push({ op: "set_vrf_bgp_as", name, value: bgpAs });
          }
          // Set Router ID
          if (bgpRouterId && bgpRouterId !== existingVRF?.bgp?.router_id) {
            operations.push({ op: "set_vrf_bgp_router_id", name, value: bgpRouterId });
          }
          // Add new neighbors
          for (const neighbor of bgpNeighbors) {
            if (
              neighbor.address &&
              !existingVRF?.bgp?.neighbors.find((n) => n.address === neighbor.address)
            ) {
              operations.push({
                op: "add_vrf_bgp_neighbor",
                name,
                neighbor: neighbor.address,
                remote_as: neighbor.remoteAs ? parseInt(neighbor.remoteAs) : undefined,
              });
            }
          }
          // Delete removed neighbors
          for (const existingNeighbor of existingVRF?.bgp?.neighbors || []) {
            if (!bgpNeighbors.find((n) => n.address === existingNeighbor.address)) {
              operations.push({
                op: "delete_vrf_bgp_neighbor",
                name,
                neighbor: existingNeighbor.address,
              });
            }
          }
          // Handle import VRF changes
          for (const importVrf of bgpImportVrfs) {
            const existingAf = existingVRF?.bgp?.address_families.find(
              (a) => a.name === "ipv4-unicast"
            );
            if (!existingAf?.import_vrfs.includes(importVrf)) {
              operations.push({ op: "set_vrf_bgp_import_vrf", name, import_vrf: importVrf });
            }
          }
          // Handle VPN import/export
          if (bgpImportVpn && !existingVRF?.bgp?.address_families.some((a) => a.import_vpn)) {
            operations.push({ op: "enable_vrf_bgp_import_vpn", name });
          }
          if (bgpExportVpn && !existingVRF?.bgp?.address_families.some((a) => a.export_vpn)) {
            operations.push({ op: "enable_vrf_bgp_export_vpn", name });
          }
        } else if (!bgpEnabled && existingVRF?.bgp) {
          // Delete BGP
          operations.push({ op: "delete_vrf_bgp", name });
        }

        // Handle OSPF changes
        if (ospfEnabled) {
          for (const network of ospfNetworks) {
            if (network.area && network.network) {
              const existingArea = existingVRF?.ospf?.areas.find((a) => a.id === network.area);
              if (!existingArea?.networks.includes(network.network)) {
                operations.push({
                  op: "set_vrf_ospf_area_network",
                  name,
                  area: network.area,
                  network: network.network,
                });
              }
            }
          }
        } else if (!ospfEnabled && existingVRF?.ospf && existingVRF.ospf.areas.length > 0) {
          operations.push({ op: "delete_vrf_ospf", name });
        }
      } else {
        // Create new VRF
        operations.push({ op: "create_vrf", name, table: tableNum });
        if (description) {
          operations.push({ op: "set_vrf_description", name, value: description });
        }

        // BGP
        if (bgpEnabled && bgpAs) {
          operations.push({ op: "set_vrf_bgp_as", name, value: bgpAs });
          if (bgpRouterId) {
            operations.push({ op: "set_vrf_bgp_router_id", name, value: bgpRouterId });
          }
          for (const neighbor of bgpNeighbors) {
            if (neighbor.address) {
              operations.push({
                op: "add_vrf_bgp_neighbor",
                name,
                neighbor: neighbor.address,
                remote_as: neighbor.remoteAs ? parseInt(neighbor.remoteAs) : undefined,
              });
            }
          }
          for (const protocol of bgpRedistribute) {
            operations.push({ op: "add_vrf_bgp_redistribute", name, protocol });
          }
          for (const importVrf of bgpImportVrfs) {
            operations.push({ op: "set_vrf_bgp_import_vrf", name, import_vrf: importVrf });
          }
          if (bgpImportVpn) {
            operations.push({ op: "enable_vrf_bgp_import_vpn", name });
          }
          if (bgpExportVpn) {
            operations.push({ op: "enable_vrf_bgp_export_vpn", name });
          }
        }

        // OSPF
        if (ospfEnabled) {
          for (const network of ospfNetworks) {
            if (network.area && network.network) {
              operations.push({
                op: "set_vrf_ospf_area_network",
                name,
                area: network.area,
                network: network.network,
              });
            }
          }
          for (const protocol of ospfRedistribute) {
            operations.push({ op: "add_vrf_ospf_redistribute", name, protocol });
          }
        }
      }

      if (operations.length === 0) {
        toast.info("No Changes", "No changes to save");
        onOpenChange(false);
        return;
      }

      const result = await vrfService.batch(operations);

      if (result.success) {
        toast.success(
          isEditing ? "VRF Updated" : "VRF Created",
          `VRF "${name}" has been ${isEditing ? "updated" : "created"}`
        );
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error("Failed", result.error || "Operation failed");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const addBgpNeighbor = () => {
    setBgpNeighbors([...bgpNeighbors, { address: "", remoteAs: "" }]);
  };

  const removeBgpNeighbor = (index: number) => {
    setBgpNeighbors(bgpNeighbors.filter((_, i) => i !== index));
  };

  const addOspfNetwork = () => {
    setOspfNetworks([...ospfNetworks, { area: "0", network: "" }]);
  };

  const removeOspfNetwork = (index: number) => {
    setOspfNetworks(ospfNetworks.filter((_, i) => i !== index));
  };

  const otherVRFs = existingVRFs.filter((v) => v.name !== name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit VRF" : "Create VRF"}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="bgp">BGP</TabsTrigger>
            <TabsTrigger value="ospf">OSPF</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">VRF Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., MGMT, CUSTOMER1"
                  disabled={isEditing}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="table">Routing Table *</Label>
                <Input
                  id="table"
                  type="number"
                  value={table}
                  onChange={(e) => setTable(e.target.value)}
                  placeholder="e.g., 100"
                  min={1}
                  max={65535}
                  disabled={isEditing}
                />
                <p className="text-xs text-muted-foreground">
                  Unique routing table ID (1-65535)
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
            </div>
          </TabsContent>

          {/* BGP Tab */}
          <TabsContent value="bgp" className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="bgp-enabled"
                checked={bgpEnabled}
                onCheckedChange={(checked) => setBgpEnabled(!!checked)}
              />
              <Label htmlFor="bgp-enabled">Enable BGP for this VRF</Label>
            </div>

            {bgpEnabled && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bgp-as">AS Number *</Label>
                    <Input
                      id="bgp-as"
                      value={bgpAs}
                      onChange={(e) => setBgpAs(e.target.value)}
                      placeholder="e.g., 65001"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bgp-router-id">Router ID</Label>
                    <Input
                      id="bgp-router-id"
                      value={bgpRouterId}
                      onChange={(e) => setBgpRouterId(e.target.value)}
                      placeholder="e.g., 10.0.0.1"
                    />
                  </div>
                </div>

                {/* BGP Neighbors */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>BGP Neighbors</Label>
                    <Button variant="outline" size="sm" onClick={addBgpNeighbor}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  {bgpNeighbors.map((neighbor, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={neighbor.address}
                        onChange={(e) => {
                          const updated = [...bgpNeighbors];
                          updated[index].address = e.target.value;
                          setBgpNeighbors(updated);
                        }}
                        placeholder="Neighbor IP"
                        className="flex-1"
                      />
                      <Input
                        value={neighbor.remoteAs}
                        onChange={(e) => {
                          const updated = [...bgpNeighbors];
                          updated[index].remoteAs = e.target.value;
                          setBgpNeighbors(updated);
                        }}
                        placeholder="Remote AS"
                        className="w-28"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBgpNeighbor(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Route Leaking */}
                <div className="space-y-2">
                  <Label>Import from VRFs (Route Leaking)</Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value && !bgpImportVrfs.includes(value)) {
                        setBgpImportVrfs([...bgpImportVrfs, value]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select VRF to import from" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherVRFs.map((v) => (
                        <SelectItem key={v.name} value={v.name}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2">
                    {bgpImportVrfs.map((v) => (
                      <Badge
                        key={v}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() =>
                          setBgpImportVrfs(bgpImportVrfs.filter((x) => x !== v))
                        }
                      >
                        {v} &times;
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* VPN Import/Export */}
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="bgp-import-vpn"
                      checked={bgpImportVpn}
                      onCheckedChange={(checked) => setBgpImportVpn(!!checked)}
                    />
                    <Label htmlFor="bgp-import-vpn">Import from VPN</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="bgp-export-vpn"
                      checked={bgpExportVpn}
                      onCheckedChange={(checked) => setBgpExportVpn(!!checked)}
                    />
                    <Label htmlFor="bgp-export-vpn">Export to VPN</Label>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* OSPF Tab */}
          <TabsContent value="ospf" className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="ospf-enabled"
                checked={ospfEnabled}
                onCheckedChange={(checked) => setOspfEnabled(!!checked)}
              />
              <Label htmlFor="ospf-enabled">Enable OSPF for this VRF</Label>
            </div>

            {ospfEnabled && (
              <div className="space-y-4 pt-2">
                {/* OSPF Networks */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>OSPF Area Networks</Label>
                    <Button variant="outline" size="sm" onClick={addOspfNetwork}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  {ospfNetworks.map((network, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={network.area}
                        onChange={(e) => {
                          const updated = [...ospfNetworks];
                          updated[index].area = e.target.value;
                          setOspfNetworks(updated);
                        }}
                        placeholder="Area (e.g., 0)"
                        className="w-24"
                      />
                      <Input
                        value={network.network}
                        onChange={(e) => {
                          const updated = [...ospfNetworks];
                          updated[index].network = e.target.value;
                          setOspfNetworks(updated);
                        }}
                        placeholder="Network (e.g., 10.0.0.0/24)"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOspfNetwork(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Redistribution */}
                <div className="space-y-2">
                  <Label>Redistribute</Label>
                  <div className="flex flex-wrap gap-2">
                    {capabilities?.redistribute_protocols.map((p) => (
                      <Badge
                        key={p.value}
                        variant={
                          ospfRedistribute.includes(p.value) ? "default" : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => {
                          if (ospfRedistribute.includes(p.value)) {
                            setOspfRedistribute(
                              ospfRedistribute.filter((x) => x !== p.value)
                            );
                          } else {
                            setOspfRedistribute([...ospfRedistribute, p.value]);
                          }
                        }}
                      >
                        {p.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
