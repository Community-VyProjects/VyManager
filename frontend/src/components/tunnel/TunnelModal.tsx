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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Waypoints } from "lucide-react";
import { tunnelService, type TunnelCapabilities, type TunnelInterface } from "@/lib/api/tunnel";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";

const ENCAPSULATION_TYPES = [
  "erspan", "gre", "gretap", "ip6erspan", "ip6gre", "ip6gretap", "ip6ip6", "ipip", "ipip6", "sit",
] as const;

const IPV4_ENCAPS = ["gre", "gretap", "ipip", "erspan"];
const IPV6_ENCAPS = ["ip6gre", "ip6gretap", "ip6ip6", "ipip6", "ip6erspan"];
const ERSPAN_ENCAPS = ["erspan", "ip6erspan"];

const NONE = "__none__";

interface TunnelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: TunnelCapabilities | null;
  existingInterfaces: string[];
  existing?: TunnelInterface | null;
}

export function TunnelModal({
  open,
  onOpenChange,
  onSuccess,
  existingInterfaces,
  existing,
}: TunnelModalProps) {
  const t = useTranslations("tunnel");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);

  // Basic
  const [name, setName] = useState("tun0");
  const [encapsulationDraft, setEncapsulationDraft] = useState("");
  const [sourceAddress, setSourceAddress] = useState("");
  const [remote, setRemote] = useState("");
  const [description, setDescription] = useState("");
  const [addresses, setAddresses] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [sourceInterface, setSourceInterface] = useState("");

  // Advanced - Interface Options
  const [disabled, setDisabled] = useState(false);
  const [disableLinkDetect, setDisableLinkDetect] = useState(false);
  const [enableMulticast, setEnableMulticast] = useState(false);

  // Advanced - IP Settings
  const [ipAdjustMss, setIpAdjustMss] = useState("");
  const [ipArpCacheTimeout, setIpArpCacheTimeout] = useState("");
  const [ipSourceValidation, setIpSourceValidation] = useState("");
  const [ipDisableArpFilter, setIpDisableArpFilter] = useState(false);
  const [ipDisableForwarding, setIpDisableForwarding] = useState(false);
  const [ipEnableArpAccept, setIpEnableArpAccept] = useState(false);
  const [ipEnableArpAnnounce, setIpEnableArpAnnounce] = useState(false);
  const [ipEnableArpIgnore, setIpEnableArpIgnore] = useState(false);
  const [ipEnableDirectedBroadcast, setIpEnableDirectedBroadcast] = useState(false);
  const [ipEnableProxyArp, setIpEnableProxyArp] = useState(false);
  const [ipProxyArpPvlan, setIpProxyArpPvlan] = useState(false);

  // Advanced - IPv6 Settings
  const [ipv6AcceptDad, setIpv6AcceptDad] = useState("");
  const [ipv6AdjustMss, setIpv6AdjustMss] = useState("");
  const [ipv6BaseReachableTime, setIpv6BaseReachableTime] = useState("");
  const [ipv6DupAddrDetectTransmits, setIpv6DupAddrDetectTransmits] = useState("");
  const [ipv6SourceValidation, setIpv6SourceValidation] = useState("");
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);
  const [ipv6AddressAutoconf, setIpv6AddressAutoconf] = useState(false);
  const [ipv6AddressNoDefaultLinkLocal, setIpv6AddressNoDefaultLinkLocal] = useState(false);
  const [ipv6AddressEui64, setIpv6AddressEui64] = useState("");

  // Advanced - Mirror / Redirect
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");
  const [redirect, setRedirect] = useState("");

  // Parameters - ERSPAN
  const [erspanDirection, setErspanDirection] = useState("");
  const [erspanHwId, setErspanHwId] = useState("");
  const [erspanIndex, setErspanIndex] = useState("");
  const [erspanVersion, setErspanVersion] = useState("");

  // Parameters - IP
  const [paramIpIgnoreDf, setParamIpIgnoreDf] = useState(false);
  const [paramIpKey, setParamIpKey] = useState("");
  const [paramIpNoPmtuDiscovery, setParamIpNoPmtuDiscovery] = useState(false);
  const [paramIpTos, setParamIpTos] = useState("");
  const [paramIpTtl, setParamIpTtl] = useState("");

  // Parameters - IPv6
  const [paramIpv6Encaplimit, setParamIpv6Encaplimit] = useState("");
  const [paramIpv6Flowlabel, setParamIpv6Flowlabel] = useState("");
  const [paramIpv6Hoplimit, setParamIpv6Hoplimit] = useState("");
  const [paramIpv6Tclass, setParamIpv6Tclass] = useState("");

  // 6rd
  const [sixrdPrefix, setSixrdPrefix] = useState("");
  const [sixrdRelayPrefix, setSixrdRelayPrefix] = useState("");

  // Available interfaces for dropdowns
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getNextInterfaceName = (): string => {
    let i = 0;
    while (existingInterfaces.includes(`tun${i}`)) {
      i++;
    }
    return `tun${i}`;
  };

  const resetForm = () => {
    setName(getNextInterfaceName());
    setEncapsulationDraft("");
    setSourceAddress("");
    setRemote("");
    setDescription("");
    setAddresses("");
    setMtu("");
    setVrf("");
    setSourceInterface("");
    setDisabled(false);
    setDisableLinkDetect(false);
    setEnableMulticast(false);
    setIpAdjustMss("");
    setIpArpCacheTimeout("");
    setIpSourceValidation("");
    setIpDisableArpFilter(false);
    setIpDisableForwarding(false);
    setIpEnableArpAccept(false);
    setIpEnableArpAnnounce(false);
    setIpEnableArpIgnore(false);
    setIpEnableDirectedBroadcast(false);
    setIpEnableProxyArp(false);
    setIpProxyArpPvlan(false);
    setIpv6AcceptDad("");
    setIpv6AdjustMss("");
    setIpv6BaseReachableTime("");
    setIpv6DupAddrDetectTransmits("");
    setIpv6SourceValidation("");
    setIpv6DisableForwarding(false);
    setIpv6AddressAutoconf(false);
    setIpv6AddressNoDefaultLinkLocal(false);
    setIpv6AddressEui64("");
    setMirrorIngress("");
    setMirrorEgress("");
    setRedirect("");
    setErspanDirection("");
    setErspanHwId("");
    setErspanIndex("");
    setErspanVersion("");
    setParamIpIgnoreDf(false);
    setParamIpKey("");
    setParamIpNoPmtuDiscovery(false);
    setParamIpTos("");
    setParamIpTtl("");
    setParamIpv6Encaplimit("");
    setParamIpv6Flowlabel("");
    setParamIpv6Hoplimit("");
    setParamIpv6Tclass("");
    setSixrdPrefix("");
    setSixrdRelayPrefix("");
    setError(null);
  };

  const populateForm = (interfaceData: TunnelInterface) => {
    setName(interfaceData.name);
    setEncapsulationDraft(interfaceData.encapsulation || "");
    setSourceAddress(interfaceData.source_address || "");
    setRemote(interfaceData.remote || "");
    setDescription(interfaceData.description || "");
    setAddresses(interfaceData.addresses.join(", "));
    setMtu(interfaceData.mtu || "");
    setVrf(interfaceData.vrf || "");
    setSourceInterface(interfaceData.source_interface || "");
    setDisabled(interfaceData.disabled);
    setDisableLinkDetect(interfaceData.disable_link_detect);
    setEnableMulticast(interfaceData.enable_multicast);

    // IP
    setIpAdjustMss(interfaceData.ip.adjust_mss || "");
    setIpArpCacheTimeout(interfaceData.ip.arp_cache_timeout || "");
    setIpSourceValidation(interfaceData.ip.source_validation || "");
    setIpDisableArpFilter(interfaceData.ip.disable_arp_filter);
    setIpDisableForwarding(interfaceData.ip.disable_forwarding);
    setIpEnableArpAccept(interfaceData.ip.enable_arp_accept);
    setIpEnableArpAnnounce(interfaceData.ip.enable_arp_announce);
    setIpEnableArpIgnore(interfaceData.ip.enable_arp_ignore);
    setIpEnableDirectedBroadcast(interfaceData.ip.enable_directed_broadcast);
    setIpEnableProxyArp(interfaceData.ip.enable_proxy_arp);
    setIpProxyArpPvlan(interfaceData.ip.proxy_arp_pvlan);

    // IPv6
    setIpv6AcceptDad(interfaceData.ipv6.accept_dad || "");
    setIpv6AdjustMss(interfaceData.ipv6.adjust_mss || "");
    setIpv6BaseReachableTime(interfaceData.ipv6.base_reachable_time || "");
    setIpv6DupAddrDetectTransmits(interfaceData.ipv6.dup_addr_detect_transmits || "");
    setIpv6SourceValidation(interfaceData.ipv6.source_validation || "");
    setIpv6DisableForwarding(interfaceData.ipv6.disable_forwarding);
    setIpv6AddressAutoconf(interfaceData.ipv6.address.autoconf);
    setIpv6AddressNoDefaultLinkLocal(interfaceData.ipv6.address.no_default_link_local);
    setIpv6AddressEui64(interfaceData.ipv6.address.eui64.join(", "));

    // Mirror / Redirect
    setMirrorIngress(interfaceData.mirror.ingress || "");
    setMirrorEgress(interfaceData.mirror.egress || "");
    setRedirect(interfaceData.redirect || "");

    // ERSPAN params
    setErspanDirection(interfaceData.parameters.erspan.direction || "");
    setErspanHwId(interfaceData.parameters.erspan.hw_id || "");
    setErspanIndex(interfaceData.parameters.erspan.index || "");
    setErspanVersion(interfaceData.parameters.erspan.version || "");

    // IP params
    setParamIpIgnoreDf(interfaceData.parameters.ip.ignore_df);
    setParamIpKey(interfaceData.parameters.ip.key || "");
    setParamIpNoPmtuDiscovery(interfaceData.parameters.ip.no_pmtu_discovery);
    setParamIpTos(interfaceData.parameters.ip.tos || "");
    setParamIpTtl(interfaceData.parameters.ip.ttl || "");

    // IPv6 params
    setParamIpv6Encaplimit(interfaceData.parameters.ipv6.encaplimit || "");
    setParamIpv6Flowlabel(interfaceData.parameters.ipv6.flowlabel || "");
    setParamIpv6Hoplimit(interfaceData.parameters.ipv6.hoplimit || "");
    setParamIpv6Tclass(interfaceData.parameters.ipv6.tclass || "");

    // 6rd
    setSixrdPrefix(interfaceData.sixrd_prefix || "");
    setSixrdRelayPrefix(interfaceData.sixrd_relay_prefix || "");

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
  const lockedEncapsulation = lockedIdentity(existing, (i) => i.encapsulation, encapsulationDraft);
  const encapsulation = lockedEncapsulation.value;

  const showIpParams = IPV4_ENCAPS.includes(encapsulation) || encapsulation === "sit";
  const showIpv6Params = IPV6_ENCAPS.includes(encapsulation) || encapsulation === "sit";
  const showErspanParams = ERSPAN_ENCAPS.includes(encapsulation);
  const showSixrd = encapsulation === "sit";

  const validateCreate = (): string | null => {
    if (!name.trim()) return t("validation.nameRequired");
    if (!/^tun\d+$/.test(name.trim())) return t("validation.nameFormat");
    if (existingInterfaces.includes(name.trim())) return t("validation.nameExists", { name });
    if (!encapsulation) return t("validation.encapsulationRequired");
    return null;
  };

  const submitUpdate = async (current: TunnelInterface, targetName: string) => {
    const updated: Parameters<typeof tunnelService.updateInterface>[2] = {};

    // String fields
    const desc = description.trim() || null;
    if (desc !== (current.description || null)) updated.description = desc;

    const src = sourceAddress.trim() || null;
    if (src !== (current.source_address || null)) updated.source_address = src;

    const srcIf = sourceInterface.trim() || null;
    if (srcIf !== (current.source_interface || null)) updated.source_interface = srcIf;

    const rem = remote.trim() || null;
    if (rem !== (current.remote || null)) updated.remote = rem;

    const m = mtu.trim() || null;
    if (m !== (current.mtu || null)) updated.mtu = m;

    const v = vrf.trim() || null;
    if (v !== (current.vrf || null)) updated.vrf = v;

    const red = redirect.trim() || null;
    if (red !== (current.redirect || null)) updated.redirect = red;

    const sp = sixrdPrefix.trim() || null;
    if (sp !== (current.sixrd_prefix || null)) updated.sixrd_prefix = sp;

    const srp = sixrdRelayPrefix.trim() || null;
    if (srp !== (current.sixrd_relay_prefix || null)) updated.sixrd_relay_prefix = srp;

    // Booleans
    if (disabled !== current.disabled) updated.disabled = disabled;
    if (disableLinkDetect !== current.disable_link_detect) updated.disable_link_detect = disableLinkDetect;
    if (enableMulticast !== current.enable_multicast) updated.enable_multicast = enableMulticast;

    // Addresses array
    const newAddresses = addresses.split(",").map((a) => a.trim()).filter(Boolean);
    if (JSON.stringify(newAddresses) !== JSON.stringify(current.addresses)) {
      updated.addresses = newAddresses;
    }

    // Parameters
    const params: NonNullable<typeof updated.parameters> = {};
    let hasParamChanges = false;

    const ed = erspanDirection.trim() || null;
    if (ed !== (current.parameters.erspan.direction || null)) { params.erspan_direction = ed; hasParamChanges = true; }
    const eh = erspanHwId.trim() || null;
    if (eh !== (current.parameters.erspan.hw_id || null)) { params.erspan_hw_id = eh; hasParamChanges = true; }
    const ei = erspanIndex.trim() || null;
    if (ei !== (current.parameters.erspan.index || null)) { params.erspan_index = ei; hasParamChanges = true; }
    const ev = erspanVersion.trim() || null;
    if (ev !== (current.parameters.erspan.version || null)) { params.erspan_version = ev; hasParamChanges = true; }

    if (paramIpIgnoreDf !== current.parameters.ip.ignore_df) { params.ip_ignore_df = paramIpIgnoreDf; hasParamChanges = true; }
    if (paramIpNoPmtuDiscovery !== current.parameters.ip.no_pmtu_discovery) { params.ip_no_pmtu_discovery = paramIpNoPmtuDiscovery; hasParamChanges = true; }

    const pk = paramIpKey.trim() || null;
    if (pk !== (current.parameters.ip.key || null)) { params.ip_key = pk; hasParamChanges = true; }
    const pt = paramIpTos.trim() || null;
    if (pt !== (current.parameters.ip.tos || null)) { params.ip_tos = pt; hasParamChanges = true; }
    const pttl = paramIpTtl.trim() || null;
    if (pttl !== (current.parameters.ip.ttl || null)) { params.ip_ttl = pttl; hasParamChanges = true; }

    const pe = paramIpv6Encaplimit.trim() || null;
    if (pe !== (current.parameters.ipv6.encaplimit || null)) { params.ipv6_encaplimit = pe; hasParamChanges = true; }
    const pf = paramIpv6Flowlabel.trim() || null;
    if (pf !== (current.parameters.ipv6.flowlabel || null)) { params.ipv6_flowlabel = pf; hasParamChanges = true; }
    const ph = paramIpv6Hoplimit.trim() || null;
    if (ph !== (current.parameters.ipv6.hoplimit || null)) { params.ipv6_hoplimit = ph; hasParamChanges = true; }
    const ptc = paramIpv6Tclass.trim() || null;
    if (ptc !== (current.parameters.ipv6.tclass || null)) { params.ipv6_tclass = ptc; hasParamChanges = true; }

    if (hasParamChanges) updated.parameters = params;

    // Mirror
    const mi = mirrorIngress.trim() || null;
    const me = mirrorEgress.trim() || null;
    if (mi !== (current.mirror.ingress || null) || me !== (current.mirror.egress || null)) {
      updated.mirror = {};
      if (mi !== (current.mirror.ingress || null)) updated.mirror.ingress = mi;
      if (me !== (current.mirror.egress || null)) updated.mirror.egress = me;
    }

    // IP settings
    const ipUpdated: NonNullable<typeof updated.ip> = {};
    let hasIpChanges = false;

    const iam = ipAdjustMss.trim() || null;
    if (iam !== (current.ip.adjust_mss || null)) { ipUpdated.adjust_mss = iam; hasIpChanges = true; }
    const iac = ipArpCacheTimeout.trim() || null;
    if (iac !== (current.ip.arp_cache_timeout || null)) { ipUpdated.arp_cache_timeout = iac; hasIpChanges = true; }
    const isv = ipSourceValidation.trim() || null;
    if (isv !== (current.ip.source_validation || null)) { ipUpdated.source_validation = isv; hasIpChanges = true; }

    if (ipDisableArpFilter !== current.ip.disable_arp_filter) { ipUpdated.disable_arp_filter = ipDisableArpFilter; hasIpChanges = true; }
    if (ipDisableForwarding !== current.ip.disable_forwarding) { ipUpdated.disable_forwarding = ipDisableForwarding; hasIpChanges = true; }
    if (ipEnableArpAccept !== current.ip.enable_arp_accept) { ipUpdated.enable_arp_accept = ipEnableArpAccept; hasIpChanges = true; }
    if (ipEnableArpAnnounce !== current.ip.enable_arp_announce) { ipUpdated.enable_arp_announce = ipEnableArpAnnounce; hasIpChanges = true; }
    if (ipEnableArpIgnore !== current.ip.enable_arp_ignore) { ipUpdated.enable_arp_ignore = ipEnableArpIgnore; hasIpChanges = true; }
    if (ipEnableDirectedBroadcast !== current.ip.enable_directed_broadcast) { ipUpdated.enable_directed_broadcast = ipEnableDirectedBroadcast; hasIpChanges = true; }
    if (ipEnableProxyArp !== current.ip.enable_proxy_arp) { ipUpdated.enable_proxy_arp = ipEnableProxyArp; hasIpChanges = true; }
    if (ipProxyArpPvlan !== current.ip.proxy_arp_pvlan) { ipUpdated.proxy_arp_pvlan = ipProxyArpPvlan; hasIpChanges = true; }

    if (hasIpChanges) updated.ip = ipUpdated;

    // IPv6 settings
    const ipv6Updated: NonNullable<typeof updated.ipv6> = {};
    let hasIpv6Changes = false;

    const i6ad = ipv6AcceptDad.trim() || null;
    if (i6ad !== (current.ipv6.accept_dad || null)) { ipv6Updated.accept_dad = i6ad; hasIpv6Changes = true; }
    const i6am = ipv6AdjustMss.trim() || null;
    if (i6am !== (current.ipv6.adjust_mss || null)) { ipv6Updated.adjust_mss = i6am; hasIpv6Changes = true; }
    const i6br = ipv6BaseReachableTime.trim() || null;
    if (i6br !== (current.ipv6.base_reachable_time || null)) { ipv6Updated.base_reachable_time = i6br; hasIpv6Changes = true; }
    const i6dt = ipv6DupAddrDetectTransmits.trim() || null;
    if (i6dt !== (current.ipv6.dup_addr_detect_transmits || null)) { ipv6Updated.dup_addr_detect_transmits = i6dt; hasIpv6Changes = true; }
    const i6sv = ipv6SourceValidation.trim() || null;
    if (i6sv !== (current.ipv6.source_validation || null)) { ipv6Updated.source_validation = i6sv; hasIpv6Changes = true; }

    if (ipv6DisableForwarding !== current.ipv6.disable_forwarding) { ipv6Updated.disable_forwarding = ipv6DisableForwarding; hasIpv6Changes = true; }
    if (ipv6AddressAutoconf !== current.ipv6.address.autoconf) { ipv6Updated.address_autoconf = ipv6AddressAutoconf; hasIpv6Changes = true; }
    if (ipv6AddressNoDefaultLinkLocal !== current.ipv6.address.no_default_link_local) { ipv6Updated.address_no_default_link_local = ipv6AddressNoDefaultLinkLocal; hasIpv6Changes = true; }

    const newEui64 = ipv6AddressEui64.split(",").map((a) => a.trim()).filter(Boolean);
    if (JSON.stringify(newEui64) !== JSON.stringify(current.ipv6.address.eui64)) {
      ipv6Updated.address_eui64 = newEui64;
      hasIpv6Changes = true;
    }

    if (hasIpv6Changes) updated.ipv6 = ipv6Updated;

    return tunnelService.updateInterface(targetName, current, updated);
  };

  const submitCreate = async () => {
    const config: Parameters<typeof tunnelService.createInterface>[0] = {
      name: name.trim(),
      encapsulation,
    };

    if (description.trim()) config.description = description.trim();
    if (sourceAddress.trim()) config.source_address = sourceAddress.trim();
    if (sourceInterface.trim()) config.source_interface = sourceInterface.trim();
    if (remote.trim()) config.remote = remote.trim();
    if (mtu.trim()) config.mtu = mtu.trim();
    if (vrf.trim()) config.vrf = vrf.trim();
    if (redirect.trim()) config.redirect = redirect.trim();
    if (disabled) config.disabled = true;
    if (disableLinkDetect) config.disable_link_detect = true;
    if (enableMulticast) config.enable_multicast = true;
    if (sixrdPrefix.trim()) config.sixrd_prefix = sixrdPrefix.trim();
    if (sixrdRelayPrefix.trim()) config.sixrd_relay_prefix = sixrdRelayPrefix.trim();

    if (addresses.trim()) {
      config.addresses = addresses.split(",").map((a) => a.trim()).filter(Boolean);
    }

    // Parameters
    const params: NonNullable<typeof config.parameters> = {};
    if (erspanDirection.trim()) params.erspan_direction = erspanDirection.trim();
    if (erspanHwId.trim()) params.erspan_hw_id = erspanHwId.trim();
    if (erspanIndex.trim()) params.erspan_index = erspanIndex.trim();
    if (erspanVersion.trim()) params.erspan_version = erspanVersion.trim();
    if (paramIpIgnoreDf) params.ip_ignore_df = true;
    if (paramIpKey.trim()) params.ip_key = paramIpKey.trim();
    if (paramIpNoPmtuDiscovery) params.ip_no_pmtu_discovery = true;
    if (paramIpTos.trim()) params.ip_tos = paramIpTos.trim();
    if (paramIpTtl.trim()) params.ip_ttl = paramIpTtl.trim();
    if (paramIpv6Encaplimit.trim()) params.ipv6_encaplimit = paramIpv6Encaplimit.trim();
    if (paramIpv6Flowlabel.trim()) params.ipv6_flowlabel = paramIpv6Flowlabel.trim();
    if (paramIpv6Hoplimit.trim()) params.ipv6_hoplimit = paramIpv6Hoplimit.trim();
    if (paramIpv6Tclass.trim()) params.ipv6_tclass = paramIpv6Tclass.trim();
    if (Object.keys(params).length > 0) config.parameters = params;

    // Mirror
    const mirror: NonNullable<typeof config.mirror> = {};
    if (mirrorIngress.trim()) mirror.ingress = mirrorIngress.trim();
    if (mirrorEgress.trim()) mirror.egress = mirrorEgress.trim();
    if (Object.keys(mirror).length > 0) config.mirror = mirror;

    // IP settings
    const ip: NonNullable<typeof config.ip> = {};
    if (ipAdjustMss.trim()) ip.adjust_mss = ipAdjustMss.trim();
    if (ipArpCacheTimeout.trim()) ip.arp_cache_timeout = ipArpCacheTimeout.trim();
    if (ipSourceValidation.trim()) ip.source_validation = ipSourceValidation.trim();
    if (ipDisableArpFilter) ip.disable_arp_filter = true;
    if (ipDisableForwarding) ip.disable_forwarding = true;
    if (ipEnableArpAccept) ip.enable_arp_accept = true;
    if (ipEnableArpAnnounce) ip.enable_arp_announce = true;
    if (ipEnableArpIgnore) ip.enable_arp_ignore = true;
    if (ipEnableDirectedBroadcast) ip.enable_directed_broadcast = true;
    if (ipEnableProxyArp) ip.enable_proxy_arp = true;
    if (ipProxyArpPvlan) ip.proxy_arp_pvlan = true;
    if (Object.keys(ip).length > 0) config.ip = ip;

    // IPv6 settings
    const ipv6: NonNullable<typeof config.ipv6> = {};
    if (ipv6AcceptDad.trim()) ipv6.accept_dad = ipv6AcceptDad.trim();
    if (ipv6AdjustMss.trim()) ipv6.adjust_mss = ipv6AdjustMss.trim();
    if (ipv6BaseReachableTime.trim()) ipv6.base_reachable_time = ipv6BaseReachableTime.trim();
    if (ipv6DupAddrDetectTransmits.trim()) ipv6.dup_addr_detect_transmits = ipv6DupAddrDetectTransmits.trim();
    if (ipv6SourceValidation.trim()) ipv6.source_validation = ipv6SourceValidation.trim();
    if (ipv6DisableForwarding) ipv6.disable_forwarding = true;
    if (ipv6AddressAutoconf) ipv6.address_autoconf = true;
    if (ipv6AddressNoDefaultLinkLocal) ipv6.address_no_default_link_local = true;
    if (ipv6AddressEui64.trim()) {
      ipv6.address_eui64 = ipv6AddressEui64.split(",").map((a) => a.trim()).filter(Boolean);
    }
    if (Object.keys(ipv6).length > 0) config.ipv6 = ipv6;

    return tunnelService.createInterface(config);
  };

  const handleSubmit = async () => {
    const write = modalWriteKind(existing);

    if (write.kind === "create") {
      const validationError = validateCreate();
      if (validationError) {
        setError(validationError);
        return;
      }
    } else if (!existing) {
      return;
    }

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
        setError(result.error || (isEdit ? t("modal.updateFailed") : t("modal.createFailed")));
      }
    } catch (err) {
      setError(
        (err as ApiError).message ||
          (isEdit ? t("modal.updateFailed") : t("modal.createFailed")),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Waypoints className="h-5 w-5" />
            {isEdit ? t("modal.editTitle", { name: existing.name }) : t("modal.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("modal.editDescription")
              : t("modal.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">{t("tabs.basic")}</TabsTrigger>
            <TabsTrigger value="advanced">{t("tabs.advanced")}</TabsTrigger>
            <TabsTrigger value="parameters">{t("tabs.parameters")}</TabsTrigger>
            <TabsTrigger value="6rd" disabled={!showSixrd}>6rd</TabsTrigger>
          </TabsList>

          {/* Tab 1 - Basic */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tunnel-name">{tc("name")}</Label>
                <Input
                  id="tunnel-name"
                  value={lockedName.value}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="tun0"
                  disabled={lockedName.disabled}
                  className={lockedName.disabled ? "bg-muted" : undefined}
                />
                <p className="text-xs text-muted-foreground">
                  {lockedName.disabled ? t("basic.nameLocked") : t("basic.nameHint")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tunnel-encapsulation">
                  {t("basic.encapsulation")} {lockedEncapsulation.disabled ? null : "*"}
                </Label>
                {lockedEncapsulation.disabled ? (
                  <>
                    <Input id="tunnel-encapsulation" value={lockedEncapsulation.value} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">{t("basic.encapsulationLocked")}</p>
                  </>
                ) : (
                  <Select value={encapsulationDraft} onValueChange={setEncapsulationDraft}>
                    <SelectTrigger id="tunnel-encapsulation">
                      <SelectValue placeholder={t("basic.selectEncapsulation")} />
                    </SelectTrigger>
                    <SelectContent>
                      {ENCAPSULATION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tunnel-source-address">{t("basic.sourceAddress")}</Label>
                <Input id="tunnel-source-address" value={sourceAddress} onChange={(e) => setSourceAddress(e.target.value)} placeholder={t("basic.sourceAddressPlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tunnel-remote">{t("basic.remoteAddress")}</Label>
                <Input id="tunnel-remote" value={remote} onChange={(e) => setRemote(e.target.value)} placeholder={t("basic.remoteAddressPlaceholder")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tunnel-description">{tc("description")}</Label>
              <Input id="tunnel-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("basic.descriptionPlaceholder")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tunnel-addresses">{t("basic.addresses")}</Label>
              <Input id="tunnel-addresses" value={addresses} onChange={(e) => setAddresses(e.target.value)} placeholder={t("basic.addressesPlaceholder")} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tunnel-mtu">MTU</Label>
                <Input id="tunnel-mtu" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="68-16000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tunnel-vrf">VRF</Label>
                <VrfSelect id="tunnel-vrf" value={vrf} onValueChange={setVrf} />
              </div>
              <div className="space-y-2">
                <Label>{t("basic.sourceInterface")}</Label>
                <InterfaceSelect
                  value={sourceInterface || NONE}
                  onValueChange={(v) => setSourceInterface(v === NONE ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: tc("none"), value: NONE }}
                  placeholder={tc("none")}
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 2 - Advanced */}
          <TabsContent value="advanced" className="space-y-6 mt-4">
            {/* Interface Options */}
            <div>
              <h4 className="text-sm font-medium mb-3">{t("advanced.interfaceOptions")}</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} />
                  <Label>{tc("disabled")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={disableLinkDetect} onCheckedChange={(c) => setDisableLinkDetect(c === true)} />
                  <Label>{t("advanced.disableLinkDetect")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={enableMulticast} onCheckedChange={(c) => setEnableMulticast(c === true)} />
                  <Label>{t("advanced.enableMulticast")}</Label>
                </div>
              </div>
            </div>

            {/* IP Settings */}
            <div>
              <h4 className="text-sm font-medium mb-3">{t("advanced.ipSettings")}</h4>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="space-y-2">
                  <Label>{t("advanced.adjustMss")}</Label>
                  <Input value={ipAdjustMss} onChange={(e) => setIpAdjustMss(e.target.value)} placeholder={t("advanced.adjustMssPlaceholder")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("advanced.arpCacheTimeout")}</Label>
                  <Input value={ipArpCacheTimeout} onChange={(e) => setIpArpCacheTimeout(e.target.value)} placeholder={t("advanced.seconds")} />
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <Label>{t("advanced.sourceValidation")}</Label>
                <Select value={ipSourceValidation || NONE} onValueChange={(v) => setIpSourceValidation(v === NONE ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={tc("none")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{tc("none")}</SelectItem>
                    <SelectItem value="strict">{tc("shown.strict")}</SelectItem>
                    <SelectItem value="loose">{tc("shown.loose")}</SelectItem>
                    <SelectItem value="disable">{tc("shown.disable")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t("advanced.disableArpFilter"), value: ipDisableArpFilter, setter: setIpDisableArpFilter },
                  { label: t("advanced.disableForwarding"), value: ipDisableForwarding, setter: setIpDisableForwarding },
                  { label: t("advanced.enableArpAccept"), value: ipEnableArpAccept, setter: setIpEnableArpAccept },
                  { label: t("advanced.enableArpAnnounce"), value: ipEnableArpAnnounce, setter: setIpEnableArpAnnounce },
                  { label: t("advanced.enableArpIgnore"), value: ipEnableArpIgnore, setter: setIpEnableArpIgnore },
                  { label: t("advanced.enableDirectedBroadcast"), value: ipEnableDirectedBroadcast, setter: setIpEnableDirectedBroadcast },
                  { label: t("advanced.enableProxyArp"), value: ipEnableProxyArp, setter: setIpEnableProxyArp },
                  { label: t("advanced.proxyArpPvlan"), value: ipProxyArpPvlan, setter: setIpProxyArpPvlan },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <Checkbox checked={item.value} onCheckedChange={(c) => item.setter(c === true)} />
                    <Label className="text-sm">{item.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* IPv6 Settings */}
            <div>
              <h4 className="text-sm font-medium mb-3">{t("advanced.ipv6Settings")}</h4>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="space-y-2">
                  <Label>{t("advanced.acceptDad")}</Label>
                  <Input value={ipv6AcceptDad} onChange={(e) => setIpv6AcceptDad(e.target.value)} placeholder={t("advanced.acceptDadPlaceholder")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("advanced.adjustMss")}</Label>
                  <Input value={ipv6AdjustMss} onChange={(e) => setIpv6AdjustMss(e.target.value)} placeholder={t("advanced.adjustMssPlaceholder")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("advanced.baseReachableTime")}</Label>
                  <Input value={ipv6BaseReachableTime} onChange={(e) => setIpv6BaseReachableTime(e.target.value)} placeholder={t("advanced.seconds")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("advanced.dadTransmits")}</Label>
                  <Input value={ipv6DupAddrDetectTransmits} onChange={(e) => setIpv6DupAddrDetectTransmits(e.target.value)} placeholder={t("advanced.dadTransmitsPlaceholder")} />
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <Label>{t("advanced.sourceValidation")}</Label>
                <Select value={ipv6SourceValidation || NONE} onValueChange={(v) => setIpv6SourceValidation(v === NONE ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={tc("none")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{tc("none")}</SelectItem>
                    <SelectItem value="strict">{tc("shown.strict")}</SelectItem>
                    <SelectItem value="loose">{tc("shown.loose")}</SelectItem>
                    <SelectItem value="disable">{tc("shown.disable")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={ipv6DisableForwarding} onCheckedChange={(c) => setIpv6DisableForwarding(c === true)} />
                  <Label>{t("advanced.disableForwarding")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={ipv6AddressAutoconf} onCheckedChange={(c) => setIpv6AddressAutoconf(c === true)} />
                  <Label>{t("advanced.autoconf")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={ipv6AddressNoDefaultLinkLocal} onCheckedChange={(c) => setIpv6AddressNoDefaultLinkLocal(c === true)} />
                  <Label>{t("advanced.noDefaultLinkLocal")}</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("advanced.eui64Prefixes")}</Label>
                <Input value={ipv6AddressEui64} onChange={(e) => setIpv6AddressEui64(e.target.value)} placeholder={t("advanced.eui64Placeholder")} />
              </div>
            </div>

            {/* Mirror / Redirect */}
            <div>
              <h4 className="text-sm font-medium mb-3">{t("advanced.mirrorRedirect")}</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("advanced.mirrorIngress")}</Label>
                  <InterfaceSelect
                    value={mirrorIngress || NONE}
                    onValueChange={(v) => setMirrorIngress(v === NONE ? "" : v)}
                    interfaces={availableInterfaces}
                    noneOption={{ label: tc("none"), value: NONE }}
                    placeholder={tc("none")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("advanced.mirrorEgress")}</Label>
                  <InterfaceSelect
                    value={mirrorEgress || NONE}
                    onValueChange={(v) => setMirrorEgress(v === NONE ? "" : v)}
                    interfaces={availableInterfaces}
                    noneOption={{ label: tc("none"), value: NONE }}
                    placeholder={tc("none")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("advanced.redirect")}</Label>
                  <InterfaceSelect
                    value={redirect || NONE}
                    onValueChange={(v) => setRedirect(v === NONE ? "" : v)}
                    interfaces={availableInterfaces}
                    noneOption={{ label: tc("none"), value: NONE }}
                    placeholder={tc("none")}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3 - Parameters */}
          <TabsContent value="parameters" className="space-y-6 mt-4">
            {!encapsulation ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>
                  {isEdit
                    ? t("params.noEncapsulation")
                    : t("params.selectEncapsulationHint")}
                </p>
              </div>
            ) : (
              <>
                {/* ERSPAN Parameters */}
                {showErspanParams && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">{t("params.erspanParameters")}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("params.direction")}</Label>
                        <Select value={erspanDirection || NONE} onValueChange={(v) => setErspanDirection(v === NONE ? "" : v)}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("params.selectDirection")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>{tc("none")}</SelectItem>
                            <SelectItem value="ingress">{tc("shown.ingress")}</SelectItem>
                            <SelectItem value="egress">{tc("shown.egress")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("params.hardwareId")}</Label>
                        <Input value={erspanHwId} onChange={(e) => setErspanHwId(e.target.value)} placeholder={t("params.hardwareIdPlaceholder")} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("params.index")}</Label>
                        <Input value={erspanIndex} onChange={(e) => setErspanIndex(e.target.value)} placeholder={t("params.indexPlaceholder")} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("params.version")}</Label>
                        <Select value={erspanVersion || NONE} onValueChange={(v) => setErspanVersion(v === NONE ? "" : v)}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("params.selectVersion")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>{tc("none")}</SelectItem>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* IP Parameters */}
                {showIpParams && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">{t("params.ipParameters")}</h4>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="space-y-2">
                        <Label>{t("params.key")}</Label>
                        <Input value={paramIpKey} onChange={(e) => setParamIpKey(e.target.value)} placeholder={t("params.keyPlaceholder")} />
                      </div>
                      <div className="space-y-2">
                        <Label>TOS</Label>
                        <Input value={paramIpTos} onChange={(e) => setParamIpTos(e.target.value)} placeholder={t("params.tosPlaceholder")} />
                      </div>
                      <div className="space-y-2">
                        <Label>TTL</Label>
                        <Input value={paramIpTtl} onChange={(e) => setParamIpTtl(e.target.value)} placeholder={t("params.ttlPlaceholder")} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={paramIpIgnoreDf} onCheckedChange={(c) => setParamIpIgnoreDf(c === true)} />
                        <Label>{t("params.ignoreDf")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={paramIpNoPmtuDiscovery} onCheckedChange={(c) => setParamIpNoPmtuDiscovery(c === true)} />
                        <Label>{t("params.noPmtuDiscovery")}</Label>
                      </div>
                    </div>
                  </div>
                )}

                {/* IPv6 Parameters */}
                {showIpv6Params && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">{t("params.ipv6Parameters")}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("params.encapLimit")}</Label>
                        <Input value={paramIpv6Encaplimit} onChange={(e) => setParamIpv6Encaplimit(e.target.value)} placeholder={t("params.encapLimitPlaceholder")} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("params.flowLabel")}</Label>
                        <Input value={paramIpv6Flowlabel} onChange={(e) => setParamIpv6Flowlabel(e.target.value)} placeholder={t("params.flowLabelPlaceholder")} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("params.hopLimit")}</Label>
                        <Input value={paramIpv6Hoplimit} onChange={(e) => setParamIpv6Hoplimit(e.target.value)} placeholder={t("params.hopLimitPlaceholder")} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("params.trafficClass")}</Label>
                        <Input value={paramIpv6Tclass} onChange={(e) => setParamIpv6Tclass(e.target.value)} placeholder={t("params.trafficClassPlaceholder")} />
                      </div>
                    </div>
                  </div>
                )}

                {!showErspanParams && !showIpParams && !showIpv6Params && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t("params.noneAvailable", { encapsulation })}</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Tab 4 - 6rd */}
          <TabsContent value="6rd" className="space-y-4 mt-4">
            <div className="rounded-lg bg-muted/50 border p-3 mb-4">
              <p className="text-sm text-muted-foreground">
                {t("sixrd.info")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("sixrd.prefix")}</Label>
                <Input value={sixrdPrefix} onChange={(e) => setSixrdPrefix(e.target.value)} placeholder={t("sixrd.prefixPlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label>{t("sixrd.relayPrefix")}</Label>
                <Input value={sixrdRelayPrefix} onChange={(e) => setSixrdRelayPrefix(e.target.value)} placeholder={t("sixrd.relayPrefixPlaceholder")} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
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
