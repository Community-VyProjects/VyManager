"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const tc = useTranslations("common");
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
      setError(err instanceof Error ? err.message : tc("operationFailed"));
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
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tc("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Global Settings Panel
// ============================================================================

function GlobalSettingsPanel({ config, capabilities, onSaved }: { config: HAConfig; capabilities: HACapabilities | null; onSaved: () => void }) {
  const t = useTranslations("highAvailability");
  const tc = useTranslations("common");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startupDelay, setStartupDelay] = useState("");
  const [version, setVersion] = useState("");
  const [snmp, setSnmp] = useState(false);
  const [snmpTrap, setSnmpTrap] = useState(false);

  const { canWrite } = usePermissions();
  const canEdit = canWrite(FeatureGroup.HIGH_AVAILABILITY);
  const snmpTrapSupported = capabilities?.features.vrrp_snmp_trap?.supported ?? false;

  const openDialog = () => {
    setStartupDelay(config.vrrp.global_parameters.startup_delay ?? "");
    setVersion(config.vrrp.global_parameters.version ?? "");
    setSnmp(config.vrrp.snmp);
    setSnmpTrap(config.vrrp.snmp_trap);
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
        // Trap is a child of snmp; only send it when supported and snmp is on,
        // otherwise clear it so it never lingers under a disabled parent.
        ...(snmpTrapSupported ? { snmp_trap: snmp && snmpTrap } : {}),
      });
      onSaved();
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
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
                <span className="text-sm font-medium">{t("globals.title")}</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-5 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("globals.version")}</span>
                  <span className="font-medium">
                    {params.version ? `v${params.version}` : <span className="text-muted-foreground">{tc("default")}</span>}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("globals.startupDelay")}</span>
                  <span className="font-medium">
                    {params.startup_delay ? `${params.startup_delay}s` : <span className="text-muted-foreground">{tc("none")}</span>}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">SNMP</span>
                  <span className="font-medium">
                    {config.vrrp.snmp
                      ? <Badge variant="secondary" className="text-xs py-0">{tc("enabled")}</Badge>
                      : <span className="text-muted-foreground">{tc("disabled")}</span>
                    }
                  </span>
                </div>
                {snmpTrapSupported && config.vrrp.snmp && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{t("globals.traps")}</span>
                    <span className="font-medium">
                      {config.vrrp.snmp_trap
                        ? <Badge variant="secondary" className="text-xs py-0">{tc("enabled")}</Badge>
                        : <span className="text-muted-foreground">{tc("disabled")}</span>
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: edit button */}
            {canEdit && (
              <Button variant="outline" size="sm" onClick={openDialog}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                {tc("edit")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!loading) setDialogOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("globals.title")}</DialogTitle>
            <DialogDescription>
              {t("globals.description")}
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
              <Label>{t("globals.vrrpVersion")}</Label>
              <Select value={version || "default"} onValueChange={(v) => setVersion(v === "default" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{tc("default")}</SelectItem>
                  <SelectItem value="2">{t("globals.versionN", { n: "2" })}</SelectItem>
                  <SelectItem value="3">{t("globals.versionN", { n: "3" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("globals.startupDelayLabel")}</Label>
              <Input
                type="number"
                min={0}
                value={startupDelay}
                onChange={(e) => setStartupDelay(e.target.value)}
                placeholder={t("globals.startupDelayPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("globals.startupDelayHelp")}
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
                  {t("globals.snmpNotifications")}
                </label>
                <p className="text-xs text-muted-foreground">{t("globals.snmpNotificationsHelp")}</p>
              </div>
            </div>

            {snmpTrapSupported && (
              <div className={cn("flex items-center gap-3 rounded-lg border p-3", !snmp && "opacity-50")}>
                <Checkbox
                  id="snmp-trap-dialog"
                  checked={snmpTrap}
                  disabled={!snmp}
                  onCheckedChange={(v) => setSnmpTrap(v === true)}
                />
                <div>
                  <label htmlFor="snmp-trap-dialog" className="text-sm font-medium cursor-pointer">
                    {t("globals.snmpTraps")}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {snmp ? t("globals.snmpTrapsHelp") : t("globals.snmpTrapsNeedsSnmp")}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tc("save")}
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
  const t = useTranslations("highAvailability");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<HAConfig | null>(null);
  const [capabilities, setCapabilities] = useState<HACapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState<"vrrp" | "sync" | "vs">("vrrp");
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
      setError(err instanceof Error ? err.message : t("failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "vrrp" || tabParam === "sync" || tabParam === "vs") {
      setSelectedTab(tabParam);
    }
  }, [searchParams]);

  const handleToggleHA = async () => {
    setTogglingHA(true);
    try {
      await haService.updateGlobalSettings({ disabled: !haDisabled });
      setHaDisabled(!haDisabled);
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("toggleFailed"));
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
        <Button variant="outline" onClick={() => loadData()}>{tc("retry")}</Button>
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
              <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("subtitle")}
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
                    {t("haEnabled")}
                  </label>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                {tc("refresh")}
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
              {t("disabledBanner")}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{vrrpGroupCount}</p>
                    <p className="text-xs text-muted-foreground">{t("vrrpGroups")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("activeGroups")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("syncGroups")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("virtualServers")}</p>
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
              <GlobalSettingsPanel config={config} capabilities={capabilities} onSaved={() => loadData(true)} />
            </div>
          )}

          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as "vrrp" | "sync" | "vs")}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="vrrp" className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  {t("vrrpGroups")}
                  {vrrpGroupCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                      {vrrpGroupCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sync" className="flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5" />
                  {t("syncGroups")}
                  {syncGroupCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                      {syncGroupCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="vs" className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  {t("virtualServers")}
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
                  placeholder={t("search")}
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
                    <Plus className="h-4 w-4 mr-2" /> {t("vrrp.add")}
                  </Button>
                )}
              </div>

              {vrrpGroupCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("vrrp.empty")}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("vrrp.emptyHint")}
                    </p>
                    {canEdit && (
                      <Button size="sm" onClick={() => { setEditingVrrpGroup(null); setVrrpGroupModal(true); }}>
                        <Plus className="h-4 w-4 mr-2" /> {t("vrrp.add")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>VRID</TableHead>
                          <TableHead>{t("interface")}</TableHead>
                          <TableHead>{t("vrrp.virtualIps")}</TableHead>
                          <TableHead>{t("priority")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead className="text-right">{tc("actions")}</TableHead>
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
                                <Badge variant="secondary" className="text-xs">{tc("disabled")}</Badge>
                              ) : (
                                <Badge variant="default" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                  {t("vrrp.active")}
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
                                      title={group.disabled ? t("vrrp.enable") : t("vrrp.disable")}
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
                              {t("vrrp.noMatch", { search })}
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
                    <Plus className="h-4 w-4 mr-2" /> {t("sync.add")}
                  </Button>
                )}
              </div>

              {syncGroupCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <GitBranch className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("sync.empty")}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("sync.emptyHint")}
                    </p>
                    {canEdit && (
                      <Button size="sm" onClick={() => { setEditingSyncGroup(null); setSyncGroupModal(true); }}>
                        <Plus className="h-4 w-4 mr-2" /> {t("sync.add")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("sync.members")}</TableHead>
                          <TableHead>{t("healthCheck")}</TableHead>
                          <TableHead className="text-right">{tc("actions")}</TableHead>
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
                                  {t("sync.pingBadge", { target: sg.health_check.ping })}
                                </Badge>
                              ) : sg.health_check.script ? (
                                <Badge variant="outline" className="text-xs">{t("sync.scriptBadge")}</Badge>
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
                              {t("sync.noMatch", { search })}
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
                    <Plus className="h-4 w-4 mr-2" /> {t("vs.add")}
                  </Button>
                )}
              </div>

              {vsCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Layers className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("vs.empty")}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("vs.emptyHint")}
                    </p>
                    {canEdit && (
                      <Button size="sm" onClick={() => { setEditingVS(null); setVsModal(true); }}>
                        <Plus className="h-4 w-4 mr-2" /> {t("vs.add")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("address")}</TableHead>
                          <TableHead>{t("protocol")}</TableHead>
                          <TableHead>{t("algorithm")}</TableHead>
                          <TableHead>{t("realServers")}</TableHead>
                          <TableHead className="text-right">{tc("actions")}</TableHead>
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
                                {t("vs.serverCount", { count: vs.real_servers.length })}
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
                              {t("vs.noMatch", { search })}
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
        capabilities={capabilities}
        onSubmit={editingVrrpGroup ? handleUpdateVrrpGroup : handleCreateVrrpGroup}
      />

      <SyncGroupModal
        open={syncGroupModal}
        onOpenChange={(o) => { setSyncGroupModal(o); if (!o) setEditingSyncGroup(null); }}
        existingGroup={editingSyncGroup}
        vrrpGroups={config?.vrrp.groups ?? []}
        capabilities={capabilities}
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
        title={t("vrrp.deleteTitle")}
        description={t("vrrp.deleteDescription", { name: String(deletingVrrpGroup?.name) })}
        onConfirm={async () => {
          await haService.deleteVrrpGroup(deletingVrrpGroup!.name);
          setDeletingVrrpGroup(null);
          await loadData(true);
        }}
      />

      <DeleteDialog
        open={!!deletingSyncGroup}
        onOpenChange={(o) => { if (!o) setDeletingSyncGroup(null); }}
        title={t("sync.deleteTitle")}
        description={t("sync.deleteDescription", { name: String(deletingSyncGroup?.name) })}
        onConfirm={async () => {
          await haService.deleteSyncGroup(deletingSyncGroup!.name);
          setDeletingSyncGroup(null);
          await loadData(true);
        }}
      />

      <DeleteDialog
        open={!!deletingVS}
        onOpenChange={(o) => { if (!o) setDeletingVS(null); }}
        title={t("vs.deleteTitle")}
        description={t("vs.deleteDescription", { name: String(deletingVS?.name) })}
        onConfirm={async () => {
          await haService.deleteVirtualServer(deletingVS!.name);
          setDeletingVS(null);
          await loadData(true);
        }}
      />
    </>
  );
}
