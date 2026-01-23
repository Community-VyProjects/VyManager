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
  Plus,
  Trash2,
  Settings,
  RefreshCw,
  ArrowLeftRight,
  AlertCircle,
  MoreVertical,
  Server,
  Power,
  Layers,
  EyeOff,
  Boxes,
} from "lucide-react";
import {
  openfabricService,
  type OpenFabricConfig,
  type OpenFabricFabric,
  type OpenFabricInterface,
} from "@/lib/api/openfabric";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

interface OpenFabricPanelProps {
  onUpdate?: () => void;
}

export function OpenFabricPanel({ onUpdate }: OpenFabricPanelProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<OpenFabricConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFabric, setSelectedFabric] = useState<string | null>(null);

  // Modal states
  const [createFabricModalOpen, setCreateFabricModalOpen] = useState(false);
  const [addInterfaceModalOpen, setAddInterfaceModalOpen] = useState(false);
  const [addRedistModalOpen, setAddRedistModalOpen] = useState(false);
  const [deleteFabricModalOpen, setDeleteFabricModalOpen] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await openfabricService.getConfig();
      setConfig(data);

      // Auto-select first fabric
      if (data.fabrics.length > 0 && !selectedFabric) {
        setSelectedFabric(data.fabrics[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load OpenFabric configuration");
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

  const currentFabric = config?.fabrics.find(f => f.name === selectedFabric);

  const handleDeleteInterface = async (interfaceName: string) => {
    if (!selectedFabric) return;
    try {
      await openfabricService.deleteInterface(selectedFabric, interfaceName);
      toast.success("Deleted", `Interface ${interfaceName} removed from '${selectedFabric}'`);
      handleRefresh();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to delete interface");
    }
  };

  const handleDeleteRedistribution = async (level: string, protocol: string) => {
    if (!selectedFabric) return;
    try {
      await openfabricService.deleteRedistribution(selectedFabric, level, protocol);
      toast.success("Deleted", `Redistribution of ${protocol} removed from '${selectedFabric}'`);
      handleRefresh();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to delete redistribution");
    }
  };

  const handleToggleLogAdjacency = async () => {
    if (!currentFabric) return;
    try {
      if (currentFabric.log_adjacency_changes) {
        await openfabricService.disableLogAdjacencyChanges(currentFabric.name);
        toast.success("Disabled", "Adjacency logging disabled");
      } else {
        await openfabricService.enableLogAdjacencyChanges(currentFabric.name);
        toast.success("Enabled", "Adjacency logging enabled");
      }
      handleRefresh();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to toggle adjacency logging");
    }
  };

  const handleToggleOverloadBit = async () => {
    if (!currentFabric) return;
    try {
      if (currentFabric.set_overload_bit) {
        await openfabricService.disableOverloadBit(currentFabric.name);
        toast.success("Disabled", "Overload bit disabled");
      } else {
        await openfabricService.enableOverloadBit(currentFabric.name);
        toast.success("Enabled", "Overload bit enabled");
      }
      handleRefresh();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to toggle overload bit");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading OpenFabric configuration...</span>
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
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/10">
              <Boxes className="h-6 w-6 text-cyan-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">OpenFabric Configuration</h2>
              <p className="text-sm text-muted-foreground">IS-IS based data center fabric routing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateFabricModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Fabric
            </Button>
          </div>
        </div>

        {!config.configured || config.fabrics.length === 0 ? (
          <>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Boxes className="h-12 w-12 mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground mb-4">No OpenFabric instances configured</p>
                <Button variant="outline" size="sm" onClick={() => setCreateFabricModalOpen(true)}>
                  <Power className="h-4 w-4 mr-2" />
                  Create Fabric Instance
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="space-y-6">
            {/* Fabric Selector */}
            {config.fabrics.length > 1 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Label>Fabric Instance:</Label>
                    <Select value={selectedFabric || ""} onValueChange={setSelectedFabric}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select fabric" />
                      </SelectTrigger>
                      <SelectContent>
                        {config.fabrics.map((fabric) => (
                          <SelectItem key={fabric.name} value={fabric.name}>
                            {fabric.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentFabric && (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Fabric Name</p>
                          <p className="text-lg font-mono font-medium">{currentFabric.name}</p>
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
                          <p className="text-xs text-muted-foreground">NETs</p>
                          <p className="text-2xl font-bold">{currentFabric.net.length}</p>
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
                          <p className="text-2xl font-bold">{currentFabric.interfaces.length}</p>
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
                          <p className="text-2xl font-bold">{currentFabric.redistributions.length}</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                          <ArrowLeftRight className="h-5 w-5 text-orange-500" />
                        </div>
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
                      Interfaces ({currentFabric.interfaces.length})
                    </TabsTrigger>
                    <TabsTrigger value="redistribution" className="gap-2">
                      <ArrowLeftRight className="h-4 w-4" />
                      Redistribution ({currentFabric.redistributions.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* General Tab */}
                  <TabsContent value="general" className="space-y-4">
                    {/* NETs */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Network Entity Titles (NETs)</CardTitle>
                        <CardDescription>ISO network addresses for this fabric</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {currentFabric.net.map((net, idx) => (
                            <Badge key={idx} variant="outline" className="font-mono">
                              {net}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Options */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">OpenFabric Options</CardTitle>
                        <CardDescription>Global settings for this fabric</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 rounded-lg bg-accent/50">
                            <p className="text-xs text-muted-foreground mb-1">Log Adjacency Changes</p>
                            <div className="flex items-center justify-between">
                              <Badge variant={currentFabric.log_adjacency_changes ? "default" : "secondary"}>
                                {currentFabric.log_adjacency_changes ? "Enabled" : "Disabled"}
                              </Badge>
                              <Switch
                                checked={currentFabric.log_adjacency_changes}
                                onCheckedChange={handleToggleLogAdjacency}
                              />
                            </div>
                          </div>
                          <div className="p-4 rounded-lg bg-accent/50">
                            <p className="text-xs text-muted-foreground mb-1">Overload Bit</p>
                            <div className="flex items-center justify-between">
                              <Badge variant={currentFabric.set_overload_bit ? "default" : "secondary"}>
                                {currentFabric.set_overload_bit ? "Set" : "Not Set"}
                              </Badge>
                              <Switch
                                checked={currentFabric.set_overload_bit}
                                onCheckedChange={handleToggleOverloadBit}
                              />
                            </div>
                          </div>
                          {currentFabric.lsp_gen_interval && (
                            <div className="p-4 rounded-lg bg-accent/50">
                              <p className="text-xs text-muted-foreground mb-1">LSP Gen Interval</p>
                              <p className="text-lg font-mono font-medium">{currentFabric.lsp_gen_interval}s</p>
                            </div>
                          )}
                          {currentFabric.spf_interval && (
                            <div className="p-4 rounded-lg bg-accent/50">
                              <p className="text-xs text-muted-foreground mb-1">SPF Interval</p>
                              <p className="text-lg font-mono font-medium">{currentFabric.spf_interval}s</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Delete Fabric */}
                    <Card className="border-destructive/50">
                      <CardHeader>
                        <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                        <CardDescription>Irreversible actions</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteFabricModalOpen(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Fabric Instance
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Interfaces Tab */}
                  <TabsContent value="interfaces" className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">OpenFabric Interfaces</CardTitle>
                            <CardDescription>Interfaces participating in this fabric</CardDescription>
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
                        {currentFabric.interfaces.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Network className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p>No interfaces configured</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {currentFabric.interfaces.map((iface, idx) => (
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
                            <CardDescription>Routes redistributed into OpenFabric</CardDescription>
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
                        {currentFabric.redistributions.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p>No route redistribution configured</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {currentFabric.redistributions.map((redist, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-4 rounded-lg bg-accent/50 group"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <code className="font-mono font-medium capitalize">
                                      {redist.protocol}
                                    </code>
                                    <Badge variant="outline">{redist.level}</Badge>
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
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
                                  onClick={() => handleDeleteRedistribution(redist.level, redist.protocol)}
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
                </Tabs>
              </>
            )}
          </div>
        )}

        {/* Modals */}
        <CreateFabricModal
          open={createFabricModalOpen}
          onOpenChange={setCreateFabricModalOpen}
          onSuccess={handleRefresh}
        />
        {selectedFabric && (
          <>
            <AddInterfaceModal
              open={addInterfaceModalOpen}
              onOpenChange={setAddInterfaceModalOpen}
              fabricName={selectedFabric}
              onSuccess={handleRefresh}
            />
            <AddRedistributionModal
              open={addRedistModalOpen}
              onOpenChange={setAddRedistModalOpen}
              fabricName={selectedFabric}
              onSuccess={handleRefresh}
            />
            <DeleteFabricModal
              open={deleteFabricModalOpen}
              onOpenChange={setDeleteFabricModalOpen}
              fabricName={selectedFabric}
              onSuccess={() => {
                setSelectedFabric(null);
                handleRefresh();
              }}
            />
          </>
        )}
      </div>
    </ScrollArea>
  );
}

// Interface Card Component
function InterfaceCard({
  iface,
  onDelete,
}: {
  iface: OpenFabricInterface;
  onDelete: () => void;
}) {
  return (
    <div className="p-4 rounded-lg bg-accent/50 group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <code className="text-lg font-mono font-medium">{iface.name}</code>
            {iface.passive && (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-0">
                <EyeOff className="h-3 w-3 mr-1" />
                Passive
              </Badge>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {iface.metric && (
              <Badge variant="secondary" className="text-xs">
                Metric: {iface.metric}
              </Badge>
            )}
            {iface.hello_interval && (
              <Badge variant="secondary" className="text-xs">
                Hello: {iface.hello_interval}s
              </Badge>
            )}
            {iface.hello_multiplier && (
              <Badge variant="secondary" className="text-xs">
                Multiplier: {iface.hello_multiplier}
              </Badge>
            )}
            {iface.password && (
              <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-600">
                Auth Enabled
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

// Create Fabric Modal
function CreateFabricModal({
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
    name: "",
    net: "",
    log_adjacency_changes: false,
    set_overload_bit: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.net) {
      toast.error("Error", "Fabric name and NET are required");
      return;
    }

    try {
      setIsSubmitting(true);
      await openfabricService.createFabric({
        name: formData.name,
        net: formData.net,
        log_adjacency_changes: formData.log_adjacency_changes,
        set_overload_bit: formData.set_overload_bit,
      });
      toast.success("Created", `OpenFabric '${formData.name}' has been created`);
      onOpenChange(false);
      setFormData({ name: "", net: "", log_adjacency_changes: false, set_overload_bit: false });
      onSuccess();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to create fabric");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create OpenFabric Instance</DialogTitle>
          <DialogDescription>Configure a new OpenFabric routing instance</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Fabric Name *</Label>
            <Input
              id="name"
              placeholder="e.g., FABRIC1"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="net">Network Entity Title (NET) *</Label>
            <Input
              id="net"
              placeholder="e.g., 49.0001.0000.0000.0001.00"
              value={formData.net}
              onChange={(e) => setFormData({ ...formData, net: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              ISO address format: area.system-id.selector
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="log-adjacency">Log Adjacency Changes</Label>
            <Switch
              id="log-adjacency"
              checked={formData.log_adjacency_changes}
              onCheckedChange={(checked) => setFormData({ ...formData, log_adjacency_changes: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="overload">Set Overload Bit</Label>
            <Switch
              id="overload"
              checked={formData.set_overload_bit}
              onCheckedChange={(checked) => setFormData({ ...formData, set_overload_bit: checked })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Fabric"}
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
  fabricName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fabricName: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    interface: "",
    passive: false,
    metric: "",
    hello_interval: "",
    hello_multiplier: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.interface) {
      toast.error("Error", "Interface name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      await openfabricService.configureInterface({
        fabric: fabricName,
        interface: formData.interface,
        passive: formData.passive,
        metric: formData.metric ? parseInt(formData.metric) : undefined,
        hello_interval: formData.hello_interval ? parseInt(formData.hello_interval) : undefined,
        hello_multiplier: formData.hello_multiplier ? parseInt(formData.hello_multiplier) : undefined,
      });
      toast.success("Added", `Interface ${formData.interface} added to '${fabricName}'`);
      onOpenChange(false);
      setFormData({ interface: "", passive: false, metric: "", hello_interval: "", hello_multiplier: "" });
      onSuccess();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to add interface");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Interface</DialogTitle>
          <DialogDescription>Configure an interface for '{fabricName}'</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="interface">Interface *</Label>
            <Input
              id="interface"
              placeholder="e.g., eth0"
              value={formData.interface}
              onChange={(e) => setFormData({ ...formData, interface: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="metric">Metric</Label>
              <Input
                id="metric"
                type="number"
                placeholder="0-16777215"
                value={formData.metric}
                onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hello">Hello Interval</Label>
              <Input
                id="hello"
                type="number"
                placeholder="1-600s"
                value={formData.hello_interval}
                onChange={(e) => setFormData({ ...formData, hello_interval: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="multiplier">Hello Multiplier</Label>
            <Input
              id="multiplier"
              type="number"
              placeholder="2-100"
              value={formData.hello_multiplier}
              onChange={(e) => setFormData({ ...formData, hello_multiplier: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="passive">Passive Interface</Label>
            <Switch
              id="passive"
              checked={formData.passive}
              onCheckedChange={(checked) => setFormData({ ...formData, passive: checked })}
            />
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
  fabricName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fabricName: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    level: "level-2",
    protocol: "",
    route_map: "",
    metric: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.protocol) {
      toast.error("Error", "Protocol is required");
      return;
    }

    try {
      setIsSubmitting(true);
      await openfabricService.addRedistribution({
        fabric: fabricName,
        level: formData.level,
        protocol: formData.protocol,
        route_map: formData.route_map || undefined,
        metric: formData.metric ? parseInt(formData.metric) : undefined,
      });
      toast.success("Added", `Redistribution of ${formData.protocol} added to '${fabricName}'`);
      onOpenChange(false);
      setFormData({ level: "level-2", protocol: "", route_map: "", metric: "" });
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
          <DialogDescription>Redistribute routes into '{fabricName}'</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="level">Level *</Label>
            <Select
              value={formData.level}
              onValueChange={(value) => setFormData({ ...formData, level: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="level-1">Level 1</SelectItem>
                <SelectItem value="level-2">Level 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="metric">Metric (Optional)</Label>
            <Input
              id="metric"
              type="number"
              placeholder="Metric value"
              value={formData.metric}
              onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
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

// Delete Fabric Modal
function DeleteFabricModal({
  open,
  onOpenChange,
  fabricName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fabricName: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await openfabricService.deleteFabric(fabricName);
      toast.success("Deleted", `OpenFabric '${fabricName}' has been deleted`);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to delete fabric");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete OpenFabric Instance</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete '{fabricName}'? This will remove all configuration.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Deleting..." : "Delete Fabric"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
