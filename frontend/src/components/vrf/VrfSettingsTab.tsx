"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  Loader2,
  Pencil,
  Plus,
  Save,
  X,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  VrfInstance,
  VrfCapabilities,
  vrfService,
} from "@/lib/api/vrf";
import type { ApiError } from "@/lib/types/api";
import {
  FAMILY_LABEL,
  ProtocolRouteMapModal,
  type ProtocolRouteMapTarget,
  type RouteMapFamily,
} from "./ProtocolRouteMapModal";

interface VrfSettingsTabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfSettingsTab({
  vrf,
  capabilities,
  canWrite,
  onRefresh,
}: VrfSettingsTabProps) {
  const t = useTranslations("vrf");
  const tc = useTranslations("common");
  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Protocol route-map add/edit and delete
  const [routeMapTarget, setRouteMapTarget] = useState<ProtocolRouteMapTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProtocolRouteMapTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form fields
  const [description, setDescription] = useState(vrf.description ?? "");
  const [table, setTable] = useState(vrf.table?.toString() ?? "");
  const [vni, setVni] = useState(vrf.vni?.toString() ?? "");
  const [disabled, setDisabled] = useState(vrf.disabled);
  const [ipDisableForwarding, setIpDisableForwarding] = useState(vrf.ip.disable_forwarding);
  const [ipNhtNoResolve, setIpNhtNoResolve] = useState(vrf.ip.nht_no_resolve_via_default);
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(vrf.ipv6.disable_forwarding);
  const [ipv6NhtNoResolve, setIpv6NhtNoResolve] = useState(vrf.ipv6.nht_no_resolve_via_default);

  const handleStartEdit = () => {
    setDescription(vrf.description ?? "");
    setTable(vrf.table?.toString() ?? "");
    setVni(vrf.vni?.toString() ?? "");
    setDisabled(vrf.disabled);
    setIpDisableForwarding(vrf.ip.disable_forwarding);
    setIpNhtNoResolve(vrf.ip.nht_no_resolve_via_default);
    setIpv6DisableForwarding(vrf.ipv6.disable_forwarding);
    setIpv6NhtNoResolve(vrf.ipv6.nht_no_resolve_via_default);
    setEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const result = await vrfService.updateVrfSettings(vrf.name, vrf, {
        description: description.trim() || null,
        table: table.trim(),
        vni: vni.trim() || null,
        disabled,
        ip_disable_forwarding: ipDisableForwarding,
        ip_nht_no_resolve: ipNhtNoResolve,
        ipv6_disable_forwarding: ipv6DisableForwarding,
        ipv6_nht_no_resolve: ipv6NhtNoResolve,
      });
      if (!result.success) {
        throw new Error(result.error || t("settings.saveFailed"));
      }
      setEditing(false);
      onRefresh();
    } catch (err) {
      setError((err as ApiError).message || t("settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  // A delete in flight keeps the dialog open so its result is shown.
  const handleDeleteOpenChange = (next: boolean) => {
    if (!next && !deleting) {
      setDeleteTarget(null);
      setDeleteError(null);
    }
  };

  const handleDeleteRouteMap = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await vrfService.deleteIpProtocolRouteMap(
        vrf.name,
        deleteTarget.family,
        deleteTarget.protocol
      );
      if (!result.success) {
        setDeleteError(result.error || t("settings.deleteRouteMapFailed"));
        return;
      }
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      setDeleteError((err as ApiError).message || t("settings.deleteRouteMapFailed"));
    } finally {
      setDeleting(false);
    }
  };

  const routeMapRows = (["ip", "ipv6"] as RouteMapFamily[]).flatMap((family) =>
    vrf[family].protocol_route_maps.map((rm) => ({
      family,
      protocol: rm.protocol,
      routeMap: rm.route_map,
    }))
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Core Settings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("settings.coreSettings")}</CardTitle>
            {canWrite && !editing && (
              <Button variant="outline" size="sm" onClick={handleStartEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                {tc("edit")}
              </Button>
            )}
            {editing && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  {tc("cancel")}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {tc("save")}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{tc("description")}</Label>
                <Input
                  placeholder={tc("optionalDescription")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("tableId")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={table}
                  onChange={(e) => setTable(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>VNI</Label>
                <Input
                  placeholder={t("vxlanNetworkId")}
                  type="number"
                  min={0}
                  value={vni}
                  onChange={(e) => setVni(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="settings-disabled"
                  checked={disabled}
                  onCheckedChange={(checked) => setDisabled(checked === true)}
                />
                <Label htmlFor="settings-disabled" className="text-sm font-normal">
                  {t("settings.disableVrf")}
                </Label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{tc("description")}</p>
                <p className="text-sm">{vrf.description || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("tableId")}</p>
                <p className="text-sm">{vrf.table ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">VNI</p>
                <p className="text-sm">{vrf.vni ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{tc("status")}</p>
                <Badge variant={vrf.disabled ? "outline" : "secondary"}>
                  {vrf.disabled ? tc("disabled") : tc("enabled")}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IP Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("settings.ipv4Settings")}</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ip-disable-fwd"
                  checked={ipDisableForwarding}
                  onCheckedChange={(checked) => setIpDisableForwarding(checked === true)}
                />
                <Label htmlFor="ip-disable-fwd" className="text-sm font-normal">
                  {t("settings.disableIpv4Forwarding")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ip-nht"
                  checked={ipNhtNoResolve}
                  onCheckedChange={(checked) => setIpNhtNoResolve(checked === true)}
                />
                <Label htmlFor="ip-nht" className="text-sm font-normal">
                  {t("settings.nhtNoResolve")}
                </Label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("settings.forwarding")}</p>
                <Badge variant={vrf.ip.disable_forwarding ? "outline" : "secondary"}>
                  {vrf.ip.disable_forwarding ? tc("disabled") : tc("enabled")}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("settings.nhtResolveViaDefault")}</p>
                <Badge variant={vrf.ip.nht_no_resolve_via_default ? "outline" : "secondary"}>
                  {vrf.ip.nht_no_resolve_via_default ? tc("disabled") : tc("enabled")}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IPv6 Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("settings.ipv6Settings")}</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ipv6-disable-fwd"
                  checked={ipv6DisableForwarding}
                  onCheckedChange={(checked) => setIpv6DisableForwarding(checked === true)}
                />
                <Label htmlFor="ipv6-disable-fwd" className="text-sm font-normal">
                  {t("settings.disableIpv6Forwarding")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ipv6-nht"
                  checked={ipv6NhtNoResolve}
                  onCheckedChange={(checked) => setIpv6NhtNoResolve(checked === true)}
                />
                <Label htmlFor="ipv6-nht" className="text-sm font-normal">
                  {t("settings.nhtNoResolve")}
                </Label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("settings.forwarding")}</p>
                <Badge variant={vrf.ipv6.disable_forwarding ? "outline" : "secondary"}>
                  {vrf.ipv6.disable_forwarding ? tc("disabled") : tc("enabled")}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("settings.nhtResolveViaDefault")}</p>
                <Badge variant={vrf.ipv6.nht_no_resolve_via_default ? "outline" : "secondary"}>
                  {vrf.ipv6.nht_no_resolve_via_default ? tc("disabled") : tc("enabled")}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Protocol Route Maps */}
      {(canWrite || routeMapRows.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("settings.protocolRouteMaps")}</CardTitle>
              {canWrite && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRouteMapTarget({ family: "ip", protocol: "", routeMap: "" })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  {t("settings.addRouteMap")}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {routeMapRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("settings.noRouteMaps")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t("settings.family")}</TableHead>
                    <TableHead>{t("settings.protocol")}</TableHead>
                    <TableHead>{t("settings.routeMap")}</TableHead>
                    {canWrite && <TableHead className="w-[100px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routeMapRows.map((row) => (
                    <TableRow key={`${row.family}-${row.protocol}`}>
                      <TableCell>
                        <Badge variant="outline">{FAMILY_LABEL[row.family]}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{row.protocol}</TableCell>
                      <TableCell className="font-mono text-sm">{row.routeMap}</TableCell>
                      {canWrite && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={tc("edit")}
                              onClick={() => setRouteMapTarget(row)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={tc("delete")}
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(row);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <ProtocolRouteMapModal
        target={routeMapTarget}
        onClose={() => setRouteMapTarget(null)}
        vrf={vrf}
        capabilities={capabilities}
        onSaved={onRefresh}
      />

      <Dialog open={deleteTarget !== null} onOpenChange={handleDeleteOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              {t("settings.deleteRouteMapTitle")}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget &&
                t("settings.deleteRouteMapDescription", {
                  routeMap: deleteTarget.routeMap,
                  family: FAMILY_LABEL[deleteTarget.family],
                  protocol: deleteTarget.protocol,
                })}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm whitespace-pre-wrap">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDeleteOpenChange(false)}
              disabled={deleting}
            >
              {tc("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteRouteMap} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configured Protocols Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("settings.configuredProtocols")}</CardTitle>
        </CardHeader>
        <CardContent>
          {vrf.protocols.length === 0 && vrf.services.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("settings.noProtocols")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {vrf.protocols.map((p) => (
                <Badge key={p} variant="secondary">
                  {p}
                </Badge>
              ))}
              {vrf.services.map((s) => (
                <Badge key={s} variant="outline">
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
