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
import { showService } from "@/lib/api/show";
import type { EthernetInterface, EthernetCapabilities, BatchOperation } from "@/lib/api/types/ethernet";
import { Loader2, X, AlertCircle } from "lucide-react";

interface ComprehensiveEthernetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interface?: EthernetInterface | null;
  capabilities: EthernetCapabilities | null;
  onSuccess: () => void;
  mode: "create" | "edit";
}

export function ComprehensiveEthernetModal({
  open,
  onOpenChange,
  interface: iface,
  capabilities,
  onSuccess,
  mode,
}: ComprehensiveEthernetModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available interfaces for create mode
  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);

  // Basic settings
  const [interfaceName, setInterfaceName] = useState("");
  const [description, setDescription] = useState("");
  const [addresses, setAddresses] = useState<string[]>([]);
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Ethernet specific
  const [speed, setSpeed] = useState("");
  const [duplex, setDuplex] = useState("");
  const [mac, setMac] = useState("");

  // Offload settings
  const [offloadGro, setOffloadGro] = useState("");
  const [offloadGso, setOffloadGso] = useState("");
  const [offloadLro, setOffloadLro] = useState("");
  const [offloadRps, setOffloadRps] = useState("");
  const [offloadSg, setOffloadSg] = useState("");
  const [offloadTso, setOffloadTso] = useState("");
  const [offloadHwTcOffload, setOffloadHwTcOffload] = useState("");
  const [offloadRfs, setOffloadRfs] = useState("");

  // Ring buffer
  const [ringBufferRx, setRingBufferRx] = useState("");
  const [ringBufferTx, setRingBufferTx] = useState("");

  // TCP MSS
  const [ipAdjustMss, setIpAdjustMss] = useState("");
  const [ipv6AdjustMss, setIpv6AdjustMss] = useState("");
  const [ipClampMssToPmtu, setIpClampMssToPmtu] = useState(false);
  const [ipv6ClampMssToPmtu, setIpv6ClampMssToPmtu] = useState(false);

  // ARP settings
  const [arpCacheTimeout, setArpCacheTimeout] = useState("");
  const [arpDisableFilter, setArpDisableFilter] = useState(false);
  const [arpEnableAccept, setArpEnableAccept] = useState(false);
  const [arpEnableAnnounce, setArpEnableAnnounce] = useState(false);
  const [arpEnableIgnore, setArpEnableIgnore] = useState(false);
  const [arpEnableProxyArp, setArpEnableProxyArp] = useState(false);
  const [arpProxyArpPvlan, setArpProxyArpPvlan] = useState(false);

  // IP settings
  const [ipSourceValidation, setIpSourceValidation] = useState("");
  const [ipEnableDirectedBroadcast, setIpEnableDirectedBroadcast] = useState(false);
  const [ipDisableForwarding, setIpDisableForwarding] = useState(false);

  // IPv6 settings
  const [ipv6Autoconf, setIpv6Autoconf] = useState(false);
  const [ipv6Eui64, setIpv6Eui64] = useState("");
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);
  const [ipv6DupAddrDetectTransmits, setIpv6DupAddrDetectTransmits] = useState("");
  const [ipv6AcceptDad, setIpv6AcceptDad] = useState("");
  const [ipv6NoDefaultLinkLocal, setIpv6NoDefaultLinkLocal] = useState(false);
  const [ipv6BaseReachableTime, setIpv6BaseReachableTime] = useState("");
  const [ipv6SourceValidation, setIpv6SourceValidation] = useState("");

  // Flow and Link
  const [disableFlowControl, setDisableFlowControl] = useState(false);
  const [disableLinkDetect, setDisableLinkDetect] = useState(false);

  // DHCP options
  const [dhcpClientId, setDhcpClientId] = useState("");
  const [dhcpHostName, setDhcpHostName] = useState("");
  const [dhcpVendorClassId, setDhcpVendorClassId] = useState("");
  const [dhcpNoDefaultRoute, setDhcpNoDefaultRoute] = useState(false);
  const [dhcpDefaultRouteDistance, setDhcpDefaultRouteDistance] = useState("");
  const [dhcpReject, setDhcpReject] = useState("");
  const [dhcpUserClass, setDhcpUserClass] = useState("");
  const [dhcpMtu, setDhcpMtu] = useState(false);

  // DHCPv6 options
  const [dhcpv6Duid, setDhcpv6Duid] = useState("");
  const [dhcpv6RapidCommit, setDhcpv6RapidCommit] = useState(false);
  const [dhcpv6NoRelease, setDhcpv6NoRelease] = useState(false);
  const [dhcpv6ParametersOnly, setDhcpv6ParametersOnly] = useState(false);
  const [dhcpv6Temporary, setDhcpv6Temporary] = useState(false);

  // Port mirroring
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");

  // EAPoL
  const [eapolCaCertFile, setEapolCaCertFile] = useState("");
  const [eapolCertFile, setEapolCertFile] = useState("");
  const [eapolKeyFile, setEapolKeyFile] = useState("");
  const [eapolPassphrase, setEapolPassphrase] = useState("");

  // EVPN
  const [evpnUplink, setEvpnUplink] = useState(false);

  // Redirect
  const [redirect, setRedirect] = useState("");

  // Switchdev
  const [switchdev, setSwitchdev] = useState(false);

  // Interrupt Coalescing
  const [icAdaptiveRx, setIcAdaptiveRx] = useState(false);
  const [icAdaptiveTx, setIcAdaptiveTx] = useState(false);
  const [icCqeModeRx, setIcCqeModeRx] = useState(false);
  const [icCqeModeTx, setIcCqeModeTx] = useState(false);
  const [icRxUsecs, setIcRxUsecs] = useState("");
  const [icRxFrames, setIcRxFrames] = useState("");
  const [icTxUsecs, setIcTxUsecs] = useState("");
  const [icTxFrames, setIcTxFrames] = useState("");

  // Fetch available ethernet interfaces when opening in create mode
  useEffect(() => {
    if (open && mode === "create") {
      setLoadingInterfaces(true);
      showService
        .getAvailableEthernetInterfaces()
        .then((res) => {
          setAvailableInterfaces(res.interfaces);
          if (res.interfaces.length > 0) {
            setInterfaceName(res.interfaces[0]);
          }
        })
        .catch(() => setAvailableInterfaces([]))
        .finally(() => setLoadingInterfaces(false));
    }
  }, [open, mode]);

  // Initialize form with interface data
  useEffect(() => {
    if (iface && mode === "edit") {
      setInterfaceName(iface.name);
      setDescription(iface.description || "");
      setAddresses(iface.addresses.length > 0 ? [...iface.addresses] : []);
      setMtu(iface.mtu || "");
      setVrf(iface.vrf || "");
      setDisabled(iface.disable || false);
      setSpeed(iface.speed || "");
      setDuplex(iface.duplex || "");
      setMac(iface.mac || "");
      setDisableFlowControl(iface.disable_flow_control || false);
      setDisableLinkDetect(iface.disable_link_detect || false);

      // Offload
      if (iface.offload) {
        setOffloadGro(iface.offload.gro || "");
        setOffloadGso(iface.offload.gso || "");
        setOffloadLro(iface.offload.lro || "");
        setOffloadRps(iface.offload.rps || "");
        setOffloadSg(iface.offload.sg || "");
        setOffloadTso(iface.offload.tso || "");
        setOffloadHwTcOffload(iface.offload.hw_tc_offload || "");
        setOffloadRfs(iface.offload.rfs || "");
      }

      // Ring buffer
      if (iface.ring_buffer) {
        setRingBufferRx(iface.ring_buffer.rx || "");
        setRingBufferTx(iface.ring_buffer.tx || "");
      }

      // IP settings
      if (iface.ip) {
        setIpAdjustMss(iface.ip.adjust_mss || "");
        setArpCacheTimeout(iface.ip.arp_cache_timeout || "");
        setArpDisableFilter(iface.ip.disable_arp_filter || false);
        setArpEnableAccept(iface.ip.enable_arp_accept || false);
        setArpEnableAnnounce(iface.ip.enable_arp_announce || false);
        setArpEnableIgnore(iface.ip.enable_arp_ignore || false);
        setArpEnableProxyArp(iface.ip.enable_proxy_arp || false);
        setArpProxyArpPvlan(iface.ip.proxy_arp_pvlan || false);
        setIpSourceValidation(iface.ip.source_validation || "");
        setIpEnableDirectedBroadcast(iface.ip.enable_directed_broadcast || false);
        setIpDisableForwarding(iface.ip.disable_forwarding || false);
      }

      // IPv6 settings
      if (iface.ipv6) {
        setIpv6AdjustMss(iface.ipv6.adjust_mss || "");
        setIpv6DisableForwarding(iface.ipv6.disable_forwarding || false);
        setIpv6DupAddrDetectTransmits(iface.ipv6.dup_addr_detect_transmits || "");
        setIpv6AcceptDad(iface.ipv6.accept_dad || "");
        setIpv6NoDefaultLinkLocal(iface.ipv6.no_default_link_local || false);
        setIpv6BaseReachableTime(iface.ipv6.base_reachable_time || "");
        setIpv6SourceValidation(iface.ipv6.source_validation || "");
      }

      // DHCP options
      if (iface.dhcp_options) {
        setDhcpClientId(iface.dhcp_options.client_id || "");
        setDhcpHostName(iface.dhcp_options.host_name || "");
        setDhcpVendorClassId(iface.dhcp_options.vendor_class_id || "");
        setDhcpNoDefaultRoute(iface.dhcp_options.no_default_route || false);
        setDhcpDefaultRouteDistance(iface.dhcp_options.default_route_distance || "");
        const reject = iface.dhcp_options.reject;
        setDhcpReject(Array.isArray(reject) ? reject.join(", ") : reject || "");
        setDhcpUserClass(iface.dhcp_options.user_class || "");
        setDhcpMtu(iface.dhcp_options.mtu || false);
      }

      // DHCPv6 options
      if (iface.dhcpv6_options) {
        setDhcpv6Duid(iface.dhcpv6_options.duid || "");
        setDhcpv6RapidCommit(iface.dhcpv6_options.rapid_commit || false);
        setDhcpv6NoRelease(iface.dhcpv6_options.no_release || false);
        setDhcpv6ParametersOnly(iface.dhcpv6_options.parameters_only || false);
        setDhcpv6Temporary(iface.dhcpv6_options.temporary || false);
      }

      // Port mirroring
      if (iface.mirror) {
        setMirrorIngress(iface.mirror.ingress || "");
        setMirrorEgress(iface.mirror.egress || "");
      }

      // EAPoL
      if (iface.eapol) {
        setEapolCaCertFile(iface.eapol.ca_cert_file || "");
        setEapolCertFile(iface.eapol.cert_file || "");
        setEapolKeyFile(iface.eapol.key_file || "");
        setEapolPassphrase(iface.eapol.passphrase || "");
      }

      // EVPN
      if (iface.evpn) {
        setEvpnUplink(iface.evpn.uplink || false);
      }

      // Redirect
      setRedirect(iface.redirect || "");

      // Switchdev
      setSwitchdev(iface.switchdev || false);

      // Interrupt Coalescing
      if (iface.interrupt_coalescing) {
        setIcAdaptiveRx(iface.interrupt_coalescing.adaptive_rx || false);
        setIcAdaptiveTx(iface.interrupt_coalescing.adaptive_tx || false);
        setIcCqeModeRx(iface.interrupt_coalescing.cqe_mode_rx || false);
        setIcCqeModeTx(iface.interrupt_coalescing.cqe_mode_tx || false);
        setIcRxUsecs(iface.interrupt_coalescing.rx_usecs || "");
        setIcRxFrames(iface.interrupt_coalescing.rx_frames || "");
        setIcTxUsecs(iface.interrupt_coalescing.tx_usecs || "");
        setIcTxFrames(iface.interrupt_coalescing.tx_frames || "");
      }
    } else {
      resetForm();
    }
    setError(null);
  }, [iface, mode, open]);

  const resetForm = () => {
    setInterfaceName("");
    setAvailableInterfaces([]);
    setDescription("");
    setAddresses([]);
    setMtu("");
    setVrf("");
    setDisabled(false);
    setSpeed("");
    setDuplex("");
    setMac("");
    setOffloadGro("");
    setOffloadGso("");
    setOffloadLro("");
    setOffloadRps("");
    setOffloadSg("");
    setOffloadTso("");
    setOffloadHwTcOffload("");
    setOffloadRfs("");
    setRingBufferRx("");
    setRingBufferTx("");
    setIpAdjustMss("");
    setIpv6AdjustMss("");
    setIpClampMssToPmtu(false);
    setIpv6ClampMssToPmtu(false);
    setArpCacheTimeout("");
    setArpDisableFilter(false);
    setArpEnableAccept(false);
    setArpEnableAnnounce(false);
    setArpEnableIgnore(false);
    setArpEnableProxyArp(false);
    setArpProxyArpPvlan(false);
    setIpSourceValidation("");
    setIpEnableDirectedBroadcast(false);
    setIpDisableForwarding(false);
    setIpv6Autoconf(false);
    setIpv6Eui64("");
    setIpv6DisableForwarding(false);
    setIpv6DupAddrDetectTransmits("");
    setIpv6AcceptDad("");
    setIpv6NoDefaultLinkLocal(false);
    setIpv6BaseReachableTime("");
    setIpv6SourceValidation("");
    setDisableFlowControl(false);
    setDisableLinkDetect(false);
    setDhcpClientId("");
    setDhcpHostName("");
    setDhcpVendorClassId("");
    setDhcpNoDefaultRoute(false);
    setDhcpDefaultRouteDistance("");
    setDhcpReject("");
    setDhcpUserClass("");
    setDhcpMtu(false);
    setDhcpv6Duid("");
    setDhcpv6RapidCommit(false);
    setDhcpv6NoRelease(false);
    setDhcpv6ParametersOnly(false);
    setDhcpv6Temporary(false);
    setMirrorIngress("");
    setMirrorEgress("");
    setEapolCaCertFile("");
    setEapolCertFile("");
    setEapolKeyFile("");
    setEapolPassphrase("");
    setEvpnUplink(false);
    setRedirect("");
    setSwitchdev(false);
    setIcAdaptiveRx(false);
    setIcAdaptiveTx(false);
    setIcCqeModeRx(false);
    setIcCqeModeTx(false);
    setIcRxUsecs("");
    setIcRxFrames("");
    setIcTxUsecs("");
    setIcTxFrames("");
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

  const buildOperations = (): BatchOperation[] => {
    const operations: BatchOperation[] = [];

    if (mode === "edit" && !iface) return operations;

    // Helper to add operation if value changed
    const addIfChanged = (
      currentValue: string | boolean | undefined | null,
      newValue: string | boolean,
      setOp: string,
      deleteOp?: string
    ) => {
      const current = currentValue || "";
      const newVal = typeof newValue === "string" ? newValue.trim() : newValue;

      if (mode === "create") {
        if (typeof newValue === "string" && newValue.trim()) {
          operations.push({ op: setOp, value: newValue.trim() });
        } else if (typeof newValue === "boolean" && newValue) {
          operations.push({ op: setOp });
        }
      } else if (mode === "edit") {
        if (newVal !== current) {
          if ((typeof newVal === "string" && newVal) || (typeof newVal === "boolean" && newVal)) {
            operations.push({ op: setOp, value: typeof newVal === "string" ? newVal : undefined });
          } else if (deleteOp && current) {
            operations.push({ op: deleteOp });
          }
        }
      }
    };

    // Helper for boolean toggle operations
    const addBooleanToggle = (
      currentValue: boolean | undefined | null,
      newValue: boolean,
      setOp: string,
      deleteOp: string
    ) => {
      if (mode === "create") {
        if (newValue) operations.push({ op: setOp });
      } else if (mode === "edit") {
        if (newValue !== (currentValue || false)) {
          operations.push({ op: newValue ? setOp : deleteOp });
        }
      }
    };

    // Basic settings
    addIfChanged(iface?.description, description, "set_description", "delete_description");
    addIfChanged(iface?.mtu, mtu, "set_mtu", "delete_mtu");
    addIfChanged(iface?.vrf, vrf, "set_vrf", "delete_vrf");

    // Addresses
    const currentAddrs = new Set(iface?.addresses || []);
    const newAddrs = new Set(addresses.filter((a) => a.trim() !== ""));
    for (const addr of newAddrs) {
      if (!currentAddrs.has(addr)) {
        operations.push({ op: "set_address", value: addr });
      }
    }
    if (mode === "edit") {
      for (const addr of currentAddrs) {
        if (!newAddrs.has(addr)) {
          operations.push({ op: "delete_address", value: addr });
        }
      }
    }

    // Ethernet specific
    addIfChanged(iface?.speed, speed, "set_speed", "delete_speed");
    addIfChanged(iface?.duplex, duplex, "set_duplex", "delete_duplex");
    addIfChanged(iface?.mac, mac, "set_mac", "delete_mac");

    // Disable/Enable
    if (mode === "edit" && disabled !== (iface?.disable || false)) {
      operations.push({ op: disabled ? "disable" : "enable" });
    } else if (mode === "create" && disabled) {
      operations.push({ op: "disable" });
    }

    // Offload settings (special handling for on/off toggles)
    if (capabilities?.features.offload) {
      const handleOffloadSetting = (current: string | null | undefined, newVal: string, setOp: string, deleteOp: string) => {
        const currentValue = current || "";
        const newValue = newVal.trim();

        if (mode === "create") {
          if (newValue === "on") {
            operations.push({ op: setOp });
          }
        } else if (mode === "edit") {
          if (currentValue !== newValue) {
            if (newValue === "on") {
              operations.push({ op: setOp });
            } else if (newValue === "off" && currentValue === "on") {
              operations.push({ op: deleteOp });
            }
          }
        }
      };

      handleOffloadSetting(iface?.offload?.gro, offloadGro, "set_offload_gro", "delete_offload_gro");
      handleOffloadSetting(iface?.offload?.gso, offloadGso, "set_offload_gso", "delete_offload_gso");
      handleOffloadSetting(iface?.offload?.lro, offloadLro, "set_offload_lro", "delete_offload_lro");
      handleOffloadSetting(iface?.offload?.rps, offloadRps, "set_offload_rps", "delete_offload_rps");
      handleOffloadSetting(iface?.offload?.sg, offloadSg, "set_offload_sg", "delete_offload_sg");
      handleOffloadSetting(iface?.offload?.tso, offloadTso, "set_offload_tso", "delete_offload_tso");
      handleOffloadSetting(iface?.offload?.hw_tc_offload, offloadHwTcOffload, "set_offload_hw_tc_offload", "delete_offload_hw_tc_offload");
      handleOffloadSetting(iface?.offload?.rfs, offloadRfs, "set_offload_rfs", "delete_offload_rfs");
    }

    // Ring buffer
    if (capabilities?.features.ring_buffer) {
      addIfChanged(iface?.ring_buffer?.rx, ringBufferRx, "set_ring_buffer_rx");
      addIfChanged(iface?.ring_buffer?.tx, ringBufferTx, "set_ring_buffer_tx");
    }

    // TCP MSS
    if (capabilities?.features.tcp_mss) {
      if (ipClampMssToPmtu && !iface?.ip?.adjust_mss) {
        operations.push({ op: "set_ip_adjust_mss_clamp_to_pmtu" });
      } else {
        addIfChanged(iface?.ip?.adjust_mss, ipAdjustMss, "set_ip_adjust_mss");
      }
      if (ipv6ClampMssToPmtu && !iface?.ipv6?.adjust_mss) {
        operations.push({ op: "set_ipv6_adjust_mss_clamp_to_pmtu" });
      } else {
        addIfChanged(iface?.ipv6?.adjust_mss, ipv6AdjustMss, "set_ipv6_adjust_mss");
      }
    }

    // ARP settings
    if (capabilities?.features.arp) {
      addIfChanged(iface?.ip?.arp_cache_timeout, arpCacheTimeout, "set_ip_arp_cache_timeout");
      if (arpDisableFilter !== (iface?.ip?.disable_arp_filter || false)) {
        operations.push({ op: "set_ip_disable_arp_filter", value: arpDisableFilter ? "true" : "false" });
      }
      if (arpEnableAccept !== (iface?.ip?.enable_arp_accept || false)) {
        operations.push({ op: "set_ip_enable_arp_accept", value: arpEnableAccept ? "true" : "false" });
      }
      if (arpEnableAnnounce !== (iface?.ip?.enable_arp_announce || false)) {
        operations.push({ op: "set_ip_enable_arp_announce", value: arpEnableAnnounce ? "true" : "false" });
      }
      if (arpEnableIgnore !== (iface?.ip?.enable_arp_ignore || false)) {
        operations.push({ op: "set_ip_enable_arp_ignore", value: arpEnableIgnore ? "true" : "false" });
      }
      if (arpEnableProxyArp !== (iface?.ip?.enable_proxy_arp || false)) {
        operations.push({ op: "set_ip_enable_proxy_arp", value: arpEnableProxyArp ? "true" : "false" });
      }
      if (arpProxyArpPvlan !== (iface?.ip?.proxy_arp_pvlan || false)) {
        operations.push({ op: "set_ip_proxy_arp_pvlan", value: arpProxyArpPvlan ? "true" : "false" });
      }
    }

    // IP settings
    if (capabilities?.features.ip) {
      addIfChanged(iface?.ip?.source_validation, ipSourceValidation, "set_ip_source_validation", "delete_ip_source_validation");
      if (ipEnableDirectedBroadcast !== (iface?.ip?.enable_directed_broadcast || false)) {
        operations.push({ op: "set_ip_enable_directed_broadcast", value: ipEnableDirectedBroadcast ? "true" : "false" });
      }
      addBooleanToggle(iface?.ip?.disable_forwarding, ipDisableForwarding, "set_ip_disable_forwarding", "delete_ip_disable_forwarding");
    }

    // IPv6 settings
    if (capabilities?.features.ipv6) {
      if (ipv6Autoconf !== (iface?.ipv6 ? false : false)) {
        operations.push({ op: "set_ipv6_address_autoconf", value: ipv6Autoconf ? "true" : "false" });
      }
      addIfChanged("", ipv6Eui64, "set_ipv6_address_eui64");
      if (ipv6DisableForwarding !== (iface?.ipv6?.disable_forwarding || false)) {
        operations.push({ op: "set_ipv6_disable_forwarding", value: ipv6DisableForwarding ? "true" : "false" });
      }
      addIfChanged(iface?.ipv6?.dup_addr_detect_transmits, ipv6DupAddrDetectTransmits, "set_ipv6_dup_addr_detect_transmits");
      addIfChanged(iface?.ipv6?.accept_dad, ipv6AcceptDad, "set_ipv6_accept_dad");
      addBooleanToggle(iface?.ipv6?.no_default_link_local, ipv6NoDefaultLinkLocal, "set_ipv6_address_no_default_link_local", "delete_ipv6_address_no_default_link_local");
      addIfChanged(iface?.ipv6?.base_reachable_time, ipv6BaseReachableTime, "set_ipv6_base_reachable_time");
      addIfChanged(iface?.ipv6?.source_validation, ipv6SourceValidation, "set_ipv6_source_validation", "delete_ipv6_source_validation");
    }

    // Flow and Link
    if (disableFlowControl !== (iface?.disable_flow_control || false)) {
      operations.push({ op: disableFlowControl ? "set_disable_flow_control" : "delete_disable_flow_control" });
    }
    if (disableLinkDetect !== (iface?.disable_link_detect || false)) {
      operations.push({ op: disableLinkDetect ? "set_disable_link_detect" : "delete_disable_link_detect" });
    }

    // DHCP options
    if (capabilities?.features.dhcp) {
      addIfChanged(iface?.dhcp_options?.client_id, dhcpClientId, "set_dhcp_options_client_id");
      addIfChanged(iface?.dhcp_options?.host_name, dhcpHostName, "set_dhcp_options_host_name");
      addIfChanged(iface?.dhcp_options?.vendor_class_id, dhcpVendorClassId, "set_dhcp_options_vendor_class_id");
      if (dhcpNoDefaultRoute !== (iface?.dhcp_options?.no_default_route || false)) {
        operations.push({ op: "set_dhcp_options_no_default_route", value: dhcpNoDefaultRoute ? "true" : "false" });
      }
      addIfChanged(iface?.dhcp_options?.default_route_distance, dhcpDefaultRouteDistance, "set_dhcp_options_default_route_distance");
      addIfChanged(
        Array.isArray(iface?.dhcp_options?.reject) ? iface.dhcp_options.reject.join(", ") : (iface?.dhcp_options?.reject || ""),
        dhcpReject,
        "set_dhcp_options_reject"
      );
      addIfChanged(iface?.dhcp_options?.user_class, dhcpUserClass, "set_dhcp_options_user_class");
      addBooleanToggle(iface?.dhcp_options?.mtu, dhcpMtu, "set_dhcp_options_mtu", "delete_dhcp_options");
    }

    // DHCPv6 options
    if (capabilities?.features.dhcpv6) {
      addIfChanged(iface?.dhcpv6_options?.duid, dhcpv6Duid, "set_dhcpv6_options_duid");
      if (dhcpv6RapidCommit !== (iface?.dhcpv6_options?.rapid_commit || false)) {
        operations.push({ op: "set_dhcpv6_options_rapid_commit", value: dhcpv6RapidCommit ? "true" : "false" });
      }
      addBooleanToggle(iface?.dhcpv6_options?.no_release, dhcpv6NoRelease, "set_dhcpv6_options_no_release", "delete_dhcpv6_options");
      addBooleanToggle(iface?.dhcpv6_options?.parameters_only, dhcpv6ParametersOnly, "set_dhcpv6_options_parameters_only", "delete_dhcpv6_options");
      addBooleanToggle(iface?.dhcpv6_options?.temporary, dhcpv6Temporary, "set_dhcpv6_options_temporary", "delete_dhcpv6_options");
    }

    // Port mirroring
    if (capabilities?.features.port_mirror) {
      addIfChanged(iface?.mirror?.ingress, mirrorIngress, "set_mirror_ingress");
      addIfChanged(iface?.mirror?.egress, mirrorEgress, "set_mirror_egress");
    }

    // EAPoL
    if (capabilities?.features.eapol) {
      addIfChanged(iface?.eapol?.ca_cert_file, eapolCaCertFile, "set_eapol_ca_cert_file");
      addIfChanged(iface?.eapol?.cert_file, eapolCertFile, "set_eapol_cert_file");
      addIfChanged(iface?.eapol?.key_file, eapolKeyFile, "set_eapol_key_file");
      addIfChanged(iface?.eapol?.passphrase, eapolPassphrase, "set_eapol_passphrase");
    }

    // EVPN
    if (capabilities?.features.evpn?.uplink_tracking) {
      if (evpnUplink !== (iface?.evpn?.uplink || false)) {
        operations.push({ op: evpnUplink ? "set_evpn_uplink" : "delete_evpn" });
      }
    }

    // Redirect
    if (capabilities?.features.redirect) {
      addIfChanged(iface?.redirect, redirect, "set_redirect", "delete_redirect");
    }

    // Switchdev
    if (capabilities?.features.switchdev?.supported) {
      addBooleanToggle(iface?.switchdev, switchdev, "set_switchdev", "delete_switchdev");
    }

    // Interrupt Coalescing
    if (capabilities?.features.interrupt_coalescing?.supported) {
      addBooleanToggle(iface?.interrupt_coalescing?.adaptive_rx, icAdaptiveRx, "set_interrupt_coalescing_adaptive_rx", "delete_interrupt_coalescing_adaptive_rx");
      addBooleanToggle(iface?.interrupt_coalescing?.adaptive_tx, icAdaptiveTx, "set_interrupt_coalescing_adaptive_tx", "delete_interrupt_coalescing_adaptive_tx");
      addBooleanToggle(iface?.interrupt_coalescing?.cqe_mode_rx, icCqeModeRx, "set_interrupt_coalescing_cqe_mode_rx", "delete_interrupt_coalescing_cqe_mode_rx");
      addBooleanToggle(iface?.interrupt_coalescing?.cqe_mode_tx, icCqeModeTx, "set_interrupt_coalescing_cqe_mode_tx", "delete_interrupt_coalescing_cqe_mode_tx");
      addIfChanged(iface?.interrupt_coalescing?.rx_usecs, icRxUsecs, "set_interrupt_coalescing_rx_usecs");
      addIfChanged(iface?.interrupt_coalescing?.rx_frames, icRxFrames, "set_interrupt_coalescing_rx_frames");
      addIfChanged(iface?.interrupt_coalescing?.tx_usecs, icTxUsecs, "set_interrupt_coalescing_tx_usecs");
      addIfChanged(iface?.interrupt_coalescing?.tx_frames, icTxFrames, "set_interrupt_coalescing_tx_frames");
    }

    return operations;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "create") {
        if (!interfaceName.trim()) {
          throw new Error("Interface name is required");
        }

        const operations = buildOperations();
        await ethernetService.batchConfigure({
          interface: interfaceName,
          operations,
        });
      } else {
        const operations = buildOperations();

        if (operations.length === 0) {
          setError("No changes detected");
          setLoading(false);
          return;
        }

        await ethernetService.updateInterface(iface!.name, operations);
      }

      // Refresh config cache
      await ethernetService.refreshConfig();

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode} interface`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Ethernet Interface" : `Edit Interface: ${iface?.name}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Configure a new ethernet interface with advanced settings"
              : "Modify the configuration of this ethernet interface"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <pre className="whitespace-pre-wrap font-mono text-sm text-destructive">{error}</pre>
            </div>
          )}

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="ip">IP/IPv6</TabsTrigger>
              <TabsTrigger value="dhcp">DHCP</TabsTrigger>
              <TabsTrigger value="special">Special</TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4">
              {mode === "create" && (
                <div className="space-y-2">
                  <Label htmlFor="interface-name">
                    Interface Name <span className="text-destructive">*</span>
                  </Label>
                  {loadingInterfaces ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground h-9">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading available interfaces…
                    </div>
                  ) : availableInterfaces.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      All ethernet interfaces are already configured.
                    </p>
                  ) : (
                    <Select value={interfaceName} onValueChange={setInterfaceName}>
                      <SelectTrigger id="interface-name">
                        <SelectValue placeholder="Select an interface" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableInterfaces.map((iface) => (
                          <SelectItem key={iface} value={iface}>
                            {iface}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {capabilities?.features.basic.description && (
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="WAN Interface"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              )}

              {capabilities?.features.basic.address && (
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

              <div className="grid grid-cols-2 gap-4">
                {capabilities?.features.ethernet.speed && (
                  <div className="space-y-2">
                    <Label htmlFor="speed">Speed</Label>
                    <Select value={speed || "auto"} onValueChange={(v) => setSpeed(v === "auto" ? "" : v)}>
                      <SelectTrigger id="speed">
                        <SelectValue placeholder="Auto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="10">10 Mbps</SelectItem>
                        <SelectItem value="100">100 Mbps</SelectItem>
                        <SelectItem value="1000">1 Gbps</SelectItem>
                        <SelectItem value="2500">2.5 Gbps</SelectItem>
                        <SelectItem value="5000">5 Gbps</SelectItem>
                        <SelectItem value="10000">10 Gbps</SelectItem>
                        <SelectItem value="25000">25 Gbps</SelectItem>
                        <SelectItem value="40000">40 Gbps</SelectItem>
                        <SelectItem value="50000">50 Gbps</SelectItem>
                        <SelectItem value="100000">100 Gbps</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {capabilities?.features.ethernet.duplex && (
                  <div className="space-y-2">
                    <Label htmlFor="duplex">Duplex</Label>
                    <Select value={duplex || "auto"} onValueChange={(v) => setDuplex(v === "auto" ? "" : v)}>
                      <SelectTrigger id="duplex">
                        <SelectValue placeholder="Auto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="half">Half</SelectItem>
                        <SelectItem value="full">Full</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {capabilities?.features.basic.mtu && (
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

                {capabilities?.features.basic.vrf && (
                  <div className="space-y-2">
                    <Label htmlFor="vrf">VRF</Label>
                    <Input
                      id="vrf"
                      placeholder="MGMT"
                      value={vrf}
                      onChange={(e) => setVrf(e.target.value)}
                    />
                  </div>
                )}

                {iface?.hw_id && mode === "edit" && (
                  <div className="space-y-2">
                    <Label htmlFor="hw-id">Hardware MAC Address</Label>
                    <Input
                      id="hw-id"
                      value={iface.hw_id}
                      disabled
                      className="font-mono"
                    />
                  </div>
                )}

                {capabilities?.features.ethernet.mac && mode === "create" && (
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
              </div>

              {capabilities?.features.basic.disable && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="disable"
                    checked={disabled}
                    onCheckedChange={(checked) => setDisabled(checked as boolean)}
                  />
                  <Label htmlFor="disable" className="cursor-pointer">
                    Administratively disable interface
                  </Label>
                </div>
              )}
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              {capabilities?.features.offload && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Offload Settings</h3>

                  <div className="grid grid-cols-3 gap-4">

                    {/* GRO */}
                    <div className="space-y-2">
                      <Label htmlFor="offload-gro">GRO</Label>
                      <Select value={offloadGro} onValueChange={setOffloadGro}>
                        <SelectTrigger id="offload-gro">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on">On</SelectItem>
                          <SelectItem value="off">Off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* GSO */}
                    <div className="space-y-2">
                      <Label htmlFor="offload-gso">GSO</Label>
                      <Select value={offloadGso} onValueChange={setOffloadGso}>
                        <SelectTrigger id="offload-gso">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on">On</SelectItem>
                          <SelectItem value="off">Off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* LRO */}
                    <div className="space-y-2">
                      <Label htmlFor="offload-lro">LRO</Label>
                      <Select value={offloadLro} onValueChange={setOffloadLro}>
                        <SelectTrigger id="offload-lro">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on">On</SelectItem>
                          <SelectItem value="off">Off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* RPS */}
                    <div className="space-y-2">
                      <Label htmlFor="offload-rps">RPS</Label>
                      <Select value={offloadRps} onValueChange={setOffloadRps}>
                        <SelectTrigger id="offload-rps">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on">On</SelectItem>
                          <SelectItem value="off">Off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* SG */}
                    <div className="space-y-2">
                      <Label htmlFor="offload-sg">SG</Label>
                      <Select value={offloadSg} onValueChange={setOffloadSg}>
                        <SelectTrigger id="offload-sg">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on">On</SelectItem>
                          <SelectItem value="off">Off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* TSO */}
                    <div className="space-y-2">
                      <Label htmlFor="offload-tso">TSO</Label>
                      <Select value={offloadTso} onValueChange={setOffloadTso}>
                        <SelectTrigger id="offload-tso">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on">On</SelectItem>
                          <SelectItem value="off">Off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* HW TC Offload */}
                    {capabilities?.features.offload.hw_tc_offload && (
                      <div className="space-y-2">
                        <Label htmlFor="offload-hw-tc">HW TC Offload</Label>
                        <Select value={offloadHwTcOffload} onValueChange={setOffloadHwTcOffload}>
                          <SelectTrigger id="offload-hw-tc">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="on">On</SelectItem>
                            <SelectItem value="off">Off</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* RFS */}
                    {capabilities?.features.offload.rfs && (
                      <div className="space-y-2">
                        <Label htmlFor="offload-rfs">RFS</Label>
                        <Select value={offloadRfs} onValueChange={setOffloadRfs}>
                          <SelectTrigger id="offload-rfs">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="on">On</SelectItem>
                            <SelectItem value="off">Off</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                  </div>
                </div>
              )}

              {capabilities?.features.ring_buffer && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Ring Buffer</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ring-rx">RX Buffer</Label>
                      <Input
                        id="ring-rx"
                        type="number"
                        placeholder="256"
                        value={ringBufferRx}
                        onChange={(e) => setRingBufferRx(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ring-tx">TX Buffer</Label>
                      <Input
                        id="ring-tx"
                        type="number"
                        placeholder="256"
                        value={ringBufferTx}
                        onChange={(e) => setRingBufferTx(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {capabilities?.features.tcp_mss && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">TCP MSS</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ip-mss">IPv4 Adjust MSS</Label>
                      <Input
                        id="ip-mss"
                        type="number"
                        placeholder="1460"
                        value={ipAdjustMss}
                        onChange={(e) => setIpAdjustMss(e.target.value)}
                        disabled={ipClampMssToPmtu}
                      />
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ip-clamp-pmtu"
                          checked={ipClampMssToPmtu}
                          onCheckedChange={(checked) => setIpClampMssToPmtu(checked as boolean)}
                        />
                        <Label htmlFor="ip-clamp-pmtu" className="cursor-pointer text-xs">
                          Clamp to PMTU
                        </Label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ipv6-mss">IPv6 Adjust MSS</Label>
                      <Input
                        id="ipv6-mss"
                        type="number"
                        placeholder="1440"
                        value={ipv6AdjustMss}
                        onChange={(e) => setIpv6AdjustMss(e.target.value)}
                        disabled={ipv6ClampMssToPmtu}
                      />
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ipv6-clamp-pmtu"
                          checked={ipv6ClampMssToPmtu}
                          onCheckedChange={(checked) => setIpv6ClampMssToPmtu(checked as boolean)}
                        />
                        <Label htmlFor="ipv6-clamp-pmtu" className="cursor-pointer text-xs">
                          Clamp to PMTU
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(capabilities?.features.flow_control || capabilities?.features.link_detect) && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Flow Control & Link Detection</h3>
                  <div className="space-y-2">
                    {capabilities?.features.flow_control && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="disable-flow-control"
                          checked={disableFlowControl}
                          onCheckedChange={(checked) => setDisableFlowControl(checked as boolean)}
                        />
                        <Label htmlFor="disable-flow-control" className="cursor-pointer">
                          Disable Flow Control
                        </Label>
                      </div>
                    )}
                    {capabilities?.features.link_detect && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="disable-link-detect"
                          checked={disableLinkDetect}
                          onCheckedChange={(checked) => setDisableLinkDetect(checked as boolean)}
                        />
                        <Label htmlFor="disable-link-detect" className="cursor-pointer">
                          Disable Link Detection
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* IP/IPv6 Tab */}
            <TabsContent value="ip" className="space-y-4">
              {capabilities?.features.arp && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">ARP Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="arp-cache-timeout">Cache Timeout (seconds)</Label>
                      <Input
                        id="arp-cache-timeout"
                        type="number"
                        placeholder="30"
                        value={arpCacheTimeout}
                        onChange={(e) => setArpCacheTimeout(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="arp-disable-filter"
                        checked={arpDisableFilter}
                        onCheckedChange={(checked) => setArpDisableFilter(checked as boolean)}
                      />
                      <Label htmlFor="arp-disable-filter" className="cursor-pointer text-sm">
                        Disable ARP Filter
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="arp-enable-accept"
                        checked={arpEnableAccept}
                        onCheckedChange={(checked) => setArpEnableAccept(checked as boolean)}
                      />
                      <Label htmlFor="arp-enable-accept" className="cursor-pointer text-sm">
                        Enable ARP Accept
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="arp-enable-announce"
                        checked={arpEnableAnnounce}
                        onCheckedChange={(checked) => setArpEnableAnnounce(checked as boolean)}
                      />
                      <Label htmlFor="arp-enable-announce" className="cursor-pointer text-sm">
                        Enable ARP Announce
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="arp-enable-ignore"
                        checked={arpEnableIgnore}
                        onCheckedChange={(checked) => setArpEnableIgnore(checked as boolean)}
                      />
                      <Label htmlFor="arp-enable-ignore" className="cursor-pointer text-sm">
                        Enable ARP Ignore
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="arp-enable-proxy"
                        checked={arpEnableProxyArp}
                        onCheckedChange={(checked) => setArpEnableProxyArp(checked as boolean)}
                      />
                      <Label htmlFor="arp-enable-proxy" className="cursor-pointer text-sm">
                        Enable Proxy ARP
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="arp-proxy-pvlan"
                        checked={arpProxyArpPvlan}
                        onCheckedChange={(checked) => setArpProxyArpPvlan(checked as boolean)}
                      />
                      <Label htmlFor="arp-proxy-pvlan" className="cursor-pointer text-sm">
                        Proxy ARP PVLAN
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {capabilities?.features.ip && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">IP Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ip-source-validation">Source Validation</Label>
                      <Select value={ipSourceValidation || "none"} onValueChange={(v) => setIpSourceValidation(v === "none" ? "" : v)}>
                        <SelectTrigger id="ip-source-validation">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="strict">Strict</SelectItem>
                          <SelectItem value="loose">Loose</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {capabilities?.features.ip.directed_broadcast && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ip-directed-broadcast"
                          checked={ipEnableDirectedBroadcast}
                          onCheckedChange={(checked) => setIpEnableDirectedBroadcast(checked as boolean)}
                        />
                        <Label htmlFor="ip-directed-broadcast" className="cursor-pointer text-sm">
                          Enable Directed Broadcast
                        </Label>
                      </div>
                    )}
                    {capabilities?.features.ip.disable_forwarding && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ip-disable-forwarding"
                          checked={ipDisableForwarding}
                          onCheckedChange={(checked) => setIpDisableForwarding(checked as boolean)}
                        />
                        <Label htmlFor="ip-disable-forwarding" className="cursor-pointer text-sm">
                          Disable Forwarding
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {capabilities?.features.ipv6 && (
                <div className="space-y-3">
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
                    <div className="space-y-2">
                      <Label htmlFor="ipv6-dad">Duplicate Address Detection</Label>
                      <Input
                        id="ipv6-dad"
                        type="number"
                        placeholder="1"
                        value={ipv6DupAddrDetectTransmits}
                        onChange={(e) => setIpv6DupAddrDetectTransmits(e.target.value)}
                      />
                    </div>
                    {capabilities?.features.ipv6.accept_dad && (
                      <div className="space-y-2">
                        <Label htmlFor="ipv6-accept-dad">Accept DAD</Label>
                        <Input
                          id="ipv6-accept-dad"
                          type="number"
                          placeholder="0, 1, or 2"
                          value={ipv6AcceptDad}
                          onChange={(e) => setIpv6AcceptDad(e.target.value)}
                        />
                      </div>
                    )}
                    {capabilities?.features.ipv6.base_reachable_time && (
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
                    {capabilities?.features.ipv6.source_validation && (
                      <div className="space-y-2">
                        <Label htmlFor="ipv6-source-validation">Source Validation</Label>
                        <Select value={ipv6SourceValidation || "none"} onValueChange={(v) => setIpv6SourceValidation(v === "none" ? "" : v)}>
                          <SelectTrigger id="ipv6-source-validation">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="strict">Strict</SelectItem>
                            <SelectItem value="loose">Loose</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ipv6-autoconf"
                        checked={ipv6Autoconf}
                        onCheckedChange={(checked) => setIpv6Autoconf(checked as boolean)}
                      />
                      <Label htmlFor="ipv6-autoconf" className="cursor-pointer text-sm">
                        Enable Autoconfig
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ipv6-disable-forwarding"
                        checked={ipv6DisableForwarding}
                        onCheckedChange={(checked) => setIpv6DisableForwarding(checked as boolean)}
                      />
                      <Label htmlFor="ipv6-disable-forwarding" className="cursor-pointer text-sm">
                        Disable Forwarding
                      </Label>
                    </div>
                    {capabilities?.features.ipv6.no_default_link_local && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ipv6-no-default-link-local"
                          checked={ipv6NoDefaultLinkLocal}
                          onCheckedChange={(checked) => setIpv6NoDefaultLinkLocal(checked as boolean)}
                        />
                        <Label htmlFor="ipv6-no-default-link-local" className="cursor-pointer text-sm">
                          No Default Link-Local
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* DHCP Tab */}
            <TabsContent value="dhcp" className="space-y-4">
              {capabilities?.features.dhcp && (
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
                    <div className="space-y-2">
                      <Label htmlFor="dhcp-vendor-class">Vendor Class ID</Label>
                      <Input
                        id="dhcp-vendor-class"
                        placeholder="vendor-class"
                        value={dhcpVendorClassId}
                        onChange={(e) => setDhcpVendorClassId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dhcp-route-distance">Default Route Distance</Label>
                      <Input
                        id="dhcp-route-distance"
                        type="number"
                        placeholder="210"
                        value={dhcpDefaultRouteDistance}
                        onChange={(e) => setDhcpDefaultRouteDistance(e.target.value)}
                      />
                    </div>
                    {capabilities?.features.dhcp.reject && (
                      <div className="space-y-2">
                        <Label htmlFor="dhcp-reject">Reject Server</Label>
                        <Input
                          id="dhcp-reject"
                          placeholder="192.168.1.1"
                          value={dhcpReject}
                          onChange={(e) => setDhcpReject(e.target.value)}
                        />
                      </div>
                    )}
                    {capabilities?.features.dhcp.user_class && (
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
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="dhcp-no-default-route"
                        checked={dhcpNoDefaultRoute}
                        onCheckedChange={(checked) => setDhcpNoDefaultRoute(checked as boolean)}
                      />
                      <Label htmlFor="dhcp-no-default-route" className="cursor-pointer text-sm">
                        No Default Route
                      </Label>
                    </div>
                    {capabilities?.features.dhcp.mtu && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="dhcp-mtu"
                          checked={dhcpMtu}
                          onCheckedChange={(checked) => setDhcpMtu(checked as boolean)}
                        />
                        <Label htmlFor="dhcp-mtu" className="cursor-pointer text-sm">
                          Request MTU
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {capabilities?.features.dhcpv6 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">DHCPv6 Options</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dhcpv6-duid">DUID</Label>
                      <Input
                        id="dhcpv6-duid"
                        placeholder="00:01:00:01:12:34:56:78:9a:bc:de:f0"
                        value={dhcpv6Duid}
                        onChange={(e) => setDhcpv6Duid(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="dhcpv6-rapid-commit"
                        checked={dhcpv6RapidCommit}
                        onCheckedChange={(checked) => setDhcpv6RapidCommit(checked as boolean)}
                      />
                      <Label htmlFor="dhcpv6-rapid-commit" className="cursor-pointer text-sm">
                        Rapid Commit
                      </Label>
                    </div>
                    {capabilities?.features.dhcpv6.no_release && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="dhcpv6-no-release"
                          checked={dhcpv6NoRelease}
                          onCheckedChange={(checked) => setDhcpv6NoRelease(checked as boolean)}
                        />
                        <Label htmlFor="dhcpv6-no-release" className="cursor-pointer text-sm">
                          No Release
                        </Label>
                      </div>
                    )}
                    {capabilities?.features.dhcpv6.parameters_only && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="dhcpv6-parameters-only"
                          checked={dhcpv6ParametersOnly}
                          onCheckedChange={(checked) => setDhcpv6ParametersOnly(checked as boolean)}
                        />
                        <Label htmlFor="dhcpv6-parameters-only" className="cursor-pointer text-sm">
                          Parameters Only
                        </Label>
                      </div>
                    )}
                    {capabilities?.features.dhcpv6.temporary && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="dhcpv6-temporary"
                          checked={dhcpv6Temporary}
                          onCheckedChange={(checked) => setDhcpv6Temporary(checked as boolean)}
                        />
                        <Label htmlFor="dhcpv6-temporary" className="cursor-pointer text-sm">
                          Temporary
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Special Features Tab */}
            <TabsContent value="special" className="space-y-4">
              {capabilities?.features.port_mirror && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Port Mirroring</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mirror-ingress">Ingress Interface</Label>
                      <Input
                        id="mirror-ingress"
                        placeholder="eth0"
                        value={mirrorIngress}
                        onChange={(e) => setMirrorIngress(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mirror-egress">Egress Interface</Label>
                      <Input
                        id="mirror-egress"
                        placeholder="eth1"
                        value={mirrorEgress}
                        onChange={(e) => setMirrorEgress(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {capabilities?.features.eapol && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">EAPoL (802.1X)</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="eapol-ca-cert">CA Certificate File</Label>
                      <Input
                        id="eapol-ca-cert"
                        placeholder="/config/auth/ca.pem"
                        value={eapolCaCertFile}
                        onChange={(e) => setEapolCaCertFile(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eapol-cert">Certificate File</Label>
                      <Input
                        id="eapol-cert"
                        placeholder="/config/auth/cert.pem"
                        value={eapolCertFile}
                        onChange={(e) => setEapolCertFile(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eapol-key">Key File</Label>
                      <Input
                        id="eapol-key"
                        placeholder="/config/auth/key.pem"
                        value={eapolKeyFile}
                        onChange={(e) => setEapolKeyFile(e.target.value)}
                      />
                    </div>
                    {capabilities?.features.eapol.passphrase && (
                      <div className="space-y-2">
                        <Label htmlFor="eapol-passphrase">Passphrase</Label>
                        <Input
                          id="eapol-passphrase"
                          type="password"
                          placeholder="EAPoL passphrase"
                          value={eapolPassphrase}
                          onChange={(e) => setEapolPassphrase(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {capabilities?.features.evpn?.uplink_tracking && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">EVPN</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="evpn-uplink"
                      checked={evpnUplink}
                      onCheckedChange={(checked) => setEvpnUplink(checked as boolean)}
                    />
                    <Label htmlFor="evpn-uplink" className="cursor-pointer text-sm">
                      Enable EVPN Uplink Tracking
                    </Label>
                  </div>
                </div>
              )}

              {capabilities?.features.redirect && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Traffic Redirect</h3>
                  <div className="space-y-2">
                    <Label htmlFor="redirect">Redirect to Interface</Label>
                    <Input
                      id="redirect"
                      placeholder="eth1"
                      value={redirect}
                      onChange={(e) => setRedirect(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {capabilities?.features.switchdev?.supported && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Switchdev</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="switchdev"
                      checked={switchdev}
                      onCheckedChange={(checked) => setSwitchdev(checked as boolean)}
                    />
                    <Label htmlFor="switchdev" className="cursor-pointer text-sm">
                      Enable Switchdev Mode
                    </Label>
                  </div>
                </div>
              )}

              {capabilities?.features.interrupt_coalescing?.supported && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Interrupt Coalescing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ic-rx-usecs">RX Usecs</Label>
                      <Input
                        id="ic-rx-usecs"
                        type="number"
                        placeholder="0"
                        value={icRxUsecs}
                        onChange={(e) => setIcRxUsecs(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ic-tx-usecs">TX Usecs</Label>
                      <Input
                        id="ic-tx-usecs"
                        type="number"
                        placeholder="0"
                        value={icTxUsecs}
                        onChange={(e) => setIcTxUsecs(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ic-rx-frames">RX Frames</Label>
                      <Input
                        id="ic-rx-frames"
                        type="number"
                        placeholder="0"
                        value={icRxFrames}
                        onChange={(e) => setIcRxFrames(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ic-tx-frames">TX Frames</Label>
                      <Input
                        id="ic-tx-frames"
                        type="number"
                        placeholder="0"
                        value={icTxFrames}
                        onChange={(e) => setIcTxFrames(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ic-adaptive-rx"
                        checked={icAdaptiveRx}
                        onCheckedChange={(checked) => setIcAdaptiveRx(checked as boolean)}
                      />
                      <Label htmlFor="ic-adaptive-rx" className="cursor-pointer text-sm">
                        Adaptive RX
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ic-adaptive-tx"
                        checked={icAdaptiveTx}
                        onCheckedChange={(checked) => setIcAdaptiveTx(checked as boolean)}
                      />
                      <Label htmlFor="ic-adaptive-tx" className="cursor-pointer text-sm">
                        Adaptive TX
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ic-cqe-mode-rx"
                        checked={icCqeModeRx}
                        onCheckedChange={(checked) => setIcCqeModeRx(checked as boolean)}
                      />
                      <Label htmlFor="ic-cqe-mode-rx" className="cursor-pointer text-sm">
                        CQE Mode RX
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ic-cqe-mode-tx"
                        checked={icCqeModeTx}
                        onCheckedChange={(checked) => setIcCqeModeTx(checked as boolean)}
                      />
                      <Label htmlFor="ic-cqe-mode-tx" className="cursor-pointer text-sm">
                        CQE Mode TX
                      </Label>
                    </div>
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
            <Button
              type="submit"
              disabled={loading || (mode === "create" && (loadingInterfaces || availableInterfaces.length === 0))}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create Interface" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
