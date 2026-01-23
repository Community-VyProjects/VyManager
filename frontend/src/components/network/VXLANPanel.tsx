"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Plus,
  RefreshCw,
  MoreHorizontal,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Network,
  Layers,
  Cloud,
  Radio,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import {
  vxlanService,
  type VXLANInterface,
  type VXLANInterfacesConfig,
  type VXLANCapabilities,
} from "@/lib/api/vxlan";
import { VXLANModal } from "./VXLANModal";
import { VXLANDeleteConfirmModal } from "./VXLANDeleteConfirmModal";

function getModeFromInterface(iface: VXLANInterface): "unicast" | "multicast" | "evpn" {
  if (iface.external) return "evpn";
  if (iface.group) return "multicast";
  return "unicast";
}

function getModeLabel(mode: "unicast" | "multicast" | "evpn"): string {
  switch (mode) {
    case "evpn":
      return "EVPN";
    case "multicast":
      return "Multicast";
    default:
      return "Unicast";
  }
}

function getModeIcon(mode: "unicast" | "multicast" | "evpn") {
  switch (mode) {
    case "evpn":
      return Cloud;
    case "multicast":
      return Radio;
    default:
      return Network;
  }
}

function getModeVariant(mode: "unicast" | "multicast" | "evpn"): "default" | "secondary" | "outline" {
  switch (mode) {
    case "evpn":
      return "default";
    case "multicast":
      return "secondary";
    default:
      return "outline";
  }
}

export function VXLANPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<VXLANInterfacesConfig | null>(null);
  const [capabilities, setCapabilities] = useState<VXLANCapabilities | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInterface, setEditingInterface] = useState<VXLANInterface | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingInterface, setDeletingInterface] = useState<VXLANInterface | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configData, capsData] = await Promise.all([
        vxlanService.getConfig(),
        vxlanService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as { message?: string })?.message || "Unknown error";
      toast.error("Failed to load VXLAN configuration", errorMessage);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = () => {
    setEditingInterface(null);
    setModalOpen(true);
  };

  const handleEdit = (iface: VXLANInterface) => {
    setEditingInterface(iface);
    setModalOpen(true);
  };

  const handleDelete = (iface: VXLANInterface) => {
    setDeletingInterface(iface);
    setDeleteModalOpen(true);
  };

  const handleToggleEnabled = async (iface: VXLANInterface) => {
    try {
      const result = await vxlanService.setEnabled(iface.name, iface.disable);
      if (result.success) {
        toast.success(
          iface.disable ? "Interface Enabled" : "Interface Disabled",
          `${iface.name} has been ${iface.disable ? "enabled" : "disabled"}`
        );
        loadData();
      } else {
        toast.error("Failed", result.error || "Failed to toggle interface");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as { message?: string })?.message || "Operation failed";
      toast.error("Error", errorMessage);
    }
  };

  const confirmDelete = async () => {
    if (!deletingInterface) return;
    try {
      const result = await vxlanService.deleteInterface(deletingInterface.name);
      if (result.success) {
        toast.success("Interface Deleted", `${deletingInterface.name} has been deleted`);
        loadData();
      } else {
        toast.error("Failed", result.error || "Failed to delete interface");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as { message?: string })?.message || "Operation failed";
      toast.error("Error", errorMessage);
    }
  };

  // Filter interfaces by tab
  const getFilteredInterfaces = () => {
    if (!config) return [];
    if (activeTab === "all") return config.interfaces;
    return config.interfaces.filter((iface) => getModeFromInterface(iface) === activeTab);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredInterfaces = getFilteredInterfaces();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">VXLAN / EVPN</h2>
          <p className="text-muted-foreground">
            Manage VXLAN overlay network interfaces
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create VXLAN
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interfaces</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{config?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unicast</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{config?.by_mode?.unicast || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Multicast</CardTitle>
            <Radio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{config?.by_mode?.multicast || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">EVPN</CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{config?.by_mode?.evpn || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({config?.total || 0})</TabsTrigger>
          <TabsTrigger value="unicast">Unicast ({config?.by_mode?.unicast || 0})</TabsTrigger>
          <TabsTrigger value="multicast">Multicast ({config?.by_mode?.multicast || 0})</TabsTrigger>
          <TabsTrigger value="evpn">EVPN ({config?.by_mode?.evpn || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredInterfaces.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No VXLAN Interfaces</h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === "all"
                    ? "Create your first VXLAN interface to get started."
                    : `No ${getModeLabel(activeTab as "unicast" | "multicast" | "evpn")} VXLAN interfaces configured.`}
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create VXLAN Interface
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>VNI</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Remote/Group</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInterfaces.map((iface) => {
                    const mode = getModeFromInterface(iface);
                    const ModeIcon = getModeIcon(mode);
                    return (
                      <TableRow key={iface.name}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{iface.name}</span>
                            {iface.description && (
                              <span className="text-xs text-muted-foreground">
                                {iface.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getModeVariant(mode)} className="gap-1">
                            <ModeIcon className="h-3 w-3" />
                            {getModeLabel(mode)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {iface.vni || (
                            <span className="text-muted-foreground">SVD</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {iface.source_address || iface.source_interface || "-"}
                        </TableCell>
                        <TableCell>
                          {iface.remote || iface.group || (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>{iface.port || "8472"}</TableCell>
                        <TableCell>
                          {iface.disable ? (
                            <Badge variant="secondary">Disabled</Badge>
                          ) : (
                            <Badge variant="default">Enabled</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(iface)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleEnabled(iface)}>
                                {iface.disable ? (
                                  <>
                                    <Power className="h-4 w-4 mr-2" />
                                    Enable
                                  </>
                                ) : (
                                  <>
                                    <PowerOff className="h-4 w-4 mr-2" />
                                    Disable
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(iface)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* VLAN-to-VNI Mappings for SVD interfaces */}
      {config?.interfaces.some((i) => i.vlan_to_vni.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">VLAN-to-VNI Mappings (SVD)</CardTitle>
            <CardDescription>
              Single VXLAN Device mappings for EVPN multi-tenancy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Interface</TableHead>
                  <TableHead>VLAN ID</TableHead>
                  <TableHead>VNI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {config?.interfaces
                  .filter((i) => i.vlan_to_vni.length > 0)
                  .flatMap((iface) =>
                    iface.vlan_to_vni.map((mapping, idx) => (
                      <TableRow key={`${iface.name}-${mapping.vlan}-${idx}`}>
                        <TableCell className="font-medium">{iface.name}</TableCell>
                        <TableCell>{mapping.vlan}</TableCell>
                        <TableCell>{mapping.vni}</TableCell>
                      </TableRow>
                    ))
                  )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* EVPN Features Info */}
      {capabilities && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">EVPN Features</CardTitle>
            <CardDescription>
              Available features for BGP L2VPN/EVPN control plane
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {capabilities.evpn_features.map((feature) => (
                <Badge key={feature} variant="outline">
                  {feature}
                </Badge>
              ))}
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p>
                <strong>Default Port:</strong> {capabilities.default_port} |{" "}
                <strong>Standard Port:</strong> {capabilities.standard_port}
              </p>
              <p className="mt-1">
                VyOS uses port 8472 by default. For multi-vendor environments, use
                the IANA-assigned standard port 4789.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <VXLANModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={loadData}
        editingInterface={editingInterface}
        capabilities={capabilities}
      />

      {deletingInterface && (
        <VXLANDeleteConfirmModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          onConfirm={confirmDelete}
          interfaceName={deletingInterface.name}
          mode={getModeLabel(getModeFromInterface(deletingInterface))}
        />
      )}
    </div>
  );
}
