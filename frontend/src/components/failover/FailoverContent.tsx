"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
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
  type FailoverConfig,
  type FailoverCapabilities,
  type FailoverRoute,
} from "@/lib/api/failover";
import { failoverEffectiveCheckType, failoverSupports } from "@/lib/api/failover-save-ops";
import type { ApiError } from "@/lib/types/api";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { FailoverRouteModal } from "./FailoverRouteModal";
import { DeleteFailoverRouteModal } from "./DeleteFailoverRouteModal";

/** True when any of the values contains the trimmed, lowercased query. */
function matches(query: string, ...values: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values.some((v) => (v ?? "").toLowerCase().includes(q));
}

export function FailoverContent() {
  const t = useTranslations("failover");
  const tc = useTranslations("common");
  const [config, setConfig] = useState<FailoverConfig | null>(null);
  const [capabilities, setCapabilities] = useState<FailoverCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.FAILOVER);
  // The subject stays set after close so the dialog text does not flip during
  // the close animation; the key reseeds the route form on every open.
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [routeModalKey, setRouteModalKey] = useState(0);
  const [editingRoute, setEditingRoute] = useState<FailoverRoute | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRoute, setDeletingRoute] = useState("");

  /** Read config and capabilities; state is only set after the await. */
  const fetchData = useCallback(async (refresh: boolean) => {
    try {
      const [configData, capData] = await Promise.all([
        failoverService.getConfig(refresh),
        failoverService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
      setError(null);
    } catch (err) {
      setError((err as ApiError).message || t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchData(false);
  }, [fetchData]);

  const retry = async () => {
    setLoading(true);
    await fetchData(true);
  };

  /** Re-read after a save without swapping the page (and its dialogs) for the spinner. */
  const reload = async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  };

  const openCreate = () => {
    setEditingRoute(null);
    setRouteModalKey((k) => k + 1);
    setRouteModalOpen(true);
  };

  const openEdit = (route: FailoverRoute) => {
    setEditingRoute(route);
    setRouteModalKey((k) => k + 1);
    setRouteModalOpen(true);
  };

  const openDelete = (destination: string) => {
    setDeletingRoute(destination);
    setDeleteOpen(true);
  };

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

  const showDhcp = failoverSupports(capabilities, "dhcp_interface");
  // Writes need the capability lists the route dialog reads.
  const canEdit = hasWrite && capabilities !== null;

  const filteredRoutes = config?.routes.filter((route) =>
    matches(
      searchQuery,
      route.destination,
      ...route.next_hops.flatMap((nh) => [nh.address, nh.interface]),
      ...route.dhcp_interfaces.flatMap((d) => [d.name, d.interface]),
    )
  ) ?? [];

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
        <p className="text-destructive whitespace-pre-wrap">{error}</p>
        <Button variant="outline" onClick={() => void retry()}>
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
              <h1 className="text-2xl font-bold text-foreground">{t("header.title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("header.subtitle")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void reload()}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              {tc("refresh")}
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
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
                    <p className="text-xs text-muted-foreground">{t("stats.routes")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("stats.nextHops")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("stats.checkTargets")}</p>
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
                      <p className="text-xs text-muted-foreground">{t("stats.dhcpInterfaces")}</p>
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
                aria-label={t("content.searchPlaceholder")}
                placeholder={t("content.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {canEdit && (
              <Button size="sm" onClick={openCreate} disabled={refreshing}>
                <Plus className="h-4 w-4 mr-2" />
                {t("addRoute")}
              </Button>
            )}
          </div>

          {/* Table or empty state */}
          {routeCount === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Network className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  {t("content.empty")}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {t("content.emptyHint")}
                </p>
                {canEdit && (
                  <Button size="sm" onClick={openCreate} disabled={refreshing}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addRoute")}
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
                      <TableHead>{t("table.destination")}</TableHead>
                      <TableHead>{t("table.nextHops")}</TableHead>
                      <TableHead>{t("table.healthCheck")}</TableHead>
                      <TableHead>{t("table.metrics")}</TableHead>
                      {showDhcp && <TableHead>{t("table.dhcpInterfaces")}</TableHead>}
                      {canEdit && <TableHead className="text-right">{tc("actions")}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoutes.map((route) => {
                      const nhAddrs = route.next_hops.map((nh) => nh.address);
                      const first = route.next_hops[0] ?? route.dhcp_interfaces[0];
                      const checkType = first ? failoverEffectiveCheckType(first.check.type) : null;
                      const targetCount =
                        route.next_hops.reduce((sum, nh) => sum + nh.check.targets.length, 0) +
                        route.dhcp_interfaces.reduce((sum, d) => sum + d.check.targets.length, 0);
                      const metrics = [...route.next_hops, ...route.dhcp_interfaces]
                        .map((g) => g.metric)
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
                                  {t("table.more", { count: nhAddrs.length - 2 })}
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
                                <Badge variant="outline" className="text-xs font-mono">
                                  {checkType}
                                </Badge>
                                {targetCount > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {t("table.targetCount", { count: targetCount })}
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
                          {canEdit && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={tc("edit")}
                                  className="h-8 w-8"
                                  disabled={refreshing}
                                  onClick={() => openEdit(route)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={tc("delete")}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  disabled={refreshing}
                                  onClick={() => openDelete(route.destination)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {filteredRoutes.length === 0 && searchQuery.trim() && (
                      <TableRow>
                        <TableCell
                          colSpan={4 + (showDhcp ? 1 : 0) + (canEdit ? 1 : 0)}
                          className="text-center py-8 text-muted-foreground"
                        >
                          {t("content.noMatch", { query: searchQuery })}
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
      {capabilities && (
        <FailoverRouteModal
          key={routeModalKey}
          open={routeModalOpen}
          onOpenChange={setRouteModalOpen}
          existingRoute={editingRoute}
          capabilities={capabilities}
          destinations={config?.routes.map((r) => r.destination) ?? []}
          onSuccess={() => void reload()}
        />
      )}

      <DeleteFailoverRouteModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        destination={deletingRoute}
        onSuccess={() => void reload()}
      />
    </>
  );
}
