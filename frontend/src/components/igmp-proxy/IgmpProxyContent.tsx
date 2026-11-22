"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wifi,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Search,
  ArrowUpFromLine,
  ArrowDownToLine,
  Network,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  igmpProxyService,
  IgmpProxyConfig,
  IgmpProxyCapabilities,
  IgmpProxyInterface,
} from "@/lib/api/igmp-proxy";
import { IgmpProxySetupModal } from "./IgmpProxySetupModal";
import { IgmpProxyInterfaceModal } from "./IgmpProxyInterfaceModal";
import { DeleteIgmpProxyInterfaceModal } from "./DeleteIgmpProxyInterfaceModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import type { ApiError } from "@/lib/types/api";

/** A page toggle waiting for Cancel / Apply; `value` is the state it turns the leaf to. */
interface PendingToggle {
  kind: "disable" | "quickleave";
  value: boolean;
}

export function IgmpProxyContent() {
  const t = useTranslations("igmpProxy");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.IGMP_PROXY);

  const [config, setConfig] = useState<IgmpProxyConfig | null>(null);
  const [, setCapabilities] = useState<IgmpProxyCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Global settings confirm dialog. The toggle stays set after close so the text does not change while it animates out.
  const [toggle, setToggle] = useState<PendingToggle | null>(null);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggleSaving, setToggleSaving] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Modal state
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [interfaceModalOpen, setInterfaceModalOpen] = useState(false);
  const [editingInterface, setEditingInterface] = useState<IgmpProxyInterface | null>(null);
  const [deletingInterface, setDeletingInterface] = useState<string | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData] = await Promise.all([
        igmpProxyService.getConfig(refresh),
        igmpProxyService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError((err as ApiError).message || t("content.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stats
  const totalInterfaces = config?.interfaces.length ?? 0;
  const upstreamCount = config?.interfaces.filter((i) => i.role === "upstream").length ?? 0;
  const downstreamCount = config?.interfaces.filter((i) => i.role === "downstream").length ?? 0;

  // Determine if config has both upstream and downstream (valid base config)
  const hasValidBaseConfig = upstreamCount >= 1 && downstreamCount >= 1;

  // Filtered interfaces
  const filteredInterfaces = useMemo(() => {
    if (!config?.interfaces) return [];
    if (!searchQuery.trim()) return config.interfaces;

    const query = searchQuery.toLowerCase();
    return config.interfaces.filter(
      (iface) =>
        iface.name.toLowerCase().includes(query) ||
        (iface.role && iface.role.toLowerCase().includes(query)) ||
        iface.alt_subnets.some((s) => s.includes(query)) ||
        iface.whitelists.some((w) => w.includes(query))
    );
  }, [config?.interfaces, searchQuery]);

  // ==========================================================================
  // Global settings handlers
  // ==========================================================================

  const openToggle = (kind: PendingToggle["kind"]) => {
    if (!config || !hasWritePermission) return;
    const value = kind === "disable" ? !config.disabled : !config.disable_quickleave;
    setToggle({ kind, value });
    setToggleError(null);
    setToggleOpen(true);
  };

  const handleToggleOpenChange = (next: boolean) => {
    if (next || toggleSaving) return;
    setToggleOpen(false);
  };

  const handleToggleApply = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!toggle) return;
    setToggleSaving(true);
    setToggleError(null);
    try {
      if (toggle.kind === "disable") {
        await igmpProxyService.setDisabled(toggle.value);
      } else {
        await igmpProxyService.setDisableQuickleave(toggle.value);
      }
    } catch (err) {
      setToggleError(
        (err as ApiError).message ||
          t(toggle.kind === "disable" ? "content.updateStatusFailed" : "content.updateQuickleaveFailed")
      );
      setToggleSaving(false);
      return;
    }
    setToggleSaving(false);
    setToggleOpen(false);
    await loadData(true);
  };

  const toggleDescription = (pending: PendingToggle) => {
    if (pending.kind === "disable") {
      return pending.value ? t("confirm.disableProxy") : t("confirm.enableProxy");
    }
    return pending.value ? t("confirm.disableQuickleave") : t("confirm.enableQuickleave");
  };

  // ==========================================================================
  // Interface handlers
  // ==========================================================================

  const handleSetup = async (interfaces: IgmpProxyInterface[]) => {
    await igmpProxyService.setupInterfaces(interfaces);
    await loadData(true);
  };

  const handleCreateInterface = async (iface: IgmpProxyInterface) => {
    await igmpProxyService.createInterface(iface);
    await loadData(true);
  };

  const handleUpdateInterface = async (iface: IgmpProxyInterface) => {
    if (!editingInterface) return;
    await igmpProxyService.updateInterface(editingInterface, iface);
    setEditingInterface(null);
    await loadData(true);
  };

  const handleDeleteInterface = async () => {
    if (!deletingInterface) return;
    await igmpProxyService.deleteInterface(deletingInterface);
    setDeletingInterface(null);
    await loadData(true);
  };

  // ==========================================================================
  // Role badge helper
  // ==========================================================================

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "upstream":
        return (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
            <ArrowUpFromLine className="h-3 w-3 mr-1" />
            {t("upstream")}
          </Badge>
        );
      case "downstream":
        return (
          <Badge variant="secondary" className="bg-green-500/10 text-green-600">
            <ArrowDownToLine className="h-3 w-3 mr-1" />
            {t("downstream")}
          </Badge>
        );
      case "disabled":
        return (
          <Badge variant="secondary" className="bg-red-500/10 text-red-600">
            {tc("disabled")}
          </Badge>
        );
      default:
        return <span className="text-muted-foreground">-</span>;
    }
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  if (loading) {
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
        <Button variant="outline" onClick={() => loadData()}>
          {tc("retry")}
        </Button>
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
              <h1 className="text-2xl font-bold text-foreground">{t("content.title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("content.subtitle")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {tc("refresh")}
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
              {error}
            </div>
          )}

          {/* Global Settings + Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Proxy Status Toggle */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Checkbox
                      id="igmp-proxy-enabled"
                      checked={!config?.disabled}
                      onCheckedChange={() => openToggle("disable")}
                      disabled={!hasWritePermission}
                    />
                    <div className="min-w-0">
                      <label
                        htmlFor="igmp-proxy-enabled"
                        className="text-sm font-medium cursor-pointer"
                      >
                        {t("content.proxyEnabled")}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {config?.disabled ? tc("disabled") : t("content.active")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quickleave Toggle */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Checkbox
                      id="igmp-quickleave"
                      checked={!config?.disable_quickleave}
                      onCheckedChange={() => openToggle("quickleave")}
                      disabled={!hasWritePermission}
                    />
                    <div className="min-w-0">
                      <label
                        htmlFor="igmp-quickleave"
                        className="text-sm font-medium cursor-pointer"
                      >
                        {t("content.quickleave")}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {config?.disable_quickleave ? tc("disabled") : tc("enabled")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats: Total Interfaces */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <Network className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalInterfaces}</p>
                    <p className="text-xs text-muted-foreground">{t("content.statInterfaces")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats: Upstream */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-blue-500/10">
                    <ArrowUpFromLine className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{upstreamCount}</p>
                    <p className="text-xs text-muted-foreground">{t("upstream")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats: Downstream */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-green-500/10">
                    <ArrowDownToLine className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{downstreamCount}</p>
                    <p className="text-xs text-muted-foreground">{t("downstream")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Interface List */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          {totalInterfaces > 0 && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 flex-1 max-w-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("content.searchInterfaces")}
                    className="pl-9"
                  />
                </div>
              </div>
              {hasWritePermission && hasValidBaseConfig && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingInterface(null);
                    setInterfaceModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {tc("addInterface")}
                </Button>
              )}
            </div>
          )}

          {totalInterfaces === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wifi className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  {t("content.noInterfaces")}
                </p>
                <p className="text-xs text-muted-foreground mb-4 text-center max-w-sm">
                  {t("content.noInterfacesHint")}
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => setSetupModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("setupProxy")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : filteredInterfaces.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">
                  {t("content.noMatch", { query: searchQuery })}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <ScrollArea>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("content.colInterface")}</TableHead>
                      <TableHead>{t("content.colRole")}</TableHead>
                      <TableHead>{t("content.colThreshold")}</TableHead>
                      <TableHead>{t("content.colAltSubnets")}</TableHead>
                      <TableHead>{t("content.colWhitelist")}</TableHead>
                      {hasWritePermission && (
                        <TableHead className="text-right">{tc("actions")}</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInterfaces.map((iface) => (
                      <TableRow key={iface.name}>
                        <TableCell className="font-medium font-mono">
                          {iface.name}
                        </TableCell>
                        <TableCell>{getRoleBadge(iface.role)}</TableCell>
                        <TableCell>
                          {iface.threshold != null ? (
                            <span className="font-mono">{iface.threshold}</span>
                          ) : (
                            <span className="text-muted-foreground">1</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {iface.alt_subnets.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {iface.alt_subnets.map((subnet) => (
                                <Badge
                                  key={subnet}
                                  variant="outline"
                                  className="text-xs font-mono"
                                >
                                  {subnet}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {iface.whitelists.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {iface.whitelists.map((wl) => (
                                <Badge
                                  key={wl}
                                  variant="outline"
                                  className="text-xs font-mono"
                                >
                                  {wl}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        {hasWritePermission && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingInterface(iface);
                                  setInterfaceModalOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeletingInterface(iface.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <IgmpProxySetupModal
        open={setupModalOpen}
        onOpenChange={setSetupModalOpen}
        onSubmit={handleSetup}
      />

      <IgmpProxyInterfaceModal
        open={interfaceModalOpen}
        onOpenChange={(open) => {
          setInterfaceModalOpen(open);
          if (!open) setEditingInterface(null);
        }}
        existingInterface={editingInterface}
        configuredNames={config?.interfaces.map((i) => i.name) ?? []}
        onSubmit={editingInterface ? handleUpdateInterface : handleCreateInterface}
      />

      <DeleteIgmpProxyInterfaceModal
        open={!!deletingInterface}
        onOpenChange={(open) => {
          if (!open) setDeletingInterface(null);
        }}
        interfaceName={deletingInterface ?? ""}
        onConfirm={handleDeleteInterface}
      />

      <AlertDialog open={toggleOpen} onOpenChange={handleToggleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>{toggle && toggleDescription(toggle)}</AlertDialogDescription>
          </AlertDialogHeader>

          {toggleError && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="whitespace-pre-wrap">{toggleError}</p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleSaving}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleApply} disabled={toggleSaving}>
              {toggleSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("confirm.apply")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
