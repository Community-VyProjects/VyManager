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
  Globe,
  ArrowLeftRight,
  Activity,
  AlertCircle,
  MoreVertical,
  Layers,
  Router,
  Eye,
  EyeOff,
} from "lucide-react";
import { ospfService, type OSPFConfig, type OSPFArea, type OSPFInterface } from "@/lib/api/ospf";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { OSPFConfigureModal } from "./OSPFConfigureModal";
import { OSPFAddInterfaceModal } from "./OSPFAddInterfaceModal";
import { OSPFAddAreaNetworkModal } from "./OSPFAddAreaNetworkModal";
import { OSPFEditSettingsModal } from "./OSPFEditSettingsModal";
import { OSPFDeleteConfirmModal } from "./OSPFDeleteConfirmModal";

interface OSPFPanelProps {
  onUpdate?: () => void;
}

export function OSPFPanel({ onUpdate }: OSPFPanelProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<OSPFConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [configureModalOpen, setConfigureModalOpen] = useState(false);
  const [addInterfaceModalOpen, setAddInterfaceModalOpen] = useState(false);
  const [addAreaNetworkModalOpen, setAddAreaNetworkModalOpen] = useState(false);
  const [editSettingsModalOpen, setEditSettingsModalOpen] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "interface" | "area" | "area-network" | "redistribute";
    name: string;
    additionalInfo?: { area?: string; network?: string };
  } | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ospfService.getConfig();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load OSPF configuration");
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

  const handleDeleteInterface = (name: string) => {
    setDeleteTarget({ type: "interface", name });
    setDeleteModalOpen(true);
  };

  const handleDeleteArea = (areaId: string) => {
    setDeleteTarget({ type: "area", name: areaId });
    setDeleteModalOpen(true);
  };

  const handleDeleteAreaNetwork = (area: string, network: string) => {
    setDeleteTarget({
      type: "area-network",
      name: network,
      additionalInfo: { area, network },
    });
    setDeleteModalOpen(true);
  };

  const handleDeleteRedistribute = (protocol: string) => {
    setDeleteTarget({ type: "redistribute", name: protocol });
    setDeleteModalOpen(true);
  };

  const handleToggleInterfacePassive = async (iface: OSPFInterface) => {
    try {
      const operation = iface.passive
        ? { op: "disable_interface_passive", interface: iface.name }
        : { op: "enable_interface_passive", interface: iface.name };

      const response = await ospfService.configureBatch({
        operations: [operation],
      });

      if (response.success) {
        toast.success(
          iface.passive ? "Passive Disabled" : "Passive Enabled",
          `Interface ${iface.name} is now ${iface.passive ? "active" : "passive"}`
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
          <span>Loading OSPF configuration...</span>
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
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <Router className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">OSPF Configuration</h2>
              <p className="text-sm text-muted-foreground">Open Shortest Path First routing</p>
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
                <Router className="h-12 w-12 mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground mb-4">OSPF is not configured</p>
                <Button variant="outline" size="sm" onClick={() => setConfigureModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Configure OSPF
                </Button>
              </CardContent>
            </Card>
            <OSPFConfigureModal
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
                      <p className="text-xs text-muted-foreground">Router ID</p>
                      <p className="text-lg font-mono font-medium">{config.router_id || "Auto"}</p>
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
                      <p className="text-xs text-muted-foreground">Areas</p>
                      <p className="text-2xl font-bold">{config.areas.length}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Layers className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Interfaces</p>
                      <p className="text-2xl font-bold">{config.interfaces.length}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Network className="h-5 w-5 text-purple-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Redistributions</p>
                      <p className="text-2xl font-bold">{config.redistributions.length}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <ArrowLeftRight className="h-5 w-5 text-orange-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for Areas, Interfaces, Redistribution */}
            <Tabs defaultValue="areas" className="space-y-4">
              <TabsList>
                <TabsTrigger value="areas" className="gap-2">
                  <Layers className="h-4 w-4" />
                  Areas ({config.areas.length})
                </TabsTrigger>
                <TabsTrigger value="interfaces" className="gap-2">
                  <Network className="h-4 w-4" />
                  Interfaces ({config.interfaces.length})
                </TabsTrigger>
                <TabsTrigger value="redistribution" className="gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  Redistribution ({config.redistributions.length})
                </TabsTrigger>
                <TabsTrigger value="options" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Options
                </TabsTrigger>
              </TabsList>

              {/* Areas Tab */}
              <TabsContent value="areas" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">OSPF Areas</CardTitle>
                        <CardDescription>Configured OSPF areas and networks</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddAreaNetworkModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Area Network
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {config.areas.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No OSPF areas configured</p>
                        <p className="text-xs mt-1">Add networks to create areas</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {config.areas.map((area, idx) => (
                          <AreaCard
                            key={idx}
                            area={area}
                            onDeleteArea={() => handleDeleteArea(area.id)}
                            onDeleteNetwork={(network) =>
                              handleDeleteAreaNetwork(area.id, network)
                            }
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Interfaces Tab */}
              <TabsContent value="interfaces" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">OSPF Interfaces</CardTitle>
                        <CardDescription>Interfaces participating in OSPF</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddInterfaceModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Interface
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {config.interfaces.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Network className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No OSPF interfaces configured</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {config.interfaces.map((iface, idx) => (
                          <InterfaceCard
                            key={idx}
                            iface={iface}
                            onDelete={() => handleDeleteInterface(iface.name)}
                            onTogglePassive={() => handleToggleInterfacePassive(iface)}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Redistribution Tab */}
              <TabsContent value="redistribution" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Route Redistribution</CardTitle>
                        <CardDescription>Routes redistributed into OSPF</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {config.redistributions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No route redistribution configured</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {config.redistributions.map((redist, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-4 rounded-lg bg-accent/50 group"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <code className="font-mono font-medium capitalize">
                                  {redist.protocol}
                                </code>
                                {redist.metric_type && (
                                  <Badge variant="outline">Type {redist.metric_type}</Badge>
                                )}
                              </div>
                              <div className="flex gap-2 flex-wrap mt-2">
                                {redist.route_map && (
                                  <Badge variant="secondary" className="text-xs">
                                    Route-map: {redist.route_map}
                                  </Badge>
                                )}
                                {redist.metric && (
                                  <Badge variant="secondary" className="text-xs">
                                    Metric: {redist.metric}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              onClick={() => handleDeleteRedistribute(redist.protocol)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Default Information Originate */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Default Route</CardTitle>
                    <CardDescription>Default information originate settings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 rounded-lg bg-accent/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Default Information Originate</p>
                          <p className="text-sm text-muted-foreground">
                            {config.default_information.originate
                              ? "Enabled - advertising default route"
                              : "Disabled"}
                          </p>
                        </div>
                        <Badge
                          variant={config.default_information.originate ? "default" : "secondary"}
                        >
                          {config.default_information.originate ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      {config.default_information.originate && (
                        <div className="flex gap-2 flex-wrap mt-3">
                          {config.default_information.always && (
                            <Badge variant="secondary" className="text-xs">
                              Always
                            </Badge>
                          )}
                          {config.default_information.metric && (
                            <Badge variant="secondary" className="text-xs">
                              Metric: {config.default_information.metric}
                            </Badge>
                          )}
                          {config.default_information.metric_type && (
                            <Badge variant="secondary" className="text-xs">
                              Type: {config.default_information.metric_type}
                            </Badge>
                          )}
                          {config.default_information.route_map && (
                            <Badge variant="secondary" className="text-xs">
                              Route-map: {config.default_information.route_map}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Options Tab */}
              <TabsContent value="options" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">OSPF Options</CardTitle>
                    <CardDescription>Global OSPF settings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-accent/50">
                        <p className="text-xs text-muted-foreground mb-1">ABR Type</p>
                        <Badge variant="outline">{config.abr_type || "Standard"}</Badge>
                      </div>
                      <div className="p-4 rounded-lg bg-accent/50">
                        <p className="text-xs text-muted-foreground mb-1">RFC 1583 Compatibility</p>
                        <Badge variant={config.rfc1583_compatibility ? "default" : "secondary"}>
                          {config.rfc1583_compatibility ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <div className="p-4 rounded-lg bg-accent/50">
                        <p className="text-xs text-muted-foreground mb-1">Opaque LSA</p>
                        <Badge variant={config.opaque_lsa ? "default" : "secondary"}>
                          {config.opaque_lsa ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <div className="p-4 rounded-lg bg-accent/50">
                        <p className="text-xs text-muted-foreground mb-1">Passive Default</p>
                        <Badge
                          variant={config.passive_interfaces.default ? "default" : "secondary"}
                        >
                          {config.passive_interfaces.default ? "Enabled" : "Disabled"}
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
        {config.configured && (
          <>
            <OSPFAddInterfaceModal
              open={addInterfaceModalOpen}
              onOpenChange={setAddInterfaceModalOpen}
              onSuccess={handleRefresh}
              areas={config.areas}
            />
            <OSPFAddAreaNetworkModal
              open={addAreaNetworkModalOpen}
              onOpenChange={setAddAreaNetworkModalOpen}
              onSuccess={handleRefresh}
            />
            {deleteTarget && (
              <OSPFDeleteConfirmModal
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                onSuccess={handleRefresh}
                deleteType={deleteTarget.type}
                targetName={deleteTarget.name}
                additionalInfo={deleteTarget.additionalInfo}
              />
            )}
            <OSPFEditSettingsModal
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

// Area Card Component
function AreaCard({
  area,
  onDeleteArea,
  onDeleteNetwork,
}: {
  area: OSPFArea;
  onDeleteArea: () => void;
  onDeleteNetwork: (network: string) => void;
}) {
  const areaTypeLabels: Record<string, { label: string; color: string }> = {
    normal: { label: "Normal", color: "bg-green-500/10 text-green-500" },
    stub: { label: "Stub", color: "bg-yellow-500/10 text-yellow-600" },
    "totally-stubby": { label: "Totally Stubby", color: "bg-orange-500/10 text-orange-500" },
    nssa: { label: "NSSA", color: "bg-blue-500/10 text-blue-500" },
    "nssa-totally-stubby": { label: "NSSA Totally Stubby", color: "bg-purple-500/10 text-purple-500" },
  };

  const typeInfo = areaTypeLabels[area.type] || areaTypeLabels.normal;

  return (
    <div className="p-4 rounded-lg bg-accent/50 group">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          {/* Header */}
          <div className="flex items-center gap-3">
            <code className="text-lg font-mono font-medium">Area {area.id}</code>
            <Badge className={cn("border-0", typeInfo.color)}>{typeInfo.label}</Badge>
          </div>

          {/* Networks */}
          {area.networks.length > 0 && (
            <div className="space-y-1.5 mt-3">
              <p className="text-xs text-muted-foreground font-medium">Networks</p>
              <div className="flex flex-wrap gap-2">
                {area.networks.map((network, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="font-mono cursor-pointer group/net hover:border-destructive"
                    onClick={() => onDeleteNetwork(network)}
                  >
                    {network}
                    <Trash2 className="h-3 w-3 ml-2 opacity-0 group-hover/net:opacity-100 text-destructive" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Ranges */}
          {area.ranges.length > 0 && (
            <div className="space-y-1.5 mt-3">
              <p className="text-xs text-muted-foreground font-medium">Ranges (Summarization)</p>
              <div className="flex flex-wrap gap-2">
                {area.ranges.map((range, idx) => (
                  <Badge key={idx} variant="secondary" className="font-mono">
                    {range.prefix}
                    {range.cost && ` (cost: ${range.cost})`}
                    {range.not_advertise && " (not-advertise)"}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Virtual Links */}
          {area.virtual_links.length > 0 && (
            <div className="space-y-1.5 mt-3">
              <p className="text-xs text-muted-foreground font-medium">Virtual Links</p>
              <div className="flex flex-wrap gap-2">
                {area.virtual_links.map((vlink, idx) => (
                  <Badge key={idx} variant="secondary" className="font-mono">
                    {vlink}
                  </Badge>
                ))}
              </div>
            </div>
          )}
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
            <DropdownMenuItem onClick={onDeleteArea} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Area
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Interface Card Component
function InterfaceCard({
  iface,
  onDelete,
  onTogglePassive,
}: {
  iface: OSPFInterface;
  onDelete: () => void;
  onTogglePassive: () => void;
}) {
  return (
    <div className="p-4 rounded-lg bg-accent/50 group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center gap-3">
            <code className="text-lg font-mono font-medium">{iface.name}</code>
            {iface.area && (
              <Badge variant="outline" className="font-mono">
                Area {iface.area}
              </Badge>
            )}
            {iface.passive && (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-0">
                <EyeOff className="h-3 w-3 mr-1" />
                Passive
              </Badge>
            )}
          </div>

          {/* Details */}
          <div className="flex gap-2 flex-wrap">
            {iface.cost && (
              <Badge variant="secondary" className="text-xs">
                Cost: {iface.cost}
              </Badge>
            )}
            {iface.priority && (
              <Badge variant="secondary" className="text-xs">
                Priority: {iface.priority}
              </Badge>
            )}
            {iface.network && (
              <Badge variant="secondary" className="text-xs">
                Network: {iface.network}
              </Badge>
            )}
            {iface.hello_interval && (
              <Badge variant="secondary" className="text-xs">
                Hello: {iface.hello_interval}s
              </Badge>
            )}
            {iface.dead_interval && (
              <Badge variant="secondary" className="text-xs">
                Dead: {iface.dead_interval}s
              </Badge>
            )}
            {iface.bfd && (
              <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-500">
                <Activity className="h-3 w-3 mr-1" />
                BFD
              </Badge>
            )}
            {iface.mtu_ignore && (
              <Badge variant="secondary" className="text-xs">
                MTU Ignore
              </Badge>
            )}
            {iface.authentication && (
              <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-600">
                Auth: {iface.authentication.type}
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
            <DropdownMenuItem onClick={onTogglePassive}>
              {iface.passive ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Make Active
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Make Passive
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
