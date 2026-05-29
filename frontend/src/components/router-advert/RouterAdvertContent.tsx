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
  Radio,
  RefreshCw,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  routerAdvertService,
  RouterAdvertConfig,
  RouterAdvertInterface,
  RouterAdvertCapabilities,
} from "@/lib/api/router-advert";
import { RouterAdvertInterfaceModal } from "./RouterAdvertInterfaceModal";
import { DeleteRouterAdvertInterfaceModal } from "./DeleteRouterAdvertInterfaceModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export function RouterAdvertContent() {
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.ROUTER_ADVERT);

  const [config, setConfig] = useState<RouterAdvertConfig | null>(null);
  const [capabilities, setCapabilities] = useState<RouterAdvertCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedInterface, setExpandedInterface] = useState<string | null>(null);

  const [interfaceModalOpen, setInterfaceModalOpen] = useState(false);
  const [editingInterface, setEditingInterface] = useState<RouterAdvertInterface | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RouterAdvertInterface | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [cfg, caps] = await Promise.all([
        routerAdvertService.getConfig(refresh),
        capabilities === null ? routerAdvertService.getCapabilities() : Promise.resolve(capabilities),
      ]);
      setConfig(cfg);
      if (capabilities === null) setCapabilities(caps as RouterAdvertCapabilities);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load router advertisement configuration"
      );
    } finally {
      setLoading(false);
    }
  }, [capabilities]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const totalPrefixes = config?.interfaces.reduce((s, i) => s + i.prefixes.length, 0) ?? 0;
  const totalRoutes = config?.interfaces.reduce((s, i) => s + i.routes.length, 0) ?? 0;
  const existingNames = config?.interfaces.map((i) => i.name) ?? [];

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <Radio className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">Router Advertisement</h1>
                  {!hasWrite && <Badge variant="secondary">Read Only</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  IPv6 Router Advertisement (radvd) — advertise prefixes, routes, and DNS to hosts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasWrite && (
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
              icon={<Radio className="h-4 w-4 text-primary" />}
              iconBg="bg-primary/10"
              label="Total Interfaces"
              value={String(config?.interfaces.length ?? 0)}
            />
            <StatCard
              icon={<Radio className="h-4 w-4 text-primary" />}
              iconBg="bg-primary/10"
              label="Total Prefixes"
              value={String(totalPrefixes)}
            />
            <StatCard
              icon={<Radio className="h-4 w-4 text-primary" />}
              iconBg="bg-primary/10"
              label="Total Routes"
              value={String(totalRoutes)}
            />
          </div>

          {/* Interfaces card */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Radio className="h-4 w-4" />
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
                      <TableHead>Managed</TableHead>
                      <TableHead>Other Config</TableHead>
                      <TableHead>Preference</TableHead>
                      <TableHead>Prefixes</TableHead>
                      <TableHead>Routes</TableHead>
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
                          <TableCell className="font-mono font-medium">{iface.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                iface.managed_flag
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : "text-muted-foreground"
                              }
                            >
                              {iface.managed_flag ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                iface.other_config_flag
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : "text-muted-foreground"
                              }
                            >
                              {iface.other_config_flag ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {iface.default_preference ?? "medium"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {iface.prefixes.length}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {iface.routes.length}
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

                        {/* Expanded detail rows */}
                        {expandedInterface === iface.name && (
                          <TableRow key={`${iface.name}-detail`}>
                            <TableCell
                              colSpan={hasWrite ? 8 : 7}
                              className="bg-muted/30 py-3 px-4"
                            >
                              <ExpandedDetail iface={iface} />
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
                    <Radio className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium mb-1">No interfaces configured</p>
                  <p className="text-xs text-muted-foreground">
                    Add a listener interface to start sending router advertisements
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

      {interfaceModalOpen && (
        <RouterAdvertInterfaceModal
          open={interfaceModalOpen}
          onOpenChange={setInterfaceModalOpen}
          existing={editingInterface}
          existingNames={existingNames}
          capabilities={capabilities}
          onSuccess={() => loadData(true)}
        />
      )}

      {deleteTarget && (
        <DeleteRouterAdvertInterfaceModal
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          interfaceName={deleteTarget.name}
          prefixCount={deleteTarget.prefixes.length}
          routeCount={deleteTarget.routes.length}
          nat64Count={deleteTarget.nat64_prefixes.length}
          onSuccess={() => loadData(true)}
        />
      )}
    </>
  );
}

// ---- Expanded detail panel ----

function ExpandedDetail({ iface }: { iface: RouterAdvertInterface }) {
  return (
    <div className="space-y-4">
      {/* Prefixes */}
      {iface.prefixes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Prefixes
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs h-7">Prefix</TableHead>
                <TableHead className="text-xs h-7">Valid LT</TableHead>
                <TableHead className="text-xs h-7">Preferred LT</TableHead>
                <TableHead className="text-xs h-7">Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {iface.prefixes.map((p) => (
                <TableRow key={p.prefix}>
                  <TableCell className="font-mono text-sm py-1.5">{p.prefix}</TableCell>
                  <TableCell className="text-sm py-1.5 text-muted-foreground">{p.valid_lifetime ?? "—"}</TableCell>
                  <TableCell className="text-sm py-1.5 text-muted-foreground">{p.preferred_lifetime ?? "—"}</TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex gap-1 flex-wrap">
                      {p.decrement_lifetime && <Badge variant="secondary" className="text-xs">decr-lt</Badge>}
                      {p.deprecate_prefix && <Badge variant="secondary" className="text-xs">deprecate</Badge>}
                      {p.no_autonomous_flag && <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400">no-auto</Badge>}
                      {p.no_on_link_flag && <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400">no-onlink</Badge>}
                      {!p.decrement_lifetime && !p.deprecate_prefix && !p.no_autonomous_flag && !p.no_on_link_flag && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Routes */}
      {iface.routes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Routes
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs h-7">Route</TableHead>
                <TableHead className="text-xs h-7">Preference</TableHead>
                <TableHead className="text-xs h-7">Valid LT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {iface.routes.map((r) => (
                <TableRow key={r.route}>
                  <TableCell className="font-mono text-sm py-1.5">{r.route}</TableCell>
                  <TableCell className="text-sm py-1.5 text-muted-foreground">
                    {r.route_preference ?? "medium"}
                  </TableCell>
                  <TableCell className="text-sm py-1.5 text-muted-foreground">
                    {r.valid_lifetime ?? "—"}
                    {r.no_remove_route && (
                      <Badge variant="secondary" className="ml-2 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400">no-remove</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* NAT64 */}
      {iface.nat64_prefixes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            NAT64 Prefixes
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs h-7">NAT64 Prefix</TableHead>
                <TableHead className="text-xs h-7">Valid LT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {iface.nat64_prefixes.map((n) => (
                <TableRow key={n.prefix}>
                  <TableCell className="font-mono text-sm py-1.5">{n.prefix}</TableCell>
                  <TableCell className="text-sm py-1.5 text-muted-foreground">{n.valid_lifetime ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* DNS */}
      {(iface.name_server.length > 0 || iface.dnssl.length > 0) && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            DNS
          </p>
          <div className="space-y-1.5 text-sm">
            {iface.name_server.length > 0 && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28 shrink-0">Name Servers</span>
                <span className="font-mono">{iface.name_server.join(", ")}</span>
              </div>
            )}
            {iface.dnssl.length > 0 && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28 shrink-0">Search List</span>
                <span>{iface.dnssl.join(", ")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {iface.prefixes.length === 0 && iface.routes.length === 0 && iface.nat64_prefixes.length === 0 && iface.name_server.length === 0 && iface.dnssl.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No additional configuration for this interface
        </p>
      )}
    </div>
  );
}

// ---- StatCard ----

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
