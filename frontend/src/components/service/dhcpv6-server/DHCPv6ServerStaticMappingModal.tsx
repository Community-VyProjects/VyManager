"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("dhcpv6Server");
  const tc = useTranslations("common");
  const isEditing = mapping !== null;
  const showMac = caps.features.static_mapping_mac.supported;
  const duidLabel = showMac ? "DUID" : t("mapping.clientIdentifier");

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- seed form fields when the modal opens
  }, [open, mapping]);

  async function handleSubmit() {
    if (!isEditing && !name.trim()) { setError(t("mapping.errors.nameRequired")); return; }
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

    if (!selectedSubnet) { setError(t("range.errors.selectSubnet")); setLoading(false); return; }
    const result = await dhcpv6ServerService.saveStaticMapping(netName, selectedSubnet, mapping, updated);
    setLoading(false);
    if (!result.success) { setError(result.error ?? tc("operationFailed")); return; }
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("mapping.editTitle") : t("mapping.addTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {!isEditing && availableSubnets && availableSubnets.length > 1 ? (
            <div className="space-y-1.5">
              <Label>{t("subnet")}</Label>
              <Select value={selectedSubnet} onValueChange={setSelectedSubnet}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectSubnet")} />
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
              {t("networkLine", { network: netName })}{selectedSubnet ? t("subnetSuffix", { subnet: selectedSubnet }) : ""}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="map-name">{t("mapping.name")}</Label>
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
            <Label htmlFor="map-disabled" className="cursor-pointer">{t("mapping.disable")}</Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="map-duid">{duidLabel}</Label>
            <Input
              id="map-duid"
              placeholder={tc("optional")}
              value={duid}
              onChange={(e) => setDuid(e.target.value)}
            />
          </div>

          {showMac && (
            <div className="space-y-1.5">
              <Label htmlFor="map-mac">{t("mapping.macAddress")}</Label>
              <Input
                id="map-mac"
                placeholder={t("optionalExample", { example: "00:11:22:33:44:55" })}
                value={mac}
                onChange={(e) => setMac(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="map-addr">{t("mapping.ipv6Address")}</Label>
            <Input
              id="map-addr"
              placeholder={t("optionalExample", { example: "2001:db8::1" })}
              value={ipv6Address}
              onChange={(e) => setIpv6Address(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="map-prefix">{t("mapping.ipv6Prefix")}</Label>
            <Input
              id="map-prefix"
              placeholder={t("optionalExample", { example: "2001:db8::/64" })}
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
          <Button variant="outline" onClick={onClose} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? tc("save") : t("mapping.addMapping")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
