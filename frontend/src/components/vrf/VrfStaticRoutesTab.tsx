"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Loader2, Pencil, Plus, Route, Search, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StaticRouteModal } from "@/components/routing/StaticRouteModal";
import { DeleteStaticRouteModal } from "@/components/routing/DeleteStaticRouteModal";
import type { StaticRoute } from "@/lib/api/static-routes";
import type { RouteFamily, StaticRouteFeatures } from "@/lib/api/static-routes-save-ops";
import { VrfInstance, VrfCapabilities, vrfService } from "@/lib/api/vrf";
import type { ApiError } from "@/lib/types/api";

interface VrfStaticRoutesTabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfStaticRoutesTab({
  vrf,
  capabilities,
  canWrite,
  onRefresh,
}: VrfStaticRoutesTabProps) {
  const t = useTranslations("vrf");
  const tc = useTranslations("common");
  const [family, setFamily] = useState<RouteFamily>("ipv4");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editRoute, setEditRoute] = useState<StaticRoute | null>(null);
  const [deleteRoute, setDeleteRoute] = useState<StaticRoute | null>(null);
  // VRF the "remove static routing" dialog was opened for.
  const [clearFor, setClearFor] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const clearOpen = clearFor === vrf.name && vrf.static !== null;

  const closeClear = (open: boolean) => {
    if (open || clearing) return;
    setClearFor(null);
    setClearError(null);
  };

  const handleClear = async () => {
    setClearing(true);
    setClearError(null);
    try {
      const result = await vrfService.deleteStatic(vrf.name);
      if (!result.success) {
        setClearError(result.error || t("staticRoutes.clearFailed"));
        return;
      }
      setClearFor(null);
      onRefresh();
    } catch (err) {
      setClearError((err as ApiError).message || t("staticRoutes.clearFailed"));
    } finally {
      setClearing(false);
    }
  };

  const features: StaticRouteFeatures = {
    ipv4Segments: capabilities.features.static_route_ipv4_segments.supported,
    bfdSourceProfile: capabilities.features.static_route_bfd_source_profile.supported,
  };

  const routes = family === "ipv4"
    ? (vrf.static?.routes ?? [])
    : (vrf.static?.routes6 ?? []);

  const filteredRoutes = search
    ? routes.filter((r) =>
        r.destination.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase())
      )
    : routes;

  const getRouteTypeDisplay = (route: StaticRoute): string => {
    const types: string[] = [];
    if (route.next_hops.length > 0) types.push(t("staticRoutes.nextHopCount", { count: route.next_hops.length }));
    if (route.interfaces.length > 0) types.push(t("staticRoutes.interfaceCount", { count: route.interfaces.length }));
    if (route.blackhole) types.push(t("staticRoutes.typeBlackhole"));
    if (route.reject) types.push(t("staticRoutes.typeReject"));
    if (route.dhcp_interfaces.length > 0) {
      types.push(t("staticRoutes.dhcpInterfaceCount", { count: route.dhcp_interfaces.length }));
    }
    return types.join(", ") || t("staticRoutes.typeEmpty");
  };

  const getRouteTargets = (route: StaticRoute): string => {
    const targets: string[] = [];
    for (const nh of route.next_hops) {
      const name = nh.interface ? t("staticRoutes.targetVia", { name: nh.address, via: nh.interface }) : nh.address;
      targets.push(nh.vrf ? t("staticRoutes.targetVrf", { name, vrf: nh.vrf }) : name);
    }
    for (const iface of route.interfaces) {
      targets.push(iface.vrf ? t("staticRoutes.targetVrf", { name: iface.interface, vrf: iface.vrf }) : iface.interface);
    }
    targets.push(...route.dhcp_interfaces);
    if (route.blackhole) targets.push(t("staticRoutes.typeBlackhole"));
    if (route.reject) targets.push(t("staticRoutes.typeReject"));
    return targets.join("; ") || t("staticRoutes.noTargets");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Tabs value={family} onValueChange={(v) => setFamily(v as RouteFamily)}>
            <TabsList>
              <TabsTrigger value="ipv4">
                {t("staticRoutes.familyIpv4")}
                {(vrf.static?.routes.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                    {vrf.static?.routes.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ipv6">
                {t("staticRoutes.familyIpv6")}
                {(vrf.static?.routes6.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                    {vrf.static?.routes6.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("staticRoutes.searchPlaceholder")}
              className="pl-9 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            {vrf.static !== null && (
              <Button size="sm" variant="outline" onClick={() => setClearFor(vrf.name)}>
                <Trash2 className="h-4 w-4 mr-1.5 text-destructive" />
                {t("staticRoutes.clear")}
              </Button>
            )}
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              {t("addRoute")}
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredRoutes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Route className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? t("staticRoutes.noMatch")
                  : t("staticRoutes.noRoutes", { family: family === "ipv4" ? "IPv4" : "IPv6" })}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("destination")}</TableHead>
                  <TableHead>{t("staticRoutes.type")}</TableHead>
                  <TableHead>{t("staticRoutes.targets")}</TableHead>
                  <TableHead>{tc("description")}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                  {canWrite && <TableHead className="w-[90px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoutes.map((route) => {
                  const hasDisabled = route.next_hops.some((nh) => nh.disable) ||
                    route.interfaces.some((i) => i.disable);
                  return (
                    <TableRow key={route.destination}>
                      <TableCell className="font-mono text-sm font-medium">
                        {route.destination}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getRouteTypeDisplay(route)}
                      </TableCell>
                      <TableCell className="text-sm font-mono max-w-[300px] truncate">
                        {getRouteTargets(route)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {route.description || t("staticRoutes.noTargets")}
                      </TableCell>
                      <TableCell>
                        {hasDisabled ? (
                          <Badge variant="outline" className="text-[10px]">
                            {t("staticRoutes.partial")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            {t("staticRoutes.active")}
                          </Badge>
                        )}
                      </TableCell>
                      {canWrite && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={tc("edit")}
                              onClick={() => setEditRoute(route)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={tc("delete")}
                              onClick={() => setDeleteRoute(route)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StaticRouteModal
        open={createOpen || editRoute !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditRoute(null);
          }
        }}
        onSuccess={onRefresh}
        scope={{ kind: "vrf", vrf: vrf.name }}
        family={family}
        existing={editRoute}
        features={features}
        configured={routes.map((route) => route.destination)}
      />

      <DeleteStaticRouteModal
        open={deleteRoute !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteRoute(null);
        }}
        onSuccess={onRefresh}
        scope={{ kind: "vrf", vrf: vrf.name }}
        route={deleteRoute}
      />

      <Dialog open={clearOpen} onOpenChange={closeClear}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">{t("staticRoutes.clear")}</DialogTitle>
            <DialogDescription>{t("staticRoutes.clearConfirm", { name: vrf.name })}</DialogDescription>
          </DialogHeader>
          {clearError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="whitespace-pre-wrap">{clearError}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => closeClear(false)} disabled={clearing}>
              {tc("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleClear} disabled={clearing}>
              {clearing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
