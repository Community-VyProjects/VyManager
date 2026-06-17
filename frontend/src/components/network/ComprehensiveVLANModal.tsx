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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetCapabilities, VIFConfig, BatchOperation, VlanBatchService, VlanParentInterface } from "@/lib/api/types/ethernet";
import { Loader2, X } from "lucide-react";
import { InterfaceSelect } from "@/components/ui/interface-select";

interface VLANWithParent extends VIFConfig {
  parentInterface: string;
  fullName: string;
}

interface ComprehensiveVLANModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vlan?: VLANWithParent | null;
  interfaces: VlanParentInterface[];
  capabilities: EthernetCapabilities | null;
  onSuccess: () => void;
  mode: "create" | "edit";
  /** Defaults to ethernetService; pass the bonding adapter to drive bond VLANs. */
  service?: VlanBatchService;
}

export function ComprehensiveVLANModal({
  open,
  onOpenChange,
  vlan,
  interfaces,
  capabilities,
  onSuccess,
  mode,
  service = ethernetService,
}: ComprehensiveVLANModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic settings
  const [parentInterface, setParentInterface] = useState("");
  const [vlanId, setVlanId] = useState("");
  const [description, setDescription] = useState("");
  const [addresses, setAddresses] = useState<string[]>([]);
  const [mtu, setMtu] = useState("");
  const [mac, setMac] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [disableLinkDetect, setDisableLinkDetect] = useState(false);
  const [redirect, setRedirect] = useState("");
  const [egressQos, setEgressQos] = useState("");
  const [ingressQos, setIngressQos] = useState("");
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");

  // DHCP options
  const [dhcpClientId, setDhcpClientId] = useState("");
  const [dhcpHostName, setDhcpHostName] = useState("");
  const [dhcpDefaultRouteDistance, setDhcpDefaultRouteDistance] = useState("");
  const [dhcpMtu, setDhcpMtu] = useState(false);
  const [dhcpNoDefaultRoute, setDhcpNoDefaultRoute] = useState(false);
  const [dhcpReject, setDhcpReject] = useState("");
  const [dhcpUserClass, setDhcpUserClass] = useState("");
  const [dhcpVendorClassId, setDhcpVendorClassId] = useState("");

  // DHCPv6 options
  const [dhcpv6Duid, setDhcpv6Duid] = useState("");
  const [dhcpv6NoRelease, setDhcpv6NoRelease] = useState(false);
  const [dhcpv6ParametersOnly, setDhcpv6ParametersOnly] = useState(false);
  const [dhcpv6RapidCommit, setDhcpv6RapidCommit] = useState(false);
  const [dhcpv6Temporary, setDhcpv6Temporary] = useState(false);
  const [dhcpv6NoRequestDns, setDhcpv6NoRequestDns] = useState(false);
  const [dhcpv6NoRequestDomainName, setDhcpv6NoRequestDomainName] = useState(false);

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

  // TCP MSS settings
  const [mssClamping, setMssClamping] = useState(false);

  // IPv6 settings
  const [ipv6Autoconf, setIpv6Autoconf] = useState(false);
  const [ipv6Eui64, setIpv6Eui64] = useState("");
  const [ipv6AcceptDad, setIpv6AcceptDad] = useState("");
  const [ipv6AdjustMss, setIpv6AdjustMss] = useState("");
  const [ipv6BaseReachableTime, setIpv6BaseReachableTime] = useState("");
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);
  const [ipv6DupAddrDetectTransmits, setIpv6DupAddrDetectTransmits] = useState("");
  const [ipv6SourceValidation, setIpv6SourceValidation] = useState("");
  const [ipv6InterfaceIdentifier, setIpv6InterfaceIdentifier] = useState("");
  const [ipv6NoDefaultLinkLocal, setIpv6NoDefaultLinkLocal] = useState(false);

  // Initialize form from existing VLAN data
  useEffect(() => {
    if (vlan && mode === "edit") {
      setParentInterface(vlan.parentInterface);
      setVlanId(vlan.vlan_id);
      setDescription(vlan.description || "");
      setAddresses(vlan.addresses.length > 0 ? [...vlan.addresses] : []);
      setMtu(vlan.mtu || "");
      setMac(vlan.mac || "");
      setVrf(vlan.vrf || "");
      setDisabled(vlan.disable || false);
      setMssClamping(vlan.mss_clamping || false);
      setDisableLinkDetect(vlan.disable_link_detect || false);
      setRedirect(vlan.redirect || "");
      setEgressQos(vlan.egress_qos || "");
      setIngressQos(vlan.ingress_qos || "");
      setMirrorIngress(vlan.mirror?.ingress || "");
      setMirrorEgress(vlan.mirror?.egress || "");

      // DHCP
      setDhcpClientId(vlan.dhcp_options?.client_id || "");
      setDhcpHostName(vlan.dhcp_options?.host_name || "");
      setDhcpDefaultRouteDistance(vlan.dhcp_options?.default_route_distance || "");
      setDhcpMtu(vlan.dhcp_options?.mtu || false);
      setDhcpNoDefaultRoute(vlan.dhcp_options?.no_default_route || false);
      const rejectVal = vlan.dhcp_options?.reject;
      setDhcpReject(Array.isArray(rejectVal) ? rejectVal.join(",") : rejectVal || "");
      setDhcpUserClass(vlan.dhcp_options?.user_class || "");
      setDhcpVendorClassId(vlan.dhcp_options?.vendor_class_id || "");

      // DHCPv6
      setDhcpv6Duid(vlan.dhcpv6_options?.duid || "");
      setDhcpv6NoRelease(vlan.dhcpv6_options?.no_release || false);
      setDhcpv6ParametersOnly(vlan.dhcpv6_options?.parameters_only || false);
      setDhcpv6RapidCommit(vlan.dhcpv6_options?.rapid_commit || false);
      setDhcpv6Temporary(vlan.dhcpv6_options?.temporary || false);
      setDhcpv6NoRequestDns(vlan.dhcpv6_options?.no_request_dns || false);
      setDhcpv6NoRequestDomainName(vlan.dhcpv6_options?.no_request_domain_name || false);

      // IP
      setIpAdjustMss(vlan.ip?.adjust_mss || "");
      setIpArpCacheTimeout(vlan.ip?.arp_cache_timeout || "");
      setIpDisableArpFilter(vlan.ip?.disable_arp_filter || false);
      setIpDisableForwarding(vlan.ip?.disable_forwarding || false);
      setIpEnableArpAccept(vlan.ip?.enable_arp_accept || false);
      setIpEnableArpAnnounce(vlan.ip?.enable_arp_announce || false);
      setIpEnableArpIgnore(vlan.ip?.enable_arp_ignore || false);
      setIpEnableDirectedBroadcast(vlan.ip?.enable_directed_broadcast || false);
      setIpEnableProxyArp(vlan.ip?.enable_proxy_arp || false);
      setIpProxyArpPvlan(vlan.ip?.proxy_arp_pvlan || false);
      setIpSourceValidation(vlan.ip?.source_validation || "");

      // IPv6
      setIpv6AcceptDad(vlan.ipv6?.accept_dad || "");
      setIpv6AdjustMss(vlan.ipv6?.adjust_mss || "");
      setIpv6BaseReachableTime(vlan.ipv6?.base_reachable_time || "");
      setIpv6DisableForwarding(vlan.ipv6?.disable_forwarding || false);
      setIpv6DupAddrDetectTransmits(vlan.ipv6?.dup_addr_detect_transmits || "");
      setIpv6SourceValidation(vlan.ipv6?.source_validation || "");
      setIpv6NoDefaultLinkLocal(vlan.ipv6?.no_default_link_local || false);
    } else {
      resetForm();
    }
    setError(null);
  }, [vlan, mode, open]);

  const resetForm = () => {
    setParentInterface("");
    setVlanId("");
    setDescription("");
    setAddresses([]);
    setMtu("");
    setMac("");
    setVrf("");
    setDisabled(false);
    setDisableLinkDetect(false);
    setRedirect("");
    setEgressQos("");
    setIngressQos("");
    setMirrorIngress("");
    setMirrorEgress("");
    setDhcpClientId("");
    setDhcpHostName("");
    setMssClamping(false);
    setDhcpDefaultRouteDistance("");
    setDhcpMtu(false);
    setDhcpNoDefaultRoute(false);
    setDhcpReject("");
    setDhcpUserClass("");
    setDhcpVendorClassId("");
    setDhcpv6Duid("");
    setDhcpv6NoRelease(false);
    setDhcpv6ParametersOnly(false);
    setDhcpv6RapidCommit(false);
    setDhcpv6Temporary(false);
    setDhcpv6NoRequestDns(false);
    setDhcpv6NoRequestDomainName(false);
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
    setIpv6Autoconf(false);
    setIpv6Eui64("");
    setIpv6AcceptDad("");
    setIpv6AdjustMss("");
    setIpv6BaseReachableTime("");
    setIpv6DisableForwarding(false);
    setIpv6DupAddrDetectTransmits("");
    setIpv6SourceValidation("");
    setIpv6InterfaceIdentifier("");
    setIpv6NoDefaultLinkLocal(false);
    setError(null);
  };

  const handleAddAddress = () => {
    setAddresses([...addresses, ""]);
  };

  const handleRemoveAddress = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  const handleAddressChange = (index: number, value: string) => {
    const newAddresses = [...addresses];
    newAddresses[index] = value;
    setAddresses(newAddresses);
  };

  /** Helper: add a string field op with diff checking */
  const addStringOp = (
    ops: BatchOperation[],
    vid: string,
    setOp: string,
    deleteOp: string,
    newVal: string,
    oldVal: string | undefined | null
  ) => {
    const trimmed = newVal.trim();
    const old = oldVal || "";
    if (mode === "create" && trimmed) {
      ops.push({ op: setOp, value: `${vid},${trimmed}` });
    } else if (mode === "edit" && trimmed !== old) {
      if (trimmed) {
        ops.push({ op: setOp, value: `${vid},${trimmed}` });
      } else if (old) {
        ops.push({ op: deleteOp, value: vid });
      }
    }
  };

  /** Helper: add a boolean flag op with diff checking */
  const addBoolOp = (
    ops: BatchOperation[],
    vid: string,
    setOp: string,
    deleteOp: string,
    newVal: boolean,
    oldVal: boolean | undefined | null
  ) => {
    const old = oldVal || false;
    if (mode === "create" && newVal) {
      ops.push({ op: setOp, value: vid });
    } else if (mode === "edit" && newVal !== old) {
      ops.push({ op: newVal ? setOp : deleteOp, value: vid });
    }
  };

  const buildOperations = (): BatchOperation[] => {
    const operations: BatchOperation[] = [];
    const vid = vlanId;
    const feat = capabilities?.features.vlan;

    // Create VLAN (VIF) if in create mode
    if (mode === "create") {
      operations.push({ op: "set_vif", value: vid });
    }

    // Basic fields
    addStringOp(operations, vid, "set_vif_description", "delete_vif_description", description, vlan?.description);

    // Addresses
    const currentAddrs = new Set(vlan?.addresses || []);
    const newAddrs = new Set(addresses.filter((a) => a.trim() !== ""));
    for (const addr of newAddrs) {
      if (!currentAddrs.has(addr)) {
        operations.push({ op: "set_vif_address", value: `${vid},${addr}` });
      }
    }
    if (mode === "edit") {
      for (const addr of currentAddrs) {
        if (!newAddrs.has(addr)) {
          operations.push({ op: "delete_vif_address", value: `${vid},${addr}` });
        }
      }
    }

    addStringOp(operations, vid, "set_vif_mtu", "delete_vif_mtu", mtu, vlan?.mtu);
    addStringOp(operations, vid, "set_vif_mac", "delete_vif_mac", mac, vlan?.mac);

    // VRF
    if (mode === "create" && vrf.trim()) {
      operations.push({ op: "set_vif_vrf", value: `${vid},${vrf.trim()}` });
    } else if (mode === "edit" && vrf.trim() !== (vlan?.vrf || "")) {
      if (vrf.trim()) {
        operations.push({ op: "set_vif_vrf", value: `${vid},${vrf.trim()}` });
      } else if (vlan?.vrf) {
        operations.push({ op: "delete_vif_vrf", value: `${vid},${vlan.vrf}` });
      }
    }

    addBoolOp(operations, vid, "set_vif_disable", "delete_vif_disable", disabled, vlan?.disable);
    addBoolOp(operations, vid, "set_vif_disable_link_detect", "delete_vif_disable_link_detect", disableLinkDetect, vlan?.disable_link_detect);

    // Redirect
    if (feat?.vif_redirect) {
      addStringOp(operations, vid, "set_vif_redirect", "delete_vif_redirect", redirect, vlan?.redirect);
    }

    // QoS
    if (feat?.vif_egress_qos) {
      addStringOp(operations, vid, "set_vif_egress_qos", "delete_vif_egress_qos", egressQos, vlan?.egress_qos);
    }
    if (feat?.vif_ingress_qos) {
      addStringOp(operations, vid, "set_vif_ingress_qos", "delete_vif_ingress_qos", ingressQos, vlan?.ingress_qos);
    }

    // Mirror
    if (feat?.vif_mirror) {
      addStringOp(operations, vid, "set_vif_mirror_ingress", "delete_vif_mirror", mirrorIngress, vlan?.mirror?.ingress);
      addStringOp(operations, vid, "set_vif_mirror_egress", "delete_vif_mirror", mirrorEgress, vlan?.mirror?.egress);
    }

    // DHCP Options
    if (feat?.vif_dhcp_options) {
      addStringOp(operations, vid, "set_vif_dhcp_options_client_id", "delete_vif_dhcp_options", dhcpClientId, vlan?.dhcp_options?.client_id);
      addStringOp(operations, vid, "set_vif_dhcp_options_host_name", "delete_vif_dhcp_options", dhcpHostName, vlan?.dhcp_options?.host_name);
      addStringOp(operations, vid, "set_vif_dhcp_options_default_route_distance", "delete_vif_dhcp_options", dhcpDefaultRouteDistance, vlan?.dhcp_options?.default_route_distance);
      addBoolOp(operations, vid, "set_vif_dhcp_options_mtu", "delete_vif_dhcp_options", dhcpMtu, vlan?.dhcp_options?.mtu);
      addBoolOp(operations, vid, "set_vif_dhcp_options_no_default_route", "delete_vif_dhcp_options", dhcpNoDefaultRoute, vlan?.dhcp_options?.no_default_route);
      addStringOp(operations, vid, "set_vif_dhcp_options_user_class", "delete_vif_dhcp_options", dhcpUserClass, vlan?.dhcp_options?.user_class);
      addStringOp(operations, vid, "set_vif_dhcp_options_vendor_class_id", "delete_vif_dhcp_options", dhcpVendorClassId, vlan?.dhcp_options?.vendor_class_id);
      // Reject addresses
      if (dhcpReject.trim()) {
        const rejects = dhcpReject.split(",").map(r => r.trim()).filter(Boolean);
        for (const addr of rejects) {
          operations.push({ op: "set_vif_dhcp_options_reject", value: `${vid},${addr}` });
        }
      }
    }

    // TCP MSS clamping
    if (capabilities?.features.tcp_mss?.clamp_to_pmtu_ipv4 || capabilities?.features.tcp_mss?.clamp_to_pmtu_ipv6) {
      const currentlyClamping = vlan?.mss_clamping || false;

      if (mode === "create" && mssClamping) {
        if (capabilities.features.tcp_mss.clamp_to_pmtu_ipv4) {
          operations.push({ op: "set_vif_ip_adjust_mss_clamp_to_pmtu", value: vid });
        }
        if (capabilities.features.tcp_mss.clamp_to_pmtu_ipv6) {
          operations.push({ op: "set_vif_ipv6_adjust_mss_clamp_to_pmtu", value: vid });
        }
      } else if (mode === "edit") {
        if (mssClamping && !currentlyClamping) {
          if (capabilities.features.tcp_mss.clamp_to_pmtu_ipv4) {
            operations.push({ op: "set_vif_ip_adjust_mss_clamp_to_pmtu", value: vid });
          }
          if (capabilities.features.tcp_mss.clamp_to_pmtu_ipv6) {
            operations.push({ op: "set_vif_ipv6_adjust_mss_clamp_to_pmtu", value: vid });
          }
        } else if (!mssClamping && currentlyClamping) {
          if (capabilities.features.tcp_mss.ipv4_adjust || capabilities.features.tcp_mss.clamp_to_pmtu_ipv4) {
            operations.push({ op: "delete_vif_ip_adjust_mss", value: vid });
          }
          if (capabilities.features.tcp_mss.ipv6_adjust || capabilities.features.tcp_mss.clamp_to_pmtu_ipv6) {
            operations.push({ op: "delete_vif_ipv6_adjust_mss", value: vid });
          }
        }
      }
    }

    // DHCPv6 Options
    if (feat?.vif_dhcpv6_options) {
      addStringOp(operations, vid, "set_vif_dhcpv6_options_duid", "delete_vif_dhcpv6_options", dhcpv6Duid, vlan?.dhcpv6_options?.duid);
      addBoolOp(operations, vid, "set_vif_dhcpv6_options_no_release", "delete_vif_dhcpv6_options", dhcpv6NoRelease, vlan?.dhcpv6_options?.no_release);
      addBoolOp(operations, vid, "set_vif_dhcpv6_options_parameters_only", "delete_vif_dhcpv6_options", dhcpv6ParametersOnly, vlan?.dhcpv6_options?.parameters_only);
      addBoolOp(operations, vid, "set_vif_dhcpv6_options_rapid_commit", "delete_vif_dhcpv6_options", dhcpv6RapidCommit, vlan?.dhcpv6_options?.rapid_commit);
      addBoolOp(operations, vid, "set_vif_dhcpv6_options_temporary", "delete_vif_dhcpv6_options", dhcpv6Temporary, vlan?.dhcpv6_options?.temporary);
      if (feat?.vif_dhcpv6_options_no_request_dns) {
        addBoolOp(operations, vid, "set_vif_dhcpv6_options_no_request_dns", "delete_vif_dhcpv6_options", dhcpv6NoRequestDns, vlan?.dhcpv6_options?.no_request_dns);
      }
      if (feat?.vif_dhcpv6_options_no_request_domain_name) {
        addBoolOp(operations, vid, "set_vif_dhcpv6_options_no_request_domain_name", "delete_vif_dhcpv6_options", dhcpv6NoRequestDomainName, vlan?.dhcpv6_options?.no_request_domain_name);
      }
    }

    // IP Options
    if (feat?.vif_ip) {
      addStringOp(operations, vid, "set_vif_ip_adjust_mss", "delete_vif_ip", ipAdjustMss, vlan?.ip?.adjust_mss);
      addStringOp(operations, vid, "set_vif_ip_arp_cache_timeout", "delete_vif_ip", ipArpCacheTimeout, vlan?.ip?.arp_cache_timeout);
      addBoolOp(operations, vid, "set_vif_ip_disable_arp_filter", "delete_vif_ip", ipDisableArpFilter, vlan?.ip?.disable_arp_filter);
      addBoolOp(operations, vid, "set_vif_ip_disable_forwarding", "delete_vif_ip", ipDisableForwarding, vlan?.ip?.disable_forwarding);
      addBoolOp(operations, vid, "set_vif_ip_enable_arp_accept", "delete_vif_ip", ipEnableArpAccept, vlan?.ip?.enable_arp_accept);
      addBoolOp(operations, vid, "set_vif_ip_enable_arp_announce", "delete_vif_ip", ipEnableArpAnnounce, vlan?.ip?.enable_arp_announce);
      addBoolOp(operations, vid, "set_vif_ip_enable_arp_ignore", "delete_vif_ip", ipEnableArpIgnore, vlan?.ip?.enable_arp_ignore);
      if (feat?.vif_ip_enable_directed_broadcast) {
        addBoolOp(operations, vid, "set_vif_ip_enable_directed_broadcast", "delete_vif_ip", ipEnableDirectedBroadcast, vlan?.ip?.enable_directed_broadcast);
      }
      addBoolOp(operations, vid, "set_vif_ip_enable_proxy_arp", "delete_vif_ip", ipEnableProxyArp, vlan?.ip?.enable_proxy_arp);
      addBoolOp(operations, vid, "set_vif_ip_proxy_arp_pvlan", "delete_vif_ip", ipProxyArpPvlan, vlan?.ip?.proxy_arp_pvlan);
      addStringOp(operations, vid, "set_vif_ip_source_validation", "delete_vif_ip", ipSourceValidation, vlan?.ip?.source_validation);
    }

    // IPv6 Options
    if (feat?.vif_ipv6) {
      addBoolOp(operations, vid, "set_vif_ipv6_address_autoconf", "delete_vif_ip", ipv6Autoconf, false);
      addStringOp(operations, vid, "set_vif_ipv6_address_eui64", "delete_vif_ip", ipv6Eui64, "");
      addStringOp(operations, vid, "set_vif_ipv6_accept_dad", "delete_vif_ip", ipv6AcceptDad, vlan?.ipv6?.accept_dad);
      addStringOp(operations, vid, "set_vif_ipv6_adjust_mss", "delete_vif_ip", ipv6AdjustMss, vlan?.ipv6?.adjust_mss);
      addStringOp(operations, vid, "set_vif_ipv6_base_reachable_time", "delete_vif_ip", ipv6BaseReachableTime, vlan?.ipv6?.base_reachable_time);
      addBoolOp(operations, vid, "set_vif_ipv6_disable_forwarding", "delete_vif_ip", ipv6DisableForwarding, vlan?.ipv6?.disable_forwarding);
      addStringOp(operations, vid, "set_vif_ipv6_dup_addr_detect_transmits", "delete_vif_ip", ipv6DupAddrDetectTransmits, vlan?.ipv6?.dup_addr_detect_transmits);
      addStringOp(operations, vid, "set_vif_ipv6_source_validation", "delete_vif_ip", ipv6SourceValidation, vlan?.ipv6?.source_validation);
      addBoolOp(operations, vid, "set_vif_ipv6_address_no_default_link_local", "delete_vif_ip", ipv6NoDefaultLinkLocal, vlan?.ipv6?.no_default_link_local);
      if (feat?.vif_ipv6_address_interface_identifier) {
        addStringOp(operations, vid, "set_vif_ipv6_address_interface_identifier", "delete_vif_ip", ipv6InterfaceIdentifier, "");
      }
    }

    return operations;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "create") {
        if (!parentInterface.trim()) {
          throw new Error("Parent interface is required");
        }
        if (!vlanId.trim()) {
          throw new Error("VLAN ID is required");
        }

        const vlanIdNum = parseInt(vlanId);
        if (isNaN(vlanIdNum) || vlanIdNum < 1 || vlanIdNum > 4094) {
          throw new Error("VLAN ID must be between 1 and 4094");
        }

        const operations = buildOperations();

        await service.batchConfigure({
          interface: parentInterface,
          operations,
        });
      } else {
        const operations = buildOperations();

        if (operations.length === 0) {
          setError("No changes detected");
          setLoading(false);
          return;
        }

        await service.batchConfigure({
          interface: vlan!.parentInterface,
          operations,
        });
      }

      await service.refreshConfig();

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode} VLAN`);
    } finally {
      setLoading(false);
    }
  };

  const feat = capabilities?.features.vlan;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create VLAN" : `Edit VLAN: ${vlan?.fullName}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Configure a new 802.1Q VLAN sub-interface"
              : "Modify the configuration of this VLAN"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="ip">IP</TabsTrigger>
              <TabsTrigger value="ipv6">IPv6</TabsTrigger>
              <TabsTrigger value="dhcp">DHCP</TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4">
              {mode === "create" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="parent-interface">
                      Parent Interface <span className="text-destructive">*</span>
                    </Label>
                    <InterfaceSelect
                      value={parentInterface}
                      onValueChange={setParentInterface}
                      id="parent-interface"
                      interfaces={interfaces.map((i) => ({ name: i.name, type: "", description: i.description ?? null }))}
                      placeholder="Select parent interface"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vlan-id">
                      VLAN ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="vlan-id"
                      type="number"
                      min="1"
                      max="4094"
                      placeholder="100"
                      value={vlanId}
                      onChange={(e) => setVlanId(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Valid range: 1-4094
                    </p>
                  </div>
                </>
              )}

              {mode === "edit" && (
                <div className="space-y-2">
                  <Label>VLAN Interface</Label>
                  <Input value={vlan?.fullName} disabled className="font-mono" />
                  <p className="text-xs text-muted-foreground">
                    Parent: {vlan?.parentInterface} | VLAN ID: {vlan?.vlan_id}
                  </p>
                </div>
              )}

              {feat?.vif_description && (
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Guest Network VLAN"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              )}

              {feat?.vif_address && (
                <div className="space-y-2">
                  <Label>IP Addresses</Label>
                  {addresses.map((address, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="10.0.0.1/24 or 2001:db8::1/64"
                        value={address}
                        onChange={(e) => handleAddressChange(index, e.target.value)}
                      />
                      {addresses.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveAddress(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddAddress}
                  >
                    Add Address
                  </Button>
                </div>
              )}

              {feat?.vif_disable && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="disable"
                    checked={disabled}
                    onCheckedChange={(checked) => setDisabled(checked as boolean)}
                  />
                  <Label htmlFor="disable" className="cursor-pointer">
                    Administratively disable VLAN
                  </Label>
                </div>
              )}
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {feat?.vif_mtu && (
                  <div className="space-y-2">
                    <Label htmlFor="mtu">MTU</Label>
                    <Input
                      id="mtu"
                      type="number"
                      placeholder="1500"
                      value={mtu}
                      onChange={(e) => setMtu(e.target.value)}
                    />
                  </div>
                )}

                {feat?.vif_mac && (
                  <div className="space-y-2">
                    <Label htmlFor="mac">MAC Address</Label>
                    <Input
                      id="mac"
                      placeholder="00:11:22:33:44:55"
                      value={mac}
                      onChange={(e) => setMac(e.target.value)}
                    />
                  </div>
                )}

                {feat?.vif_vrf && (
                  <div className="space-y-2">
                    <Label htmlFor="vrf">VRF</Label>
                    <VrfSelect
                      id="vrf"
                      value={vrf}
                      onValueChange={setVrf}
                    />
                  </div>
                )}

                {feat?.vif_redirect && (
                  <div className="space-y-2">
                    <Label htmlFor="redirect">Redirect</Label>
                    <Input
                      id="redirect"
                      placeholder="eth1"
                      value={redirect}
                      onChange={(e) => setRedirect(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Redirect traffic to another interface</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {feat?.vif_egress_qos && (
                  <div className="space-y-2">
                    <Label htmlFor="egress-qos">Egress QoS</Label>
                    <Input
                      id="egress-qos"
                      placeholder="0:0 1:1 2:2"
                      value={egressQos}
                      onChange={(e) => setEgressQos(e.target.value)}
                    />
                  </div>
                )}

                {feat?.vif_ingress_qos && (
                  <div className="space-y-2">
                    <Label htmlFor="ingress-qos">Ingress QoS</Label>
                    <Input
                      id="ingress-qos"
                      placeholder="0:0 1:1 2:2"
                      value={ingressQos}
                      onChange={(e) => setIngressQos(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {feat?.vif_mirror && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mirror-ingress">Mirror Ingress</Label>
                    <Input
                      id="mirror-ingress"
                      placeholder="eth1"
                      value={mirrorIngress}
                      onChange={(e) => setMirrorIngress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mirror-egress">Mirror Egress</Label>
                    <Input
                      id="mirror-egress"
                      placeholder="eth1"
                      value={mirrorEgress}
                      onChange={(e) => setMirrorEgress(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {feat?.vif_disable_link_detect && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="disable-link-detect"
                    checked={disableLinkDetect}
                    onCheckedChange={(checked) => setDisableLinkDetect(checked as boolean)}
                  />
                  <Label htmlFor="disable-link-detect" className="cursor-pointer">
                    Disable link detection
                  </Label>
                </div>
              )}
            </TabsContent>

            {/* IP Tab */}
            <TabsContent value="ip" className="space-y-4">
              {feat?.vif_ip && (
                <>
                  <h3 className="text-sm font-semibold">IPv4 Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {feat?.vif_ip_adjust_mss && (
                      <div className="space-y-2">
                        <Label htmlFor="ip-adjust-mss">Adjust MSS</Label>
                        <Input
                          id="ip-adjust-mss"
                          placeholder="1400 or clamp-mss-to-pmtu"
                          value={ipAdjustMss}
                          onChange={(e) => setIpAdjustMss(e.target.value)}
                        />
                      </div>
                    )}

                    {feat?.vif_ip_arp_cache_timeout && (
                      <div className="space-y-2">
                        <Label htmlFor="ip-arp-cache-timeout">ARP Cache Timeout</Label>
                        <Input
                          id="ip-arp-cache-timeout"
                          type="number"
                          placeholder="30"
                          value={ipArpCacheTimeout}
                          onChange={(e) => setIpArpCacheTimeout(e.target.value)}
                        />
                      </div>
                    )}

                    {feat?.vif_ip_source_validation && (
                      <div className="space-y-2">
                        <Label htmlFor="ip-source-validation">Source Validation</Label>
                        <Select value={ipSourceValidation || "__none__"} onValueChange={(v) => setIpSourceValidation(v === "__none__" ? "" : v)}>
                          <SelectTrigger id="ip-source-validation">
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            <SelectItem value="strict">Strict</SelectItem>
                            <SelectItem value="loose">Loose</SelectItem>
                            <SelectItem value="disable">Disable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">ARP / Forwarding Flags</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {feat?.vif_ip_disable_arp_filter && (
                        <div className="flex items-center space-x-2">
                          <Checkbox id="ip-disable-arp-filter" checked={ipDisableArpFilter} onCheckedChange={(c) => setIpDisableArpFilter(c as boolean)} />
                          <Label htmlFor="ip-disable-arp-filter" className="cursor-pointer text-sm">Disable ARP Filter</Label>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Checkbox id="ip-disable-forwarding" checked={ipDisableForwarding} onCheckedChange={(c) => setIpDisableForwarding(c as boolean)} />
                        <Label htmlFor="ip-disable-forwarding" className="cursor-pointer text-sm">Disable Forwarding</Label>
                      </div>
                      {feat?.vif_ip_enable_arp_accept && (
                        <div className="flex items-center space-x-2">
                          <Checkbox id="ip-enable-arp-accept" checked={ipEnableArpAccept} onCheckedChange={(c) => setIpEnableArpAccept(c as boolean)} />
                          <Label htmlFor="ip-enable-arp-accept" className="cursor-pointer text-sm">Enable ARP Accept</Label>
                        </div>
                      )}
                      {feat?.vif_ip_enable_arp_announce && (
                        <div className="flex items-center space-x-2">
                          <Checkbox id="ip-enable-arp-announce" checked={ipEnableArpAnnounce} onCheckedChange={(c) => setIpEnableArpAnnounce(c as boolean)} />
                          <Label htmlFor="ip-enable-arp-announce" className="cursor-pointer text-sm">Enable ARP Announce</Label>
                        </div>
                      )}
                      {feat?.vif_ip_enable_arp_ignore && (
                        <div className="flex items-center space-x-2">
                          <Checkbox id="ip-enable-arp-ignore" checked={ipEnableArpIgnore} onCheckedChange={(c) => setIpEnableArpIgnore(c as boolean)} />
                          <Label htmlFor="ip-enable-arp-ignore" className="cursor-pointer text-sm">Enable ARP Ignore</Label>
                        </div>
                      )}
                      {feat?.vif_ip_enable_directed_broadcast && (
                        <div className="flex items-center space-x-2">
                          <Checkbox id="ip-enable-directed-broadcast" checked={ipEnableDirectedBroadcast} onCheckedChange={(c) => setIpEnableDirectedBroadcast(c as boolean)} />
                          <Label htmlFor="ip-enable-directed-broadcast" className="cursor-pointer text-sm">Enable Directed Broadcast</Label>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Checkbox id="ip-enable-proxy-arp" checked={ipEnableProxyArp} onCheckedChange={(c) => setIpEnableProxyArp(c as boolean)} />
                        <Label htmlFor="ip-enable-proxy-arp" className="cursor-pointer text-sm">Enable Proxy ARP</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="ip-proxy-arp-pvlan" checked={ipProxyArpPvlan} onCheckedChange={(c) => setIpProxyArpPvlan(c as boolean)} />
                        <Label htmlFor="ip-proxy-arp-pvlan" className="cursor-pointer text-sm">Proxy ARP Private VLAN</Label>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* IPv6 Tab */}
            <TabsContent value="ipv6" className="space-y-4">
              {feat?.vif_ipv6 && (
                <>
                  <h3 className="text-sm font-semibold">IPv6 Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ipv6-eui64">EUI-64 Prefix</Label>
                      <Input
                        id="ipv6-eui64"
                        placeholder="2001:db8::/64"
                        value={ipv6Eui64}
                        onChange={(e) => setIpv6Eui64(e.target.value)}
                      />
                    </div>

                    {feat?.vif_ipv6_adjust_mss && (
                      <div className="space-y-2">
                        <Label htmlFor="ipv6-adjust-mss">Adjust MSS</Label>
                        <Input
                          id="ipv6-adjust-mss"
                          placeholder="1400 or clamp-mss-to-pmtu"
                          value={ipv6AdjustMss}
                          onChange={(e) => setIpv6AdjustMss(e.target.value)}
                        />
                      </div>
                    )}

                    {feat?.vif_ipv6_accept_dad && (
                      <div className="space-y-2">
                        <Label htmlFor="ipv6-accept-dad">Accept DAD</Label>
                        <Input
                          id="ipv6-accept-dad"
                          type="number"
                          placeholder="0-2"
                          value={ipv6AcceptDad}
                          onChange={(e) => setIpv6AcceptDad(e.target.value)}
                        />
                      </div>
                    )}

                    {feat?.vif_ipv6_base_reachable_time && (
                      <div className="space-y-2">
                        <Label htmlFor="ipv6-base-reachable-time">Base Reachable Time</Label>
                        <Input
                          id="ipv6-base-reachable-time"
                          type="number"
                          placeholder="30"
                          value={ipv6BaseReachableTime}
                          onChange={(e) => setIpv6BaseReachableTime(e.target.value)}
                        />
                      </div>
                    )}

                    {feat?.vif_ipv6_dup_addr_detect_transmits && (
                      <div className="space-y-2">
                        <Label htmlFor="ipv6-dad-transmits">DAD Transmits</Label>
                        <Input
                          id="ipv6-dad-transmits"
                          type="number"
                          placeholder="1"
                          value={ipv6DupAddrDetectTransmits}
                          onChange={(e) => setIpv6DupAddrDetectTransmits(e.target.value)}
                        />
                      </div>
                    )}

                    {feat?.vif_ipv6_source_validation && (
                      <div className="space-y-2">
                        <Label htmlFor="ipv6-source-validation">Source Validation</Label>
                        <Select value={ipv6SourceValidation || "__none__"} onValueChange={(v) => setIpv6SourceValidation(v === "__none__" ? "" : v)}>
                          <SelectTrigger id="ipv6-source-validation">
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            <SelectItem value="strict">Strict</SelectItem>
                            <SelectItem value="loose">Loose</SelectItem>
                            <SelectItem value="disable">Disable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {feat?.vif_ipv6_address_interface_identifier && (
                      <div className="space-y-2">
                        <Label htmlFor="ipv6-interface-id">Interface Identifier</Label>
                        <Input
                          id="ipv6-interface-id"
                          placeholder="::1"
                          value={ipv6InterfaceIdentifier}
                          onChange={(e) => setIpv6InterfaceIdentifier(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">VyOS 1.5+ only</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">IPv6 Flags</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="ipv6-autoconf" checked={ipv6Autoconf} onCheckedChange={(c) => setIpv6Autoconf(c as boolean)} />
                        <Label htmlFor="ipv6-autoconf" className="cursor-pointer text-sm">Enable Autoconfig (SLAAC)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="ipv6-disable-forwarding" checked={ipv6DisableForwarding} onCheckedChange={(c) => setIpv6DisableForwarding(c as boolean)} />
                        <Label htmlFor="ipv6-disable-forwarding" className="cursor-pointer text-sm">Disable Forwarding</Label>
                      </div>
                      {feat?.vif_ipv6_address_no_default_link_local && (
                        <div className="flex items-center space-x-2">
                          <Checkbox id="ipv6-no-default-link-local" checked={ipv6NoDefaultLinkLocal} onCheckedChange={(c) => setIpv6NoDefaultLinkLocal(c as boolean)} />
                          <Label htmlFor="ipv6-no-default-link-local" className="cursor-pointer text-sm">No Default Link-Local</Label>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* DHCP Tab */}
            <TabsContent value="dhcp" className="space-y-4">
              {feat?.vif_dhcp_options && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">DHCP Options</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dhcp-client-id">Client ID</Label>
                      <Input
                        id="dhcp-client-id"
                        placeholder="client-identifier"
                        value={dhcpClientId}
                        onChange={(e) => setDhcpClientId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dhcp-hostname">Host Name</Label>
                      <Input
                        id="dhcp-hostname"
                        placeholder="my-host"
                        value={dhcpHostName}
                        onChange={(e) => setDhcpHostName(e.target.value)}
                      />
                    </div>
                    {feat?.vif_dhcp_options_default_route_distance && (
                      <div className="space-y-2">
                        <Label htmlFor="dhcp-default-route-distance">Default Route Distance</Label>
                        <Input
                          id="dhcp-default-route-distance"
                          type="number"
                          placeholder="210"
                          value={dhcpDefaultRouteDistance}
                          onChange={(e) => setDhcpDefaultRouteDistance(e.target.value)}
                        />
                      </div>
                    )}
                    {feat?.vif_dhcp_options_vendor_class_id && (
                      <div className="space-y-2">
                        <Label htmlFor="dhcp-vendor-class-id">Vendor Class ID</Label>
                        <Input
                          id="dhcp-vendor-class-id"
                          placeholder="vendor-class"
                          value={dhcpVendorClassId}
                          onChange={(e) => setDhcpVendorClassId(e.target.value)}
                        />
                      </div>
                    )}
                    {feat?.vif_dhcp_options_user_class && (
                      <div className="space-y-2">
                        <Label htmlFor="dhcp-user-class">User Class</Label>
                        <Input
                          id="dhcp-user-class"
                          placeholder="user-class"
                          value={dhcpUserClass}
                          onChange={(e) => setDhcpUserClass(e.target.value)}
                        />
                      </div>
                    )}
                    {feat?.vif_dhcp_options_reject && (
                      <div className="space-y-2">
                        <Label htmlFor="dhcp-reject">Reject Addresses</Label>
                        <Input
                          id="dhcp-reject"
                          placeholder="192.168.1.1,10.0.0.1"
                          value={dhcpReject}
                          onChange={(e) => setDhcpReject(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Comma-separated IP addresses to reject</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {feat?.vif_dhcp_options_mtu && (
                      <div className="flex items-center space-x-2">
                        <Checkbox id="dhcp-mtu" checked={dhcpMtu} onCheckedChange={(c) => setDhcpMtu(c as boolean)} />
                        <Label htmlFor="dhcp-mtu" className="cursor-pointer text-sm">Use DHCP-provided MTU</Label>
                      </div>
                    )}
                    {feat?.vif_dhcp_options_no_default_route && (
                      <div className="flex items-center space-x-2">
                        <Checkbox id="dhcp-no-default-route" checked={dhcpNoDefaultRoute} onCheckedChange={(c) => setDhcpNoDefaultRoute(c as boolean)} />
                        <Label htmlFor="dhcp-no-default-route" className="cursor-pointer text-sm">No Default Route</Label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(capabilities?.features.tcp_mss?.clamp_to_pmtu_ipv4 || capabilities?.features.tcp_mss?.clamp_to_pmtu_ipv6) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">TCP MSS</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mss-clamping"
                      checked={mssClamping}
                      onCheckedChange={(checked) => setMssClamping(checked as boolean)}
                    />
                    <Label htmlFor="mss-clamping" className="cursor-pointer text-sm">
                      Enable TCP MSS clamping to PMTU (IPv4+IPv6)
                    </Label>
                  </div>
                </div>
              )}

              {feat?.vif_dhcpv6_options && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">DHCPv6 Options</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dhcpv6-duid">DUID</Label>
                      <Input
                        id="dhcpv6-duid"
                        placeholder="DUID string"
                        value={dhcpv6Duid}
                        onChange={(e) => setDhcpv6Duid(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="dhcpv6-no-release" checked={dhcpv6NoRelease} onCheckedChange={(c) => setDhcpv6NoRelease(c as boolean)} />
                      <Label htmlFor="dhcpv6-no-release" className="cursor-pointer text-sm">No Release</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="dhcpv6-parameters-only" checked={dhcpv6ParametersOnly} onCheckedChange={(c) => setDhcpv6ParametersOnly(c as boolean)} />
                      <Label htmlFor="dhcpv6-parameters-only" className="cursor-pointer text-sm">Parameters Only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="dhcpv6-rapid-commit" checked={dhcpv6RapidCommit} onCheckedChange={(c) => setDhcpv6RapidCommit(c as boolean)} />
                      <Label htmlFor="dhcpv6-rapid-commit" className="cursor-pointer text-sm">Rapid Commit</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="dhcpv6-temporary" checked={dhcpv6Temporary} onCheckedChange={(c) => setDhcpv6Temporary(c as boolean)} />
                      <Label htmlFor="dhcpv6-temporary" className="cursor-pointer text-sm">Temporary Address</Label>
                    </div>
                    {feat?.vif_dhcpv6_options_no_request_dns && (
                      <div className="flex items-center space-x-2">
                        <Checkbox id="dhcpv6-no-request-dns" checked={dhcpv6NoRequestDns} onCheckedChange={(c) => setDhcpv6NoRequestDns(c as boolean)} />
                        <Label htmlFor="dhcpv6-no-request-dns" className="cursor-pointer text-sm">No Request DNS (1.5+)</Label>
                      </div>
                    )}
                    {feat?.vif_dhcpv6_options_no_request_domain_name && (
                      <div className="flex items-center space-x-2">
                        <Checkbox id="dhcpv6-no-request-domain-name" checked={dhcpv6NoRequestDomainName} onCheckedChange={(c) => setDhcpv6NoRequestDomainName(c as boolean)} />
                        <Label htmlFor="dhcpv6-no-request-domain-name" className="cursor-pointer text-sm">No Request Domain (1.5+)</Label>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create VLAN" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
