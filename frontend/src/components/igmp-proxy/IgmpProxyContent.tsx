"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export function IgmpProxyContent() {
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.IGMP_PROXY);

  const [config, setConfig] = useState<IgmpProxyConfig | null>(null);
  const [, setCapabilities] = useState<IgmpProxyCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Global settings loading states
  const [disableLoading, setDisableLoading] = useState(false);
  const [quickleaveLoading, setQuickleaveLoading] = useState(false);

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
      setError(err instanceof Error ? err.message : "Failed to load IGMP proxy configuration");
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleToggleDisable = async () => {
    if (!config || !hasWritePermission) return;
    const newValue = !config.disabled;
    setDisableLoading(true);
    try {
      await igmpProxyService.setDisabled(newValue);
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update proxy status");
    } finally {
      setDisableLoading(false);
    }
  };

  const handleToggleQuickleave = async () => {
    if (!config || !hasWritePermission) return;
    const newValue = !config.disable_quickleave;
    setQuickleaveLoading(true);
    try {
      await igmpProxyService.setDisableQuickleave(newValue);
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quickleave setting");
    } finally {
      setQuickleaveLoading(false);
    }
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
            Upstream
          </Badge>
        );
      case "downstream":
        return (
          <Badge variant="secondary" className="bg-green-500/10 text-green-600">
            <ArrowDownToLine className="h-3 w-3 mr-1" />
            Downstream
          </Badge>
        );
      case "disabled":
        return (
          <Badge variant="secondary" className="bg-red-500/10 text-red-600">
            Disabled
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
          Retry
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
              <h1 className="text-2xl font-bold text-foreground">IGMP Proxy</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Proxy multicast traffic between upstream and downstream networks
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
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
                    {disableLoading ? (
                      <div className="rounded-md p-2 bg-muted">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <Checkbox
                        id="igmp-proxy-enabled"
                        checked={!config?.disabled}
                        onCheckedChange={handleToggleDisable}
                        disabled={!hasWritePermission || disableLoading}
                      />
                    )}
                    <div className="min-w-0">
                      <label
                        htmlFor="igmp-proxy-enabled"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Proxy Enabled
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {config?.disabled ? "Disabled" : "Active"}
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
                    {quickleaveLoading ? (
                      <div className="rounded-md p-2 bg-muted">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <Checkbox
                        id="igmp-quickleave"
                        checked={!config?.disable_quickleave}
                        onCheckedChange={handleToggleQuickleave}
                        disabled={!hasWritePermission || quickleaveLoading}
                      />
                    )}
                    <div className="min-w-0">
                      <label
                        htmlFor="igmp-quickleave"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Quickleave
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {config?.disable_quickleave ? "Disabled" : "Enabled"}
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
                    <p className="text-xs text-muted-foreground">Interfaces</p>
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
                    <p className="text-xs text-muted-foreground">Upstream</p>
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
                    <p className="text-xs text-muted-foreground">Downstream</p>
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
                    placeholder="Search interfaces..."
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
                  Add Interface
                </Button>
              )}
            </div>
          )}

          {totalInterfaces === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wifi className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  No interfaces configured
                </p>
                <p className="text-xs text-muted-foreground mb-4 text-center max-w-sm">
                  IGMP proxy requires at least one upstream and one downstream interface.
                  Use the setup wizard to configure both at once.
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => setSetupModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Setup IGMP Proxy
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : filteredInterfaces.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">
                  No interfaces match &quot;{searchQuery}&quot;
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <ScrollArea>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Interface</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead>Alt Subnets</TableHead>
                      <TableHead>Whitelist</TableHead>
                      {hasWritePermission && (
                        <TableHead className="text-right">Actions</TableHead>
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
    </>
  );
}
