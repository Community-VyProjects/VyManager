"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ArrowLeftRight,
  Activity,
  AlertCircle,
  MoreVertical,
  Layers,
  Router,
  EyeOff,
  Power,
  PowerOff,
} from "lucide-react";
import {
  ospfv3Service,
  type OSPFv3Config,
  type OSPFv3Area,
  type OSPFv3Interface,
  getAreaTypeDisplay,
  getNetworkTypeDisplay,
} from "@/lib/api/ospfv3";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

interface OSPFv3PanelProps {
  onUpdate?: () => void;
}

export function OSPFv3Panel({ onUpdate }: OSPFv3PanelProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<OSPFv3Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [enableModalOpen, setEnableModalOpen] = useState(false);
  const [addInterfaceModalOpen, setAddInterfaceModalOpen] = useState(false);
  const [addAreaModalOpen, setAddAreaModalOpen] = useState(false);
  const [addRedistModalOpen, setAddRedistModalOpen] = useState(false);
  const [disableModalOpen, setDisableModalOpen] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ospfv3Service.getConfig();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load OSPFv3 configuration");
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

  const handleDeleteInterface = async (name: string) => {
    try {
      await ospfv3Service.deleteInterface(name);
      toast.success("Deleted", `Interface ${name} removed from OSPFv3`);
      handleRefresh();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to delete interface");
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    try {
      await ospfv3Service.deleteArea(areaId);
      toast.success("Deleted", `Area ${areaId} removed`);
      handleRefresh();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to delete area");
    }
  };

  const handleDeleteRedistribution = async (protocol: string) => {
    try {
      await ospfv3Service.deleteRedistribution(protocol);
      toast.success("Deleted", `Redistribution of ${protocol} removed`);
      handleRefresh();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to delete redistribution");
    }
  };

  const handleToggleGracefulRestart = async () => {
    if (!config) return;
    try {
      if (config.graceful_restart) {
        await ospfv3Service.disableGracefulRestart();
        toast.success("Disabled", "Graceful restart disabled");
      } else {
        await ospfv3Service.enableGracefulRestart();
        toast.success("Enabled", "Graceful restart enabled");
      }
      handleRefresh();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to toggle graceful restart");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading OSPFv3 configuration...</span>
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
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10">
              <Router className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">OSPFv3 Configuration</h2>
              <p className="text-sm text-muted-foreground">OSPF for IPv6 routing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {config.configured && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDisableModalOpen(true)}
              >
                <PowerOff className="h-4 w-4 mr-2" />
                Disable OSPFv3
              </Button>
            )}
          </div>
        </div>

        {!config.configured ? (
          <>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Router className="h-12 w-12 mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground mb-4">OSPFv3 is not configured</p>
                <Button variant="outline" size="sm" onClick={() => setEnableModalOpen(true)}>
                  <Power className="h-4 w-4 mr-2" />
                  Enable OSPFv3
                </Button>
              </CardContent>
            </Card>
            <EnableOSPFv3Modal
              open={enableModalOpen}
              onOpenChange={setEnableModalOpen}
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

            {/* Tabs */}
            <Tabs defaultValue="interfaces" className="space-y-4">
              <TabsList>
                <TabsTrigger value="interfaces" className="gap-2">
                  <Network className="h-4 w-4" />
                  Interfaces ({config.interfaces.length})
                </TabsTrigger>
                <TabsTrigger value="areas" className="gap-2">
                  <Layers className="h-4 w-4" />
                  Areas ({config.areas.length})
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

              {/* Interfaces Tab */}
              <TabsContent value="interfaces" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">OSPFv3 Interfaces</CardTitle>
                        <CardDescription>Interfaces participating in OSPFv3</CardDescription>
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
                        <p>No OSPFv3 interfaces configured</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {config.interfaces.map((iface, idx) => (
                          <InterfaceCard
                            key={idx}
                            iface={iface}
                            onDelete={() => handleDeleteInterface(iface.name)}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Areas Tab */}
              <TabsContent value="areas" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">OSPFv3 Areas</CardTitle>
                        <CardDescription>Configured OSPFv3 areas</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddAreaModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Area
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {config.areas.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No OSPFv3 areas configured</p>
                        <p className="text-xs mt-1">Areas are created when interfaces are assigned</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {config.areas.map((area, idx) => (
                          <AreaCard
                            key={idx}
                            area={area}
                            onDeleteArea={() => handleDeleteArea(area.id)}
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
                        <CardDescription>Routes redistributed into OSPFv3</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddRedistModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Redistribution
                      </Button>
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
                              </div>
                              {redist.route_map && (
                                <Badge variant="secondary" className="text-xs">
                                  Route-map: {redist.route_map}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              onClick={() => handleDeleteRedistribution(redist.protocol)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Default Information */}
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
                            {config.default_information?.originate
                              ? "Enabled - advertising default route"
                              : "Disabled"}
                          </p>
                        </div>
                        <Badge
                          variant={config.default_information?.originate ? "default" : "secondary"}
                        >
                          {config.default_information?.originate ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      {config.default_information?.originate && (
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
                    <CardTitle className="text-base">OSPFv3 Options</CardTitle>
                    <CardDescription>Global OSPFv3 settings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-accent/50">
                        <p className="text-xs text-muted-foreground mb-1">Graceful Restart</p>
                        <div className="flex items-center justify-between">
                          <Badge variant={config.graceful_restart ? "default" : "secondary"}>
                            {config.graceful_restart ? "Enabled" : "Disabled"}
                          </Badge>
                          <Switch
                            checked={config.graceful_restart}
                            onCheckedChange={handleToggleGracefulRestart}
                          />
                        </div>
                      </div>
                      {config.distance && (
                        <>
                          {config.distance.external && (
                            <div className="p-4 rounded-lg bg-accent/50">
                              <p className="text-xs text-muted-foreground mb-1">External Distance</p>
                              <p className="text-lg font-mono font-medium">{config.distance.external}</p>
                            </div>
                          )}
                          {config.distance.inter_area && (
                            <div className="p-4 rounded-lg bg-accent/50">
                              <p className="text-xs text-muted-foreground mb-1">Inter-Area Distance</p>
                              <p className="text-lg font-mono font-medium">{config.distance.inter_area}</p>
                            </div>
                          )}
                          {config.distance.intra_area && (
                            <div className="p-4 rounded-lg bg-accent/50">
                              <p className="text-xs text-muted-foreground mb-1">Intra-Area Distance</p>
                              <p className="text-lg font-mono font-medium">{config.distance.intra_area}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Modals */}
        <EnableOSPFv3Modal
          open={enableModalOpen}
          onOpenChange={setEnableModalOpen}
          onSuccess={handleRefresh}
        />
        <AddInterfaceModal
          open={addInterfaceModalOpen}
          onOpenChange={setAddInterfaceModalOpen}
          onSuccess={handleRefresh}
        />
        <AddAreaModal
          open={addAreaModalOpen}
          onOpenChange={setAddAreaModalOpen}
          onSuccess={handleRefresh}
        />
        <AddRedistributionModal
          open={addRedistModalOpen}
          onOpenChange={setAddRedistModalOpen}
          onSuccess={handleRefresh}
        />
        <DisableOSPFv3Modal
          open={disableModalOpen}
          onOpenChange={setDisableModalOpen}
          onSuccess={handleRefresh}
        />
      </div>
    </ScrollArea>
  );
}

// Interface Card Component
function InterfaceCard({
  iface,
  onDelete,
}: {
  iface: OSPFv3Interface;
  onDelete: () => void;
}) {
  return (
    <div className="p-4 rounded-lg bg-accent/50 group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
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
          <div className="flex gap-2 flex-wrap">
            {iface.cost && (
              <Badge variant="secondary" className="text-xs">
                Cost: {iface.cost}
              </Badge>
            )}
            {iface.priority !== null && iface.priority !== undefined && (
              <Badge variant="secondary" className="text-xs">
                Priority: {iface.priority}
              </Badge>
            )}
            {iface.network && (
              <Badge variant="secondary" className="text-xs">
                {getNetworkTypeDisplay(iface.network)}
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
            {iface.instance_id !== null && iface.instance_id !== undefined && (
              <Badge variant="secondary" className="text-xs">
                Instance: {iface.instance_id}
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

// Area Card Component
function AreaCard({
  area,
  onDeleteArea,
}: {
  area: OSPFv3Area;
  onDeleteArea: () => void;
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
          <div className="flex items-center gap-3">
            <code className="text-lg font-mono font-medium">Area {area.id}</code>
            <Badge className={cn("border-0", typeInfo.color)}>{typeInfo.label}</Badge>
          </div>

          {area.ranges.length > 0 && (
            <div className="space-y-1.5 mt-3">
              <p className="text-xs text-muted-foreground font-medium">Ranges</p>
              <div className="flex flex-wrap gap-2">
                {area.ranges.map((range, idx) => (
                  <Badge key={idx} variant="secondary" className="font-mono">
                    {range.prefix}
                    {range.not_advertise && " (not-advertise)"}
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

// Enable OSPFv3 Modal
function EnableOSPFv3Modal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [routerId, setRouterId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await ospfv3Service.enable({
        router_id: routerId || undefined,
      });
      toast.success("Enabled", "OSPFv3 has been enabled");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to enable OSPFv3");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enable OSPFv3</DialogTitle>
          <DialogDescription>Configure OSPFv3 for IPv6 routing</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="router-id">Router ID (Optional)</Label>
            <Input
              id="router-id"
              placeholder="e.g., 10.0.0.1"
              value={routerId}
              onChange={(e) => setRouterId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              IPv4 format. If not set, will be auto-selected.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Enabling..." : "Enable OSPFv3"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add Interface Modal
function AddInterfaceModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    interface: "",
    area: "0.0.0.0",
    cost: "",
    priority: "",
    hello_interval: "",
    dead_interval: "",
    network: "",
    passive: false,
    mtu_ignore: false,
    bfd: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.interface) {
      toast.error("Error", "Interface name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      await ospfv3Service.configureInterface({
        interface: formData.interface,
        area: formData.area,
        cost: formData.cost ? parseInt(formData.cost) : undefined,
        priority: formData.priority ? parseInt(formData.priority) : undefined,
        hello_interval: formData.hello_interval ? parseInt(formData.hello_interval) : undefined,
        dead_interval: formData.dead_interval ? parseInt(formData.dead_interval) : undefined,
        network: formData.network || undefined,
        passive: formData.passive,
        mtu_ignore: formData.mtu_ignore,
        bfd: formData.bfd,
      });
      toast.success("Added", `Interface ${formData.interface} added to OSPFv3`);
      onOpenChange(false);
      setFormData({
        interface: "",
        area: "0.0.0.0",
        cost: "",
        priority: "",
        hello_interval: "",
        dead_interval: "",
        network: "",
        passive: false,
        mtu_ignore: false,
        bfd: false,
      });
      onSuccess();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to add interface");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Interface</DialogTitle>
          <DialogDescription>Configure an interface for OSPFv3</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="interface">Interface *</Label>
            <Input
              id="interface"
              placeholder="e.g., eth0"
              value={formData.interface}
              onChange={(e) => setFormData({ ...formData, interface: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="area">Area *</Label>
            <Input
              id="area"
              placeholder="e.g., 0.0.0.0"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Cost</Label>
              <Input
                id="cost"
                type="number"
                placeholder="1-65535"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                placeholder="0-255"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hello">Hello Interval</Label>
              <Input
                id="hello"
                type="number"
                placeholder="seconds"
                value={formData.hello_interval}
                onChange={(e) => setFormData({ ...formData, hello_interval: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dead">Dead Interval</Label>
              <Input
                id="dead"
                type="number"
                placeholder="seconds"
                value={formData.dead_interval}
                onChange={(e) => setFormData({ ...formData, dead_interval: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="network">Network Type</Label>
            <Select
              value={formData.network}
              onValueChange={(value) => setFormData({ ...formData, network: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select network type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Default</SelectItem>
                <SelectItem value="broadcast">Broadcast</SelectItem>
                <SelectItem value="point-to-point">Point-to-Point</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="passive">Passive Interface</Label>
              <Switch
                id="passive"
                checked={formData.passive}
                onCheckedChange={(checked) => setFormData({ ...formData, passive: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="mtu-ignore">MTU Ignore</Label>
              <Switch
                id="mtu-ignore"
                checked={formData.mtu_ignore}
                onCheckedChange={(checked) => setFormData({ ...formData, mtu_ignore: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="bfd">BFD</Label>
              <Switch
                id="bfd"
                checked={formData.bfd}
                onCheckedChange={(checked) => setFormData({ ...formData, bfd: checked })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Interface"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add Area Modal
function AddAreaModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    area: "",
    area_type: "normal",
    no_summary: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.area) {
      toast.error("Error", "Area ID is required");
      return;
    }

    try {
      setIsSubmitting(true);
      await ospfv3Service.addArea({
        area: formData.area,
        area_type: formData.area_type !== "normal" ? formData.area_type : undefined,
        no_summary: formData.no_summary,
      });
      toast.success("Added", `Area ${formData.area} added`);
      onOpenChange(false);
      setFormData({ area: "", area_type: "normal", no_summary: false });
      onSuccess();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to add area");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Area</DialogTitle>
          <DialogDescription>Configure an OSPFv3 area</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="area">Area ID *</Label>
            <Input
              id="area"
              placeholder="e.g., 0.0.0.0 or 0"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Area Type</Label>
            <Select
              value={formData.area_type}
              onValueChange={(value) => setFormData({ ...formData, area_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="stub">Stub</SelectItem>
                <SelectItem value="nssa">NSSA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(formData.area_type === "stub" || formData.area_type === "nssa") && (
            <div className="flex items-center justify-between">
              <Label htmlFor="no-summary">No Summary (Totally Stubby)</Label>
              <Switch
                id="no-summary"
                checked={formData.no_summary}
                onCheckedChange={(checked) => setFormData({ ...formData, no_summary: checked })}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Area"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add Redistribution Modal
function AddRedistributionModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    protocol: "",
    route_map: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.protocol) {
      toast.error("Error", "Protocol is required");
      return;
    }

    try {
      setIsSubmitting(true);
      await ospfv3Service.addRedistribution({
        protocol: formData.protocol,
        route_map: formData.route_map || undefined,
      });
      toast.success("Added", `Redistribution of ${formData.protocol} added`);
      onOpenChange(false);
      setFormData({ protocol: "", route_map: "" });
      onSuccess();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to add redistribution");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Redistribution</DialogTitle>
          <DialogDescription>Redistribute routes into OSPFv3</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="protocol">Protocol *</Label>
            <Select
              value={formData.protocol}
              onValueChange={(value) => setFormData({ ...formData, protocol: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select protocol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bgp">BGP</SelectItem>
                <SelectItem value="connected">Connected</SelectItem>
                <SelectItem value="kernel">Kernel</SelectItem>
                <SelectItem value="ripng">RIPng</SelectItem>
                <SelectItem value="static">Static</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="route-map">Route Map (Optional)</Label>
            <Input
              id="route-map"
              placeholder="e.g., REDIST-MAP"
              value={formData.route_map}
              onChange={(e) => setFormData({ ...formData, route_map: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !formData.protocol}>
            {isSubmitting ? "Adding..." : "Add Redistribution"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Disable OSPFv3 Modal
function DisableOSPFv3Modal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await ospfv3Service.disable();
      toast.success("Disabled", "OSPFv3 has been disabled");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to disable OSPFv3");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable OSPFv3</DialogTitle>
          <DialogDescription>
            Are you sure you want to disable OSPFv3? This will remove all OSPFv3 configuration.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Disabling..." : "Disable OSPFv3"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
