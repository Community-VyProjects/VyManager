"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, X, ArrowRight } from "lucide-react";
import { firewallZonesService } from "@/lib/api/firewall-zones";
import type { FirewallZone } from "@/lib/api/types/firewall-zones";

interface ZonePolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  sourceZone: string;
  destZone: string;
  zones: FirewallZone[];
  canEdit: boolean;
}

export function ZonePolicyModal({
  open,
  onOpenChange,
  onSuccess,
  sourceZone,
  destZone,
  zones,
  canEdit,
}: ZonePolicyModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ipv4Name, setIpv4Name] = useState("");
  const [ipv6Name, setIpv6Name] = useState("");

  const isIntraZone = sourceZone === destZone;

  // Load existing policy on open
  useEffect(() => {
    if (open) {
      if (isIntraZone) {
        const zone = zones.find((z) => z.name === sourceZone);
        setIpv4Name(zone?.intra_zone_filtering?.firewall_name ?? "");
        setIpv6Name(zone?.intra_zone_filtering?.firewall_ipv6_name ?? "");
      } else {
        const dest = zones.find((z) => z.name === destZone);
        const fromEntry = dest?.from_zones.find((f) => f.from_zone === sourceZone);
        setIpv4Name(fromEntry?.firewall_name ?? "");
        setIpv6Name(fromEntry?.firewall_ipv6_name ?? "");
      }
      setError(null);
    }
  }, [open, sourceZone, destZone, zones, isIntraZone]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const v4 = ipv4Name.trim() || null;
      const v6 = ipv6Name.trim() || null;

      if (isIntraZone) {
        await firewallZonesService.setIntraZone(sourceZone, { firewallName: v4, firewallIpv6Name: v6 });
      } else if (!v4 && !v6) {
        await firewallZonesService.deleteFromPolicy(destZone, sourceZone);
      } else {
        await firewallZonesService.setFromPolicy(destZone, sourceZone, v4, v6);
      }
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update zone policy");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isIntraZone) {
        await firewallZonesService.setIntraZone(sourceZone, { firewallName: null, firewallIpv6Name: null });
      } else {
        await firewallZonesService.deleteFromPolicy(destZone, sourceZone);
      }
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove zone policy");
    } finally {
      setLoading(false);
    }
  };

  const dest = zones.find((z) => z.name === destZone);
  const fromEntry = isIntraZone
    ? zones.find((z) => z.name === sourceZone)?.intra_zone_filtering
    : dest?.from_zones.find((f) => f.from_zone === sourceZone);
  const hasExisting = !!fromEntry?.firewall_name || !!fromEntry?.firewall_ipv6_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isIntraZone ? (
              <>
                Intra-zone Policy:{" "}
                <Badge variant="outline" className="font-mono text-sm">{sourceZone}</Badge>
              </>
            ) : (
              <>
                Policy:{" "}
                <Badge variant="outline" className="font-mono text-sm">{sourceZone}</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="font-mono text-sm">{destZone}</Badge>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isIntraZone
              ? canEdit
                ? "Assign firewall rulesets applied to traffic within the same zone. Clear both to remove the intra-zone policy."
                : "Firewall rulesets applied to traffic within this zone."
              : canEdit
                ? "Assign firewall rulesets applied to traffic entering the destination zone from the source zone. Clear both to remove the policy."
                : "Firewall rulesets applied to traffic entering the destination zone from the source zone."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <pre className="text-sm text-destructive whitespace-pre-wrap font-mono break-all">{error}</pre>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="policy-ipv4">IPv4 Firewall Ruleset</Label>
            <div className="flex gap-2">
              <Input
                id="policy-ipv4"
                value={ipv4Name}
                onChange={(e) => setIpv4Name(e.target.value)}
                placeholder={isIntraZone ? `e.g., ${sourceZone}-${sourceZone}` : `e.g., ${sourceZone}_TO_${destZone}`}
                className="font-mono"
                disabled={!canEdit}
              />
              {canEdit && ipv4Name && (
                <Button variant="ghost" size="sm" onClick={() => setIpv4Name("")} className="px-2">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="policy-ipv6">IPv6 Firewall Ruleset</Label>
            <div className="flex gap-2">
              <Input
                id="policy-ipv6"
                value={ipv6Name}
                onChange={(e) => setIpv6Name(e.target.value)}
                placeholder={isIntraZone ? `e.g., ${sourceZone}-${sourceZone}-V6` : `e.g., ${sourceZone}_TO_${destZone}_V6`}
                className="font-mono"
                disabled={!canEdit}
              />
              {canEdit && ipv6Name && (
                <Button variant="ghost" size="sm" onClick={() => setIpv6Name("")} className="px-2">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {!canEdit && !hasExisting && (
            <p className="text-sm text-muted-foreground text-center py-2">
              {isIntraZone ? "No intra-zone policy configured." : "No policy configured for this zone pair."}
            </p>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          {canEdit && hasExisting && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={loading}
              className="mr-auto text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              Remove Policy
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              {canEdit ? "Cancel" : "Close"}
            </Button>
            {canEdit && (
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : "Save Policy"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
