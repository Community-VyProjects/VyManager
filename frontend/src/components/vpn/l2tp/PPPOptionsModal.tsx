"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Settings } from "lucide-react";
import { l2tpService, L2TPPPPOptions, L2TPCapabilities } from "@/lib/api/l2tp";
import { firstMaskEdit, pppOptionsProblem, type L2TPPPPOptionsUpdate } from "@/lib/api/l2tp-ppp-save-ops";
import { NONE_SENTINEL, fromNamedListValue, listedNames, toNamedListValue } from "@/lib/named-list-select-options";
import { ApiError } from "@/lib/types/api";

interface PPPOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentOptions: L2TPPPPOptions;
  capabilities: L2TPCapabilities | null;
}

export function PPPOptionsModal({
  open,
  onOpenChange,
  onSuccess,
  currentOptions,
  capabilities,
}: PPPOptionsModalProps) {
  const t = useTranslations("l2tp");
  const tc = useTranslations("common");
  const [ipv4, setIpv4] = useState("");
  const [ipv6, setIpv6] = useState("");
  const [mppe, setMppe] = useState("");
  const [disableCcp, setDisableCcp] = useState(false);
  const [lcpEchoFailure, setLcpEchoFailure] = useState("");
  const [lcpEchoInterval, setLcpEchoInterval] = useState("");
  const [lcpEchoTimeout, setLcpEchoTimeout] = useState("");
  const [minMtu, setMinMtu] = useState("");
  const [mru, setMru] = useState("");
  const [interfaceCache, setInterfaceCache] = useState("");
  const [ipv6InterfaceId, setIpv6InterfaceId] = useState("");
  const [ipv6PeerInterfaceId, setIpv6PeerInterfaceId] = useState("");
  const [ipv6PeerInterfaceIdSecret, setIpv6PeerInterfaceIdSecret] = useState("");
  // True while the field still shows the loaded mask of a stored secret.
  const [secretMasked, setSecretMasked] = useState(false);
  const [ipv6AcceptPeerInterfaceId, setIpv6AcceptPeerInterfaceId] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setIpv4(toNamedListValue(currentOptions.ipv4 || ""));
      setIpv6(toNamedListValue(currentOptions.ipv6 || ""));
      setMppe(toNamedListValue(currentOptions.mppe || ""));
      setDisableCcp(currentOptions.disable_ccp || false);
      setLcpEchoFailure(currentOptions.lcp_echo_failure || "");
      setLcpEchoInterval(currentOptions.lcp_echo_interval || "");
      setLcpEchoTimeout(currentOptions.lcp_echo_timeout || "");
      setMinMtu(currentOptions.min_mtu || "");
      setMru(currentOptions.mru || "");
      setInterfaceCache(currentOptions.interface_cache || "");
      setIpv6InterfaceId(currentOptions.ipv6_interface_id || "");
      setIpv6PeerInterfaceId(currentOptions.ipv6_peer_interface_id || "");
      setIpv6PeerInterfaceIdSecret(currentOptions.ipv6_peer_interface_id_secret || "");
      setSecretMasked(!!currentOptions.ipv6_peer_interface_id_secret);
      setIpv6AcceptPeerInterfaceId(currentOptions.ipv6_accept_peer_interface_id || false);
      setError(null);
    }
  }, [open, currentOptions]);

  const secretSupported = !!capabilities?.features.ppp_options.ipv6_peer_interface_id_secret;

  const handleSubmit = async () => {
    const updated: L2TPPPPOptionsUpdate = {
      ipv4: fromNamedListValue(ipv4),
      ipv6: fromNamedListValue(ipv6),
      mppe: fromNamedListValue(mppe),
      disable_ccp: disableCcp,
      lcp_echo_failure: lcpEchoFailure,
      lcp_echo_interval: lcpEchoInterval,
      lcp_echo_timeout: lcpEchoTimeout,
      min_mtu: minMtu,
      mru,
      interface_cache: interfaceCache,
      ipv6_interface_id: ipv6InterfaceId,
      ipv6_peer_interface_id: ipv6PeerInterfaceId,
      ipv6_peer_interface_id_secret: secretSupported && !secretMasked ? ipv6PeerInterfaceIdSecret : undefined,
      ipv6_accept_peer_interface_id: ipv6AcceptPeerInterfaceId,
    };
    const problem = pppOptionsProblem(currentOptions, updated, secretSupported);
    if (problem) {
      setError(t(`ppp.${problem}`));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await l2tpService.updatePPPOptions(currentOptions, updated, secretSupported);
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("ppp.updateFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("ppp.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const ipv4Modes = listedNames(capabilities?.features.ppp_options.ipv4_modes || [], fromNamedListValue(ipv4));
  const ipv6Modes = listedNames(capabilities?.features.ppp_options.ipv6_modes || [], fromNamedListValue(ipv6));
  const mppeModes = listedNames(capabilities?.features.ppp_options.mppe_modes || [], fromNamedListValue(mppe));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {t("ppp.title")}
          </DialogTitle>
          <DialogDescription>{t("ppp.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("ppp.ipv4Mode")}</Label>
              <Select value={ipv4} onValueChange={setIpv4}>
                <SelectTrigger><SelectValue placeholder={t("shared.select")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                  {ipv4Modes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("ppp.ipv6Mode")}</Label>
              <Select value={ipv6} onValueChange={setIpv6}>
                <SelectTrigger><SelectValue placeholder={t("shared.select")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                  {ipv6Modes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>MPPE</Label>
            <Select value={mppe} onValueChange={setMppe}>
              <SelectTrigger><SelectValue placeholder={t("shared.select")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                {mppeModes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="disable-ccp" checked={disableCcp} onCheckedChange={(v) => setDisableCcp(!!v)} />
            <Label htmlFor="disable-ccp" className="cursor-pointer">{t("ppp.disableCcp")}</Label>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("ppp.lcpEcho")}</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("ppp.failure")}</Label>
              <Input value={lcpEchoFailure} onChange={(e) => setLcpEchoFailure(e.target.value)} placeholder="5" />
            </div>
            <div className="space-y-2">
              <Label>{t("ppp.interval")}</Label>
              <Input value={lcpEchoInterval} onChange={(e) => setLcpEchoInterval(e.target.value)} placeholder="30" />
            </div>
            <div className="space-y-2">
              <Label>{t("shared.timeout")}</Label>
              <Input value={lcpEchoTimeout} onChange={(e) => setLcpEchoTimeout(e.target.value)} placeholder="0" />
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">MTU/MRU</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("ppp.minMtu")}</Label>
              <Input value={minMtu} onChange={(e) => setMinMtu(e.target.value)} placeholder="100" />
            </div>
            <div className="space-y-2">
              <Label>MRU</Label>
              <Input value={mru} onChange={(e) => setMru(e.target.value)} placeholder="1500" />
            </div>
            <div className="space-y-2">
              <Label>{t("ppp.interfaceCache")}</Label>
              <Input value={interfaceCache} onChange={(e) => setInterfaceCache(e.target.value)} placeholder="1000" />
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("ppp.ipv6InterfaceIds")}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("ppp.interfaceId")}</Label>
              <Input value={ipv6InterfaceId} onChange={(e) => setIpv6InterfaceId(e.target.value)} placeholder="0:0:0:1" />
            </div>
            <div className="space-y-2">
              <Label>{t("ppp.peerInterfaceId")}</Label>
              <Input value={ipv6PeerInterfaceId} onChange={(e) => setIpv6PeerInterfaceId(e.target.value)} placeholder="0:0:0:2" />
            </div>
          </div>
          {secretSupported && (
            <div className="space-y-2">
              <Label htmlFor="peer-id-secret">{t("ppp.peerInterfaceIdSecret")}</Label>
              <Input
                id="peer-id-secret"
                type="password"
                autoComplete="new-password"
                value={ipv6PeerInterfaceIdSecret}
                onChange={(e) => {
                  if (secretMasked) {
                    const edit = e.nativeEvent as InputEvent;
                    setIpv6PeerInterfaceIdSecret(firstMaskEdit(edit.inputType, edit.data));
                    setSecretMasked(false);
                  } else {
                    setIpv6PeerInterfaceIdSecret(e.target.value);
                  }
                }}
                placeholder={t("shared.enterSecret")}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox id="accept-peer-id" checked={ipv6AcceptPeerInterfaceId} onCheckedChange={(v) => setIpv6AcceptPeerInterfaceId(!!v)} />
            <Label htmlFor="accept-peer-id" className="cursor-pointer">{t("ppp.acceptPeerInterfaceId")}</Label>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tc("saving")}</> : tc("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
