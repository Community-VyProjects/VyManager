"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Router,
  Layers,
  Activity,
  Shield,
} from "lucide-react";
import {
  isisService,
  type ISISConfig,
  type ISISInterface,
} from "@/lib/api/isis";
import { useToast } from "@/hooks/useToast";

interface ISISPanelProps {
  onUpdate?: () => void;
}

export function ISISPanel({ onUpdate }: ISISPanelProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<ISISConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const capabilities = isisService.getCapabilities();

  // Modal states
  const [enableModalOpen, setEnableModalOpen] = useState(false);
  const [addInterfaceModalOpen, setAddInterfaceModalOpen] = useState(false);
  const [addRedistributionModalOpen, setAddRedistributionModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Form states
  const [newNET, setNewNET] = useState("");
  const [newISType, setNewISType] = useState("");
  const [dynamicHostname, setDynamicHostname] = useState(false);
  const [metricStyle, setMetricStyle] = useState("");

  // Interface form
  const [newIfaceName, setNewIfaceName] = useState("");
  const [newIfacePassive, setNewIfacePassive] = useState(false);
  const [newIfaceCircuitType, setNewIfaceCircuitType] = useState("");
  const [newIfaceMetric, setNewIfaceMetric] = useState("");
  const [newIfaceBfd, setNewIfaceBfd] = useState(false);

  // Redistribution form
  const [newRedistLevel, setNewRedistLevel] = useState("");
  const [newRedistProtocol, setNewRedistProtocol] = useState("");
  const [newRedistMetric, setNewRedistMetric] = useState("");
  const [newRedistRouteMap, setNewRedistRouteMap] = useState("");

  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await isisService.getConfig();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load IS-IS configuration");
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

  const handleEnableISIS = async () => {
    if (!newNET.trim()) {
      toast.error("Error", "NET is required");
      return;
    }
    setSaving(true);
    try {
      const response = await isisService.enable({
        net: newNET.trim(),
        isType: newISType || undefined,
        dynamicHostname,
        metricStyle: metricStyle || undefined,
      });
      if (response.success) {
        toast.success("Success", "IS-IS enabled");
        setEnableModalOpen(false);
        setNewNET("");
        setNewISType("");
        setDynamicHostname(false);
        setMetricStyle("");
        handleRefresh();
      } else {
        toast.error("Error", response.error || "Failed to enable IS-IS");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to enable IS-IS");
    } finally {
      setSaving(false);
    }
  };

  const handleDisableISIS = async () => {
    if (!confirm("Are you sure you want to disable IS-IS? This will remove all IS-IS configuration.")) {
      return;
    }

    try {
      const response = await isisService.disable();
      if (response.success) {
        toast.success("Success", "IS-IS disabled");
        handleRefresh();
      } else {
        toast.error("Error", response.error || "Failed to disable IS-IS");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to disable IS-IS");
    }
  };

  const handleAddInterface = async () => {
    if (!newIfaceName.trim()) return;
    setSaving(true);
    try {
      const response = await isisService.configureInterface(newIfaceName.trim(), {
        passive: newIfacePassive,
        circuitType: newIfaceCircuitType || undefined,
        metric: newIfaceMetric ? parseInt(newIfaceMetric) : undefined,
        bfd: newIfaceBfd,
      });
      if (response.success) {
        toast.success("Success", `Interface ${newIfaceName} added`);
        setAddInterfaceModalOpen(false);
        setNewIfaceName("");
        setNewIfacePassive(false);
        setNewIfaceCircuitType("");
        setNewIfaceMetric("");
        setNewIfaceBfd(false);
        handleRefresh();
      } else {
        toast.error("Error", response.error || "Failed to add interface");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to add interface");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveInterface = async (interfaceName: string) => {
    try {
      const response = await isisService.removeInterface(interfaceName);
      if (response.success) {
        toast.success("Success", `Interface ${interfaceName} removed`);
        handleRefresh();
      } else {
        toast.error("Error", response.error || "Failed to remove interface");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to remove interface");
    }
  };

  const handleAddRedistribution = async () => {
    if (!newRedistLevel || !newRedistProtocol) return;
    setSaving(true);
    try {
      const response = await isisService.addRedistribution(newRedistLevel, newRedistProtocol, {
        metric: newRedistMetric ? parseInt(newRedistMetric) : undefined,
        routeMap: newRedistRouteMap || undefined,
      });
      if (response.success) {
        toast.success("Success", `Redistribution of ${newRedistProtocol} added`);
        setAddRedistributionModalOpen(false);
        setNewRedistLevel("");
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

  const handleRemoveRedistribution = async (level: string, protocol: string) => {
    try {
      const response = await isisService.removeRedistribution(level, protocol);
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

  const handleToggleOverloadBit = async () => {
    try {
      const response = config?.set_overload_bit
        ? await isisService.disableOverloadBit()
        : await isisService.enableOverloadBit();
      if (response.success) {
        toast.success("Success", config?.set_overload_bit ? "Overload bit disabled" : "Overload bit enabled");
        handleRefresh();
      } else {
        toast.error("Error", response.error || "Failed to toggle overload bit");
      }
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to toggle overload bit");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading IS-IS configuration...</span>
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
              <Shield className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">IS-IS Configuration</h2>
              <p className="text-sm text-muted-foreground">Intermediate System to Intermediate System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {config.configured && (
              <Button variant="destructive" size="sm" onClick={handleDisableISIS}>
                <Trash2 className="h-4 w-4 mr-2" />
                Disable IS-IS
              </Button>
            )}
          </div>
        </div>

        {!config.configured ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground mb-4">IS-IS is not configured</p>
              <Button onClick={() => setEnableModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Enable IS-IS
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                    <Activity className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IS Type</p>
                    <p className="text-lg font-semibold">{config.is_type || "Not set"}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <Globe className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">NETs</p>
                    <p className="text-lg font-semibold">{config.net.length}</p>
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                    <Layers className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Metric Style</p>
                    <p className="text-lg font-semibold">{config.metric_style || "Default"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="general" className="space-y-4">
              <TabsList>
                <TabsTrigger value="general" className="gap-2">
                  <Settings className="h-4 w-4" />
                  General
                </TabsTrigger>
                <TabsTrigger value="interfaces" className="gap-2">
                  <Network className="h-4 w-4" />
                  Interfaces
                </TabsTrigger>
                <TabsTrigger value="redistributions" className="gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  Redistributions
                </TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Network Entity Titles (NETs)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {config.net.length === 0 ? (
                      <p className="text-muted-foreground">No NETs configured</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {config.net.map((net) => (
                          <Badge key={net} variant="secondary" className="font-mono">
                            {net}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Dynamic Hostname</span>
                        <Badge variant={config.dynamic_hostname ? "default" : "secondary"}>
                          {config.dynamic_hostname ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Purge Originator</span>
                        <Badge variant={config.purge_originator ? "default" : "secondary"}>
                          {config.purge_originator ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Attached Bit</span>
                        <Badge variant={config.set_attached_bit ? "default" : "secondary"}>
                          {config.set_attached_bit ? "Set" : "Not Set"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Overload Bit</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={config.set_overload_bit ? "destructive" : "secondary"}>
                            {config.set_overload_bit ? "Set" : "Not Set"}
                          </Badge>
                          <Button variant="outline" size="sm" onClick={handleToggleOverloadBit}>
                            Toggle
                          </Button>
                        </div>
                      </div>
                    </div>

                    {(config.lsp_mtu || config.lsp_gen_interval || config.max_lsp_lifetime) && (
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">LSP Parameters</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">MTU:</span>
                            <span className="ml-2">{config.lsp_mtu || "Default"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Gen Interval:</span>
                            <span className="ml-2">{config.lsp_gen_interval || "Default"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Max Lifetime:</span>
                            <span className="ml-2">{config.max_lsp_lifetime || "Default"}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Interfaces Tab */}
              <TabsContent value="interfaces" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">IS-IS Interfaces</h3>
                  <Button size="sm" onClick={() => setAddInterfaceModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Interface
                  </Button>
                </div>

                {config.interfaces.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Network className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">No interfaces configured</p>
                      <Button size="sm" onClick={() => setAddInterfaceModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Interface
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Interface</TableHead>
                          <TableHead>Circuit Type</TableHead>
                          <TableHead>Metric</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.interfaces.map((iface) => (
                          <TableRow key={iface.name}>
                            <TableCell className="font-medium">{iface.name}</TableCell>
                            <TableCell>{iface.circuit_type || "-"}</TableCell>
                            <TableCell>{iface.metric ?? "-"}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {iface.passive && <Badge variant="secondary">Passive</Badge>}
                                {iface.bfd && <Badge variant="outline">BFD</Badge>}
                                {iface.network && <Badge variant="outline">{iface.network}</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveInterface(iface.name)}
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
                          <TableHead>Level</TableHead>
                          <TableHead>Protocol</TableHead>
                          <TableHead>Metric</TableHead>
                          <TableHead>Route Map</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.redistributions.map((redist) => (
                          <TableRow key={`${redist.level}-${redist.protocol}`}>
                            <TableCell>
                              <Badge variant="outline">{redist.level}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{redist.protocol}</Badge>
                            </TableCell>
                            <TableCell>{redist.metric ?? "-"}</TableCell>
                            <TableCell>{redist.route_map || "-"}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveRedistribution(redist.level, redist.protocol)}
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
            </Tabs>
          </>
        )}
      </div>

      {/* Enable IS-IS Modal */}
      <Dialog open={enableModalOpen} onOpenChange={setEnableModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable IS-IS</DialogTitle>
            <DialogDescription>Configure IS-IS routing protocol</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>NET (Network Entity Title) *</Label>
              <Input
                value={newNET}
                onChange={(e) => setNewNET(e.target.value)}
                placeholder="e.g., 49.0001.0000.0000.0001.00"
              />
              <p className="text-xs text-muted-foreground">
                Format: Area.SystemID.NSEL (e.g., 49.0001.1921.6800.0001.00)
              </p>
            </div>
            <div className="space-y-2">
              <Label>IS Type</Label>
              <Select value={newISType} onValueChange={setNewISType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {capabilities.is_types.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label} - {t.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Metric Style</Label>
              <Select value={metricStyle} onValueChange={setMetricStyle}>
                <SelectTrigger>
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default</SelectItem>
                  {capabilities.metric_styles.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label} - {s.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Dynamic Hostname</Label>
              <Switch checked={dynamicHostname} onCheckedChange={setDynamicHostname} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnableModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnableISIS} disabled={saving || !newNET.trim()}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Enabling...
                </>
              ) : (
                "Enable IS-IS"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Interface Modal */}
      <Dialog open={addInterfaceModalOpen} onOpenChange={setAddInterfaceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Interface</DialogTitle>
            <DialogDescription>Configure an interface for IS-IS</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Interface Name *</Label>
              <Input
                value={newIfaceName}
                onChange={(e) => setNewIfaceName(e.target.value)}
                placeholder="e.g., eth0"
              />
            </div>
            <div className="space-y-2">
              <Label>Circuit Type</Label>
              <Select value={newIfaceCircuitType} onValueChange={setNewIfaceCircuitType}>
                <SelectTrigger>
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default</SelectItem>
                  {capabilities.circuit_types.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Metric</Label>
              <Input
                type="number"
                value={newIfaceMetric}
                onChange={(e) => setNewIfaceMetric(e.target.value)}
                placeholder="1-16777215"
                min={1}
                max={16777215}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Passive</Label>
              <Switch checked={newIfacePassive} onCheckedChange={setNewIfacePassive} />
            </div>
            <div className="flex items-center justify-between">
              <Label>BFD</Label>
              <Switch checked={newIfaceBfd} onCheckedChange={setNewIfaceBfd} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddInterfaceModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddInterface} disabled={saving || !newIfaceName.trim()}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Interface"
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
              <Label>Level *</Label>
              <Select value={newRedistLevel} onValueChange={setNewRedistLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {capabilities.levels.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Protocol *</Label>
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
                placeholder="Metric value"
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
            <Button onClick={handleAddRedistribution} disabled={saving || !newRedistLevel || !newRedistProtocol}>
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
    </ScrollArea>
  );
}
