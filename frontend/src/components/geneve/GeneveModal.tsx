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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Layers, Loader2 } from "lucide-react";
import { geneveService, type GeneveInterface, type GeneveCapabilities } from "@/lib/api/geneve";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface GeneveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: GeneveCapabilities | null;
  existingInterfaces: string[];
  existing?: GeneveInterface | null;
}

export function GeneveModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
  existing,
}: GeneveModalProps) {
  const t = useTranslations("geneve");
  const tc = useTranslations("common");
  const isEdit = !!existing;
  // General
  const [name, setName] = useState("gnv0");
  const [description, setDescription] = useState("");
  const [remote, setRemote] = useState("");
  const [vni, setVni] = useState("");
  const [port, setPort] = useState("");
  const [mtu, setMtu] = useState("");
  const [mac, setMac] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState("");
  const [ipv6AddressEui64, setIpv6AddressEui64] = useState("");
  const [ipv6AddressAutoconf, setIpv6AddressAutoconf] = useState(false);
  const [ipv6AddressNoDefaultLinkLocal, setIpv6AddressNoDefaultLinkLocal] = useState(false);
  const [ipv6AddressInterfaceIdentifier, setIpv6AddressInterfaceIdentifier] = useState("");

  // IP Settings
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

  // IPv6 Settings
  const [ipv6AcceptDad, setIpv6AcceptDad] = useState("");
  const [ipv6AdjustMss, setIpv6AdjustMss] = useState("");
  const [ipv6BaseReachableTime, setIpv6BaseReachableTime] = useState("");
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);
  const [ipv6DupAddrDetectTransmits, setIpv6DupAddrDetectTransmits] = useState("");
  const [ipv6SourceValidation, setIpv6SourceValidation] = useState("");

  // Advanced - Tunnel Parameters
  const [parametersDf, setParametersDf] = useState("");
  const [parametersTos, setParametersTos] = useState("");
  const [parametersTtl, setParametersTtl] = useState("");
  const [parametersInnerproto, setParametersInnerproto] = useState(false);
  const [parametersFlowlabel, setParametersFlowlabel] = useState("");

  // Advanced - Traffic Mirroring
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");
  const [redirect, setRedirect] = useState("");

  // Available interfaces for dropdowns
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getNextInterfaceName = (): string => {
    let i = 0;
    while (existingInterfaces.includes(`gnv${i}`)) {
      i++;
    }
    return `gnv${i}`;
  };

  const resetForm = () => {
    setName(getNextInterfaceName());
    setDescription("");
    setRemote("");
    setVni("");
    setPort("");
    setMtu("");
    setMac("");
    setVrf("");
    setDisabled(false);
    setAddresses("");
    setIpv6AddressEui64("");
    setIpv6AddressAutoconf(false);
    setIpv6AddressNoDefaultLinkLocal(false);
    setIpv6AddressInterfaceIdentifier("");
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
    setIpv6AdjustMss("");
    setIpv6BaseReachableTime("");
    setIpv6DisableForwarding(false);
    setIpv6DupAddrDetectTransmits("");
    setIpv6SourceValidation("");
    setParametersDf("");
    setParametersTos("");
    setParametersTtl("");
    setParametersInnerproto(false);
    setParametersFlowlabel("");
    setMirrorIngress("");
    setMirrorEgress("");
    setRedirect("");
    setError(null);
  };

  const populateForm = (interfaceData: GeneveInterface) => {
    setName(interfaceData.name);
    setDescription(interfaceData.description ?? "");
    setRemote(interfaceData.remote ?? "");
    setVni(interfaceData.vni ?? "");
    setPort(interfaceData.port ?? "");
    setMtu(interfaceData.mtu ?? "");
    setMac(interfaceData.mac ?? "");
    setVrf(interfaceData.vrf ?? "");
    setDisabled(interfaceData.disable ?? false);
    setAddresses(interfaceData.addresses.join("\n"));
    setIpv6AddressEui64(interfaceData.ipv6_address_eui64.join("\n"));
    setIpv6AddressAutoconf(interfaceData.ipv6_address_autoconf ?? false);
    setIpv6AddressNoDefaultLinkLocal(interfaceData.ipv6_address_no_default_link_local ?? false);
    setIpv6AddressInterfaceIdentifier(interfaceData.ipv6_address_interface_identifier ?? "");
    setIpAdjustMss(interfaceData.ip_adjust_mss ?? "");
    setIpArpCacheTimeout(interfaceData.ip_arp_cache_timeout ?? "");
    setIpDisableArpFilter(interfaceData.ip_disable_arp_filter ?? false);
    setIpDisableForwarding(interfaceData.ip_disable_forwarding ?? false);
    setIpEnableArpAccept(interfaceData.ip_enable_arp_accept ?? false);
    setIpEnableArpAnnounce(interfaceData.ip_enable_arp_announce ?? false);
    setIpEnableArpIgnore(interfaceData.ip_enable_arp_ignore ?? false);
    setIpEnableDirectedBroadcast(interfaceData.ip_enable_directed_broadcast ?? false);
    setIpEnableProxyArp(interfaceData.ip_enable_proxy_arp ?? false);
    setIpProxyArpPvlan(interfaceData.ip_proxy_arp_pvlan ?? false);
    setIpSourceValidation(interfaceData.ip_source_validation ?? "");
    setIpv6AcceptDad(interfaceData.ipv6_accept_dad ?? "");
    setIpv6AdjustMss(interfaceData.ipv6_adjust_mss ?? "");
    setIpv6BaseReachableTime(interfaceData.ipv6_base_reachable_time ?? "");
    setIpv6DisableForwarding(interfaceData.ipv6_disable_forwarding ?? false);
    setIpv6DupAddrDetectTransmits(interfaceData.ipv6_dup_addr_detect_transmits ?? "");
    setIpv6SourceValidation(interfaceData.ipv6_source_validation ?? "");
    setParametersDf(interfaceData.parameters_ip_df ?? "");
    setParametersTos(interfaceData.parameters_ip_tos ?? "");
    setParametersTtl(interfaceData.parameters_ip_ttl ?? "");
    setParametersInnerproto(interfaceData.parameters_ip_innerproto ?? false);
    setParametersFlowlabel(interfaceData.parameters_ipv6_flowlabel ?? "");
    setMirrorIngress(interfaceData.mirror_ingress ?? "");
    setMirrorEgress(interfaceData.mirror_egress ?? "");
    setRedirect(interfaceData.redirect ?? "");
    setError(null);
  };

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch(() => {});
    if (existing) {
      populateForm(existing);
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing]);

  const validateShared = (): string | null => {
    if (!remote.trim()) return t("validation.remoteRequired");
    if (mtu.trim()) {
      const mtuNum = parseInt(mtu.trim(), 10);
      if (isNaN(mtuNum) || mtuNum < 1200 || mtuNum > 16000) {
        return t("validation.mtuRange");
      }
    }
    if (vni.trim()) {
      const vniNum = parseInt(vni.trim(), 10);
      if (isNaN(vniNum) || vniNum < 0 || vniNum > 16777214) {
        return t("validation.vniRange");
      }
    }
    if (port.trim()) {
      const portNum = parseInt(port.trim(), 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return t("validation.portRange");
      }
    }
    return null;
  };

  const validateForm = (): string | null => {
    if (!name.trim()) return t("validation.nameRequired");
    if (!/^gnv\d+$/.test(name)) return t("validation.nameFormat");
    if (existingInterfaces.includes(name)) return t("validation.nameExists", { name });
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
      const addrList = addresses.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);
      const eui64List = ipv6AddressEui64.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);

      const result = await geneveService.updateInterface(existing.name, existing, {
        description: description.trim() || null,
        addresses: addrList,
        mtu: mtu.trim() || null,
        vrf: vrf.trim() || null,
        disabled,
        mac: mac.trim() || null,
        remote: remote.trim() || null,
        vni: vni.trim() || null,
        port: port.trim() || null,
        parameters_ip_df: parametersDf || null,
        parameters_ip_tos: parametersTos.trim() || null,
        parameters_ip_ttl: parametersTtl.trim() || null,
        parameters_ip_innerproto: parametersInnerproto,
        parameters_ipv6_flowlabel: parametersFlowlabel.trim() || null,
        ip_adjust_mss: ipAdjustMss.trim() || null,
        ip_arp_cache_timeout: ipArpCacheTimeout.trim() || null,
        ip_disable_arp_filter: ipDisableArpFilter,
        ip_disable_forwarding: ipDisableForwarding,
        ip_enable_arp_accept: ipEnableArpAccept,
        ip_enable_arp_announce: ipEnableArpAnnounce,
        ip_enable_arp_ignore: ipEnableArpIgnore,
        ip_enable_directed_broadcast: ipEnableDirectedBroadcast,
        ip_enable_proxy_arp: ipEnableProxyArp,
        ip_proxy_arp_pvlan: ipProxyArpPvlan,
        ip_source_validation: ipSourceValidation || null,
        ipv6_accept_dad: ipv6AcceptDad || null,
        ipv6_adjust_mss: ipv6AdjustMss.trim() || null,
        ipv6_base_reachable_time: ipv6BaseReachableTime.trim() || null,
        ipv6_disable_forwarding: ipv6DisableForwarding,
        ipv6_dup_addr_detect_transmits: ipv6DupAddrDetectTransmits.trim() || null,
        ipv6_source_validation: ipv6SourceValidation || null,
        ipv6_address_autoconf: ipv6AddressAutoconf,
        ipv6_address_eui64: eui64List,
        ipv6_address_no_default_link_local: ipv6AddressNoDefaultLinkLocal,
        ipv6_address_interface_identifier: ipv6AddressInterfaceIdentifier.trim() || null,
        mirror_ingress: mirrorIngress.trim() || null,
        mirror_egress: mirrorEgress.trim() || null,
        redirect: redirect.trim() || null,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("modal.updateFailed"));
      }
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
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
      const addrList = addresses.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);
      const eui64List = ipv6AddressEui64.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);

      const config: Parameters<typeof geneveService.createInterface>[0] = {
        name,
        remote: remote.trim(),
      };

      // General
      if (description.trim()) config.description = description.trim();
      if (vni.trim()) config.vni = vni.trim();
      if (port.trim()) config.port = port.trim();
      if (mtu.trim()) config.mtu = mtu.trim();
      if (mac.trim()) config.mac = mac.trim();
      if (vrf.trim()) config.vrf = vrf.trim();
      if (disabled) config.disabled = true;

      // Addresses
      if (addrList.length > 0) config.addresses = addrList;
      if (eui64List.length > 0) config.ipv6_address_eui64 = eui64List;
      if (ipv6AddressAutoconf) config.ipv6_address_autoconf = true;
      if (ipv6AddressNoDefaultLinkLocal) config.ipv6_address_no_default_link_local = true;
      if (ipv6AddressInterfaceIdentifier.trim()) config.ipv6_address_interface_identifier = ipv6AddressInterfaceIdentifier.trim();

      // IP Settings
      if (ipAdjustMss.trim()) config.ip_adjust_mss = ipAdjustMss.trim();
      if (ipArpCacheTimeout.trim()) config.ip_arp_cache_timeout = ipArpCacheTimeout.trim();
      if (ipDisableArpFilter) config.ip_disable_arp_filter = true;
      if (ipDisableForwarding) config.ip_disable_forwarding = true;
      if (ipEnableArpAccept) config.ip_enable_arp_accept = true;
      if (ipEnableArpAnnounce) config.ip_enable_arp_announce = true;
      if (ipEnableArpIgnore) config.ip_enable_arp_ignore = true;
      if (ipEnableDirectedBroadcast) config.ip_enable_directed_broadcast = true;
      if (ipEnableProxyArp) config.ip_enable_proxy_arp = true;
      if (ipProxyArpPvlan) config.ip_proxy_arp_pvlan = true;
      if (ipSourceValidation) config.ip_source_validation = ipSourceValidation;

      // IPv6 Settings
      if (ipv6AcceptDad) config.ipv6_accept_dad = ipv6AcceptDad;
      if (ipv6AdjustMss.trim()) config.ipv6_adjust_mss = ipv6AdjustMss.trim();
      if (ipv6BaseReachableTime.trim()) config.ipv6_base_reachable_time = ipv6BaseReachableTime.trim();
      if (ipv6DisableForwarding) config.ipv6_disable_forwarding = true;
      if (ipv6DupAddrDetectTransmits.trim()) config.ipv6_dup_addr_detect_transmits = ipv6DupAddrDetectTransmits.trim();
      if (ipv6SourceValidation) config.ipv6_source_validation = ipv6SourceValidation;

      // Tunnel Parameters
      if (parametersDf) config.parameters_ip_df = parametersDf;
      if (parametersTos.trim()) config.parameters_ip_tos = parametersTos.trim();
      if (parametersTtl.trim()) config.parameters_ip_ttl = parametersTtl.trim();
      if (parametersInnerproto) config.parameters_ip_innerproto = true;
      if (parametersFlowlabel.trim()) config.parameters_ipv6_flowlabel = parametersFlowlabel.trim();

      // Traffic Mirroring
      if (mirrorIngress.trim()) config.mirror_ingress = mirrorIngress.trim();
      if (mirrorEgress.trim()) config.mirror_egress = mirrorEgress.trim();
      if (redirect.trim()) config.redirect = redirect.trim();

      const result = await geneveService.createInterface(config);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("modal.createFailed"));
      }
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
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

        <Tabs defaultValue="general" className="mt-2">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
            <TabsTrigger value="addresses">{t("tabs.addresses")}</TabsTrigger>
            <TabsTrigger value="ip">{t("tabs.ipSettings")}</TabsTrigger>
            <TabsTrigger value="ipv6">{t("tabs.ipv6Settings")}</TabsTrigger>
            <TabsTrigger value="advanced">{t("tabs.advanced")}</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("general.interfaceName")} {isEdit ? null : <span className="text-destructive">*</span>}</Label>
              <Input
                id="name"
                value={isEdit ? existing.name : name}
                onChange={(e) => setName(e.target.value)}
                placeholder="gnv0"
                disabled={isEdit}
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? t("general.nameLocked")
                  : t("general.nameHint")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{tc("description")}</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("general.descriptionPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remote">{t("general.remoteAddress")} <span className="text-destructive">*</span></Label>
              <Input
                id="remote"
                value={remote}
                onChange={(e) => setRemote(e.target.value)}
                placeholder={t("general.remoteAddressPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("general.remoteAddressHint")}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vni">VNI</Label>
                <Input
                  id="vni"
                  value={vni}
                  onChange={(e) => setVni(e.target.value)}
                  placeholder="0-16777214"
                />
                <p className="text-xs text-muted-foreground">{t("general.vniHint")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">{t("general.port")}</Label>
                <Input
                  id="port"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="6081"
                />
                <p className="text-xs text-muted-foreground">{t("general.portHint")}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mtu">MTU</Label>
                <Input
                  id="mtu"
                  value={mtu}
                  onChange={(e) => setMtu(e.target.value)}
                  placeholder="1500"
                />
                <p className="text-xs text-muted-foreground">{t("general.mtuHint")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vrf">VRF</Label>
                <VrfSelect
                  id="vrf"
                  value={vrf}
                  onValueChange={setVrf}
                />
              </div>
            </div>

            {capabilities?.features.mac?.supported && (
              <div className="space-y-2">
                <Label htmlFor="mac">{t("general.macAddress")}</Label>
                <Input
                  id="mac"
                  value={mac}
                  onChange={(e) => setMac(e.target.value)}
                  placeholder="xx:xx:xx:xx:xx:xx"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} id="disabled" />
              <Label htmlFor="disabled" className="font-normal">{t("general.disableInterface")}</Label>
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="addresses">{t("addresses.ipAddresses")}</Label>
              <Textarea
                id="addresses"
                value={addresses}
                onChange={(e) => setAddresses(e.target.value)}
                placeholder={"10.0.0.1/32\n192.168.1.1/24"}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">{t("addresses.ipAddressesHint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eui64">{t("addresses.eui64Prefixes")}</Label>
              <Textarea
                id="eui64"
                value={ipv6AddressEui64}
                onChange={(e) => setIpv6AddressEui64(e.target.value)}
                placeholder={"2001:db8::/64"}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{t("addresses.eui64Hint")}</p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="autoconf"
                checked={ipv6AddressAutoconf}
                onCheckedChange={(c) => setIpv6AddressAutoconf(c === true)}
              />
              <Label htmlFor="autoconf" className="font-normal">{t("addresses.autoconf")}</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="noDefaultLinkLocal"
                checked={ipv6AddressNoDefaultLinkLocal}
                onCheckedChange={(c) => setIpv6AddressNoDefaultLinkLocal(c === true)}
              />
              <Label htmlFor="noDefaultLinkLocal" className="font-normal">{t("addresses.noDefaultLinkLocal")}</Label>
            </div>

            {capabilities?.features.ipv6_address_interface_identifier?.supported && (
              <div className="space-y-2">
                <Label htmlFor="interfaceIdentifier">{t("addresses.interfaceIdentifier")}</Label>
                <Input
                  id="interfaceIdentifier"
                  value={ipv6AddressInterfaceIdentifier}
                  onChange={(e) => setIpv6AddressInterfaceIdentifier(e.target.value)}
                  placeholder="::1"
                />
                <p className="text-xs text-muted-foreground">{t("addresses.vyos15Only")}</p>
              </div>
            )}
          </TabsContent>

          {/* IP Settings Tab */}
          <TabsContent value="ip" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ipAdjustMss">{t("ip.adjustMss")}</Label>
                <Input
                  id="ipAdjustMss"
                  value={ipAdjustMss}
                  onChange={(e) => setIpAdjustMss(e.target.value)}
                  placeholder={t("ip.adjustMssPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipArpCacheTimeout">{t("ip.arpCacheTimeout")}</Label>
                <Input
                  id="ipArpCacheTimeout"
                  value={ipArpCacheTimeout}
                  onChange={(e) => setIpArpCacheTimeout(e.target.value)}
                  placeholder="1-86400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceValidation">{t("ip.sourceValidation")}</Label>
              <Select value={ipSourceValidation || "none"} onValueChange={(v) => setIpSourceValidation(v === "none" ? "" : v)}>
                <SelectTrigger id="sourceValidation">
                  <SelectValue placeholder={tc("none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc("none")}</SelectItem>
                  <SelectItem value="strict">{t("ip.strict")}</SelectItem>
                  <SelectItem value="loose">{t("ip.loose")}</SelectItem>
                  <SelectItem value="disable">{t("ip.disable")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="ipDisableArpFilter" checked={ipDisableArpFilter} onCheckedChange={(c) => setIpDisableArpFilter(c === true)} />
                <Label htmlFor="ipDisableArpFilter" className="font-normal">{t("ip.disableArpFilter")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ipDisableForwarding" checked={ipDisableForwarding} onCheckedChange={(c) => setIpDisableForwarding(c === true)} />
                <Label htmlFor="ipDisableForwarding" className="font-normal">{t("ip.disableIpv4Forwarding")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ipEnableArpAccept" checked={ipEnableArpAccept} onCheckedChange={(c) => setIpEnableArpAccept(c === true)} />
                <Label htmlFor="ipEnableArpAccept" className="font-normal">{t("ip.enableArpAccept")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ipEnableArpAnnounce" checked={ipEnableArpAnnounce} onCheckedChange={(c) => setIpEnableArpAnnounce(c === true)} />
                <Label htmlFor="ipEnableArpAnnounce" className="font-normal">{t("ip.enableArpAnnounce")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ipEnableArpIgnore" checked={ipEnableArpIgnore} onCheckedChange={(c) => setIpEnableArpIgnore(c === true)} />
                <Label htmlFor="ipEnableArpIgnore" className="font-normal">{t("ip.enableArpIgnore")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ipEnableDirectedBroadcast" checked={ipEnableDirectedBroadcast} onCheckedChange={(c) => setIpEnableDirectedBroadcast(c === true)} />
                <Label htmlFor="ipEnableDirectedBroadcast" className="font-normal">{t("ip.enableDirectedBroadcast")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ipEnableProxyArp" checked={ipEnableProxyArp} onCheckedChange={(c) => setIpEnableProxyArp(c === true)} />
                <Label htmlFor="ipEnableProxyArp" className="font-normal">{t("ip.enableProxyArp")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ipProxyArpPvlan" checked={ipProxyArpPvlan} onCheckedChange={(c) => setIpProxyArpPvlan(c === true)} />
                <Label htmlFor="ipProxyArpPvlan" className="font-normal">{t("ip.proxyArpPvlan")}</Label>
              </div>
            </div>
          </TabsContent>

          {/* IPv6 Settings Tab */}
          <TabsContent value="ipv6" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="ipv6AcceptDad">{t("ipv6.acceptDad")}</Label>
              <Select value={ipv6AcceptDad || "default"} onValueChange={(v) => setIpv6AcceptDad(v === "default" ? "" : v)}>
                <SelectTrigger id="ipv6AcceptDad">
                  <SelectValue placeholder={tc("default")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{tc("default")}</SelectItem>
                  <SelectItem value="0">{t("ipv6.acceptDad0")}</SelectItem>
                  <SelectItem value="1">{t("ipv6.acceptDad1")}</SelectItem>
                  <SelectItem value="2">{t("ipv6.acceptDad2")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ipv6AdjustMss">{t("ip.adjustMss")}</Label>
                <Input
                  id="ipv6AdjustMss"
                  value={ipv6AdjustMss}
                  onChange={(e) => setIpv6AdjustMss(e.target.value)}
                  placeholder={t("ipv6.adjustMssPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipv6BaseReachableTime">{t("ipv6.baseReachableTime")}</Label>
                <Input
                  id="ipv6BaseReachableTime"
                  value={ipv6BaseReachableTime}
                  onChange={(e) => setIpv6BaseReachableTime(e.target.value)}
                  placeholder="1-86400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipv6DupAddrDetectTransmits">{t("ipv6.dadTransmitCount")}</Label>
              <Input
                id="ipv6DupAddrDetectTransmits"
                value={ipv6DupAddrDetectTransmits}
                onChange={(e) => setIpv6DupAddrDetectTransmits(e.target.value)}
                placeholder={t("ipv6.dadTransmitCountPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipv6SourceValidation">{t("ip.sourceValidation")}</Label>
              <Select value={ipv6SourceValidation || "none"} onValueChange={(v) => setIpv6SourceValidation(v === "none" ? "" : v)}>
                <SelectTrigger id="ipv6SourceValidation">
                  <SelectValue placeholder={tc("none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc("none")}</SelectItem>
                  <SelectItem value="strict">{t("ip.strict")}</SelectItem>
                  <SelectItem value="loose">{t("ip.loose")}</SelectItem>
                  <SelectItem value="disable">{t("ip.disable")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="ipv6DisableForwarding" checked={ipv6DisableForwarding} onCheckedChange={(c) => setIpv6DisableForwarding(c === true)} />
              <Label htmlFor="ipv6DisableForwarding" className="font-normal">{t("ipv6.disableIpv6Forwarding")}</Label>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            {/* Tunnel Parameters */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">{t("advanced.tunnelParameters")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parametersDf">{t("advanced.dontFragment")}</Label>
                  <Select value={parametersDf || "none"} onValueChange={(v) => setParametersDf(v === "none" ? "" : v)}>
                    <SelectTrigger id="parametersDf">
                      <SelectValue placeholder={tc("default")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tc("default")}</SelectItem>
                      <SelectItem value="set">{t("advanced.dfSet")}</SelectItem>
                      <SelectItem value="unset">{t("advanced.dfUnset")}</SelectItem>
                      <SelectItem value="inherit">{t("advanced.dfInherit")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parametersTos">TOS</Label>
                  <Input
                    id="parametersTos"
                    value={parametersTos}
                    onChange={(e) => setParametersTos(e.target.value)}
                    placeholder="0-99"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parametersTtl">TTL</Label>
                  <Input
                    id="parametersTtl"
                    value={parametersTtl}
                    onChange={(e) => setParametersTtl(e.target.value)}
                    placeholder="0-255"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parametersFlowlabel">{t("advanced.flowLabel")}</Label>
                  <Input
                    id="parametersFlowlabel"
                    value={parametersFlowlabel}
                    onChange={(e) => setParametersFlowlabel(e.target.value)}
                    placeholder={t("advanced.flowLabelPlaceholder")}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="parametersInnerproto" checked={parametersInnerproto} onCheckedChange={(c) => setParametersInnerproto(c === true)} />
                <Label htmlFor="parametersInnerproto" className="font-normal">{t("advanced.innerProto")}</Label>
              </div>
            </div>

            {/* Traffic Mirroring */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">{t("advanced.trafficMirroring")}</h4>
              <div className="space-y-2">
                <Label>{t("advanced.mirrorIngress")}</Label>
                <InterfaceSelect
                  value={mirrorIngress || "none"}
                  onValueChange={(v) => setMirrorIngress(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: tc("none"), value: "none" }}
                  placeholder={tc("none")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("advanced.mirrorEgress")}</Label>
                <InterfaceSelect
                  value={mirrorEgress || "none"}
                  onValueChange={(v) => setMirrorEgress(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: tc("none"), value: "none" }}
                  placeholder={tc("none")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("advanced.redirectTo")}</Label>
                <InterfaceSelect
                  value={redirect || "none"}
                  onValueChange={(v) => setRedirect(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: tc("none"), value: "none" }}
                  placeholder={tc("none")}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 mt-4">
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
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
