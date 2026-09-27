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
import { VrfSelect } from "@/components/ui/vrf-select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Lock, Loader2, AlertCircle, Plus, Trash2 } from "lucide-react";
import { macsecService, type MacsecInterface, type MacsecCapabilities, type MacsecMkaConfig, type MacsecStaticConfig } from "@/lib/api/macsec";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface StaticPeerEntry {
  name: string;
  key: string;
  mac: string;
  disable: boolean;
}

interface MacsecModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: MacsecCapabilities | null;
  existingInterfaces: string[];
  existing?: MacsecInterface | null;
}

export function MacsecModal({
  open,
  onOpenChange,
  onSuccess,
  existingInterfaces,
  existing,
}: MacsecModalProps) {
  const t = useTranslations("macsec");
  const tc = useTranslations("common");
  const isEdit = !!existing;
  const [allInterfaces, setAllInterfaces] = useState<InterfaceName[]>([]);

  // Basic
  const [name, setName] = useState("macsec0");
  const [sourceInterface, setSourceInterface] = useState("");
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Security
  const [cipher, setCipher] = useState("gcm-aes-128");
  const [encrypt, setEncrypt] = useState(true);
  const [replayWindow, setReplayWindow] = useState("");
  const [securityMode, setSecurityMode] = useState<"mka" | "static">("mka");

  // MKA
  const [mkaCak, setMkaCak] = useState("");
  const [mkaCkn, setMkaCkn] = useState("");
  const [mkaPriority, setMkaPriority] = useState("");

  // Static
  const [staticKey, setStaticKey] = useState("");
  const [staticPeers, setStaticPeers] = useState<StaticPeerEntry[]>([]);

  // Addresses
  const [addresses, setAddresses] = useState("");
  const [useDhcp, setUseDhcp] = useState(false);
  const [useDhcpv6, setUseDhcpv6] = useState(false);

  // DHCP Options
  const [dhcpClientId, setDhcpClientId] = useState("");
  const [dhcpHostName, setDhcpHostName] = useState("");
  const [dhcpVendorClassId, setDhcpVendorClassId] = useState("");
  const [dhcpNoDefaultRoute, setDhcpNoDefaultRoute] = useState(false);
  const [dhcpDefaultRouteDistance, setDhcpDefaultRouteDistance] = useState("");
  const [dhcpMtu, setDhcpMtu] = useState(false);

  // IP settings
  const [ipAdjustMss, setIpAdjustMss] = useState("");
  const [ipArpCacheTimeout, setIpArpCacheTimeout] = useState("");
  const [ipDisableArpFilter, setIpDisableArpFilter] = useState(false);
  const [ipDisableForwarding, setIpDisableForwarding] = useState(false);
  const [ipEnableArpAccept, setIpEnableArpAccept] = useState(false);
  const [ipEnableArpAnnounce, setIpEnableArpAnnounce] = useState(false);
  const [ipEnableArpIgnore, setIpEnableArpIgnore] = useState(false);
  const [ipEnableDirectedBroadcast, setIpEnableDirectedBroadcast] = useState(false);
  const [ipEnableProxyArp, setIpEnableProxyArp] = useState(false);
  const [ipProxyArpPvlan, setIpProxyArpPvlan] = useState(false);
  const [ipSourceValidation, setIpSourceValidation] = useState("");

  // IPv6 settings
  const [ipv6AcceptDad, setIpv6AcceptDad] = useState("");
  const [ipv6AddressAutoconf, setIpv6AddressAutoconf] = useState(false);
  const [ipv6AddressEui64, setIpv6AddressEui64] = useState("");
  const [ipv6NoDefaultLinkLocal, setIpv6NoDefaultLinkLocal] = useState(false);
  const [ipv6InterfaceIdentifier, setIpv6InterfaceIdentifier] = useState("");
  const [ipv6AdjustMss, setIpv6AdjustMss] = useState("");
  const [ipv6BaseReachableTime, setIpv6BaseReachableTime] = useState("");
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);
  const [ipv6DupAddrDetect, setIpv6DupAddrDetect] = useState("");
  const [ipv6SourceValidation, setIpv6SourceValidation] = useState("");

  // Mirror & Redirect
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");
  const [redirect, setRedirect] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("macsec0");
    setSourceInterface("");
    setDescription("");
    setMtu("");
    setVrf("");
    setDisabled(false);
    setCipher("gcm-aes-128");
    setEncrypt(true);
    setReplayWindow("");
    setSecurityMode("mka");
    setMkaCak("");
    setMkaCkn("");
    setMkaPriority("");
    setStaticKey("");
    setStaticPeers([]);
    setAddresses("");
    setUseDhcp(false);
    setUseDhcpv6(false);
    setDhcpClientId("");
    setDhcpHostName("");
    setDhcpVendorClassId("");
    setDhcpNoDefaultRoute(false);
    setDhcpDefaultRouteDistance("");
    setDhcpMtu(false);
    setIpAdjustMss("");
    setIpArpCacheTimeout("");
    setIpDisableArpFilter(false);
    setIpDisableForwarding(false);
    setIpEnableArpAccept(false);
    setIpEnableArpAnnounce(false);
    setIpEnableArpIgnore(false);
    setIpEnableDirectedBroadcast(false);
    setIpEnableProxyArp(false);
    setIpProxyArpPvlan(false);
    setIpSourceValidation("");
    setIpv6AcceptDad("");
    setIpv6AddressAutoconf(false);
    setIpv6AddressEui64("");
    setIpv6NoDefaultLinkLocal(false);
    setIpv6InterfaceIdentifier("");
    setIpv6AdjustMss("");
    setIpv6BaseReachableTime("");
    setIpv6DisableForwarding(false);
    setIpv6DupAddrDetect("");
    setIpv6SourceValidation("");
    setMirrorIngress("");
    setMirrorEgress("");
    setRedirect("");
    setError(null);
  };

  const populateForm = (interfaceData: MacsecInterface) => {
    setName(interfaceData.name);
    setSourceInterface(interfaceData.source_interface || "");
    setDescription(interfaceData.description || "");
    setMtu(interfaceData.mtu || "");
    setVrf(interfaceData.vrf || "");
    setDisabled(interfaceData.disabled);

    setCipher(interfaceData.security?.cipher || "gcm-aes-128");
    setEncrypt(interfaceData.security?.encrypt ?? true);
    setReplayWindow(interfaceData.security?.replay_window || "");

    if (interfaceData.security?.static?.key || (interfaceData.security?.static?.peers && interfaceData.security.static.peers.length > 0)) {
      setSecurityMode("static");
      setStaticKey(interfaceData.security.static?.key || "");
      setStaticPeers(
        (interfaceData.security.static?.peers || []).map((p) => ({
          name: p.name,
          key: p.key || "",
          mac: p.mac || "",
          disable: p.disable,
        }))
      );
      setMkaCak("");
      setMkaCkn("");
      setMkaPriority("");
    } else {
      setSecurityMode("mka");
      setMkaCak(interfaceData.security?.mka?.cak || "");
      setMkaCkn(interfaceData.security?.mka?.ckn || "");
      setMkaPriority(interfaceData.security?.mka?.priority || "");
      setStaticKey("");
      setStaticPeers([]);
    }

    const staticAddrs = (interfaceData.addresses || []).filter((a) => a !== "dhcp" && a !== "dhcpv6");
    setAddresses(staticAddrs.join(", "));
    setUseDhcp((interfaceData.addresses || []).includes("dhcp"));
    setUseDhcpv6((interfaceData.addresses || []).includes("dhcpv6"));

    setDhcpClientId(interfaceData.dhcp_options?.client_id || "");
    setDhcpHostName(interfaceData.dhcp_options?.host_name || "");
    setDhcpVendorClassId(interfaceData.dhcp_options?.vendor_class_id || "");
    setDhcpNoDefaultRoute(interfaceData.dhcp_options?.no_default_route ?? false);
    setDhcpDefaultRouteDistance(interfaceData.dhcp_options?.default_route_distance || "");
    setDhcpMtu(interfaceData.dhcp_options?.mtu ?? false);

    setIpAdjustMss(interfaceData.ip?.adjust_mss || "");
    setIpArpCacheTimeout(interfaceData.ip?.arp_cache_timeout || "");
    setIpDisableArpFilter(interfaceData.ip?.disable_arp_filter ?? false);
    setIpDisableForwarding(interfaceData.ip?.disable_forwarding ?? false);
    setIpEnableArpAccept(interfaceData.ip?.enable_arp_accept ?? false);
    setIpEnableArpAnnounce(interfaceData.ip?.enable_arp_announce ?? false);
    setIpEnableArpIgnore(interfaceData.ip?.enable_arp_ignore ?? false);
    setIpEnableDirectedBroadcast(interfaceData.ip?.enable_directed_broadcast ?? false);
    setIpEnableProxyArp(interfaceData.ip?.enable_proxy_arp ?? false);
    setIpProxyArpPvlan(interfaceData.ip?.proxy_arp_pvlan ?? false);
    setIpSourceValidation(interfaceData.ip?.source_validation || "");

    setIpv6AcceptDad(interfaceData.ipv6?.accept_dad || "");
    setIpv6AddressAutoconf(interfaceData.ipv6?.address_autoconf ?? false);
    setIpv6AddressEui64(interfaceData.ipv6?.address_eui64 || "");
    setIpv6NoDefaultLinkLocal(interfaceData.ipv6?.address_no_default_link_local ?? false);
    setIpv6InterfaceIdentifier(interfaceData.ipv6?.address_interface_identifier || "");
    setIpv6AdjustMss(interfaceData.ipv6?.adjust_mss || "");
    setIpv6BaseReachableTime(interfaceData.ipv6?.base_reachable_time || "");
    setIpv6DisableForwarding(interfaceData.ipv6?.disable_forwarding ?? false);
    setIpv6DupAddrDetect(interfaceData.ipv6?.dup_addr_detect_transmits || "");
    setIpv6SourceValidation(interfaceData.ipv6?.source_validation || "");

    setMirrorIngress(interfaceData.mirror_ingress || "");
    setMirrorEgress(interfaceData.mirror_egress || "");
    setRedirect(interfaceData.redirect || "");
    setError(null);
  };

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces().then((res) => setAllInterfaces(res.interfaces)).catch(() => {});
    if (existing) {
      populateForm(existing);
    } else {
      resetForm();
    }
  }, [open, existing]);

  const addStaticPeer = () => {
    setStaticPeers([...staticPeers, { name: `peer${staticPeers.length}`, key: "", mac: "", disable: false }]);
  };

  const removeStaticPeer = (index: number) => {
    setStaticPeers(staticPeers.filter((_, i) => i !== index));
  };

  const updateStaticPeer = (index: number, field: keyof StaticPeerEntry, value: string | boolean) => {
    const updated = [...staticPeers];
    updated[index] = { ...updated[index], [field]: value };
    setStaticPeers(updated);
  };

  const validateShared = (): string | null => {
    if (!sourceInterface.trim()) return t("modal.errors.sourceRequired");
    if (mtu && (parseInt(mtu) < 68 || parseInt(mtu) > 16000)) return t("modal.errors.mtuRange");
    return null;
  };

  const validateForm = (): string | null => {
    if (!name.trim()) return t("modal.errors.nameRequired");
    if (!/^macsec\d+$/.test(name)) return t("modal.errors.nameFormat");
    if (existingInterfaces.includes(name)) return t("modal.errors.nameExists", { name });
    return validateShared();
  };

  const submitUpdate = async () => {
    if (!existing) return;

    const validationError = validateShared();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const addrList = addresses
        .split(/[,\n]/)
        .map((a) => a.trim())
        .filter(Boolean);
      if (useDhcp) addrList.push("dhcp");
      if (useDhcpv6) addrList.push("dhcpv6");

      const updated: Parameters<typeof macsecService.updateInterface>[2] = {};

      const desc = description.trim() || null;
      if (desc !== (existing.description || null)) updated.description = desc;

      const src = sourceInterface.trim() || null;
      if (src !== (existing.source_interface || null)) updated.source_interface = src;

      const mtuVal = mtu.trim() || null;
      if (mtuVal !== (existing.mtu || null)) updated.mtu = mtuVal;

      const vrfVal = vrf.trim() || null;
      if (vrfVal !== (existing.vrf || null)) updated.vrf = vrfVal;

      if (disabled !== existing.disabled) updated.disabled = disabled;

      const currentAddrs = [...(existing.addresses || [])].sort();
      const newAddrs = [...addrList].sort();
      if (JSON.stringify(currentAddrs) !== JSON.stringify(newAddrs)) {
        updated.addresses = addrList;
      }

      const secUpdated: {
        cipher?: string | null;
        encrypt?: boolean;
        replay_window?: string | null;
        mka?: Partial<MacsecMkaConfig> | null;
        static?: Partial<MacsecStaticConfig> | null;
      } = {};
      let secChanged = false;

      const cipherVal = cipher || null;
      if (cipherVal !== (existing.security?.cipher || null)) {
        secUpdated.cipher = cipherVal;
        secChanged = true;
      }

      if (encrypt !== (existing.security?.encrypt ?? false)) {
        secUpdated.encrypt = encrypt;
        secChanged = true;
      }

      const rwVal = replayWindow.trim() || null;
      if (rwVal !== (existing.security?.replay_window || null)) {
        secUpdated.replay_window = rwVal;
        secChanged = true;
      }

      const currentMode = (existing.security?.static?.key || (existing.security?.static?.peers && existing.security.static.peers.length > 0)) ? "static" : "mka";

      if (securityMode === "mka") {
        if (currentMode === "static") {
          secUpdated.static = null;
          secChanged = true;
        }

        const mkaUpdated: Partial<MacsecMkaConfig> = {};
        let mkaChanged = false;
        const cakVal = mkaCak.trim() || null;
        if (cakVal !== (existing.security?.mka?.cak || null)) { mkaUpdated.cak = cakVal; mkaChanged = true; }
        const cknVal = mkaCkn.trim() || null;
        if (cknVal !== (existing.security?.mka?.ckn || null)) { mkaUpdated.ckn = cknVal; mkaChanged = true; }
        const priVal = mkaPriority.trim() || null;
        if (priVal !== (existing.security?.mka?.priority || null)) { mkaUpdated.priority = priVal; mkaChanged = true; }

        if (mkaChanged) {
          secUpdated.mka = mkaUpdated;
          secChanged = true;
        }
      } else {
        if (currentMode === "mka") {
          secUpdated.mka = null;
          secChanged = true;
        }

        const staticUpdated: Partial<MacsecStaticConfig> = {};
        let staticChanged = false;

        const keyVal = staticKey.trim() || null;
        if (keyVal !== (existing.security?.static?.key || null)) { staticUpdated.key = keyVal; staticChanged = true; }

        const currentPeers = JSON.stringify((existing.security?.static?.peers || []).map((p) => ({ name: p.name, key: p.key, mac: p.mac, disable: p.disable })));
        const newPeersData = staticPeers.map((p) => ({ name: p.name, key: p.key || null, mac: p.mac || null, disable: p.disable }));
        if (JSON.stringify(newPeersData) !== currentPeers) {
          staticUpdated.peers = newPeersData;
          staticChanged = true;
        }

        if (staticChanged) {
          secUpdated.static = staticUpdated;
          secChanged = true;
        }
      }

      if (secChanged) updated.security = secUpdated as typeof updated.security;

      const mi = mirrorIngress.trim() || null;
      if (mi !== (existing.mirror_ingress || null)) updated.mirror_ingress = mi;
      const me = mirrorEgress.trim() || null;
      if (me !== (existing.mirror_egress || null)) updated.mirror_egress = me;
      const rd = redirect.trim() || null;
      if (rd !== (existing.redirect || null)) updated.redirect = rd;

      const result = await macsecService.updateInterface(existing.name, existing, updated);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("modal.errors.updateFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("modal.errors.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isEdit) {
      await submitUpdate();
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const addrList = addresses
        .split(/[,\n]/)
        .map((a) => a.trim())
        .filter(Boolean);
      if (useDhcp) addrList.push("dhcp");
      if (useDhcpv6) addrList.push("dhcpv6");

      const config: Parameters<typeof macsecService.createInterface>[0] = {
        name,
        source_interface: sourceInterface.trim(),
      };

      if (description.trim()) config.description = description.trim();
      if (mtu.trim()) config.mtu = mtu.trim();
      if (vrf.trim()) config.vrf = vrf.trim();
      if (disabled) config.disabled = true;
      if (addrList.length > 0) config.addresses = addrList;

      // Security
      const security: NonNullable<typeof config.security> = {};
      if (cipher) security.cipher = cipher;
      if (encrypt) security.encrypt = true;
      if (replayWindow.trim()) security.replay_window = replayWindow.trim();

      if (securityMode === "mka") {
        const mka: NonNullable<typeof security.mka> = {};
        if (mkaCak.trim()) mka.cak = mkaCak.trim();
        if (mkaCkn.trim()) mka.ckn = mkaCkn.trim();
        if (mkaPriority.trim()) mka.priority = mkaPriority.trim();
        if (Object.keys(mka).length > 0) security.mka = mka;
      } else {
        if (staticKey.trim()) security.static_key = staticKey.trim();
        if (staticPeers.length > 0) {
          security.static_peers = staticPeers.map((p) => ({
            name: p.name,
            key: p.key || undefined,
            mac: p.mac || undefined,
            disable: p.disable || undefined,
          }));
        }
      }

      if (Object.keys(security).length > 0) config.security = security;

      // IP settings
      const ip: NonNullable<typeof config.ip> = {};
      if (ipAdjustMss.trim()) ip.adjust_mss = ipAdjustMss.trim();
      if (ipArpCacheTimeout.trim()) ip.arp_cache_timeout = ipArpCacheTimeout.trim();
      if (ipDisableArpFilter) ip.disable_arp_filter = true;
      if (ipDisableForwarding) ip.disable_forwarding = true;
      if (ipEnableArpAccept) ip.enable_arp_accept = true;
      if (ipEnableArpAnnounce) ip.enable_arp_announce = true;
      if (ipEnableArpIgnore) ip.enable_arp_ignore = true;
      if (ipEnableDirectedBroadcast) ip.enable_directed_broadcast = true;
      if (ipEnableProxyArp) ip.enable_proxy_arp = true;
      if (ipProxyArpPvlan) ip.proxy_arp_pvlan = true;
      if (ipSourceValidation) ip.source_validation = ipSourceValidation;
      if (Object.keys(ip).length > 0) config.ip = ip;

      // IPv6 settings
      const ipv6: NonNullable<typeof config.ipv6> = {};
      if (ipv6AcceptDad.trim()) ipv6.accept_dad = ipv6AcceptDad.trim();
      if (ipv6AddressAutoconf) ipv6.address_autoconf = true;
      if (ipv6AddressEui64.trim()) ipv6.address_eui64 = ipv6AddressEui64.trim();
      if (ipv6NoDefaultLinkLocal) ipv6.address_no_default_link_local = true;
      if (ipv6InterfaceIdentifier.trim()) ipv6.address_interface_identifier = ipv6InterfaceIdentifier.trim();
      if (ipv6AdjustMss.trim()) ipv6.adjust_mss = ipv6AdjustMss.trim();
      if (ipv6BaseReachableTime.trim()) ipv6.base_reachable_time = ipv6BaseReachableTime.trim();
      if (ipv6DisableForwarding) ipv6.disable_forwarding = true;
      if (ipv6DupAddrDetect.trim()) ipv6.dup_addr_detect_transmits = ipv6DupAddrDetect.trim();
      if (ipv6SourceValidation) ipv6.source_validation = ipv6SourceValidation;
      if (Object.keys(ipv6).length > 0) config.ipv6 = ipv6;

      // DHCP options
      if (useDhcp) {
        const dhcp: NonNullable<typeof config.dhcp_options> = {};
        if (dhcpClientId.trim()) dhcp.client_id = dhcpClientId.trim();
        if (dhcpHostName.trim()) dhcp.host_name = dhcpHostName.trim();
        if (dhcpVendorClassId.trim()) dhcp.vendor_class_id = dhcpVendorClassId.trim();
        if (dhcpNoDefaultRoute) dhcp.no_default_route = true;
        if (dhcpDefaultRouteDistance.trim()) dhcp.default_route_distance = dhcpDefaultRouteDistance.trim();
        if (dhcpMtu) dhcp.mtu = true;
        if (Object.keys(dhcp).length > 0) config.dhcp_options = dhcp;
      }

      // Mirror & Redirect
      if (mirrorIngress.trim()) config.mirror_ingress = mirrorIngress.trim();
      if (mirrorEgress.trim()) config.mirror_egress = mirrorEgress.trim();
      if (redirect.trim()) config.redirect = redirect.trim();

      const result = await macsecService.createInterface(config);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("modal.errors.createFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("modal.errors.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {isEdit ? t("modal.editTitle") : t("modal.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? (
              t.rich("modal.editDescription", {
                name: existing.name,
                code: (chunks) => (
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
                    {chunks}
                  </code>
                ),
              })
            ) : (
              t("modal.createDescription")
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">{t("modal.tabs.basic")}</TabsTrigger>
            <TabsTrigger value="security">{t("modal.tabs.security")}</TabsTrigger>
            <TabsTrigger value="addresses">{t("modal.tabs.addresses")}</TabsTrigger>
            <TabsTrigger value="advanced">{t("modal.tabs.advanced")}</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("modal.basic.interfaceName")}</Label>
                <Input
                  id="name"
                  value={isEdit ? existing.name : name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="macsec0"
                  disabled={isEdit}
                />
                <p className="text-xs text-muted-foreground">
                  {isEdit
                    ? t("modal.basic.nameLocked")
                    : t("modal.basic.nameFormatHint")}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t("modal.basic.sourceInterface")} <span className="text-destructive">*</span></Label>
                <InterfaceSelect
                  value={sourceInterface}
                  onValueChange={setSourceInterface}
                  interfaces={allInterfaces}
                  placeholder={t("modal.basic.sourceInterfacePlaceholder")}
                />
                <p className="text-xs text-muted-foreground">{t("modal.basic.sourceInterfaceHint")}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{tc("description")}</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("modal.basic.descriptionPlaceholder")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mtu">MTU</Label>
                <Input id="mtu" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder={t("modal.basic.mtuPlaceholder")} type="number" min={68} max={16000} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vrf">VRF</Label>
                <VrfSelect id="vrf" value={vrf} onValueChange={setVrf} />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="disabled" checked={disabled} onCheckedChange={(checked) => setDisabled(checked === true)} />
              <Label htmlFor="disabled" className="text-sm font-normal">{t("modal.basic.disableInterface")}</Label>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cipher">{t("modal.security.cipherSuite")}</Label>
                <Select value={cipher} onValueChange={setCipher}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gcm-aes-128">GCM-AES-128</SelectItem>
                    <SelectItem value="gcm-aes-256">GCM-AES-256</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="replayWindow">{t("modal.security.replayWindow")}</Label>
                <Input id="replayWindow" value={replayWindow} onChange={(e) => setReplayWindow(e.target.value)} placeholder={t("modal.security.replayWindowPlaceholder")} type="number" min={0} />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="encrypt" checked={encrypt} onCheckedChange={(checked) => setEncrypt(checked === true)} />
              <Label htmlFor="encrypt" className="text-sm font-normal">{t("modal.security.enableEncryption")}</Label>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>{t("modal.security.securityMode")}</Label>
              <Select value={securityMode} onValueChange={(v) => setSecurityMode(v as "mka" | "static")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mka">{t("modal.security.modeMka")}</SelectItem>
                  <SelectItem value="static">{t("modal.security.modeStatic")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {securityMode === "mka" ? (
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="text-sm font-medium">{t("modal.security.mkaTitle")}</h4>
                <div className="space-y-2">
                  <Label htmlFor="cak">{t("modal.security.cak")}</Label>
                  <Input id="cak" value={mkaCak} onChange={(e) => setMkaCak(e.target.value)} placeholder={cipher === "gcm-aes-256" ? t("modal.security.hex64") : t("modal.security.hex32")} className="font-mono" />
                  <p className="text-xs text-muted-foreground">{cipher === "gcm-aes-256" ? t("modal.security.keyHint256") : t("modal.security.keyHint128")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ckn">{t("modal.security.ckn")}</Label>
                  <Input id="ckn" value={mkaCkn} onChange={(e) => setMkaCkn(e.target.value)} placeholder={t("modal.security.cknPlaceholder")} className="font-mono" />
                  <p className="text-xs text-muted-foreground">{t("modal.security.cknHint")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">{t("modal.security.mkaPriority")}</Label>
                  <Input id="priority" value={mkaPriority} onChange={(e) => setMkaPriority(e.target.value)} placeholder={t("modal.security.mkaPriorityPlaceholder")} type="number" min={0} max={255} />
                </div>
              </div>
            ) : (
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="text-sm font-medium">{t("modal.security.staticTitle")}</h4>
                <div className="space-y-2">
                  <Label htmlFor="staticKey">{t("modal.security.localKey")}</Label>
                  <Input id="staticKey" value={staticKey} onChange={(e) => setStaticKey(e.target.value)} placeholder={cipher === "gcm-aes-256" ? t("modal.security.hex64") : t("modal.security.hex32")} className="font-mono" />
                  <p className="text-xs text-muted-foreground">{cipher === "gcm-aes-256" ? t("modal.security.keyHint256") : t("modal.security.keyHint128")}</p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{t("modal.security.staticPeers")}</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addStaticPeer}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> {t("modal.security.addPeer")}
                  </Button>
                </div>

                {staticPeers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">{t("modal.security.noPeers")}</p>
                )}

                {staticPeers.map((peer, index) => (
                  <div key={index} className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t("modal.security.peerLabel", { n: String(index + 1) })}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeStaticPeer(index)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">{tc("name")}</Label>
                        <Input value={peer.name} onChange={(e) => updateStaticPeer(index, "name", e.target.value)} placeholder="peer0" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("modal.security.peerKey")}</Label>
                        <Input value={peer.key} onChange={(e) => updateStaticPeer(index, "key", e.target.value)} placeholder={t("modal.security.peerKeyPlaceholder")} className="h-8 text-sm font-mono" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("modal.security.macAddress")}</Label>
                        <Input value={peer.mac} onChange={(e) => updateStaticPeer(index, "mac", e.target.value)} placeholder="00:11:22:33:44:55" className="h-8 text-sm font-mono" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox checked={peer.disable} onCheckedChange={(checked) => updateStaticPeer(index, "disable", checked === true)} />
                      <Label className="text-xs font-normal">{t("modal.security.disablePeer")}</Label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="addresses">{t("modal.addresses.ipAddresses")}</Label>
              <Input id="addresses" value={addresses} onChange={(e) => setAddresses(e.target.value)} placeholder="10.0.0.1/24, 192.168.1.1/24" />
              <p className="text-xs text-muted-foreground">{t("modal.addresses.ipAddressesHint")}</p>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox id="useDhcp" checked={useDhcp} onCheckedChange={(checked) => setUseDhcp(checked === true)} />
                <Label htmlFor="useDhcp" className="text-sm font-normal">{t("modal.addresses.enableDhcp")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="useDhcpv6" checked={useDhcpv6} onCheckedChange={(checked) => setUseDhcpv6(checked === true)} />
                <Label htmlFor="useDhcpv6" className="text-sm font-normal">{t("modal.addresses.enableDhcpv6")}</Label>
              </div>
            </div>

            {useDhcp && (
              <>
                <Separator />
                <h4 className="text-sm font-medium">{t("modal.addresses.dhcpOptions")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dhcpClientId" className="text-xs">{t("modal.addresses.clientId")}</Label>
                    <Input id="dhcpClientId" value={dhcpClientId} onChange={(e) => setDhcpClientId(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dhcpHostName" className="text-xs">{t("modal.addresses.hostName")}</Label>
                    <Input id="dhcpHostName" value={dhcpHostName} onChange={(e) => setDhcpHostName(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dhcpVendorClassId" className="text-xs">{t("modal.addresses.vendorClassId")}</Label>
                    <Input id="dhcpVendorClassId" value={dhcpVendorClassId} onChange={(e) => setDhcpVendorClassId(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dhcpDefaultRouteDistance" className="text-xs">{t("modal.addresses.defaultRouteDistance")}</Label>
                    <Input id="dhcpDefaultRouteDistance" value={dhcpDefaultRouteDistance} onChange={(e) => setDhcpDefaultRouteDistance(e.target.value)} className="h-8 text-sm" type="number" />
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="dhcpNoDefaultRoute" checked={dhcpNoDefaultRoute} onCheckedChange={(checked) => setDhcpNoDefaultRoute(checked === true)} />
                    <Label htmlFor="dhcpNoDefaultRoute" className="text-xs font-normal">{t("modal.addresses.noDefaultRoute")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="dhcpMtu" checked={dhcpMtu} onCheckedChange={(checked) => setDhcpMtu(checked === true)} />
                    <Label htmlFor="dhcpMtu" className="text-xs font-normal">{t("modal.addresses.requestMtu")}</Label>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <h4 className="text-sm font-medium">{t("modal.advanced.ipv4Settings")}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ipAdjustMss" className="text-xs">{t("modal.advanced.adjustMss")}</Label>
                <Input id="ipAdjustMss" value={ipAdjustMss} onChange={(e) => setIpAdjustMss(e.target.value)} placeholder={t("modal.advanced.adjustMssPlaceholder")} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipArpCacheTimeout" className="text-xs">{t("modal.advanced.arpCacheTimeout")}</Label>
                <Input id="ipArpCacheTimeout" value={ipArpCacheTimeout} onChange={(e) => setIpArpCacheTimeout(e.target.value)} className="h-8 text-sm" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipSourceValidation" className="text-xs">{t("modal.advanced.sourceValidation")}</Label>
                <Select value={ipSourceValidation} onValueChange={setIpSourceValidation}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={tc("none")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strict">{t("modal.advanced.strict")}</SelectItem>
                    <SelectItem value="loose">{t("modal.advanced.loose")}</SelectItem>
                    <SelectItem value="disable">{t("modal.advanced.disable")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="ipDisableArpFilter" checked={ipDisableArpFilter} onCheckedChange={(checked) => setIpDisableArpFilter(checked === true)} />
                <Label htmlFor="ipDisableArpFilter" className="text-xs font-normal">{t("modal.advanced.disableArpFilter")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipDisableForwarding" checked={ipDisableForwarding} onCheckedChange={(checked) => setIpDisableForwarding(checked === true)} />
                <Label htmlFor="ipDisableForwarding" className="text-xs font-normal">{t("modal.advanced.disableForwarding")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipEnableArpAccept" checked={ipEnableArpAccept} onCheckedChange={(checked) => setIpEnableArpAccept(checked === true)} />
                <Label htmlFor="ipEnableArpAccept" className="text-xs font-normal">{t("modal.advanced.enableArpAccept")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipEnableArpAnnounce" checked={ipEnableArpAnnounce} onCheckedChange={(checked) => setIpEnableArpAnnounce(checked === true)} />
                <Label htmlFor="ipEnableArpAnnounce" className="text-xs font-normal">{t("modal.advanced.enableArpAnnounce")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipEnableArpIgnore" checked={ipEnableArpIgnore} onCheckedChange={(checked) => setIpEnableArpIgnore(checked === true)} />
                <Label htmlFor="ipEnableArpIgnore" className="text-xs font-normal">{t("modal.advanced.enableArpIgnore")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipEnableDirectedBroadcast" checked={ipEnableDirectedBroadcast} onCheckedChange={(checked) => setIpEnableDirectedBroadcast(checked === true)} />
                <Label htmlFor="ipEnableDirectedBroadcast" className="text-xs font-normal">{t("modal.advanced.enableDirectedBroadcast")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipEnableProxyArp" checked={ipEnableProxyArp} onCheckedChange={(checked) => setIpEnableProxyArp(checked === true)} />
                <Label htmlFor="ipEnableProxyArp" className="text-xs font-normal">{t("modal.advanced.enableProxyArp")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipProxyArpPvlan" checked={ipProxyArpPvlan} onCheckedChange={(checked) => setIpProxyArpPvlan(checked === true)} />
                <Label htmlFor="ipProxyArpPvlan" className="text-xs font-normal">{t("modal.advanced.proxyArpPvlan")}</Label>
              </div>
            </div>

            <Separator />

            <h4 className="text-sm font-medium">{t("modal.advanced.ipv6Settings")}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ipv6AcceptDad" className="text-xs">{t("modal.advanced.acceptDad")}</Label>
                <Input id="ipv6AcceptDad" value={ipv6AcceptDad} onChange={(e) => setIpv6AcceptDad(e.target.value)} className="h-8 text-sm" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipv6DupAddrDetect" className="text-xs">{t("modal.advanced.dadTransmits")}</Label>
                <Input id="ipv6DupAddrDetect" value={ipv6DupAddrDetect} onChange={(e) => setIpv6DupAddrDetect(e.target.value)} className="h-8 text-sm" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipv6AddressEui64" className="text-xs">{t("modal.advanced.eui64Prefix")}</Label>
                <Input id="ipv6AddressEui64" value={ipv6AddressEui64} onChange={(e) => setIpv6AddressEui64(e.target.value)} className="h-8 text-sm" placeholder="2001:db8::/64" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipv6InterfaceIdentifier" className="text-xs">{t("modal.advanced.interfaceIdentifier")}</Label>
                <Input id="ipv6InterfaceIdentifier" value={ipv6InterfaceIdentifier} onChange={(e) => setIpv6InterfaceIdentifier(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipv6AdjustMss" className="text-xs">{t("modal.advanced.adjustMss")}</Label>
                <Input id="ipv6AdjustMss" value={ipv6AdjustMss} onChange={(e) => setIpv6AdjustMss(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipv6BaseReachableTime" className="text-xs">{t("modal.advanced.baseReachableTime")}</Label>
                <Input id="ipv6BaseReachableTime" value={ipv6BaseReachableTime} onChange={(e) => setIpv6BaseReachableTime(e.target.value)} className="h-8 text-sm" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipv6SourceValidation" className="text-xs">{t("modal.advanced.sourceValidation")}</Label>
                <Select value={ipv6SourceValidation} onValueChange={setIpv6SourceValidation}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={tc("none")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strict">{t("modal.advanced.strict")}</SelectItem>
                    <SelectItem value="loose">{t("modal.advanced.loose")}</SelectItem>
                    <SelectItem value="disable">{t("modal.advanced.disable")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="ipv6AddressAutoconf" checked={ipv6AddressAutoconf} onCheckedChange={(checked) => setIpv6AddressAutoconf(checked === true)} />
                <Label htmlFor="ipv6AddressAutoconf" className="text-xs font-normal">{t("modal.advanced.addressAutoconf")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipv6NoDefaultLinkLocal" checked={ipv6NoDefaultLinkLocal} onCheckedChange={(checked) => setIpv6NoDefaultLinkLocal(checked === true)} />
                <Label htmlFor="ipv6NoDefaultLinkLocal" className="text-xs font-normal">{t("modal.advanced.noDefaultLinkLocal")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipv6DisableForwarding" checked={ipv6DisableForwarding} onCheckedChange={(checked) => setIpv6DisableForwarding(checked === true)} />
                <Label htmlFor="ipv6DisableForwarding" className="text-xs font-normal">{t("modal.advanced.disableForwarding")}</Label>
              </div>
            </div>

            <Separator />

            <h4 className="text-sm font-medium">{t("modal.advanced.mirrorRedirect")}</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mirrorIngress" className="text-xs">{t("modal.advanced.mirrorIngress")}</Label>
                <Input id="mirrorIngress" value={mirrorIngress} onChange={(e) => setMirrorIngress(e.target.value)} className="h-8 text-sm" placeholder="eth1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mirrorEgress" className="text-xs">{t("modal.advanced.mirrorEgress")}</Label>
                <Input id="mirrorEgress" value={mirrorEgress} onChange={(e) => setMirrorEgress(e.target.value)} className="h-8 text-sm" placeholder="eth1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redirect" className="text-xs">{t("modal.advanced.redirect")}</Label>
                <Input id="redirect" value={redirect} onChange={(e) => setRedirect(e.target.value)} className="h-8 text-sm" placeholder="eth1" />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap flex-1">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? tc("saving") : t("modal.creating")}
              </>
            ) : isEdit ? (
              t("modal.saveChanges")
            ) : (
              t("modal.createInterface")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
