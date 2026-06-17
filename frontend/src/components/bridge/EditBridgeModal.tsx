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
import {
  bridgeService,
  type BridgeCapabilities,
  type BridgeInterface,
} from "@/lib/api/bridge";
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

interface EditBridgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: BridgeCapabilities | null;
  interfaceData: BridgeInterface | null;
}

export function EditBridgeModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  interfaceData,
}: EditBridgeModalProps) {
  // Basic
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

  useEffect(() => {
    if (interfaceData && open) {
      setDescription(interfaceData.description || "");
      setStp(interfaceData.stp);
      setProtocol(interfaceData.protocol || "");
      setAging(interfaceData.aging || "");
      setForwardingDelay(interfaceData.forwarding_delay || "");
      setHelloTime(interfaceData.hello_time || "");
      setMaxAge(interfaceData.max_age || "");
      setBridgePriority(interfaceData.priority || "");
      setIgmpSnooping(interfaceData.igmp?.snooping || false);
      setIgmpQuerier(interfaceData.igmp?.querier || false);
      setEnableVlan(interfaceData.enable_vlan);
      setMembers(interfaceData.members.map((m) => ({
        name: m.name,
        cost: m.cost || "",
        priority: m.priority || "",
        isolated: m.isolated,
        native_vlan: m.native_vlan || "",
        allowed_vlan: m.allowed_vlan.join(", "),
        bpdu_guard: m.bpdu_guard,
        root_guard: m.root_guard,
      })));
      setMemberToAdd("");
      setAddresses(interfaceData.addresses.join(", "));
      setMtu(interfaceData.mtu || "");
      setVrf(interfaceData.vrf || "");
      setMac(interfaceData.mac || "");
      setMirrorIngress(interfaceData.mirror?.ingress || "");
      setMirrorEgress(interfaceData.mirror?.egress || "");
      setRedirect(interfaceData.redirect || "");
      setDisabled(interfaceData.disable || false);
      setDisableLinkDetect(interfaceData.disable_link_detect);

      // IP
      setIpAdjustMss(interfaceData.ip?.adjust_mss || "");
      setIpArpCacheTimeout(interfaceData.ip?.arp_cache_timeout || "");
      setIpSourceValidation(interfaceData.ip?.source_validation || "");
      setIpDisableArpFilter(interfaceData.ip?.disable_arp_filter || false);
      setIpDisableForwarding(interfaceData.ip?.disable_forwarding || false);
      setIpEnableArpAccept(interfaceData.ip?.enable_arp_accept || false);
      setIpEnableArpAnnounce(interfaceData.ip?.enable_arp_announce || false);
      setIpEnableArpIgnore(interfaceData.ip?.enable_arp_ignore || false);
      setIpEnableDirectedBroadcast(interfaceData.ip?.enable_directed_broadcast || false);
      setIpEnableProxyArp(interfaceData.ip?.enable_proxy_arp || false);
      setIpProxyArpPvlan(interfaceData.ip?.proxy_arp_pvlan || false);

      // IPv6
      setIpv6AcceptDad(interfaceData.ipv6?.accept_dad || "");
      setIpv6AdjustMss(interfaceData.ipv6?.adjust_mss || "");
      setIpv6BaseReachableTime(interfaceData.ipv6?.base_reachable_time || "");
      setIpv6DupAddrDetectTransmits(interfaceData.ipv6?.dup_addr_detect_transmits || "");
      setIpv6SourceValidation(interfaceData.ipv6?.source_validation || "");
      setIpv6DisableForwarding(interfaceData.ipv6?.disable_forwarding || false);
      setIpv6AddressAutoconf(interfaceData.ipv6?.address_autoconf || false);
      setIpv6AddressNoDefaultLinkLocal(interfaceData.ipv6?.address_no_default_link_local || false);
      setIpv6AddressEui64(interfaceData.ipv6?.address_eui64?.join(", ") || "");
      setIpv6AddressInterfaceIdentifier(interfaceData.ipv6?.address_interface_identifier || "");

      // DHCP
      setDhcpClientId(interfaceData.dhcp_options?.client_id || "");
      setDhcpDefaultRouteDistance(interfaceData.dhcp_options?.default_route_distance || "");
      setDhcpHostName(interfaceData.dhcp_options?.host_name || "");
      setDhcpUserClass(interfaceData.dhcp_options?.user_class || "");
      setDhcpVendorClassId(interfaceData.dhcp_options?.vendor_class_id || "");
      setDhcpMtu(interfaceData.dhcp_options?.mtu || false);
      setDhcpNoDefaultRoute(interfaceData.dhcp_options?.no_default_route || false);
      setDhcpReject(interfaceData.dhcp_options?.reject?.join(", ") || "");

      // DHCPv6
      setDhcpv6Duid(interfaceData.dhcpv6_options?.duid || "");
      setDhcpv6NoRelease(interfaceData.dhcpv6_options?.no_release || false);
      setDhcpv6ParametersOnly(interfaceData.dhcpv6_options?.parameters_only || false);
      setDhcpv6RapidCommit(interfaceData.dhcpv6_options?.rapid_commit || false);
      setDhcpv6Temporary(interfaceData.dhcpv6_options?.temporary || false);
      setDhcpv6NoRequestDns(interfaceData.dhcpv6_options?.no_request_dns || false);
      setDhcpv6NoRequestDomainName(interfaceData.dhcpv6_options?.no_request_domain_name || false);

      setError(null);
    }
  }, [interfaceData, open]);

  const handleSubmit = async () => {
    if (!interfaceData) return;

    setLoading(true);
    setError(null);

    try {
      const addrList = addresses.split(/[,\n]/).map((a) => a.trim()).filter(Boolean);
      const eui64List = ipv6AddressEui64.split(/[,\n]/).map((a) => a.trim()).filter(Boolean);
      const dhcpRejectList = dhcpReject.split(/[,\n]/).map((a) => a.trim()).filter(Boolean);

      const membersList = members.map((m) => {
        const member: NonNullable<Parameters<typeof bridgeService.updateInterface>[2]["members"]>[0] = { name: m.name };
        if (m.cost.trim()) member.cost = m.cost.trim();
        if (m.priority.trim()) member.priority = m.priority.trim();
        member.isolated = m.isolated;
        if (m.native_vlan.trim() && enableVlan) member.native_vlan = m.native_vlan.trim();
        if (m.allowed_vlan.trim() && enableVlan) {
          member.allowed_vlan = m.allowed_vlan.split(/[,\n]/).map((v) => v.trim()).filter(Boolean);
        }
        member.bpdu_guard = m.bpdu_guard;
        member.root_guard = m.root_guard;
        return member;
      });

      const result = await bridgeService.updateInterface(
        interfaceData.name,
        interfaceData,
        {
          description: description.trim() || null,
          addresses: addrList,
          members: membersList,
          mtu: mtu.trim() || null,
          vrf: vrf.trim() || null,
          mac: mac.trim() || null,
          redirect: redirect.trim() || null,
          disabled,
          disable_link_detect: disableLinkDetect,
          stp,
          enable_vlan: enableVlan,
          protocol: protocol || null,
          aging: aging.trim() || null,
          forwarding_delay: forwardingDelay.trim() || null,
          hello_time: helloTime.trim() || null,
          max_age: maxAge.trim() || null,
          priority: bridgePriority.trim() || null,
          igmp_snooping: igmpSnooping,
          igmp_querier: igmpQuerier,
          mirror: {
            ingress: mirrorIngress.trim() || null,
            egress: mirrorEgress.trim() || null,
          },
          ip: {
            adjust_mss: ipAdjustMss.trim() || null,
            arp_cache_timeout: ipArpCacheTimeout.trim() || null,
            source_validation: ipSourceValidation || null,
            disable_arp_filter: ipDisableArpFilter,
            disable_forwarding: ipDisableForwarding,
            enable_arp_accept: ipEnableArpAccept,
            enable_arp_announce: ipEnableArpAnnounce,
            enable_arp_ignore: ipEnableArpIgnore,
            enable_directed_broadcast: ipEnableDirectedBroadcast,
            enable_proxy_arp: ipEnableProxyArp,
            proxy_arp_pvlan: ipProxyArpPvlan,
          },
          ipv6: {
            accept_dad: ipv6AcceptDad.trim() || null,
            adjust_mss: ipv6AdjustMss.trim() || null,
            base_reachable_time: ipv6BaseReachableTime.trim() || null,
            dup_addr_detect_transmits: ipv6DupAddrDetectTransmits.trim() || null,
            source_validation: ipv6SourceValidation || null,
            disable_forwarding: ipv6DisableForwarding,
            address_autoconf: ipv6AddressAutoconf,
            address_eui64: eui64List,
            address_no_default_link_local: ipv6AddressNoDefaultLinkLocal,
            address_interface_identifier: ipv6AddressInterfaceIdentifier.trim() || null,
          },
          dhcp_options: {
            client_id: dhcpClientId.trim() || null,
            default_route_distance: dhcpDefaultRouteDistance.trim() || null,
            host_name: dhcpHostName.trim() || null,
            user_class: dhcpUserClass.trim() || null,
            vendor_class_id: dhcpVendorClassId.trim() || null,
            mtu: dhcpMtu,
            no_default_route: dhcpNoDefaultRoute,
            reject: dhcpRejectList,
          },
          dhcpv6_options: {
            duid: dhcpv6Duid.trim() || null,
            no_release: dhcpv6NoRelease,
            parameters_only: dhcpv6ParametersOnly,
            rapid_commit: dhcpv6RapidCommit,
            temporary: dhcpv6Temporary,
            no_request_dns: dhcpv6NoRequestDns,
            no_request_domain_name: dhcpv6NoRequestDomainName,
          },
        }
      );

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update bridge interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update bridge interface");
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

  if (!interfaceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Edit Bridge: {interfaceData.name}
          </DialogTitle>
          <DialogDescription>
            Modify bridge interface configuration
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
                <Label>Interface Name</Label>
                <Input value={interfaceData.name} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
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
                      <Label htmlFor="edit-bridge-priority">Priority</Label>
                      <Input id="edit-bridge-priority" value={bridgePriority} onChange={(e) => setBridgePriority(e.target.value)} placeholder="32768" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-aging">Aging (seconds)</Label>
                      <Input id="edit-aging" value={aging} onChange={(e) => setAging(e.target.value)} placeholder="300" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-forwarding-delay">Forwarding Delay (seconds)</Label>
                      <Input id="edit-forwarding-delay" value={forwardingDelay} onChange={(e) => setForwardingDelay(e.target.value)} placeholder="15" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-hello-time">Hello Time (seconds)</Label>
                      <Input id="edit-hello-time" value={helloTime} onChange={(e) => setHelloTime(e.target.value)} placeholder="2" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-max-age">Max Age (seconds)</Label>
                      <Input id="edit-max-age" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} placeholder="20" />
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
              <Label htmlFor="edit-addresses">IP Addresses</Label>
              <Input id="edit-addresses" value={addresses} onChange={(e) => setAddresses(e.target.value)} placeholder="192.168.1.1/24, 10.0.0.1/24" />
              <p className="text-xs text-muted-foreground">Comma-separated CIDR addresses</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-mtu">MTU</Label>
                <Input id="edit-mtu" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="1500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-vrf">VRF</Label>
                <Input id="edit-vrf" value={vrf} onChange={(e) => setVrf(e.target.value)} placeholder="Optional VRF" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mac">MAC Override</Label>
                <Input id="edit-mac" value={mac} onChange={(e) => setMac(e.target.value)} placeholder="xx:xx:xx:xx:xx:xx" />
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
            <div>
              <h4 className="font-medium mb-3">Interface Options</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Redirect</Label>
                  <Input value={redirect} onChange={(e) => setRedirect(e.target.value)} placeholder="Target interface" />
                </div>
              </div>
            </div>

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
