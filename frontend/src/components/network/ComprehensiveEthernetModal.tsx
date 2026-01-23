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
import type { EthernetInterface, EthernetCapabilities, BatchOperation } from "@/lib/api/types/ethernet";
import { Loader2, X } from "lucide-react";

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

  // IPv6 settings
  const [ipv6Autoconf, setIpv6Autoconf] = useState(false);
  const [ipv6Eui64, setIpv6Eui64] = useState("");
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);
  const [ipv6DupAddrDetectTransmits, setIpv6DupAddrDetectTransmits] = useState("");

  // Flow and Link
  const [disableFlowControl, setDisableFlowControl] = useState(false);
  const [disableLinkDetect, setDisableLinkDetect] = useState(false);

  // DHCP options
  const [dhcpClientId, setDhcpClientId] = useState("");
  const [dhcpHostName, setDhcpHostName] = useState("");
  const [dhcpVendorClassId, setDhcpVendorClassId] = useState("");
  const [dhcpNoDefaultRoute, setDhcpNoDefaultRoute] = useState(false);
  const [dhcpDefaultRouteDistance, setDhcpDefaultRouteDistance] = useState("");

  // DHCPv6 options
  const [dhcpv6Duid, setDhcpv6Duid] = useState("");
  const [dhcpv6RapidCommit, setDhcpv6RapidCommit] = useState(false);

  // Port mirroring
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");

  // EAPoL
  const [eapolCaCertFile, setEapolCaCertFile] = useState("");
  const [eapolCertFile, setEapolCertFile] = useState("");
  const [eapolKeyFile, setEapolKeyFile] = useState("");

  // EVPN
  const [evpnUplink, setEvpnUplink] = useState(false);

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
      }

      // IPv6 settings
      if (iface.ipv6) {
        setIpv6AdjustMss(iface.ipv6.adjust_mss || "");
        setIpv6DisableForwarding(iface.ipv6.disable_forwarding || false);
        setIpv6DupAddrDetectTransmits(iface.ipv6.dup_addr_detect_transmits || "");
      }

      // DHCP options
      if (iface.dhcp_options) {
        setDhcpClientId(iface.dhcp_options.client_id || "");
        setDhcpHostName(iface.dhcp_options.host_name || "");
        setDhcpVendorClassId(iface.dhcp_options.vendor_class_id || "");
        setDhcpNoDefaultRoute(iface.dhcp_options.no_default_route || false);
        setDhcpDefaultRouteDistance(iface.dhcp_options.default_route_distance || "");
      }

      // DHCPv6 options
      if (iface.dhcpv6_options) {
        setDhcpv6Duid(iface.dhcpv6_options.duid || "");
        setDhcpv6RapidCommit(iface.dhcpv6_options.rapid_commit || false);
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
      }

      // EVPN
      if (iface.evpn) {
        setEvpnUplink(iface.evpn.uplink || false);
      }
    } else {
      resetForm();
    }
    setError(null);
  }, [iface, mode, open]);

  const resetForm = () => {
    setInterfaceName("");
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
    setIpv6Autoconf(false);
    setIpv6Eui64("");
    setIpv6DisableForwarding(false);
    setIpv6DupAddrDetectTransmits("");
    setDisableFlowControl(false);
    setDisableLinkDetect(false);
    setDhcpClientId("");
    setDhcpHostName("");
    setDhcpVendorClassId("");
    setDhcpNoDefaultRoute(false);
    setDhcpDefaultRouteDistance("");
    setDhcpv6Duid("");
    setDhcpv6RapidCommit(false);
    setMirrorIngress("");
    setMirrorEgress("");
    setEapolCaCertFile("");
    setEapolCertFile("");
    setEapolKeyFile("");
    setEvpnUplink(false);
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
          // Only set if explicitly "on"
          if (newValue === "on") {
            operations.push({ op: setOp });
          }
        } else if (mode === "edit") {
          // Only add operation if value changed
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
    }

    // DHCPv6 options
    if (capabilities?.features.dhcpv6) {
      addIfChanged(iface?.dhcpv6_options?.duid, dhcpv6Duid, "set_dhcpv6_options_duid");
      if (dhcpv6RapidCommit !== (iface?.dhcpv6_options?.rapid_commit || false)) {
        operations.push({ op: "set_dhcpv6_options_rapid_commit", value: dhcpv6RapidCommit ? "true" : "false" });
      }
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
    }

    // EVPN
    if (capabilities?.features.evpn?.uplink_tracking) {
      if (evpnUplink !== (iface?.evpn?.uplink || false)) {
        operations.push({ op: evpnUplink ? "set_evpn_uplink" : "delete_evpn" });
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
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
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
                  <Input
                    id="interface-name"
                    placeholder="eth2"
                    value={interfaceName}
                    onChange={(e) => setInterfaceName(e.target.value)}
                    required
                  />
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
                    <div className="flex items-center space-x-2 pt-8">
                      <Checkbox
                        id="ip-directed-broadcast"
                        checked={ipEnableDirectedBroadcast}
                        onCheckedChange={(checked) => setIpEnableDirectedBroadcast(checked as boolean)}
                      />
                      <Label htmlFor="ip-directed-broadcast" className="cursor-pointer text-sm">
                        Enable Directed Broadcast
                      </Label>
                    </div>
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
                  </div>
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
              {mode === "create" ? "Create Interface" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
