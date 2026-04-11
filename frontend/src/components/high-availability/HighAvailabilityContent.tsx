"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  AlertCircle,
  CirclePause,
  CirclePlay,
  GitBranch,
  Info,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings2,
  Shield,
  Trash2,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import {
  haService,
  HAConfig,
  HACapabilities,
  VrrpGroup,
  VrrpSyncGroup,
  VirtualServer,
} from "@/lib/api/high-availability";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { VrrpGroupModal } from "./VrrpGroupModal";
import { SyncGroupModal } from "./SyncGroupModal";
import { VirtualServerModal } from "./VirtualServerModal";

// ============================================================================
// Delete Confirmation Dialog
// ============================================================================

function DeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Global Settings Panel
// ============================================================================

function GlobalSettingsPanel({ config, onSaved }: { config: HAConfig; onSaved: () => void }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startupDelay, setStartupDelay] = useState("");
  const [version, setVersion] = useState("");
  const [snmp, setSnmp] = useState(false);

  const { canWrite } = usePermissions();
  const canEdit = canWrite(FeatureGroup.HIGH_AVAILABILITY);

  const openDialog = () => {
    setStartupDelay(config.vrrp.global_parameters.startup_delay ?? "");
    setVersion(config.vrrp.global_parameters.version ?? "");
    setSnmp(config.vrrp.snmp);
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setError(null);
    setLoading(true);
    try {
      await haService.updateGlobalSettings({
        startup_delay: startupDelay.trim() || null,
        version: version || null,
        snmp,
      });
      onSaved();
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const params = config.vrrp.global_parameters;

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Left: title + current values */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">VRRP Global Settings</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-5 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Version</span>
                  <span className="font-medium">
                    {params.version ? `v${params.version}` : <span className="text-muted-foreground">Default</span>}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Startup delay</span>
                  <span className="font-medium">
                    {params.startup_delay ? `${params.startup_delay}s` : <span className="text-muted-foreground">None</span>}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">SNMP</span>
                  <span className="font-medium">
                    {config.vrrp.snmp
                      ? <Badge variant="secondary" className="text-xs py-0">Enabled</Badge>
                      : <span className="text-muted-foreground">Disabled</span>
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Right: edit button */}
            {canEdit && (
              <Button variant="outline" size="sm" onClick={openDialog}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!loading) setDialogOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>VRRP Global Settings</DialogTitle>
            <DialogDescription>
              Configure global parameters for all VRRP groups
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>VRRP Version</Label>
              <Select value={version || "default"} onValueChange={(v) => setVersion(v === "default" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="2">Version 2</SelectItem>
                  <SelectItem value="3">Version 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Startup Delay (s)</Label>
              <Input
                type="number"
                min={0}
                value={startupDelay}
                onChange={(e) => setStartupDelay(e.target.value)}
                placeholder="0 — no delay"
              />
              <p className="text-xs text-muted-foreground">
                Delay before VRRP starts after system boot
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox
                id="snmp-dialog"
                checked={snmp}
                onCheckedChange={(v) => setSnmp(v === true)}
              />
              <div>
                <label htmlFor="snmp-dialog" className="text-sm font-medium cursor-pointer">
                  SNMP Notifications
                </label>
                <p className="text-xs text-muted-foreground">Send VRRP state change traps via SNMP</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Main Content
// ============================================================================

export function HighAvailabilityContent() {
  const [config, setConfig] = useState<HAConfig | null>(null);
  const [capabilities, setCapabilities] = useState<HACapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [haDisabled, setHaDisabled] = useState(false);
  const [togglingHA, setTogglingHA] = useState(false);

  const { canWrite } = usePermissions();
  const canEdit = canWrite(FeatureGroup.HIGH_AVAILABILITY);

  // ---- Modal state ----
  const [vrrpGroupModal, setVrrpGroupModal] = useState(false);
  const [editingVrrpGroup, setEditingVrrpGroup] = useState<VrrpGroup | null>(null);
  const [deletingVrrpGroup, setDeletingVrrpGroup] = useState<VrrpGroup | null>(null);

  const [syncGroupModal, setSyncGroupModal] = useState(false);
  const [editingSyncGroup, setEditingSyncGroup] = useState<VrrpSyncGroup | null>(null);
  const [deletingSyncGroup, setDeletingSyncGroup] = useState<VrrpSyncGroup | null>(null);

  const [vsModal, setVsModal] = useState(false);
  const [editingVS, setEditingVS] = useState<VirtualServer | null>(null);
  const [deletingVS, setDeletingVS] = useState<VirtualServer | null>(null);

  // ---- Load data ----
  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [cfg, caps] = await Promise.all([
        haService.getConfig(refresh),
        haService.getCapabilities(),
      ]);
      setConfig(cfg);
      setCapabilities(caps);
      setHaDisabled(cfg.disabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleHA = async () => {
    setTogglingHA(true);
    try {
      await haService.updateGlobalSettings({ disabled: !haDisabled });
      setHaDisabled(!haDisabled);
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle HA");
    } finally {
      setTogglingHA(false);
    }
  };

  // ---- Stats ----
  const vrrpGroupCount = config?.vrrp.groups.length ?? 0;
  const syncGroupCount = config?.vrrp.sync_groups.length ?? 0;
  const vsCount = config?.virtual_servers.length ?? 0;
  const activeGroups = config?.vrrp.groups.filter((g) => !g.disabled).length ?? 0;

  // ---- Search filtering ----
  const filteredVrrpGroups = config?.vrrp.groups.filter((g) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.interface?.toLowerCase().includes(q) ||
      g.vrid?.includes(q) ||
      g.addresses.some((a) => a.address.toLowerCase().includes(q))
    );
  }) ?? [];

  const filteredSyncGroups = config?.vrrp.sync_groups.filter((g) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return g.name.toLowerCase().includes(q) || g.members.some((m) => m.toLowerCase().includes(q));
  }) ?? [];

  const filteredVS = config?.virtual_servers.filter((vs) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return vs.name.toLowerCase().includes(q) || vs.address?.toLowerCase().includes(q);
  }) ?? [];

  // ---- Handlers ----
  const handleCreateVrrpGroup = async (group: VrrpGroup) => {
    await haService.createVrrpGroup(group);
    await loadData(true);
  };

  const handleUpdateVrrpGroup = async (group: VrrpGroup) => {
    await haService.updateVrrpGroup(editingVrrpGroup!, group);
    setEditingVrrpGroup(null);
    await loadData(true);
  };

  const handleToggleVrrpGroup = async (group: VrrpGroup) => {
    await haService.toggleVrrpGroup(group.name, !group.disabled);
    await loadData(true);
  };

  const handleCreateSyncGroup = async (group: VrrpSyncGroup) => {
    await haService.createSyncGroup(group);
    await loadData(true);
  };

  const handleUpdateSyncGroup = async (group: VrrpSyncGroup) => {
    await haService.updateSyncGroup(editingSyncGroup!, group);
    setEditingSyncGroup(null);
    await loadData(true);
  };

  const handleCreateVS = async (vs: VirtualServer) => {
    await haService.createVirtualServer(vs);
    await loadData(true);
  };

  const handleUpdateVS = async (vs: VirtualServer) => {
    await haService.updateVirtualServer(editingVS!, vs);
    setEditingVS(null);
    await loadData(true);
  };

  // ---- Render states ----
  if (loading && !config) {
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
        <Button variant="outline" onClick={() => loadData()}>Retry</Button>
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
              <h1 className="text-2xl font-bold text-foreground">High Availability</h1>
              <p className="text-sm text-muted-foreground mt-1">
                VRRP redundancy and load balancing with keepalived
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <Checkbox
                    id="ha-enabled"
                    checked={!haDisabled}
                    onCheckedChange={() => handleToggleHA()}
                    disabled={togglingHA}
                  />
                  <label htmlFor="ha-enabled" className="text-sm font-medium cursor-pointer">
                    HA Enabled
                  </label>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {haDisabled && (
            <div className="mb-4 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
              <Info className="h-4 w-4 shrink-0" />
              High availability is currently disabled. Enable it above to activate VRRP.
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{vrrpGroupCount}</p>
                    <p className="text-xs text-muted-foreground">VRRP Groups</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-green-500/10">
                    <Activity className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeGroups}</p>
                    <p className="text-xs text-muted-foreground">Active Groups</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-blue-500/10">
                    <GitBranch className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{syncGroupCount}</p>
                    <p className="text-xs text-muted-foreground">Sync Groups</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-purple-500/10">
                    <Layers className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{vsCount}</p>
                    <p className="text-xs text-muted-foreground">Virtual Servers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          {/* Global Settings */}
          {config && (
            <div className="mb-4">
              <GlobalSettingsPanel config={config} onSaved={() => loadData(true)} />
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="vrrp">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="vrrp" className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  VRRP Groups
                  {vrrpGroupCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                      {vrrpGroupCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sync" className="flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5" />
                  Sync Groups
                  {syncGroupCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                      {syncGroupCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="vs" className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Virtual Servers
                  {vsCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                      {vsCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* ===== VRRP GROUPS TAB ===== */}
            <TabsContent value="vrrp">
              <div className="flex justify-end mb-3">
                {canEdit && (
                  <Button size="sm" onClick={() => { setEditingVrrpGroup(null); setVrrpGroupModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add VRRP Group
                  </Button>
                )}
              </div>

              {vrrpGroupCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">No VRRP groups configured</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Add a VRRP group to enable router redundancy
                    </p>
                    {canEdit && (
                      <Button size="sm" onClick={() => { setEditingVrrpGroup(null); setVrrpGroupModal(true); }}>
                        <Plus className="h-4 w-4 mr-2" /> Add VRRP Group
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>VRID</TableHead>
                          <TableHead>Interface</TableHead>
                          <TableHead>Virtual IPs</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVrrpGroups.map((group) => (
                          <TableRow key={group.name} className={group.disabled ? "opacity-50" : ""}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                                {group.name}
                              </div>
                              {group.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              {group.vrid ? (
                                <Badge variant="outline" className="font-mono">{group.vrid}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {group.interface ?? <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {group.addresses.slice(0, 2).map((a) => (
                                  <Badge key={a.address} variant="secondary" className="font-mono text-xs">
                                    {a.address}
                                  </Badge>
                                ))}
                                {group.addresses.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{group.addresses.length - 2}
                                  </Badge>
                                )}
                                {group.addresses.length === 0 && (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {group.priority ?? (
                                <span className="text-muted-foreground text-xs">100</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {group.disabled ? (
                                <Badge variant="secondary" className="text-xs">Disabled</Badge>
                              ) : (
                                <Badge variant="default" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                  Active
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {canEdit && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      title={group.disabled ? "Enable" : "Disable"}
                                      onClick={() => handleToggleVrrpGroup(group)}
                                    >
                                      {group.disabled
                                        ? <CirclePlay className="h-4 w-4 text-green-500" />
                                        : <CirclePause className="h-4 w-4 text-yellow-500" />
                                      }
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => { setEditingVrrpGroup(group); setVrrpGroupModal(true); }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => setDeletingVrrpGroup(group)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredVrrpGroups.length === 0 && search && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No groups match &quot;{search}&quot;
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>

            {/* ===== SYNC GROUPS TAB ===== */}
            <TabsContent value="sync">
              <div className="flex justify-end mb-3">
                {canEdit && (
                  <Button size="sm" onClick={() => { setEditingSyncGroup(null); setSyncGroupModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Sync Group
                  </Button>
                )}
              </div>

              {syncGroupCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <GitBranch className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">No sync groups configured</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Sync groups synchronize VRRP state transitions across multiple groups
                    </p>
                    {canEdit && (
                      <Button size="sm" onClick={() => { setEditingSyncGroup(null); setSyncGroupModal(true); }}>
                        <Plus className="h-4 w-4 mr-2" /> Add Sync Group
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Members</TableHead>
                          <TableHead>Health Check</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSyncGroups.map((sg) => (
                          <TableRow key={sg.name}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                                {sg.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {sg.members.map((m) => (
                                  <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                                ))}
                                {sg.members.length === 0 && <span className="text-muted-foreground">—</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              {sg.health_check.ping ? (
                                <Badge variant="outline" className="text-xs font-mono">
                                  ping: {sg.health_check.ping}
                                </Badge>
                              ) : sg.health_check.script ? (
                                <Badge variant="outline" className="text-xs">script</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {canEdit && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => { setEditingSyncGroup(sg); setSyncGroupModal(true); }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => setDeletingSyncGroup(sg)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredSyncGroups.length === 0 && search && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              No sync groups match &quot;{search}&quot;
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>

            {/* ===== VIRTUAL SERVERS TAB ===== */}
            <TabsContent value="vs">
              <div className="flex justify-end mb-3">
                {canEdit && (
                  <Button size="sm" onClick={() => { setEditingVS(null); setVsModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Virtual Server
                  </Button>
                )}
              </div>

              {vsCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Layers className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">No virtual servers configured</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Virtual servers distribute traffic across real backend servers
                    </p>
                    {canEdit && (
                      <Button size="sm" onClick={() => { setEditingVS(null); setVsModal(true); }}>
                        <Plus className="h-4 w-4 mr-2" /> Add Virtual Server
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Protocol</TableHead>
                          <TableHead>Algorithm</TableHead>
                          <TableHead>Real Servers</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVS.map((vs) => (
                          <TableRow key={vs.name}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Server className="h-4 w-4 text-muted-foreground shrink-0" />
                                {vs.name}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {vs.address ? (
                                <span>{vs.address}{vs.port ? `:${vs.port}` : ""}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {vs.protocol ? (
                                <Badge variant="outline" className="text-xs uppercase">
                                  {vs.protocol}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {vs.algorithm ? (
                                <span className="text-sm capitalize">{vs.algorithm.replace(/-/g, " ")}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {vs.real_servers.length} server{vs.real_servers.length !== 1 ? "s" : ""}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {canEdit && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => { setEditingVS(vs); setVsModal(true); }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => setDeletingVS(vs)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredVS.length === 0 && search && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No virtual servers match &quot;{search}&quot;
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ===== MODALS ===== */}

      <VrrpGroupModal
        open={vrrpGroupModal}
        onOpenChange={(o) => { setVrrpGroupModal(o); if (!o) setEditingVrrpGroup(null); }}
        existingGroup={editingVrrpGroup}
        onSubmit={editingVrrpGroup ? handleUpdateVrrpGroup : handleCreateVrrpGroup}
      />

      <SyncGroupModal
        open={syncGroupModal}
        onOpenChange={(o) => { setSyncGroupModal(o); if (!o) setEditingSyncGroup(null); }}
        existingGroup={editingSyncGroup}
        vrrpGroups={config?.vrrp.groups ?? []}
        onSubmit={editingSyncGroup ? handleUpdateSyncGroup : handleCreateSyncGroup}
      />

      <VirtualServerModal
        open={vsModal}
        onOpenChange={(o) => { setVsModal(o); if (!o) setEditingVS(null); }}
        existingServer={editingVS}
        onSubmit={editingVS ? handleUpdateVS : handleCreateVS}
      />

      {/* Delete dialogs */}
      <DeleteDialog
        open={!!deletingVrrpGroup}
        onOpenChange={(o) => { if (!o) setDeletingVrrpGroup(null); }}
        title="Delete VRRP Group"
        description={`Delete VRRP group "${deletingVrrpGroup?.name}"? This action cannot be undone.`}
        onConfirm={async () => {
          await haService.deleteVrrpGroup(deletingVrrpGroup!.name);
          setDeletingVrrpGroup(null);
          await loadData(true);
        }}
      />

      <DeleteDialog
        open={!!deletingSyncGroup}
        onOpenChange={(o) => { if (!o) setDeletingSyncGroup(null); }}
        title="Delete Sync Group"
        description={`Delete sync group "${deletingSyncGroup?.name}"? This action cannot be undone.`}
        onConfirm={async () => {
          await haService.deleteSyncGroup(deletingSyncGroup!.name);
          setDeletingSyncGroup(null);
          await loadData(true);
        }}
      />

      <DeleteDialog
        open={!!deletingVS}
        onOpenChange={(o) => { if (!o) setDeletingVS(null); }}
        title="Delete Virtual Server"
        description={`Delete virtual server "${deletingVS?.name}"? This action cannot be undone.`}
        onConfirm={async () => {
          await haService.deleteVirtualServer(deletingVS!.name);
          setDeletingVS(null);
          await loadData(true);
        }}
      />
    </>
  );
}
