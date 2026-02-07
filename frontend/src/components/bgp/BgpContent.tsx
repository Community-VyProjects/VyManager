"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Network,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Users,
  Globe,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  bgpService,
  BgpConfig,
  BgpCapabilities,
  BgpNeighbor,
  BgpPeerGroup,
  BgpAddressFamily,
  BgpParameters,
} from "@/lib/api/bgp";
import { routeMapService } from "@/lib/api/route-map";
import { BgpNeighborModal } from "./BgpNeighborModal";
import { BgpPeerGroupModal } from "./BgpPeerGroupModal";
import { DeleteBgpNeighborModal } from "./DeleteBgpNeighborModal";
import { DeleteBgpPeerGroupModal } from "./DeleteBgpPeerGroupModal";

export function BgpContent() {
  const [config, setConfig] = useState<BgpConfig | null>(null);
  const [capabilities, setCapabilities] = useState<BgpCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Neighbor modal state
  const [neighborModalOpen, setNeighborModalOpen] = useState(false);
  const [editingNeighbor, setEditingNeighbor] = useState<BgpNeighbor | null>(null);
  const [deletingNeighbor, setDeletingNeighbor] = useState<string | null>(null);

  // Peer group modal state
  const [peerGroupModalOpen, setPeerGroupModalOpen] = useState(false);
  const [editingPeerGroup, setEditingPeerGroup] = useState<BgpPeerGroup | null>(null);
  const [deletingPeerGroup, setDeletingPeerGroup] = useState<{ name: string; members: number } | null>(null);

  // Overview edit state
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [overviewSaving, setOverviewSaving] = useState(false);
  const [systemAs, setSystemAs] = useState("");
  const [routerId, setRouterId] = useState("");
  const [keepalive, setKeepalive] = useState("");
  const [holdtime, setHoldtime] = useState("");
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Address Family state
  const [selectedAfi, setSelectedAfi] = useState<string>("");
  const [afNetworkPrefix, setAfNetworkPrefix] = useState("");
  const [afNetworkRouteMap, setAfNetworkRouteMap] = useState("");
  const [afRedistProto, setAfRedistProto] = useState("");
  const [afRedistRouteMap, setAfRedistRouteMap] = useState("");
  const [afRedistMetric, setAfRedistMetric] = useState("");
  const [afAggPrefix, setAfAggPrefix] = useState("");
  const [afAggAsSet, setAfAggAsSet] = useState(false);
  const [afAggSummaryOnly, setAfAggSummaryOnly] = useState(false);
  const [afAggRouteMap, setAfAggRouteMap] = useState("");
  const [afSaving, setAfSaving] = useState(false);
  const [afError, setAfError] = useState<string | null>(null);

  // Route-map names for dropdowns
  const [routeMapNames, setRouteMapNames] = useState<string[]>([]);

  // Parameters state
  const [paramsEditing, setParamsEditing] = useState(false);
  const [paramsSaving, setParamsSaving] = useState(false);
  const [paramsError, setParamsError] = useState<string | null>(null);
  const [editParams, setEditParams] = useState<BgpParameters | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData, rmConfig] = await Promise.all([
        bgpService.getConfig(refresh),
        bgpService.getCapabilities(),
        routeMapService.getConfig(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
      setRouteMapNames(rmConfig.route_maps.map((rm) => rm.name));
      // Initialize overview fields
      setSystemAs(configData.system_as || "");
      setRouterId(configData.parameters.router_id || "");
      setKeepalive(configData.timers.keepalive?.toString() || "");
      setHoldtime(configData.timers.holdtime?.toString() || "");
      // Initialize selected AFI
      if (!selectedAfi && capData.address_family_types.global.length > 0) {
        setSelectedAfi(capData.address_family_types.global[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load BGP configuration");
    } finally {
      setLoading(false);
    }
  }, [selectedAfi]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stats
  const neighborCount = config?.neighbors.length ?? 0;
  const activeNeighbors = config?.neighbors.filter((n) => !n.shutdown).length ?? 0;
  const peerGroupCount = config?.peer_groups.length ?? 0;
  const afCount = config?.address_families.length ?? 0;

  // ==========================================================================
  // Overview handlers
  // ==========================================================================

  const handleOverviewSave = async () => {
    if (!config) return;
    setOverviewSaving(true);
    setOverviewError(null);
    try {
      const result = await bgpService.saveOverview(config, systemAs, routerId, keepalive, holdtime);
      if (!result.success) throw new Error(result.error || "Failed to save");
      await loadData(true);
      setOverviewEditing(false);
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : "Failed to save overview");
    } finally {
      setOverviewSaving(false);
    }
  };

  const handleOverviewCancel = () => {
    if (config) {
      setSystemAs(config.system_as || "");
      setRouterId(config.parameters.router_id || "");
      setKeepalive(config.timers.keepalive?.toString() || "");
      setHoldtime(config.timers.holdtime?.toString() || "");
    }
    setOverviewEditing(false);
    setOverviewError(null);
  };

  // ==========================================================================
  // Neighbor handlers
  // ==========================================================================

  const handleCreateNeighbor = async (neighbor: BgpNeighbor) => {
    await bgpService.createNeighbor(neighbor);
    await loadData(true);
  };

  const handleUpdateNeighbor = async (neighbor: BgpNeighbor) => {
    if (!editingNeighbor) return;
    await bgpService.updateNeighbor(editingNeighbor, neighbor);
    setEditingNeighbor(null);
    await loadData(true);
  };

  const handleDeleteNeighbor = async () => {
    if (!deletingNeighbor) return;
    await bgpService.deleteNeighbor(deletingNeighbor);
    setDeletingNeighbor(null);
    await loadData(true);
  };

  // ==========================================================================
  // Peer Group handlers
  // ==========================================================================

  const handleCreatePeerGroup = async (pg: BgpPeerGroup) => {
    await bgpService.createPeerGroup(pg);
    await loadData(true);
  };

  const handleUpdatePeerGroup = async (pg: BgpPeerGroup) => {
    if (!editingPeerGroup) return;
    await bgpService.updatePeerGroup(editingPeerGroup, pg);
    setEditingPeerGroup(null);
    await loadData(true);
  };

  const handleDeletePeerGroup = async () => {
    if (!deletingPeerGroup) return;
    await bgpService.deletePeerGroup(deletingPeerGroup.name);
    setDeletingPeerGroup(null);
    await loadData(true);
  };

  // ==========================================================================
  // Address Family handlers
  // ==========================================================================

  const currentAf: BgpAddressFamily | undefined = config?.address_families.find(
    (af) => af.afi === selectedAfi
  );

  const handleAddNetwork = async () => {
    if (!afNetworkPrefix.trim()) return;
    setAfSaving(true);
    setAfError(null);
    try {
      await bgpService.addNetwork(selectedAfi, afNetworkPrefix.trim(), afNetworkRouteMap.trim() || undefined);
      setAfNetworkPrefix("");
      setAfNetworkRouteMap("");
      await loadData(true);
    } catch (err) {
      setAfError(err instanceof Error ? err.message : "Failed to add network");
    } finally {
      setAfSaving(false);
    }
  };

  const handleDeleteNetwork = async (prefix: string) => {
    setAfSaving(true);
    setAfError(null);
    try {
      await bgpService.deleteNetwork(selectedAfi, prefix);
      await loadData(true);
    } catch (err) {
      setAfError(err instanceof Error ? err.message : "Failed to delete network");
    } finally {
      setAfSaving(false);
    }
  };

  const handleAddRedistribute = async () => {
    if (!afRedistProto) return;
    setAfSaving(true);
    setAfError(null);
    try {
      await bgpService.addRedistribute(selectedAfi, afRedistProto, afRedistRouteMap.trim() || undefined, afRedistMetric.trim() || undefined);
      setAfRedistProto("");
      setAfRedistRouteMap("");
      setAfRedistMetric("");
      await loadData(true);
    } catch (err) {
      setAfError(err instanceof Error ? err.message : "Failed to add redistribution");
    } finally {
      setAfSaving(false);
    }
  };

  const handleDeleteRedistribute = async (protocol: string) => {
    setAfSaving(true);
    setAfError(null);
    try {
      await bgpService.deleteRedistribute(selectedAfi, protocol);
      await loadData(true);
    } catch (err) {
      setAfError(err instanceof Error ? err.message : "Failed to delete redistribution");
    } finally {
      setAfSaving(false);
    }
  };

  const handleAddAggregate = async () => {
    if (!afAggPrefix.trim()) return;
    setAfSaving(true);
    setAfError(null);
    try {
      await bgpService.addAggregateAddress(selectedAfi, afAggPrefix.trim(), afAggAsSet, afAggSummaryOnly, afAggRouteMap.trim() || undefined);
      setAfAggPrefix("");
      setAfAggAsSet(false);
      setAfAggSummaryOnly(false);
      setAfAggRouteMap("");
      await loadData(true);
    } catch (err) {
      setAfError(err instanceof Error ? err.message : "Failed to add aggregate");
    } finally {
      setAfSaving(false);
    }
  };

  const handleDeleteAggregate = async (prefix: string) => {
    setAfSaving(true);
    setAfError(null);
    try {
      await bgpService.deleteAggregateAddress(selectedAfi, prefix);
      await loadData(true);
    } catch (err) {
      setAfError(err instanceof Error ? err.message : "Failed to delete aggregate");
    } finally {
      setAfSaving(false);
    }
  };

  // ==========================================================================
  // Parameters handlers
  // ==========================================================================

  const handleParamsEdit = () => {
    if (config) {
      setEditParams(JSON.parse(JSON.stringify(config.parameters)));
      setParamsEditing(true);
      setParamsError(null);
    }
  };

  const handleParamsSave = async () => {
    if (!config || !editParams) return;
    setParamsSaving(true);
    setParamsError(null);
    try {
      const result = await bgpService.saveParameters(config.parameters, editParams);
      if (!result.success) throw new Error(result.error || "Failed to save");
      await loadData(true);
      setParamsEditing(false);
    } catch (err) {
      setParamsError(err instanceof Error ? err.message : "Failed to save parameters");
    } finally {
      setParamsSaving(false);
    }
  };

  const handleParamsCancel = () => {
    setParamsEditing(false);
    setEditParams(null);
    setParamsError(null);
  };

  const updateParam = <K extends keyof BgpParameters>(key: K, value: BgpParameters[K]) => {
    if (!editParams) return;
    setEditParams({ ...editParams, [key]: value });
  };

  // ==========================================================================
  // Helpers
  // ==========================================================================

  const getMembersOfPeerGroup = (pgName: string): number => {
    return config?.neighbors.filter((n) => n.peer_group === pgName).length ?? 0;
  };

  const formatAfi = (afi: string): string => {
    return afi.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const redistributeProtocols = [
    "connected", "kernel", "ospf", "rip", "static", "babel", "isis", "table",
  ];

  // ==========================================================================
  // Render
  // ==========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => loadData()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">BGP</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Border Gateway Protocol - autonomous system routing
                {config?.system_as && (
                  <span className="ml-2 font-mono text-foreground">AS {config.system_as}</span>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{neighborCount}</p>
                    <p className="text-xs text-muted-foreground">Neighbors</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-green-500/10">
                    <Network className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeNeighbors}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-blue-500/10">
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{peerGroupCount}</p>
                    <p className="text-xs text-muted-foreground">Peer Groups</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-orange-500/10">
                    <Globe className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{afCount}</p>
                    <p className="text-xs text-muted-foreground">Address Families</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs Content */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="neighbors">
                Neighbors
                {neighborCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{neighborCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="peer-groups">
                Peer Groups
                {peerGroupCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{peerGroupCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="address-families">
                Address Families
                {afCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{afCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* Overview Tab */}
            {/* ============================================================ */}
            <TabsContent value="overview">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Core BGP settings for this router
                  </p>
                  {!overviewEditing ? (
                    <Button size="sm" variant="outline" onClick={() => setOverviewEditing(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleOverviewCancel} disabled={overviewSaving}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleOverviewSave} disabled={overviewSaving}>
                        {overviewSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                  )}
                </div>

                {overviewError && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {overviewError}
                  </div>
                )}

                <Card>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>System AS Number</Label>
                        {overviewEditing ? (
                          <Input
                            value={systemAs}
                            onChange={(e) => setSystemAs(e.target.value)}
                            placeholder="e.g. 65001"
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.system_as || <span className="text-muted-foreground">Not configured</span>}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          The autonomous system number for this BGP router
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Router ID</Label>
                        {overviewEditing ? (
                          <Input
                            value={routerId}
                            onChange={(e) => setRouterId(e.target.value)}
                            placeholder="e.g. 10.0.0.1"
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.parameters.router_id || <span className="text-muted-foreground">Auto-detect</span>}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Override the default router identifier
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Keepalive Interval (seconds)</Label>
                        {overviewEditing ? (
                          <Input
                            type="number"
                            value={keepalive}
                            onChange={(e) => setKeepalive(e.target.value)}
                            placeholder="60"
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.timers.keepalive ?? <span className="text-muted-foreground">60 (default)</span>}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          How often to send keepalive messages to peers
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Hold Time (seconds)</Label>
                        {overviewEditing ? (
                          <Input
                            type="number"
                            value={holdtime}
                            onChange={(e) => setHoldtime(e.target.value)}
                            placeholder="180"
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.timers.holdtime ?? <span className="text-muted-foreground">180 (default)</span>}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Time to wait for keepalive before declaring peer dead
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Listen Ranges */}
                {config?.listen && (config.listen.limit || config.listen.ranges.length > 0) && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-sm font-medium mb-4">Dynamic Neighbors (Listen)</h3>
                      {config.listen.limit && (
                        <p className="text-sm text-muted-foreground mb-3">
                          Connection limit: <span className="font-mono">{config.listen.limit}</span>
                        </p>
                      )}
                      {config.listen.ranges.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Prefix</TableHead>
                              <TableHead>Peer Group</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {config.listen.ranges.map((r) => (
                              <TableRow key={r.prefix}>
                                <TableCell className="font-mono">{r.prefix}</TableCell>
                                <TableCell>{r.peer_group || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* Neighbors Tab */}
            {/* ============================================================ */}
            <TabsContent value="neighbors">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Configure BGP peering sessions with remote routers
                </p>
                <Button size="sm" onClick={() => { setEditingNeighbor(null); setNeighborModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Neighbor
                </Button>
              </div>

              {neighborCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">No BGP neighbors configured</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Add a neighbor to establish a BGP peering session
                    </p>
                    <Button size="sm" onClick={() => { setEditingNeighbor(null); setNeighborModalOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Neighbor
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Address</TableHead>
                          <TableHead>Remote AS</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Peer Group</TableHead>
                          <TableHead>BFD</TableHead>
                          <TableHead>Address Families</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.neighbors.map((neighbor) => (
                          <TableRow key={neighbor.address}>
                            <TableCell className="font-medium font-mono">
                              {neighbor.address}
                            </TableCell>
                            <TableCell className="font-mono">
                              {neighbor.remote_as || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {neighbor.description || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell>
                              {neighbor.shutdown ? (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                                  Shutdown
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                  Active
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {neighbor.peer_group ? (
                                <Badge variant="secondary">{neighbor.peer_group}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {neighbor.bfd.enabled ? (
                                <Badge variant="outline" className="text-xs">BFD</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {Object.keys(neighbor.address_families).length > 0 ? (
                                  Object.keys(neighbor.address_families).map((afi) => (
                                    <Badge key={afi} variant="outline" className="text-xs">
                                      {afi.replace(/_/g, " ")}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setEditingNeighbor(neighbor);
                                    setNeighborModalOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeletingNeighbor(neighbor.address)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* Peer Groups Tab */}
            {/* ============================================================ */}
            <TabsContent value="peer-groups">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Templates that apply common settings to multiple neighbors
                </p>
                <Button size="sm" onClick={() => { setEditingPeerGroup(null); setPeerGroupModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Peer Group
                </Button>
              </div>

              {peerGroupCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">No peer groups configured</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Create a peer group to apply shared settings to multiple neighbors
                    </p>
                    <Button size="sm" onClick={() => { setEditingPeerGroup(null); setPeerGroupModalOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Peer Group
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Remote AS</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>BFD</TableHead>
                          <TableHead>Members</TableHead>
                          <TableHead>Address Families</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.peer_groups.map((pg) => {
                          const memberCount = getMembersOfPeerGroup(pg.name);
                          return (
                            <TableRow key={pg.name}>
                              <TableCell className="font-medium font-mono">{pg.name}</TableCell>
                              <TableCell className="font-mono">
                                {pg.remote_as || <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {pg.description || <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell>
                                {pg.shutdown ? (
                                  <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                                    Shutdown
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                    Active
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {pg.bfd.enabled ? (
                                  <Badge variant="outline" className="text-xs">BFD</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {memberCount > 0 ? (
                                  <Badge variant="secondary">
                                    {memberCount} neighbor{memberCount !== 1 ? "s" : ""}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">None</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {Object.keys(pg.address_families).length > 0 ? (
                                    Object.keys(pg.address_families).map((afi) => (
                                      <Badge key={afi} variant="outline" className="text-xs">
                                        {afi.replace(/_/g, " ")}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEditingPeerGroup(pg);
                                      setPeerGroupModalOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeletingPeerGroup({ name: pg.name, members: memberCount })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* Address Families Tab */}
            {/* ============================================================ */}
            <TabsContent value="address-families">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Global address family settings for networks, redistribution, and aggregation
                  </p>
                  <Select value={selectedAfi} onValueChange={setSelectedAfi}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Select address family" />
                    </SelectTrigger>
                    <SelectContent>
                      {capabilities?.address_family_types.global.map((afi) => (
                        <SelectItem key={afi} value={afi}>
                          {formatAfi(afi)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {afError && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {afError}
                  </div>
                )}

                {selectedAfi && (
                  <div className="space-y-6">
                    {/* Networks */}
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-sm font-medium mb-4">Networks</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          Prefixes to originate from this BGP router
                        </p>

                        {currentAf && currentAf.networks.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Prefix</TableHead>
                                <TableHead>Route Map</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentAf.networks.map((net) => (
                                <TableRow key={net.prefix}>
                                  <TableCell className="font-mono">{net.prefix}</TableCell>
                                  <TableCell>{net.route_map || <span className="text-muted-foreground">-</span>}</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteNetwork(net.prefix)}
                                      disabled={afSaving}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}

                        <div className="flex items-end gap-3 mt-4">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Prefix</Label>
                            <Input
                              value={afNetworkPrefix}
                              onChange={(e) => setAfNetworkPrefix(e.target.value)}
                              placeholder="e.g. 10.0.0.0/24"
                              className="h-9"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Route Map (optional)</Label>
                            <Select value={afNetworkRouteMap || "__none__"} onValueChange={(v) => setAfNetworkRouteMap(v === "__none__" ? "" : v)}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {routeMapNames.map((name) => (
                                  <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button size="sm" onClick={handleAddNetwork} disabled={afSaving || !afNetworkPrefix.trim()}>
                            {afSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                            Add
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Redistribute */}
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-sm font-medium mb-4">Redistribute</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          Redistribute routes from other protocols into BGP
                        </p>

                        {currentAf && currentAf.redistribute.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Protocol</TableHead>
                                <TableHead>Route Map</TableHead>
                                <TableHead>Metric</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentAf.redistribute.map((rd) => (
                                <TableRow key={rd.protocol}>
                                  <TableCell className="font-mono">{rd.protocol}</TableCell>
                                  <TableCell>{rd.route_map || <span className="text-muted-foreground">-</span>}</TableCell>
                                  <TableCell className="font-mono">{rd.metric || <span className="text-muted-foreground">-</span>}</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteRedistribute(rd.protocol)}
                                      disabled={afSaving}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}

                        <div className="flex items-end gap-3 mt-4">
                          <div className="w-[160px] space-y-1">
                            <Label className="text-xs">Protocol</Label>
                            <Select value={afRedistProto} onValueChange={setAfRedistProto}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {redistributeProtocols.map((p) => (
                                  <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Route Map (optional)</Label>
                            <Select value={afRedistRouteMap || "__none__"} onValueChange={(v) => setAfRedistRouteMap(v === "__none__" ? "" : v)}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {routeMapNames.map((name) => (
                                  <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-[100px] space-y-1">
                            <Label className="text-xs">Metric</Label>
                            <Input
                              value={afRedistMetric}
                              onChange={(e) => setAfRedistMetric(e.target.value)}
                              placeholder="e.g. 100"
                              className="h-9"
                            />
                          </div>
                          <Button size="sm" onClick={handleAddRedistribute} disabled={afSaving || !afRedistProto}>
                            {afSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                            Add
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Aggregate Addresses */}
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-sm font-medium mb-4">Aggregate Addresses</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          Summarize multiple routes into a single advertisement
                        </p>

                        {currentAf && currentAf.aggregate_addresses.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Prefix</TableHead>
                                <TableHead>AS Set</TableHead>
                                <TableHead>Summary Only</TableHead>
                                <TableHead>Route Map</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentAf.aggregate_addresses.map((agg) => (
                                <TableRow key={agg.prefix}>
                                  <TableCell className="font-mono">{agg.prefix}</TableCell>
                                  <TableCell>{agg.as_set ? "Yes" : "No"}</TableCell>
                                  <TableCell>{agg.summary_only ? "Yes" : "No"}</TableCell>
                                  <TableCell>{agg.route_map || <span className="text-muted-foreground">-</span>}</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteAggregate(agg.prefix)}
                                      disabled={afSaving}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}

                        <div className="flex items-end gap-3 mt-4">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Prefix</Label>
                            <Input
                              value={afAggPrefix}
                              onChange={(e) => setAfAggPrefix(e.target.value)}
                              placeholder="e.g. 10.0.0.0/8"
                              className="h-9"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Route Map (optional)</Label>
                            <Select value={afAggRouteMap || "__none__"} onValueChange={(v) => setAfAggRouteMap(v === "__none__" ? "" : v)}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {routeMapNames.map((name) => (
                                  <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-3 pb-0.5">
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id="agg-as-set"
                                checked={afAggAsSet}
                                onCheckedChange={(c) => setAfAggAsSet(c === true)}
                              />
                              <Label htmlFor="agg-as-set" className="text-xs cursor-pointer">AS Set</Label>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id="agg-summary"
                                checked={afAggSummaryOnly}
                                onCheckedChange={(c) => setAfAggSummaryOnly(c === true)}
                              />
                              <Label htmlFor="agg-summary" className="text-xs cursor-pointer">Summary Only</Label>
                            </div>
                          </div>
                          <Button size="sm" onClick={handleAddAggregate} disabled={afSaving || !afAggPrefix.trim()}>
                            {afSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                            Add
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Maximum Paths */}
                    {currentAf && (currentAf.maximum_paths_ebgp || currentAf.maximum_paths_ibgp) && (
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-sm font-medium mb-4">Maximum Paths</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-muted-foreground">eBGP</Label>
                              <p className="font-mono">{currentAf.maximum_paths_ebgp ?? "Default"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">iBGP</Label>
                              <p className="font-mono">{currentAf.maximum_paths_ibgp ?? "Default"}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* Parameters Tab */}
            {/* ============================================================ */}
            <TabsContent value="parameters">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Advanced BGP parameters and behavior settings
                  </p>
                  {!paramsEditing ? (
                    <Button size="sm" variant="outline" onClick={handleParamsEdit}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleParamsCancel} disabled={paramsSaving}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleParamsSave} disabled={paramsSaving}>
                        {paramsSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                  )}
                </div>

                {paramsError && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {paramsError}
                  </div>
                )}

                {/* General Settings */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium mb-4">General Settings</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2">
                        <Label className="text-xs">Cluster ID</Label>
                        {paramsEditing && editParams ? (
                          <Input
                            value={editParams.cluster_id || ""}
                            onChange={(e) => updateParam("cluster_id", e.target.value || null)}
                            placeholder="e.g. 10.0.0.1"
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.parameters.cluster_id || <span className="text-muted-foreground">Not set</span>}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Default Local Preference</Label>
                        {paramsEditing && editParams ? (
                          <Input
                            type="number"
                            value={editParams.default_local_pref ?? ""}
                            onChange={(e) => updateParam("default_local_pref", e.target.value ? parseInt(e.target.value, 10) : null)}
                            placeholder="100"
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.parameters.default_local_pref ?? <span className="text-muted-foreground">100 (default)</span>}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Boolean flags */}
                    <h4 className="text-xs font-medium text-muted-foreground mb-3">Behavior Flags</h4>
                    <div className="space-y-3 rounded-lg border p-4">
                      {([
                        { key: "log_neighbor_changes" as const, label: "Log Neighbor Changes", desc: "Log neighbor up/down and reset reason" },
                        { key: "always_compare_med" as const, label: "Always Compare MED", desc: "Compare MED among all routes, not just from same AS" },
                        { key: "deterministic_med" as const, label: "Deterministic MED", desc: "Group paths by AS before comparing MED" },
                        { key: "ebgp_requires_policy" as const, label: "eBGP Requires Policy", desc: "Require route-map for eBGP sessions" },
                        { key: "graceful_shutdown" as const, label: "Graceful Shutdown", desc: "Initiate graceful shutdown procedure" },
                        { key: "no_client_to_client_reflection" as const, label: "No Client-to-Client Reflection", desc: "Disable route reflection between RR clients" },
                        { key: "no_fast_external_failover" as const, label: "No Fast External Failover", desc: "Disable fast failover on eBGP link down" },
                        { key: "allow_martian_nexthop" as const, label: "Allow Martian Nexthop", desc: "Allow martian next-hops in BGP table" },
                        { key: "disable_ebgp_connected_route_check" as const, label: "Disable eBGP Connected Check", desc: "Skip connected route check for eBGP peers" },
                        { key: "fast_convergence" as const, label: "Fast Convergence", desc: "Speed up best path selection after changes" },
                        { key: "network_import_check" as const, label: "Network Import Check", desc: "Check BGP network route in RIB before advertising" },
                        { key: "reject_as_sets" as const, label: "Reject AS-Sets", desc: "Reject routes with AS_SET or AS_CONFED_SET" },
                        { key: "route_reflector_allow_outbound_policy" as const, label: "RR Allow Outbound Policy", desc: "Apply outbound policy on reflected routes" },
                        { key: "suppress_fib_pending" as const, label: "Suppress FIB Pending", desc: "Do not advertise routes pending FIB installation" },
                        { key: "shutdown" as const, label: "Shutdown", desc: "Administratively shut down BGP", destructive: true },
                      ] as const).map((item) => {
                        const { key, label, desc } = item;
                        const destructive = "destructive" in item;
                        const params = paramsEditing ? editParams : config?.parameters;
                        const checked = (params?.[key] as boolean) ?? false;
                        return (
                          <div key={key} className="flex items-center space-x-3">
                            <Checkbox
                              id={`param-${key}`}
                              checked={checked}
                              disabled={!paramsEditing}
                              onCheckedChange={(c) => {
                                if (paramsEditing && editParams) {
                                  updateParam(key, c === true);
                                }
                              }}
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={`param-${key}`}
                                className={`cursor-pointer text-sm ${destructive ? "text-destructive" : ""}`}
                              >
                                {label}
                              </Label>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Bestpath Selection */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium mb-4">Bestpath Selection</h3>
                    <div className="space-y-3 rounded-lg border p-4">
                      {([
                        { key: "as_path_confed" as const, label: "AS-Path Confed", desc: "Compare path length including confederation segments" },
                        { key: "as_path_ignore" as const, label: "AS-Path Ignore", desc: "Ignore AS-path length in best path selection" },
                        { key: "as_path_multipath_relax" as const, label: "AS-Path Multipath Relax", desc: "Allow load sharing across providers with different AS paths" },
                        { key: "compare_routerid" as const, label: "Compare Router ID", desc: "Compare router-id for identical eBGP paths" },
                        { key: "peer_type_multipath_relax" as const, label: "Peer Type Multipath Relax", desc: "Allow load sharing across iBGP and eBGP paths" },
                      ] as const).map(({ key, label, desc }) => {
                        const bp = paramsEditing ? editParams?.bestpath : config?.parameters.bestpath;
                        const checked = bp?.[key] ?? false;
                        return (
                          <div key={key} className="flex items-center space-x-3">
                            <Checkbox
                              id={`bp-${key}`}
                              checked={checked}
                              disabled={!paramsEditing}
                              onCheckedChange={(c) => {
                                if (paramsEditing && editParams) {
                                  setEditParams({
                                    ...editParams,
                                    bestpath: { ...editParams.bestpath, [key]: c === true },
                                  });
                                }
                              }}
                            />
                            <div className="flex-1">
                              <Label htmlFor={`bp-${key}`} className="cursor-pointer text-sm">{label}</Label>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Administrative Distance */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium mb-4">Administrative Distance</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {([
                        { key: "external" as const, label: "External", placeholder: "20" },
                        { key: "internal" as const, label: "Internal", placeholder: "200" },
                        { key: "local" as const, label: "Local", placeholder: "200" },
                      ] as const).map(({ key, label, placeholder }) => {
                        const dg = paramsEditing ? editParams?.distance_global : config?.parameters.distance_global;
                        return (
                          <div key={key} className="space-y-2">
                            <Label className="text-xs">{label}</Label>
                            {paramsEditing && editParams ? (
                              <Input
                                type="number"
                                value={dg?.[key] ?? ""}
                                onChange={(e) => {
                                  setEditParams({
                                    ...editParams,
                                    distance_global: {
                                      ...editParams.distance_global,
                                      [key]: e.target.value ? parseInt(e.target.value, 10) : null,
                                    },
                                  });
                                }}
                                placeholder={placeholder}
                                className="h-9"
                              />
                            ) : (
                              <p className="text-sm font-mono p-2 bg-muted rounded-md">
                                {dg?.[key] ?? <span className="text-muted-foreground">{placeholder} (default)</span>}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <BgpNeighborModal
        open={neighborModalOpen}
        onOpenChange={(open) => {
          setNeighborModalOpen(open);
          if (!open) setEditingNeighbor(null);
        }}
        existingNeighbor={editingNeighbor}
        peerGroups={config?.peer_groups.map((pg) => pg.name) ?? []}
        capabilities={capabilities}
        routeMapNames={routeMapNames}
        onSubmit={editingNeighbor ? handleUpdateNeighbor : handleCreateNeighbor}
      />

      <DeleteBgpNeighborModal
        open={!!deletingNeighbor}
        onOpenChange={(open) => { if (!open) setDeletingNeighbor(null); }}
        neighborAddress={deletingNeighbor ?? ""}
        onConfirm={handleDeleteNeighbor}
      />

      <BgpPeerGroupModal
        open={peerGroupModalOpen}
        onOpenChange={(open) => {
          setPeerGroupModalOpen(open);
          if (!open) setEditingPeerGroup(null);
        }}
        existingPeerGroup={editingPeerGroup}
        capabilities={capabilities}
        routeMapNames={routeMapNames}
        onSubmit={editingPeerGroup ? handleUpdatePeerGroup : handleCreatePeerGroup}
      />

      <DeleteBgpPeerGroupModal
        open={!!deletingPeerGroup}
        onOpenChange={(open) => { if (!open) setDeletingPeerGroup(null); }}
        peerGroupName={deletingPeerGroup?.name ?? ""}
        memberCount={deletingPeerGroup?.members ?? 0}
        onConfirm={handleDeletePeerGroup}
      />
    </>
  );
}
