"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Network, ArrowRight, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { staticRoutesService } from "@/lib/api/static-routes";
import type { StaticRoute } from "@/lib/api/static-routes";

interface DeleteStaticRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  route: StaticRoute | null;
}

export function DeleteStaticRouteModal({ open, onOpenChange, onSuccess, route }: DeleteStaticRouteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!route) return;

    setLoading(true);
    setError(null);

    try {
      await staticRoutesService.deleteRoute(route.route_type, route.destination);
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete route");
    } finally {
      setLoading(false);
    }
  };

  if (!route) return null;

  const hasNextHops = route.next_hops.length > 0;
  const hasInterfaces = route.interfaces.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Delete Static Route</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this route? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* Route Details */}
        <div className="space-y-4 py-4">
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm font-medium">{route.destination}</span>
                  <Badge variant="outline" className={
                    route.route_type === "ipv4"
                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                      : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                  }>
                    {route.route_type.toUpperCase()}
                  </Badge>
                </div>
                {route.description && (
                  <p className="text-sm text-muted-foreground pl-6">{route.description}</p>
                )}
              </div>
            </div>

            {/* Route Type Details */}
            <div className="pl-6 space-y-2">
              {route.blackhole && (
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-500">Blackhole Route</span>
                  {route.blackhole_distance && (
                    <Badge variant="outline" className="text-xs">
                      Distance: {route.blackhole_distance}
                    </Badge>
                  )}
                </div>
              )}

              {hasNextHops && !route.blackhole && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Next-Hops:</span>
                  <div className="flex flex-wrap gap-1">
                    {route.next_hops.map((nh, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs font-mono">
                        <ArrowRight className="h-3 w-3 mr-1" />
                        {nh.address}
                        {nh.distance && ` (dist: ${nh.distance})`}
                        {nh.disable && " (disabled)"}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {hasInterfaces && !route.blackhole && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Interfaces:</span>
                  <div className="flex flex-wrap gap-1">
                    {route.interfaces.map((iface, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {iface.interface}
                        {iface.distance && ` (dist: ${iface.distance})`}
                        {iface.disable && " (disabled)"}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {route.dhcp_interface && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">DHCP Interface:</span>
                  <Badge variant="outline" className="text-xs">
                    {route.dhcp_interface}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                This will permanently delete the route
              </p>
              <p className="text-sm text-muted-foreground">
                Traffic destined for {route.destination} will no longer use this route.
                Make sure you have alternative routing configured if needed.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete Route"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
