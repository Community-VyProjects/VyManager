"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Activity,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Network,
  Search,
  ArrowRight,
  Cable,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  failoverService,
  FailoverConfig,
  FailoverCapabilities,
  FailoverRoute,
} from "@/lib/api/failover";
import { FailoverRouteModal } from "./FailoverRouteModal";
import { DeleteFailoverRouteModal } from "./DeleteFailoverRouteModal";

export function FailoverContent() {
  const [config, setConfig] = useState<FailoverConfig | null>(null);
  const [capabilities, setCapabilities] = useState<FailoverCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Modal state
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<FailoverRoute | null>(null);
  const [deletingRoute, setDeletingRoute] = useState<string | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData] = await Promise.all([
        failoverService.getConfig(refresh),
        failoverService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load failover configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stats
  const routeCount = config?.routes.length ?? 0;
  const totalNextHops = config?.routes.reduce((sum, r) => sum + r.next_hops.length, 0) ?? 0;
  const totalTargets =
    config?.routes.reduce(
      (sum, r) =>
        sum +
        r.next_hops.reduce((s, nh) => s + nh.check.targets.length, 0) +
        r.dhcp_interfaces.reduce((s, d) => s + d.check.targets.length, 0),
      0
    ) ?? 0;
  const totalDhcpInterfaces =
    config?.routes.reduce((sum, r) => sum + r.dhcp_interfaces.length, 0) ?? 0;

  const showDhcp = capabilities?.features.dhcp_interface.supported ?? false;

  // Search filter
  const filteredRoutes = config?.routes.filter((route) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (route.destination.toLowerCase().includes(q)) return true;
    if (route.next_hops.some((nh) => nh.address.toLowerCase().includes(q))) return true;
    if (route.dhcp_interfaces.some((d) => d.name.toLowerCase().includes(q))) return true;
    return false;
  }) ?? [];

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleCreateRoute = async (route: FailoverRoute) => {
    await failoverService.createRoute(route);
    await loadData(true);
  };

  const handleUpdateRoute = async (route: FailoverRoute) => {
    if (!editingRoute) return;
    await failoverService.updateRoute(editingRoute, route);
    setEditingRoute(null);
    await loadData(true);
  };

  const handleDeleteRoute = async () => {
    if (!deletingRoute) return;
    await failoverService.deleteRoute(deletingRoute);
    setDeletingRoute(null);
    await loadData(true);
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
              <h1 className="text-2xl font-bold text-foreground">Failover Routes</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Health-checked failover routes with automatic path switching
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
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className={`grid ${showDhcp ? "grid-cols-4" : "grid-cols-3"} gap-4`}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <Network className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{routeCount}</p>
                    <p className="text-xs text-muted-foreground">Routes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-blue-500/10">
                    <ArrowRight className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalNextHops}</p>
                    <p className="text-xs text-muted-foreground">Next-Hops</p>
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
                    <p className="text-2xl font-bold">{totalTargets}</p>
                    <p className="text-xs text-muted-foreground">Check Targets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {showDhcp && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md p-2 bg-orange-500/10">
                      <Cable className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalDhcpInterfaces}</p>
                      <p className="text-xs text-muted-foreground">DHCP Interfaces</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          {/* Action bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by destination, next-hop..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingRoute(null);
                setRouteModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Route
            </Button>
          </div>

          {/* Table or empty state */}
          {routeCount === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Network className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  No failover routes configured
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Add a failover route to enable health-checked path switching
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingRoute(null);
                    setRouteModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Route
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <ScrollArea>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Destination</TableHead>
                      <TableHead>Next-Hops</TableHead>
                      <TableHead>Health Check</TableHead>
                      <TableHead>Metrics</TableHead>
                      {showDhcp && <TableHead>DHCP Interfaces</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoutes.map((route) => {
                      const nhAddrs = route.next_hops.map((nh) => nh.address);
                      const checkType = route.next_hops[0]?.check.type;
                      const targetCount = route.next_hops.reduce(
                        (sum, nh) => sum + nh.check.targets.length,
                        0
                      );
                      const metrics = route.next_hops
                        .map((nh) => nh.metric)
                        .filter((m) => m != null);

                      return (
                        <TableRow key={route.destination}>
                          <TableCell className="font-medium font-mono">
                            <div className="flex items-center gap-2">
                              <Network className="h-4 w-4 text-muted-foreground shrink-0" />
                              {route.destination}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {nhAddrs.slice(0, 2).map((addr) => (
                                <Badge key={addr} variant="secondary" className="font-mono text-xs">
                                  {addr}
                                </Badge>
                              ))}
                              {nhAddrs.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{nhAddrs.length - 2} more
                                </Badge>
                              )}
                              {nhAddrs.length === 0 && (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {checkType ? (
                              <div className="flex items-center gap-1">
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {checkType.toUpperCase()}
                                </Badge>
                                {targetCount > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    ({targetCount} target{targetCount !== 1 ? "s" : ""})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {metrics.length > 0 ? (
                              metrics.join(", ")
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          {showDhcp && (
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {route.dhcp_interfaces.map((d) => (
                                  <Badge key={d.name} variant="secondary" className="text-xs">
                                    {d.name}
                                  </Badge>
                                ))}
                                {route.dhcp_interfaces.length === 0 && (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingRoute(route);
                                  setRouteModalOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeletingRoute(route.destination)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredRoutes.length === 0 && searchQuery.trim() && (
                      <TableRow>
                        <TableCell
                          colSpan={showDhcp ? 6 : 5}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No routes match &quot;{searchQuery}&quot;
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <FailoverRouteModal
        open={routeModalOpen}
        onOpenChange={(open) => {
          setRouteModalOpen(open);
          if (!open) setEditingRoute(null);
        }}
        existingRoute={editingRoute}
        capabilities={capabilities}
        onSubmit={editingRoute ? handleUpdateRoute : handleCreateRoute}
      />

      <DeleteFailoverRouteModal
        open={!!deletingRoute}
        onOpenChange={(open) => {
          if (!open) setDeletingRoute(null);
        }}
        destination={deletingRoute ?? ""}
        onConfirm={handleDeleteRoute}
      />
    </>
  );
}
