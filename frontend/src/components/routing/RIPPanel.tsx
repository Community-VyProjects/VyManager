"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Network,
  Plus,
  Trash2,
  Settings,
  RefreshCw,
  Globe,
  ArrowLeftRight,
  AlertCircle,
  MoreVertical,
  Router,
  Timer,
  Activity,
} from "lucide-react";
import {
  ripService,
  type RIPConfig,
  type RIPInterface,
  type RIPRedistribution,
} from "@/lib/api/rip";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

interface RIPPanelProps {
  onUpdate?: () => void;
}

export function RIPPanel({ onUpdate }: RIPPanelProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<RIPConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const capabilities = ripService.getCapabilities();

  // Modal states
  const [enableModalOpen, setEnableModalOpen] = useState(false);
  const [addNetworkModalOpen, setAddNetworkModalOpen] = useState(false);
  const [addRedistributionModalOpen, setAddRedistributionModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [timersModalOpen, setTimersModalOpen] = useState(false);

  // Form states
  const [newNetwork, setNewNetwork] = useState("");
  const [newRedistProtocol, setNewRedistProtocol] = useState("");
  const [newRedistMetric, setNewRedistMetric] = useState("");
  const [newRedistRouteMap, setNewRedistRouteMap] = useState("");
  const [ripVersion, setRipVersion] = useState("");
  const [defaultOriginate, setDefaultOriginate] = useState(false);
  const [updateTimer, setUpdateTimer] = useState("");
  const [timeoutTimer, setTimeoutTimer] = useState("");
  const [gcTimer, setGcTimer] = useState("");

  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ripService.getConfig();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load RIP configuration");
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

  const handleEnableRIP = async () => {
    setSaving(true);
    try {
      const response = await ripService.enable({
        version: ripVersion || undefined,
        defaultInformationOriginate: defaultOriginate,
      });
      if (response.success) {
        toast.success("Success", "RIP enabled");
        setEnableModalOpen(false);
        handleRefresh();
      } else {
        toast.error("Error", response.error || "Failed to enable RIP");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to enable RIP");
    } finally {
      setSaving(false);
    }
  };

  const handleDisableRIP = async () => {
    if (!confirm("Are you sure you want to disable RIP? This will remove all RIP configuration.")) {
      return;
    }

    try {
      const response = await ripService.disable();
      if (response.success) {
        toast.success("Success", "RIP disabled");
        handleRefresh();
      } else {
        toast.error("Error", response.error || "Failed to disable RIP");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to disable RIP");
    }
  };

  const handleAddNetwork = async () => {
    if (!newNetwork.trim()) return;
    setSaving(true);
    try {
      const response = await ripService.addNetwork(newNetwork.trim());
      if (response.success) {
        toast.success("Success", `Network ${newNetwork} added`);
        setAddNetworkModalOpen(false);
        setNewNetwork("");
        handleRefresh();
      } else {
        toast.error("Error", response.error || "Failed to add network");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to add network");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveNetwork = async (network: string) => {
    try {
      const response = await ripService.removeNetwork(network);
      if (response.success) {
        toast.success("Success", `Network ${network} removed`);
        handleRefresh();
      } else {
        toast.error("Error", response.error || "Failed to remove network");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to remove network");
    }
  };

  const handleAddRedistribution = async () => {
    if (!newRedistProtocol) return;
    setSaving(true);
    try {
      const response = await ripService.addRedistribution(newRedistProtocol, {
        metric: newRedistMetric ? parseInt(newRedistMetric) : undefined,
        routeMap: newRedistRouteMap || undefined,
      });
      if (response.success) {
        toast.success("Success", `Redistribution of ${newRedistProtocol} added`);
        setAddRedistributionModalOpen(false);
        setNewRedistProtocol("");
        setNewRedistMetric("");
        setNewRedistRouteMap("");
        handleRefresh();
      } else {
        toast.error("Error", response.error || "Failed to add redistribution");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to add redistribution");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRedistribution = async (protocol: string) => {
    try {
      const response = await ripService.removeRedistribution(protocol);
      if (response.success) {
        toast.success("Success", `Redistribution of ${protocol} removed`);
        handleRefresh();
      } else {
        toast.error("Error", response.error || "Failed to remove redistribution");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to remove redistribution");
    }
  };

  const handleUpdateSettings = async () => {
    setSaving(true);
    try {
      // Update version if changed
      if (ripVersion && ripVersion !== config?.version) {
        await ripService.setVersion(ripVersion);
      }

      // Update default originate
      if (defaultOriginate && !config?.default_information_originate) {
        await ripService.enableDefaultOriginate();
      } else if (!defaultOriginate && config?.default_information_originate) {
        await ripService.disableDefaultOriginate();
      }

      toast.success("Success", "Settings updated");
      setSettingsModalOpen(false);
      handleRefresh();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTimers = async () => {
    setSaving(true);
    try {
      await ripService.setTimers({
        update: updateTimer ? parseInt(updateTimer) : undefined,
        timeout: timeoutTimer ? parseInt(timeoutTimer) : undefined,
        garbageCollection: gcTimer ? parseInt(gcTimer) : undefined,
      });
      toast.success("Success", "Timers updated");
      setTimersModalOpen(false);
      handleRefresh();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to update timers");
    } finally {
      setSaving(false);
    }
  };

  const openSettingsModal = () => {
    setRipVersion(config?.version || "");
    setDefaultOriginate(config?.default_information_originate || false);
    setSettingsModalOpen(true);
  };

  const openTimersModal = () => {
    setUpdateTimer(config?.timers?.update?.toString() || "");
    setTimeoutTimer(config?.timers?.timeout?.toString() || "");
    setGcTimer(config?.timers?.garbage_collection?.toString() || "");
    setTimersModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading RIP configuration...</span>
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
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
              <Router className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">RIP Configuration</h2>
              <p className="text-sm text-muted-foreground">Routing Information Protocol</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {config.configured && (
              <>
                <Button variant="outline" size="sm" onClick={openSettingsModal}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDisableRIP}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Disable RIP
                </Button>
              </>
            )}
          </div>
        </div>

        {!config.configured ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Router className="h-12 w-12 mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground mb-4">RIP is not configured</p>
              <Button onClick={() => setEnableModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Enable RIP
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                    <Activity className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Version</p>
                    <p className="text-lg font-semibold">{config.version || "Default"}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <Globe className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Networks</p>
                    <p className="text-lg font-semibold">{config.networks.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                    <Network className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Interfaces</p>
                    <p className="text-lg font-semibold">{config.interfaces.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                    <ArrowLeftRight className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Redistributions</p>
                    <p className="text-lg font-semibold">{config.redistributions.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="networks" className="space-y-4">
              <TabsList>
                <TabsTrigger value="networks" className="gap-2">
                  <Globe className="h-4 w-4" />
                  Networks
                </TabsTrigger>
                <TabsTrigger value="redistributions" className="gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  Redistributions
                </TabsTrigger>
                <TabsTrigger value="timers" className="gap-2">
                  <Timer className="h-4 w-4" />
                  Timers
                </TabsTrigger>
              </TabsList>

              {/* Networks Tab */}
              <TabsContent value="networks" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">RIP Networks</h3>
                  <Button size="sm" onClick={() => setAddNetworkModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Network
                  </Button>
                </div>

                {config.networks.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">No networks configured</p>
                      <Button size="sm" onClick={() => setAddNetworkModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Network
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Network</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.networks.map((network) => (
                          <TableRow key={network}>
                            <TableCell className="font-mono">{network}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveNetwork(network)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </TabsContent>

              {/* Redistributions Tab */}
              <TabsContent value="redistributions" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Protocol Redistribution</h3>
                  <Button size="sm" onClick={() => setAddRedistributionModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Redistribution
                  </Button>
                </div>

                {config.redistributions.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">No redistributions configured</p>
                      <Button size="sm" onClick={() => setAddRedistributionModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Redistribution
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Protocol</TableHead>
                          <TableHead>Metric</TableHead>
                          <TableHead>Route Map</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.redistributions.map((redist) => (
                          <TableRow key={redist.protocol}>
                            <TableCell>
                              <Badge variant="outline">{redist.protocol}</Badge>
                            </TableCell>
                            <TableCell>{redist.metric ?? "-"}</TableCell>
                            <TableCell>{redist.route_map || "-"}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveRedistribution(redist.protocol)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </TabsContent>

              {/* Timers Tab */}
              <TabsContent value="timers" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">RIP Timers</h3>
                  <Button size="sm" onClick={openTimersModal}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Timers
                  </Button>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-3 gap-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Update Timer</p>
                        <p className="text-2xl font-semibold">
                          {config.timers?.update ?? capabilities.default_timers.update}s
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Default: {capabilities.default_timers.update}s
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Timeout Timer</p>
                        <p className="text-2xl font-semibold">
                          {config.timers?.timeout ?? capabilities.default_timers.timeout}s
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Default: {capabilities.default_timers.timeout}s
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Garbage Collection</p>
                        <p className="text-2xl font-semibold">
                          {config.timers?.garbage_collection ?? capabilities.default_timers.garbage_collection}s
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Default: {capabilities.default_timers.garbage_collection}s
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Default Information Originate</span>
                        <Badge variant={config.default_information_originate ? "default" : "secondary"}>
                          {config.default_information_originate ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Administrative Distance</span>
                        <span>{config.default_distance ?? "120 (default)"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Enable RIP Modal */}
      <Dialog open={enableModalOpen} onOpenChange={setEnableModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable RIP</DialogTitle>
            <DialogDescription>Configure basic RIP settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>RIP Version</Label>
              <Select value={ripVersion} onValueChange={setRipVersion}>
                <SelectTrigger>
                  <SelectValue placeholder="Default (both)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default (both)</SelectItem>
                  {capabilities.versions.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Default Information Originate</Label>
              <Switch checked={defaultOriginate} onCheckedChange={setDefaultOriginate} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnableModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnableRIP} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Enabling...
                </>
              ) : (
                "Enable RIP"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Network Modal */}
      <Dialog open={addNetworkModalOpen} onOpenChange={setAddNetworkModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Network</DialogTitle>
            <DialogDescription>Add a network to RIP</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Network (CIDR notation)</Label>
              <Input
                value={newNetwork}
                onChange={(e) => setNewNetwork(e.target.value)}
                placeholder="e.g., 10.0.0.0/8"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNetworkModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNetwork} disabled={saving || !newNetwork.trim()}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Network"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Redistribution Modal */}
      <Dialog open={addRedistributionModalOpen} onOpenChange={setAddRedistributionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Redistribution</DialogTitle>
            <DialogDescription>Redistribute routes from another protocol</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={newRedistProtocol} onValueChange={setNewRedistProtocol}>
                <SelectTrigger>
                  <SelectValue placeholder="Select protocol" />
                </SelectTrigger>
                <SelectContent>
                  {capabilities.redistribute_protocols.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Metric (optional)</Label>
              <Input
                type="number"
                value={newRedistMetric}
                onChange={(e) => setNewRedistMetric(e.target.value)}
                placeholder="0-16"
                min={0}
                max={16}
              />
            </div>
            <div className="space-y-2">
              <Label>Route Map (optional)</Label>
              <Input
                value={newRedistRouteMap}
                onChange={(e) => setNewRedistRouteMap(e.target.value)}
                placeholder="Route map name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRedistributionModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRedistribution} disabled={saving || !newRedistProtocol}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Redistribution"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>RIP Settings</DialogTitle>
            <DialogDescription>Configure RIP settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>RIP Version</Label>
              <Select value={ripVersion} onValueChange={setRipVersion}>
                <SelectTrigger>
                  <SelectValue placeholder="Default (both)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default (both)</SelectItem>
                  {capabilities.versions.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Default Information Originate</Label>
              <Switch checked={defaultOriginate} onCheckedChange={setDefaultOriginate} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSettings} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timers Modal */}
      <Dialog open={timersModalOpen} onOpenChange={setTimersModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>RIP Timers</DialogTitle>
            <DialogDescription>Configure RIP timer values</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Update Timer (seconds)</Label>
              <Input
                type="number"
                value={updateTimer}
                onChange={(e) => setUpdateTimer(e.target.value)}
                placeholder={`Default: ${capabilities.default_timers.update}`}
                min={5}
                max={65535}
              />
            </div>
            <div className="space-y-2">
              <Label>Timeout Timer (seconds)</Label>
              <Input
                type="number"
                value={timeoutTimer}
                onChange={(e) => setTimeoutTimer(e.target.value)}
                placeholder={`Default: ${capabilities.default_timers.timeout}`}
                min={5}
                max={65535}
              />
            </div>
            <div className="space-y-2">
              <Label>Garbage Collection Timer (seconds)</Label>
              <Input
                type="number"
                value={gcTimer}
                onChange={(e) => setGcTimer(e.target.value)}
                placeholder={`Default: ${capabilities.default_timers.garbage_collection}`}
                min={5}
                max={65535}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimersModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTimers} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Timers"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}
