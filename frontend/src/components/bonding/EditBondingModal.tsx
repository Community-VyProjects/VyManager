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
import { AlertCircle, Loader2, Link2, X, Plus } from "lucide-react";
import {
  bondingService,
  type BondingCapabilities,
  type BondingInterface,
} from "@/lib/api/bonding";
import { showService, type InterfaceName } from "@/lib/api/show";
import { ApiError } from "@/lib/types/api";

const BONDING_MODES = [
  "802.3ad", "active-backup", "broadcast", "round-robin",
  "transmit-load-balance", "adaptive-load-balance", "xor-hash",
] as const;

const HASH_POLICY_MODES = ["802.3ad", "xor-hash", "transmit-load-balance"];
const LACP_RATE_MODE = "802.3ad";
const PRIMARY_MODE = "active-backup";
const SYSTEM_MAC_MODE = "802.3ad";

interface EditBondingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: BondingCapabilities | null;
  interfaceData: BondingInterface | null;
}

export function EditBondingModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  interfaceData,
}: EditBondingModalProps) {
  // Basic
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState("802.3ad");
  const [hashPolicy, setHashPolicy] = useState("");
  const [lacpRate, setLacpRate] = useState("");
  const [minLinks, setMinLinks] = useState("");
  const [miiMonInterval, setMiiMonInterval] = useState("");
  const [primary, setPrimary] = useState("");
  const [systemMac, setSystemMac] = useState("");

  // Members
  const [members, setMembers] = useState<string[]>([]);
  const [memberToAdd, setMemberToAdd] = useState("");

  // Addresses
  const [addresses, setAddresses] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [mac, setMac] = useState("");

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

  // ARP Monitor
  const [arpMonitorInterval, setArpMonitorInterval] = useState("");
  const [arpMonitorTargets, setArpMonitorTargets] = useState("");

  // EVPN
  const [evpnEsDfPref, setEvpnEsDfPref] = useState("");
  const [evpnEsId, setEvpnEsId] = useState("");
  const [evpnEsSysMac, setEvpnEsSysMac] = useState("");
  const [evpnUplink, setEvpnUplink] = useState(false);

  // Mirror
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");

  // EAPoL
  const [eapolCaCert, setEapolCaCert] = useState("");
  const [eapolCert, setEapolCert] = useState("");
  const [eapolPassphrase, setEapolPassphrase] = useState("");

  // DHCP Options
  const [dhcpClientId, setDhcpClientId] = useState("");
  const [dhcpDefaultRouteDistance, setDhcpDefaultRouteDistance] = useState("");
  const [dhcpHostName, setDhcpHostName] = useState("");
  const [dhcpUserClass, setDhcpUserClass] = useState("");
  const [dhcpVendorClassId, setDhcpVendorClassId] = useState("");
  const [dhcpMtu, setDhcpMtu] = useState(false);
  const [dhcpNoDefaultRoute, setDhcpNoDefaultRoute] = useState(false);
  const [dhcpReject, setDhcpReject] = useState("");

  // DHCPv6 Options
  const [dhcpv6Duid, setDhcpv6Duid] = useState("");
  const [dhcpv6NoRelease, setDhcpv6NoRelease] = useState(false);
  const [dhcpv6ParametersOnly, setDhcpv6ParametersOnly] = useState(false);
  const [dhcpv6RapidCommit, setDhcpv6RapidCommit] = useState(false);
  const [dhcpv6Temporary, setDhcpv6Temporary] = useState(false);
  const [dhcpv6NoRequestDns, setDhcpv6NoRequestDns] = useState(false);
  const [dhcpv6NoRequestDomainName, setDhcpv6NoRequestDomainName] = useState(false);

  // Interface Options
  const [redirect, setRedirect] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [disableLinkDetect, setDisableLinkDetect] = useState(false);

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
    if (open && interfaceData) {
      setDescription(interfaceData.description || "");
      setMode(interfaceData.mode || "802.3ad");
      setHashPolicy(interfaceData.hash_policy || "");
      setLacpRate(interfaceData.lacp_rate || "");
      setMinLinks(interfaceData.min_links || "");
      setMiiMonInterval(interfaceData.mii_mon_interval || "");
      setPrimary(interfaceData.primary || "");
      setSystemMac(interfaceData.system_mac || "");
      setMembers([...interfaceData.members]);
      setMemberToAdd("");
      setAddresses(interfaceData.addresses.join(", "));
      setMtu(interfaceData.mtu || "");
      setVrf(interfaceData.vrf || "");
      setMac(interfaceData.mac || "");
      setRedirect(interfaceData.redirect || "");
      setDisabled(interfaceData.disable);
      setDisableLinkDetect(interfaceData.disable_link_detect);

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
      setIpv6AddressAutoconf(interfaceData.ipv6.address_autoconf);
      setIpv6AddressNoDefaultLinkLocal(interfaceData.ipv6.address_no_default_link_local);
      setIpv6AddressEui64(interfaceData.ipv6.address_eui64.join(", "));
      setIpv6AddressInterfaceIdentifier(interfaceData.ipv6.address_interface_identifier || "");

      // ARP Monitor
      setArpMonitorInterval(interfaceData.arp_monitor.interval || "");
      setArpMonitorTargets(interfaceData.arp_monitor.targets.join(", "));

      // EVPN
      setEvpnEsDfPref(interfaceData.evpn.es_df_pref || "");
      setEvpnEsId(interfaceData.evpn.es_id || "");
      setEvpnEsSysMac(interfaceData.evpn.es_sys_mac || "");
      setEvpnUplink(interfaceData.evpn.uplink);

      // Mirror
      setMirrorIngress(interfaceData.mirror.ingress || "");
      setMirrorEgress(interfaceData.mirror.egress || "");

      // EAPoL
      setEapolCaCert(interfaceData.eapol.ca_certificate || "");
      setEapolCert(interfaceData.eapol.certificate || "");
      setEapolPassphrase(interfaceData.eapol.passphrase || "");

      // DHCP
      setDhcpClientId(interfaceData.dhcp_options.client_id || "");
      setDhcpDefaultRouteDistance(interfaceData.dhcp_options.default_route_distance || "");
      setDhcpHostName(interfaceData.dhcp_options.host_name || "");
      setDhcpUserClass(interfaceData.dhcp_options.user_class || "");
      setDhcpVendorClassId(interfaceData.dhcp_options.vendor_class_id || "");
      setDhcpMtu(interfaceData.dhcp_options.mtu);
      setDhcpNoDefaultRoute(interfaceData.dhcp_options.no_default_route);
      setDhcpReject(interfaceData.dhcp_options.reject.join(", "));

      // DHCPv6
      setDhcpv6Duid(interfaceData.dhcpv6_options.duid || "");
      setDhcpv6NoRelease(interfaceData.dhcpv6_options.no_release);
      setDhcpv6ParametersOnly(interfaceData.dhcpv6_options.parameters_only);
      setDhcpv6RapidCommit(interfaceData.dhcpv6_options.rapid_commit);
      setDhcpv6Temporary(interfaceData.dhcpv6_options.temporary);
      setDhcpv6NoRequestDns(interfaceData.dhcpv6_options.no_request_dns);
      setDhcpv6NoRequestDomainName(interfaceData.dhcpv6_options.no_request_domain_name);

      setError(null);
    }
  }, [open, interfaceData]);

  const handleSubmit = async () => {
    if (!interfaceData) return;

    setLoading(true);
    setError(null);

    try {
      const updated: Parameters<typeof bondingService.updateInterface>[2] = {};

      // Simple string fields
      const desc = description.trim() || null;
      if (desc !== (interfaceData.description || null)) updated.description = desc;

      const newMode = mode || null;
      if (newMode !== (interfaceData.mode || null)) updated.mode = newMode;

      const hp = hashPolicy || null;
      if (hp !== (interfaceData.hash_policy || null)) updated.hash_policy = hp;

      const lr = lacpRate || null;
      if (lr !== (interfaceData.lacp_rate || null)) updated.lacp_rate = lr;

      const ml = minLinks.trim() || null;
      if (ml !== (interfaceData.min_links || null)) updated.min_links = ml;

      const mmi = miiMonInterval.trim() || null;
      if (mmi !== (interfaceData.mii_mon_interval || null)) updated.mii_mon_interval = mmi;

      const pri = primary.trim() || null;
      if (pri !== (interfaceData.primary || null)) updated.primary = pri;

      const sm = systemMac.trim() || null;
      if (sm !== (interfaceData.system_mac || null)) updated.system_mac = sm;

      const newMtu = mtu.trim() || null;
      if (newMtu !== (interfaceData.mtu || null)) updated.mtu = newMtu;

      const newVrf = vrf.trim() || null;
      if (newVrf !== (interfaceData.vrf || null)) updated.vrf = newVrf;

      const newMac = mac.trim() || null;
      if (newMac !== (interfaceData.mac || null)) updated.mac = newMac;

      const newRedirect = redirect.trim() || null;
      if (newRedirect !== (interfaceData.redirect || null)) updated.redirect = newRedirect;

      // Booleans
      if (disabled !== interfaceData.disable) updated.disabled = disabled;
      if (disableLinkDetect !== interfaceData.disable_link_detect) updated.disable_link_detect = disableLinkDetect;

      // Addresses
      const addrList = addresses.split(/[,\n]/).map((a) => a.trim()).filter(Boolean);
      const currentAddrs = interfaceData.addresses;
      if (JSON.stringify(addrList.sort()) !== JSON.stringify([...currentAddrs].sort())) {
        updated.addresses = addrList;
      }

      // Members
      if (JSON.stringify(members.sort()) !== JSON.stringify([...interfaceData.members].sort())) {
        updated.members = members;
      }

      // ARP Monitor
      const newArpInterval = arpMonitorInterval.trim() || null;
      const newArpTargets = arpMonitorTargets.split(/[,\n]/).map((a) => a.trim()).filter(Boolean);
      const currentArpTargets = interfaceData.arp_monitor.targets;
      if (newArpInterval !== (interfaceData.arp_monitor.interval || null) ||
          JSON.stringify(newArpTargets.sort()) !== JSON.stringify([...currentArpTargets].sort())) {
        updated.arp_monitor = {
          interval: newArpInterval,
          targets: newArpTargets,
        };
      }

      // EVPN
      const newEvpnDf = evpnEsDfPref.trim() || null;
      const newEvpnId = evpnEsId.trim() || null;
      const newEvpnSysMac = evpnEsSysMac.trim() || null;
      if (newEvpnDf !== (interfaceData.evpn.es_df_pref || null) ||
          newEvpnId !== (interfaceData.evpn.es_id || null) ||
          newEvpnSysMac !== (interfaceData.evpn.es_sys_mac || null) ||
          evpnUplink !== interfaceData.evpn.uplink) {
        updated.evpn = {
          es_df_pref: newEvpnDf,
          es_id: newEvpnId,
          es_sys_mac: newEvpnSysMac,
          uplink: evpnUplink,
        };
      }

      // Mirror
      const newMirrorIn = mirrorIngress.trim() || null;
      const newMirrorOut = mirrorEgress.trim() || null;
      if (newMirrorIn !== (interfaceData.mirror.ingress || null) ||
          newMirrorOut !== (interfaceData.mirror.egress || null)) {
        updated.mirror = {
          ingress: newMirrorIn,
          egress: newMirrorOut,
        };
      }

      // EAPoL
      const newEapolCa = eapolCaCert.trim() || null;
      const newEapolCert = eapolCert.trim() || null;
      const newEapolPass = eapolPassphrase.trim() || null;
      if (newEapolCa !== (interfaceData.eapol.ca_certificate || null) ||
          newEapolCert !== (interfaceData.eapol.certificate || null) ||
          newEapolPass !== (interfaceData.eapol.passphrase || null)) {
        updated.eapol = {
          ca_certificate: newEapolCa,
          certificate: newEapolCert,
          passphrase: newEapolPass,
        };
      }

      // IP
      const newIp = {
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
      };
      const curIp = interfaceData.ip;
      if (newIp.adjust_mss !== (curIp.adjust_mss || null) ||
          newIp.arp_cache_timeout !== (curIp.arp_cache_timeout || null) ||
          newIp.source_validation !== (curIp.source_validation || null) ||
          newIp.disable_arp_filter !== curIp.disable_arp_filter ||
          newIp.disable_forwarding !== curIp.disable_forwarding ||
          newIp.enable_arp_accept !== curIp.enable_arp_accept ||
          newIp.enable_arp_announce !== curIp.enable_arp_announce ||
          newIp.enable_arp_ignore !== curIp.enable_arp_ignore ||
          newIp.enable_directed_broadcast !== curIp.enable_directed_broadcast ||
          newIp.enable_proxy_arp !== curIp.enable_proxy_arp ||
          newIp.proxy_arp_pvlan !== curIp.proxy_arp_pvlan) {
        updated.ip = newIp;
      }

      // IPv6
      const eui64List = ipv6AddressEui64.split(/[,\n]/).map((a) => a.trim()).filter(Boolean);
      const newIpv6 = {
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
      };
      const curIpv6 = interfaceData.ipv6;
      if (newIpv6.accept_dad !== (curIpv6.accept_dad || null) ||
          newIpv6.adjust_mss !== (curIpv6.adjust_mss || null) ||
          newIpv6.base_reachable_time !== (curIpv6.base_reachable_time || null) ||
          newIpv6.dup_addr_detect_transmits !== (curIpv6.dup_addr_detect_transmits || null) ||
          newIpv6.source_validation !== (curIpv6.source_validation || null) ||
          newIpv6.disable_forwarding !== curIpv6.disable_forwarding ||
          newIpv6.address_autoconf !== curIpv6.address_autoconf ||
          newIpv6.address_no_default_link_local !== curIpv6.address_no_default_link_local ||
          newIpv6.address_interface_identifier !== (curIpv6.address_interface_identifier || null) ||
          JSON.stringify(eui64List.sort()) !== JSON.stringify([...curIpv6.address_eui64].sort())) {
        updated.ipv6 = newIpv6;
      }

      // DHCP
      const dhcpRejectList = dhcpReject.split(/[,\n]/).map((a) => a.trim()).filter(Boolean);
      const newDhcp = {
        client_id: dhcpClientId.trim() || null,
        default_route_distance: dhcpDefaultRouteDistance.trim() || null,
        host_name: dhcpHostName.trim() || null,
        user_class: dhcpUserClass.trim() || null,
        vendor_class_id: dhcpVendorClassId.trim() || null,
        mtu: dhcpMtu,
        no_default_route: dhcpNoDefaultRoute,
        reject: dhcpRejectList,
      };
      const curDhcp = interfaceData.dhcp_options;
      if (newDhcp.client_id !== (curDhcp.client_id || null) ||
          newDhcp.default_route_distance !== (curDhcp.default_route_distance || null) ||
          newDhcp.host_name !== (curDhcp.host_name || null) ||
          newDhcp.user_class !== (curDhcp.user_class || null) ||
          newDhcp.vendor_class_id !== (curDhcp.vendor_class_id || null) ||
          newDhcp.mtu !== curDhcp.mtu ||
          newDhcp.no_default_route !== curDhcp.no_default_route ||
          JSON.stringify(dhcpRejectList.sort()) !== JSON.stringify([...curDhcp.reject].sort())) {
        updated.dhcp_options = newDhcp;
      }

      // DHCPv6
      const newDhcpv6 = {
        duid: dhcpv6Duid.trim() || null,
        no_release: dhcpv6NoRelease,
        parameters_only: dhcpv6ParametersOnly,
        rapid_commit: dhcpv6RapidCommit,
        temporary: dhcpv6Temporary,
        no_request_dns: dhcpv6NoRequestDns,
        no_request_domain_name: dhcpv6NoRequestDomainName,
      };
      const curDhcpv6 = interfaceData.dhcpv6_options;
      if (newDhcpv6.duid !== (curDhcpv6.duid || null) ||
          newDhcpv6.no_release !== curDhcpv6.no_release ||
          newDhcpv6.parameters_only !== curDhcpv6.parameters_only ||
          newDhcpv6.rapid_commit !== curDhcpv6.rapid_commit ||
          newDhcpv6.temporary !== curDhcpv6.temporary ||
          newDhcpv6.no_request_dns !== curDhcpv6.no_request_dns ||
          newDhcpv6.no_request_domain_name !== curDhcpv6.no_request_domain_name) {
        updated.dhcpv6_options = newDhcpv6;
      }

      const result = await bondingService.updateInterface(
        interfaceData.name,
        interfaceData,
        updated
      );

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update bonding interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update bonding interface");
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData) return null;

  const ethernetInterfaces = availableInterfaces.filter(
    (i) => i.name.startsWith("eth") && !members.includes(i.name)
  );

  const showHashPolicy = HASH_POLICY_MODES.includes(mode);
  const showLacpRate = mode === LACP_RATE_MODE;
  const showPrimary = mode === PRIMARY_MODE;
  const showSystemMac = mode === SYSTEM_MAC_MODE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Edit Bonding Interface: {interfaceData.name}
          </DialogTitle>
          <DialogDescription>
            Modify bonding interface configuration
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bonding Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BONDING_MODES.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showHashPolicy && (
                <div className="space-y-2">
                  <Label>Hash Policy</Label>
                  <Select value={hashPolicy} onValueChange={setHashPolicy}>
                    <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
                    <SelectContent>
                      {(capabilities?.features.hash_policy?.options || ["layer2", "layer2+3", "layer3+4", "encap2+3", "encap3+4"]).map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {showLacpRate && (
                <div className="space-y-2">
                  <Label>LACP Rate</Label>
                  <Select value={lacpRate} onValueChange={setLacpRate}>
                    <SelectTrigger><SelectValue placeholder="Select rate" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slow">slow</SelectItem>
                      <SelectItem value="fast">fast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-min-links">Min Links</Label>
                <Input id="edit-min-links" value={minLinks} onChange={(e) => setMinLinks(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mii-mon">MII Monitor Interval (ms)</Label>
                <Input id="edit-mii-mon" value={miiMonInterval} onChange={(e) => setMiiMonInterval(e.target.value)} placeholder="100" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {showPrimary && (
                <div className="space-y-2">
                  <Label htmlFor="edit-primary">Primary Interface</Label>
                  <Input id="edit-primary" value={primary} onChange={(e) => setPrimary(e.target.value)} placeholder="e.g. eth0" />
                </div>
              )}
              {showSystemMac && (
                <div className="space-y-2">
                  <Label htmlFor="edit-system-mac">System MAC</Label>
                  <Input id="edit-system-mac" value={systemMac} onChange={(e) => setSystemMac(e.target.value)} placeholder="xx:xx:xx:xx:xx:xx" />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Member Interfaces</Label>
              <p className="text-sm text-muted-foreground">
                Select ethernet interfaces to include in this bonding group.
              </p>
            </div>

            <div className="flex gap-2">
              <Select value={memberToAdd} onValueChange={setMemberToAdd}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select an interface to add" /></SelectTrigger>
                <SelectContent>
                  {ethernetInterfaces.map((i) => (
                    <SelectItem key={i.name} value={i.name}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  if (memberToAdd && !members.includes(memberToAdd)) {
                    setMembers([...members, memberToAdd]);
                    setMemberToAdd("");
                  }
                }}
                disabled={!memberToAdd}
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            {members.length > 0 ? (
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member} className="flex items-center justify-between rounded-lg border p-3">
                    <code className="font-mono text-sm">{member}</code>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setMembers(members.filter((m) => m !== member))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""} selected</p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">No members selected.</p>
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
            {/* ARP Monitor */}
            <div>
              <h4 className="font-medium mb-3">ARP Monitor</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Interval (ms)</Label>
                  <Input value={arpMonitorInterval} onChange={(e) => setArpMonitorInterval(e.target.value)} placeholder="100" />
                </div>
                <div className="space-y-2">
                  <Label>Targets</Label>
                  <Input value={arpMonitorTargets} onChange={(e) => setArpMonitorTargets(e.target.value)} placeholder="10.0.0.1, 10.0.0.2" />
                  <p className="text-xs text-muted-foreground">Comma-separated IP addresses</p>
                </div>
              </div>
            </div>

            {/* EVPN */}
            <div>
              <h4 className="font-medium mb-3">EVPN Multihoming</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ES DF Preference</Label>
                  <Input value={evpnEsDfPref} onChange={(e) => setEvpnEsDfPref(e.target.value)} placeholder="Preference value" />
                </div>
                <div className="space-y-2">
                  <Label>ES ID</Label>
                  <Input value={evpnEsId} onChange={(e) => setEvpnEsId(e.target.value)} placeholder="ES identifier" />
                </div>
                <div className="space-y-2">
                  <Label>ES System MAC</Label>
                  <Input value={evpnEsSysMac} onChange={(e) => setEvpnEsSysMac(e.target.value)} placeholder="xx:xx:xx:xx:xx:xx" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox checked={evpnUplink} onCheckedChange={(c) => setEvpnUplink(c === true)} />
                  <Label className="font-normal text-sm">EVPN Uplink</Label>
                </div>
              </div>
            </div>

            {/* Mirror */}
            <div>
              <h4 className="font-medium mb-3">Mirror</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ingress</Label>
                  <Input value={mirrorIngress} onChange={(e) => setMirrorIngress(e.target.value)} placeholder="Target interface" />
                </div>
                <div className="space-y-2">
                  <Label>Egress</Label>
                  <Input value={mirrorEgress} onChange={(e) => setMirrorEgress(e.target.value)} placeholder="Target interface" />
                </div>
              </div>
            </div>

            {/* EAPoL */}
            {capabilities?.features.eapol?.supported && (
              <div>
                <h4 className="font-medium mb-3">
                  EAPoL (802.1X)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CA Certificate</Label>
                    <Input value={eapolCaCert} onChange={(e) => setEapolCaCert(e.target.value)} placeholder="Certificate name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Certificate</Label>
                    <Input value={eapolCert} onChange={(e) => setEapolCert(e.target.value)} placeholder="Certificate name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Passphrase</Label>
                    <Input type="password" value={eapolPassphrase} onChange={(e) => setEapolPassphrase(e.target.value)} placeholder="Passphrase" />
                  </div>
                </div>
              </div>
            )}

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

            {/* Interface Options */}
            <div>
              <h4 className="font-medium mb-3">Interface Options</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Redirect</Label>
                  <Input value={redirect} onChange={(e) => setRedirect(e.target.value)} placeholder="Target interface" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} />
                  <Label className="font-normal text-sm">Administratively Disabled</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={disableLinkDetect} onCheckedChange={(c) => setDisableLinkDetect(c === true)} />
                  <Label className="font-normal text-sm">Disable Link Detect</Label>
                </div>
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
