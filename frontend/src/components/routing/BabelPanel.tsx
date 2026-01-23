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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Network,
  Plus,
  Trash2,
  Settings,
  RefreshCw,
  ArrowLeftRight,
  AlertCircle,
  MoreVertical,
  Router,
  Power,
  PowerOff,
  Wifi,
  Cable,
  Radio,
} from "lucide-react";
import {
  babelService,
  type BabelConfig,
  type BabelInterface,
  getInterfaceTypeDisplay,
  getChannelDisplay,
} from "@/lib/api/babel";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

interface BabelPanelProps {
  onUpdate?: () => void;
}

export function BabelPanel({ onUpdate }: BabelPanelProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<BabelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [enableModalOpen, setEnableModalOpen] = useState(false);
  const [addInterfaceModalOpen, setAddInterfaceModalOpen] = useState(false);
  const [addRedistModalOpen, setAddRedistModalOpen] = useState(false);
  const [disableModalOpen, setDisableModalOpen] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await babelService.getConfig();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Babel configuration");
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
      await babelService.deleteInterface(name);
      toast.success("Deleted", `Interface ${name} removed from Babel`);
      handleRefresh();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to delete interface");
    }
  };

  const handleDeleteRedistribution = async (protocol: string) => {
    try {
      await babelService.deleteRedistribution(protocol);
      toast.success("Deleted", `Redistribution of ${protocol} removed`);
      handleRefresh();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to delete redistribution");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading Babel configuration...</span>
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
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <Radio className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Babel Configuration</h2>
              <p className="text-sm text-muted-foreground">Loop-avoiding distance-vector routing</p>
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
                Disable Babel
              </Button>
            )}
          </div>
        </div>

        {!config.configured ? (
          <>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Radio className="h-12 w-12 mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground mb-4">Babel is not configured</p>
                <Button variant="outline" size="sm" onClick={() => setEnableModalOpen(true)}>
                  <Power className="h-4 w-4 mr-2" />
                  Enable Babel
                </Button>
              </CardContent>
            </Card>
            <EnableBabelModal
              open={enableModalOpen}
              onOpenChange={setEnableModalOpen}
              onSuccess={handleRefresh}
            />
          </>
        ) : (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Diversity</p>
                      <p className="text-lg font-medium">
                        {config.parameters?.diversity ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Settings className="h-5 w-5 text-blue-500" />
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
                <TabsTrigger value="redistribution" className="gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  Redistribution ({config.redistributions.length})
                </TabsTrigger>
                <TabsTrigger value="parameters" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Parameters
                </TabsTrigger>
              </TabsList>

              {/* Interfaces Tab */}
              <TabsContent value="interfaces" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Babel Interfaces</CardTitle>
                        <CardDescription>Interfaces participating in Babel</CardDescription>
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
                        <p>No Babel interfaces configured</p>
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

              {/* Redistribution Tab */}
              <TabsContent value="redistribution" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Route Redistribution</CardTitle>
                        <CardDescription>Routes redistributed into Babel</CardDescription>
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
              </TabsContent>

              {/* Parameters Tab */}
              <TabsContent value="parameters" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Babel Parameters</CardTitle>
                    <CardDescription>Global Babel settings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-accent/50">
                        <p className="text-xs text-muted-foreground mb-1">Diversity</p>
                        <Badge variant={config.parameters?.diversity ? "default" : "secondary"}>
                          {config.parameters?.diversity ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      {config.parameters?.diversity_factor && (
                        <div className="p-4 rounded-lg bg-accent/50">
                          <p className="text-xs text-muted-foreground mb-1">Diversity Factor</p>
                          <p className="text-lg font-mono font-medium">
                            {config.parameters.diversity_factor}
                          </p>
                        </div>
                      )}
                      {config.parameters?.resend_delay && (
                        <div className="p-4 rounded-lg bg-accent/50">
                          <p className="text-xs text-muted-foreground mb-1">Resend Delay</p>
                          <p className="text-lg font-mono font-medium">
                            {config.parameters.resend_delay}ms
                          </p>
                        </div>
                      )}
                      {config.parameters?.smoothing_half_life && (
                        <div className="p-4 rounded-lg bg-accent/50">
                          <p className="text-xs text-muted-foreground mb-1">Smoothing Half Life</p>
                          <p className="text-lg font-mono font-medium">
                            {config.parameters.smoothing_half_life}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Modals */}
        <EnableBabelModal
          open={enableModalOpen}
          onOpenChange={setEnableModalOpen}
          onSuccess={handleRefresh}
        />
        <AddInterfaceModal
          open={addInterfaceModalOpen}
          onOpenChange={setAddInterfaceModalOpen}
          onSuccess={handleRefresh}
        />
        <AddRedistributionModal
          open={addRedistModalOpen}
          onOpenChange={setAddRedistModalOpen}
          onSuccess={handleRefresh}
        />
        <DisableBabelModal
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
  iface: BabelInterface;
  onDelete: () => void;
}) {
  const getTypeIcon = (type?: string | null) => {
    switch (type) {
      case "wired":
        return <Cable className="h-4 w-4" />;
      case "wireless":
        return <Wifi className="h-4 w-4" />;
      case "tunnel":
        return <Router className="h-4 w-4" />;
      default:
        return <Network className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-4 rounded-lg bg-accent/50 group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <code className="text-lg font-mono font-medium">{iface.name}</code>
            {iface.type && (
              <Badge variant="outline" className="gap-1">
                {getTypeIcon(iface.type)}
                {getInterfaceTypeDisplay(iface.type)}
              </Badge>
            )}
            {iface.channel && (
              <Badge variant="secondary">
                {getChannelDisplay(iface.channel)}
              </Badge>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {iface.rxcost && (
              <Badge variant="secondary" className="text-xs">
                RXCost: {iface.rxcost}
              </Badge>
            )}
            {iface.hello_interval && (
              <Badge variant="secondary" className="text-xs">
                Hello: {iface.hello_interval}ms
              </Badge>
            )}
            {iface.update_interval && (
              <Badge variant="secondary" className="text-xs">
                Update: {iface.update_interval}ms
              </Badge>
            )}
            {iface.enable_timestamps && (
              <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-500">
                Timestamps
              </Badge>
            )}
            {!iface.split_horizon && (
              <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-600">
                No Split Horizon
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

// Enable Babel Modal
function EnableBabelModal({
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
    diversity: false,
    diversity_factor: "",
    resend_delay: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await babelService.enable({
        diversity: formData.diversity,
        diversity_factor: formData.diversity_factor ? parseInt(formData.diversity_factor) : undefined,
        resend_delay: formData.resend_delay ? parseInt(formData.resend_delay) : undefined,
      });
      toast.success("Enabled", "Babel has been enabled");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to enable Babel");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enable Babel</DialogTitle>
          <DialogDescription>Configure Babel routing protocol</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="diversity">Enable Diversity</Label>
            <Switch
              id="diversity"
              checked={formData.diversity}
              onCheckedChange={(checked) => setFormData({ ...formData, diversity: checked })}
            />
          </div>
          {formData.diversity && (
            <div className="space-y-2">
              <Label htmlFor="diversity-factor">Diversity Factor (Optional)</Label>
              <Input
                id="diversity-factor"
                type="number"
                placeholder="1-256"
                value={formData.diversity_factor}
                onChange={(e) => setFormData({ ...formData, diversity_factor: e.target.value })}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="resend-delay">Resend Delay (Optional)</Label>
            <Input
              id="resend-delay"
              type="number"
              placeholder="20-655340 ms"
              value={formData.resend_delay}
              onChange={(e) => setFormData({ ...formData, resend_delay: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Enabling..." : "Enable Babel"}
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
    type: "",
    channel: "",
    rxcost: "",
    hello_interval: "",
    update_interval: "",
    enable_timestamps: false,
    split_horizon: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.interface) {
      toast.error("Error", "Interface name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      await babelService.configureInterface({
        interface: formData.interface,
        type: formData.type || undefined,
        channel: formData.channel || undefined,
        rxcost: formData.rxcost ? parseInt(formData.rxcost) : undefined,
        hello_interval: formData.hello_interval ? parseInt(formData.hello_interval) : undefined,
        update_interval: formData.update_interval ? parseInt(formData.update_interval) : undefined,
        enable_timestamps: formData.enable_timestamps,
        split_horizon: formData.split_horizon,
      });
      toast.success("Added", `Interface ${formData.interface} added to Babel`);
      onOpenChange(false);
      setFormData({
        interface: "",
        type: "",
        channel: "",
        rxcost: "",
        hello_interval: "",
        update_interval: "",
        enable_timestamps: false,
        split_horizon: true,
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
          <DialogDescription>Configure an interface for Babel</DialogDescription>
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
            <Label htmlFor="type">Interface Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Default</SelectItem>
                <SelectItem value="wired">Wired</SelectItem>
                <SelectItem value="wireless">Wireless</SelectItem>
                <SelectItem value="tunnel">Tunnel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel">Channel</Label>
            <Select
              value={formData.channel}
              onValueChange={(value) => setFormData({ ...formData, channel: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Default</SelectItem>
                <SelectItem value="interfering">Interfering</SelectItem>
                <SelectItem value="non-interfering">Non-Interfering</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rxcost">RXCost</Label>
              <Input
                id="rxcost"
                type="number"
                placeholder="1-65534"
                value={formData.rxcost}
                onChange={(e) => setFormData({ ...formData, rxcost: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hello">Hello Interval</Label>
              <Input
                id="hello"
                type="number"
                placeholder="ms"
                value={formData.hello_interval}
                onChange={(e) => setFormData({ ...formData, hello_interval: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="update">Update Interval</Label>
            <Input
              id="update"
              type="number"
              placeholder="ms"
              value={formData.update_interval}
              onChange={(e) => setFormData({ ...formData, update_interval: e.target.value })}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="timestamps">Enable Timestamps</Label>
              <Switch
                id="timestamps"
                checked={formData.enable_timestamps}
                onCheckedChange={(checked) => setFormData({ ...formData, enable_timestamps: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="split-horizon">Split Horizon</Label>
              <Switch
                id="split-horizon"
                checked={formData.split_horizon}
                onCheckedChange={(checked) => setFormData({ ...formData, split_horizon: checked })}
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
      await babelService.addRedistribution({
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
          <DialogDescription>Redistribute routes into Babel</DialogDescription>
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
                <SelectItem value="isis">IS-IS</SelectItem>
                <SelectItem value="kernel">Kernel</SelectItem>
                <SelectItem value="ospf">OSPF</SelectItem>
                <SelectItem value="rip">RIP</SelectItem>
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

// Disable Babel Modal
function DisableBabelModal({
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
      await babelService.disable();
      toast.success("Disabled", "Babel has been disabled");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to disable Babel");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable Babel</DialogTitle>
          <DialogDescription>
            Are you sure you want to disable Babel? This will remove all Babel configuration.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Disabling..." : "Disable Babel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
