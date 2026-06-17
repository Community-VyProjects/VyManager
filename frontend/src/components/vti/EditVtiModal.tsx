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
import { vtiService, type VtiInterface, type VtiCapabilities } from "@/lib/api/vti";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface EditVtiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: VtiInterface | null;
  capabilities: VtiCapabilities | null;
}

const MTU_PRESETS = ["1280", "1400", "1500", "9000"];
const TIMEOUT_PRESETS = ["30", "60", "300", "600", "3600"];
const DAD_PRESETS = ["0", "1", "2", "3"];

const getMssMode = (v: string) => !v ? "none" : v === "clamp-mss-to-pmtu" ? "clamp" : "custom";
const getMtuMode = (v: string) => !v ? "default" : MTU_PRESETS.includes(v) ? v : "custom";
const getTimeoutMode = (v: string) => !v ? "none" : TIMEOUT_PRESETS.includes(v) ? v : "custom";
const getDadMode = (v: string) => !v ? "default" : DAD_PRESETS.includes(v) ? v : "custom";

export function EditVtiModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
}: EditVtiModalProps) {
  // Basic
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState("");
  const [ipv6AddressEui64, setIpv6AddressEui64] = useState("");
  const [ipv6AddressAutoconf, setIpv6AddressAutoconf] = useState(false);
  const [ipv6AddressNoDefaultLinkLocal, setIpv6AddressNoDefaultLinkLocal] = useState(false);

  // IP Settings
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

  // IPv6 Settings
  const [ipv6AcceptDad, setIpv6AcceptDad] = useState("");
  const [ipv6AdjustMss, setIpv6AdjustMss] = useState("");
  const [ipv6BaseReachableTime, setIpv6BaseReachableTime] = useState("");
  const [ipv6DupAddrDetectTransmits, setIpv6DupAddrDetectTransmits] = useState("");
  const [ipv6SourceValidation, setIpv6SourceValidation] = useState("");
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);

  // Advanced
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");
  const [redirect, setRedirect] = useState("");

  // Custom-mode flags — needed so selecting "Custom" stays visible even when value is empty
  const [mtuIsCustom, setMtuIsCustom] = useState(false);
  const [ipAdjustMssIsCustom, setIpAdjustMssIsCustom] = useState(false);
  const [ipArpCacheTimeoutIsCustom, setIpArpCacheTimeoutIsCustom] = useState(false);
  const [ipv6AdjustMssIsCustom, setIpv6AdjustMssIsCustom] = useState(false);
  const [ipv6BaseReachableTimeIsCustom, setIpv6BaseReachableTimeIsCustom] = useState(false);
  const [dadIsCustom, setDadIsCustom] = useState(false);

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived modes — flags take priority so "Custom" stays selected while the input is empty
  const mtuMode = mtuIsCustom ? "custom" : getMtuMode(mtu);
  const ipAdjustMssMode = ipAdjustMssIsCustom ? "custom" : getMssMode(ipAdjustMss);
  const ipArpCacheTimeoutMode = ipArpCacheTimeoutIsCustom ? "custom" : getTimeoutMode(ipArpCacheTimeout);
  const ipv6AdjustMssMode = ipv6AdjustMssIsCustom ? "custom" : getMssMode(ipv6AdjustMss);
  const ipv6BaseReachableTimeMode = ipv6BaseReachableTimeIsCustom ? "custom" : getTimeoutMode(ipv6BaseReachableTime);
  const dadTransmitsMode = dadIsCustom ? "custom" : getDadMode(ipv6DupAddrDetectTransmits);

  useEffect(() => {
    if (interfaceData) {
      showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch(() => {});
      setDescription(interfaceData.description ?? "");
      const iMtu = interfaceData.mtu ?? "";
      setMtu(iMtu);
      setMtuIsCustom(!!iMtu && !MTU_PRESETS.includes(iMtu));
      setVrf(interfaceData.vrf ?? "");
      setDisabled(interfaceData.disable ?? false);
      setAddresses(interfaceData.addresses.join("\n"));
      setIpv6AddressEui64(interfaceData.ipv6_address_eui64.join("\n"));
      setIpv6AddressAutoconf(interfaceData.ipv6_address_autoconf ?? false);
      setIpv6AddressNoDefaultLinkLocal(interfaceData.ipv6_address_no_default_link_local ?? false);
      const iaMss = interfaceData.ip_adjust_mss ?? "";
      setIpAdjustMss(iaMss);
      setIpAdjustMssIsCustom(!!iaMss && iaMss !== "clamp-mss-to-pmtu" && !TIMEOUT_PRESETS.includes(iaMss));
      const iAct = interfaceData.ip_arp_cache_timeout ?? "";
      setIpArpCacheTimeout(iAct);
      setIpArpCacheTimeoutIsCustom(!!iAct && !TIMEOUT_PRESETS.includes(iAct));
      setIpSourceValidation(interfaceData.ip_source_validation ?? "");
      setIpDisableArpFilter(interfaceData.ip_disable_arp_filter ?? false);
      setIpDisableForwarding(interfaceData.ip_disable_forwarding ?? false);
      setIpEnableArpAccept(interfaceData.ip_enable_arp_accept ?? false);
      setIpEnableArpAnnounce(interfaceData.ip_enable_arp_announce ?? false);
      setIpEnableArpIgnore(interfaceData.ip_enable_arp_ignore ?? false);
      setIpEnableDirectedBroadcast(interfaceData.ip_enable_directed_broadcast ?? false);
      setIpEnableProxyArp(interfaceData.ip_enable_proxy_arp ?? false);
      setIpProxyArpPvlan(interfaceData.ip_proxy_arp_pvlan ?? false);
      setIpv6AcceptDad(interfaceData.ipv6_accept_dad ?? "");
      const i6Mss = interfaceData.ipv6_adjust_mss ?? "";
      setIpv6AdjustMss(i6Mss);
      setIpv6AdjustMssIsCustom(!!i6Mss && i6Mss !== "clamp-mss-to-pmtu");
      const i6Brt = interfaceData.ipv6_base_reachable_time ?? "";
      setIpv6BaseReachableTime(i6Brt);
      setIpv6BaseReachableTimeIsCustom(!!i6Brt && !TIMEOUT_PRESETS.includes(i6Brt));
      const i6Dad = interfaceData.ipv6_dup_addr_detect_transmits ?? "";
      setIpv6DupAddrDetectTransmits(i6Dad);
      setDadIsCustom(!!i6Dad && !DAD_PRESETS.includes(i6Dad));
      setIpv6SourceValidation(interfaceData.ipv6_source_validation ?? "");
      setIpv6DisableForwarding(interfaceData.ipv6_disable_forwarding ?? false);
      setMirrorIngress(interfaceData.mirror_ingress ?? "");
      setMirrorEgress(interfaceData.mirror_egress ?? "");
      setRedirect(interfaceData.redirect ?? "");
      setError(null);
    }
  }, [interfaceData]);

  const validateForm = (): string | null => {
    if (mtuMode === "custom") {
      const v = parseInt(mtu.trim(), 10);
      if (isNaN(v) || v < 68 || v > 16000) return "MTU must be between 68 and 16000";
    }
    if (ipAdjustMssMode === "custom") {
      const v = parseInt(ipAdjustMss.trim(), 10);
      if (isNaN(v) || v < 536 || v > 65535) return "TCP MSS must be between 536 and 65535";
    }
    if (ipArpCacheTimeoutMode === "custom") {
      const v = parseInt(ipArpCacheTimeout.trim(), 10);
      if (isNaN(v) || v < 1 || v > 86400) return "ARP cache timeout must be between 1 and 86400";
    }
    if (ipv6AdjustMssMode === "custom") {
      const v = parseInt(ipv6AdjustMss.trim(), 10);
      if (isNaN(v) || v < 536 || v > 65535) return "IPv6 TCP MSS must be between 536 and 65535";
    }
    if (ipv6BaseReachableTimeMode === "custom") {
      const v = parseInt(ipv6BaseReachableTime.trim(), 10);
      if (isNaN(v) || v < 1 || v > 86400) return "Base reachable time must be between 1 and 86400";
    }
    if (dadTransmitsMode === "custom") {
      const v = parseInt(ipv6DupAddrDetectTransmits.trim(), 10);
      if (isNaN(v) || v < 0) return "DAD transmits must be a non-negative integer";
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!interfaceData) return;

    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError(null);

    try {
      const addrList = addresses.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);
      const eui64List = ipv6AddressEui64.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);

      const result = await vtiService.updateInterface(interfaceData.name, interfaceData, {
        description: description.trim() || null,
        addresses: addrList,
        mtu: mtu || null,
        vrf: vrf.trim() || null,
        disabled,
        redirect: redirect || null,
        mirror_ingress: mirrorIngress || null,
        mirror_egress: mirrorEgress || null,
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
        ipv6_address_eui64: eui64List,
        ipv6_address_no_default_link_local: ipv6AddressNoDefaultLinkLocal,
        ipv6_adjust_mss: ipv6AdjustMss || null,
        ipv6_base_reachable_time: ipv6BaseReachableTime || null,
        ipv6_disable_forwarding: ipv6DisableForwarding,
        ipv6_dup_addr_detect_transmits: ipv6DupAddrDetectTransmits || null,
        ipv6_source_validation: ipv6SourceValidation || null,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update VTI interface");
      }
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Edit VTI Interface
          </DialogTitle>
          <DialogDescription>
            Editing interface{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
              {interfaceData.name}
            </code>
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
              <Label>Interface Name</Label>
              <code className="block rounded bg-muted px-3 py-2 font-mono text-sm text-foreground">
                {interfaceData.name}
              </code>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-mtu">MTU</Label>
              <Select
                value={mtuMode}
                onValueChange={(v) => {
                  if (v === "default") { setMtu(""); setMtuIsCustom(false); }
                  else if (v === "custom") { setMtu(""); setMtuIsCustom(true); }
                  else { setMtu(v); setMtuIsCustom(false); }
                }}
              >
                <SelectTrigger id="edit-mtu"><SelectValue placeholder="Default (1500)" /></SelectTrigger>
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
              <Label htmlFor="edit-vrf">VRF</Label>
              <Input
                id="edit-vrf"
                value={vrf}
                onChange={(e) => setVrf(e.target.value)}
                placeholder="Optional VRF name"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="edit-disabled" checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} />
              <Label htmlFor="edit-disabled" className="font-normal">Disable Interface</Label>
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-addresses">IP Addresses</Label>
              <Textarea
                id="edit-addresses"
                value={addresses}
                onChange={(e) => setAddresses(e.target.value)}
                placeholder={"10.0.0.1/32\n192.168.1.1/24"}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">One address per line, IPv4 or IPv6 CIDR notation</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-eui64">IPv6 EUI-64 Prefixes</Label>
              <Textarea
                id="edit-eui64"
                value={ipv6AddressEui64}
                onChange={(e) => setIpv6AddressEui64(e.target.value)}
                placeholder={"2001:db8::/64"}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">One /64 prefix per line</p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-ipv6Autoconf"
                checked={ipv6AddressAutoconf}
                onCheckedChange={(c) => setIpv6AddressAutoconf(c === true)}
              />
              <Label htmlFor="edit-ipv6Autoconf" className="font-normal">IPv6 Address Autoconf (SLAAC)</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-noDefaultLinkLocal"
                checked={ipv6AddressNoDefaultLinkLocal}
                onCheckedChange={(c) => setIpv6AddressNoDefaultLinkLocal(c === true)}
              />
              <Label htmlFor="edit-noDefaultLinkLocal" className="font-normal">No Default Link-Local</Label>
            </div>
          </TabsContent>

          {/* IP Settings Tab */}
          <TabsContent value="ip" className="space-y-4 mt-4">
            {/* IPv4 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">IPv4</h4>

              <div className="space-y-2">
                <Label htmlFor="edit-ipAdjustMss">Adjust TCP MSS</Label>
                <Select
                  value={ipAdjustMssMode}
                  onValueChange={(v) => {
                    if (v === "none") { setIpAdjustMss(""); setIpAdjustMssIsCustom(false); }
                    else if (v === "clamp") { setIpAdjustMss("clamp-mss-to-pmtu"); setIpAdjustMssIsCustom(false); }
                    else { setIpAdjustMss(""); setIpAdjustMssIsCustom(true); }
                  }}
                >
                  <SelectTrigger id="edit-ipAdjustMss"><SelectValue placeholder="None" /></SelectTrigger>
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
                <Label htmlFor="edit-ipArpCacheTimeout">ARP Cache Timeout</Label>
                <Select
                  value={ipArpCacheTimeoutMode}
                  onValueChange={(v) => {
                    if (v === "none") { setIpArpCacheTimeout(""); setIpArpCacheTimeoutIsCustom(false); }
                    else if (v === "custom") { setIpArpCacheTimeout(""); setIpArpCacheTimeoutIsCustom(true); }
                    else { setIpArpCacheTimeout(v); setIpArpCacheTimeoutIsCustom(false); }
                  }}
                >
                  <SelectTrigger id="edit-ipArpCacheTimeout"><SelectValue placeholder="Default (30s)" /></SelectTrigger>
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
                <Label htmlFor="edit-ipSourceValidation">Source Validation</Label>
                <Select value={ipSourceValidation || "none"} onValueChange={(v) => setIpSourceValidation(v === "none" ? "" : v)}>
                  <SelectTrigger id="edit-ipSourceValidation"><SelectValue placeholder="None" /></SelectTrigger>
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
                  <Checkbox id="edit-ipDisableArpFilter" checked={ipDisableArpFilter} onCheckedChange={(c) => setIpDisableArpFilter(c === true)} />
                  <Label htmlFor="edit-ipDisableArpFilter" className="font-normal text-sm">Disable ARP Filter</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="edit-ipDisableForwarding" checked={ipDisableForwarding} onCheckedChange={(c) => setIpDisableForwarding(c === true)} />
                  <Label htmlFor="edit-ipDisableForwarding" className="font-normal text-sm">Disable Forwarding</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="edit-ipEnableArpAccept" checked={ipEnableArpAccept} onCheckedChange={(c) => setIpEnableArpAccept(c === true)} />
                  <Label htmlFor="edit-ipEnableArpAccept" className="font-normal text-sm">Enable ARP Accept</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="edit-ipEnableArpAnnounce" checked={ipEnableArpAnnounce} onCheckedChange={(c) => setIpEnableArpAnnounce(c === true)} />
                  <Label htmlFor="edit-ipEnableArpAnnounce" className="font-normal text-sm">Enable ARP Announce</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="edit-ipEnableArpIgnore" checked={ipEnableArpIgnore} onCheckedChange={(c) => setIpEnableArpIgnore(c === true)} />
                  <Label htmlFor="edit-ipEnableArpIgnore" className="font-normal text-sm">Enable ARP Ignore</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="edit-ipEnableDirectedBroadcast" checked={ipEnableDirectedBroadcast} onCheckedChange={(c) => setIpEnableDirectedBroadcast(c === true)} />
                  <Label htmlFor="edit-ipEnableDirectedBroadcast" className="font-normal text-sm">Enable Directed Broadcast</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="edit-ipEnableProxyArp" checked={ipEnableProxyArp} onCheckedChange={(c) => setIpEnableProxyArp(c === true)} />
                  <Label htmlFor="edit-ipEnableProxyArp" className="font-normal text-sm">Enable Proxy ARP</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="edit-ipProxyArpPvlan" checked={ipProxyArpPvlan} onCheckedChange={(c) => setIpProxyArpPvlan(c === true)} />
                  <Label htmlFor="edit-ipProxyArpPvlan" className="font-normal text-sm">Private VLAN Proxy ARP</Label>
                </div>
              </div>
            </div>

            {/* IPv6 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">IPv6</h4>

              <div className="space-y-2">
                <Label htmlFor="edit-ipv6AcceptDad">Accept DAD</Label>
                <Select value={ipv6AcceptDad || "default"} onValueChange={(v) => setIpv6AcceptDad(v === "default" ? "" : v)}>
                  <SelectTrigger id="edit-ipv6AcceptDad"><SelectValue placeholder="Default" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="0">0 — Disabled</SelectItem>
                    <SelectItem value="1">1 — Enabled (default)</SelectItem>
                    <SelectItem value="2">2 — Enabled, disable IPv6 if MAC-based duplicate found</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-ipv6AdjustMss">Adjust TCP MSS (IPv6)</Label>
                <Select
                  value={ipv6AdjustMssMode}
                  onValueChange={(v) => {
                    if (v === "none") { setIpv6AdjustMss(""); setIpv6AdjustMssIsCustom(false); }
                    else if (v === "clamp") { setIpv6AdjustMss("clamp-mss-to-pmtu"); setIpv6AdjustMssIsCustom(false); }
                    else { setIpv6AdjustMss(""); setIpv6AdjustMssIsCustom(true); }
                  }}
                >
                  <SelectTrigger id="edit-ipv6AdjustMss"><SelectValue placeholder="None" /></SelectTrigger>
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
                <Label htmlFor="edit-ipv6BaseReachableTime">Base Reachable Time</Label>
                <Select
                  value={ipv6BaseReachableTimeMode}
                  onValueChange={(v) => {
                    if (v === "none") { setIpv6BaseReachableTime(""); setIpv6BaseReachableTimeIsCustom(false); }
                    else if (v === "custom") { setIpv6BaseReachableTime(""); setIpv6BaseReachableTimeIsCustom(true); }
                    else { setIpv6BaseReachableTime(v); setIpv6BaseReachableTimeIsCustom(false); }
                  }}
                >
                  <SelectTrigger id="edit-ipv6BaseReachableTime"><SelectValue placeholder="Default (30s)" /></SelectTrigger>
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
                <Label htmlFor="edit-ipv6DupAddrDetectTransmits">Duplicate Address Detect Transmits</Label>
                <Select
                  value={dadTransmitsMode}
                  onValueChange={(v) => {
                    if (v === "default") { setIpv6DupAddrDetectTransmits(""); setDadIsCustom(false); }
                    else if (v === "custom") { setIpv6DupAddrDetectTransmits(""); setDadIsCustom(true); }
                    else { setIpv6DupAddrDetectTransmits(v); setDadIsCustom(false); }
                  }}
                >
                  <SelectTrigger id="edit-ipv6DupAddrDetectTransmits"><SelectValue placeholder="Default" /></SelectTrigger>
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
                <Label htmlFor="edit-ipv6SourceValidation">Source Validation (IPv6)</Label>
                <Select value={ipv6SourceValidation || "none"} onValueChange={(v) => setIpv6SourceValidation(v === "none" ? "" : v)}>
                  <SelectTrigger id="edit-ipv6SourceValidation"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="strict">Strict</SelectItem>
                    <SelectItem value="loose">Loose</SelectItem>
                    <SelectItem value="disable">Disable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="edit-ipv6DisableForwarding" checked={ipv6DisableForwarding} onCheckedChange={(c) => setIpv6DisableForwarding(c === true)} />
                <Label htmlFor="edit-ipv6DisableForwarding" className="font-normal">Disable IPv6 Forwarding</Label>
              </div>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Traffic Mirroring &amp; Redirect</h4>
              <div className="space-y-2">
                <Label>Mirror Ingress →</Label>
                <InterfaceSelect
                  value={mirrorIngress || "none"}
                  onValueChange={(v) => setMirrorIngress(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: "None", value: "none" }}
                  placeholder="None"
                />
              </div>
              <div className="space-y-2">
                <Label>Mirror Egress →</Label>
                <InterfaceSelect
                  value={mirrorEgress || "none"}
                  onValueChange={(v) => setMirrorEgress(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: "None", value: "none" }}
                  placeholder="None"
                />
              </div>
              <div className="space-y-2">
                <Label>Redirect To</Label>
                <InterfaceSelect
                  value={redirect || "none"}
                  onValueChange={(v) => setRedirect(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: "None", value: "none" }}
                  placeholder="None"
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
