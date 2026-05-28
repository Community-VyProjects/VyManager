"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Network,
  RefreshCw,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  ndpProxyService,
  NdpProxyConfig,
  NdpProxyCapabilities,
  NdpProxyInterface,
} from "@/lib/api/ndp-proxy";
import { NdpProxyGlobalModal } from "./NdpProxyGlobalModal";
import { NdpProxyInterfaceModal } from "./NdpProxyInterfaceModal";
import { DeleteNdpProxyInterfaceModal } from "./DeleteNdpProxyInterfaceModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

function formatMs(value: number | null, defaultLabel: string): string {
  if (value === null) return defaultLabel;
  return `${value} ms`;
}

export function NdpProxyContent() {
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.NDP_PROXY);

  const [config, setConfig] = useState<NdpProxyConfig | null>(null);
  const [capabilities, setCapabilities] = useState<NdpProxyCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedInterface, setExpandedInterface] = useState<string | null>(null);

  const [globalModalOpen, setGlobalModalOpen] = useState(false);
  const [interfaceModalOpen, setInterfaceModalOpen] = useState(false);
  const [editingInterface, setEditingInterface] = useState<NdpProxyInterface | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NdpProxyInterface | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [cfg, caps] = await Promise.all([
        ndpProxyService.getConfig(refresh),
        ndpProxyService.getCapabilities(),
      ]);
      setConfig(cfg);
      setCapabilities(caps);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load NDP proxy configuration"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const totalPrefixes = config?.interfaces.reduce((sum, i) => sum + i.prefixes.length, 0) ?? 0;
  const disabledInterfaces = config?.interfaces.filter((i) => i.disabled).length ?? 0;
  const existingNames = config?.interfaces.map((i) => i.name) ?? [];

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <Network className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">NDP Proxy</h1>
                  {!hasWrite && (
                    <Badge variant="secondary">Read Only</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Neighbor Discovery Protocol Proxy — forward NDP between interfaces
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasWrite && (
                <Button size="sm" onClick={() => setGlobalModalOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Settings
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {error && config && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="whitespace-pre-wrap">{error}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 p-6 pt-4 overflow-auto space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={<Network className="h-4 w-4 text-primary" />}
              iconBg="bg-primary/10"
              label="Total Interfaces"
              value={String(config?.interfaces.length ?? 0)}
            />
            <StatCard
              icon={<Network className="h-4 w-4 text-primary" />}
              iconBg="bg-primary/10"
              label="Total Prefixes"
              value={String(totalPrefixes)}
            />
            <StatCard
              icon={<Network className="h-4 w-4 text-amber-500" />}
              iconBg="bg-amber-500/10"
              label="Disabled Interfaces"
              value={String(disabledInterfaces)}
            />
          </div>

          {/* Global Settings card */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Network className="h-4 w-4" />
                Global Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Route Refresh Interval</span>
                <span className="font-mono">
                  {config?.route_refresh !== null && config?.route_refresh !== undefined
                    ? `${config.route_refresh} ms`
                    : "30000 ms (default)"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Interfaces card */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Network className="h-4 w-4" />
                  Interfaces
                </CardTitle>
                {hasWrite && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingInterface(null);
                      setInterfaceModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Interface
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {config && config.interfaces.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Interface</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timeout</TableHead>
                      <TableHead>TTL</TableHead>
                      <TableHead>Prefixes</TableHead>
                      {hasWrite && <TableHead className="w-[80px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.interfaces.map((iface) => (
                      <>
                        <TableRow
                          key={iface.name}
                          className="cursor-pointer"
                          onClick={() =>
                            setExpandedInterface(
                              expandedInterface === iface.name ? null : iface.name
                            )
                          }
                        >
                          <TableCell className="text-muted-foreground">
                            {expandedInterface === iface.name ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {iface.name}
                            {iface.enable_router_bit && (
                              <Badge variant="secondary" className="ml-2 text-xs">R</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                iface.disabled
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : "bg-green-500/10 text-green-600 dark:text-green-500"
                              }
                            >
                              {iface.disabled ? "Disabled" : "Enabled"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">
                            {formatMs(iface.timeout, "500 (default)")}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">
                            {formatMs(iface.ttl, "30000 (default)")}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {iface.prefixes.length}
                          </TableCell>
                          {hasWrite && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingInterface(iface);
                                    setInterfaceModalOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTarget(iface)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>

                        {/* Expanded prefix rows */}
                        {expandedInterface === iface.name && iface.prefixes.length > 0 && (
                          <TableRow key={`${iface.name}-prefixes`}>
                            <TableCell colSpan={hasWrite ? 7 : 6} className="bg-muted/30 py-2 px-4">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs h-7">Prefix</TableHead>
                                    <TableHead className="text-xs h-7">Status</TableHead>
                                    <TableHead className="text-xs h-7">Mode</TableHead>
                                    <TableHead className="text-xs h-7">Fwd Interface</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {iface.prefixes.map((prefix) => (
                                    <TableRow key={prefix.prefix}>
                                      <TableCell className="font-mono text-sm py-1.5">
                                        {prefix.prefix}
                                      </TableCell>
                                      <TableCell className="py-1.5">
                                        {prefix.disabled ? (
                                          <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                            Disabled
                                          </Badge>
                                        ) : (
                                          <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 dark:text-green-500">
                                            Enabled
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="py-1.5">
                                        <Badge variant="secondary" className="text-xs">
                                          {prefix.mode ?? "static"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="font-mono text-sm text-muted-foreground py-1.5">
                                        {prefix.interface ?? "—"}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableCell>
                          </TableRow>
                        )}

                        {expandedInterface === iface.name && iface.prefixes.length === 0 && (
                          <TableRow key={`${iface.name}-empty`}>
                            <TableCell colSpan={hasWrite ? 7 : 6} className="bg-muted/30 py-3 px-4 text-sm text-muted-foreground text-center">
                              No prefixes configured for this interface
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full p-3 bg-muted mb-3">
                    <Network className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium mb-1">No interfaces configured</p>
                  <p className="text-xs text-muted-foreground">
                    Add a listener interface to start proxying NDP
                  </p>
                  {hasWrite && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setEditingInterface(null);
                        setInterfaceModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Interface
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {config && globalModalOpen && (
        <NdpProxyGlobalModal
          open={globalModalOpen}
          onOpenChange={setGlobalModalOpen}
          config={config}
          onSuccess={() => loadData(true)}
        />
      )}

      {interfaceModalOpen && (
        <NdpProxyInterfaceModal
          open={interfaceModalOpen}
          onOpenChange={setInterfaceModalOpen}
          existing={editingInterface}
          existingNames={existingNames}
          onSuccess={() => loadData(true)}
        />
      )}

      {deleteTarget && (
        <DeleteNdpProxyInterfaceModal
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          interfaceName={deleteTarget.name}
          prefixCount={deleteTarget.prefixes.length}
          onSuccess={() => loadData(true)}
        />
      )}
    </>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}

function StatCard({ icon, iconBg, label, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-md p-2 ${iconBg}`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
