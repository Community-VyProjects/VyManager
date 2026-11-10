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
  DHCPv6PrefixDelegation,
  DHCPv6ServerCapabilities,
} from "@/lib/api/dhcpv6-server";

interface Props {
  open: boolean;
  netName: string;
  subnetCidr: string;
  availableSubnets?: string[];
  caps: DHCPv6ServerCapabilities;
  pd: DHCPv6PrefixDelegation | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DHCPv6ServerPrefixDelegationModal({
  open,
  netName,
  subnetCidr,
  availableSubnets,
  caps,
  pd,
  onClose,
  onSuccess,
}: Props) {
  const t = useTranslations("dhcpv6Server");
  const tc = useTranslations("common");
  const isEditing = pd !== null;
  const is15 = caps.features.prefix_delegation_v15.supported;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubnet, setSelectedSubnet] = useState(subnetCidr);

  // 1.5 fields
  const [prefix, setPrefix] = useState("");
  const [delegatedLength, setDelegatedLength] = useState("");
  const [prefixLength, setPrefixLength] = useState("");
  const [excludedPrefix, setExcludedPrefix] = useState("");
  const [excludedPrefixLength, setExcludedPrefixLength] = useState("");

  // 1.4 fields
  const [start, setStart] = useState("");
  const [stop, setStop] = useState("");
  const [prefixLength14, setPrefixLength14] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelectedSubnet(subnetCidr);
    if (pd) {
      if (is15) {
        setPrefix(pd.prefix ?? "");
        setDelegatedLength(pd.delegated_length != null ? String(pd.delegated_length) : "");
        setPrefixLength(pd.prefix_length != null ? String(pd.prefix_length) : "");
        setExcludedPrefix(pd.excluded_prefix ?? "");
        setExcludedPrefixLength(pd.excluded_prefix_length != null ? String(pd.excluded_prefix_length) : "");
      } else {
        setStart(pd.start ?? "");
        setStop(pd.stop ?? "");
        setPrefixLength14(pd.prefix_length != null ? String(pd.prefix_length) : "");
      }
    } else {
      setPrefix(""); setDelegatedLength(""); setPrefixLength("");
      setExcludedPrefix(""); setExcludedPrefixLength("");
      setStart(""); setStop(""); setPrefixLength14("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- seed form fields when the modal opens
  }, [open, pd, is15]);

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    let updated: DHCPv6PrefixDelegation;

    if (is15) {
      if (!prefix.trim()) { setError(t("range.errors.prefixRequired")); setLoading(false); return; }
      if (!delegatedLength.trim()) { setError(t("pd.errors.delegatedLengthRequired")); setLoading(false); return; }
      updated = {
        prefix: prefix.trim(),
        delegated_length: parseInt(delegatedLength.trim(), 10),
        prefix_length: prefixLength.trim() !== "" ? parseInt(prefixLength.trim(), 10) : null,
        excluded_prefix: excludedPrefix.trim() || null,
        excluded_prefix_length: excludedPrefixLength.trim() !== "" ? parseInt(excludedPrefixLength.trim(), 10) : null,
        start: null,
        stop: null,
      };
    } else {
      if (!start.trim() || !stop.trim()) { setError(t("range.errors.startStopRequired")); setLoading(false); return; }
      updated = {
        prefix: null,
        delegated_length: null,
        prefix_length: prefixLength14.trim() !== "" ? parseInt(prefixLength14.trim(), 10) : null,
        excluded_prefix: null,
        excluded_prefix_length: null,
        start: start.trim(),
        stop: stop.trim(),
      };
    }

    if (!selectedSubnet) { setError(t("range.errors.selectSubnet")); setLoading(false); return; }
    const result = await dhcpv6ServerService.savePrefixDelegation(netName, selectedSubnet, is15, pd, updated);
    setLoading(false);
    if (!result.success) { setError(result.error ?? tc("operationFailed")); return; }
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("pd.editTitle") : t("pd.addTitle")}</DialogTitle>
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

          {is15 ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="pd-prefix">{t("range.prefix")}</Label>
                <Input
                  id="pd-prefix"
                  placeholder="2001:db8::/48"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pd-delegated-len">{t("pd.delegatedLength")}</Label>
                <Input
                  id="pd-delegated-len"
                  type="number"
                  min={32}
                  max={128}
                  placeholder={t("pd.delegatedLengthPlaceholder")}
                  value={delegatedLength}
                  onChange={(e) => setDelegatedLength(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pd-prefix-len">{t("pd.prefixLengthOptional")}</Label>
                <Input
                  id="pd-prefix-len"
                  type="number"
                  min={0}
                  max={128}
                  placeholder={tc("optional")}
                  value={prefixLength}
                  onChange={(e) => setPrefixLength(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pd-excl-prefix">{t("pd.excludedPrefix")}</Label>
                <Input
                  id="pd-excl-prefix"
                  placeholder="2001:db8::/64"
                  value={excludedPrefix}
                  onChange={(e) => setExcludedPrefix(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pd-excl-len">{t("pd.excludedPrefixLength")}</Label>
                <Input
                  id="pd-excl-len"
                  type="number"
                  min={0}
                  max={128}
                  placeholder={tc("optional")}
                  value={excludedPrefixLength}
                  onChange={(e) => setExcludedPrefixLength(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="pd-start">{t("pd.start")}</Label>
                <Input
                  id="pd-start"
                  placeholder="2001:db8::"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pd-stop">{t("pd.stop")}</Label>
                <Input
                  id="pd-stop"
                  placeholder="2001:db8::ff"
                  value={stop}
                  onChange={(e) => setStop(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pd14-prefix-len">{t("pd.prefixLength14")}</Label>
                <Input
                  id="pd14-prefix-len"
                  type="number"
                  min={32}
                  max={64}
                  placeholder={tc("optional")}
                  value={prefixLength14}
                  onChange={(e) => setPrefixLength14(e.target.value)}
                />
              </div>
            </>
          )}

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
            {isEditing ? tc("save") : t("pd.addDelegation")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
