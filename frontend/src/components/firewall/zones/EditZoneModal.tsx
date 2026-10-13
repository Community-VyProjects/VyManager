"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { VrfSelect } from "@/components/ui/vrf-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Trash2, X } from "lucide-react";
import { firewallZonesService } from "@/lib/api/firewall-zones";
import { showService } from "@/lib/api/show";
import type { InterfaceName } from "@/lib/api/show";
import type { FirewallZone, ZoneIntraFiltering, ZonesCapabilities } from "@/lib/api/types/firewall-zones";

type IntraMode = "chain" | "accept" | "drop" | "none";

function getIntraMode(intra: ZoneIntraFiltering | null | undefined): IntraMode {
  if (!intra) return "none";
  if (intra.action === "accept") return "accept";
  if (intra.action === "drop") return "drop";
  if (intra.firewall_name || intra.firewall_ipv6_name) return "chain";
  return "none";
}

interface EditZoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  zone: FirewallZone;
  capabilities: ZonesCapabilities | null;
  /** Other non-local zones (peers) — used when deprovisioning */
  peerZones: string[];
  /** True when this is the last non-local zone (deleting it also removes LOCAL) */
  isLastNonLocalZone: boolean;
}

export function EditZoneModal({
  open,
  onOpenChange,
  onSuccess,
  zone,
  capabilities,
  peerZones,
  isLastNonLocalZone,
}: EditZoneModalProps) {
  const t = useTranslations("firewallZones");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Available interfaces from show endpoint
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);

  // Editable state
  const [description, setDescription] = useState(zone.description ?? "");
  const [defaultAction, setDefaultAction] = useState(zone.default_action ?? "drop");
  const [defaultLog, setDefaultLog] = useState(zone.default_log);
  const [interfaces, setInterfaces] = useState<string[]>([...zone.interfaces]);
  const [vrfs, setVrfs] = useState<string[]>([...zone.vrfs]);
  const [intraMode, setIntraMode] = useState<IntraMode>(getIntraMode(zone.intra_zone_filtering));

  // Sync when zone prop changes
  useEffect(() => {
    if (!open) return;
    setDescription(zone.description ?? "");
    setDefaultAction(zone.default_action ?? "drop");
    setDefaultLog(zone.default_log);
    setInterfaces([...zone.interfaces]);
    setVrfs([...zone.vrfs]);
    setIntraMode(getIntraMode(zone.intra_zone_filtering));
    setError(null);
    setConfirmDelete(false);

    if (!zone.local_zone) {
      setLoadingInterfaces(true);
      showService
        .getAllInterfaces()
        .then((res) => setAvailableInterfaces(res.interfaces))
        .catch(() => setAvailableInterfaces([]))
        .finally(() => setLoadingInterfaces(false));
    }
  }, [open, zone]);

  const handleClose = () => {
    setError(null);
    setConfirmDelete(false);
    onOpenChange(false);
  };

  const toggleInterface = (name: string) => {
    setInterfaces((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await firewallZonesService.updateZone(
        zone.name,
        zone,
        {
          description: description || null,
          default_action: defaultAction,
          default_log: defaultLog,
          interfaces: zone.local_zone ? [] : interfaces,
          vrfs: zone.local_zone ? [] : vrfs,
        },
        capabilities
      );

      if (!zone.local_zone && intraMode !== getIntraMode(zone.intra_zone_filtering)) {
        const intraIpv4 = zone.intra_zone_filtering?.firewall_name ?? `${zone.name}-${zone.name}`;
        const intraIpv6 = zone.intra_zone_filtering?.firewall_ipv6_name ?? `${zone.name}-${zone.name}-V6`;
        if (intraMode === "chain") {
          await firewallZonesService.setIntraZone(zone.name, { action: null, firewallName: intraIpv4, firewallIpv6Name: intraIpv6 });
        } else if (intraMode === "accept") {
          await firewallZonesService.setIntraZone(zone.name, { action: "accept", firewallName: null, firewallIpv6Name: null });
        } else if (intraMode === "drop") {
          await firewallZonesService.setIntraZone(zone.name, { action: "drop", firewallName: null, firewallIpv6Name: null });
        } else {
          await firewallZonesService.setIntraZone(zone.name, { action: null, firewallName: null, firewallIpv6Name: null });
        }
      }

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("editZone.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleteLoading(true);
    setError(null);
    try {
      await firewallZonesService.deprovisionZone(zone.name, peerZones, isLastNonLocalZone);
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("editZone.deleteFailed"));
    } finally {
      setDeleteLoading(false);
    }
  };

  const supportsVrf = capabilities?.features.member_vrf.supported ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editZone.title", { name: zone.name })}</DialogTitle>
          <DialogDescription>
            {zone.local_zone
              ? t("editZone.descriptionLocal")
              : t("editZone.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <pre className="text-sm text-destructive whitespace-pre-wrap font-mono break-all">{error}</pre>
            </div>
          )}

          {/* Basic */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("zoneForm.basic")}</p>

            <div className="space-y-2">
              <Label>{t("zoneTable.zoneName")}</Label>
              <Input value={zone.name} disabled className="font-mono bg-muted/50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">{tc("description")}</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tc("optionalDescription")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-default-action">{t("zoneForm.defaultAction")}</Label>
                <Select value={defaultAction} onValueChange={setDefaultAction}>
                  <SelectTrigger id="edit-default-action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drop">{t("zoneForm.drop")}</SelectItem>
                    <SelectItem value="reject">{t("zoneForm.reject")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("zoneForm.defaultLog")}</Label>
                <div className="flex items-center gap-2 h-10">
                  <Checkbox
                    id="edit-default-log"
                    checked={defaultLog}
                    onCheckedChange={(v) => setDefaultLog(!!v)}
                  />
                  <label htmlFor="edit-default-log" className="text-sm cursor-pointer">
                    {t("zoneForm.logDefault")}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Interfaces (only for non-local zones) */}
          {!zone.local_zone && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("zoneForm.interfaces")}</p>

              <div className="space-y-2">
                <Label>{t("zoneForm.memberInterfaces")}</Label>
                {loadingInterfaces ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("zoneForm.loadingInterfaces")}
                  </div>
                ) : availableInterfaces.length > 0 ? (
                  <div className="border rounded-md max-h-44 overflow-y-auto p-2 space-y-1">
                    {availableInterfaces.map((iface) => (
                      <div key={iface.name} className="flex items-center gap-2 py-0.5">
                        <Checkbox
                          id={`edit-iface-${iface.name}`}
                          checked={interfaces.includes(iface.name)}
                          onCheckedChange={() => toggleInterface(iface.name)}
                        />
                        <label
                          htmlFor={`edit-iface-${iface.name}`}
                          className="text-sm font-mono cursor-pointer flex-1"
                        >
                          {iface.name}
                          {iface.description && (
                            <span className="text-xs text-muted-foreground ml-2 font-sans">{iface.description}</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("zoneForm.noInterfaces")}</p>
                )}

                {interfaces.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {interfaces.map((iface) => (
                      <Badge key={iface} variant="secondary" className="font-mono gap-1">
                        {iface}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => toggleInterface(iface)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {supportsVrf && (
                <div className="space-y-2">
                  <Label>{t("zoneForm.memberVrfs")}</Label>
                  <VrfSelect
                    value=""
                    onValueChange={(v) => {
                      if (v && !vrfs.includes(v)) setVrfs([...vrfs, v]);
                    }}
                    filter={(v) => !vrfs.includes(v.name)}
                    includeNone={false}
                    placeholder={t("zoneForm.addVrf")}
                    className="font-mono"
                  />
                  {vrfs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {vrfs.map((vrf) => (
                        <Badge key={vrf} variant="secondary" className="font-mono gap-1">
                          {vrf}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => setVrfs(vrfs.filter((v) => v !== vrf))}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Intra-Zone Filtering (non-local zones only) */}
          {!zone.local_zone && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("editZone.intraTitle")}</p>
              <div className="space-y-2">
                <Label>{t("editZone.mode")}</Label>
                <Select value={intraMode} onValueChange={(v) => setIntraMode(v as IntraMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chain">{t("editZone.modeChain")}</SelectItem>
                    <SelectItem value="accept">{t("editZone.modeAccept")}</SelectItem>
                    <SelectItem value="drop">{t("editZone.modeDrop")}</SelectItem>
                    <SelectItem value="none">{tc("default")}</SelectItem>
                  </SelectContent>
                </Select>
                {intraMode === "chain" && (
                  <div className="text-xs text-muted-foreground space-y-1 rounded-md border px-3 py-2 bg-muted/30">
                    <p>{t("editZone.chainHelp")}</p>
                    <p className="mt-1">
                      IPv4: <span className="font-mono text-foreground">{zone.intra_zone_filtering?.firewall_name ?? `${zone.name}-${zone.name}`}</span>
                    </p>
                    <p>
                      IPv6: <span className="font-mono text-foreground">{zone.intra_zone_filtering?.firewall_ipv6_name ?? `${zone.name}-${zone.name}-V6`}</span>
                    </p>
                  </div>
                )}
                {intraMode === "accept" && (
                  <p className="text-xs text-muted-foreground">{t("editZone.acceptHelp")}</p>
                )}
                {intraMode === "drop" && (
                  <p className="text-xs text-muted-foreground">{t("editZone.dropHelp")}</p>
                )}
                {intraMode === "none" && (
                  <p className="text-xs text-muted-foreground">{t("editZone.noneHelp")}</p>
                )}
              </div>
            </div>
          )}

          {/* Delete warning for last zone */}
          {confirmDelete && isLastNonLocalZone && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-400">
              {t("editZone.lastZoneWarning")}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          {/* Local zones cannot be manually deleted */}
          {!zone.local_zone && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || deleteLoading}
              className="mr-auto"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  {t("editZone.deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1" />
                  {confirmDelete ? t("editZone.confirmDelete") : t("editZone.deleteZone")}
                </>
              )}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            {confirmDelete && (
              <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleteLoading}>
                {t("editZone.cancelDelete")}
              </Button>
            )}
            <Button variant="outline" onClick={handleClose} disabled={loading || deleteLoading}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={loading || deleteLoading}>
              {loading ? tc("saving") : tc("saveChanges")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
