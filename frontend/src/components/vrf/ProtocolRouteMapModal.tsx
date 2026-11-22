"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { NONE_SENTINEL } from "@/lib/named-list-select-options";
import { AlertCircle, Loader2 } from "lucide-react";
import { vrfService, type VrfCapabilities, type VrfInstance } from "@/lib/api/vrf";
import { routeMapService } from "@/lib/api/route-map";
import type { ApiError } from "@/lib/types/api";

export type RouteMapFamily = "ip" | "ipv6";

export const FAMILY_LABEL: Record<RouteMapFamily, string> = { ip: "IPv4", ipv6: "IPv6" };

/** The entry being edited, or the family an Add starts on. */
export interface ProtocolRouteMapTarget {
  family: RouteMapFamily;
  protocol: string;
  routeMap: string;
}

interface ProtocolRouteMapModalProps {
  /** null = closed. An empty protocol opens the modal in Add mode. */
  target: ProtocolRouteMapTarget | null;
  onClose: () => void;
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  onSaved: () => void;
}

export function ProtocolRouteMapModal({
  target,
  onClose,
  vrf,
  capabilities,
  onSaved,
}: ProtocolRouteMapModalProps) {
  const t = useTranslations("vrf");
  const tc = useTranslations("common");
  const open = target !== null;
  const editing = !!target?.protocol;

  const [family, setFamily] = useState<RouteMapFamily>(target?.family ?? "ip");
  const [protocol, setProtocol] = useState(target?.protocol ?? "");
  const [routeMap, setRouteMap] = useState(target?.routeMap ?? "");
  const [routeMapNames, setRouteMapNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seedKey = target ? JSON.stringify(target) : "";
  const [seed, setSeed] = useState(seedKey);
  if (seedKey !== seed) {
    setSeed(seedKey);
    setFamily(target?.family ?? "ip");
    setProtocol(target?.protocol ?? "");
    setRouteMap(target?.routeMap ?? "");
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    let live = true;
    routeMapService
      .getConfig()
      .then((config) => {
        if (live) setRouteMapNames(config.route_maps.map((rm) => rm.name));
      })
      .catch(() => {
        if (live) setRouteMapNames([]);
      });
    return () => {
      live = false;
    };
  }, [open]);

  const flag = capabilities.features.protocol_route_maps;
  const allowed = (family === "ip" ? flag.ip_protocols : flag.ipv6_protocols) || [];
  const configured = vrf[family].protocol_route_maps.map((rm) => rm.protocol);
  // Add offers only protocols with no route-map yet; edit keeps its own.
  const protocolOptions = editing ? [protocol] : allowed.filter((p) => !configured.includes(p));

  // A save in flight keeps the modal open so its result is shown.
  const handleOpenChange = (next: boolean) => {
    if (!next && !saving) onClose();
  };

  const handleFamilyChange = (next: string) => {
    setFamily(next as RouteMapFamily);
    setProtocol("");
  };

  const handleSave = async () => {
    if (!protocol) {
      setError(t("settings.protocolRequired"));
      return;
    }
    if (!routeMap) {
      setError(t("settings.routeMapRequired"));
      return;
    }
    if (editing && routeMap === target?.routeMap) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await vrfService.setIpProtocolRouteMap(vrf.name, family, protocol, routeMap);
      if (!result.success) {
        setError(result.error || t("settings.setRouteMapFailed"));
        return;
      }
      onSaved();
      onClose();
    } catch (err) {
      setError((err as ApiError).message || t("settings.setRouteMapFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("settings.editRouteMap") : t("settings.addRouteMap")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm whitespace-pre-wrap">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="rm-family">{t("settings.family")}</Label>
            <Select value={family} onValueChange={handleFamilyChange} disabled={editing || saving}>
              <SelectTrigger id="rm-family">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FAMILY_LABEL) as RouteMapFamily[]).map((f) => (
                  <SelectItem key={f} value={f}>
                    {FAMILY_LABEL[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rm-protocol">{t("settings.protocol")}</Label>
            <Select
              value={protocol || NONE_SENTINEL}
              onValueChange={(next) => setProtocol(next === NONE_SENTINEL ? "" : next)}
              disabled={editing || saving}
            >
              <SelectTrigger id="rm-protocol">
                <SelectValue placeholder={tc("none")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SENTINEL}>{tc("none")}</SelectItem>
                {protocolOptions.map((p) => (
                  <SelectItem key={p} value={p} className="font-mono">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rm-route-map">{t("settings.routeMap")}</Label>
            <NamedListSelect
              id="rm-route-map"
              value={routeMap}
              names={routeMapNames}
              onValueChange={setRouteMap}
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
