"use client";

import { useEffect, useState } from "react";
import { Network } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  dhcpService,
  type DHCPCapabilitiesResponse,
  type DHCPSharedNetwork,
} from "@/lib/api/dhcp";
import { DhcpCatalogFields } from "./DhcpCatalogFields";
import { catalogDraftFrom, catalogOps, type CatalogDraft } from "./dhcp-catalog";
import { failedSaveMessage } from "./dhcp-save";

const NO_LEAVES: never[] = [];

interface DHCPNetworkOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  network: DHCPSharedNetwork;
  capabilities: DHCPCapabilitiesResponse | null;
}

export function DHCPNetworkOptionsModal({
  open,
  onOpenChange,
  onSuccess,
  network,
  capabilities,
}: DHCPNetworkOptionsModalProps) {
  const leaves = capabilities?.catalog?.shared_network ?? NO_LEAVES;
  const [catalogDraft, setCatalogDraft] = useState<CatalogDraft>({});
  const [catalogOriginal, setCatalogOriginal] = useState<CatalogDraft>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const loaded = catalogDraftFrom(leaves, network.catalog);
    setCatalogDraft(loaded);
    setCatalogOriginal(loaded);
    setError(null);
  }, [open, network, leaves]);

  const handleSubmit = async () => {
    const operations = catalogOps(
      "set_network_catalog",
      "delete_network_catalog",
      leaves,
      catalogOriginal,
      catalogDraft,
    );
    if (operations.length === 0) {
      onOpenChange(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await dhcpService.batchConfigure({
        network_name: network.name,
        operations,
      });
      const saveError = failedSaveMessage(result, "Failed to save network options");
      if (saveError) {
        setError(saveError);
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save network options");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            {network.name} options
          </DialogTitle>
          <DialogDescription>
            Shared-network leaves this device supports that are not already set elsewhere
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4 py-2">
            {leaves.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No extra shared-network options on this device.
              </p>
            ) : (
              <DhcpCatalogFields
                leaves={leaves}
                values={catalogDraft}
                onChange={(token, value) =>
                  setCatalogDraft((current) => ({ ...current, [token]: value }))
                }
                idPrefix="net-dhcp"
              />
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || leaves.length === 0}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
