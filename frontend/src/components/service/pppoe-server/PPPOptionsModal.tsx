"use client";

import { useState } from "react";
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
import { AlertCircle, Loader2, Settings } from "lucide-react";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { pppoeServerService, PPPoECapabilities, PPPoEPppOptions } from "@/lib/api/pppoe-server";
import {
  CALLING_SID,
  PPPOE_MINIMUMS,
  PPPOE_RANGES,
  pppOptionsProblem,
  type PPPoEPppOptionsDraft,
} from "@/lib/api/pppoe-server-save-ops";
import type { ApiError } from "@/lib/types/api";

interface PPPOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  current: PPPoEPppOptions;
  capabilities: PPPoECapabilities | null;
}

export function PPPOptionsModal({ open, onOpenChange, onSuccess, current, capabilities }: PPPOptionsModalProps) {
  const t = useTranslations("pppoeServerSettings");
  const tc = useTranslations("common");
  // The page remounts this modal (key) on every open, so state seeds from props.
  // The optional peer-id secret loads as the mask: the mask keeps it, blank deletes it.
  const [draft, setDraft] = useState<PPPoEPppOptionsDraft>(() => ({
    ipv4: current.ipv4 || "",
    ipv6: current.ipv6 || "",
    mppe: current.mppe || "",
    disable_ccp: current.disable_ccp,
    interface_cache: current.interface_cache || "",
    min_mtu: current.min_mtu || "",
    mru: current.mru || "",
    lcp_echo_failure: current.lcp_echo_failure || "",
    lcp_echo_interval: current.lcp_echo_interval || "",
    lcp_echo_timeout: current.lcp_echo_timeout || "",
    ipv6_interface_id: current.ipv6_interface_id || "",
    ipv6_peer_interface_id: current.ipv6_peer_interface_id || "",
    ipv6_peer_interface_id_secret: current.ipv6_peer_interface_id_secret || "",
    ipv6_accept_peer_interface_id: current.ipv6_accept_peer_interface_id,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const values = capabilities?.values;
  const secretSupported = capabilities?.features.ipv6_peer_interface_id_secret ?? false;
  const showSecret = secretSupported && draft.ipv6_peer_interface_id.trim() === CALLING_SID;
  const mppeLabels: Record<string, string> = {
    require: t("pppOptions.mppeRequire"),
    prefer: t("pppOptions.mppePrefer"),
    deny: t("pppOptions.mppeDeny"),
  };
  const cache = PPPOE_RANGES.interfaceCache;
  const update = (patch: Partial<PPPoEPppOptionsDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const handleOpenChange = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  const handleSubmit = async () => {
    const issue = pppOptionsProblem(current, draft, secretSupported);
    if (issue) {
      setError(t(`pppOptions.${issue.problem}`, issue.params));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await pppoeServerService.updatePPPOptions(current, draft, secretSupported);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("pppOptions.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
              <Label htmlFor="pppoe-ppp-ipv4">IPv4</Label>
              <NamedListSelect
                id="pppoe-ppp-ipv4"
                value={draft.ipv4}
                names={values?.ppp_negotiation_modes || []}
                onValueChange={(ipv4) => update({ ipv4 })}
                noneLabel={tc("default")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-ppp-ipv6">IPv6</Label>
              <NamedListSelect
                id="pppoe-ppp-ipv6"
                value={draft.ipv6}
                names={values?.ppp_negotiation_modes || []}
                onValueChange={(ipv6) => update({ ipv6 })}
                noneLabel={tc("default")}
              />
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("pppOptions.encryption")}</h4>
          <div className="space-y-2">
            <Label htmlFor="pppoe-ppp-mppe">MPPE</Label>
            <NamedListSelect
              id="pppoe-ppp-mppe"
              value={draft.mppe}
              names={values?.mppe_modes || []}
              labels={mppeLabels}
              onValueChange={(mppe) => update({ mppe })}
              noneLabel={tc("default")}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="disable-ccp" checked={draft.disable_ccp} onCheckedChange={(v) => update({ disable_ccp: !!v })} />
            <Label htmlFor="disable-ccp" className="cursor-pointer">{t("pppOptions.disableCcp")}</Label>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">MTU/MRU</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pppoe-ppp-min-mtu">{t("pppOptions.minMtu")}</Label>
              <Input
                id="pppoe-ppp-min-mtu"
                type="number"
                min={PPPOE_RANGES.pppMinMtu.min}
                max={PPPOE_RANGES.pppMinMtu.max}
                value={draft.min_mtu}
                onChange={(e) => update({ min_mtu: e.target.value })}
                placeholder={`${PPPOE_RANGES.pppMinMtu.min}-${PPPOE_RANGES.pppMinMtu.max}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-ppp-mru">MRU</Label>
              <Input
                id="pppoe-ppp-mru"
                type="number"
                min={PPPOE_RANGES.pppMru.min}
                max={PPPOE_RANGES.pppMru.max}
                value={draft.mru}
                onChange={(e) => update({ mru: e.target.value })}
                placeholder={`${PPPOE_RANGES.pppMru.min}-${PPPOE_RANGES.pppMru.max}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-ppp-cache">{t("pppOptions.interfaceCache")}</Label>
              <Input
                id="pppoe-ppp-cache"
                type="number"
                min={cache.min}
                max={cache.max}
                value={draft.interface_cache}
                onChange={(e) => update({ interface_cache: e.target.value })}
                placeholder={`${cache.min}-${cache.max}`}
              />
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("pppOptions.lcpEchoKeepalive")}</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pppoe-lcp-failure">{t("pppOptions.failure")}</Label>
              <Input
                id="pppoe-lcp-failure"
                type="number"
                min={PPPOE_MINIMUMS.lcpEcho}
                value={draft.lcp_echo_failure}
                onChange={(e) => update({ lcp_echo_failure: e.target.value })}
                placeholder="3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-lcp-interval">{t("pppOptions.interval")}</Label>
              <Input
                id="pppoe-lcp-interval"
                type="number"
                min={PPPOE_MINIMUMS.lcpEcho}
                value={draft.lcp_echo_interval}
                onChange={(e) => update({ lcp_echo_interval: e.target.value })}
                placeholder="30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-lcp-timeout">{t("pppOptions.timeout")}</Label>
              <Input
                id="pppoe-lcp-timeout"
                type="number"
                min={PPPOE_MINIMUMS.lcpEcho}
                value={draft.lcp_echo_timeout}
                onChange={(e) => update({ lcp_echo_timeout: e.target.value })}
                placeholder="10"
              />
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("pppOptions.ipv6InterfaceIds")}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pppoe-ipv6-intf-id">{t("pppOptions.interfaceId")}</Label>
              <Input
                id="pppoe-ipv6-intf-id"
                list="pppoe-ipv6-intf-id-keywords"
                value={draft.ipv6_interface_id}
                onChange={(e) => update({ ipv6_interface_id: e.target.value })}
                placeholder={t("pppOptions.interfaceIdPlaceholder")}
              />
              <datalist id="pppoe-ipv6-intf-id-keywords">
                {(values?.ipv6_interface_id_keywords || []).map((k) => <option key={k} value={k} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-ipv6-peer-id">{t("pppOptions.peerInterfaceId")}</Label>
              <Input
                id="pppoe-ipv6-peer-id"
                list="pppoe-ipv6-peer-id-keywords"
                value={draft.ipv6_peer_interface_id}
                onChange={(e) => update({ ipv6_peer_interface_id: e.target.value })}
                placeholder="x:x:x:x"
              />
              <datalist id="pppoe-ipv6-peer-id-keywords">
                {(values?.ipv6_peer_interface_id_keywords || []).map((k) => <option key={k} value={k} />)}
              </datalist>
            </div>
          </div>
          {showSecret && (
            <div className="space-y-2">
              <Label htmlFor="pppoe-ipv6-peer-secret">{t("pppOptions.peerInterfaceIdSecret")}</Label>
              <Input
                id="pppoe-ipv6-peer-secret"
                type="password"
                autoComplete="new-password"
                value={draft.ipv6_peer_interface_id_secret}
                onChange={(e) => update({ ipv6_peer_interface_id_secret: e.target.value })}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox
              id="accept-peer-id"
              checked={draft.ipv6_accept_peer_interface_id}
              onCheckedChange={(v) => update({ ipv6_accept_peer_interface_id: !!v })}
            />
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tc("saving")}</> : tc("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
