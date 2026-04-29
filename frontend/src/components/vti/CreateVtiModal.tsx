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
import { Lock, Loader2 } from "lucide-react";
import { vtiService, type VtiCapabilities } from "@/lib/api/vti";
import { showService, type InterfaceName } from "@/lib/api/show";
import { ApiError } from "@/lib/types/api";

interface CreateVtiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: VtiCapabilities | null;
  existingInterfaces: string[];
}

const MTU_PRESETS = ["1280", "1400", "1500", "9000"];
const TIMEOUT_PRESETS = ["30", "60", "300", "600", "3600"];
const DAD_PRESETS = ["0", "1", "2", "3"];

export function CreateVtiModal({
  open,
  onOpenChange,
  onSuccess,
  existingInterfaces,
}: CreateVtiModalProps) {
  // Basic
  const [name, setName] = useState("vti0");
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [mtuIsCustom, setMtuIsCustom] = useState(false);
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState("");
  const [ipv6AddressEui64, setIpv6AddressEui64] = useState("");
  const [ipv6AddressAutoconf, setIpv6AddressAutoconf] = useState(false);
  const [ipv6AddressNoDefaultLinkLocal, setIpv6AddressNoDefaultLinkLocal] = useState(false);

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

  // Derived modes — flag takes priority so "custom selected but empty" shows the input
  const mtuMode = mtuIsCustom ? "custom" : (!mtu ? "default" : MTU_PRESETS.includes(mtu) ? mtu : "custom");
  const ipAdjustMssMode = ipAdjustMssIsCustom ? "custom" : (!ipAdjustMss ? "none" : ipAdjustMss === "clamp-mss-to-pmtu" ? "clamp" : "custom");
  const ipArpCacheTimeoutMode = ipArpCacheTimeoutIsCustom ? "custom" : (!ipArpCacheTimeout ? "none" : TIMEOUT_PRESETS.includes(ipArpCacheTimeout) ? ipArpCacheTimeout : "custom");
  const ipv6AdjustMssMode = ipv6AdjustMssIsCustom ? "custom" : (!ipv6AdjustMss ? "none" : ipv6AdjustMss === "clamp-mss-to-pmtu" ? "clamp" : "custom");
  const ipv6BaseReachableTimeMode = ipv6BaseReachableTimeIsCustom ? "custom" : (!ipv6BaseReachableTime ? "none" : TIMEOUT_PRESETS.includes(ipv6BaseReachableTime) ? ipv6BaseReachableTime : "custom");
  const dadTransmitsMode = dadIsCustom ? "custom" : (!ipv6DupAddrDetectTransmits ? "default" : DAD_PRESETS.includes(ipv6DupAddrDetectTransmits) ? ipv6DupAddrDetectTransmits : "custom");

  const getNextInterfaceName = (): string => {
    let i = 0;
    while (existingInterfaces.includes(`vti${i}`)) i++;
    return `vti${i}`;
  };

  const resetForm = () => {
    setName(getNextInterfaceName());
    setDescription("");
    setMtu(""); setMtuIsCustom(false);
    setVrf("");
    setDisabled(false);
    setAddresses("");
    setIpv6AddressEui64("");
    setIpv6AddressAutoconf(false);
    setIpv6AddressNoDefaultLinkLocal(false);
    setIpAdjustMss(""); setIpAdjustMssIsCustom(false);
    setIpArpCacheTimeout(""); setIpArpCacheTimeoutIsCustom(false);
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
    setIpv6AdjustMss(""); setIpv6AdjustMssIsCustom(false);
    setIpv6BaseReachableTime(""); setIpv6BaseReachableTimeIsCustom(false);
    setIpv6DupAddrDetectTransmits(""); setDadIsCustom(false);
    setIpv6SourceValidation("");
    setIpv6DisableForwarding(false);
    setMirrorIngress("");
    setMirrorEgress("");
    setRedirect("");
    setError(null);
  };

  useEffect(() => {
    if (open) {
      resetForm();
      showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const validateForm = (): string | null => {
    if (!name.trim()) return "Interface name is required";
    if (!/^vti\d+$/.test(name)) return "Name must be vti0, vti1, vti2, …";
    if (existingInterfaces.includes(name)) return `Interface ${name} already exists`;
    if (mtuMode === "custom") {
      const v = parseInt(mtu.trim(), 10);
      if (isNaN(v) || v < 68 || v > 16000) return "MTU must be between 68 and 16000";
    }
    if (ipAdjustMssMode === "custom" && ipAdjustMss) {
      const v = parseInt(ipAdjustMss.trim(), 10);
      if (isNaN(v) || v < 536 || v > 65535) return "TCP MSS must be between 536 and 65535";
    }
    if (ipArpCacheTimeoutMode === "custom" && ipArpCacheTimeout) {
      const v = parseInt(ipArpCacheTimeout.trim(), 10);
      if (isNaN(v) || v < 1 || v > 86400) return "ARP cache timeout must be between 1 and 86400";
    }
    if (ipv6AdjustMssMode === "custom" && ipv6AdjustMss) {
      const v = parseInt(ipv6AdjustMss.trim(), 10);
      if (isNaN(v) || v < 536 || v > 65535) return "IPv6 TCP MSS must be between 536 and 65535";
    }
    if (ipv6BaseReachableTimeMode === "custom" && ipv6BaseReachableTime) {
      const v = parseInt(ipv6BaseReachableTime.trim(), 10);
      if (isNaN(v) || v < 1 || v > 86400) return "Base reachable time must be between 1 and 86400";
    }
    if (dadTransmitsMode === "custom" && ipv6DupAddrDetectTransmits) {
      const v = parseInt(ipv6DupAddrDetectTransmits.trim(), 10);
      if (isNaN(v) || v < 0) return "DAD transmits must be a non-negative integer";
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError(null);

    try {
      const addrList = addresses.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);
      const eui64List = ipv6AddressEui64.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);

      const config: Parameters<typeof vtiService.createInterface>[0] = { name };

      if (description.trim()) config.description = description.trim();
      if (addrList.length > 0) config.addresses = addrList;
      if (mtu) config.mtu = mtu;
      if (vrf.trim()) config.vrf = vrf.trim();
      if (disabled) config.disabled = true;
      if (mirrorIngress) config.mirror_ingress = mirrorIngress;
      if (mirrorEgress) config.mirror_egress = mirrorEgress;
      if (redirect) config.redirect = redirect;
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
      if (ipv6AdjustMss) config.ipv6_adjust_mss = ipv6AdjustMss;
      if (ipv6BaseReachableTime) config.ipv6_base_reachable_time = ipv6BaseReachableTime;
      if (ipv6DisableForwarding) config.ipv6_disable_forwarding = true;
      if (ipv6DupAddrDetectTransmits) config.ipv6_dup_addr_detect_transmits = ipv6DupAddrDetectTransmits;
      if (ipv6SourceValidation) config.ipv6_source_validation = ipv6SourceValidation;

      const result = await vtiService.createInterface(config);
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to create VTI interface");
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
            <Lock className="h-5 w-5" />
            Create VTI Interface
          </DialogTitle>
          <DialogDescription>
            Create a new Virtual Tunnel Interface (XFRM) for use with IPsec.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="ip">IP Settings</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Interface Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="vti0"
              />
              <p className="text-xs text-muted-foreground">Must match pattern: vti0, vti1, vti2, …</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
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
                <SelectTrigger id="mtu"><SelectValue placeholder="Default (1500)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (1500)</SelectItem>
                  <SelectItem value="1280">1280 — IPv6 minimum</SelectItem>
                  <SelectItem value="1400">1400 — common for IPsec/VPN</SelectItem>
                  <SelectItem value="1500">1500 — standard Ethernet</SelectItem>
                  <SelectItem value="9000">9000 — jumbo frames</SelectItem>
                  <SelectItem value="custom">Custom value (68–16000)</SelectItem>
                </SelectContent>
              </Select>
              {mtuMode === "custom" && (
                <Input
                  value={mtu}
                  onChange={(e) => setMtu(e.target.value)}
                  placeholder="Enter MTU (68–16000)"
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vrf">VRF</Label>
              <Input
                id="vrf"
                value={vrf}
                onChange={(e) => setVrf(e.target.value)}
                placeholder="Optional VRF name"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} id="disabled" />
              <Label htmlFor="disabled" className="font-normal">Disable Interface</Label>
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="addresses">IP Addresses</Label>
              <Textarea
                id="addresses"
                value={addresses}
                onChange={(e) => setAddresses(e.target.value)}
                placeholder={"10.0.0.1/32\n192.168.1.1/24"}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">One address per line, IPv4 or IPv6 CIDR notation</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eui64">IPv6 EUI-64 Prefixes</Label>
              <Textarea
                id="eui64"
                value={ipv6AddressEui64}
                onChange={(e) => setIpv6AddressEui64(e.target.value)}
                placeholder={"2001:db8::/64"}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">One /64 prefix per line</p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="ipv6Autoconf" checked={ipv6AddressAutoconf} onCheckedChange={(c) => setIpv6AddressAutoconf(c === true)} />
              <Label htmlFor="ipv6Autoconf" className="font-normal">IPv6 Address Autoconf (SLAAC)</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="noDefaultLinkLocal" checked={ipv6AddressNoDefaultLinkLocal} onCheckedChange={(c) => setIpv6AddressNoDefaultLinkLocal(c === true)} />
              <Label htmlFor="noDefaultLinkLocal" className="font-normal">No Default Link-Local</Label>
            </div>
          </TabsContent>

          {/* IP Settings Tab */}
          <TabsContent value="ip" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">IPv4</h4>

              <div className="space-y-2">
                <Label htmlFor="ipAdjustMss">Adjust TCP MSS</Label>
                <Select
                  value={ipAdjustMssMode}
                  onValueChange={(v) => {
                    if (v === "none") { setIpAdjustMss(""); setIpAdjustMssIsCustom(false); }
                    else if (v === "clamp") { setIpAdjustMss("clamp-mss-to-pmtu"); setIpAdjustMssIsCustom(false); }
                    else { setIpAdjustMss(""); setIpAdjustMssIsCustom(true); }
                  }}
                >
                  <SelectTrigger id="ipAdjustMss"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (default)</SelectItem>
                    <SelectItem value="clamp">Clamp to PMTU — auto-fit to path MTU</SelectItem>
                    <SelectItem value="custom">Custom value (536–65535)</SelectItem>
                  </SelectContent>
                </Select>
                {ipAdjustMssMode === "custom" && (
                  <Input
                    value={ipAdjustMss}
                    onChange={(e) => setIpAdjustMss(e.target.value)}
                    placeholder="Enter value (536–65535)"
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ipArpCacheTimeout">ARP Cache Timeout</Label>
                <Select
                  value={ipArpCacheTimeoutMode}
                  onValueChange={(v) => {
                    if (v === "none") { setIpArpCacheTimeout(""); setIpArpCacheTimeoutIsCustom(false); }
                    else if (v === "custom") { setIpArpCacheTimeout(""); setIpArpCacheTimeoutIsCustom(true); }
                    else { setIpArpCacheTimeout(v); setIpArpCacheTimeoutIsCustom(false); }
                  }}
                >
                  <SelectTrigger id="ipArpCacheTimeout"><SelectValue placeholder="Default (30s)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default (30s)</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="600">10 minutes</SelectItem>
                    <SelectItem value="3600">1 hour</SelectItem>
                    <SelectItem value="custom">Custom (1–86400 seconds)</SelectItem>
                  </SelectContent>
                </Select>
                {ipArpCacheTimeoutMode === "custom" && (
                  <Input
                    value={ipArpCacheTimeout}
                    onChange={(e) => setIpArpCacheTimeout(e.target.value)}
                    placeholder="Enter seconds (1–86400)"
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ipSourceValidation">Source Validation</Label>
                <Select value={ipSourceValidation || "none"} onValueChange={(v) => setIpSourceValidation(v === "none" ? "" : v)}>
                  <SelectTrigger id="ipSourceValidation"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="strict">Strict</SelectItem>
                    <SelectItem value="loose">Loose</SelectItem>
                    <SelectItem value="disable">Disable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <Checkbox id="ipDisableArpFilter" checked={ipDisableArpFilter} onCheckedChange={(c) => setIpDisableArpFilter(c === true)} />
                  <Label htmlFor="ipDisableArpFilter" className="font-normal text-sm">Disable ARP Filter</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="ipDisableForwarding" checked={ipDisableForwarding} onCheckedChange={(c) => setIpDisableForwarding(c === true)} />
                  <Label htmlFor="ipDisableForwarding" className="font-normal text-sm">Disable Forwarding</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="ipEnableArpAccept" checked={ipEnableArpAccept} onCheckedChange={(c) => setIpEnableArpAccept(c === true)} />
                  <Label htmlFor="ipEnableArpAccept" className="font-normal text-sm">Enable ARP Accept</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="ipEnableArpAnnounce" checked={ipEnableArpAnnounce} onCheckedChange={(c) => setIpEnableArpAnnounce(c === true)} />
                  <Label htmlFor="ipEnableArpAnnounce" className="font-normal text-sm">Enable ARP Announce</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="ipEnableArpIgnore" checked={ipEnableArpIgnore} onCheckedChange={(c) => setIpEnableArpIgnore(c === true)} />
                  <Label htmlFor="ipEnableArpIgnore" className="font-normal text-sm">Enable ARP Ignore</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="ipEnableDirectedBroadcast" checked={ipEnableDirectedBroadcast} onCheckedChange={(c) => setIpEnableDirectedBroadcast(c === true)} />
                  <Label htmlFor="ipEnableDirectedBroadcast" className="font-normal text-sm">Enable Directed Broadcast</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="ipEnableProxyArp" checked={ipEnableProxyArp} onCheckedChange={(c) => setIpEnableProxyArp(c === true)} />
                  <Label htmlFor="ipEnableProxyArp" className="font-normal text-sm">Enable Proxy ARP</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="ipProxyArpPvlan" checked={ipProxyArpPvlan} onCheckedChange={(c) => setIpProxyArpPvlan(c === true)} />
                  <Label htmlFor="ipProxyArpPvlan" className="font-normal text-sm">Private VLAN Proxy ARP</Label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">IPv6</h4>

              <div className="space-y-2">
                <Label htmlFor="ipv6AcceptDad">Accept DAD</Label>
                <Select value={ipv6AcceptDad || "default"} onValueChange={(v) => setIpv6AcceptDad(v === "default" ? "" : v)}>
                  <SelectTrigger id="ipv6AcceptDad"><SelectValue placeholder="Default" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="0">0 — Disabled</SelectItem>
                    <SelectItem value="1">1 — Enabled (default)</SelectItem>
                    <SelectItem value="2">2 — Enabled, disable IPv6 if MAC-based duplicate found</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ipv6AdjustMss">Adjust TCP MSS (IPv6)</Label>
                <Select
                  value={ipv6AdjustMssMode}
                  onValueChange={(v) => {
                    if (v === "none") { setIpv6AdjustMss(""); setIpv6AdjustMssIsCustom(false); }
                    else if (v === "clamp") { setIpv6AdjustMss("clamp-mss-to-pmtu"); setIpv6AdjustMssIsCustom(false); }
                    else { setIpv6AdjustMss(""); setIpv6AdjustMssIsCustom(true); }
                  }}
                >
                  <SelectTrigger id="ipv6AdjustMss"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (default)</SelectItem>
                    <SelectItem value="clamp">Clamp to PMTU — auto-fit to path MTU</SelectItem>
                    <SelectItem value="custom">Custom value (536–65535)</SelectItem>
                  </SelectContent>
                </Select>
                {ipv6AdjustMssMode === "custom" && (
                  <Input
                    value={ipv6AdjustMss}
                    onChange={(e) => setIpv6AdjustMss(e.target.value)}
                    placeholder="Enter value (536–65535)"
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ipv6BaseReachableTime">Base Reachable Time</Label>
                <Select
                  value={ipv6BaseReachableTimeMode}
                  onValueChange={(v) => {
                    if (v === "none") { setIpv6BaseReachableTime(""); setIpv6BaseReachableTimeIsCustom(false); }
                    else if (v === "custom") { setIpv6BaseReachableTime(""); setIpv6BaseReachableTimeIsCustom(true); }
                    else { setIpv6BaseReachableTime(v); setIpv6BaseReachableTimeIsCustom(false); }
                  }}
                >
                  <SelectTrigger id="ipv6BaseReachableTime"><SelectValue placeholder="Default (30s)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default (30s)</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="600">10 minutes</SelectItem>
                    <SelectItem value="3600">1 hour</SelectItem>
                    <SelectItem value="custom">Custom (1–86400 seconds)</SelectItem>
                  </SelectContent>
                </Select>
                {ipv6BaseReachableTimeMode === "custom" && (
                  <Input
                    value={ipv6BaseReachableTime}
                    onChange={(e) => setIpv6BaseReachableTime(e.target.value)}
                    placeholder="Enter seconds (1–86400)"
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ipv6DupAddrDetectTransmits">Duplicate Address Detect Transmits</Label>
                <Select
                  value={dadTransmitsMode}
                  onValueChange={(v) => {
                    if (v === "default") { setIpv6DupAddrDetectTransmits(""); setDadIsCustom(false); }
                    else if (v === "custom") { setIpv6DupAddrDetectTransmits(""); setDadIsCustom(true); }
                    else { setIpv6DupAddrDetectTransmits(v); setDadIsCustom(false); }
                  }}
                >
                  <SelectTrigger id="ipv6DupAddrDetectTransmits"><SelectValue placeholder="Default" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="0">0 — Disabled (skip DAD)</SelectItem>
                    <SelectItem value="1">1 — 1 transmit (default behavior)</SelectItem>
                    <SelectItem value="2">2 — 2 transmits</SelectItem>
                    <SelectItem value="3">3 — 3 transmits</SelectItem>
                    <SelectItem value="custom">Custom count</SelectItem>
                  </SelectContent>
                </Select>
                {dadTransmitsMode === "custom" && (
                  <Input
                    value={ipv6DupAddrDetectTransmits}
                    onChange={(e) => setIpv6DupAddrDetectTransmits(e.target.value)}
                    placeholder="Enter count (0 or greater)"
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ipv6SourceValidation">Source Validation (IPv6)</Label>
                <Select value={ipv6SourceValidation || "none"} onValueChange={(v) => setIpv6SourceValidation(v === "none" ? "" : v)}>
                  <SelectTrigger id="ipv6SourceValidation"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="strict">Strict</SelectItem>
                    <SelectItem value="loose">Loose</SelectItem>
                    <SelectItem value="disable">Disable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="ipv6DisableForwarding" checked={ipv6DisableForwarding} onCheckedChange={(c) => setIpv6DisableForwarding(c === true)} />
                <Label htmlFor="ipv6DisableForwarding" className="font-normal">Disable IPv6 Forwarding</Label>
              </div>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Traffic Mirroring &amp; Redirect</h4>
              <div className="space-y-2">
                <Label>Mirror Ingress →</Label>
                <Select value={mirrorIngress || "none"} onValueChange={(v) => setMirrorIngress(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableInterfaces.map((iface) => (
                      <SelectItem key={iface.name} value={iface.name}>{iface.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mirror Egress →</Label>
                <Select value={mirrorEgress || "none"} onValueChange={(v) => setMirrorEgress(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableInterfaces.map((iface) => (
                      <SelectItem key={iface.name} value={iface.name}>{iface.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Redirect To</Label>
                <Select value={redirect || "none"} onValueChange={(v) => setRedirect(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableInterfaces.map((iface) => (
                      <SelectItem key={iface.name} value={iface.name}>{iface.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
