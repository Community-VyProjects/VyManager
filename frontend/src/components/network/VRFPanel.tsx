"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  RefreshCw,
  Plus,
  Layers,
  Network,
  Route,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  AlertCircle,
  Settings,
  Globe,
  Router,
  ExternalLink,
  Workflow,
} from "lucide-react";
import {
  vrfService,
  type VRFConfigResponse,
  type VRF,
  type VRFCapabilities,
} from "@/lib/api/vrf";
import { useToast } from "@/hooks/useToast";
import { VRFModal } from "./VRFModal";
import { VRFInterfaceModal } from "./VRFInterfaceModal";
import { VRFRouteModal } from "./VRFRouteModal";
import { VRFDeleteConfirmModal } from "./VRFDeleteConfirmModal";

export function VRFPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [config, setConfig] = useState<VRFConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<VRFCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [vrfModalOpen, setVrfModalOpen] = useState(false);
  const [interfaceModalOpen, setInterfaceModalOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [editingVRF, setEditingVRF] = useState<VRF | null>(null);
  const [selectedVRF, setSelectedVRF] = useState<VRF | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VRF | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      setRefreshing(true);

      const [configResult, capsResult] = await Promise.allSettled([
        vrfService.getConfig(),
        vrfService.getCapabilities(),
      ]);

      if (configResult.status === "fulfilled") {
        setConfig(configResult.value);
      } else {
        throw new Error("Failed to load VRF config");
      }

      if (capsResult.status === "fulfilled") {
        setCapabilities(capsResult.value);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load VRF data";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleVRF = async (vrf: VRF) => {
    try {
      const action = vrf.disable ? "enable" : "disable";
      const response = await vrfService.setVRFEnabled(vrf.name, vrf.disable);

      if (response.success) {
        toast.success("Success", `VRF "${vrf.name}" ${action}d`);
        loadData();
      } else {
        toast.error("Failed", response.error || `Failed to ${action} VRF`);
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Operation failed");
    }
  };

  const handleToggleBindToAll = async () => {
    try {
      const newValue = !config?.bind_to_all;
      const response = await vrfService.setBindToAll(newValue);

      if (response.success) {
        toast.success("Success", `Bind-to-all ${newValue ? "enabled" : "disabled"}`);
        loadData();
      } else {
        toast.error("Failed", response.error || "Failed to update bind-to-all setting");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Operation failed");
    }
  };

  // Calculate statistics
  const totalVRFs = config?.vrfs.length || 0;
  const activeVRFs = config?.vrfs.filter((v) => !v.disable).length || 0;
  const totalInterfaces = config?.vrfs.reduce((sum, v) => sum + v.interfaces.length, 0) || 0;
  const totalRoutes = config?.vrfs.reduce(
    (sum, v) => sum + v.static_routes_ipv4.length + v.static_routes_ipv6.length,
    0
  ) || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Failed to load VRF configuration</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={loadData} className="mt-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">VRF Management</h2>
          <p className="text-muted-foreground">
            Configure Virtual Routing and Forwarding instances for network isolation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Global VRF Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Bind to All</p>
              <p className="text-sm text-muted-foreground">
                Enable binding services to all VRFs automatically
              </p>
            </div>
            <Switch
              checked={config?.bind_to_all || false}
              onCheckedChange={handleToggleBindToAll}
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalVRFs}</p>
                <p className="text-xs text-muted-foreground">Total VRFs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Power className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeVRFs}</p>
                <p className="text-xs text-muted-foreground">Active VRFs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Network className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalInterfaces}</p>
                <p className="text-xs text-muted-foreground">Assigned Interfaces</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <Route className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRoutes}</p>
                <p className="text-xs text-muted-foreground">Static Routes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VRF List */}
      <Tabs defaultValue="vrfs" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vrfs" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            VRF Instances ({totalVRFs})
          </TabsTrigger>
          <TabsTrigger value="routes" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            All Routes ({totalRoutes})
          </TabsTrigger>
        </TabsList>

        {/* VRFs Tab */}
        <TabsContent value="vrfs" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setVrfModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create VRF
            </Button>
          </div>

          {totalVRFs === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-2 text-center">
                  <Layers className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No VRF instances configured</p>
                  <p className="text-sm text-muted-foreground">
                    Create a VRF to isolate routing tables
                  </p>
                  <Button variant="outline" onClick={() => setVrfModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create VRF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {config?.vrfs.map((vrf) => (
                <VRFCard
                  key={vrf.name}
                  vrf={vrf}
                  allVRFs={config.vrfs}
                  onEdit={() => {
                    setEditingVRF(vrf);
                    setVrfModalOpen(true);
                  }}
                  onDelete={() => setDeleteTarget(vrf)}
                  onToggle={() => handleToggleVRF(vrf)}
                  onAddInterface={() => {
                    setSelectedVRF(vrf);
                    setInterfaceModalOpen(true);
                  }}
                  onAddRoute={() => {
                    setSelectedVRF(vrf);
                    setRouteModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Routes Tab */}
        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {totalRoutes === 0 ? (
                <div className="py-8 text-center">
                  <Route className="h-12 w-12 mx-auto text-muted-foreground/30" />
                  <p className="text-muted-foreground mt-2">No static routes configured</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>VRF</TableHead>
                        <TableHead>Network</TableHead>
                        <TableHead>Next Hop</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Distance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {config?.vrfs.flatMap((vrf) => [
                        ...vrf.static_routes_ipv4.map((route) => (
                          <TableRow key={`${vrf.name}-${route.network}-ipv4`}>
                            <TableCell>
                              <Badge variant="outline">{vrf.name}</Badge>
                            </TableCell>
                            <TableCell className="font-mono">{route.network}</TableCell>
                            <TableCell className="font-mono">
                              {route.blackhole ? (
                                <Badge variant="secondary">Blackhole</Badge>
                              ) : route.next_hops.length > 0 ? (
                                route.next_hops.map((nh) => nh.address).join(", ")
                              ) : route.interfaces.length > 0 ? (
                                route.interfaces.join(", ")
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-500/10">
                                IPv4
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {route.next_hops[0]?.distance || "-"}
                            </TableCell>
                          </TableRow>
                        )),
                        ...vrf.static_routes_ipv6.map((route) => (
                          <TableRow key={`${vrf.name}-${route.network}-ipv6`}>
                            <TableCell>
                              <Badge variant="outline">{vrf.name}</Badge>
                            </TableCell>
                            <TableCell className="font-mono">{route.network}</TableCell>
                            <TableCell className="font-mono">
                              {route.blackhole ? (
                                <Badge variant="secondary">Blackhole</Badge>
                              ) : route.next_hops.length > 0 ? (
                                route.next_hops.map((nh) => nh.address).join(", ")
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-purple-500/10">
                                IPv6
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {route.next_hops[0]?.distance || "-"}
                            </TableCell>
                          </TableRow>
                        )),
                      ])}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <VRFModal
        open={vrfModalOpen}
        onOpenChange={(open) => {
          setVrfModalOpen(open);
          if (!open) setEditingVRF(null);
        }}
        onSuccess={loadData}
        capabilities={capabilities}
        existingVRF={editingVRF}
        existingVRFs={config?.vrfs || []}
      />

      <VRFInterfaceModal
        open={interfaceModalOpen}
        onOpenChange={(open) => {
          setInterfaceModalOpen(open);
          if (!open) setSelectedVRF(null);
        }}
        onSuccess={loadData}
        vrf={selectedVRF}
      />

      <VRFRouteModal
        open={routeModalOpen}
        onOpenChange={(open) => {
          setRouteModalOpen(open);
          if (!open) setSelectedVRF(null);
        }}
        onSuccess={loadData}
        vrf={selectedVRF}
      />

      {deleteTarget && (
        <VRFDeleteConfirmModal
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          onSuccess={() => {
            setDeleteTarget(null);
            loadData();
          }}
          vrf={deleteTarget}
        />
      )}
    </div>
  );
}

// VRF Card Component
interface VRFCardProps {
  vrf: VRF;
  allVRFs: VRF[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onAddInterface: () => void;
  onAddRoute: () => void;
}

function VRFCard({
  vrf,
  allVRFs,
  onEdit,
  onDelete,
  onToggle,
  onAddInterface,
  onAddRoute,
}: VRFCardProps) {
  const hasRouteLeaking = vrf.bgp?.address_families.some(
    (af) => af.import_vrfs.length > 0 || af.import_vpn || af.export_vpn
  );

  return (
    <Card className={`border ${vrf.disable ? "opacity-60" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <code className="font-mono">{vrf.name}</code>
                <Badge variant="outline" className="font-mono text-xs">
                  Table {vrf.table}
                </Badge>
                {vrf.disable ? (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                    Disabled
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    Enabled
                  </Badge>
                )}
              </CardTitle>
              {vrf.description && <CardDescription>{vrf.description}</CardDescription>}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onToggle}>
              {vrf.disable ? (
                <Power className="h-4 w-4 text-green-500" />
              ) : (
                <PowerOff className="h-4 w-4 text-red-500" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{vrf.interfaces.length}</p>
            <p className="text-xs text-muted-foreground">Interfaces</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{vrf.static_routes_ipv4.length}</p>
            <p className="text-xs text-muted-foreground">IPv4 Routes</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{vrf.static_routes_ipv6.length}</p>
            <p className="text-xs text-muted-foreground">IPv6 Routes</p>
          </div>
        </div>

        {/* Interfaces */}
        {vrf.interfaces.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Network className="h-4 w-4" />
              Assigned Interfaces
            </p>
            <div className="flex flex-wrap gap-2">
              {vrf.interfaces.map((iface) => (
                <Badge key={iface} variant="secondary" className="font-mono">
                  {iface}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Protocols */}
        <div className="flex flex-wrap gap-2">
          {vrf.bgp && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
              <Router className="h-3 w-3 mr-1" />
              BGP AS {vrf.bgp.system_as}
            </Badge>
          )}
          {vrf.ospf && vrf.ospf.areas.length > 0 && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              <Workflow className="h-3 w-3 mr-1" />
              OSPF ({vrf.ospf.areas.length} areas)
            </Badge>
          )}
          {hasRouteLeaking && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
              <ExternalLink className="h-3 w-3 mr-1" />
              Route Leaking
            </Badge>
          )}
          {vrf.bgp?.address_families.some((af) => af.import_vpn || af.export_vpn) && (
            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
              <Globe className="h-3 w-3 mr-1" />
              VPN Import/Export
            </Badge>
          )}
        </div>

        {/* Route Leaking Info */}
        {vrf.bgp?.address_families.some((af) => af.import_vrfs.length > 0) && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Importing from: </span>
            {vrf.bgp.address_families
              .flatMap((af) => af.import_vrfs)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(", ")}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onAddInterface}>
            <Network className="h-4 w-4 mr-2" />
            Assign Interface
          </Button>
          <Button variant="outline" size="sm" onClick={onAddRoute}>
            <Route className="h-4 w-4 mr-2" />
            Add Route
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
