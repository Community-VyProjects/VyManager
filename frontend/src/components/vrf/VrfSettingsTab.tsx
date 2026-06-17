"use client";

import { useState } from "react";
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
  Save,
  X,
  Trash2,
} from "lucide-react";
import {
  VrfInstance,
  VrfCapabilities,
  vrfService,
} from "@/lib/api/vrf";

interface VrfSettingsTabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfSettingsTab({
  vrf,
  canWrite,
  onRefresh,
}: VrfSettingsTabProps) {
  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        throw new Error(result.error || "Failed to save settings");
      }
      setEditing(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRouteMap = async (family: "ip" | "ipv6", protocol: string) => {
    try {
      const result = await vrfService.deleteIpProtocolRouteMap(vrf.name, family, protocol);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete route-map");
      }
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete route-map");
    }
  };

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
            <CardTitle className="text-base">Core Settings</CardTitle>
            {canWrite && !editing && (
              <Button variant="outline" size="sm" onClick={handleStartEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            )}
            {editing && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Table ID</Label>
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
                  placeholder="VXLAN Network Identifier"
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
                  Disable VRF
                </Label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{vrf.description || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Table ID</p>
                <p className="text-sm">{vrf.table ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">VNI</p>
                <p className="text-sm">{vrf.vni ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge variant={vrf.disabled ? "outline" : "secondary"}>
                  {vrf.disabled ? "Disabled" : "Enabled"}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IP Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">IPv4 Settings</CardTitle>
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
                  Disable IPv4 forwarding
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ip-nht"
                  checked={ipNhtNoResolve}
                  onCheckedChange={(checked) => setIpNhtNoResolve(checked === true)}
                />
                <Label htmlFor="ip-nht" className="text-sm font-normal">
                  NHT: No resolve via default route
                </Label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Forwarding</p>
                <Badge variant={vrf.ip.disable_forwarding ? "outline" : "secondary"}>
                  {vrf.ip.disable_forwarding ? "Disabled" : "Enabled"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">NHT Resolve via Default</p>
                <Badge variant={vrf.ip.nht_no_resolve_via_default ? "outline" : "secondary"}>
                  {vrf.ip.nht_no_resolve_via_default ? "Disabled" : "Enabled"}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IPv6 Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">IPv6 Settings</CardTitle>
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
                  Disable IPv6 forwarding
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ipv6-nht"
                  checked={ipv6NhtNoResolve}
                  onCheckedChange={(checked) => setIpv6NhtNoResolve(checked === true)}
                />
                <Label htmlFor="ipv6-nht" className="text-sm font-normal">
                  NHT: No resolve via default route
                </Label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Forwarding</p>
                <Badge variant={vrf.ipv6.disable_forwarding ? "outline" : "secondary"}>
                  {vrf.ipv6.disable_forwarding ? "Disabled" : "Enabled"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">NHT Resolve via Default</p>
                <Badge variant={vrf.ipv6.nht_no_resolve_via_default ? "outline" : "secondary"}>
                  {vrf.ipv6.nht_no_resolve_via_default ? "Disabled" : "Enabled"}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Protocol Route Maps */}
      {(vrf.ip.protocol_route_maps.length > 0 || vrf.ipv6.protocol_route_maps.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Protocol Route Maps</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Family</TableHead>
                  <TableHead>Protocol</TableHead>
                  <TableHead>Route Map</TableHead>
                  {canWrite && <TableHead className="w-[60px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {vrf.ip.protocol_route_maps.map((rm) => (
                  <TableRow key={`ip-${rm.protocol}`}>
                    <TableCell>
                      <Badge variant="outline">IPv4</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{rm.protocol}</TableCell>
                    <TableCell className="font-mono text-sm">{rm.route_map}</TableCell>
                    {canWrite && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRouteMap("ip", rm.protocol)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {vrf.ipv6.protocol_route_maps.map((rm) => (
                  <TableRow key={`ipv6-${rm.protocol}`}>
                    <TableCell>
                      <Badge variant="outline">IPv6</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{rm.protocol}</TableCell>
                    <TableCell className="font-mono text-sm">{rm.route_map}</TableCell>
                    {canWrite && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRouteMap("ipv6", rm.protocol)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Configured Protocols Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configured Protocols & Services</CardTitle>
        </CardHeader>
        <CardContent>
          {vrf.protocols.length === 0 && vrf.services.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No protocols or services configured. Use the tabs above to add them.
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
