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
import { Cable, Loader2 } from "lucide-react";
import { l2tpv3Service, type L2TPv3Capabilities } from "@/lib/api/l2tpv3";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface CreateL2TPv3ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: L2TPv3Capabilities | null;
  existingInterfaces: string[];
}

export function CreateL2TPv3Modal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
}: CreateL2TPv3ModalProps) {
  // General
  const [name, setName] = useState("l2tpeth0");
  const [description, setDescription] = useState("");
  const [remote, setRemote] = useState("");
  const [sourceAddress, setSourceAddress] = useState("");
  const [tunnelId, setTunnelId] = useState("");
  const [peerTunnelId, setPeerTunnelId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [peerSessionId, setPeerSessionId] = useState("");
  const [encapsulation, setEncapsulation] = useState("");
  const [destinationPort, setDestinationPort] = useState("");
  const [sourcePort, setSourcePort] = useState("");
  const [mtu, setMtu] = useState("");
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

  // Advanced - Traffic Mirroring
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");

  // Available interfaces for dropdowns
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getNextInterfaceName = (): string => {
    let i = 0;
    while (existingInterfaces.includes(`l2tpeth${i}`)) {
      i++;
    }
    return `l2tpeth${i}`;
  };

  const resetForm = () => {
    setName(getNextInterfaceName());
    setDescription("");
    setRemote("");
    setSourceAddress("");
    setTunnelId("");
    setPeerTunnelId("");
    setSessionId("");
    setPeerSessionId("");
    setEncapsulation("");
    setDestinationPort("");
    setSourcePort("");
    setMtu("");
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
    setMirrorIngress("");
    setMirrorEgress("");
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
    if (!/^l2tpeth\d+$/.test(name)) return "Name must be l2tpeth0, l2tpeth1, etc.";
    if (existingInterfaces.includes(name)) return `Interface ${name} already exists`;
    if (!remote.trim()) return "Remote address is required";
    if (mtu.trim()) {
      const mtuNum = parseInt(mtu.trim(), 10);
      if (isNaN(mtuNum) || mtuNum < 68 || mtuNum > 16000) {
        return "MTU must be between 68 and 16000";
      }
    }
    if (tunnelId.trim()) {
      const tid = parseInt(tunnelId.trim(), 10);
      if (isNaN(tid) || tid < 1 || tid > 429496729) return "Tunnel ID must be between 1 and 429496729";
    }
    if (peerTunnelId.trim()) {
      const ptid = parseInt(peerTunnelId.trim(), 10);
      if (isNaN(ptid) || ptid < 1 || ptid > 429496729) return "Peer Tunnel ID must be between 1 and 429496729";
    }
    if (sessionId.trim()) {
      const sid = parseInt(sessionId.trim(), 10);
      if (isNaN(sid) || sid < 1 || sid > 429496729) return "Session ID must be between 1 and 429496729";
    }
    if (peerSessionId.trim()) {
      const psid = parseInt(peerSessionId.trim(), 10);
      if (isNaN(psid) || psid < 1 || psid > 429496729) return "Peer Session ID must be between 1 and 429496729";
    }
    if (destinationPort.trim()) {
      const dp = parseInt(destinationPort.trim(), 10);
      if (isNaN(dp) || dp < 1 || dp > 65535) return "Destination port must be between 1 and 65535";
    }
    if (sourcePort.trim()) {
      const sp = parseInt(sourcePort.trim(), 10);
      if (isNaN(sp) || sp < 1 || sp > 65535) return "Source port must be between 1 and 65535";
    }
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
      const addrList = addresses.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);
      const eui64List = ipv6AddressEui64.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);

      const config: Parameters<typeof l2tpv3Service.createInterface>[0] = {
        name,
        remote: remote.trim(),
      };

      // L2TPv3-specific
      if (sourceAddress.trim()) config.source_address = sourceAddress.trim();
      if (tunnelId.trim()) config.tunnel_id = tunnelId.trim();
      if (peerTunnelId.trim()) config.peer_tunnel_id = peerTunnelId.trim();
      if (sessionId.trim()) config.session_id = sessionId.trim();
      if (peerSessionId.trim()) config.peer_session_id = peerSessionId.trim();
      if (encapsulation) config.encapsulation = encapsulation;
      if (destinationPort.trim()) config.destination_port = destinationPort.trim();
      if (sourcePort.trim()) config.source_port = sourcePort.trim();

      // General
      if (description.trim()) config.description = description.trim();
      if (mtu.trim()) config.mtu = mtu.trim();
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

      // Traffic Mirroring
      if (mirrorIngress.trim()) config.mirror_ingress = mirrorIngress.trim();
      if (mirrorEgress.trim()) config.mirror_egress = mirrorEgress.trim();

      const result = await l2tpv3Service.createInterface(config);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to create L2TPv3 interface");
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
            <Cable className="h-5 w-5" />
            Create L2TPv3 Interface
          </DialogTitle>
          <DialogDescription>
            Create a new L2TPv3 tunnel interface for Layer 2 tunneling.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-2">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="ip">IP Settings</TabsTrigger>
            <TabsTrigger value="ipv6">IPv6 Settings</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Interface Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="l2tpeth0"
              />
              <p className="text-xs text-muted-foreground">Must match pattern: l2tpeth0, l2tpeth1, l2tpeth2, ...</p>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="remote">Remote Address <span className="text-destructive">*</span></Label>
                <Input
                  id="remote"
                  value={remote}
                  onChange={(e) => setRemote(e.target.value)}
                  placeholder="10.0.0.1 or 2001:db8::1"
                />
                <p className="text-xs text-muted-foreground">Remote tunnel endpoint</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceAddress">Source Address</Label>
                <Input
                  id="sourceAddress"
                  value={sourceAddress}
                  onChange={(e) => setSourceAddress(e.target.value)}
                  placeholder="10.0.0.2 or 2001:db8::2"
                />
                <p className="text-xs text-muted-foreground">Local source IP</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tunnelId">Tunnel ID</Label>
                <Input
                  id="tunnelId"
                  value={tunnelId}
                  onChange={(e) => setTunnelId(e.target.value)}
                  placeholder="1-429496729"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peerTunnelId">Peer Tunnel ID</Label>
                <Input
                  id="peerTunnelId"
                  value={peerTunnelId}
                  onChange={(e) => setPeerTunnelId(e.target.value)}
                  placeholder="1-429496729"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sessionId">Session ID</Label>
                <Input
                  id="sessionId"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="1-429496729"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peerSessionId">Peer Session ID</Label>
                <Input
                  id="peerSessionId"
                  value={peerSessionId}
                  onChange={(e) => setPeerSessionId(e.target.value)}
                  placeholder="1-429496729"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="encapsulation">Encapsulation</Label>
                <Select value={encapsulation || "default"} onValueChange={(v) => setEncapsulation(v === "default" ? "" : v)}>
                  <SelectTrigger id="encapsulation">
                    <SelectValue placeholder="Default (UDP)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (UDP)</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                    <SelectItem value="ip">IP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationPort">Destination Port</Label>
                <Input
                  id="destinationPort"
                  value={destinationPort}
                  onChange={(e) => setDestinationPort(e.target.value)}
                  placeholder="5000"
                />
                <p className="text-xs text-muted-foreground">Default: 5000</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourcePort">Source Port</Label>
                <Input
                  id="sourcePort"
                  value={sourcePort}
                  onChange={(e) => setSourcePort(e.target.value)}
                  placeholder="5000"
                />
                <p className="text-xs text-muted-foreground">Default: 5000</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mtu">MTU</Label>
                <Input
                  id="mtu"
                  value={mtu}
                  onChange={(e) => setMtu(e.target.value)}
                  placeholder="1488"
                />
                <p className="text-xs text-muted-foreground">Valid range: 68-16000 (default: 1488)</p>
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
              <Checkbox
                id="autoconf"
                checked={ipv6AddressAutoconf}
                onCheckedChange={(c) => setIpv6AddressAutoconf(c === true)}
              />
              <Label htmlFor="autoconf" className="font-normal">IPv6 SLAAC Autoconf</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="noDefaultLinkLocal"
                checked={ipv6AddressNoDefaultLinkLocal}
                onCheckedChange={(c) => setIpv6AddressNoDefaultLinkLocal(c === true)}
              />
              <Label htmlFor="noDefaultLinkLocal" className="font-normal">No Default Link-Local</Label>
            </div>

            {capabilities?.features.ipv6_address_interface_identifier?.supported && (
              <div className="space-y-2">
                <Label htmlFor="interfaceIdentifier">Interface Identifier (SLAAC)</Label>
                <Input
                  id="interfaceIdentifier"
                  value={ipv6AddressInterfaceIdentifier}
                  onChange={(e) => setIpv6AddressInterfaceIdentifier(e.target.value)}
                  placeholder="::1"
                />
              </div>
            )}
          </TabsContent>

          {/* IP Settings Tab */}
          <TabsContent value="ip" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ipAdjustMss">Adjust MSS</Label>
                <Input
                  id="ipAdjustMss"
                  value={ipAdjustMss}
                  onChange={(e) => setIpAdjustMss(e.target.value)}
                  placeholder="clamp-mss-to-pmtu or 536-65535"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipArpCacheTimeout">ARP Cache Timeout</Label>
                <Input
                  id="ipArpCacheTimeout"
                  value={ipArpCacheTimeout}
                  onChange={(e) => setIpArpCacheTimeout(e.target.value)}
                  placeholder="1-86400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceValidation">Source Validation</Label>
              <Select value={ipSourceValidation || "none"} onValueChange={(v) => setIpSourceValidation(v === "none" ? "" : v)}>
                <SelectTrigger id="sourceValidation">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="strict">Strict</SelectItem>
                  <SelectItem value="loose">Loose</SelectItem>
                  <SelectItem value="disable">Disable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="ipDisableArpFilter" checked={ipDisableArpFilter} onCheckedChange={(c) => setIpDisableArpFilter(c === true)} />
                <Label htmlFor="ipDisableArpFilter" className="font-normal">Disable ARP Filter</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ipDisableForwarding" checked={ipDisableForwarding} onCheckedChange={(c) => setIpDisableForwarding(c === true)} />
                <Label htmlFor="ipDisableForwarding" className="font-normal">Disable IPv4 Forwarding</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ipEnableArpAccept" checked={ipEnableArpAccept} onCheckedChange={(c) => setIpEnableArpAccept(c === true)} />
                <Label htmlFor="ipEnableArpAccept" className="font-normal">Enable ARP Accept</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ipEnableArpAnnounce" checked={ipEnableArpAnnounce} onCheckedChange={(c) => setIpEnableArpAnnounce(c === true)} />
                <Label htmlFor="ipEnableArpAnnounce" className="font-normal">Enable ARP Announce</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ipEnableArpIgnore" checked={ipEnableArpIgnore} onCheckedChange={(c) => setIpEnableArpIgnore(c === true)} />
                <Label htmlFor="ipEnableArpIgnore" className="font-normal">Enable ARP Ignore</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ipEnableDirectedBroadcast" checked={ipEnableDirectedBroadcast} onCheckedChange={(c) => setIpEnableDirectedBroadcast(c === true)} />
                <Label htmlFor="ipEnableDirectedBroadcast" className="font-normal">Enable Directed Broadcast</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ipEnableProxyArp" checked={ipEnableProxyArp} onCheckedChange={(c) => setIpEnableProxyArp(c === true)} />
                <Label htmlFor="ipEnableProxyArp" className="font-normal">Enable Proxy ARP</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ipProxyArpPvlan" checked={ipProxyArpPvlan} onCheckedChange={(c) => setIpProxyArpPvlan(c === true)} />
                <Label htmlFor="ipProxyArpPvlan" className="font-normal">Private VLAN Proxy ARP</Label>
              </div>
            </div>
          </TabsContent>

          {/* IPv6 Settings Tab */}
          <TabsContent value="ipv6" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="ipv6AcceptDad">Accept DAD</Label>
              <Select value={ipv6AcceptDad || "default"} onValueChange={(v) => setIpv6AcceptDad(v === "default" ? "" : v)}>
                <SelectTrigger id="ipv6AcceptDad">
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="0">0 - Disable DAD</SelectItem>
                  <SelectItem value="1">1 - Enable DAD</SelectItem>
                  <SelectItem value="2">2 - Enable DAD and disable if MAC-based duplicate link-local</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ipv6AdjustMss">Adjust MSS</Label>
                <Input
                  id="ipv6AdjustMss"
                  value={ipv6AdjustMss}
                  onChange={(e) => setIpv6AdjustMss(e.target.value)}
                  placeholder="clamp-mss-to-pmtu or 536-65535"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipv6BaseReachableTime">Base Reachable Time</Label>
                <Input
                  id="ipv6BaseReachableTime"
                  value={ipv6BaseReachableTime}
                  onChange={(e) => setIpv6BaseReachableTime(e.target.value)}
                  placeholder="1-86400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipv6DupAddrDetectTransmits">DAD Transmit Count</Label>
              <Input
                id="ipv6DupAddrDetectTransmits"
                value={ipv6DupAddrDetectTransmits}
                onChange={(e) => setIpv6DupAddrDetectTransmits(e.target.value)}
                placeholder="Number of NS messages"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipv6SourceValidation">Source Validation</Label>
              <Select value={ipv6SourceValidation || "none"} onValueChange={(v) => setIpv6SourceValidation(v === "none" ? "" : v)}>
                <SelectTrigger id="ipv6SourceValidation">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
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
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Traffic Mirroring</h4>
              <div className="space-y-2">
                <Label>Mirror Ingress &rarr;</Label>
                <InterfaceSelect
                  value={mirrorIngress || "none"}
                  onValueChange={(v) => setMirrorIngress(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: "None", value: "none" }}
                  placeholder="None"
                />
              </div>
              <div className="space-y-2">
                <Label>Mirror Egress &rarr;</Label>
                <InterfaceSelect
                  value={mirrorEgress || "none"}
                  onValueChange={(v) => setMirrorEgress(v === "none" ? "" : v)}
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
