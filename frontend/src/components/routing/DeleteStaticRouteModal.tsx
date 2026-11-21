"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Network, ArrowRight, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { staticRoutesService, type StaticRoute, type VyOSResponse } from "@/lib/api/static-routes";
import type { StaticRouteScope } from "@/lib/api/static-routes-save-ops";
import { vrfService } from "@/lib/api/vrf";
import type { ApiError } from "@/lib/types/api";
import { useTranslations } from "next-intl";

interface DeleteStaticRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  scope: StaticRouteScope;
  route: StaticRoute | null;
}

function deleteRoute(scope: StaticRouteScope, route: StaticRoute): Promise<VyOSResponse> {
  if (scope.kind === "vrf") {
    return vrfService.deleteStaticRoute(scope.vrf, route.route_type, route.destination);
  }
  const tableId = scope.kind === "table" ? scope.tableId : null;
  return staticRoutesService.deleteRoute(tableId, route.route_type, route.destination);
}

export function DeleteStaticRouteModal({ open, onOpenChange, onSuccess, scope, route }: DeleteStaticRouteModalProps) {
  const t = useTranslations("staticRoutes");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    if (!next) setError(null);
    onOpenChange(next);
  };

  const handleDelete = async () => {
    if (!route) return;

    setLoading(true);
    setError(null);

    try {
      const result = await deleteRoute(scope, route);
      if (!result.success) {
        setError(result.error || t("deleteModal.failed"));
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("deleteModal.failed"));
    } finally {
      setLoading(false);
    }
  };

  if (!route) return null;

  const hasNextHops = route.next_hops.length > 0;
  const hasInterfaces = route.interfaces.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {scope.kind === "table"
              ? t("deleteModal.titleTable", { id: String(scope.tableId) })
              : scope.kind === "vrf"
                ? t("deleteModal.titleVrf", { vrf: scope.vrf })
                : t("deleteModal.title")}
          </DialogTitle>
          <DialogDescription>
            {t("deleteModal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="border rounded-lg p-4 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm font-medium">{route.destination}</span>
                <Badge variant="outline" className={
                  route.route_type === "ipv4"
                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                }>
                  {route.route_type === "ipv4" ? t("family.ipv4") : t("family.ipv6")}
                </Badge>
              </div>
              {route.description && (
                <p className="text-sm text-muted-foreground pl-6">{route.description}</p>
              )}
            </div>

            <div className="pl-6 space-y-2">
              {route.blackhole && (
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-500">{t("deleteModal.blackholeRoute")}</span>
                  {route.blackhole_distance && (
                    <Badge variant="outline" className="text-xs">
                      {t("deleteModal.distance", { distance: String(route.blackhole_distance) })}
                    </Badge>
                  )}
                </div>
              )}

              {route.reject && (
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-orange-500">{t("deleteModal.rejectRoute")}</span>
                  {route.reject_distance && (
                    <Badge variant="outline" className="text-xs">
                      {t("deleteModal.distance", { distance: String(route.reject_distance) })}
                    </Badge>
                  )}
                </div>
              )}

              {hasNextHops && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">{t("deleteModal.nextHops")}</span>
                  <div className="flex flex-wrap gap-1">
                    {route.next_hops.map((nh) => (
                      <Badge key={nh.address} variant="secondary" className="text-xs font-mono">
                        <ArrowRight className="h-3 w-3 mr-1" />
                        {nh.address}
                        {nh.distance && t("deleteModal.distSuffix", { distance: String(nh.distance) })}
                        {nh.disable && t("routes.disabledSuffix")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {hasInterfaces && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">{t("deleteModal.interfaces")}</span>
                  <div className="flex flex-wrap gap-1">
                    {route.interfaces.map((iface) => (
                      <Badge key={iface.interface} variant="outline" className="text-xs">
                        {iface.interface}
                        {iface.distance && t("deleteModal.distSuffix", { distance: String(iface.distance) })}
                        {iface.disable && t("routes.disabledSuffix")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {route.dhcp_interfaces.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">{t("deleteModal.dhcpInterfaces")}</span>
                  <div className="flex flex-wrap gap-1">
                    {route.dhcp_interfaces.map((iface) => (
                      <Badge key={iface} variant="outline" className="text-xs">
                        {iface}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                {t("deleteModal.warningTitle")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("deleteModal.warningBody", { destination: route.destination })}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? tc("deleting") : t("deleteModal.deleteRoute")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
