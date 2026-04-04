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
import { Layers, Loader2 } from "lucide-react";
import { geneveService, type GeneveInterface, type GeneveCapabilities } from "@/lib/api/geneve";
import { showService, type InterfaceName } from "@/lib/api/show";
import { ApiError } from "@/lib/types/api";

interface EditGeneveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: GeneveInterface | null;
  capabilities: GeneveCapabilities | null;
}

export function EditGeneveModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
  capabilities,
}: EditGeneveModalProps) {
  // General
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

  useEffect(() => {
    if (interfaceData) {
      showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch(() => {});
      // General
      setDescription(interfaceData.description ?? "");
      setRemote(interfaceData.remote ?? "");
      setVni(interfaceData.vni ?? "");
      setPort(interfaceData.port ?? "");
      setMtu(interfaceData.mtu ?? "");
      setMac(interfaceData.mac ?? "");
      setVrf(interfaceData.vrf ?? "");
      setDisabled(interfaceData.disable ?? false);
      // Addresses
      setAddresses(interfaceData.addresses.join("\n"));
      setIpv6AddressEui64(interfaceData.ipv6_address_eui64.join("\n"));
      setIpv6AddressAutoconf(interfaceData.ipv6_address_autoconf ?? false);
      setIpv6AddressNoDefaultLinkLocal(interfaceData.ipv6_address_no_default_link_local ?? false);
      setIpv6AddressInterfaceIdentifier(interfaceData.ipv6_address_interface_identifier ?? "");
      // IP Settings
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
      // IPv6 Settings
      setIpv6AcceptDad(interfaceData.ipv6_accept_dad ?? "");
      setIpv6AdjustMss(interfaceData.ipv6_adjust_mss ?? "");
      setIpv6BaseReachableTime(interfaceData.ipv6_base_reachable_time ?? "");
      setIpv6DisableForwarding(interfaceData.ipv6_disable_forwarding ?? false);
      setIpv6DupAddrDetectTransmits(interfaceData.ipv6_dup_addr_detect_transmits ?? "");
      setIpv6SourceValidation(interfaceData.ipv6_source_validation ?? "");
      // Advanced - Tunnel Parameters
      setParametersDf(interfaceData.parameters_ip_df ?? "");
      setParametersTos(interfaceData.parameters_ip_tos ?? "");
      setParametersTtl(interfaceData.parameters_ip_ttl ?? "");
      setParametersInnerproto(interfaceData.parameters_ip_innerproto ?? false);
      setParametersFlowlabel(interfaceData.parameters_ipv6_flowlabel ?? "");
      // Advanced - Traffic Mirroring
      setMirrorIngress(interfaceData.mirror_ingress ?? "");
      setMirrorEgress(interfaceData.mirror_egress ?? "");
      setRedirect(interfaceData.redirect ?? "");
      setError(null);
    }
  }, [interfaceData]);

  const validateForm = (): string | null => {
    if (!remote.trim()) return "Remote address is required";
    if (mtu.trim()) {
      const mtuNum = parseInt(mtu.trim(), 10);
      if (isNaN(mtuNum) || mtuNum < 1200 || mtuNum > 16000) {
        return "MTU must be between 1200 and 16000";
      }
    }
    if (vni.trim()) {
      const vniNum = parseInt(vni.trim(), 10);
      if (isNaN(vniNum) || vniNum < 0 || vniNum > 16777214) {
        return "VNI must be between 0 and 16777214";
      }
    }
    if (port.trim()) {
      const portNum = parseInt(port.trim(), 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return "Port must be between 1 and 65535";
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!interfaceData) return;

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

      const result = await geneveService.updateInterface(interfaceData.name, interfaceData, {
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
        setError(result.error || "Failed to update GENEVE interface");
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
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Edit GENEVE Interface
          </DialogTitle>
          <DialogDescription>
            Editing interface{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
              {interfaceData.name}
            </code>
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
              <Label htmlFor="edit-remote">Remote Address <span className="text-destructive">*</span></Label>
              <Input
                id="edit-remote"
                value={remote}
                onChange={(e) => setRemote(e.target.value)}
                placeholder="10.0.0.1 or 2001:db8::1"
              />
              <p className="text-xs text-muted-foreground">IPv4 or IPv6 address of the remote tunnel endpoint</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-vni">VNI</Label>
                <Input
                  id="edit-vni"
                  value={vni}
                  onChange={(e) => setVni(e.target.value)}
                  placeholder="0-16777214"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-port">Port</Label>
                <Input
                  id="edit-port"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="6081"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-mtu">MTU</Label>
                <Input
                  id="edit-mtu"
                  value={mtu}
                  onChange={(e) => setMtu(e.target.value)}
                  placeholder="1500"
                />
                <p className="text-xs text-muted-foreground">Valid range: 1200-16000</p>
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
            </div>

            {capabilities?.features.mac?.supported && (
              <div className="space-y-2">
                <Label htmlFor="edit-mac">MAC Address</Label>
                <Input
                  id="edit-mac"
                  value={mac}
                  onChange={(e) => setMac(e.target.value)}
                  placeholder="xx:xx:xx:xx:xx:xx"
                />
              </div>
            )}

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
                id="edit-autoconf"
                checked={ipv6AddressAutoconf}
                onCheckedChange={(c) => setIpv6AddressAutoconf(c === true)}
              />
              <Label htmlFor="edit-autoconf" className="font-normal">IPv6 SLAAC Autoconf</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-noDefaultLinkLocal"
                checked={ipv6AddressNoDefaultLinkLocal}
                onCheckedChange={(c) => setIpv6AddressNoDefaultLinkLocal(c === true)}
              />
              <Label htmlFor="edit-noDefaultLinkLocal" className="font-normal">No Default Link-Local</Label>
            </div>

            {capabilities?.features.ipv6_address_interface_identifier?.supported && (
              <div className="space-y-2">
                <Label htmlFor="edit-interfaceIdentifier">Interface Identifier (SLAAC)</Label>
                <Input
                  id="edit-interfaceIdentifier"
                  value={ipv6AddressInterfaceIdentifier}
                  onChange={(e) => setIpv6AddressInterfaceIdentifier(e.target.value)}
                  placeholder="::1"
                />
                <p className="text-xs text-muted-foreground">VyOS 1.5+ only</p>
              </div>
            )}
          </TabsContent>

          {/* IP Settings Tab */}
          <TabsContent value="ip" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-ipAdjustMss">Adjust MSS</Label>
                <Input
                  id="edit-ipAdjustMss"
                  value={ipAdjustMss}
                  onChange={(e) => setIpAdjustMss(e.target.value)}
                  placeholder="e.g. 1360"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ipArpCacheTimeout">ARP Cache Timeout</Label>
                <Input
                  id="edit-ipArpCacheTimeout"
                  value={ipArpCacheTimeout}
                  onChange={(e) => setIpArpCacheTimeout(e.target.value)}
                  placeholder="1-86400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-sourceValidation">Source Validation</Label>
              <Select value={ipSourceValidation || "none"} onValueChange={(v) => setIpSourceValidation(v === "none" ? "" : v)}>
                <SelectTrigger id="edit-sourceValidation">
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
                <Checkbox id="edit-ipDisableArpFilter" checked={ipDisableArpFilter} onCheckedChange={(c) => setIpDisableArpFilter(c === true)} />
                <Label htmlFor="edit-ipDisableArpFilter" className="font-normal">Disable ARP Filter</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="edit-ipDisableForwarding" checked={ipDisableForwarding} onCheckedChange={(c) => setIpDisableForwarding(c === true)} />
                <Label htmlFor="edit-ipDisableForwarding" className="font-normal">Disable IPv4 Forwarding</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="edit-ipEnableArpAccept" checked={ipEnableArpAccept} onCheckedChange={(c) => setIpEnableArpAccept(c === true)} />
                <Label htmlFor="edit-ipEnableArpAccept" className="font-normal">Enable ARP Accept</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="edit-ipEnableArpAnnounce" checked={ipEnableArpAnnounce} onCheckedChange={(c) => setIpEnableArpAnnounce(c === true)} />
                <Label htmlFor="edit-ipEnableArpAnnounce" className="font-normal">Enable ARP Announce</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="edit-ipEnableArpIgnore" checked={ipEnableArpIgnore} onCheckedChange={(c) => setIpEnableArpIgnore(c === true)} />
                <Label htmlFor="edit-ipEnableArpIgnore" className="font-normal">Enable ARP Ignore</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="edit-ipEnableDirectedBroadcast" checked={ipEnableDirectedBroadcast} onCheckedChange={(c) => setIpEnableDirectedBroadcast(c === true)} />
                <Label htmlFor="edit-ipEnableDirectedBroadcast" className="font-normal">Enable Directed Broadcast</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="edit-ipEnableProxyArp" checked={ipEnableProxyArp} onCheckedChange={(c) => setIpEnableProxyArp(c === true)} />
                <Label htmlFor="edit-ipEnableProxyArp" className="font-normal">Enable Proxy ARP</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="edit-ipProxyArpPvlan" checked={ipProxyArpPvlan} onCheckedChange={(c) => setIpProxyArpPvlan(c === true)} />
                <Label htmlFor="edit-ipProxyArpPvlan" className="font-normal">Private VLAN Proxy ARP</Label>
              </div>
            </div>
          </TabsContent>

          {/* IPv6 Settings Tab */}
          <TabsContent value="ipv6" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-ipv6AcceptDad">Accept DAD</Label>
              <Select value={ipv6AcceptDad || "default"} onValueChange={(v) => setIpv6AcceptDad(v === "default" ? "" : v)}>
                <SelectTrigger id="edit-ipv6AcceptDad">
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
                <Label htmlFor="edit-ipv6AdjustMss">Adjust MSS</Label>
                <Input
                  id="edit-ipv6AdjustMss"
                  value={ipv6AdjustMss}
                  onChange={(e) => setIpv6AdjustMss(e.target.value)}
                  placeholder="e.g. 1340"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ipv6BaseReachableTime">Base Reachable Time</Label>
                <Input
                  id="edit-ipv6BaseReachableTime"
                  value={ipv6BaseReachableTime}
                  onChange={(e) => setIpv6BaseReachableTime(e.target.value)}
                  placeholder="1-86400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-ipv6DupAddrDetectTransmits">DAD Transmit Count</Label>
              <Input
                id="edit-ipv6DupAddrDetectTransmits"
                value={ipv6DupAddrDetectTransmits}
                onChange={(e) => setIpv6DupAddrDetectTransmits(e.target.value)}
                placeholder="Number of NS messages"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-ipv6SourceValidation">Source Validation</Label>
              <Select value={ipv6SourceValidation || "none"} onValueChange={(v) => setIpv6SourceValidation(v === "none" ? "" : v)}>
                <SelectTrigger id="edit-ipv6SourceValidation">
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
              <Checkbox id="edit-ipv6DisableForwarding" checked={ipv6DisableForwarding} onCheckedChange={(c) => setIpv6DisableForwarding(c === true)} />
              <Label htmlFor="edit-ipv6DisableForwarding" className="font-normal">Disable IPv6 Forwarding</Label>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            {/* Tunnel Parameters */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Tunnel Parameters</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-parametersDf">Don&apos;t Fragment (DF)</Label>
                  <Select value={parametersDf || "none"} onValueChange={(v) => setParametersDf(v === "none" ? "" : v)}>
                    <SelectTrigger id="edit-parametersDf">
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Default</SelectItem>
                      <SelectItem value="set">Set</SelectItem>
                      <SelectItem value="unset">Unset</SelectItem>
                      <SelectItem value="inherit">Inherit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-parametersTos">TOS</Label>
                  <Input
                    id="edit-parametersTos"
                    value={parametersTos}
                    onChange={(e) => setParametersTos(e.target.value)}
                    placeholder="0-99"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-parametersTtl">TTL</Label>
                  <Input
                    id="edit-parametersTtl"
                    value={parametersTtl}
                    onChange={(e) => setParametersTtl(e.target.value)}
                    placeholder="0-255"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-parametersFlowlabel">Flow Label</Label>
                  <Input
                    id="edit-parametersFlowlabel"
                    value={parametersFlowlabel}
                    onChange={(e) => setParametersFlowlabel(e.target.value)}
                    placeholder="inherit or hex value"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="edit-parametersInnerproto" checked={parametersInnerproto} onCheckedChange={(c) => setParametersInnerproto(c === true)} />
                <Label htmlFor="edit-parametersInnerproto" className="font-normal">Use IPv4 as Inner Protocol</Label>
              </div>
            </div>

            {/* Traffic Mirroring */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Traffic Mirroring</h4>
              <div className="space-y-2">
                <Label>Mirror Ingress &rarr;</Label>
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
                <Label>Mirror Egress &rarr;</Label>
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
