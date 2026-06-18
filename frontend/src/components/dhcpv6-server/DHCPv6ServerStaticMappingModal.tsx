"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  dhcpv6ServerService,
  DHCPv6StaticMapping,
  DHCPv6ServerCapabilities,
} from "@/lib/api/dhcpv6-server";

interface Props {
  open: boolean;
  netName: string;
  subnetCidr: string;
  availableSubnets?: string[];
  caps: DHCPv6ServerCapabilities;
  mapping: DHCPv6StaticMapping | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DHCPv6ServerStaticMappingModal({
  open,
  netName,
  subnetCidr,
  availableSubnets,
  caps,
  mapping,
  onClose,
  onSuccess,
}: Props) {
  const isEditing = mapping !== null;
  const showMac = caps.features.static_mapping_mac.supported;
  const duidLabel = showMac ? "DUID" : "Client Identifier";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubnet, setSelectedSubnet] = useState(subnetCidr);

  const [name, setName] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [duid, setDuid] = useState("");
  const [mac, setMac] = useState("");
  const [ipv6Address, setIpv6Address] = useState("");
  const [ipv6Prefix, setIpv6Prefix] = useState("");

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed form state when the modal opens
    setError(null);
    setSelectedSubnet(subnetCidr);
    if (mapping) {
      setName(mapping.name);
      setDisabled(mapping.disabled);
      setDuid(mapping.duid ?? "");
      setMac(mapping.mac ?? "");
      setIpv6Address(mapping.ipv6_address ?? "");
      setIpv6Prefix(mapping.ipv6_prefix ?? "");
    } else {
      setName(""); setDisabled(false); setDuid(""); setMac("");
      setIpv6Address(""); setIpv6Prefix("");
    }
  }, [open, mapping]);

  async function handleSubmit() {
    if (!isEditing && !name.trim()) { setError("Mapping name is required"); return; }
    setLoading(true);
    setError(null);

    const updated: DHCPv6StaticMapping = {
      name: isEditing ? mapping!.name : name.trim(),
      disabled,
      duid: duid.trim() || null,
      mac: mac.trim() || null,
      ipv6_address: ipv6Address.trim() || null,
      ipv6_prefix: ipv6Prefix.trim() || null,
    };

    if (!selectedSubnet) { setError("Select a subnet"); setLoading(false); return; }
    const result = await dhcpv6ServerService.saveStaticMapping(netName, selectedSubnet, mapping, updated);
    setLoading(false);
    if (!result.success) { setError(result.error ?? "Operation failed"); return; }
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Static Mapping" : "Add Static Mapping"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {!isEditing && availableSubnets && availableSubnets.length > 1 ? (
            <div className="space-y-1.5">
              <Label>Subnet</Label>
              <Select value={selectedSubnet} onValueChange={setSelectedSubnet}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subnet" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubnets.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground font-mono">
              Network: {netName}{selectedSubnet ? ` / Subnet: ${selectedSubnet}` : ""}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="map-name">Mapping Name</Label>
            <Input
              id="map-name"
              placeholder="client1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isEditing}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="map-disabled"
              checked={disabled}
              onCheckedChange={(v) => setDisabled(Boolean(v))}
            />
            <Label htmlFor="map-disabled" className="cursor-pointer">Disable this mapping</Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="map-duid">{duidLabel}</Label>
            <Input
              id="map-duid"
              placeholder="Optional"
              value={duid}
              onChange={(e) => setDuid(e.target.value)}
            />
          </div>

          {showMac && (
            <div className="space-y-1.5">
              <Label htmlFor="map-mac">MAC Address</Label>
              <Input
                id="map-mac"
                placeholder="00:11:22:33:44:55 (optional)"
                value={mac}
                onChange={(e) => setMac(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="map-addr">IPv6 Address</Label>
            <Input
              id="map-addr"
              placeholder="2001:db8::1 (optional)"
              value={ipv6Address}
              onChange={(e) => setIpv6Address(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="map-prefix">IPv6 Prefix</Label>
            <Input
              id="map-prefix"
              placeholder="2001:db8::/64 (optional)"
              value={ipv6Prefix}
              onChange={(e) => setIpv6Prefix(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? "Save" : "Add Mapping"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
