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
import { macsecService, type MacsecCapabilities } from "@/lib/api/macsec";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface StaticPeerEntry {
  name: string;
  key: string;
  mac: string;
  disable: boolean;
}

interface CreateMacsecModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: MacsecCapabilities | null;
  existingInterfaces: string[];
}

export function CreateMacsecModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
}: CreateMacsecModalProps) {
  const [allInterfaces, setAllInterfaces] = useState<InterfaceName[]>([]);

  useEffect(() => {
    if (open) {
      showService.getAllInterfaces().then((res) => setAllInterfaces(res.interfaces)).catch(() => {});
    }
  }, [open]);

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

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) resetForm();
    onOpenChange(newOpen);
  };

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

  const validateForm = (): string | null => {
    if (!name.trim()) return "Interface name is required";
    if (!/^macsec\d+$/.test(name)) return "Name must be macsec0, macsec1, etc.";
    if (existingInterfaces.includes(name)) return `Interface ${name} already exists`;
    if (!sourceInterface.trim()) return "Source interface is required";
    if (mtu && (parseInt(mtu) < 68 || parseInt(mtu) > 16000)) return "MTU must be between 68 and 16000";
    return null;
  };

  const handleSubmit = async () => {
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
        setError(result.error || "Failed to create MACsec interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to create MACsec interface");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Create MACsec Interface
          </DialogTitle>
          <DialogDescription>Create a new IEEE 802.1AE MACsec encrypted interface</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Interface Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="macsec0" />
                <p className="text-xs text-muted-foreground">Format: macsec0, macsec1, etc.</p>
              </div>
              <div className="space-y-2">
                <Label>Source Interface <span className="text-destructive">*</span></Label>
                <InterfaceSelect
                  value={sourceInterface}
                  onValueChange={setSourceInterface}
                  interfaces={allInterfaces}
                  placeholder="Select source interface"
                />
                <p className="text-xs text-muted-foreground">Physical ethernet interface for MACsec traffic</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="MACsec encrypted link" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mtu">MTU</Label>
                <Input id="mtu" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="1460 (default)" type="number" min={68} max={16000} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vrf">VRF</Label>
                <VrfSelect id="vrf" value={vrf} onValueChange={setVrf} />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="disabled" checked={disabled} onCheckedChange={(checked) => setDisabled(checked === true)} />
              <Label htmlFor="disabled" className="text-sm font-normal">Administratively disable interface</Label>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cipher">Cipher Suite</Label>
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
                <Label htmlFor="replayWindow">Replay Window</Label>
                <Input id="replayWindow" value={replayWindow} onChange={(e) => setReplayWindow(e.target.value)} placeholder="0 (strict)" type="number" min={0} />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="encrypt" checked={encrypt} onCheckedChange={(checked) => setEncrypt(checked === true)} />
              <Label htmlFor="encrypt" className="text-sm font-normal">Enable MACsec encryption</Label>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Security Mode</Label>
              <Select value={securityMode} onValueChange={(v) => setSecurityMode(v as "mka" | "static")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mka">MKA (Dynamic Key Agreement)</SelectItem>
                  <SelectItem value="static">Static Key</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {securityMode === "mka" ? (
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="text-sm font-medium">MACsec Key Agreement (MKA)</h4>
                <div className="space-y-2">
                  <Label htmlFor="cak">Connectivity Association Key (CAK)</Label>
                  <Input id="cak" value={mkaCak} onChange={(e) => setMkaCak(e.target.value)} placeholder={cipher === "gcm-aes-256" ? "64 hex characters" : "32 hex characters"} className="font-mono" />
                  <p className="text-xs text-muted-foreground">{cipher === "gcm-aes-256" ? "32-byte (256-bit) hex string — 64 hex digits" : "16-byte (128-bit) hex string — 32 hex digits"}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ckn">Connectivity Association Key Name (CKN)</Label>
                  <Input id="ckn" value={mkaCkn} onChange={(e) => setMkaCkn(e.target.value)} placeholder="2-64 hex characters" className="font-mono" />
                  <p className="text-xs text-muted-foreground">1-32 byte hex string (2-64 hex digits)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">MKA Priority</Label>
                  <Input id="priority" value={mkaPriority} onChange={(e) => setMkaPriority(e.target.value)} placeholder="255 (default)" type="number" min={0} max={255} />
                </div>
              </div>
            ) : (
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="text-sm font-medium">Static Key Configuration</h4>
                <div className="space-y-2">
                  <Label htmlFor="staticKey">Local Key</Label>
                  <Input id="staticKey" value={staticKey} onChange={(e) => setStaticKey(e.target.value)} placeholder={cipher === "gcm-aes-256" ? "64 hex characters" : "32 hex characters"} className="font-mono" />
                  <p className="text-xs text-muted-foreground">{cipher === "gcm-aes-256" ? "32-byte (256-bit) hex string — 64 hex digits" : "16-byte (128-bit) hex string — 32 hex digits"}</p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Static Peers</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addStaticPeer}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Peer
                  </Button>
                </div>

                {staticPeers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No static peers configured</p>
                )}

                {staticPeers.map((peer, index) => (
                  <div key={index} className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Peer {index + 1}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeStaticPeer(index)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input value={peer.name} onChange={(e) => updateStaticPeer(index, "name", e.target.value)} placeholder="peer0" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Key (hex)</Label>
                        <Input value={peer.key} onChange={(e) => updateStaticPeer(index, "key", e.target.value)} placeholder="hex key" className="h-8 text-sm font-mono" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">MAC Address</Label>
                        <Input value={peer.mac} onChange={(e) => updateStaticPeer(index, "mac", e.target.value)} placeholder="00:11:22:33:44:55" className="h-8 text-sm font-mono" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox checked={peer.disable} onCheckedChange={(checked) => updateStaticPeer(index, "disable", checked === true)} />
                      <Label className="text-xs font-normal">Disable this peer</Label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="addresses">IP Addresses</Label>
              <Input id="addresses" value={addresses} onChange={(e) => setAddresses(e.target.value)} placeholder="10.0.0.1/24, 192.168.1.1/24" />
              <p className="text-xs text-muted-foreground">Comma-separated CIDR addresses</p>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox id="useDhcp" checked={useDhcp} onCheckedChange={(checked) => setUseDhcp(checked === true)} />
                <Label htmlFor="useDhcp" className="text-sm font-normal">Enable DHCP</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="useDhcpv6" checked={useDhcpv6} onCheckedChange={(checked) => setUseDhcpv6(checked === true)} />
                <Label htmlFor="useDhcpv6" className="text-sm font-normal">Enable DHCPv6</Label>
              </div>
            </div>

            {useDhcp && (
              <>
                <Separator />
                <h4 className="text-sm font-medium">DHCP Options</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dhcpClientId" className="text-xs">Client ID</Label>
                    <Input id="dhcpClientId" value={dhcpClientId} onChange={(e) => setDhcpClientId(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dhcpHostName" className="text-xs">Host Name</Label>
                    <Input id="dhcpHostName" value={dhcpHostName} onChange={(e) => setDhcpHostName(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dhcpVendorClassId" className="text-xs">Vendor Class ID</Label>
                    <Input id="dhcpVendorClassId" value={dhcpVendorClassId} onChange={(e) => setDhcpVendorClassId(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dhcpDefaultRouteDistance" className="text-xs">Default Route Distance</Label>
                    <Input id="dhcpDefaultRouteDistance" value={dhcpDefaultRouteDistance} onChange={(e) => setDhcpDefaultRouteDistance(e.target.value)} className="h-8 text-sm" type="number" />
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="dhcpNoDefaultRoute" checked={dhcpNoDefaultRoute} onCheckedChange={(checked) => setDhcpNoDefaultRoute(checked === true)} />
                    <Label htmlFor="dhcpNoDefaultRoute" className="text-xs font-normal">No Default Route</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="dhcpMtu" checked={dhcpMtu} onCheckedChange={(checked) => setDhcpMtu(checked === true)} />
                    <Label htmlFor="dhcpMtu" className="text-xs font-normal">Request MTU</Label>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <h4 className="text-sm font-medium">IPv4 Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ipAdjustMss" className="text-xs">Adjust MSS</Label>
                <Input id="ipAdjustMss" value={ipAdjustMss} onChange={(e) => setIpAdjustMss(e.target.value)} placeholder="clamp-mss-to-pmtu or value" className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipArpCacheTimeout" className="text-xs">ARP Cache Timeout</Label>
                <Input id="ipArpCacheTimeout" value={ipArpCacheTimeout} onChange={(e) => setIpArpCacheTimeout(e.target.value)} className="h-8 text-sm" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipSourceValidation" className="text-xs">Source Validation</Label>
                <Select value={ipSourceValidation} onValueChange={setIpSourceValidation}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strict">Strict</SelectItem>
                    <SelectItem value="loose">Loose</SelectItem>
                    <SelectItem value="disable">Disable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="ipDisableArpFilter" checked={ipDisableArpFilter} onCheckedChange={(checked) => setIpDisableArpFilter(checked === true)} />
                <Label htmlFor="ipDisableArpFilter" className="text-xs font-normal">Disable ARP Filter</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipDisableForwarding" checked={ipDisableForwarding} onCheckedChange={(checked) => setIpDisableForwarding(checked === true)} />
                <Label htmlFor="ipDisableForwarding" className="text-xs font-normal">Disable Forwarding</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipEnableArpAccept" checked={ipEnableArpAccept} onCheckedChange={(checked) => setIpEnableArpAccept(checked === true)} />
                <Label htmlFor="ipEnableArpAccept" className="text-xs font-normal">Enable ARP Accept</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipEnableArpAnnounce" checked={ipEnableArpAnnounce} onCheckedChange={(checked) => setIpEnableArpAnnounce(checked === true)} />
                <Label htmlFor="ipEnableArpAnnounce" className="text-xs font-normal">Enable ARP Announce</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipEnableArpIgnore" checked={ipEnableArpIgnore} onCheckedChange={(checked) => setIpEnableArpIgnore(checked === true)} />
                <Label htmlFor="ipEnableArpIgnore" className="text-xs font-normal">Enable ARP Ignore</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipEnableDirectedBroadcast" checked={ipEnableDirectedBroadcast} onCheckedChange={(checked) => setIpEnableDirectedBroadcast(checked === true)} />
                <Label htmlFor="ipEnableDirectedBroadcast" className="text-xs font-normal">Enable Directed Broadcast</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipEnableProxyArp" checked={ipEnableProxyArp} onCheckedChange={(checked) => setIpEnableProxyArp(checked === true)} />
                <Label htmlFor="ipEnableProxyArp" className="text-xs font-normal">Enable Proxy ARP</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipProxyArpPvlan" checked={ipProxyArpPvlan} onCheckedChange={(checked) => setIpProxyArpPvlan(checked === true)} />
                <Label htmlFor="ipProxyArpPvlan" className="text-xs font-normal">Proxy ARP PVLAN</Label>
              </div>
            </div>

            <Separator />

            <h4 className="text-sm font-medium">IPv6 Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ipv6AcceptDad" className="text-xs">Accept DAD</Label>
                <Input id="ipv6AcceptDad" value={ipv6AcceptDad} onChange={(e) => setIpv6AcceptDad(e.target.value)} className="h-8 text-sm" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipv6DupAddrDetect" className="text-xs">DAD Transmits</Label>
                <Input id="ipv6DupAddrDetect" value={ipv6DupAddrDetect} onChange={(e) => setIpv6DupAddrDetect(e.target.value)} className="h-8 text-sm" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipv6AddressEui64" className="text-xs">EUI-64 Prefix</Label>
                <Input id="ipv6AddressEui64" value={ipv6AddressEui64} onChange={(e) => setIpv6AddressEui64(e.target.value)} className="h-8 text-sm" placeholder="2001:db8::/64" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipv6InterfaceIdentifier" className="text-xs">Interface Identifier</Label>
                <Input id="ipv6InterfaceIdentifier" value={ipv6InterfaceIdentifier} onChange={(e) => setIpv6InterfaceIdentifier(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipv6AdjustMss" className="text-xs">Adjust MSS</Label>
                <Input id="ipv6AdjustMss" value={ipv6AdjustMss} onChange={(e) => setIpv6AdjustMss(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipv6BaseReachableTime" className="text-xs">Base Reachable Time</Label>
                <Input id="ipv6BaseReachableTime" value={ipv6BaseReachableTime} onChange={(e) => setIpv6BaseReachableTime(e.target.value)} className="h-8 text-sm" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipv6SourceValidation" className="text-xs">Source Validation</Label>
                <Select value={ipv6SourceValidation} onValueChange={setIpv6SourceValidation}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strict">Strict</SelectItem>
                    <SelectItem value="loose">Loose</SelectItem>
                    <SelectItem value="disable">Disable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="ipv6AddressAutoconf" checked={ipv6AddressAutoconf} onCheckedChange={(checked) => setIpv6AddressAutoconf(checked === true)} />
                <Label htmlFor="ipv6AddressAutoconf" className="text-xs font-normal">Address Autoconf (SLAAC)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipv6NoDefaultLinkLocal" checked={ipv6NoDefaultLinkLocal} onCheckedChange={(checked) => setIpv6NoDefaultLinkLocal(checked === true)} />
                <Label htmlFor="ipv6NoDefaultLinkLocal" className="text-xs font-normal">No Default Link-Local</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="ipv6DisableForwarding" checked={ipv6DisableForwarding} onCheckedChange={(checked) => setIpv6DisableForwarding(checked === true)} />
                <Label htmlFor="ipv6DisableForwarding" className="text-xs font-normal">Disable Forwarding</Label>
              </div>
            </div>

            <Separator />

            <h4 className="text-sm font-medium">Mirror & Redirect</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mirrorIngress" className="text-xs">Mirror Ingress</Label>
                <Input id="mirrorIngress" value={mirrorIngress} onChange={(e) => setMirrorIngress(e.target.value)} className="h-8 text-sm" placeholder="eth1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mirrorEgress" className="text-xs">Mirror Egress</Label>
                <Input id="mirrorEgress" value={mirrorEgress} onChange={(e) => setMirrorEgress(e.target.value)} className="h-8 text-sm" placeholder="eth1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redirect" className="text-xs">Redirect</Label>
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
