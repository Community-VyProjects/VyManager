"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Layers } from "lucide-react";
import { vrfService, type VRF } from "@/lib/api/vrf";
import { useToast } from "@/hooks/useToast";

interface VRFDeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  vrf: VRF;
}

export function VRFDeleteConfirmModal({
  open,
  onOpenChange,
  onSuccess,
  vrf,
}: VRFDeleteConfirmModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const result = await vrfService.deleteVRF(vrf.name);

      if (result.success) {
        toast.success("VRF Deleted", `VRF "${vrf.name}" has been deleted`);
        onSuccess();
      } else {
        toast.error("Failed", result.error || "Failed to delete VRF");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const hasInterfaces = vrf.interfaces.length > 0;
  const hasRoutes =
    vrf.static_routes_ipv4.length > 0 || vrf.static_routes_ipv6.length > 0;
  const hasBgp = !!vrf.bgp;
  const hasOspf = vrf.ospf && vrf.ospf.areas.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete VRF
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this VRF?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{vrf.name}</p>
              <p className="text-sm text-muted-foreground">Table: {vrf.table}</p>
            </div>
          </div>

          {(hasInterfaces || hasRoutes || hasBgp || hasOspf) && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm font-medium text-destructive mb-2">
                This VRF contains:
              </p>
              <div className="flex flex-wrap gap-2">
                {hasInterfaces && (
                  <Badge variant="outline" className="bg-destructive/10">
                    {vrf.interfaces.length} interface(s)
                  </Badge>
                )}
                {vrf.static_routes_ipv4.length > 0 && (
                  <Badge variant="outline" className="bg-destructive/10">
                    {vrf.static_routes_ipv4.length} IPv4 route(s)
                  </Badge>
                )}
                {vrf.static_routes_ipv6.length > 0 && (
                  <Badge variant="outline" className="bg-destructive/10">
                    {vrf.static_routes_ipv6.length} IPv6 route(s)
                  </Badge>
                )}
                {hasBgp && (
                  <Badge variant="outline" className="bg-destructive/10">
                    BGP (AS {vrf.bgp?.system_as})
                  </Badge>
                )}
                {hasOspf && (
                  <Badge variant="outline" className="bg-destructive/10">
                    OSPF ({vrf.ospf?.areas.length} areas)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-destructive mt-2">
                All configurations will be permanently deleted.
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The VRF and all its configurations will be
            permanently removed.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete VRF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
