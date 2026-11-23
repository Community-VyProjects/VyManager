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
import { NamedListSelect } from "@/components/ui/named-list-select";
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
import type { ApiError } from "@/lib/types/api";
import {
  haService,
  HAConfig,
  HACapabilities,
  VrrpGroup,
  VrrpSyncGroup,
  VirtualServer,
} from "@/lib/api/high-availability";
import {
  HA_RANGES,
  haGlobalsDraft,
  haGlobalsProblem,
  type HAGlobalsDraft,
  type VirtualServerDraft,
  type VrrpGroupDraft,
  type VrrpSyncGroupDraft,
} from "@/lib/api/high-availability-save-ops";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { HA_FIELD_LABELS } from "./ha-field-labels";
import { GarpFields } from "./HaSectionFields";
import { VrrpGroupModal } from "./VrrpGroupModal";
import { SyncGroupModal } from "./SyncGroupModal";
import { VirtualServerModal } from "./VirtualServerModal";

// ============================================================================
// Confirm Dialog (delete, enable, disable)
// ============================================================================

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  destructive = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
}) {
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = (o: boolean) => {
    if (loading) return;
    if (!o) setError(null);
    onOpenChange(o);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
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
          <Button variant="outline" onClick={() => close(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {actionLabel}
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
  const [draft, setDraft] = useState<HAGlobalsDraft>(() => haGlobalsDraft(config));

  const { canWrite } = usePermissions();
  const canEdit = canWrite(FeatureGroup.HIGH_AVAILABILITY);
  const snmpTrapSupported = capabilities?.features.vrrp_snmp_trap?.supported ?? false;
  const vrrpVersions = capabilities?.vrrp_versions || [];

  const openDialog = () => {
    setDraft(haGlobalsDraft(config));
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setError(null);
    const problem = haGlobalsProblem(draft);
    if (problem) {
      setError(t("outOfRange", {
        field: t(HA_FIELD_LABELS[problem.field!]),
        min: problem.min!,
        max: problem.max!,
      }));
      return;
    }
    setLoading(true);
    try {
      await haService.saveGlobals(config, draft, { snmpTrap: snmpTrapSupported });
      onSaved();
      setDialogOpen(false);
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
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
        <DialogContent className="max-w-lg max-h-[88vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t("globals.title")}</DialogTitle>
            <DialogDescription>
              {t("globals.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          <div className="space-y-4 py-2">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>{t("globals.vrrpVersion")}</Label>
              <NamedListSelect
                value={draft.version}
                onValueChange={(v) => setDraft((p) => ({ ...p, version: v }))}
                names={vrrpVersions}
                noneLabel={tc("default")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("globals.startupDelayLabel")}</Label>
              <Input
                type="number"
                {...HA_RANGES.startup_delay}
                value={draft.startup_delay}
                onChange={(e) => setDraft((p) => ({ ...p, startup_delay: e.target.value }))}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("garp")}</Label>
              <GarpFields value={draft.garp} onChange={(garp) => setDraft((p) => ({ ...p, garp }))} />
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox
                id="snmp-dialog"
                checked={draft.snmp}
                onCheckedChange={(v) => setDraft((p) => ({ ...p, snmp: v === true }))}
              />
              <label htmlFor="snmp-dialog" className="text-sm font-medium cursor-pointer">
                {t("globals.snmpNotifications")}
              </label>
            </div>

            {snmpTrapSupported && (
              <div className={cn("flex items-center gap-3 rounded-lg border p-3", !draft.snmp && "opacity-50")}>
                <Checkbox
                  id="snmp-trap-dialog"
                  checked={draft.snmp && draft.snmp_trap}
                  disabled={!draft.snmp}
                  onCheckedChange={(v) => setDraft((p) => ({ ...p, snmp_trap: v === true }))}
                />
                <label htmlFor="snmp-trap-dialog" className="text-sm font-medium cursor-pointer">
                  {t("globals.snmpTraps")}
                </label>
              </div>
            )}
          </div>
          </div>

          <DialogFooter className="shrink-0">
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
  // The action is kept apart from `open` so the text does not flip while the dialog closes.
  const [haConfirmOpen, setHaConfirmOpen] = useState(false);
  const [haAction, setHaAction] = useState<"enable" | "disable">("disable");
  const [togglingGroup, setTogglingGroup] = useState<{ name: string; disable: boolean } | null>(null);
  const [groupConfirmOpen, setGroupConfirmOpen] = useState(false);

  const { canWrite } = usePermissions();
  const canEdit = canWrite(FeatureGroup.HIGH_AVAILABILITY);
  const haDisabled = config?.disabled ?? false;

  // ---- Modal state ----
  const [vrrpGroupModal, setVrrpGroupModal] = useState(false);
  const [editingVrrpGroup, setEditingVrrpGroup] = useState<VrrpGroup | null>(null);

  const [syncGroupModal, setSyncGroupModal] = useState(false);
  const [editingSyncGroup, setEditingSyncGroup] = useState<VrrpSyncGroup | null>(null);

  const [vsModal, setVsModal] = useState(false);
  const [editingVS, setEditingVS] = useState<VirtualServer | null>(null);

  // The target outlives `open` so the dialog text holds while it closes.
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "vrrp" | "sync" | "vs"; name: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const confirmDelete = (kind: "vrrp" | "sync" | "vs", name: string) => {
    setDeleteTarget({ kind, name });
    setDeleteOpen(true);
  };

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
    } catch (err) {
      setError((err as ApiError).message || t("failedToLoad"));
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

  const confirmToggleHA = () => {
    setHaAction(haDisabled ? "enable" : "disable");
    setHaConfirmOpen(true);
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
  const handleSaveVrrpGroup = async (draft: VrrpGroupDraft) => {
    await haService.saveVrrpGroup(editingVrrpGroup, draft, {
      healthCheckTimeout: capabilities?.features.health_check_timeout?.supported ?? false,
    });
    await loadData(true);
  };

  const confirmToggleVrrpGroup = (group: VrrpGroup) => {
    setTogglingGroup({ name: group.name, disable: !group.disabled });
    setGroupConfirmOpen(true);
  };

  const handleSaveSyncGroup = async (draft: VrrpSyncGroupDraft) => {
    await haService.saveSyncGroup(editingSyncGroup, draft, {
      healthCheckTimeout: capabilities?.features.sync_group_health_check_timeout?.supported ?? false,
    });
    await loadData(true);
  };

  const handleSaveVS = async (draft: VirtualServerDraft) => {
    await haService.saveVirtualServer(editingVS, draft);
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
                    onCheckedChange={confirmToggleHA}
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
                          <TableHead>{t("vrid")}</TableHead>
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
                                      onClick={() => confirmToggleVrrpGroup(group)}
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
                                      onClick={() => confirmDelete("vrrp", group.name)}
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
                                      onClick={() => confirmDelete("sync", sg.name)}
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
                                      onClick={() => confirmDelete("vs", vs.name)}
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

      {vrrpGroupModal && (
        <VrrpGroupModal
          onOpenChange={(o) => { setVrrpGroupModal(o); if (!o) setEditingVrrpGroup(null); }}
          existingGroup={editingVrrpGroup}
          existingNames={config?.vrrp.groups.map((g) => g.name) ?? []}
          syncGroups={config?.vrrp.sync_groups ?? []}
          capabilities={capabilities}
          onSubmit={handleSaveVrrpGroup}
        />
      )}

      {syncGroupModal && (
        <SyncGroupModal
          onOpenChange={(o) => { setSyncGroupModal(o); if (!o) setEditingSyncGroup(null); }}
          existingGroup={editingSyncGroup}
          existingNames={config?.vrrp.sync_groups.map((g) => g.name) ?? []}
          vrrpGroups={config?.vrrp.groups ?? []}
          capabilities={capabilities}
          onSubmit={handleSaveSyncGroup}
        />
      )}

      {vsModal && (
        <VirtualServerModal
          onOpenChange={(o) => { setVsModal(o); if (!o) setEditingVS(null); }}
          existingServer={editingVS}
          existingNames={config?.virtual_servers.map((vs) => vs.name) ?? []}
          capabilities={capabilities}
          onSubmit={handleSaveVS}
        />
      )}

      <ConfirmDialog
        open={haConfirmOpen}
        onOpenChange={setHaConfirmOpen}
        title={haAction === "disable" ? t("haConfirm.disableTitle") : t("haConfirm.enableTitle")}
        description={haAction === "disable" ? t("haConfirm.disableDescription") : t("haConfirm.enableDescription")}
        actionLabel={t("apply")}
        destructive={haAction === "disable"}
        onConfirm={async () => {
          await haService.setHaDisabled(haAction === "disable");
          await loadData(true);
        }}
      />

      <ConfirmDialog
        open={groupConfirmOpen}
        onOpenChange={setGroupConfirmOpen}
        title={togglingGroup?.disable ? t("vrrp.disableTitle") : t("vrrp.enableTitle")}
        description={
          togglingGroup?.disable
            ? t("vrrp.disableDescription", { name: togglingGroup?.name ?? "" })
            : t("vrrp.enableDescription", { name: togglingGroup?.name ?? "" })
        }
        actionLabel={t("apply")}
        destructive={!!togglingGroup?.disable}
        onConfirm={async () => {
          await haService.setVrrpGroupDisabled(togglingGroup!.name, togglingGroup!.disable);
          await loadData(true);
        }}
      />

      {/* Delete dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t(`${deleteTarget?.kind ?? "vrrp"}.deleteTitle`)}
        description={t(`${deleteTarget?.kind ?? "vrrp"}.deleteDescription`, { name: deleteTarget?.name ?? "" })}
        actionLabel={tc("delete")}
        destructive
        onConfirm={async () => {
          const target = deleteTarget!;
          if (target.kind === "vrrp") await haService.deleteVrrpGroup(target.name);
          else if (target.kind === "sync") await haService.deleteSyncGroup(target.name);
          else await haService.deleteVirtualServer(target.name);
          await loadData(true);
        }}
      />
    </>
  );
}
