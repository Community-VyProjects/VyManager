"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Edit2 } from "lucide-react";
import {
  systemSettingsService,
  type SystemConfig,
  type SystemCapabilities,
} from "@/lib/api/system-settings";
import { useToast } from "@/hooks/useToast";

interface Props {
  config: SystemConfig;
  capabilities: SystemCapabilities;
  isReadOnly: boolean;
  onRefresh: () => void;
}

export function IpSettingsPanel({ config, capabilities: _cap, isReadOnly, onRefresh }: Props) {
  const { toast } = useToast();

  const ip = config.ip;
  const ipv6 = config.ipv6;

  // IP editing state
  const [editingIp, setEditingIp] = useState(false);
  const [ipArpSize, setIpArpSize] = useState(ip?.arp_ndp_table_size ? String(ip.arp_ndp_table_size) : "");
  const [ipDisableForwarding, setIpDisableForwarding] = useState(ip?.disable_forwarding ?? false);
  const [ipMultipathIgnore, setIpMultipathIgnore] = useState(ip?.multipath_ignore_unreachable ?? false);
  const [ipMultipathL4, setIpMultipathL4] = useState(ip?.multipath_layer4_hashing ?? false);
  const [ipNht, setIpNht] = useState(ip?.nht_no_resolve_via_default ?? false);
  const [ipSaving, setIpSaving] = useState(false);
  const [ipError, setIpError] = useState<string | null>(null);

  // IPv6 editing state
  const [editingIpv6, setEditingIpv6] = useState(false);
  const [ipv6NeighborSize, setIpv6NeighborSize] = useState(ipv6?.neighbor_table_size ? String(ipv6.neighbor_table_size) : "");
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(ipv6?.disable_forwarding ?? false);
  const [ipv6MultipathL4, setIpv6MultipathL4] = useState(ipv6?.multipath_layer4_hashing ?? false);
  const [ipv6Nht, setIpv6Nht] = useState(ipv6?.nht_no_resolve_via_default ?? false);
  const [ipv6StrictDad, setIpv6StrictDad] = useState(ipv6?.strict_dad ?? false);
  const [ipv6Saving, setIpv6Saving] = useState(false);
  const [ipv6Error, setIpv6Error] = useState<string | null>(null);

  const startEditIp = () => {
    setIpArpSize(ip?.arp_ndp_table_size ? String(ip.arp_ndp_table_size) : "");
    setIpDisableForwarding(ip?.disable_forwarding ?? false);
    setIpMultipathIgnore(ip?.multipath_ignore_unreachable ?? false);
    setIpMultipathL4(ip?.multipath_layer4_hashing ?? false);
    setIpNht(ip?.nht_no_resolve_via_default ?? false);
    setIpError(null);
    setEditingIp(true);
  };

  const handleSaveIp = async () => {
    setIpSaving(true);
    setIpError(null);
    try {
      const result = await systemSettingsService.updateIpSettings({
        arpNdpTableSize: ipArpSize ? parseInt(ipArpSize, 10) : null,
        clearArpNdpTableSize: !ipArpSize,
        disableForwarding: ipDisableForwarding,
        multipathIgnoreUnreachable: ipMultipathIgnore,
        multipathLayer4Hashing: ipMultipathL4,
        nhtNoResolveViaDefault: ipNht,
      });
      if (!result.success) { setIpError(result.error ?? "Failed to save IP settings"); return; }
      toast.success("IP settings saved");
      setEditingIp(false);
      onRefresh();
    } catch { setIpError("An unexpected error occurred"); }
    finally { setIpSaving(false); }
  };

  const startEditIpv6 = () => {
    setIpv6NeighborSize(ipv6?.neighbor_table_size ? String(ipv6.neighbor_table_size) : "");
    setIpv6DisableForwarding(ipv6?.disable_forwarding ?? false);
    setIpv6MultipathL4(ipv6?.multipath_layer4_hashing ?? false);
    setIpv6Nht(ipv6?.nht_no_resolve_via_default ?? false);
    setIpv6StrictDad(ipv6?.strict_dad ?? false);
    setIpv6Error(null);
    setEditingIpv6(true);
  };

  const handleSaveIpv6 = async () => {
    setIpv6Saving(true);
    setIpv6Error(null);
    try {
      const result = await systemSettingsService.updateIpv6Settings({
        neighborTableSize: ipv6NeighborSize ? parseInt(ipv6NeighborSize, 10) : null,
        clearNeighborTableSize: !ipv6NeighborSize,
        disableForwarding: ipv6DisableForwarding,
        multipathLayer4Hashing: ipv6MultipathL4,
        nhtNoResolveViaDefault: ipv6Nht,
        strictDad: ipv6StrictDad,
      });
      if (!result.success) { setIpv6Error(result.error ?? "Failed to save IPv6 settings"); return; }
      toast.success("IPv6 settings saved");
      setEditingIpv6(false);
      onRefresh();
    } catch { setIpv6Error("An unexpected error occurred"); }
    finally { setIpv6Saving(false); }
  };

  return (
    <div className="space-y-6">
      {/* IP Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>IPv4 Settings</CardTitle>
              <CardDescription>Kernel IPv4 forwarding and multipath options.</CardDescription>
            </div>
            {!isReadOnly && (
              editingIp ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingIp(false); setIpError(null); }} disabled={ipSaving}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveIp} disabled={ipSaving}>{ipSaving ? "Saving…" : "Save"}</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={startEditIp}>
                  <Edit2 className="h-4 w-4 mr-2" />Edit
                </Button>
              )
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {ipError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{ipError}</pre>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ARP/NDP Table Size</Label>
              {editingIp ? (
                <Input
                  type="number"
                  min="0"
                  value={ipArpSize}
                  onChange={(e) => setIpArpSize(e.target.value)}
                  placeholder="Default"
                  className="max-w-xs"
                />
              ) : (
                <p className="text-sm font-medium">
                  {ip?.arp_ndp_table_size?.toLocaleString() ?? <span className="text-muted-foreground">Default</span>}
                </p>
              )}
            </div>

            {[
              { label: "Disable Forwarding", key: "disableForwarding" as const, val: editingIp ? ipDisableForwarding : (ip?.disable_forwarding ?? false), set: setIpDisableForwarding },
              { label: "Multipath Ignore Unreachable", key: "multipathIgnoreUnreachable" as const, val: editingIp ? ipMultipathIgnore : (ip?.multipath_ignore_unreachable ?? false), set: setIpMultipathIgnore },
              { label: "Multipath Layer4 Hashing", key: "multipathLayer4Hashing" as const, val: editingIp ? ipMultipathL4 : (ip?.multipath_layer4_hashing ?? false), set: setIpMultipathL4 },
              { label: "NHT No Resolve via Default", key: "nhtNoResolveViaDefault" as const, val: editingIp ? ipNht : (ip?.nht_no_resolve_via_default ?? false), set: setIpNht },
            ].map(({ label, val, set }) => (
              <div key={label} className="flex items-center justify-between py-1">
                <Label className="text-sm">{label}</Label>
                {editingIp ? (
                  <Checkbox checked={val} onCheckedChange={(v) => set(!!v)} />
                ) : (
                  <span className={`text-sm font-medium ${val ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {val ? "Enabled" : "Disabled"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* IPv6 Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>IPv6 Settings</CardTitle>
              <CardDescription>Kernel IPv6 forwarding and neighbor discovery options.</CardDescription>
            </div>
            {!isReadOnly && (
              editingIpv6 ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingIpv6(false); setIpv6Error(null); }} disabled={ipv6Saving}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveIpv6} disabled={ipv6Saving}>{ipv6Saving ? "Saving…" : "Save"}</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={startEditIpv6}>
                  <Edit2 className="h-4 w-4 mr-2" />Edit
                </Button>
              )
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {ipv6Error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{ipv6Error}</pre>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Neighbor Table Size</Label>
              {editingIpv6 ? (
                <Input
                  type="number"
                  min="0"
                  value={ipv6NeighborSize}
                  onChange={(e) => setIpv6NeighborSize(e.target.value)}
                  placeholder="Default"
                  className="max-w-xs"
                />
              ) : (
                <p className="text-sm font-medium">
                  {ipv6?.neighbor_table_size?.toLocaleString() ?? <span className="text-muted-foreground">Default</span>}
                </p>
              )}
            </div>

            {[
              { label: "Disable Forwarding", val: editingIpv6 ? ipv6DisableForwarding : (ipv6?.disable_forwarding ?? false), set: setIpv6DisableForwarding },
              { label: "Multipath Layer4 Hashing", val: editingIpv6 ? ipv6MultipathL4 : (ipv6?.multipath_layer4_hashing ?? false), set: setIpv6MultipathL4 },
              { label: "NHT No Resolve via Default", val: editingIpv6 ? ipv6Nht : (ipv6?.nht_no_resolve_via_default ?? false), set: setIpv6Nht },
              { label: "Strict DAD", val: editingIpv6 ? ipv6StrictDad : (ipv6?.strict_dad ?? false), set: setIpv6StrictDad },
            ].map(({ label, val, set }) => (
              <div key={label} className="flex items-center justify-between py-1">
                <Label className="text-sm">{label}</Label>
                {editingIpv6 ? (
                  <Checkbox checked={val} onCheckedChange={(v) => set(!!v)} />
                ) : (
                  <span className={`text-sm font-medium ${val ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {val ? "Enabled" : "Disabled"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
