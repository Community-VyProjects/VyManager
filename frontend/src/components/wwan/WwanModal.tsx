"use client";

import { useState, useEffect } from "react";
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
import { Signal, Loader2, Eye, EyeOff, X, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { wwanService, type WwanInterface, type WwanCapabilities } from "@/lib/api/wwan";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";

interface WwanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: WwanCapabilities | null;
  existingInterfaces: string[];
  existing?: WwanInterface | null;
}

const MTU_PRESETS = ["1280", "1400", "1430", "1500"];
const TIMEOUT_PRESETS = ["30", "60", "300", "600", "3600"];
const DAD_PRESETS = ["0", "1", "2", "3"];

const getMssMode = (v: string) => (!v ? "none" : v === "clamp-mss-to-pmtu" ? "clamp" : "custom");
const getMtuMode = (v: string) => (!v ? "default" : MTU_PRESETS.includes(v) ? v : "custom");
const getTimeoutMode = (v: string) => (!v ? "none" : TIMEOUT_PRESETS.includes(v) ? v : "custom");
const getDadMode = (v: string) => (!v ? "default" : DAD_PRESETS.includes(v) ? v : "custom");

export function WwanModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
  existing,
}: WwanModalProps) {
  const t = useTranslations("wwan");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);

  // Connection
  const [name, setName] = useState("wwan0");
  const [apn, setApn] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [connectOnDemand, setConnectOnDemand] = useState(false);
  const [disableLinkDetect, setDisableLinkDetect] = useState(false);
  const [disable, setDisable] = useState(false);

  // Basic
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [mtuIsCustom, setMtuIsCustom] = useState(false);
  const [vrf, setVrf] = useState("");

  // Addresses
  const [addresses, setAddresses] = useState("");
  const [dhcpClientId, setDhcpClientId] = useState("");
  const [dhcpDefaultRouteDistance, setDhcpDefaultRouteDistance] = useState("");
  const [dhcpHostName, setDhcpHostName] = useState("");
  const [dhcpMtu, setDhcpMtu] = useState("");
  const [dhcpNoDefaultRoute, setDhcpNoDefaultRoute] = useState(false);
  const [dhcpReject, setDhcpReject] = useState<string[]>([]);
  const [dhcpRejectInput, setDhcpRejectInput] = useState("");
  const [dhcpUserClass, setDhcpUserClass] = useState("");
  const [dhcpVendorClassId, setDhcpVendorClassId] = useState("");
  const [dhcpv6Duid, setDhcpv6Duid] = useState("");
  const [dhcpv6NoRelease, setDhcpv6NoRelease] = useState(false);
  const [dhcpv6ParametersOnly, setDhcpv6ParametersOnly] = useState(false);
  const [dhcpv6RapidCommit, setDhcpv6RapidCommit] = useState(false);
  const [dhcpv6Temporary, setDhcpv6Temporary] = useState(false);
  const [dhcpv6NoRequestDns, setDhcpv6NoRequestDns] = useState(false);
  const [dhcpv6NoRequestDomainName, setDhcpv6NoRequestDomainName] = useState(false);
  const [dhcpv6Pd, setDhcpv6Pd] = useState<string[]>([]);
  const [dhcpv6PdInput, setDhcpv6PdInput] = useState("");
  const [ipv6AddressEui64, setIpv6AddressEui64] = useState("");
  const [ipv6AddressAutoconf, setIpv6AddressAutoconf] = useState(false);
  const [ipv6AddressNoDefaultLinkLocal, setIpv6AddressNoDefaultLinkLocal] = useState(false);
  const [ipv6AddressInterfaceIdentifier, setIpv6AddressInterfaceIdentifier] = useState("");

  // IP Settings
  const [ipAdjustMss, setIpAdjustMss] = useState("");
  const [ipAdjustMssIsCustom, setIpAdjustMssIsCustom] = useState(false);
  const [ipArpCacheTimeout, setIpArpCacheTimeout] = useState("");
  const [ipArpCacheTimeoutIsCustom, setIpArpCacheTimeoutIsCustom] = useState(false);
  const [ipSourceValidation, setIpSourceValidation] = useState("");
  const [ipDisableArpFilter, setIpDisableArpFilter] = useState(false);
  const [ipDisableForwarding, setIpDisableForwarding] = useState(false);
  const [ipEnableArpAccept, setIpEnableArpAccept] = useState(false);
  const [ipEnableArpAnnounce, setIpEnableArpAnnounce] = useState(false);
  const [ipEnableArpIgnore, setIpEnableArpIgnore] = useState(false);
  const [ipEnableDirectedBroadcast, setIpEnableDirectedBroadcast] = useState(false);
  const [ipEnableProxyArp, setIpEnableProxyArp] = useState(false);
  const [ipProxyArpPvlan, setIpProxyArpPvlan] = useState(false);

  // IPv6 Settings
  const [ipv6AcceptDad, setIpv6AcceptDad] = useState("");
  const [ipv6AdjustMss, setIpv6AdjustMss] = useState("");
  const [ipv6AdjustMssIsCustom, setIpv6AdjustMssIsCustom] = useState(false);
  const [ipv6BaseReachableTime, setIpv6BaseReachableTime] = useState("");
  const [ipv6BaseReachableTimeIsCustom, setIpv6BaseReachableTimeIsCustom] = useState(false);
  const [ipv6DupAddrDetectTransmits, setIpv6DupAddrDetectTransmits] = useState("");
  const [dadIsCustom, setDadIsCustom] = useState(false);
  const [ipv6SourceValidation, setIpv6SourceValidation] = useState("");
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);

  // Advanced
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");
  const [redirect, setRedirect] = useState("");

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supportsNoRequestDns = capabilities?.features?.dhcpv6_no_request_dns?.supported ?? false;
  const supportsNoRequestDomainName = capabilities?.features?.dhcpv6_no_request_domain_name?.supported ?? false;
  const supportsInterfaceIdentifier = capabilities?.features?.ipv6_interface_identifier?.supported ?? false;

  const mtuMode = mtuIsCustom ? "custom" : getMtuMode(mtu);
  const ipAdjustMssMode = ipAdjustMssIsCustom ? "custom" : getMssMode(ipAdjustMss);
  const ipArpCacheTimeoutMode = ipArpCacheTimeoutIsCustom ? "custom" : getTimeoutMode(ipArpCacheTimeout);
  const ipv6AdjustMssMode = ipv6AdjustMssIsCustom ? "custom" : getMssMode(ipv6AdjustMss);
  const ipv6BaseReachableTimeMode = ipv6BaseReachableTimeIsCustom ? "custom" : getTimeoutMode(ipv6BaseReachableTime);
  const dadTransmitsMode = dadIsCustom ? "custom" : getDadMode(ipv6DupAddrDetectTransmits);

  const getNextInterfaceName = (): string => {
    let i = 0;
    while (existingInterfaces.includes(`wwan${i}`)) i++;
    return `wwan${i}`;
  };

  const resetForm = () => {
    setName(getNextInterfaceName());
    setApn(""); setAuthUsername(""); setAuthPassword(""); setShowPassword(false);
    setConnectOnDemand(false); setDisableLinkDetect(false); setDisable(false);
    setDescription(""); setMtu(""); setMtuIsCustom(false); setVrf("");
    setAddresses("");
    setDhcpClientId(""); setDhcpDefaultRouteDistance(""); setDhcpHostName(""); setDhcpMtu("");
    setDhcpNoDefaultRoute(false); setDhcpReject([]); setDhcpRejectInput("");
    setDhcpUserClass(""); setDhcpVendorClassId("");
    setDhcpv6Duid(""); setDhcpv6NoRelease(false); setDhcpv6ParametersOnly(false);
    setDhcpv6RapidCommit(false); setDhcpv6Temporary(false);
    setDhcpv6NoRequestDns(false); setDhcpv6NoRequestDomainName(false);
    setDhcpv6Pd([]); setDhcpv6PdInput("");
    setIpv6AddressEui64(""); setIpv6AddressAutoconf(false);
    setIpv6AddressNoDefaultLinkLocal(false); setIpv6AddressInterfaceIdentifier("");
    setIpAdjustMss(""); setIpAdjustMssIsCustom(false);
    setIpArpCacheTimeout(""); setIpArpCacheTimeoutIsCustom(false);
    setIpSourceValidation("");
    setIpDisableArpFilter(false); setIpDisableForwarding(false);
    setIpEnableArpAccept(false); setIpEnableArpAnnounce(false);
    setIpEnableArpIgnore(false); setIpEnableDirectedBroadcast(false);
    setIpEnableProxyArp(false); setIpProxyArpPvlan(false);
    setIpv6AcceptDad("");
    setIpv6AdjustMss(""); setIpv6AdjustMssIsCustom(false);
    setIpv6BaseReachableTime(""); setIpv6BaseReachableTimeIsCustom(false);
    setIpv6DupAddrDetectTransmits(""); setDadIsCustom(false);
    setIpv6SourceValidation(""); setIpv6DisableForwarding(false);
    setMirrorIngress(""); setMirrorEgress(""); setRedirect("");
    setError(null);
  };

  const populateForm = (d: WwanInterface) => {
    setName(d.name);
    setApn(d.apn ?? "");
    setAuthUsername(d.auth_username ?? "");
    setAuthPassword(d.auth_password ?? "");
    setShowPassword(false);
    setConnectOnDemand(d.connect_on_demand);
    setDisableLinkDetect(d.disable_link_detect);
    setDisable(d.disable);
    setDescription(d.description ?? "");
    const iMtu = d.mtu ?? "";
    setMtu(iMtu);
    setMtuIsCustom(getMtuMode(iMtu) === "custom");
    setVrf(d.vrf ?? "");
    setAddresses(d.addresses.join("\n"));
    setDhcpClientId(d.dhcp_client_id ?? "");
    setDhcpDefaultRouteDistance(d.dhcp_default_route_distance ?? "");
    setDhcpHostName(d.dhcp_host_name ?? "");
    setDhcpMtu(d.dhcp_mtu ?? "");
    setDhcpNoDefaultRoute(d.dhcp_no_default_route);
    setDhcpReject([...(d.dhcp_reject ?? [])]);
    setDhcpRejectInput("");
    setDhcpUserClass(d.dhcp_user_class ?? "");
    setDhcpVendorClassId(d.dhcp_vendor_class_id ?? "");
    setDhcpv6Duid(d.dhcpv6_duid ?? "");
    setDhcpv6NoRelease(d.dhcpv6_no_release);
    setDhcpv6ParametersOnly(d.dhcpv6_parameters_only);
    setDhcpv6RapidCommit(d.dhcpv6_rapid_commit);
    setDhcpv6Temporary(d.dhcpv6_temporary);
    setDhcpv6NoRequestDns(d.dhcpv6_no_request_dns ?? false);
    setDhcpv6NoRequestDomainName(d.dhcpv6_no_request_domain_name ?? false);
    setDhcpv6Pd((d.dhcpv6_pd ?? []).map((pd) => pd.id));
    setDhcpv6PdInput("");
    setIpv6AddressEui64(d.ipv6_address_eui64.join("\n"));
    setIpv6AddressAutoconf(d.ipv6_address_autoconf);
    setIpv6AddressNoDefaultLinkLocal(d.ipv6_address_no_default_link_local);
    setIpv6AddressInterfaceIdentifier(d.ipv6_address_interface_identifier ?? "");
    const iaMss = d.ip_adjust_mss ?? "";
    setIpAdjustMss(iaMss);
    setIpAdjustMssIsCustom(getMssMode(iaMss) === "custom");
    const iAct = d.ip_arp_cache_timeout ?? "";
    setIpArpCacheTimeout(iAct);
    setIpArpCacheTimeoutIsCustom(getTimeoutMode(iAct) === "custom");
    setIpSourceValidation(d.ip_source_validation ?? "");
    setIpDisableArpFilter(d.ip_disable_arp_filter);
    setIpDisableForwarding(d.ip_disable_forwarding);
    setIpEnableArpAccept(d.ip_enable_arp_accept);
    setIpEnableArpAnnounce(d.ip_enable_arp_announce);
    setIpEnableArpIgnore(d.ip_enable_arp_ignore);
    setIpEnableDirectedBroadcast(d.ip_enable_directed_broadcast);
    setIpEnableProxyArp(d.ip_enable_proxy_arp);
    setIpProxyArpPvlan(d.ip_proxy_arp_pvlan);
    setIpv6AcceptDad(d.ipv6_accept_dad ?? "");
    const i6Mss = d.ipv6_adjust_mss ?? "";
    setIpv6AdjustMss(i6Mss);
    setIpv6AdjustMssIsCustom(getMssMode(i6Mss) === "custom");
    const i6Brt = d.ipv6_base_reachable_time ?? "";
    setIpv6BaseReachableTime(i6Brt);
    setIpv6BaseReachableTimeIsCustom(getTimeoutMode(i6Brt) === "custom");
    const i6Dad = d.ipv6_dup_addr_detect_transmits ?? "";
    setIpv6DupAddrDetectTransmits(i6Dad);
    setDadIsCustom(getDadMode(i6Dad) === "custom");
    setIpv6SourceValidation(d.ipv6_source_validation ?? "");
    setIpv6DisableForwarding(d.ipv6_disable_forwarding);
    setMirrorIngress(d.mirror_ingress ?? "");
    setMirrorEgress(d.mirror_egress ?? "");
    setRedirect(d.redirect ?? "");
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

  const lockedName = lockedIdentity(existing, (i) => i.name, name);

  const validateForm = (): string | null => {
    if (!isEdit) {
      if (!name.trim()) return t("errors.nameRequired");
      if (!/^wwan\d+$/.test(name)) return t("errors.namePattern");
      if (existingInterfaces.includes(name)) return t("errors.nameExists", { name });
    }
    return null;
  };

  const splitList = (val: string) => val.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);

  const submitCreate = async () => {
    const config: Parameters<typeof wwanService.createInterface>[0] = { name };
    const addrList = splitList(addresses);
    const eui64List = splitList(ipv6AddressEui64);

    if (apn.trim()) config.apn = apn.trim();
    if (authUsername.trim()) config.auth_username = authUsername.trim();
    if (authPassword.trim()) config.auth_password = authPassword.trim();
    if (connectOnDemand) config.connect_on_demand = true;
    if (disable) config.disable = true;
    if (disableLinkDetect) config.disable_link_detect = true;
    if (description.trim()) config.description = description.trim();
    if (mtu) config.mtu = mtu;
    if (vrf.trim()) config.vrf = vrf.trim();
    if (addrList.length > 0) config.addresses = addrList;
    if (mirrorIngress.trim()) config.mirror_ingress = mirrorIngress.trim();
    if (mirrorEgress.trim()) config.mirror_egress = mirrorEgress.trim();
    if (redirect.trim()) config.redirect = redirect.trim();
    if (dhcpClientId.trim()) config.dhcp_client_id = dhcpClientId.trim();
    if (dhcpDefaultRouteDistance.trim()) config.dhcp_default_route_distance = dhcpDefaultRouteDistance.trim();
    if (dhcpHostName.trim()) config.dhcp_host_name = dhcpHostName.trim();
    if (dhcpMtu.trim()) config.dhcp_mtu = dhcpMtu.trim();
    if (dhcpNoDefaultRoute) config.dhcp_no_default_route = true;
    if (dhcpReject.length > 0) config.dhcp_reject = dhcpReject;
    if (dhcpUserClass.trim()) config.dhcp_user_class = dhcpUserClass.trim();
    if (dhcpVendorClassId.trim()) config.dhcp_vendor_class_id = dhcpVendorClassId.trim();
    if (dhcpv6Duid.trim()) config.dhcpv6_duid = dhcpv6Duid.trim();
    if (dhcpv6NoRelease) config.dhcpv6_no_release = true;
    if (dhcpv6ParametersOnly) config.dhcpv6_parameters_only = true;
    if (dhcpv6RapidCommit) config.dhcpv6_rapid_commit = true;
    if (dhcpv6Temporary) config.dhcpv6_temporary = true;
    if (supportsNoRequestDns && dhcpv6NoRequestDns) config.dhcpv6_no_request_dns = true;
    if (supportsNoRequestDomainName && dhcpv6NoRequestDomainName) config.dhcpv6_no_request_domain_name = true;
    if (dhcpv6Pd.length > 0) config.dhcpv6_pd = dhcpv6Pd;
    if (ipAdjustMss) config.ip_adjust_mss = ipAdjustMss;
    if (ipArpCacheTimeout) config.ip_arp_cache_timeout = ipArpCacheTimeout;
    if (ipDisableArpFilter) config.ip_disable_arp_filter = true;
    if (ipDisableForwarding) config.ip_disable_forwarding = true;
    if (ipEnableArpAccept) config.ip_enable_arp_accept = true;
    if (ipEnableArpAnnounce) config.ip_enable_arp_announce = true;
    if (ipEnableArpIgnore) config.ip_enable_arp_ignore = true;
    if (ipEnableDirectedBroadcast) config.ip_enable_directed_broadcast = true;
    if (ipEnableProxyArp) config.ip_enable_proxy_arp = true;
    if (ipProxyArpPvlan) config.ip_proxy_arp_pvlan = true;
    if (ipSourceValidation) config.ip_source_validation = ipSourceValidation;
    if (ipv6AcceptDad) config.ipv6_accept_dad = ipv6AcceptDad;
    if (ipv6AddressAutoconf) config.ipv6_address_autoconf = true;
    if (eui64List.length > 0) config.ipv6_address_eui64 = eui64List;
    if (ipv6AddressNoDefaultLinkLocal) config.ipv6_address_no_default_link_local = true;
    if (supportsInterfaceIdentifier && ipv6AddressInterfaceIdentifier.trim()) config.ipv6_address_interface_identifier = ipv6AddressInterfaceIdentifier.trim();
    if (ipv6AdjustMss) config.ipv6_adjust_mss = ipv6AdjustMss;
    if (ipv6BaseReachableTime) config.ipv6_base_reachable_time = ipv6BaseReachableTime;
    if (ipv6DisableForwarding) config.ipv6_disable_forwarding = true;
    if (ipv6DupAddrDetectTransmits) config.ipv6_dup_addr_detect_transmits = ipv6DupAddrDetectTransmits;
    if (ipv6SourceValidation) config.ipv6_source_validation = ipv6SourceValidation;

    return wwanService.createInterface(config);
  };

  const submitUpdate = async (current: WwanInterface, targetName: string) => {
    return wwanService.updateInterface(targetName, current, {
      description: description.trim() || null,
      apn: apn.trim() || null,
      auth_username: authUsername.trim() || null,
      auth_password: authPassword.trim() || null,
      connect_on_demand: connectOnDemand,
      disable,
      disable_link_detect: disableLinkDetect,
      mtu: mtu || null,
      vrf: vrf.trim() || null,
      addresses: splitList(addresses),
      redirect: redirect.trim() || null,
      mirror_ingress: mirrorIngress.trim() || null,
      mirror_egress: mirrorEgress.trim() || null,
      dhcp_client_id: dhcpClientId.trim() || null,
      dhcp_default_route_distance: dhcpDefaultRouteDistance.trim() || null,
      dhcp_host_name: dhcpHostName.trim() || null,
      dhcp_mtu: dhcpMtu.trim() || null,
      dhcp_no_default_route: dhcpNoDefaultRoute,
      dhcp_reject: dhcpReject,
      dhcp_user_class: dhcpUserClass.trim() || null,
      dhcp_vendor_class_id: dhcpVendorClassId.trim() || null,
      dhcpv6_duid: dhcpv6Duid.trim() || null,
      dhcpv6_no_release: dhcpv6NoRelease,
      dhcpv6_parameters_only: dhcpv6ParametersOnly,
      dhcpv6_rapid_commit: dhcpv6RapidCommit,
      dhcpv6_temporary: dhcpv6Temporary,
      ...(supportsNoRequestDns ? { dhcpv6_no_request_dns: dhcpv6NoRequestDns } : {}),
      ...(supportsNoRequestDomainName ? { dhcpv6_no_request_domain_name: dhcpv6NoRequestDomainName } : {}),
      dhcpv6_pd: dhcpv6Pd,
      ip_adjust_mss: ipAdjustMss || null,
      ip_arp_cache_timeout: ipArpCacheTimeout || null,
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
      ipv6_address_autoconf: ipv6AddressAutoconf,
      ipv6_address_eui64: splitList(ipv6AddressEui64),
      ipv6_address_no_default_link_local: ipv6AddressNoDefaultLinkLocal,
      ...(supportsInterfaceIdentifier ? { ipv6_address_interface_identifier: ipv6AddressInterfaceIdentifier.trim() || null } : {}),
      ipv6_adjust_mss: ipv6AdjustMss || null,
      ipv6_base_reachable_time: ipv6BaseReachableTime || null,
      ipv6_disable_forwarding: ipv6DisableForwarding,
      ipv6_dup_addr_detect_transmits: ipv6DupAddrDetectTransmits || null,
      ipv6_source_validation: ipv6SourceValidation || null,
    });
  };

  const handleSubmit = async () => {
    const write = modalWriteKind(existing);

    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError(null);

    try {
      const result =
        write.kind === "update" && existing
          ? await submitUpdate(existing, write.name)
          : await submitCreate();

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(
          result.error || (isEdit ? t("errors.updateFailed") : t("errors.createFailed")),
        );
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Signal className="h-5 w-5" />
            {isEdit ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? (
              t.rich("editDescription", {
                name: existing.name,
                code: (chunks) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">{chunks}</code>,
              })
            ) : (
              t("createDescription")
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="connection" className="mt-2">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="connection">{t("tabs.connection")}</TabsTrigger>
            <TabsTrigger value="basic">{t("tabs.basic")}</TabsTrigger>
            <TabsTrigger value="addresses">{t("tabs.addresses")}</TabsTrigger>
            <TabsTrigger value="ip">IP</TabsTrigger>
            <TabsTrigger value="ipv6">IPv6</TabsTrigger>
            <TabsTrigger value="advanced">{t("tabs.advanced")}</TabsTrigger>
          </TabsList>

          {/* Connection Tab */}
          <TabsContent value="connection" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {t("connection.interfaceName")} {!isEdit && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="name"
                value={lockedName.value}
                onChange={(e) => setName(e.target.value)}
                placeholder="wwan0"
                disabled={lockedName.disabled}
                className={lockedName.disabled ? "bg-muted font-mono" : undefined}
              />
              <p className="text-xs text-muted-foreground">
                {lockedName.disabled
                  ? t("connection.nameLocked")
                  : t("connection.namePattern")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apn">APN</Label>
              <Input
                id="apn"
                value={apn}
                onChange={(e) => setApn(e.target.value)}
                placeholder="internet"
              />
              <p className="text-xs text-muted-foreground">{t("connection.apnHelp")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authUsername">{t("connection.authUsername")}</Label>
              <Input
                id="authUsername"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder={tc("optional")}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="authPassword">{t("connection.authPassword")}</Label>
              <div className="relative">
                <Input
                  id="authPassword"
                  type={showPassword ? "text" : "password"}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder={tc("optional")}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="connectOnDemand" checked={connectOnDemand} onCheckedChange={(c) => setConnectOnDemand(c === true)} />
              <Label htmlFor="connectOnDemand" className="font-normal">{t("connection.connectOnDemand")}</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="disableLinkDetect" checked={disableLinkDetect} onCheckedChange={(c) => setDisableLinkDetect(c === true)} />
              <Label htmlFor="disableLinkDetect" className="font-normal">{t("connection.disableLinkDetect")}</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="disable" checked={disable} onCheckedChange={(c) => setDisable(c === true)} />
              <Label htmlFor="disable" className="font-normal">{t("connection.disableInterface")}</Label>
            </div>
          </TabsContent>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="description">{tc("description")}</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("basic.descriptionPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mtu">MTU</Label>
              <Select
                value={mtuMode}
                onValueChange={(v) => {
                  if (v === "default") { setMtu(""); setMtuIsCustom(false); }
                  else if (v === "custom") { setMtu(""); setMtuIsCustom(true); }
                  else { setMtu(v); setMtuIsCustom(false); }
                }}
              >
                <SelectTrigger id="mtu"><SelectValue placeholder={t("basic.mtuDefault")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t("basic.mtuDefault")}</SelectItem>
                  <SelectItem value="1280">{t("basic.mtu1280")}</SelectItem>
                  <SelectItem value="1400">{t("basic.mtu1400")}</SelectItem>
                  <SelectItem value="1430">{t("basic.mtu1430")}</SelectItem>
                  <SelectItem value="1500">{t("basic.mtu1500")}</SelectItem>
                  <SelectItem value="custom">{t("basic.mtuCustom")}</SelectItem>
                </SelectContent>
              </Select>
              {mtuMode === "custom" && (
                <Input
                  value={mtu}
                  onChange={(e) => setMtu(e.target.value)}
                  placeholder={t("basic.mtuPlaceholder")}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vrf">VRF</Label>
              <VrfSelect
                id="vrf"
                value={vrf}
                onValueChange={setVrf}
              />
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label htmlFor="addresses">{t("addresses.ipAddresses")}</Label>
              <Textarea
                id="addresses"
                value={addresses}
                onChange={(e) => setAddresses(e.target.value)}
                placeholder={"10.0.0.1/32\ndhcp\ndhcpv6"}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">{t("addresses.help")}</p>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium">{t("addresses.dhcpOptions")}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dhcpClientId" className="text-xs">{t("addresses.clientId")}</Label>
                  <Input id="dhcpClientId" value={dhcpClientId} onChange={(e) => setDhcpClientId(e.target.value)} placeholder={tc("optional")} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dhcpHostName" className="text-xs">{t("addresses.hostName")}</Label>
                  <Input id="dhcpHostName" value={dhcpHostName} onChange={(e) => setDhcpHostName(e.target.value)} placeholder={tc("optional")} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dhcpUserClass" className="text-xs">{t("addresses.userClass")}</Label>
                  <Input id="dhcpUserClass" value={dhcpUserClass} onChange={(e) => setDhcpUserClass(e.target.value)} placeholder={tc("optional")} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dhcpVendorClassId" className="text-xs">{t("addresses.vendorClassId")}</Label>
                  <Input id="dhcpVendorClassId" value={dhcpVendorClassId} onChange={(e) => setDhcpVendorClassId(e.target.value)} placeholder={tc("optional")} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dhcpRouteDistance" className="text-xs">{t("addresses.defaultRouteDistance")}</Label>
                  <Input id="dhcpRouteDistance" value={dhcpDefaultRouteDistance} onChange={(e) => setDhcpDefaultRouteDistance(e.target.value)} placeholder={tc("optional")} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dhcpMtu" className="text-xs">DHCP MTU</Label>
                  <Input id="dhcpMtu" value={dhcpMtu} onChange={(e) => setDhcpMtu(e.target.value)} placeholder={tc("optional")} className="h-8 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="dhcpNoDefaultRoute" checked={dhcpNoDefaultRoute} onCheckedChange={(c) => setDhcpNoDefaultRoute(c === true)} />
                <Label htmlFor="dhcpNoDefaultRoute" className="font-normal text-sm">{t("addresses.noDefaultRoute")}</Label>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t("addresses.rejectEntries")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={dhcpRejectInput}
                    onChange={(e) => setDhcpRejectInput(e.target.value)}
                    placeholder={t("addresses.rejectPlaceholder")}
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && dhcpRejectInput.trim()) {
                        setDhcpReject([...dhcpReject, dhcpRejectInput.trim()]);
                        setDhcpRejectInput("");
                        e.preventDefault();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => {
                    if (dhcpRejectInput.trim()) { setDhcpReject([...dhcpReject, dhcpRejectInput.trim()]); setDhcpRejectInput(""); }
                  }}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                {dhcpReject.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {dhcpReject.map((r, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs bg-accent px-2 py-0.5 rounded">
                        {r}
                        <button onClick={() => setDhcpReject(dhcpReject.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium">{t("addresses.dhcpv6Options")}</h4>
              <div className="space-y-1">
                <Label htmlFor="dhcpv6Duid" className="text-xs">DUID</Label>
                <Input id="dhcpv6Duid" value={dhcpv6Duid} onChange={(e) => setDhcpv6Duid(e.target.value)} placeholder={tc("optional")} className="h-8 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="dhcpv6NoRelease" checked={dhcpv6NoRelease} onCheckedChange={(c) => setDhcpv6NoRelease(c === true)} />
                  <Label htmlFor="dhcpv6NoRelease" className="font-normal text-sm">{t("addresses.noRelease")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="dhcpv6ParametersOnly" checked={dhcpv6ParametersOnly} onCheckedChange={(c) => setDhcpv6ParametersOnly(c === true)} />
                  <Label htmlFor="dhcpv6ParametersOnly" className="font-normal text-sm">{t("addresses.parametersOnly")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="dhcpv6RapidCommit" checked={dhcpv6RapidCommit} onCheckedChange={(c) => setDhcpv6RapidCommit(c === true)} />
                  <Label htmlFor="dhcpv6RapidCommit" className="font-normal text-sm">{t("addresses.rapidCommit")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="dhcpv6Temporary" checked={dhcpv6Temporary} onCheckedChange={(c) => setDhcpv6Temporary(c === true)} />
                  <Label htmlFor="dhcpv6Temporary" className="font-normal text-sm">{t("addresses.temporary")}</Label>
                </div>
                {supportsNoRequestDns && (
                  <div className="flex items-center gap-2">
                    <Checkbox id="dhcpv6NoRequestDns" checked={dhcpv6NoRequestDns} onCheckedChange={(c) => setDhcpv6NoRequestDns(c === true)} />
                    <Label htmlFor="dhcpv6NoRequestDns" className="font-normal text-sm">{t("addresses.noRequestDns")}</Label>
                  </div>
                )}
                {supportsNoRequestDomainName && (
                  <div className="flex items-center gap-2">
                    <Checkbox id="dhcpv6NoRequestDomainName" checked={dhcpv6NoRequestDomainName} onCheckedChange={(c) => setDhcpv6NoRequestDomainName(c === true)} />
                    <Label htmlFor="dhcpv6NoRequestDomainName" className="font-normal text-sm">{t("addresses.noRequestDomainName")}</Label>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t("addresses.pdInstances")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={dhcpv6PdInput}
                    onChange={(e) => setDhcpv6PdInput(e.target.value)}
                    placeholder={t("addresses.pdPlaceholder")}
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && dhcpv6PdInput.trim()) {
                        setDhcpv6Pd([...dhcpv6Pd, dhcpv6PdInput.trim()]);
                        setDhcpv6PdInput("");
                        e.preventDefault();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => {
                    if (dhcpv6PdInput.trim()) { setDhcpv6Pd([...dhcpv6Pd, dhcpv6PdInput.trim()]); setDhcpv6PdInput(""); }
                  }}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                {dhcpv6Pd.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {dhcpv6Pd.map((pd, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs bg-accent px-2 py-0.5 rounded">
                        pd{pd}
                        <button onClick={() => setDhcpv6Pd(dhcpv6Pd.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium">{t("addresses.ipv6Options")}</h4>
              <div className="space-y-2">
                <Label htmlFor="ipv6Eui64" className="text-xs">{t("addresses.eui64Prefixes")}</Label>
                <Textarea
                  id="ipv6Eui64"
                  value={ipv6AddressEui64}
                  onChange={(e) => setIpv6AddressEui64(e.target.value)}
                  placeholder="2001:db8::/64"
                  rows={2}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">{t("addresses.eui64Help")}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="ipv6Autoconf" checked={ipv6AddressAutoconf} onCheckedChange={(c) => setIpv6AddressAutoconf(c === true)} />
                  <Label htmlFor="ipv6Autoconf" className="font-normal text-sm">{t("addresses.autoconf")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="noDefaultLinkLocal" checked={ipv6AddressNoDefaultLinkLocal} onCheckedChange={(c) => setIpv6AddressNoDefaultLinkLocal(c === true)} />
                  <Label htmlFor="noDefaultLinkLocal" className="font-normal text-sm">{t("addresses.noDefaultLinkLocal")}</Label>
                </div>
              </div>
              {supportsInterfaceIdentifier && (
                <div className="space-y-1">
                  <Label htmlFor="interfaceIdentifier" className="text-xs">{t("addresses.interfaceIdentifier")}</Label>
                  <Input
                    id="interfaceIdentifier"
                    value={ipv6AddressInterfaceIdentifier}
                    onChange={(e) => setIpv6AddressInterfaceIdentifier(e.target.value)}
                    placeholder={t("addresses.interfaceIdentifierPlaceholder")}
                    className="h-8 text-sm"
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* IP Settings Tab */}
          <TabsContent value="ip" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="ipAdjustMss">{t("ip.adjustMss")}</Label>
              <Select
                value={ipAdjustMssMode}
                onValueChange={(v) => {
                  if (v === "none") { setIpAdjustMss(""); setIpAdjustMssIsCustom(false); }
                  else if (v === "clamp") { setIpAdjustMss("clamp-mss-to-pmtu"); setIpAdjustMssIsCustom(false); }
                  else { setIpAdjustMss(""); setIpAdjustMssIsCustom(true); }
                }}
              >
                <SelectTrigger id="ipAdjustMss"><SelectValue placeholder={tc("none")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("ip.noneDefault")}</SelectItem>
                  <SelectItem value="clamp">{t("ip.clampToPmtu")}</SelectItem>
                  <SelectItem value="custom">{t("ip.mssCustom")}</SelectItem>
                </SelectContent>
              </Select>
              {ipAdjustMssMode === "custom" && (
                <Input value={ipAdjustMss} onChange={(e) => setIpAdjustMss(e.target.value)} placeholder={t("ip.mssPlaceholder")} className="mt-2" />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipArpCacheTimeout">{t("ip.arpCacheTimeout")}</Label>
              <Select
                value={ipArpCacheTimeoutMode}
                onValueChange={(v) => {
                  if (v === "none") { setIpArpCacheTimeout(""); setIpArpCacheTimeoutIsCustom(false); }
                  else if (v === "custom") { setIpArpCacheTimeout(""); setIpArpCacheTimeoutIsCustom(true); }
                  else { setIpArpCacheTimeout(v); setIpArpCacheTimeoutIsCustom(false); }
                }}
              >
                <SelectTrigger id="ipArpCacheTimeout"><SelectValue placeholder={t("ip.default30s")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("ip.default30s")}</SelectItem>
                  <SelectItem value="30">{t("ip.seconds30")}</SelectItem>
                  <SelectItem value="60">{t("ip.minute1")}</SelectItem>
                  <SelectItem value="300">{t("ip.minutes5")}</SelectItem>
                  <SelectItem value="600">{t("ip.minutes10")}</SelectItem>
                  <SelectItem value="3600">{t("ip.hour1")}</SelectItem>
                  <SelectItem value="custom">{t("ip.timeoutCustom")}</SelectItem>
                </SelectContent>
              </Select>
              {ipArpCacheTimeoutMode === "custom" && (
                <Input value={ipArpCacheTimeout} onChange={(e) => setIpArpCacheTimeout(e.target.value)} placeholder={t("ip.timeoutPlaceholder")} className="mt-2" />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipSourceValidation">{t("ip.sourceValidation")}</Label>
              <Select value={ipSourceValidation || "none"} onValueChange={(v) => setIpSourceValidation(v === "none" ? "" : v)}>
                <SelectTrigger id="ipSourceValidation"><SelectValue placeholder={tc("none")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc("none")}</SelectItem>
                  <SelectItem value="strict">{t("ip.strict")}</SelectItem>
                  <SelectItem value="loose">{t("ip.loose")}</SelectItem>
                  <SelectItem value="disable">{t("ip.disable")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { id: "ipDisableArpFilter", checked: ipDisableArpFilter, onChange: setIpDisableArpFilter, label: t("ip.disableArpFilter") },
                { id: "ipDisableForwarding", checked: ipDisableForwarding, onChange: setIpDisableForwarding, label: t("ip.disableForwarding") },
                { id: "ipEnableArpAccept", checked: ipEnableArpAccept, onChange: setIpEnableArpAccept, label: t("ip.enableArpAccept") },
                { id: "ipEnableArpAnnounce", checked: ipEnableArpAnnounce, onChange: setIpEnableArpAnnounce, label: t("ip.enableArpAnnounce") },
                { id: "ipEnableArpIgnore", checked: ipEnableArpIgnore, onChange: setIpEnableArpIgnore, label: t("ip.enableArpIgnore") },
                { id: "ipEnableDirectedBroadcast", checked: ipEnableDirectedBroadcast, onChange: setIpEnableDirectedBroadcast, label: t("ip.enableDirectedBroadcast") },
                { id: "ipEnableProxyArp", checked: ipEnableProxyArp, onChange: setIpEnableProxyArp, label: t("ip.enableProxyArp") },
                { id: "ipProxyArpPvlan", checked: ipProxyArpPvlan, onChange: setIpProxyArpPvlan, label: t("ip.proxyArpPvlan") },
              ].map(({ id, checked, onChange, label }) => (
                <div key={id} className="flex items-center gap-2">
                  <Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(c === true)} />
                  <Label htmlFor={id} className="font-normal text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* IPv6 Settings Tab */}
          <TabsContent value="ipv6" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="ipv6AcceptDad">{t("ipv6.acceptDad")}</Label>
              <Select value={ipv6AcceptDad || "default"} onValueChange={(v) => setIpv6AcceptDad(v === "default" ? "" : v)}>
                <SelectTrigger id="ipv6AcceptDad"><SelectValue placeholder={tc("default")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{tc("default")}</SelectItem>
                  <SelectItem value="0">{t("ipv6.zeroDisabled")}</SelectItem>
                  <SelectItem value="1">{t("ipv6.acceptDad1")}</SelectItem>
                  <SelectItem value="2">{t("ipv6.acceptDad2")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipv6AdjustMss">{t("ipv6.adjustMss")}</Label>
              <Select
                value={ipv6AdjustMssMode}
                onValueChange={(v) => {
                  if (v === "none") { setIpv6AdjustMss(""); setIpv6AdjustMssIsCustom(false); }
                  else if (v === "clamp") { setIpv6AdjustMss("clamp-mss-to-pmtu"); setIpv6AdjustMssIsCustom(false); }
                  else { setIpv6AdjustMss(""); setIpv6AdjustMssIsCustom(true); }
                }}
              >
                <SelectTrigger id="ipv6AdjustMss"><SelectValue placeholder={tc("none")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("ip.noneDefault")}</SelectItem>
                  <SelectItem value="clamp">{t("ip.clampToPmtu")}</SelectItem>
                  <SelectItem value="custom">{t("ip.mssCustom")}</SelectItem>
                </SelectContent>
              </Select>
              {ipv6AdjustMssMode === "custom" && (
                <Input value={ipv6AdjustMss} onChange={(e) => setIpv6AdjustMss(e.target.value)} placeholder={t("ip.mssPlaceholder")} className="mt-2" />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipv6BaseReachableTime">{t("ipv6.baseReachableTime")}</Label>
              <Select
                value={ipv6BaseReachableTimeMode}
                onValueChange={(v) => {
                  if (v === "none") { setIpv6BaseReachableTime(""); setIpv6BaseReachableTimeIsCustom(false); }
                  else if (v === "custom") { setIpv6BaseReachableTime(""); setIpv6BaseReachableTimeIsCustom(true); }
                  else { setIpv6BaseReachableTime(v); setIpv6BaseReachableTimeIsCustom(false); }
                }}
              >
                <SelectTrigger id="ipv6BaseReachableTime"><SelectValue placeholder={t("ip.default30s")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("ip.default30s")}</SelectItem>
                  <SelectItem value="30">{t("ip.seconds30")}</SelectItem>
                  <SelectItem value="60">{t("ip.minute1")}</SelectItem>
                  <SelectItem value="300">{t("ip.minutes5")}</SelectItem>
                  <SelectItem value="custom">{t("ip.timeoutCustom")}</SelectItem>
                </SelectContent>
              </Select>
              {ipv6BaseReachableTimeMode === "custom" && (
                <Input value={ipv6BaseReachableTime} onChange={(e) => setIpv6BaseReachableTime(e.target.value)} placeholder={t("ip.timeoutPlaceholder")} className="mt-2" />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipv6DupAddrDetectTransmits">{t("ipv6.dadTransmits")}</Label>
              <Select
                value={dadTransmitsMode}
                onValueChange={(v) => {
                  if (v === "default") { setIpv6DupAddrDetectTransmits(""); setDadIsCustom(false); }
                  else if (v === "custom") { setIpv6DupAddrDetectTransmits(""); setDadIsCustom(true); }
                  else { setIpv6DupAddrDetectTransmits(v); setDadIsCustom(false); }
                }}
              >
                <SelectTrigger id="ipv6DupAddrDetectTransmits"><SelectValue placeholder={tc("default")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{tc("default")}</SelectItem>
                  <SelectItem value="0">{t("ipv6.zeroDisabled")}</SelectItem>
                  <SelectItem value="1">{t("ipv6.transmits", { count: 1 })}</SelectItem>
                  <SelectItem value="2">{t("ipv6.transmits", { count: 2 })}</SelectItem>
                  <SelectItem value="3">{t("ipv6.transmits", { count: 3 })}</SelectItem>
                  <SelectItem value="custom">{t("ipv6.customCount")}</SelectItem>
                </SelectContent>
              </Select>
              {dadTransmitsMode === "custom" && (
                <Input value={ipv6DupAddrDetectTransmits} onChange={(e) => setIpv6DupAddrDetectTransmits(e.target.value)} placeholder={t("ipv6.countPlaceholder")} className="mt-2" />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipv6SourceValidation">{t("ipv6.sourceValidation")}</Label>
              <Select value={ipv6SourceValidation || "none"} onValueChange={(v) => setIpv6SourceValidation(v === "none" ? "" : v)}>
                <SelectTrigger id="ipv6SourceValidation"><SelectValue placeholder={tc("none")} /></SelectTrigger>
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
              <Label htmlFor="ipv6DisableForwarding" className="font-normal">{t("ipv6.disableForwarding")}</Label>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <h4 className="text-sm font-medium text-foreground">{t("advanced.title")}</h4>
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
                {isEdit ? tc("saving") : t("creating")}
              </>
            ) : (
              isEdit ? t("saveChanges") : t("createInterface")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
