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
import { AlertCircle, Loader2, Network, X, Plus } from "lucide-react";
import { bridgeService, type BridgeCapabilities } from "@/lib/api/bridge";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface MemberFormState {
  name: string;
  cost: string;
  priority: string;
  isolated: boolean;
  native_vlan: string;
  allowed_vlan: string;
  bpdu_guard: boolean;
  root_guard: boolean;
}

interface CreateBridgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: BridgeCapabilities | null;
  existingInterfaces: string[];
}

export function CreateBridgeModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
}: CreateBridgeModalProps) {
  // Basic
  const [name, setName] = useState("br0");
  const [description, setDescription] = useState("");
  const [stp, setStp] = useState(false);
  const [protocol, setProtocol] = useState("");
  const [aging, setAging] = useState("");
  const [forwardingDelay, setForwardingDelay] = useState("");
  const [helloTime, setHelloTime] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [bridgePriority, setBridgePriority] = useState("");
  const [igmpSnooping, setIgmpSnooping] = useState(false);
  const [igmpQuerier, setIgmpQuerier] = useState(false);
  const [enableVlan, setEnableVlan] = useState(false);

  // Members
  const [members, setMembers] = useState<MemberFormState[]>([]);
  const [memberToAdd, setMemberToAdd] = useState("");

  // Addresses
  const [addresses, setAddresses] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [mac, setMac] = useState("");
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");

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
  const [ipv6AddressAutoconf, setIpv6AddressAutoconf] = useState(false);
  const [ipv6AddressNoDefaultLinkLocal, setIpv6AddressNoDefaultLinkLocal] = useState(false);
  const [ipv6AddressEui64, setIpv6AddressEui64] = useState("");
  const [ipv6AddressInterfaceIdentifier, setIpv6AddressInterfaceIdentifier] = useState("");

  // Advanced
  const [redirect, setRedirect] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [disableLinkDetect, setDisableLinkDetect] = useState(false);
  const [dhcpClientId, setDhcpClientId] = useState("");
  const [dhcpDefaultRouteDistance, setDhcpDefaultRouteDistance] = useState("");
  const [dhcpHostName, setDhcpHostName] = useState("");
  const [dhcpUserClass, setDhcpUserClass] = useState("");
  const [dhcpVendorClassId, setDhcpVendorClassId] = useState("");
  const [dhcpMtu, setDhcpMtu] = useState(false);
  const [dhcpNoDefaultRoute, setDhcpNoDefaultRoute] = useState(false);
  const [dhcpReject, setDhcpReject] = useState("");
  const [dhcpv6Duid, setDhcpv6Duid] = useState("");
  const [dhcpv6NoRelease, setDhcpv6NoRelease] = useState(false);
  const [dhcpv6ParametersOnly, setDhcpv6ParametersOnly] = useState(false);
  const [dhcpv6RapidCommit, setDhcpv6RapidCommit] = useState(false);
  const [dhcpv6Temporary, setDhcpv6Temporary] = useState(false);
  const [dhcpv6NoRequestDns, setDhcpv6NoRequestDns] = useState(false);
  const [dhcpv6NoRequestDomainName, setDhcpv6NoRequestDomainName] = useState(false);

  // Available interfaces
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
    while (existingInterfaces.includes(`br${i}`)) {
      i++;
    }
    return `br${i}`;
  };

  const resetForm = () => {
    setName(getNextInterfaceName());
    setDescription("");
    setStp(false);
    setProtocol("");
    setAging("");
    setForwardingDelay("");
    setHelloTime("");
    setMaxAge("");
    setBridgePriority("");
    setIgmpSnooping(false);
    setIgmpQuerier(false);
    setEnableVlan(false);
    setMembers([]);
    setMemberToAdd("");
    setAddresses("");
    setMtu("");
    setVrf("");
    setMac("");
    setMirrorIngress("");
    setMirrorEgress("");
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
    setIpv6AddressInterfaceIdentifier("");
    setRedirect("");
    setDisabled(false);
    setDisableLinkDetect(false);
    setDhcpClientId("");
    setDhcpDefaultRouteDistance("");
    setDhcpHostName("");
    setDhcpUserClass("");
    setDhcpVendorClassId("");
    setDhcpMtu(false);
    setDhcpNoDefaultRoute(false);
    setDhcpReject("");
    setDhcpv6Duid("");
    setDhcpv6NoRelease(false);
    setDhcpv6ParametersOnly(false);
    setDhcpv6RapidCommit(false);
    setDhcpv6Temporary(false);
    setDhcpv6NoRequestDns(false);
    setDhcpv6NoRequestDomainName(false);
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const validateForm = (): string | null => {
    if (!name.trim()) return "Interface name is required";
    if (!/^br\d+$/.test(name)) return "Name must be br0, br1, etc.";
    if (existingInterfaces.includes(name)) return `Interface ${name} already exists`;
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
      const addrList = addresses.split(/[,\n]/).map((a) => a.trim()).filter(Boolean);
      const eui64List = ipv6AddressEui64.split(/[,\n]/).map((a) => a.trim()).filter(Boolean);
      const dhcpRejectList = dhcpReject.split(/[,\n]/).map((a) => a.trim()).filter(Boolean);

      const config: Parameters<typeof bridgeService.createInterface>[0] = {
        name,
      };

      if (description.trim()) config.description = description.trim();
      if (addrList.length > 0) config.addresses = addrList;
      if (mtu.trim()) config.mtu = mtu.trim();
      if (vrf.trim()) config.vrf = vrf.trim();
      if (mac.trim()) config.mac = mac.trim();
      if (redirect.trim()) config.redirect = redirect.trim();
      if (disabled) config.disabled = true;
      if (disableLinkDetect) config.disable_link_detect = true;

      // Bridge-specific
      if (stp) config.stp = true;
      if (enableVlan) config.enable_vlan = true;
      if (protocol && stp) config.protocol = protocol;
      if (aging.trim() && stp) config.aging = aging.trim();
      if (forwardingDelay.trim() && stp) config.forwarding_delay = forwardingDelay.trim();
      if (helloTime.trim() && stp) config.hello_time = helloTime.trim();
      if (maxAge.trim() && stp) config.max_age = maxAge.trim();
      if (bridgePriority.trim() && stp) config.priority = bridgePriority.trim();
      if (igmpSnooping) config.igmp_snooping = true;
      if (igmpQuerier) config.igmp_querier = true;

      // Members
      if (members.length > 0) {
        config.members = members.map((m) => {
          const member: NonNullable<typeof config.members>[0] = { name: m.name };
          if (m.cost.trim()) member.cost = m.cost.trim();
          if (m.priority.trim()) member.priority = m.priority.trim();
          if (m.isolated) member.isolated = true;
          if (m.native_vlan.trim() && enableVlan) member.native_vlan = m.native_vlan.trim();
          if (m.allowed_vlan.trim() && enableVlan) {
            member.allowed_vlan = m.allowed_vlan.split(/[,\n]/).map((v) => v.trim()).filter(Boolean);
          }
          if (m.bpdu_guard) member.bpdu_guard = true;
          if (m.root_guard) member.root_guard = true;
          return member;
        });
      }

      // Mirror
      if (mirrorIngress.trim() || mirrorEgress.trim()) {
        config.mirror = {};
        if (mirrorIngress.trim()) config.mirror.ingress = mirrorIngress.trim();
        if (mirrorEgress.trim()) config.mirror.egress = mirrorEgress.trim();
      }

      // IP
      if (ipAdjustMss || ipArpCacheTimeout || ipSourceValidation || ipDisableArpFilter ||
          ipDisableForwarding || ipEnableArpAccept || ipEnableArpAnnounce || ipEnableArpIgnore ||
          ipEnableDirectedBroadcast || ipEnableProxyArp || ipProxyArpPvlan) {
        config.ip = {
          adjust_mss: ipAdjustMss.trim() || undefined,
          arp_cache_timeout: ipArpCacheTimeout.trim() || undefined,
          source_validation: ipSourceValidation || undefined,
          disable_arp_filter: ipDisableArpFilter || undefined,
          disable_forwarding: ipDisableForwarding || undefined,
          enable_arp_accept: ipEnableArpAccept || undefined,
          enable_arp_announce: ipEnableArpAnnounce || undefined,
          enable_arp_ignore: ipEnableArpIgnore || undefined,
          enable_directed_broadcast: ipEnableDirectedBroadcast || undefined,
          enable_proxy_arp: ipEnableProxyArp || undefined,
          proxy_arp_pvlan: ipProxyArpPvlan || undefined,
        };
      }

      // IPv6
      if (ipv6AcceptDad || ipv6AdjustMss || ipv6BaseReachableTime || ipv6DupAddrDetectTransmits ||
          ipv6SourceValidation || ipv6DisableForwarding || ipv6AddressAutoconf || eui64List.length > 0 ||
          ipv6AddressNoDefaultLinkLocal || ipv6AddressInterfaceIdentifier) {
        config.ipv6 = {
          accept_dad: ipv6AcceptDad.trim() || undefined,
          adjust_mss: ipv6AdjustMss.trim() || undefined,
          base_reachable_time: ipv6BaseReachableTime.trim() || undefined,
          dup_addr_detect_transmits: ipv6DupAddrDetectTransmits.trim() || undefined,
          source_validation: ipv6SourceValidation || undefined,
          disable_forwarding: ipv6DisableForwarding || undefined,
          address_autoconf: ipv6AddressAutoconf || undefined,
          address_eui64: eui64List.length > 0 ? eui64List : undefined,
          address_no_default_link_local: ipv6AddressNoDefaultLinkLocal || undefined,
          address_interface_identifier: ipv6AddressInterfaceIdentifier.trim() || undefined,
        };
      }

      // DHCP Options
      if (dhcpClientId || dhcpDefaultRouteDistance || dhcpHostName || dhcpUserClass ||
          dhcpVendorClassId || dhcpMtu || dhcpNoDefaultRoute || dhcpRejectList.length > 0) {
        config.dhcp_options = {
          client_id: dhcpClientId.trim() || undefined,
          default_route_distance: dhcpDefaultRouteDistance.trim() || undefined,
          host_name: dhcpHostName.trim() || undefined,
          user_class: dhcpUserClass.trim() || undefined,
          vendor_class_id: dhcpVendorClassId.trim() || undefined,
          mtu: dhcpMtu || undefined,
          no_default_route: dhcpNoDefaultRoute || undefined,
          reject: dhcpRejectList.length > 0 ? dhcpRejectList : undefined,
        };
      }

      // DHCPv6 Options
      if (dhcpv6Duid || dhcpv6NoRelease || dhcpv6ParametersOnly || dhcpv6RapidCommit ||
          dhcpv6Temporary || dhcpv6NoRequestDns || dhcpv6NoRequestDomainName) {
        config.dhcpv6_options = {
          duid: dhcpv6Duid.trim() || undefined,
          no_release: dhcpv6NoRelease || undefined,
          parameters_only: dhcpv6ParametersOnly || undefined,
          rapid_commit: dhcpv6RapidCommit || undefined,
          temporary: dhcpv6Temporary || undefined,
          no_request_dns: dhcpv6NoRequestDns || undefined,
          no_request_domain_name: dhcpv6NoRequestDomainName || undefined,
        };
      }

      const result = await bridgeService.createInterface(config);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to create bridge interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to create bridge interface");
    } finally {
      setLoading(false);
    }
  };

  const selectableInterfaces = availableInterfaces.filter(
    (i) => (i.name.startsWith("eth") || i.name.startsWith("vxlan") || i.name.startsWith("tun") || i.name.startsWith("wg") || i.name.startsWith("bond")) && !members.some((m) => m.name === i.name)
  );

  const addMember = () => {
    if (memberToAdd && !members.some((m) => m.name === memberToAdd)) {
      setMembers([...members, {
        name: memberToAdd,
        cost: "",
        priority: "",
        isolated: false,
        native_vlan: "",
        allowed_vlan: "",
        bpdu_guard: false,
        root_guard: false,
      }]);
      setMemberToAdd("");
    }
  };

  const updateMember = (index: number, field: keyof MemberFormState, value: string | boolean) => {
    setMembers(members.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Create Bridge Interface
          </DialogTitle>
          <DialogDescription>
            Create a new bridge interface for layer-2 network bridging
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="ip">IP / IPv6</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Interface Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="br0" />
                <p className="text-xs text-muted-foreground">Must be br0, br1, etc.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} />
                <Label className="font-normal text-sm">Administratively Disabled</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={disableLinkDetect} onCheckedChange={(c) => setDisableLinkDetect(c === true)} />
                <Label className="font-normal text-sm">Disable Link Detect</Label>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={stp} onCheckedChange={(c) => setStp(c === true)} />
                <Label className="font-medium text-sm">Enable Spanning Tree Protocol (STP)</Label>
              </div>
              {stp && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Protocol</Label>
                      <Select value={protocol} onValueChange={setProtocol}>
                        <SelectTrigger><SelectValue placeholder="Select protocol" /></SelectTrigger>
                        <SelectContent>
                          {(capabilities?.features.protocol?.options || ["802.1d", "802.1w"]).map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bridge-priority">Priority</Label>
                      <Input id="bridge-priority" value={bridgePriority} onChange={(e) => setBridgePriority(e.target.value)} placeholder="32768" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="aging">Aging (seconds)</Label>
                      <Input id="aging" value={aging} onChange={(e) => setAging(e.target.value)} placeholder="300" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="forwarding-delay">Forwarding Delay (seconds)</Label>
                      <Input id="forwarding-delay" value={forwardingDelay} onChange={(e) => setForwardingDelay(e.target.value)} placeholder="15" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hello-time">Hello Time (seconds)</Label>
                      <Input id="hello-time" value={helloTime} onChange={(e) => setHelloTime(e.target.value)} placeholder="2" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-age">Max Age (seconds)</Label>
                      <Input id="max-age" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} placeholder="20" />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox checked={igmpSnooping} onCheckedChange={(c) => setIgmpSnooping(c === true)} />
                <Label className="font-normal text-sm">IGMP Snooping</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={igmpQuerier} onCheckedChange={(c) => setIgmpQuerier(c === true)} />
                <Label className="font-normal text-sm">IGMP Querier</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={enableVlan} onCheckedChange={(c) => setEnableVlan(c === true)} />
                <Label className="font-normal text-sm">Enable VLAN-Aware Bridge</Label>
              </div>
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Member Interfaces</Label>
              <p className="text-sm text-muted-foreground">
                Select interfaces to include in this bridge. Configure per-member STP and VLAN properties below.
              </p>
            </div>

            <div className="flex gap-2">
              <InterfaceSelect
                value={memberToAdd}
                onValueChange={setMemberToAdd}
                interfaces={selectableInterfaces}
                className="flex-1"
                placeholder="Select an interface to add"
              />
              <Button variant="outline" onClick={addMember} disabled={!memberToAdd}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            {members.length > 0 ? (
              <div className="space-y-3">
                {members.map((member, idx) => (
                  <div key={member.name} className="rounded-lg border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <code className="font-mono text-sm font-semibold">{member.name}</code>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeMember(idx)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">STP Cost</Label>
                        <Input className="h-8 text-sm" value={member.cost} onChange={(e) => updateMember(idx, "cost", e.target.value)} placeholder="Default" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">STP Priority</Label>
                        <Input className="h-8 text-sm" value={member.priority} onChange={(e) => updateMember(idx, "priority", e.target.value)} placeholder="Default" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      <div className="flex items-center gap-1.5">
                        <Checkbox checked={member.isolated} onCheckedChange={(c) => updateMember(idx, "isolated", c === true)} />
                        <Label className="font-normal text-xs">Isolated</Label>
                      </div>
                      {capabilities?.features.member_interface_bpdu_guard?.supported && (
                        <div className="flex items-center gap-1.5">
                          <Checkbox checked={member.bpdu_guard} onCheckedChange={(c) => updateMember(idx, "bpdu_guard", c === true)} />
                          <Label className="font-normal text-xs">BPDU Guard</Label>
                        </div>
                      )}
                      {capabilities?.features.member_interface_root_guard?.supported && (
                        <div className="flex items-center gap-1.5">
                          <Checkbox checked={member.root_guard} onCheckedChange={(c) => updateMember(idx, "root_guard", c === true)} />
                          <Label className="font-normal text-xs">Root Guard</Label>
                        </div>
                      )}
                    </div>
                    {enableVlan && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Native VLAN</Label>
                          <Input className="h-8 text-sm" value={member.native_vlan} onChange={(e) => updateMember(idx, "native_vlan", e.target.value)} placeholder="VLAN ID" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Allowed VLANs</Label>
                          <Input className="h-8 text-sm" value={member.allowed_vlan} onChange={(e) => updateMember(idx, "allowed_vlan", e.target.value)} placeholder="1,2,10-20" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""} selected</p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">No members selected. Add interfaces above.</p>
              </div>
            )}
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="addresses">IP Addresses</Label>
              <Input id="addresses" value={addresses} onChange={(e) => setAddresses(e.target.value)} placeholder="192.168.1.1/24, 10.0.0.1/24" />
              <p className="text-xs text-muted-foreground">Comma-separated CIDR addresses</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mtu">MTU</Label>
                <Input id="mtu" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="1500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vrf">VRF</Label>
                <Input id="vrf" value={vrf} onChange={(e) => setVrf(e.target.value)} placeholder="Optional VRF" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mac">MAC Override</Label>
                <Input id="mac" value={mac} onChange={(e) => setMac(e.target.value)} placeholder="xx:xx:xx:xx:xx:xx" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mirror Ingress</Label>
                <Input value={mirrorIngress} onChange={(e) => setMirrorIngress(e.target.value)} placeholder="Target interface" />
              </div>
              <div className="space-y-2">
                <Label>Mirror Egress</Label>
                <Input value={mirrorEgress} onChange={(e) => setMirrorEgress(e.target.value)} placeholder="Target interface" />
              </div>
            </div>
          </TabsContent>

          {/* IP / IPv6 Tab */}
          <TabsContent value="ip" className="space-y-6 mt-4">
            <div>
              <h4 className="font-medium mb-3">IPv4 Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Adjust MSS</Label>
                  <Input value={ipAdjustMss} onChange={(e) => setIpAdjustMss(e.target.value)} placeholder="clamp-mss-to-pmtu or value" />
                </div>
                <div className="space-y-2">
                  <Label>ARP Cache Timeout</Label>
                  <Input value={ipArpCacheTimeout} onChange={(e) => setIpArpCacheTimeout(e.target.value)} placeholder="30" />
                </div>
                <div className="space-y-2">
                  <Label>Source Validation</Label>
                  <Select value={ipSourceValidation} onValueChange={setIpSourceValidation}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strict">strict</SelectItem>
                      <SelectItem value="loose">loose</SelectItem>
                      <SelectItem value="disable">disable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {[
                  { label: "Disable ARP Filter", state: ipDisableArpFilter, setter: setIpDisableArpFilter },
                  { label: "Disable Forwarding", state: ipDisableForwarding, setter: setIpDisableForwarding },
                  { label: "Enable ARP Accept", state: ipEnableArpAccept, setter: setIpEnableArpAccept },
                  { label: "Enable ARP Announce", state: ipEnableArpAnnounce, setter: setIpEnableArpAnnounce },
                  { label: "Enable ARP Ignore", state: ipEnableArpIgnore, setter: setIpEnableArpIgnore },
                  { label: "Enable Directed Broadcast", state: ipEnableDirectedBroadcast, setter: setIpEnableDirectedBroadcast },
                  { label: "Enable Proxy ARP", state: ipEnableProxyArp, setter: setIpEnableProxyArp },
                  { label: "Proxy ARP PVLAN", state: ipProxyArpPvlan, setter: setIpProxyArpPvlan },
                ].map(({ label, state, setter }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Checkbox checked={state} onCheckedChange={(c) => setter(c === true)} />
                    <Label className="font-normal text-sm">{label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">IPv6 Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Accept DAD</Label>
                  <Input value={ipv6AcceptDad} onChange={(e) => setIpv6AcceptDad(e.target.value)} placeholder="0, 1, or 2" />
                </div>
                <div className="space-y-2">
                  <Label>Adjust MSS</Label>
                  <Input value={ipv6AdjustMss} onChange={(e) => setIpv6AdjustMss(e.target.value)} placeholder="clamp-mss-to-pmtu or value" />
                </div>
                <div className="space-y-2">
                  <Label>Base Reachable Time</Label>
                  <Input value={ipv6BaseReachableTime} onChange={(e) => setIpv6BaseReachableTime(e.target.value)} placeholder="30" />
                </div>
                <div className="space-y-2">
                  <Label>DAD Transmits</Label>
                  <Input value={ipv6DupAddrDetectTransmits} onChange={(e) => setIpv6DupAddrDetectTransmits(e.target.value)} placeholder="1" />
                </div>
                <div className="space-y-2">
                  <Label>Source Validation</Label>
                  <Select value={ipv6SourceValidation} onValueChange={setIpv6SourceValidation}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strict">strict</SelectItem>
                      <SelectItem value="loose">loose</SelectItem>
                      <SelectItem value="disable">disable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {capabilities?.features.ipv6_address_interface_identifier?.supported && (
                  <div className="space-y-2">
                    <Label>Interface Identifier</Label>
                    <Input value={ipv6AddressInterfaceIdentifier} onChange={(e) => setIpv6AddressInterfaceIdentifier(e.target.value)} placeholder="::1" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={ipv6DisableForwarding} onCheckedChange={(c) => setIpv6DisableForwarding(c === true)} />
                  <Label className="font-normal text-sm">Disable Forwarding</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={ipv6AddressAutoconf} onCheckedChange={(c) => setIpv6AddressAutoconf(c === true)} />
                  <Label className="font-normal text-sm">Address Autoconf</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={ipv6AddressNoDefaultLinkLocal} onCheckedChange={(c) => setIpv6AddressNoDefaultLinkLocal(c === true)} />
                  <Label className="font-normal text-sm">No Default Link-Local</Label>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <Label>EUI-64 Addresses</Label>
                <Input value={ipv6AddressEui64} onChange={(e) => setIpv6AddressEui64(e.target.value)} placeholder="2001:db8::/64" />
                <p className="text-xs text-muted-foreground">Comma-separated IPv6 prefixes</p>
              </div>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6 mt-4">
            {/* Redirect */}
            <div>
              <h4 className="font-medium mb-3">Interface Options</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Redirect</Label>
                  <Input value={redirect} onChange={(e) => setRedirect(e.target.value)} placeholder="Target interface" />
                </div>
              </div>
            </div>

            {/* DHCP Options */}
            <div>
              <h4 className="font-medium mb-3">DHCP Options</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <Input value={dhcpClientId} onChange={(e) => setDhcpClientId(e.target.value)} placeholder="Client identifier" />
                </div>
                <div className="space-y-2">
                  <Label>Default Route Distance</Label>
                  <Input value={dhcpDefaultRouteDistance} onChange={(e) => setDhcpDefaultRouteDistance(e.target.value)} placeholder="210" />
                </div>
                <div className="space-y-2">
                  <Label>Host Name</Label>
                  <Input value={dhcpHostName} onChange={(e) => setDhcpHostName(e.target.value)} placeholder="Hostname" />
                </div>
                <div className="space-y-2">
                  <Label>User Class</Label>
                  <Input value={dhcpUserClass} onChange={(e) => setDhcpUserClass(e.target.value)} placeholder="User class" />
                </div>
                <div className="space-y-2">
                  <Label>Vendor Class ID</Label>
                  <Input value={dhcpVendorClassId} onChange={(e) => setDhcpVendorClassId(e.target.value)} placeholder="Vendor class" />
                </div>
                <div className="space-y-2">
                  <Label>Reject Servers</Label>
                  <Input value={dhcpReject} onChange={(e) => setDhcpReject(e.target.value)} placeholder="Comma-separated IPs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={dhcpMtu} onCheckedChange={(c) => setDhcpMtu(c === true)} />
                  <Label className="font-normal text-sm">Use MTU from DHCP</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={dhcpNoDefaultRoute} onCheckedChange={(c) => setDhcpNoDefaultRoute(c === true)} />
                  <Label className="font-normal text-sm">No Default Route</Label>
                </div>
              </div>
            </div>

            {/* DHCPv6 Options */}
            <div>
              <h4 className="font-medium mb-3">DHCPv6 Options</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>DUID</Label>
                  <Input value={dhcpv6Duid} onChange={(e) => setDhcpv6Duid(e.target.value)} placeholder="DUID value" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={dhcpv6NoRelease} onCheckedChange={(c) => setDhcpv6NoRelease(c === true)} />
                  <Label className="font-normal text-sm">No Release</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={dhcpv6ParametersOnly} onCheckedChange={(c) => setDhcpv6ParametersOnly(c === true)} />
                  <Label className="font-normal text-sm">Parameters Only</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={dhcpv6RapidCommit} onCheckedChange={(c) => setDhcpv6RapidCommit(c === true)} />
                  <Label className="font-normal text-sm">Rapid Commit</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={dhcpv6Temporary} onCheckedChange={(c) => setDhcpv6Temporary(c === true)} />
                  <Label className="font-normal text-sm">Temporary</Label>
                </div>
                {capabilities?.features.dhcpv6_no_request_dns?.supported && (
                  <div className="flex items-center gap-2">
                    <Checkbox checked={dhcpv6NoRequestDns} onCheckedChange={(c) => setDhcpv6NoRequestDns(c === true)} />
                    <Label className="font-normal text-sm">No Request DNS</Label>
                  </div>
                )}
                {capabilities?.features.dhcpv6_no_request_domain_name?.supported && (
                  <div className="flex items-center gap-2">
                    <Checkbox checked={dhcpv6NoRequestDomainName} onCheckedChange={(c) => setDhcpv6NoRequestDomainName(c === true)} />
                    <Label className="font-normal text-sm">No Request Domain Name</Label>
                  </div>
                )}
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
              "Create Bridge"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
