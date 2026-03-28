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
import { tunnelService, type TunnelCapabilities } from "@/lib/api/tunnel";
import { showService, type InterfaceName } from "@/lib/api/show";
import { ApiError } from "@/lib/types/api";

const ENCAPSULATION_TYPES = [
  "erspan", "gre", "gretap", "ip6erspan", "ip6gre", "ip6gretap", "ip6ip6", "ipip", "ipip6", "sit",
] as const;

const IPV4_ENCAPS = ["gre", "gretap", "ipip", "erspan"];
const IPV6_ENCAPS = ["ip6gre", "ip6gretap", "ip6ip6", "ipip6", "ip6erspan"];
const ERSPAN_ENCAPS = ["erspan", "ip6erspan"];

interface CreateTunnelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: TunnelCapabilities | null;
  existingInterfaces: string[];
}

export function CreateTunnelModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
}: CreateTunnelModalProps) {
  // Basic
  const [name, setName] = useState("tun0");
  const [encapsulation, setEncapsulation] = useState("");
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

  const getNextInterfaceName = (): string => {
    let i = 0;
    while (existingInterfaces.includes(`tun${i}`)) {
      i++;
    }
    return `tun${i}`;
  };

  const resetForm = () => {
    setName(getNextInterfaceName());
    setEncapsulation("");
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

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName(getNextInterfaceName());
    } else {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const validateForm = (): string | null => {
    if (!name.trim()) return "Interface name is required";
    if (!/^tun\d+$/.test(name.trim())) return "Name must be in format 'tun0', 'tun1', etc.";
    if (existingInterfaces.includes(name.trim())) return `Interface ${name} already exists`;
    if (!encapsulation) return "Encapsulation type is required";
    return null;
  };

  const showIpParams = IPV4_ENCAPS.includes(encapsulation) || encapsulation === "sit";
  const showIpv6Params = IPV6_ENCAPS.includes(encapsulation) || encapsulation === "sit";
  const showErspanParams = ERSPAN_ENCAPS.includes(encapsulation);
  const showSixrd = encapsulation === "sit";

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
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

      const result = await tunnelService.createInterface(config);
      if (result.success) {
        handleOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to create tunnel interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to create tunnel interface");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Waypoints className="h-5 w-5" />
            Create Tunnel Interface
          </DialogTitle>
          <DialogDescription>
            Configure a new tunnel interface with encapsulation settings.
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
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="tun0" />
                <p className="text-xs text-muted-foreground">Format: tun0, tun1, etc.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="encapsulation">Encapsulation *</Label>
                <Select value={encapsulation} onValueChange={setEncapsulation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select encapsulation" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENCAPSULATION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source-address">Source Address</Label>
                <Input id="source-address" value={sourceAddress} onChange={(e) => setSourceAddress(e.target.value)} placeholder="e.g., 10.0.0.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remote">Remote Address</Label>
                <Input id="remote" value={remote} onChange={(e) => setRemote(e.target.value)} placeholder="e.g., 10.0.0.2" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addresses">Addresses</Label>
              <Input id="addresses" value={addresses} onChange={(e) => setAddresses(e.target.value)} placeholder="Comma-separated, e.g., 192.168.1.1/24, 10.0.0.1/30" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mtu">MTU</Label>
                <Input id="mtu" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="68-16000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vrf">VRF</Label>
                <Input id="vrf" value={vrf} onChange={(e) => setVrf(e.target.value)} placeholder="VRF name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source-interface">Source Interface</Label>
                <Select value={sourceInterface} onValueChange={setSourceInterface}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {availableInterfaces.map((iface) => (
                      <SelectItem key={iface.name} value={iface.name}>{iface.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2 - Advanced */}
          <TabsContent value="advanced" className="space-y-6 mt-4">
            {/* Interface Options */}
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

            {/* IP Settings */}
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
                <Select value={ipSourceValidation} onValueChange={setIpSourceValidation}>
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

            {/* IPv6 Settings */}
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
                <Select value={ipv6SourceValidation} onValueChange={setIpv6SourceValidation}>
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

            {/* Mirror / Redirect */}
            <div>
              <h4 className="text-sm font-medium mb-3">Mirror / Redirect</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Mirror Ingress</Label>
                  <Select value={mirrorIngress || "__none__"} onValueChange={(v) => setMirrorIngress(v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {availableInterfaces.map((iface) => (
                        <SelectItem key={iface.name} value={iface.name}>{iface.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mirror Egress</Label>
                  <Select value={mirrorEgress || "__none__"} onValueChange={(v) => setMirrorEgress(v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {availableInterfaces.map((iface) => (
                        <SelectItem key={iface.name} value={iface.name}>{iface.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Redirect</Label>
                  <Select value={redirect || "__none__"} onValueChange={(v) => setRedirect(v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {availableInterfaces.map((iface) => (
                        <SelectItem key={iface.name} value={iface.name}>{iface.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3 - Parameters */}
          <TabsContent value="parameters" className="space-y-6 mt-4">
            {!encapsulation ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Select an encapsulation type on the Basic tab to see available parameters.</p>
              </div>
            ) : (
              <>
                {/* ERSPAN Parameters */}
                {showErspanParams && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">ERSPAN Parameters</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Direction</Label>
                        <Select value={erspanDirection} onValueChange={setErspanDirection}>
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
                        <Select value={erspanVersion} onValueChange={setErspanVersion}>
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

                {/* IP Parameters */}
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

                {/* IPv6 Parameters */}
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
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Interface"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
