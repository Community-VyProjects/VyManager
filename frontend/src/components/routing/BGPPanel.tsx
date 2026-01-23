"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Network,
  Server,
  Plus,
  Trash2,
  Settings,
  RefreshCw,
  Users,
  Globe,
  ArrowLeftRight,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  MoreVertical,
  Power,
  PowerOff,
  Route,
} from "lucide-react";
import { bgpService, type BGPConfig, type BGPNeighbor, type BGPAddressFamily } from "@/lib/api/bgp";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { BGPConfigureModal } from "./BGPConfigureModal";
import { BGPAddNeighborModal } from "./BGPAddNeighborModal";
import { BGPAddNetworkModal } from "./BGPAddNetworkModal";
import { BGPAddPeerGroupModal } from "./BGPAddPeerGroupModal";
import { BGPDeleteConfirmModal } from "./BGPDeleteConfirmModal";
import { BGPEditSettingsModal } from "./BGPEditSettingsModal";
import { BGPStatusTab } from "./BGPStatusTab";
import { BGPRoutesTab } from "./BGPRoutesTab";

interface BGPPanelProps {
  onUpdate?: () => void;
}

export function BGPPanel({ onUpdate }: BGPPanelProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<BGPConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [configureModalOpen, setConfigureModalOpen] = useState(false);
  const [addNeighborModalOpen, setAddNeighborModalOpen] = useState(false);
  const [addNetworkModalOpen, setAddNetworkModalOpen] = useState(false);
  const [addPeerGroupModalOpen, setAddPeerGroupModalOpen] = useState(false);
  const [editSettingsModalOpen, setEditSettingsModalOpen] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "neighbor" | "network" | "peer-group" | "redistribute" | "aggregate";
    name: string;
    additionalInfo?: { family?: string; protocol?: string };
  } | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bgpService.getConfig();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load BGP configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleRefresh = () => {
    fetchConfig();
    onUpdate?.();
  };

  const handleDeleteNeighbor = (address: string) => {
    setDeleteTarget({ type: "neighbor", name: address });
    setDeleteModalOpen(true);
  };

  const handleDeletePeerGroup = (name: string) => {
    setDeleteTarget({ type: "peer-group", name });
    setDeleteModalOpen(true);
  };

  const handleDeleteNetwork = (prefix: string, family: string) => {
    setDeleteTarget({ type: "network", name: prefix, additionalInfo: { family } });
    setDeleteModalOpen(true);
  };

  const handleToggleNeighborShutdown = async (neighbor: BGPNeighbor) => {
    if (!config?.asn) return;

    try {
      const operation = neighbor.shutdown
        ? { op: "enable_neighbor", neighbor: neighbor.address }
        : { op: "shutdown_neighbor", neighbor: neighbor.address };

      const response = await bgpService.configureBatch({
        asn: config.asn,
        operations: [operation],
      });

      if (response.success) {
        toast.success(
          neighbor.shutdown ? "Neighbor Enabled" : "Neighbor Shutdown",
          `BGP neighbor ${neighbor.address} has been ${neighbor.shutdown ? "enabled" : "shutdown"}`
        );
        handleRefresh();
      } else {
        toast.error("Failed", response.error || "Unknown error");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Error", errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading BGP configuration...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
              <Network className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">BGP Configuration</h2>
              <p className="text-sm text-muted-foreground">Border Gateway Protocol routing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {config.configured && (
              <Button variant="outline" size="sm" onClick={() => setEditSettingsModalOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Settings
              </Button>
            )}
          </div>
        </div>

        {!config.configured ? (
          <>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Network className="h-12 w-12 mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground mb-4">BGP is not configured</p>
                <Button variant="outline" size="sm" onClick={() => setConfigureModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Configure BGP
                </Button>
              </CardContent>
            </Card>
            <BGPConfigureModal
              open={configureModalOpen}
              onOpenChange={setConfigureModalOpen}
              onSuccess={handleRefresh}
            />
          </>
        ) : (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">ASN</p>
                      <p className="text-2xl font-bold font-mono">{config.asn || "-"}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-purple-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Router ID</p>
                      <p className="text-lg font-mono font-medium">{config.router_id || "Not set"}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Server className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Neighbors</p>
                      <p className="text-2xl font-bold">{config.neighbors.length}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Peer Groups</p>
                      <p className="text-2xl font-bold">{config.peer_groups.length}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <ArrowLeftRight className="h-5 w-5 text-orange-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for Status, Routes, Neighbors, Address Families, Peer Groups */}
            <Tabs defaultValue="status" className="space-y-4">
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="status" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Status
                </TabsTrigger>
                <TabsTrigger value="routes" className="gap-2">
                  <Route className="h-4 w-4" />
                  Routes
                </TabsTrigger>
                <TabsTrigger value="neighbors" className="gap-2">
                  <Users className="h-4 w-4" />
                  Neighbors ({config.neighbors.length})
                </TabsTrigger>
                <TabsTrigger value="address-families" className="gap-2">
                  <Network className="h-4 w-4" />
                  Address Families ({Object.keys(config.address_families).length})
                </TabsTrigger>
                <TabsTrigger value="peer-groups" className="gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  Peer Groups ({config.peer_groups.length})
                </TabsTrigger>
                <TabsTrigger value="options" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Options
                </TabsTrigger>
              </TabsList>

              {/* Status Tab - Real-time neighbor session status */}
              <TabsContent value="status">
                <BGPStatusTab autoRefresh={true} refreshInterval={10000} />
              </TabsContent>

              {/* Routes Tab - BGP routing table */}
              <TabsContent value="routes">
                <BGPRoutesTab pageSize={25} />
              </TabsContent>

              {/* Neighbors Tab */}
              <TabsContent value="neighbors" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">BGP Neighbors</CardTitle>
                        <CardDescription>Configured BGP peering sessions</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddNeighborModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Neighbor
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {config.neighbors.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No BGP neighbors configured</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {config.neighbors.map((neighbor, idx) => (
                          <NeighborCard
                            key={idx}
                            neighbor={neighbor}
                            onDelete={() => handleDeleteNeighbor(neighbor.address)}
                            onToggleShutdown={() => handleToggleNeighborShutdown(neighbor)}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Address Families Tab */}
              <TabsContent value="address-families" className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddNetworkModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Network
                  </Button>
                </div>
                {Object.keys(config.address_families).length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <Network className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>No address families configured</p>
                    </CardContent>
                  </Card>
                ) : (
                  Object.entries(config.address_families).map(([family, data]) => (
                    <AddressFamilyCard
                      key={family}
                      family={family}
                      data={data}
                      onDeleteNetwork={(prefix) => handleDeleteNetwork(prefix, family)}
                      onAddNetwork={() => setAddNetworkModalOpen(true)}
                    />
                  ))
                )}
              </TabsContent>

              {/* Peer Groups Tab */}
              <TabsContent value="peer-groups" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Peer Groups</CardTitle>
                        <CardDescription>Templates for neighbor configuration</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddPeerGroupModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Peer Group
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {config.peer_groups.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No peer groups configured</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {config.peer_groups.map((group, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-4 rounded-lg bg-accent/50 group"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <code className="font-mono font-medium">{group.name}</code>
                                {group.remote_as && (
                                  <Badge variant="outline" className="font-mono">
                                    AS {group.remote_as}
                                  </Badge>
                                )}
                              </div>
                              {group.description && (
                                <p className="text-sm text-muted-foreground">{group.description}</p>
                              )}
                              <div className="flex gap-2 flex-wrap mt-2">
                                {group.update_source && (
                                  <Badge variant="secondary" className="text-xs">
                                    Source: {group.update_source}
                                  </Badge>
                                )}
                                {group.ebgp_multihop && (
                                  <Badge variant="secondary" className="text-xs">
                                    Multihop: {group.ebgp_multihop}
                                  </Badge>
                                )}
                                {group.passive && (
                                  <Badge variant="secondary" className="text-xs">
                                    Passive
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              onClick={() => handleDeletePeerGroup(group.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Options Tab */}
              <TabsContent value="options" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">BGP Options</CardTitle>
                    <CardDescription>Global BGP settings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-accent/50">
                        <p className="text-xs text-muted-foreground mb-1">Log Neighbor Changes</p>
                        <Badge variant={config.log_neighbor_changes ? "default" : "secondary"}>
                          {config.log_neighbor_changes ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <div className="p-4 rounded-lg bg-accent/50">
                        <p className="text-xs text-muted-foreground mb-1">Fast External Failover</p>
                        <Badge variant={config.no_fast_external_failover ? "secondary" : "default"}>
                          {config.no_fast_external_failover ? "Disabled" : "Enabled"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Modals */}
        {config.configured && config.asn && (
          <>
            <BGPAddNeighborModal
              open={addNeighborModalOpen}
              onOpenChange={setAddNeighborModalOpen}
              onSuccess={handleRefresh}
              asn={config.asn}
              peerGroups={config.peer_groups}
            />
            <BGPAddNetworkModal
              open={addNetworkModalOpen}
              onOpenChange={setAddNetworkModalOpen}
              onSuccess={handleRefresh}
              asn={config.asn}
            />
            <BGPAddPeerGroupModal
              open={addPeerGroupModalOpen}
              onOpenChange={setAddPeerGroupModalOpen}
              onSuccess={handleRefresh}
              asn={config.asn}
            />
            {deleteTarget && (
              <BGPDeleteConfirmModal
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                onSuccess={handleRefresh}
                asn={config.asn}
                deleteType={deleteTarget.type}
                targetName={deleteTarget.name}
                additionalInfo={deleteTarget.additionalInfo}
              />
            )}
            <BGPEditSettingsModal
              open={editSettingsModalOpen}
              onOpenChange={setEditSettingsModalOpen}
              onSuccess={handleRefresh}
              config={config}
            />
          </>
        )}
      </div>
    </ScrollArea>
  );
}

// Neighbor Card Component
function NeighborCard({
  neighbor,
  onDelete,
  onToggleShutdown,
}: {
  neighbor: BGPNeighbor;
  onDelete: () => void;
  onToggleShutdown: () => void;
}) {
  return (
    <div className="p-4 rounded-lg bg-accent/50 group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center gap-3">
            <code className="text-lg font-mono font-medium">{neighbor.address}</code>
            <Badge
              variant={neighbor.shutdown ? "destructive" : "default"}
              className={cn(
                !neighbor.shutdown && "bg-green-500/10 text-green-500 border-green-500/20"
              )}
            >
              {neighbor.shutdown ? (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Shutdown
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </>
              )}
            </Badge>
            {neighbor.remote_as && (
              <Badge variant="outline" className="font-mono">
                AS {neighbor.remote_as}
              </Badge>
            )}
          </div>

          {/* Description */}
          {neighbor.description && (
            <p className="text-sm text-muted-foreground">{neighbor.description}</p>
          )}

          {/* Details */}
          <div className="flex gap-2 flex-wrap">
            {neighbor.peer_group && (
              <Badge variant="secondary" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {neighbor.peer_group}
              </Badge>
            )}
            {neighbor.update_source && (
              <Badge variant="secondary" className="text-xs">
                Source: {neighbor.update_source}
              </Badge>
            )}
            {neighbor.ebgp_multihop && (
              <Badge variant="secondary" className="text-xs">
                Multihop: {neighbor.ebgp_multihop}
              </Badge>
            )}
            {neighbor.passive && (
              <Badge variant="secondary" className="text-xs">
                Passive
              </Badge>
            )}
            {neighbor.bfd?.enabled && (
              <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-500">
                <Activity className="h-3 w-3 mr-1" />
                BFD
              </Badge>
            )}
            {neighbor.password && (
              <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-600">
                <Shield className="h-3 w-3 mr-1" />
                MD5 Auth
              </Badge>
            )}
            {neighbor.timers && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {neighbor.timers.keepalive}/{neighbor.timers.holdtime}
              </Badge>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onToggleShutdown}>
              {neighbor.shutdown ? (
                <>
                  <Power className="h-4 w-4 mr-2" />
                  Enable
                </>
              ) : (
                <>
                  <PowerOff className="h-4 w-4 mr-2" />
                  Shutdown
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Address Family Card Component
function AddressFamilyCard({
  family,
  data,
  onDeleteNetwork,
  onAddNetwork,
}: {
  family: string;
  data: BGPAddressFamily;
  onDeleteNetwork: (prefix: string) => void;
  onAddNetwork: () => void;
}) {
  const familyLabels: Record<string, string> = {
    "ipv4-unicast": "IPv4 Unicast",
    "ipv6-unicast": "IPv6 Unicast",
    "l2vpn-evpn": "L2VPN EVPN",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {familyLabels[family] || family}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onAddNetwork}>
            <Plus className="h-4 w-4 mr-2" />
            Add Network
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Networks */}
        {data.networks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Advertised Networks ({data.networks.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.networks.map((network, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="font-mono group/net cursor-pointer hover:border-destructive"
                  onClick={() => onDeleteNetwork(network.prefix)}
                >
                  {network.prefix}
                  {network.route_map && (
                    <span className="ml-2 text-muted-foreground">via {network.route_map}</span>
                  )}
                  <Trash2 className="h-3 w-3 ml-2 opacity-0 group-hover/net:opacity-100 text-destructive" />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Redistributions */}
        {data.redistributions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Redistribution ({data.redistributions.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.redistributions.map((redist, idx) => (
                <Badge key={idx} variant="secondary">
                  {redist.protocol}
                  {redist.route_map && ` (${redist.route_map})`}
                  {redist.metric && ` metric ${redist.metric}`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Aggregates */}
        {data.aggregates.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Network className="h-4 w-4" />
              Aggregate Addresses ({data.aggregates.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.aggregates.map((agg, idx) => (
                <Badge key={idx} variant="outline" className="font-mono">
                  {agg.prefix}
                  {agg.summary_only && " (summary-only)"}
                  {agg.as_set && " (as-set)"}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Neighbor AF Settings */}
        {data.neighbors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Neighbor Settings ({data.neighbors.length})
            </h4>
            <div className="space-y-2">
              {data.neighbors.map((afNeighbor, idx) => (
                <div key={idx} className="p-3 rounded-md bg-accent/30">
                  <code className="font-mono text-sm font-medium">{afNeighbor.address}</code>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {afNeighbor.route_map_import && (
                      <Badge variant="secondary" className="text-xs">
                        Import: {afNeighbor.route_map_import}
                      </Badge>
                    )}
                    {afNeighbor.route_map_export && (
                      <Badge variant="secondary" className="text-xs">
                        Export: {afNeighbor.route_map_export}
                      </Badge>
                    )}
                    {afNeighbor.next_hop_self && (
                      <Badge variant="secondary" className="text-xs">
                        Next-hop-self
                      </Badge>
                    )}
                    {afNeighbor.route_reflector_client && (
                      <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-500">
                        RR Client
                      </Badge>
                    )}
                    {afNeighbor.soft_reconfiguration_inbound && (
                      <Badge variant="secondary" className="text-xs">
                        Soft-reconfig
                      </Badge>
                    )}
                    {afNeighbor.default_originate && (
                      <Badge variant="secondary" className="text-xs">
                        Default originate
                      </Badge>
                    )}
                    {afNeighbor.maximum_prefix && (
                      <Badge variant="secondary" className="text-xs">
                        Max: {afNeighbor.maximum_prefix}
                      </Badge>
                    )}
                    {afNeighbor.remove_private_as && (
                      <Badge variant="secondary" className="text-xs">
                        Remove private AS
                      </Badge>
                    )}
                    {afNeighbor.as_override && (
                      <Badge variant="secondary" className="text-xs">
                        AS override
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {data.networks.length === 0 &&
          data.redistributions.length === 0 &&
          data.aggregates.length === 0 &&
          data.neighbors.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No configuration in this address family
            </p>
          )}
      </CardContent>
    </Card>
  );
}
