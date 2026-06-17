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

const IPV4_ENCAPS = ["gre", "gretap", "ipip", "erspan"];
const IPV6_ENCAPS = ["ip6gre", "ip6gretap", "ip6ip6", "ipip6", "ip6erspan"];
const ERSPAN_ENCAPS = ["erspan", "ip6erspan"];

interface EditTunnelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: TunnelCapabilities | null;
  interfaceData: TunnelInterface | null;
}

export function EditTunnelModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
}: EditTunnelModalProps) {
  // Basic
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

  useEffect(() => {
    if (open) {
      showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch(() => {});
    }
  }, [open]);

  // Pre-populate form from interfaceData
  useEffect(() => {
    if (interfaceData && open) {
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
    }
  }, [interfaceData, open]);

  const encapsulation = interfaceData?.encapsulation || "";
  const showIpParams = IPV4_ENCAPS.includes(encapsulation) || encapsulation === "sit";
  const showIpv6Params = IPV6_ENCAPS.includes(encapsulation) || encapsulation === "sit";
  const showErspanParams = ERSPAN_ENCAPS.includes(encapsulation);
  const showSixrd = encapsulation === "sit";

  const handleSubmit = async () => {
    if (!interfaceData) return;

    setLoading(true);
    setError(null);

    try {
      const updated: Parameters<typeof tunnelService.updateInterface>[2] = {};

      // String fields
      const desc = description.trim() || null;
      if (desc !== (interfaceData.description || null)) updated.description = desc;

      const src = sourceAddress.trim() || null;
      if (src !== (interfaceData.source_address || null)) updated.source_address = src;

      const srcIf = sourceInterface.trim() || null;
      if (srcIf !== (interfaceData.source_interface || null)) updated.source_interface = srcIf;

      const rem = remote.trim() || null;
      if (rem !== (interfaceData.remote || null)) updated.remote = rem;

      const m = mtu.trim() || null;
      if (m !== (interfaceData.mtu || null)) updated.mtu = m;

      const v = vrf.trim() || null;
      if (v !== (interfaceData.vrf || null)) updated.vrf = v;

      const red = redirect.trim() || null;
      if (red !== (interfaceData.redirect || null)) updated.redirect = red;

      const sp = sixrdPrefix.trim() || null;
      if (sp !== (interfaceData.sixrd_prefix || null)) updated.sixrd_prefix = sp;

      const srp = sixrdRelayPrefix.trim() || null;
      if (srp !== (interfaceData.sixrd_relay_prefix || null)) updated.sixrd_relay_prefix = srp;

      // Booleans
      if (disabled !== interfaceData.disabled) updated.disabled = disabled;
      if (disableLinkDetect !== interfaceData.disable_link_detect) updated.disable_link_detect = disableLinkDetect;
      if (enableMulticast !== interfaceData.enable_multicast) updated.enable_multicast = enableMulticast;

      // Addresses array
      const newAddresses = addresses.split(",").map((a) => a.trim()).filter(Boolean);
      if (JSON.stringify(newAddresses) !== JSON.stringify(interfaceData.addresses)) {
        updated.addresses = newAddresses;
      }

      // Parameters
      const params: NonNullable<typeof updated.parameters> = {};
      let hasParamChanges = false;

      const ed = erspanDirection.trim() || null;
      if (ed !== (interfaceData.parameters.erspan.direction || null)) { params.erspan_direction = ed; hasParamChanges = true; }
      const eh = erspanHwId.trim() || null;
      if (eh !== (interfaceData.parameters.erspan.hw_id || null)) { params.erspan_hw_id = eh; hasParamChanges = true; }
      const ei = erspanIndex.trim() || null;
      if (ei !== (interfaceData.parameters.erspan.index || null)) { params.erspan_index = ei; hasParamChanges = true; }
      const ev = erspanVersion.trim() || null;
      if (ev !== (interfaceData.parameters.erspan.version || null)) { params.erspan_version = ev; hasParamChanges = true; }

      if (paramIpIgnoreDf !== interfaceData.parameters.ip.ignore_df) { params.ip_ignore_df = paramIpIgnoreDf; hasParamChanges = true; }
      if (paramIpNoPmtuDiscovery !== interfaceData.parameters.ip.no_pmtu_discovery) { params.ip_no_pmtu_discovery = paramIpNoPmtuDiscovery; hasParamChanges = true; }

      const pk = paramIpKey.trim() || null;
      if (pk !== (interfaceData.parameters.ip.key || null)) { params.ip_key = pk; hasParamChanges = true; }
      const pt = paramIpTos.trim() || null;
      if (pt !== (interfaceData.parameters.ip.tos || null)) { params.ip_tos = pt; hasParamChanges = true; }
      const pttl = paramIpTtl.trim() || null;
      if (pttl !== (interfaceData.parameters.ip.ttl || null)) { params.ip_ttl = pttl; hasParamChanges = true; }

      const pe = paramIpv6Encaplimit.trim() || null;
      if (pe !== (interfaceData.parameters.ipv6.encaplimit || null)) { params.ipv6_encaplimit = pe; hasParamChanges = true; }
      const pf = paramIpv6Flowlabel.trim() || null;
      if (pf !== (interfaceData.parameters.ipv6.flowlabel || null)) { params.ipv6_flowlabel = pf; hasParamChanges = true; }
      const ph = paramIpv6Hoplimit.trim() || null;
      if (ph !== (interfaceData.parameters.ipv6.hoplimit || null)) { params.ipv6_hoplimit = ph; hasParamChanges = true; }
      const ptc = paramIpv6Tclass.trim() || null;
      if (ptc !== (interfaceData.parameters.ipv6.tclass || null)) { params.ipv6_tclass = ptc; hasParamChanges = true; }

      if (hasParamChanges) updated.parameters = params;

      // Mirror
      const mi = mirrorIngress.trim() || null;
      const me = mirrorEgress.trim() || null;
      if (mi !== (interfaceData.mirror.ingress || null) || me !== (interfaceData.mirror.egress || null)) {
        updated.mirror = {};
        if (mi !== (interfaceData.mirror.ingress || null)) updated.mirror.ingress = mi;
        if (me !== (interfaceData.mirror.egress || null)) updated.mirror.egress = me;
      }

      // IP settings
      const ipUpdated: NonNullable<typeof updated.ip> = {};
      let hasIpChanges = false;

      const iam = ipAdjustMss.trim() || null;
      if (iam !== (interfaceData.ip.adjust_mss || null)) { ipUpdated.adjust_mss = iam; hasIpChanges = true; }
      const iac = ipArpCacheTimeout.trim() || null;
      if (iac !== (interfaceData.ip.arp_cache_timeout || null)) { ipUpdated.arp_cache_timeout = iac; hasIpChanges = true; }
      const isv = ipSourceValidation.trim() || null;
      if (isv !== (interfaceData.ip.source_validation || null)) { ipUpdated.source_validation = isv; hasIpChanges = true; }

      if (ipDisableArpFilter !== interfaceData.ip.disable_arp_filter) { ipUpdated.disable_arp_filter = ipDisableArpFilter; hasIpChanges = true; }
      if (ipDisableForwarding !== interfaceData.ip.disable_forwarding) { ipUpdated.disable_forwarding = ipDisableForwarding; hasIpChanges = true; }
      if (ipEnableArpAccept !== interfaceData.ip.enable_arp_accept) { ipUpdated.enable_arp_accept = ipEnableArpAccept; hasIpChanges = true; }
      if (ipEnableArpAnnounce !== interfaceData.ip.enable_arp_announce) { ipUpdated.enable_arp_announce = ipEnableArpAnnounce; hasIpChanges = true; }
      if (ipEnableArpIgnore !== interfaceData.ip.enable_arp_ignore) { ipUpdated.enable_arp_ignore = ipEnableArpIgnore; hasIpChanges = true; }
      if (ipEnableDirectedBroadcast !== interfaceData.ip.enable_directed_broadcast) { ipUpdated.enable_directed_broadcast = ipEnableDirectedBroadcast; hasIpChanges = true; }
      if (ipEnableProxyArp !== interfaceData.ip.enable_proxy_arp) { ipUpdated.enable_proxy_arp = ipEnableProxyArp; hasIpChanges = true; }
      if (ipProxyArpPvlan !== interfaceData.ip.proxy_arp_pvlan) { ipUpdated.proxy_arp_pvlan = ipProxyArpPvlan; hasIpChanges = true; }

      if (hasIpChanges) updated.ip = ipUpdated;

      // IPv6 settings
      const ipv6Updated: NonNullable<typeof updated.ipv6> = {};
      let hasIpv6Changes = false;

      const i6ad = ipv6AcceptDad.trim() || null;
      if (i6ad !== (interfaceData.ipv6.accept_dad || null)) { ipv6Updated.accept_dad = i6ad; hasIpv6Changes = true; }
      const i6am = ipv6AdjustMss.trim() || null;
      if (i6am !== (interfaceData.ipv6.adjust_mss || null)) { ipv6Updated.adjust_mss = i6am; hasIpv6Changes = true; }
      const i6br = ipv6BaseReachableTime.trim() || null;
      if (i6br !== (interfaceData.ipv6.base_reachable_time || null)) { ipv6Updated.base_reachable_time = i6br; hasIpv6Changes = true; }
      const i6dt = ipv6DupAddrDetectTransmits.trim() || null;
      if (i6dt !== (interfaceData.ipv6.dup_addr_detect_transmits || null)) { ipv6Updated.dup_addr_detect_transmits = i6dt; hasIpv6Changes = true; }
      const i6sv = ipv6SourceValidation.trim() || null;
      if (i6sv !== (interfaceData.ipv6.source_validation || null)) { ipv6Updated.source_validation = i6sv; hasIpv6Changes = true; }

      if (ipv6DisableForwarding !== interfaceData.ipv6.disable_forwarding) { ipv6Updated.disable_forwarding = ipv6DisableForwarding; hasIpv6Changes = true; }
      if (ipv6AddressAutoconf !== interfaceData.ipv6.address.autoconf) { ipv6Updated.address_autoconf = ipv6AddressAutoconf; hasIpv6Changes = true; }
      if (ipv6AddressNoDefaultLinkLocal !== interfaceData.ipv6.address.no_default_link_local) { ipv6Updated.address_no_default_link_local = ipv6AddressNoDefaultLinkLocal; hasIpv6Changes = true; }

      const newEui64 = ipv6AddressEui64.split(",").map((a) => a.trim()).filter(Boolean);
      if (JSON.stringify(newEui64) !== JSON.stringify(interfaceData.ipv6.address.eui64)) {
        ipv6Updated.address_eui64 = newEui64;
        hasIpv6Changes = true;
      }

      if (hasIpv6Changes) updated.ipv6 = ipv6Updated;

      const result = await tunnelService.updateInterface(interfaceData.name, interfaceData, updated);
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update tunnel interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update tunnel interface");
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Waypoints className="h-5 w-5" />
            Edit Tunnel Interface: {interfaceData.name}
          </DialogTitle>
          <DialogDescription>
            Modify tunnel interface configuration. Name and encapsulation cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="6rd" disabled={!showSixrd}>6rd</TabsTrigger>
          </TabsList>

          {/* Tab 1 - Basic */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={interfaceData.name} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Encapsulation</Label>
                <Input value={interfaceData.encapsulation || ""} disabled className="bg-muted" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-source-address">Source Address</Label>
                <Input id="edit-source-address" value={sourceAddress} onChange={(e) => setSourceAddress(e.target.value)} placeholder="e.g., 10.0.0.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-remote">Remote Address</Label>
                <Input id="edit-remote" value={remote} onChange={(e) => setRemote(e.target.value)} placeholder="e.g., 10.0.0.2" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-addresses">Addresses</Label>
              <Input id="edit-addresses" value={addresses} onChange={(e) => setAddresses(e.target.value)} placeholder="Comma-separated, e.g., 192.168.1.1/24, 10.0.0.1/30" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-mtu">MTU</Label>
                <Input id="edit-mtu" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="68-16000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-vrf">VRF</Label>
                <VrfSelect id="edit-vrf" value={vrf} onValueChange={setVrf} />
              </div>
              <div className="space-y-2">
                <Label>Source Interface</Label>
                <InterfaceSelect
                  value={sourceInterface || "__none__"}
                  onValueChange={(v) => setSourceInterface(v === "__none__" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: "None", value: "__none__" }}
                  placeholder="None"
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 2 - Advanced */}
          <TabsContent value="advanced" className="space-y-6 mt-4">
            <div>
              <h4 className="text-sm font-medium mb-3">Interface Options</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} />
                  <Label>Disabled</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={disableLinkDetect} onCheckedChange={(c) => setDisableLinkDetect(c === true)} />
                  <Label>Disable Link Detect</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={enableMulticast} onCheckedChange={(c) => setEnableMulticast(c === true)} />
                  <Label>Enable Multicast</Label>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">IP Settings</h4>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="space-y-2">
                  <Label>Adjust MSS</Label>
                  <Input value={ipAdjustMss} onChange={(e) => setIpAdjustMss(e.target.value)} placeholder="e.g., clamp-mss-to-pmtu or value" />
                </div>
                <div className="space-y-2">
                  <Label>ARP Cache Timeout</Label>
                  <Input value={ipArpCacheTimeout} onChange={(e) => setIpArpCacheTimeout(e.target.value)} placeholder="Seconds" />
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <Label>Source Validation</Label>
                <Select value={ipSourceValidation || "__none__"} onValueChange={(v) => setIpSourceValidation(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    <SelectItem value="strict">strict</SelectItem>
                    <SelectItem value="loose">loose</SelectItem>
                    <SelectItem value="disable">disable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Disable ARP Filter", value: ipDisableArpFilter, setter: setIpDisableArpFilter },
                  { label: "Disable Forwarding", value: ipDisableForwarding, setter: setIpDisableForwarding },
                  { label: "Enable ARP Accept", value: ipEnableArpAccept, setter: setIpEnableArpAccept },
                  { label: "Enable ARP Announce", value: ipEnableArpAnnounce, setter: setIpEnableArpAnnounce },
                  { label: "Enable ARP Ignore", value: ipEnableArpIgnore, setter: setIpEnableArpIgnore },
                  { label: "Enable Directed Broadcast", value: ipEnableDirectedBroadcast, setter: setIpEnableDirectedBroadcast },
                  { label: "Enable Proxy ARP", value: ipEnableProxyArp, setter: setIpEnableProxyArp },
                  { label: "Proxy ARP PVLAN", value: ipProxyArpPvlan, setter: setIpProxyArpPvlan },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <Checkbox checked={item.value} onCheckedChange={(c) => item.setter(c === true)} />
                    <Label className="text-sm">{item.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">IPv6 Settings</h4>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="space-y-2">
                  <Label>Accept DAD</Label>
                  <Input value={ipv6AcceptDad} onChange={(e) => setIpv6AcceptDad(e.target.value)} placeholder="0, 1, or 2" />
                </div>
                <div className="space-y-2">
                  <Label>Adjust MSS</Label>
                  <Input value={ipv6AdjustMss} onChange={(e) => setIpv6AdjustMss(e.target.value)} placeholder="e.g., clamp-mss-to-pmtu or value" />
                </div>
                <div className="space-y-2">
                  <Label>Base Reachable Time</Label>
                  <Input value={ipv6BaseReachableTime} onChange={(e) => setIpv6BaseReachableTime(e.target.value)} placeholder="Seconds" />
                </div>
                <div className="space-y-2">
                  <Label>DAD Transmits</Label>
                  <Input value={ipv6DupAddrDetectTransmits} onChange={(e) => setIpv6DupAddrDetectTransmits(e.target.value)} placeholder="Number of transmits" />
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <Label>Source Validation</Label>
                <Select value={ipv6SourceValidation || "__none__"} onValueChange={(v) => setIpv6SourceValidation(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    <SelectItem value="strict">strict</SelectItem>
                    <SelectItem value="loose">loose</SelectItem>
                    <SelectItem value="disable">disable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={ipv6DisableForwarding} onCheckedChange={(c) => setIpv6DisableForwarding(c === true)} />
                  <Label>Disable Forwarding</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={ipv6AddressAutoconf} onCheckedChange={(c) => setIpv6AddressAutoconf(c === true)} />
                  <Label>Autoconf</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={ipv6AddressNoDefaultLinkLocal} onCheckedChange={(c) => setIpv6AddressNoDefaultLinkLocal(c === true)} />
                  <Label>No Default Link-Local</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>EUI-64 Prefixes</Label>
                <Input value={ipv6AddressEui64} onChange={(e) => setIpv6AddressEui64(e.target.value)} placeholder="Comma-separated prefixes" />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Mirror / Redirect</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Mirror Ingress</Label>
                  <InterfaceSelect
                    value={mirrorIngress || "__none__"}
                    onValueChange={(v) => setMirrorIngress(v === "__none__" ? "" : v)}
                    interfaces={availableInterfaces}
                    noneOption={{ label: "None", value: "__none__" }}
                    placeholder="None"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mirror Egress</Label>
                  <InterfaceSelect
                    value={mirrorEgress || "__none__"}
                    onValueChange={(v) => setMirrorEgress(v === "__none__" ? "" : v)}
                    interfaces={availableInterfaces}
                    noneOption={{ label: "None", value: "__none__" }}
                    placeholder="None"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Redirect</Label>
                  <InterfaceSelect
                    value={redirect || "__none__"}
                    onValueChange={(v) => setRedirect(v === "__none__" ? "" : v)}
                    interfaces={availableInterfaces}
                    noneOption={{ label: "None", value: "__none__" }}
                    placeholder="None"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3 - Parameters */}
          <TabsContent value="parameters" className="space-y-6 mt-4">
            {!encapsulation ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No encapsulation set for this interface.</p>
              </div>
            ) : (
              <>
                {showErspanParams && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">ERSPAN Parameters</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Direction</Label>
                        <Select value={erspanDirection || "__none__"} onValueChange={(v) => setErspanDirection(v === "__none__" ? "" : v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select direction" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            <SelectItem value="ingress">ingress</SelectItem>
                            <SelectItem value="egress">egress</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Hardware ID</Label>
                        <Input value={erspanHwId} onChange={(e) => setErspanHwId(e.target.value)} placeholder="e.g., 00:11:22:33:44:55" />
                      </div>
                      <div className="space-y-2">
                        <Label>Index</Label>
                        <Input value={erspanIndex} onChange={(e) => setErspanIndex(e.target.value)} placeholder="ERSPAN index" />
                      </div>
                      <div className="space-y-2">
                        <Label>Version</Label>
                        <Select value={erspanVersion || "__none__"} onValueChange={(v) => setErspanVersion(v === "__none__" ? "" : v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select version" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {showIpParams && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">IP Parameters</h4>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="space-y-2">
                        <Label>Key</Label>
                        <Input value={paramIpKey} onChange={(e) => setParamIpKey(e.target.value)} placeholder="Tunnel key" />
                      </div>
                      <div className="space-y-2">
                        <Label>TOS</Label>
                        <Input value={paramIpTos} onChange={(e) => setParamIpTos(e.target.value)} placeholder="Type of Service" />
                      </div>
                      <div className="space-y-2">
                        <Label>TTL</Label>
                        <Input value={paramIpTtl} onChange={(e) => setParamIpTtl(e.target.value)} placeholder="Time To Live" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={paramIpIgnoreDf} onCheckedChange={(c) => setParamIpIgnoreDf(c === true)} />
                        <Label>Ignore DF</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={paramIpNoPmtuDiscovery} onCheckedChange={(c) => setParamIpNoPmtuDiscovery(c === true)} />
                        <Label>No PMTU Discovery</Label>
                      </div>
                    </div>
                  </div>
                )}

                {showIpv6Params && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">IPv6 Parameters</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Encap Limit</Label>
                        <Input value={paramIpv6Encaplimit} onChange={(e) => setParamIpv6Encaplimit(e.target.value)} placeholder="Encapsulation limit" />
                      </div>
                      <div className="space-y-2">
                        <Label>Flow Label</Label>
                        <Input value={paramIpv6Flowlabel} onChange={(e) => setParamIpv6Flowlabel(e.target.value)} placeholder="Flow label" />
                      </div>
                      <div className="space-y-2">
                        <Label>Hop Limit</Label>
                        <Input value={paramIpv6Hoplimit} onChange={(e) => setParamIpv6Hoplimit(e.target.value)} placeholder="Hop limit" />
                      </div>
                      <div className="space-y-2">
                        <Label>Traffic Class</Label>
                        <Input value={paramIpv6Tclass} onChange={(e) => setParamIpv6Tclass(e.target.value)} placeholder="Traffic class" />
                      </div>
                    </div>
                  </div>
                )}

                {!showErspanParams && !showIpParams && !showIpv6Params && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No additional parameters available for &ldquo;{encapsulation}&rdquo; encapsulation.</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Tab 4 - 6rd */}
          <TabsContent value="6rd" className="space-y-4 mt-4">
            <div className="rounded-lg bg-muted/50 border p-3 mb-4">
              <p className="text-sm text-muted-foreground">
                6rd (IPv6 Rapid Deployment) is available only with &ldquo;sit&rdquo; encapsulation.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>6rd Prefix</Label>
                <Input value={sixrdPrefix} onChange={(e) => setSixrdPrefix(e.target.value)} placeholder="IPv6 prefix, e.g., 2001:db8::/32" />
              </div>
              <div className="space-y-2">
                <Label>6rd Relay Prefix</Label>
                <Input value={sixrdRelayPrefix} onChange={(e) => setSixrdRelayPrefix(e.target.value)} placeholder="IPv4 prefix, e.g., 192.0.2.0/24" />
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
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
