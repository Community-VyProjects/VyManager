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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Settings } from "lucide-react";
import { pppoeServerService, PPPoEConfigResponse } from "@/lib/api/pppoe-server";
import { ApiError } from "@/lib/types/api";

interface PPPOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: PPPoEConfigResponse;
}

const IP_MODES = ["deny", "allow", "prefer", "require"];

export function PPPOptionsModal({ open, onOpenChange, onSuccess, config }: PPPOptionsModalProps) {
  const t = useTranslations("pppoeServerSettings");
  const tc = useTranslations("common");
  const [ipv4, setIpv4] = useState("__none__");
  const [ipv6, setIpv6] = useState("__none__");
  const [mppe, setMppe] = useState("__none__");
  const [disableCcp, setDisableCcp] = useState(false);
  const [interfaceCache, setInterfaceCache] = useState("");
  const [minMtu, setMinMtu] = useState("");
  const [mru, setMru] = useState("");
  const [lcpEchoFailure, setLcpEchoFailure] = useState("");
  const [lcpEchoInterval, setLcpEchoInterval] = useState("");
  const [lcpEchoTimeout, setLcpEchoTimeout] = useState("");
  const [ipv6InterfaceId, setIpv6InterfaceId] = useState("");
  const [ipv6PeerInterfaceId, setIpv6PeerInterfaceId] = useState("");
  const [ipv6AcceptPeer, setIpv6AcceptPeer] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ppp = config.ppp_options || {};

  useEffect(() => {
    if (open) {
      setIpv4(ppp.ipv4 || "__none__");
      setIpv6(ppp.ipv6 || "__none__");
      setMppe(ppp.mppe || "__none__");
      setDisableCcp(ppp.disable_ccp || false);
      setInterfaceCache(ppp.interface_cache || "");
      setMinMtu(ppp.min_mtu || "");
      setMru(ppp.mru || "");
      setLcpEchoFailure(ppp.lcp_echo_failure || "");
      setLcpEchoInterval(ppp.lcp_echo_interval || "");
      setLcpEchoTimeout(ppp.lcp_echo_timeout || "");
      setIpv6InterfaceId(ppp.ipv6_interface_id || "");
      setIpv6PeerInterfaceId(ppp.ipv6_peer_interface_id || "");
      setIpv6AcceptPeer(ppp.ipv6_accept_peer_interface_id || false);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- seed form from ppp config when the modal opens
  }, [open, config]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pppoeServerService.updatePPPOptions(ppp, {
        ipv4: ipv4 === "__none__" ? "" : ipv4,
        ipv6: ipv6 === "__none__" ? "" : ipv6,
        mppe: mppe === "__none__" ? "" : mppe,
        disable_ccp: disableCcp,
        interface_cache: interfaceCache,
        min_mtu: minMtu,
        mru,
        lcp_echo_failure: lcpEchoFailure,
        lcp_echo_interval: lcpEchoInterval,
        lcp_echo_timeout: lcpEchoTimeout,
        ipv6_interface_id: ipv6InterfaceId,
        ipv6_peer_interface_id: ipv6PeerInterfaceId,
        ipv6_accept_peer_interface_id: ipv6AcceptPeer,
      });
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("pppOptions.updateFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("pppOptions.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {t("pppOptions.title")}
          </DialogTitle>
          <DialogDescription>{t("pppOptions.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <h4 className="text-sm font-medium">{t("pppOptions.ipNegotiation")}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>IPv4</Label>
              <Select value={ipv4} onValueChange={setIpv4}>
                <SelectTrigger><SelectValue placeholder={tc("default")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{tc("default")}</SelectItem>
                  {IP_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>IPv6</Label>
              <Select value={ipv6} onValueChange={setIpv6}>
                <SelectTrigger><SelectValue placeholder={tc("default")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{tc("default")}</SelectItem>
                  {IP_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("pppOptions.encryption")}</h4>
          <div className="space-y-2">
            <Label>MPPE</Label>
            <Select value={mppe} onValueChange={setMppe}>
              <SelectTrigger><SelectValue placeholder={tc("default")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{tc("default")}</SelectItem>
                <SelectItem value="require">{t("pppOptions.mppeRequire")}</SelectItem>
                <SelectItem value="prefer">{t("pppOptions.mppePrefer")}</SelectItem>
                <SelectItem value="deny">{t("pppOptions.mppeDeny")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="disable-ccp" checked={disableCcp} onCheckedChange={(v) => setDisableCcp(!!v)} />
            <Label htmlFor="disable-ccp" className="cursor-pointer">{t("pppOptions.disableCcp")}</Label>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">MTU/MRU</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("pppOptions.minMtu")}</Label>
              <Input value={minMtu} onChange={(e) => setMinMtu(e.target.value)} placeholder="1280" />
            </div>
            <div className="space-y-2">
              <Label>MRU</Label>
              <Input value={mru} onChange={(e) => setMru(e.target.value)} placeholder="1492" />
            </div>
            <div className="space-y-2">
              <Label>{t("pppOptions.interfaceCache")}</Label>
              <Input value={interfaceCache} onChange={(e) => setInterfaceCache(e.target.value)} placeholder="0" />
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("pppOptions.lcpEchoKeepalive")}</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("pppOptions.failure")}</Label>
              <Input value={lcpEchoFailure} onChange={(e) => setLcpEchoFailure(e.target.value)} placeholder="3" />
            </div>
            <div className="space-y-2">
              <Label>{t("pppOptions.interval")}</Label>
              <Input value={lcpEchoInterval} onChange={(e) => setLcpEchoInterval(e.target.value)} placeholder="30" />
            </div>
            <div className="space-y-2">
              <Label>{t("pppOptions.timeout")}</Label>
              <Input value={lcpEchoTimeout} onChange={(e) => setLcpEchoTimeout(e.target.value)} placeholder="0" />
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("pppOptions.ipv6InterfaceIds")}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("pppOptions.interfaceId")}</Label>
              <Input value={ipv6InterfaceId} onChange={(e) => setIpv6InterfaceId(e.target.value)} placeholder={t("pppOptions.interfaceIdPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("pppOptions.peerInterfaceId")}</Label>
              <Input value={ipv6PeerInterfaceId} onChange={(e) => setIpv6PeerInterfaceId(e.target.value)} placeholder="x:x:x:x" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="accept-peer-id" checked={ipv6AcceptPeer} onCheckedChange={(v) => setIpv6AcceptPeer(!!v)} />
            <Label htmlFor="accept-peer-id" className="cursor-pointer">{t("pppOptions.acceptPeerInterfaceId")}</Label>
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tc("saving")}</> : t("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
