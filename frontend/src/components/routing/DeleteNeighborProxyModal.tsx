"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { staticRoutesService, type NeighborProxyArp, type NeighborProxyNd } from "@/lib/api/static-routes";

interface DeleteNeighborProxyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  entry: NeighborProxyArp | NeighborProxyNd | null;
  proxyType: "arp" | "nd";
}

export function DeleteNeighborProxyModal({
  open,
  onOpenChange,
  onSuccess,
  entry,
  proxyType,
}: DeleteNeighborProxyModalProps) {
  const t = useTranslations("routingExtras");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!entry) return;

    setError(null);
    setLoading(true);

    try {
      if (proxyType === "arp") {
        const arpEntry = entry as NeighborProxyArp;
        await staticRoutesService.deleteNeighborProxyArp(arpEntry.ip_address);
      } else {
        const ndEntry = entry as NeighborProxyNd;
        await staticRoutesService.deleteNeighborProxyNd(ndEntry.ipv6_address);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deleteNeighborProxy.failed"));
    } finally {
      setLoading(false);
    }
  };

  if (!entry) return null;

  const ipAddress = proxyType === "arp"
    ? (entry as NeighborProxyArp).ip_address
    : (entry as NeighborProxyNd).ipv6_address;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            {t("deleteNeighborProxy.title", { type: proxyType === "arp" ? "ARP" : "ND" })}
          </DialogTitle>
          <DialogDescription>
            {t("deleteNeighborProxy.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2 mb-4">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t("deleteNeighborProxy.type")}</span>
              <span className="text-sm font-medium">
                {proxyType === "arp" ? t("shared.arpProxy") : t("shared.ndProxy")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                {proxyType === "arp" ? t("deleteNeighborProxy.ipv4AddressColon") : t("deleteNeighborProxy.ipv6AddressColon")}
              </span>
              <span className="text-sm font-mono">{ipAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t("deleteNeighborProxy.interfacesColon")}</span>
              <span className="text-sm font-medium">
                {proxyType === "arp"
                  ? (entry as NeighborProxyArp).interfaces.join(", ")
                  : (entry as NeighborProxyNd).interfaces.join(", ")}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tc("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
