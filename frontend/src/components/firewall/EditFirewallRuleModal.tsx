"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertCircle, RefreshCw } from "lucide-react";
import { firewallIPv4Service, type FirewallRule, type FirewallCapabilitiesResponse } from "@/lib/api/firewall-ipv4";
import { firewallIPv6Service } from "@/lib/api/firewall-ipv6";
import { firewallGroupsService, type FirewallGroup } from "@/lib/api/firewall-groups";
import { flowtablesService, type Flowtable } from "@/lib/api/firewall-flowtables";
import { showService } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import type { NetworkInterface } from "@/lib/api/interfaces";
import { CountryMultiSelect } from "./CountryMultiSelect";
import {
  getIPAddressError,
  getMACAddressError,
  getPortError,
} from "@/lib/validators/firewall";

interface EditFirewallRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  rule: FirewallRule;
  protocol?: "ipv4" | "ipv6";
  capabilities?: FirewallCapabilitiesResponse | null;
}

export function EditFirewallRuleModal({
  open,
  onOpenChange,
  onSuccess,
  rule,
  protocol = "ipv4",
  capabilities,
}: EditFirewallRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic fields
  const [description, setDescription] = useState("");
  const [action, setAction] = useState("accept");
  const [ruleProtocol, setRuleProtocol] = useState("");
  const [protocolInvert, setProtocolInvert] = useState(false);

  // Source fields
  const [sourceMode, setSourceMode] = useState<"any" | "address" | "group" | "geoip" | "mac" | "fqdn">("any");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceAddressInvert, setSourceAddressInvert] = useState(false);
  const [sourcePortMode, setSourcePortMode] = useState<"any" | "port" | "group">("any");
  const [sourcePort, setSourcePort] = useState("");
  const [sourcePortGroup, setSourcePortGroup] = useState("");
  const [sourceMac, setSourceMac] = useState("");
  const [sourceGeoipCountry, setSourceGeoipCountry] = useState<string[]>([]);
  const [sourceGeoipInverse, setSourceGeoipInverse] = useState(false);
  const [sourceGroupType, setSourceGroupType] = useState("");
  const [sourceGroupName, setSourceGroupName] = useState("");
  const [sourceGroupInvert, setSourceGroupInvert] = useState(false);
  const [sourceFqdn, setSourceFqdn] = useState("");
  const [sourceAddressMask, setSourceAddressMask] = useState("");
  const [sourcePortGroupInvert, setSourcePortGroupInvert] = useState(false);

  // Destination fields
  const [destMode, setDestMode] = useState<"any" | "address" | "group" | "geoip" | "fqdn" | "mac">("any");
  const [destAddress, setDestAddress] = useState("");
  const [destAddressInvert, setDestAddressInvert] = useState(false);
  const [destPortMode, setDestPortMode] = useState<"any" | "port" | "group">("any");
  const [destPort, setDestPort] = useState("");
  const [destPortGroup, setDestPortGroup] = useState("");
  const [destGeoipCountry, setDestGeoipCountry] = useState<string[]>([]);
  const [destGeoipInverse, setDestGeoipInverse] = useState(false);

  // Auto-adjust protocol when ports or port groups are used
  useEffect(() => {
    const hasPort = sourcePort.trim() || destPort.trim() || sourcePortGroup.trim() || destPortGroup.trim();
    const portCompatibleProtocols = ["tcp", "udp", "tcp_udp"];

    // If ports are used and protocol is not compatible (including empty string), set to tcp_udp
    if (hasPort && !portCompatibleProtocols.includes(ruleProtocol)) {
      setRuleProtocol("tcp_udp");
    }
  }, [sourcePort, destPort, sourcePortGroup, destPortGroup, ruleProtocol]);
  const [destGroupType, setDestGroupType] = useState("");
  const [destGroupName, setDestGroupName] = useState("");
  const [destGroupInvert, setDestGroupInvert] = useState(false);
  const [destFqdn, setDestFqdn] = useState("");
  const [destAddressMask, setDestAddressMask] = useState("");
  const [destMacAddress, setDestMacAddress] = useState("");
  const [destPortGroupInvert, setDestPortGroupInvert] = useState(false);

  // Matching fields
  const [connectionMark, setConnectionMark] = useState("");
  const [connectionStatusNat, setConnectionStatusNat] = useState("");
  const [conntrackHelper, setConntrackHelper] = useState("");
  const [dscpMatch, setDscpMatch] = useState("");
  const [dscpExclude, setDscpExclude] = useState("");
  const [fragmentMatchFrag, setFragmentMatchFrag] = useState(false);
  const [fragmentMatchNonFrag, setFragmentMatchNonFrag] = useState(false);
  const [greKey, setGreKey] = useState("");
  const [greVersion, setGreVersion] = useState("");
  const [greInnerProto, setGreInnerProto] = useState("");
  const [greFlags, setGreFlags] = useState<Record<string, boolean>>({});
  const [ipsecMode, setIpsecMode] = useState<"none" | "match-ipsec" | "match-none">("none");
  const [ipsecInbound, setIpsecInbound] = useState<"none" | "match-ipsec" | "match-none">("none");
  const [ipsecOutbound, setIpsecOutbound] = useState<"none" | "match-ipsec" | "match-none">("none");
  const [markMatch, setMarkMatch] = useState("");
  const [packetLength, setPacketLength] = useState("");
  const [packetLengthExclude, setPacketLengthExclude] = useState("");
  const [packetType, setPacketType] = useState("");
  const [tcpMssMatch, setTcpMssMatch] = useState("");
  const [ttlEq, setTtlEq] = useState("");
  const [ttlGt, setTtlGt] = useState("");
  const [ttlLt, setTtlLt] = useState("");

  // Limits & Time fields
  const [limitRate, setLimitRate] = useState("");
  const [limitBurst, setLimitBurst] = useState("");
  const [recentCount, setRecentCount] = useState("");
  const [recentTime, setRecentTime] = useState("");
  const [timeStartdate, setTimeStartdate] = useState("");
  const [timeStarttime, setTimeStarttime] = useState("");
  const [timeStopdate, setTimeStopdate] = useState("");
  const [timeStoptime, setTimeStoptime] = useState("");
  const [timeWeekdays, setTimeWeekdays] = useState("");

  // Actions fields
  const [logOptionsGroup, setLogOptionsGroup] = useState("");
  const [logOptionsLevel, setLogOptionsLevel] = useState("");
  const [logOptionsQueueThreshold, setLogOptionsQueueThreshold] = useState("");
  const [logOptionsSnapshotLength, setLogOptionsSnapshotLength] = useState("");
  const [queueNumber, setQueueNumber] = useState("");
  const [queueOptions, setQueueOptions] = useState("");
  const [synproxyTcpMss, setSynproxyTcpMss] = useState("");
  const [synproxyTcpWindowScale, setSynproxyTcpWindowScale] = useState("");
  const [modSetConnectionMark, setModSetConnectionMark] = useState("");
  const [modSetTcpMss, setModSetTcpMss] = useState("");
  const [addAddrToGroupSrcGroup, setAddAddrToGroupSrcGroup] = useState("");
  const [addAddrToGroupSrcTimeout, setAddAddrToGroupSrcTimeout] = useState("");
  const [addAddrToGroupDstGroup, setAddAddrToGroupDstGroup] = useState("");
  const [addAddrToGroupDstTimeout, setAddAddrToGroupDstTimeout] = useState("");

  // State fields
  const [stateEstablished, setStateEstablished] = useState(false);
  const [stateNew, setStateNew] = useState(false);
  const [stateRelated, setStateRelated] = useState(false);
  const [stateInvalid, setStateInvalid] = useState(false);

  // Interface fields
  const [inboundInterface, setInboundInterface] = useState("");
  const [outboundInterface, setOutboundInterface] = useState("");

  // Advanced fields
  const [tcpFlags, setTcpFlags] = useState<Record<string, "disabled" | "enabled" | "not">>({
    syn: "disabled",
    ack: "disabled",
    fin: "disabled",
    rst: "disabled",
    psh: "disabled",
    urg: "disabled",
    ecn: "disabled",
    cwr: "disabled",
  });
  const [icmpTypeName, setIcmpTypeName] = useState("");
  const [jumpTarget, setJumpTarget] = useState("");
  const [offloadTarget, setOffloadTarget] = useState("");
  const [dscp, setDscp] = useState("");
  const [mark, setMark] = useState("");
  const [ttl, setTtl] = useState("");

  // Flags
  const [disable, setDisable] = useState(false);
  const [log, setLog] = useState(false);

  // Validation errors
  const [sourceAddressError, setSourceAddressError] = useState<string | null>(null);
  const [destAddressError, setDestAddressError] = useState<string | null>(null);
  const [sourceMacError, setSourceMacError] = useState<string | null>(null);
  const [sourcePortError, setSourcePortError] = useState<string | null>(null);
  const [destPortError, setDestPortError] = useState<string | null>(null);

  // Data for dropdowns
  const [groups, setGroups] = useState<FirewallGroup[]>([]);
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [customChains, setCustomChains] = useState<string[]>([]);
  const [flowtables, setFlowtables] = useState<Flowtable[]>([]);

  const loadGroups = async () => {
    try {
      const config = await firewallGroupsService.getConfig();

      // Load groups based on protocol
      if (protocol === "ipv4") {
        // IPv4: use address_groups and network_groups
        const allGroups = [
          ...config.address_groups,
          ...config.network_groups,
          ...config.port_groups,
          ...config.interface_groups,
          ...config.mac_groups,
          ...config.domain_groups,
          ...config.remote_groups,
        ];
        setGroups(allGroups);
      } else {
        // IPv6: use ipv6_address_groups and ipv6_network_groups
        const allGroups = [
          ...config.ipv6_address_groups,
          ...config.ipv6_network_groups,
          ...config.port_groups,
          ...config.interface_groups,
          ...config.mac_groups,
          ...config.domain_groups,
          ...config.remote_groups,
        ];
        setGroups(allGroups);
      }
    } catch (err) {
      console.error("Failed to load firewall groups:", err);
    }
  };

  const loadInterfaces = async () => {
    try {
      // Use getAllInterfaces to get all interfaces from config (including inactive ones and VLANs)
      const response = await showService.getAllInterfaces();
      if (response.interfaces) {
        // Map interface names to NetworkInterface objects
        const networkInterfaces: NetworkInterface[] = response.interfaces.map(i => ({
          name: i.name,
          type: "ethernet" as const,
          addresses: [],
          description: i.description ?? null,
          vrf: null,
          "hw-id": null,
          "source-interface": null,
          authentication: null,
        }));
        setInterfaces(networkInterfaces);
      }
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  const loadCustomChains = async () => {
    try {
      const service = protocol === "ipv4" ? firewallIPv4Service : firewallIPv6Service;
      const config = await service.getConfig();
      setCustomChains(config.custom_chains.map((c) => c.name));
    } catch (err) {
      console.error("Failed to load custom chains:", err);
    }
  };

  const loadFlowtables = async () => {
    try {
      const config = await flowtablesService.getConfig();
      setFlowtables(config.flowtables);
    } catch (err) {
      console.error("Failed to load flowtables:", err);
    }
  };

  useEffect(() => {
    if (open && rule) {
      loadGroups();
      loadInterfaces();
      loadCustomChains();
      loadFlowtables();
      loadRuleData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule]);

  // Auto-clear TCP flags when protocol changes away from TCP
  useEffect(() => {
    if (ruleProtocol !== "tcp") {
      const hasActiveTcpFlags = Object.values(tcpFlags).some(state => state !== "disabled");
      if (hasActiveTcpFlags) {
        // Reset all TCP flags to disabled
        setTcpFlags({
          syn: "disabled",
          ack: "disabled",
          fin: "disabled",
          rst: "disabled",
          psh: "disabled",
          urg: "disabled",
          ecn: "disabled",
          cwr: "disabled",
        });
      }
    }
  }, [ruleProtocol, tcpFlags]);

  // Auto-clear ICMP type when protocol changes away from ICMP
  useEffect(() => {
    if (ruleProtocol !== "icmp" && ruleProtocol !== "ipv6-icmp") {
      if (icmpTypeName) {
        setIcmpTypeName("");
      }
    }
  }, [ruleProtocol, icmpTypeName]);

  const loadRuleData = () => {
    setDescription(rule.description || "");
    setAction(rule.action || "accept");

    // Parse protocol and check for inversion
    const proto = rule.protocol || "";
    if (proto.startsWith("!")) {
      setRuleProtocol(proto.substring(1));
      setProtocolInvert(true);
    } else {
      setRuleProtocol(proto);
      setProtocolInvert(false);
    }

    // Source - determine mode and parse address/port
    // Reset defaults
    setSourceMode("any");
    setSourceAddress("");
    setSourceAddressInvert(false);
    setSourceGroupType("");
    setSourceGroupName("");
    setSourceGroupInvert(false);
    setSourcePortMode("any");
    setSourcePort("");
    setSourcePortGroup("");
    setSourcePortGroupInvert(false);
    setSourceMac("");
    setSourceGeoipCountry([]);
    setSourceGeoipInverse(false);
    setSourceFqdn("");
    setSourceAddressMask("");

    // Determine source mode based on what's present
    if (rule.source_fqdn) {
      // FQDN mode
      setSourceMode("fqdn");
      setSourceFqdn(rule.source_fqdn);
    } else if (rule.source?.mac_address) {
      // MAC address mode
      setSourceMode("mac");
      setSourceMac(rule.source.mac_address);
    } else if (rule.source?.geoip && rule.source.geoip.country_code && rule.source.geoip.country_code.length > 0) {
      // GeoIP mode
      setSourceMode("geoip");
      setSourceGeoipCountry(rule.source.geoip.country_code);
      setSourceGeoipInverse(rule.source.geoip.inverse_match || false);
    } else if (rule.source?.address) {
      // Address mode
      setSourceMode("address");
      const addr = rule.source.address;
      if (addr.startsWith("!")) {
        setSourceAddress(addr.substring(1));
        setSourceAddressInvert(true);
      } else {
        setSourceAddress(addr);
        setSourceAddressInvert(false);
      }
    } else if (rule.source?.group) {
      // Check if it's an address/network group (not port group)
      const entries = Object.entries(rule.source.group);
      let hasAddressGroup = false;
      for (const [type, name] of entries) {
        if (type !== "port-group") {
          // Address/network/domain/mac group
          setSourceMode("group");
          setSourceGroupType(type);
          if (name.startsWith("!")) {
            setSourceGroupName(name.substring(1));
            setSourceGroupInvert(true);
          } else {
            setSourceGroupName(name);
            setSourceGroupInvert(false);
          }
          hasAddressGroup = true;
          break;
        }
      }
      if (!hasAddressGroup) {
        // Only port group present, keep mode as "any"
        setSourceMode("any");
      }
    }

    // Source address mask
    if (rule.source_address_mask) {
      setSourceAddressMask(rule.source_address_mask);
    }

    // Handle port separately (can coexist with any address mode)
    if (rule.source?.port) {
      setSourcePortMode("port");
      setSourcePort(rule.source.port);
    } else if (rule.source?.group && rule.source.group["port-group"]) {
      setSourcePortMode("group");
      const rawPortGroup = rule.source.group["port-group"];
      if (rawPortGroup.startsWith("!")) {
        setSourcePortGroup(rawPortGroup.substring(1));
        setSourcePortGroupInvert(true);
      } else {
        setSourcePortGroup(rawPortGroup);
        setSourcePortGroupInvert(false);
      }
    } else {
      setSourcePortMode("any");
    }

    // Destination - determine mode and parse address/port
    // Reset defaults
    setDestMode("any");
    setDestAddress("");
    setDestAddressInvert(false);
    setDestGroupType("");
    setDestGroupName("");
    setDestGroupInvert(false);
    setDestPortMode("any");
    setDestPort("");
    setDestPortGroup("");
    setDestPortGroupInvert(false);
    setDestGeoipCountry([]);
    setDestGeoipInverse(false);
    setDestFqdn("");
    setDestAddressMask("");
    setDestMacAddress("");

    // Determine destination mode based on what's present
    if (rule.destination_fqdn) {
      // FQDN mode
      setDestMode("fqdn");
      setDestFqdn(rule.destination_fqdn);
    } else if (rule.destination_mac_address) {
      // MAC address mode
      setDestMode("mac");
      setDestMacAddress(rule.destination_mac_address);
    } else if (rule.destination?.geoip && rule.destination.geoip.country_code && rule.destination.geoip.country_code.length > 0) {
      // GeoIP mode
      setDestMode("geoip");
      setDestGeoipCountry(rule.destination.geoip.country_code);
      setDestGeoipInverse(rule.destination.geoip.inverse_match || false);
    } else if (rule.destination?.address) {
      // Address mode
      setDestMode("address");
      const addr = rule.destination.address;
      if (addr.startsWith("!")) {
        setDestAddress(addr.substring(1));
        setDestAddressInvert(true);
      } else {
        setDestAddress(addr);
        setDestAddressInvert(false);
      }
    } else if (rule.destination?.group) {
      // Check if it's an address/network group (not port group)
      const entries = Object.entries(rule.destination.group);
      let hasAddressGroup = false;
      for (const [type, name] of entries) {
        if (type !== "port-group") {
          // Address/network/domain group
          setDestMode("group");
          setDestGroupType(type);
          if (name.startsWith("!")) {
            setDestGroupName(name.substring(1));
            setDestGroupInvert(true);
          } else {
            setDestGroupName(name);
            setDestGroupInvert(false);
          }
          hasAddressGroup = true;
          break;
        }
      }
      if (!hasAddressGroup) {
        // Only port group present, keep mode as "any"
        setDestMode("any");
      }
    }

    // Handle port separately (can coexist with any address mode)
    if (rule.destination?.port) {
      setDestPortMode("port");
      setDestPort(rule.destination.port);
    } else if (rule.destination?.group && rule.destination.group["port-group"]) {
      setDestPortMode("group");
      const rawPortGroup = rule.destination.group["port-group"];
      if (rawPortGroup.startsWith("!")) {
        setDestPortGroup(rawPortGroup.substring(1));
        setDestPortGroupInvert(true);
      } else {
        setDestPortGroup(rawPortGroup);
        setDestPortGroupInvert(false);
      }
    } else {
      setDestPortMode("any");
    }

    // Destination address mask
    if (rule.destination_address_mask) {
      setDestAddressMask(rule.destination_address_mask);
    }

    // Matching fields
    setConnectionMark(rule.connection_mark || "");
    setConnectionStatusNat(rule.connection_status?.nat || "");
    setConntrackHelper(rule.conntrack_helper || "");
    setDscpMatch(rule.dscp_match || "");
    setDscpExclude(rule.dscp_exclude || "");
    setFragmentMatchFrag(rule.fragment?.match_frag || false);
    setFragmentMatchNonFrag(rule.fragment?.match_non_frag || false);
    setGreKey(rule.gre?.key || "");
    setGreVersion(rule.gre?.version || "");
    setGreInnerProto(rule.gre?.inner_proto || "");
    const newGreFlags: Record<string, boolean> = {};
    if (rule.gre?.flags_checksum) newGreFlags.checksum = true;
    if (rule.gre?.flags_checksum_unset) newGreFlags.checksum_unset = true;
    if (rule.gre?.flags_key) newGreFlags.key = true;
    if (rule.gre?.flags_key_unset) newGreFlags.key_unset = true;
    if (rule.gre?.flags_sequence) newGreFlags.sequence = true;
    if (rule.gre?.flags_sequence_unset) newGreFlags.sequence_unset = true;
    setGreFlags(newGreFlags);

    // IPsec mode detection
    setIpsecMode("none");
    setIpsecInbound("none");
    setIpsecOutbound("none");
    if (rule.ipsec) {
      // Directional IPsec (1.5+)
      if (rule.ipsec.match_ipsec_in) setIpsecInbound("match-ipsec");
      else if (rule.ipsec.match_none_in) setIpsecInbound("match-none");
      if (rule.ipsec.match_ipsec_out) setIpsecOutbound("match-ipsec");
      else if (rule.ipsec.match_none_out) setIpsecOutbound("match-none");
      // Non-directional IPsec (1.4)
      if (rule.ipsec.match_ipsec) setIpsecMode("match-ipsec");
      else if (rule.ipsec.match_none) setIpsecMode("match-none");
    }

    setMarkMatch(rule.mark_match || "");
    setPacketLength(rule.packet_length || "");
    setPacketLengthExclude(rule.packet_length_exclude || "");
    setPacketType(rule.packet_type || "");
    setTcpMssMatch(rule.tcp_mss || "");
    setTtlEq(rule.ttl_match?.eq || "");
    setTtlGt(rule.ttl_match?.gt || "");
    setTtlLt(rule.ttl_match?.lt || "");

    // Limits & Time
    setLimitRate(rule.limit?.rate || "");
    setLimitBurst(rule.limit?.burst || "");
    setRecentCount(rule.recent?.count || "");
    setRecentTime(rule.recent?.time || "");
    setTimeStartdate(rule.time?.startdate || "");
    setTimeStarttime(rule.time?.starttime || "");
    setTimeStopdate(rule.time?.stopdate || "");
    setTimeStoptime(rule.time?.stoptime || "");
    setTimeWeekdays(rule.time?.weekdays || "");

    // Actions
    setLogOptionsGroup(rule.log_options?.group || "");
    setLogOptionsLevel(rule.log_options?.level || "");
    setLogOptionsQueueThreshold(rule.log_options?.queue_threshold || "");
    setLogOptionsSnapshotLength(rule.log_options?.snapshot_length || "");
    setQueueNumber(rule.queue_number || "");
    setQueueOptions(rule.queue_options || "");
    setSynproxyTcpMss(rule.synproxy_config?.tcp_mss || "");
    setSynproxyTcpWindowScale(rule.synproxy_config?.tcp_window_scale || "");
    setModSetConnectionMark(rule.set_connection_mark || "");
    setModSetTcpMss(rule.set_tcp_mss || "");
    setAddAddrToGroupSrcGroup(rule.add_address_to_group?.source_address_group || "");
    setAddAddrToGroupSrcTimeout(rule.add_address_to_group?.source_timeout || "");
    setAddAddrToGroupDstGroup(rule.add_address_to_group?.destination_address_group || "");
    setAddAddrToGroupDstTimeout(rule.add_address_to_group?.destination_timeout || "");

    // State
    setStateEstablished(rule.state?.established || false);
    setStateNew(rule.state?.new || false);
    setStateRelated(rule.state?.related || false);
    setStateInvalid(rule.state?.invalid || false);

    // Interface
    setInboundInterface(rule.interface?.inbound || "");
    setOutboundInterface(rule.interface?.outbound || "");

    // Advanced - TCP Flags
    const newTcpFlags: Record<string, "disabled" | "enabled" | "not"> = {
      syn: "disabled",
      ack: "disabled",
      fin: "disabled",
      rst: "disabled",
      psh: "disabled",
      urg: "disabled",
      ecn: "disabled",
      cwr: "disabled",
    };
    if (rule.tcp_flags) {
      // Handle both old array format and new object format
      if (Array.isArray(rule.tcp_flags)) {
        // Old format: ["syn", "ack", "!fin"]
        rule.tcp_flags.forEach((flag: string) => {
          if (flag.startsWith("!")) {
            const cleanFlag = flag.substring(1);
            if (cleanFlag in newTcpFlags) {
              newTcpFlags[cleanFlag] = "not";
            }
          } else if (flag in newTcpFlags) {
            newTcpFlags[flag] = "enabled";
          }
        });
      } else {
        // New format: {"syn": "enabled", "ack": "not"}
        Object.entries(rule.tcp_flags).forEach(([flag, state]) => {
          if (flag in newTcpFlags) {
            newTcpFlags[flag] = state as "disabled" | "enabled" | "not";
          }
        });
      }
    }
    setTcpFlags(newTcpFlags);

    // ICMP Type
    setIcmpTypeName(rule.icmp_type_name || "");
    setJumpTarget(rule.jump_target || "");
    setOffloadTarget(rule.offload_target || "");
    setDscp(rule.packet_mods?.dscp || "");
    setMark(rule.packet_mods?.mark || "");
    setTtl(rule.packet_mods?.ttl || "");

    // Flags
    setDisable(rule.disable);
    setLog(rule.log);

    setError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    // Clear previous validation errors
    setSourceAddressError(null);
    setDestAddressError(null);
    setSourceMacError(null);
    setSourcePortError(null);
    setDestPortError(null);

    // Validate inputs
    let hasValidationError = false;

    if (sourceMode === "address" && sourceAddress.trim()) {
      const error = getIPAddressError(sourceAddress.trim(), protocol);
      if (error) {
        setSourceAddressError(error);
        hasValidationError = true;
      }
    }

    if (destMode === "address" && destAddress.trim()) {
      const error = getIPAddressError(destAddress.trim(), protocol);
      if (error) {
        setDestAddressError(error);
        hasValidationError = true;
      }
    }

    if (sourceMode === "mac" && sourceMac.trim()) {
      const error = getMACAddressError(sourceMac.trim());
      if (error) {
        setSourceMacError(error);
        hasValidationError = true;
      }
    }

    if (sourcePortMode === "port" && sourcePort.trim()) {
      const error = getPortError(sourcePort.trim());
      if (error) {
        setSourcePortError(error);
        hasValidationError = true;
      }
    }

    if (destPortMode === "port" && destPort.trim()) {
      const error = getPortError(destPort.trim());
      if (error) {
        setDestPortError(error);
        hasValidationError = true;
      }
    }

    // Stop if validation failed
    if (hasValidationError) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build config object
      const config: Partial<FirewallRule> = {
        action,
      };

      if (description.trim()) {
        config.description = description.trim();
      }

      if (ruleProtocol && ruleProtocol !== "all") {
        config.protocol = protocolInvert ? `!${ruleProtocol}` : ruleProtocol;
      } else if ((ruleProtocol === "all" || ruleProtocol === "") && rule.protocol) {
        // Protocol changed to "all" or empty, but rule previously had a protocol - delete it
        config.protocol = null;
      }

      // Source FQDN (set at top level, not inside source object)
      if (sourceMode === "fqdn" && sourceFqdn.trim()) {
        config.source_fqdn = sourceFqdn.trim();
      } else if (rule.source_fqdn) {
        config.source_fqdn = null;
      }

      // Source
      const hasSourceAddress =
        (sourceMode === "address" && sourceAddress.trim()) ||
        (sourceMode === "group" && sourceGroupType && sourceGroupType !== "none" && sourceGroupName) ||
        (sourceMode === "geoip" && sourceGeoipCountry.length > 0) ||
        (sourceMode === "mac" && sourceMac.trim()) ||
        (sourceMode === "fqdn" && sourceFqdn.trim());

      const hasSourcePort =
        (sourcePortMode === "port" && sourcePort.trim()) ||
        (sourcePortMode === "group" && sourcePortGroup.trim());

      const hasSource = hasSourceAddress || hasSourcePort;

      // Check if we need to clear source (switching to "any" mode when rule had source before)
      const hadSource = rule.source && (
        rule.source.address ||
        rule.source.mac_address ||
        rule.source.geoip ||
        (rule.source.group && Object.keys(rule.source.group).some(k => k !== "port-group"))
      );

      if (hasSource || (sourceMode === "any" && hadSource)) {
        config.source = {};

        // Handle address mode - mutually exclusive with group, geoip, and mac
        if (sourceMode === "address" && sourceAddress.trim()) {
          const addr = sourceAddress.trim();
          config.source.address = sourceAddressInvert ? `!${addr}` : addr;
        } else if (sourceMode === "group" && sourceGroupType && sourceGroupType !== "none" && sourceGroupName) {
          // Address or network group - mutually exclusive with address, geoip, and mac
          config.source.group = { [sourceGroupType]: sourceGroupInvert ? `!${sourceGroupName}` : sourceGroupName };
        } else if (sourceMode === "geoip" && sourceGeoipCountry.length > 0) {
          // GeoIP - mutually exclusive with address, group, and mac
          config.source.geoip = {
            country_code: sourceGeoipCountry,
            inverse_match: sourceGeoipInverse || undefined,
          };
        } else if (sourceMode === "mac" && sourceMac.trim()) {
          // MAC address - mutually exclusive with address, group, and geoip
          config.source.mac_address = sourceMac.trim();
        }
        // If sourceMode === "any" and hadSource, config.source stays as {} which will trigger deletion

        if (sourceMode === "address" && sourceAddressMask.trim()) {
          config.source_address_mask = sourceAddressMask.trim();
        } else if (rule.source_address_mask) {
          config.source_address_mask = null;
        }

        // Handle port - either direct port or port group (separate from address/group/geoip/mac)
        if (sourcePortMode === "port" && sourcePort.trim()) {
          config.source.port = sourcePort.trim();
        } else if (sourcePortMode === "group" && sourcePortGroup.trim()) {
          // Port group - this is separate from address group
          if (!config.source.group) {
            config.source.group = {};
          }
          config.source.group["port-group"] = sourcePortGroupInvert ? `!${sourcePortGroup}` : sourcePortGroup;
        }
      }

      // Destination FQDN (set at top level)
      if (destMode === "fqdn" && destFqdn.trim()) {
        config.destination_fqdn = destFqdn.trim();
      } else if (rule.destination_fqdn) {
        config.destination_fqdn = null;
      }
      // Destination MAC address (set at top level)
      if (destMode === "mac" && destMacAddress.trim()) {
        config.destination_mac_address = destMacAddress.trim();
      } else if (rule.destination_mac_address) {
        config.destination_mac_address = null;
      }

      // Destination
      const hasDestAddress =
        (destMode === "address" && destAddress.trim()) ||
        (destMode === "group" && destGroupType && destGroupType !== "none" && destGroupName) ||
        (destMode === "geoip" && destGeoipCountry.length > 0) ||
        (destMode === "fqdn" && destFqdn.trim()) ||
        (destMode === "mac" && destMacAddress.trim());

      const hasDestPort =
        (destPortMode === "port" && destPort.trim()) ||
        (destPortMode === "group" && destPortGroup.trim());

      const hasDest = hasDestAddress || hasDestPort;

      // Check if we need to clear destination (switching to "any" mode when rule had destination before)
      const hadDest = rule.destination && (
        rule.destination.address ||
        rule.destination.geoip ||
        (rule.destination.group && Object.keys(rule.destination.group).some(k => k !== "port-group"))
      );

      if (hasDest || (destMode === "any" && hadDest)) {
        config.destination = {};

        // Handle address mode - mutually exclusive with group and geoip
        if (destMode === "address" && destAddress.trim()) {
          const addr = destAddress.trim();
          config.destination.address = destAddressInvert ? `!${addr}` : addr;
        } else if (destMode === "group" && destGroupType && destGroupType !== "none" && destGroupName) {
          // Address or network group - mutually exclusive with address and geoip
          config.destination.group = { [destGroupType]: destGroupInvert ? `!${destGroupName}` : destGroupName };
        } else if (destMode === "geoip" && destGeoipCountry.length > 0) {
          // GeoIP - mutually exclusive with address and group
          config.destination.geoip = {
            country_code: destGeoipCountry,
            inverse_match: destGeoipInverse || undefined,
          };
        }
        // If destMode === "any" and hadDest, config.destination stays as {} which will trigger deletion

        if (destMode === "address" && destAddressMask.trim()) {
          config.destination_address_mask = destAddressMask.trim();
        } else if (rule.destination_address_mask) {
          config.destination_address_mask = null;
        }

        // Handle port - either direct port or port group (separate from address/group/geoip)
        if (destPortMode === "port" && destPort.trim()) {
          config.destination.port = destPort.trim();
        } else if (destPortMode === "group" && destPortGroup.trim()) {
          // Port group - this is separate from address group
          if (!config.destination.group) {
            config.destination.group = {};
          }
          config.destination.group["port-group"] = destPortGroupInvert ? `!${destPortGroup}` : destPortGroup;
        }
      }

      // State
      if (stateEstablished || stateNew || stateRelated || stateInvalid) {
        config.state = {
          established: stateEstablished || undefined,
          new: stateNew || undefined,
          related: stateRelated || undefined,
          invalid: stateInvalid || undefined,
        };
      } else {
        config.state = null;
      }

      // Interface
      if ((inboundInterface && inboundInterface !== "any") || (outboundInterface && outboundInterface !== "any")) {
        config.interface = {};
        if (inboundInterface && inboundInterface !== "any") config.interface.inbound = inboundInterface;
        if (outboundInterface && outboundInterface !== "any") config.interface.outbound = outboundInterface;
      } else {
        config.interface = null;
      }

      // Packet mods
      if (dscp || mark || ttl) {
        config.packet_mods = {};
        if (dscp) config.packet_mods.dscp = dscp;
        if (mark) config.packet_mods.mark = mark;
        if (ttl) config.packet_mods.ttl = ttl;
      } else {
        config.packet_mods = null;
      }

      // TCP Flags - only include flags that are not "disabled"
      const activeTcpFlags = Object.fromEntries(
        Object.entries(tcpFlags).filter(([, state]) => state !== "disabled")
      );
      if (Object.keys(activeTcpFlags).length > 0) {
        config.tcp_flags = activeTcpFlags;
      } else {
        config.tcp_flags = null;
      }

      // ICMP type - only applicable for ICMP protocol
      if ((ruleProtocol === "icmp" || ruleProtocol === "ipv6-icmp") && icmpTypeName) {
        config.icmp_type_name = icmpTypeName;
      } else if ((ruleProtocol === "icmp" || ruleProtocol === "ipv6-icmp") && !icmpTypeName && rule.icmp_type_name) {
        // User cleared ICMP type while protocol is still ICMP - delete it
        config.icmp_type_name = null;
      } else if (ruleProtocol !== "icmp" && ruleProtocol !== "ipv6-icmp" && rule.icmp_type_name) {
        // Protocol changed away from ICMP but rule previously had ICMP type - delete it
        config.icmp_type_name = null;
      }

      // Jump target - only applicable for jump action
      if (action === "jump") {
        if (jumpTarget) {
          config.jump_target = jumpTarget;
        }
      } else if (rule.jump_target) {
        // Action is not jump but rule previously had a jump target - delete it
        config.jump_target = null;
      }

      // Offload target - only applicable for offload action
      if (action === "offload") {
        if (offloadTarget) {
          config.offload_target = offloadTarget;
        }
      } else if (rule.offload_target) {
        // Action is not offload but rule previously had an offload target - delete it
        config.offload_target = null;
      }

      // Matching fields
      if (connectionMark.trim()) {
        config.connection_mark = connectionMark.trim();
      } else if (rule.connection_mark) {
        config.connection_mark = null;
      }
      if (connectionStatusNat) {
        config.connection_status = { nat: connectionStatusNat };
      } else if (rule.connection_status) {
        config.connection_status = null;
      }
      if (conntrackHelper.trim()) {
        config.conntrack_helper = conntrackHelper.trim();
      } else if (rule.conntrack_helper) {
        config.conntrack_helper = null;
      }
      if (dscpMatch.trim()) {
        config.dscp_match = dscpMatch.trim();
      } else if (rule.dscp_match) {
        config.dscp_match = null;
      }
      if (dscpExclude.trim()) {
        config.dscp_exclude = dscpExclude.trim();
      } else if (rule.dscp_exclude) {
        config.dscp_exclude = null;
      }
      if (fragmentMatchFrag || fragmentMatchNonFrag) {
        config.fragment = {
          match_frag: fragmentMatchFrag || undefined,
          match_non_frag: fragmentMatchNonFrag || undefined,
        };
      } else if (rule.fragment) {
        config.fragment = null;
      }
      if (greKey || greVersion || greInnerProto || Object.values(greFlags).some(Boolean)) {
        config.gre = {};
        if (greKey) config.gre.key = greKey;
        if (greVersion) config.gre.version = greVersion;
        if (greInnerProto) config.gre.inner_proto = greInnerProto;
        if (greFlags.checksum) config.gre.flags_checksum = true;
        if (greFlags.checksum_unset) config.gre.flags_checksum_unset = true;
        if (greFlags.key) config.gre.flags_key = true;
        if (greFlags.key_unset) config.gre.flags_key_unset = true;
        if (greFlags.sequence) config.gre.flags_sequence = true;
        if (greFlags.sequence_unset) config.gre.flags_sequence_unset = true;
      } else if (rule.gre) {
        config.gre = null;
      }

      // IPsec
      const hasIpsec = ipsecMode !== "none" || ipsecInbound !== "none" || ipsecOutbound !== "none";
      if (hasIpsec) {
        config.ipsec = {};
        if (ipsecMode === "match-ipsec") config.ipsec.match_ipsec = true;
        if (ipsecMode === "match-none") config.ipsec.match_none = true;
        if (ipsecInbound === "match-ipsec") config.ipsec.match_ipsec_in = true;
        if (ipsecInbound === "match-none") config.ipsec.match_none_in = true;
        if (ipsecOutbound === "match-ipsec") config.ipsec.match_ipsec_out = true;
        if (ipsecOutbound === "match-none") config.ipsec.match_none_out = true;
      } else if (rule.ipsec) {
        config.ipsec = null;
      }

      if (markMatch.trim()) {
        config.mark_match = markMatch.trim();
      } else if (rule.mark_match) {
        config.mark_match = null;
      }
      if (packetLength.trim()) {
        config.packet_length = packetLength.trim();
      } else if (rule.packet_length) {
        config.packet_length = null;
      }
      if (packetLengthExclude.trim()) {
        config.packet_length_exclude = packetLengthExclude.trim();
      } else if (rule.packet_length_exclude) {
        config.packet_length_exclude = null;
      }
      if (packetType) {
        config.packet_type = packetType;
      } else if (rule.packet_type) {
        config.packet_type = null;
      }
      if (tcpMssMatch.trim()) {
        config.tcp_mss = tcpMssMatch.trim();
      } else if (rule.tcp_mss) {
        config.tcp_mss = null;
      }
      if (ttlEq || ttlGt || ttlLt) {
        config.ttl_match = {};
        if (ttlEq) config.ttl_match.eq = ttlEq;
        if (ttlGt) config.ttl_match.gt = ttlGt;
        if (ttlLt) config.ttl_match.lt = ttlLt;
      } else if (rule.ttl_match) {
        config.ttl_match = null;
      }

      // Limits & Time
      if (limitRate || limitBurst) {
        config.limit = {};
        if (limitRate) config.limit.rate = limitRate;
        if (limitBurst) config.limit.burst = limitBurst;
      } else if (rule.limit) {
        config.limit = null;
      }
      if (recentCount || recentTime) {
        config.recent = {};
        if (recentCount) config.recent.count = recentCount;
        if (recentTime) config.recent.time = recentTime;
      } else if (rule.recent) {
        config.recent = null;
      }
      if (timeStartdate || timeStarttime || timeStopdate || timeStoptime || timeWeekdays) {
        config.time = {};
        if (timeStartdate) config.time.startdate = timeStartdate;
        if (timeStarttime) config.time.starttime = timeStarttime;
        if (timeStopdate) config.time.stopdate = timeStopdate;
        if (timeStoptime) config.time.stoptime = timeStoptime;
        if (timeWeekdays) config.time.weekdays = timeWeekdays;
      } else if (rule.time) {
        config.time = null;
      }

      // Actions / modifications
      if (logOptionsGroup || logOptionsLevel || logOptionsQueueThreshold || logOptionsSnapshotLength) {
        config.log_options = {};
        if (logOptionsGroup) config.log_options.group = logOptionsGroup;
        if (logOptionsLevel) config.log_options.level = logOptionsLevel;
        if (logOptionsQueueThreshold) config.log_options.queue_threshold = logOptionsQueueThreshold;
        if (logOptionsSnapshotLength) config.log_options.snapshot_length = logOptionsSnapshotLength;
      } else if (rule.log_options) {
        config.log_options = null;
      }
      if (queueNumber) {
        config.queue_number = queueNumber;
      } else if (rule.queue_number) {
        config.queue_number = null;
      }
      if (queueOptions) {
        config.queue_options = queueOptions;
      } else if (rule.queue_options) {
        config.queue_options = null;
      }
      if (synproxyTcpMss || synproxyTcpWindowScale) {
        config.synproxy_config = {};
        if (synproxyTcpMss) config.synproxy_config.tcp_mss = synproxyTcpMss;
        if (synproxyTcpWindowScale) config.synproxy_config.tcp_window_scale = synproxyTcpWindowScale;
      } else if (rule.synproxy_config) {
        config.synproxy_config = null;
      }
      if (modSetConnectionMark) {
        config.set_connection_mark = modSetConnectionMark;
      } else if (rule.set_connection_mark) {
        config.set_connection_mark = null;
      }
      if (modSetTcpMss) {
        config.set_tcp_mss = modSetTcpMss;
      } else if (rule.set_tcp_mss) {
        config.set_tcp_mss = null;
      }
      if (addAddrToGroupSrcGroup || addAddrToGroupDstGroup) {
        config.add_address_to_group = {};
        if (addAddrToGroupSrcGroup) config.add_address_to_group.source_address_group = addAddrToGroupSrcGroup;
        if (addAddrToGroupSrcTimeout) config.add_address_to_group.source_timeout = addAddrToGroupSrcTimeout;
        if (addAddrToGroupDstGroup) config.add_address_to_group.destination_address_group = addAddrToGroupDstGroup;
        if (addAddrToGroupDstTimeout) config.add_address_to_group.destination_timeout = addAddrToGroupDstTimeout;
      } else if (rule.add_address_to_group) {
        config.add_address_to_group = null;
      }

      config.disable = disable;
      config.log = log;

      // Update rule
      const service = protocol === "ipv4" ? firewallIPv4Service : firewallIPv6Service;
      await service.updateRule(
        rule.chain,
        rule.rule_number,
        rule.is_custom_chain,
        config,
        rule
      );

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rule");
    } finally {
      setLoading(false);
    }
  };

  const availableTcpFlags = ["syn", "ack", "fin", "rst", "psh", "urg", "ecn", "cwr"];

  // ICMP Type names (standard ICMPv4 types)
  const icmpTypeOptions = [
    "echo-reply",
    "destination-unreachable",
    "source-quench",
    "redirect",
    "echo-request",
    "router-advertisement",
    "router-solicitation",
    "time-exceeded",
    "parameter-problem",
    "timestamp-request",
    "timestamp-reply",
    "address-mask-request",
    "address-mask-reply",
  ];

  const updateTcpFlag = (flag: string, value: "disabled" | "enabled" | "not") => {
    setTcpFlags((prev) => ({ ...prev, [flag]: value }));
  };

  // Filter groups by type for dropdowns (protocol-aware)
  const addressGroups = groups.filter((g) =>
    protocol === "ipv4" ? g.type === "address-group" : g.type === "ipv6-address-group"
  );
  const networkGroups = groups.filter((g) =>
    protocol === "ipv4" ? g.type === "network-group" : g.type === "ipv6-network-group"
  );
  const portGroups = groups.filter((g) => g.type === "port-group");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Firewall Rule {rule.rule_number} - {rule.chain.charAt(0).toUpperCase() + rule.chain.slice(1)} Chain
          </DialogTitle>
          <DialogDescription>
            Modify the configuration for rule {rule.rule_number}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/90">{error}</p>
            </div>
          </div>
        )}

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="source">Source</TabsTrigger>
            <TabsTrigger value="destination">Dest</TabsTrigger>
            <TabsTrigger value="state">State</TabsTrigger>
            <TabsTrigger value="matching">Matching</TabsTrigger>
            <TabsTrigger value="limits">Limits</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ruleNumber">Rule Number</Label>
              <Input
                id="ruleNumber"
                type="number"
                value={rule.rule_number}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Rule number cannot be changed
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="action">Action *</Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger id="action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accept">Accept</SelectItem>
                    <SelectItem value="drop">Drop</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                    <SelectItem value="continue">Continue</SelectItem>
                    <SelectItem value="return">Return</SelectItem>
                    <SelectItem value="jump">Jump</SelectItem>
                    <SelectItem value="offload">Offload</SelectItem>
                    <SelectItem value="queue">Queue</SelectItem>
                    <SelectItem value="synproxy">Synproxy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {action === "jump" && (
                <div className="space-y-2">
                  <Label htmlFor="jumpTarget">Jump Target *</Label>
                  <Select value={jumpTarget} onValueChange={setJumpTarget}>
                    <SelectTrigger id="jumpTarget">
                      <SelectValue placeholder="Select custom chain" />
                    </SelectTrigger>
                    <SelectContent>
                      {customChains.map((chainName) => (
                        <SelectItem key={chainName} value={chainName}>
                          {chainName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {action === "offload" && (
                <div className="space-y-2">
                  <Label htmlFor="offloadTarget">Flowtable *</Label>
                  <Select value={offloadTarget} onValueChange={setOffloadTarget}>
                    <SelectTrigger id="offloadTarget">
                      <SelectValue placeholder="Select flowtable" />
                    </SelectTrigger>
                    <SelectContent>
                      {flowtables.map((ft) => (
                        <SelectItem key={ft.name} value={ft.name}>
                          {ft.name}
                          {ft.description && (
                            <span className="text-muted-foreground ml-2">
                              - {ft.description}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this rule"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruleProtocol">Protocol</Label>
              <Select value={ruleProtocol} onValueChange={setRuleProtocol}>
                <SelectTrigger id="ruleProtocol">
                  <SelectValue placeholder="Any protocol" />
                </SelectTrigger>
                {(sourcePort.trim() || destPort.trim() || sourcePortGroup.trim() || destPortGroup.trim()) ? (
                  <SelectContent>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                    <SelectItem value="tcp_udp">TCP & UDP</SelectItem>
                  </SelectContent>
                ) : (
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">All (default)</SelectItem>
                    <SelectItem value="tcp_udp">TCP & UDP</SelectItem>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                    <SelectItem value="icmp">ICMP</SelectItem>
                    <SelectItem value="ipv6-icmp">IPv6-ICMP</SelectItem>
                    <SelectItem value="esp">ESP</SelectItem>
                    <SelectItem value="ah">AH</SelectItem>
                    <SelectItem value="gre">GRE</SelectItem>
                    <SelectItem value="ipip">IPIP</SelectItem>
                    <SelectItem value="sctp">SCTP</SelectItem>
                    <SelectItem value="igmp">IGMP</SelectItem>
                    <SelectItem value="ospf">OSPF</SelectItem>
                    <SelectItem value="pim">PIM</SelectItem>
                    <SelectItem value="vrrp">VRRP</SelectItem>
                    <SelectItem value="l2tp">L2TP</SelectItem>
                    <SelectItem value="ipv6">IPv6</SelectItem>
                    <SelectItem value="eigrp">EIGRP</SelectItem>
                    <SelectItem value="ax.25">AX.25</SelectItem>
                    <SelectItem value="dccp">DCCP</SelectItem>
                    <SelectItem value="ddp">DDP</SelectItem>
                    <SelectItem value="egp">EGP</SelectItem>
                    <SelectItem value="encap">ENCAP</SelectItem>
                    <SelectItem value="etherip">EtherIP</SelectItem>
                    <SelectItem value="ethernet">Ethernet</SelectItem>
                    <SelectItem value="fc">FC</SelectItem>
                    <SelectItem value="ggp">GGP</SelectItem>
                    <SelectItem value="hip">HIP</SelectItem>
                    <SelectItem value="hmp">HMP</SelectItem>
                    <SelectItem value="hopopt">HOPOPT</SelectItem>
                    <SelectItem value="idpr-cmtp">IDPR-CMTP</SelectItem>
                    <SelectItem value="idrp">IDRP</SelectItem>
                    <SelectItem value="igp">IGP</SelectItem>
                    <SelectItem value="ip">IP</SelectItem>
                    <SelectItem value="ipcomp">IPComp</SelectItem>
                    <SelectItem value="ipencap">IP-ENCAP</SelectItem>
                    <SelectItem value="ipv6-frag">IPv6-Frag</SelectItem>
                    <SelectItem value="ipv6-nonxt">IPv6-NoNxt</SelectItem>
                    <SelectItem value="ipv6-opts">IPv6-Opts</SelectItem>
                    <SelectItem value="ipv6-route">IPv6-Route</SelectItem>
                    <SelectItem value="isis">ISIS</SelectItem>
                    <SelectItem value="iso-tp4">ISO-TP4</SelectItem>
                    <SelectItem value="manet">MANET</SelectItem>
                    <SelectItem value="mobility-header">Mobility-Header</SelectItem>
                    <SelectItem value="mpls-in-ip">MPLS-in-IP</SelectItem>
                    <SelectItem value="mptcp">MPTCP</SelectItem>
                    <SelectItem value="pup">PUP</SelectItem>
                    <SelectItem value="rdp">RDP</SelectItem>
                    <SelectItem value="rohc">ROHC</SelectItem>
                    <SelectItem value="rspf">RSPF</SelectItem>
                    <SelectItem value="rsvp">RSVP</SelectItem>
                    <SelectItem value="shim6">Shim6</SelectItem>
                    <SelectItem value="skip">SKIP</SelectItem>
                    <SelectItem value="st">ST</SelectItem>
                    <SelectItem value="udplite">UDPLite</SelectItem>
                    <SelectItem value="vmtp">VMTP</SelectItem>
                    <SelectItem value="wesp">WESP</SelectItem>
                    <SelectItem value="xns-idp">XNS-IDP</SelectItem>
                    <SelectItem value="xtp">XTP</SelectItem>
                  </SelectContent>
                )}
              </Select>
              {(sourcePort.trim() || destPort.trim() || sourcePortGroup.trim() || destPortGroup.trim()) && (
                <p className="text-xs text-muted-foreground text-orange-600 dark:text-orange-400">
                  Only TCP/UDP protocols are available when using ports or port groups
                </p>
              )}
              {ruleProtocol && ruleProtocol !== "all" && (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="protocolInvert"
                    checked={protocolInvert}
                    onCheckedChange={(checked) => setProtocolInvert(checked as boolean)}
                  />
                  <Label htmlFor="protocolInvert" className="cursor-pointer font-normal">
                    Invert match (match everything except this protocol)
                  </Label>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="disable"
                  checked={disable}
                  onCheckedChange={(checked) => setDisable(checked as boolean)}
                />
                <Label htmlFor="disable" className="cursor-pointer">
                  Disable rule
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="log"
                  checked={log}
                  onCheckedChange={(checked) => setLog(checked as boolean)}
                />
                <Label htmlFor="log" className="cursor-pointer">
                  Enable logging
                </Label>
              </div>
            </div>
          </TabsContent>

          {/* Source Tab */}
          <TabsContent value="source" className="space-y-4">
            {/* Mode Selection */}
            <div className="space-y-3">
              <Label>Source Match Type</Label>
              <RadioGroup value={sourceMode} onValueChange={(value: "any" | "address" | "group" | "geoip" | "mac" | "fqdn") => setSourceMode(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="source-any-mode" />
                  <Label htmlFor="source-any-mode" className="cursor-pointer font-normal">
                    Any (no source restriction)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="address" id="source-address-mode" />
                  <Label htmlFor="source-address-mode" className="cursor-pointer font-normal">
                    Address (IP, CIDR, or range)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fqdn" id="source-fqdn-mode" />
                  <Label htmlFor="source-fqdn-mode" className="cursor-pointer font-normal">
                    FQDN (domain name)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="group" id="source-group-mode" />
                  <Label htmlFor="source-group-mode" className="cursor-pointer font-normal">
                    Firewall Group
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="geoip" id="source-geoip-mode" />
                  <Label htmlFor="source-geoip-mode" className="cursor-pointer font-normal">
                    GeoIP (country codes)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mac" id="source-mac-mode" />
                  <Label htmlFor="source-mac-mode" className="cursor-pointer font-normal">
                    MAC Address
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Address Mode */}
            {sourceMode === "address" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="sourceAddress">Source Address</Label>
                  <Input
                    id="sourceAddress"
                    value={sourceAddress}
                    onChange={(e) => {
                      setSourceAddress(e.target.value);
                      setSourceAddressError(null);
                    }}
                    placeholder={protocol === "ipv4" ? "192.168.1.0/24 or 192.168.1.10" : "2001:db8::/32 or 2001:db8::1"}
                    className={sourceAddressError ? "border-destructive" : ""}
                  />
                  {sourceAddressError ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {sourceAddressError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {protocol === "ipv4"
                        ? "IPv4 address, CIDR (x.x.x.x/x), or range (x.x.x.x-x.x.x.x)"
                        : "IPv6 address, CIDR (xxxx:xxxx::/x), or range"
                      }
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sourceAddressInvert"
                    checked={sourceAddressInvert}
                    onCheckedChange={(checked) => setSourceAddressInvert(checked as boolean)}
                  />
                  <Label htmlFor="sourceAddressInvert" className="cursor-pointer font-normal">
                    Invert match (match everything except this address)
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceAddressMask">Address Mask (optional)</Label>
                  <Input
                    id="sourceAddressMask"
                    value={sourceAddressMask}
                    onChange={(e) => setSourceAddressMask(e.target.value)}
                    placeholder={protocol === "ipv4" ? "255.255.255.0" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional netmask for address matching
                  </p>
                </div>
              </div>
            )}

            {/* FQDN Mode */}
            {sourceMode === "fqdn" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="sourceFqdn">Source FQDN</Label>
                  <Input
                    id="sourceFqdn"
                    value={sourceFqdn}
                    onChange={(e) => setSourceFqdn(e.target.value)}
                    placeholder="example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Fully qualified domain name to match
                  </p>
                </div>
              </div>
            )}

            {/* Group Mode */}
            {sourceMode === "group" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sourceGroupType">Group Type</Label>
                    <Select value={sourceGroupType} onValueChange={setSourceGroupType}>
                      <SelectTrigger id="sourceGroupType">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="address-group">Address Group</SelectItem>
                        <SelectItem value="network-group">Network Group</SelectItem>
                        <SelectItem value="domain-group">Domain Group</SelectItem>
                        <SelectItem value="mac-group">MAC Group</SelectItem>
                        {capabilities?.features.remote_group?.supported && (
                          <SelectItem value="remote-group">Remote Group</SelectItem>
                        )}
                        {capabilities?.features.dynamic_address_group?.supported && (
                          <SelectItem value="dynamic-address-group">Dynamic Address Group</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sourceGroupName">Group Name</Label>
                    {sourceGroupType === "dynamic-address-group" ? (
                      <Input
                        id="sourceGroupName"
                        value={sourceGroupName}
                        onChange={(e) => setSourceGroupName(e.target.value)}
                        placeholder="Dynamic group name"
                      />
                    ) : (
                    <Select
                      value={sourceGroupName}
                      onValueChange={setSourceGroupName}
                      disabled={!sourceGroupType}
                    >
                      <SelectTrigger id="sourceGroupName">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceGroupType === "address-group" &&
                          addressGroups.map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                        {sourceGroupType === "network-group" &&
                          networkGroups.map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                        {sourceGroupType === "domain-group" &&
                          groups.filter((g) => g.type === "domain-group").map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                        {sourceGroupType === "mac-group" &&
                          groups.filter((g) => g.type === "mac-group").map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                        {sourceGroupType === "remote-group" &&
                          groups.filter((g) => g.type === "remote-group").map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="sourceGroupInvert" checked={sourceGroupInvert} onCheckedChange={(c) => setSourceGroupInvert(!!c)} />
                  <Label htmlFor="sourceGroupInvert" className="cursor-pointer font-normal text-sm">
                    Invert (match packets NOT in this group)
                  </Label>
                </div>
              </div>
            )}

            {/* GeoIP Mode */}
            {sourceMode === "geoip" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <CountryMultiSelect
                  id="sourceGeoipCountry"
                  label="Source GeoIP Countries"
                  value={sourceGeoipCountry}
                  onChange={setSourceGeoipCountry}
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sourceGeoipInverse"
                    checked={sourceGeoipInverse}
                    onCheckedChange={(checked) => setSourceGeoipInverse(checked as boolean)}
                  />
                  <Label htmlFor="sourceGeoipInverse" className="text-sm font-normal cursor-pointer">
                    Exclude countries (inverse match)
                  </Label>
                </div>
              </div>
            )}

            {/* MAC Address Mode */}
            {sourceMode === "mac" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="sourceMac">Source MAC Address</Label>
                  <Input
                    id="sourceMac"
                    value={sourceMac}
                    onChange={(e) => {
                      setSourceMac(e.target.value);
                      setSourceMacError(null);
                    }}
                    placeholder="aa:bb:cc:dd:ee:ff"
                    className={sourceMacError ? "border-destructive" : ""}
                  />
                  {sourceMacError ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {sourceMacError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Format: aa:bb:cc:dd:ee:ff
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Port Selection (available for all modes) */}
            <div className="space-y-3 pt-4 border-t">
              <Label>Source Port</Label>
              <RadioGroup value={sourcePortMode} onValueChange={(value: "any" | "port" | "group") => setSourcePortMode(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="edit-source-port-any-mode" />
                  <Label htmlFor="edit-source-port-any-mode" className="cursor-pointer font-normal">
                    Any (no port restriction)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="port" id="edit-source-port-mode" />
                  <Label htmlFor="edit-source-port-mode" className="cursor-pointer font-normal">
                    Port Number/Range
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="group" id="edit-source-port-group-mode" />
                  <Label htmlFor="edit-source-port-group-mode" className="cursor-pointer font-normal">
                    Port Group
                  </Label>
                </div>
              </RadioGroup>

              {sourcePortMode === "port" && (
                <div className="pl-6 border-l-2 border-primary/20 space-y-2">
                  <Input
                    id="sourcePort"
                    value={sourcePort}
                    onChange={(e) => {
                      setSourcePort(e.target.value);
                      setSourcePortError(null);
                    }}
                    placeholder="80,443,telnet,8080-8090"
                    className={sourcePortError ? "border-destructive" : ""}
                  />
                  {sourcePortError ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {sourcePortError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Port number, range, service name, or comma-separated list (e.g., 80,443,telnet,8080-8090)
                    </p>
                  )}
                </div>
              )}

              {sourcePortMode === "group" && (
                <div className="pl-6 border-l-2 border-primary/20 space-y-2">
                  <Select value={sourcePortGroup} onValueChange={setSourcePortGroup}>
                    <SelectTrigger id="sourcePortGroup">
                      <SelectValue placeholder="Select port group" />
                    </SelectTrigger>
                    <SelectContent>
                      {portGroups.map((g) => (
                        <SelectItem key={g.name} value={g.name}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="sourcePortGroupInvert" checked={sourcePortGroupInvert} onCheckedChange={(c) => setSourcePortGroupInvert(!!c)} />
                    <Label htmlFor="sourcePortGroupInvert" className="cursor-pointer font-normal text-sm">
                      Invert (match packets NOT in this group)
                    </Label>
                  </div>
                </div>
              )}

              {(sourcePortMode === "port" || sourcePortMode === "group") && (
                <p className="text-xs text-muted-foreground">
                  Port specification requires TCP/UDP protocol
                </p>
              )}
            </div>
          </TabsContent>

          {/* Destination Tab */}
          <TabsContent value="destination" className="space-y-4">
            {/* Mode Selection */}
            <div className="space-y-3">
              <Label>Destination Match Type</Label>
              <RadioGroup value={destMode} onValueChange={(value: "any" | "address" | "group" | "geoip" | "fqdn" | "mac") => setDestMode(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="dest-any-mode" />
                  <Label htmlFor="dest-any-mode" className="cursor-pointer font-normal">
                    Any (no destination restriction)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="address" id="dest-address-mode" />
                  <Label htmlFor="dest-address-mode" className="cursor-pointer font-normal">
                    Address (IP, CIDR, or range)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fqdn" id="dest-fqdn-mode" />
                  <Label htmlFor="dest-fqdn-mode" className="cursor-pointer font-normal">
                    FQDN (domain name)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="group" id="dest-group-mode" />
                  <Label htmlFor="dest-group-mode" className="cursor-pointer font-normal">
                    Firewall Group
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="geoip" id="dest-geoip-mode" />
                  <Label htmlFor="dest-geoip-mode" className="cursor-pointer font-normal">
                    GeoIP (country codes)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mac" id="dest-mac-mode" />
                  <Label htmlFor="dest-mac-mode" className="cursor-pointer font-normal">
                    MAC Address
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Address Mode */}
            {destMode === "address" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="destAddress">Destination Address</Label>
                  <Input
                    id="destAddress"
                    value={destAddress}
                    onChange={(e) => {
                      setDestAddress(e.target.value);
                      setDestAddressError(null);
                    }}
                    placeholder={protocol === "ipv4" ? "192.168.1.0/24 or 192.168.1.10" : "2001:db8::/32 or 2001:db8::1"}
                    className={destAddressError ? "border-destructive" : ""}
                  />
                  {destAddressError ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {destAddressError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {protocol === "ipv4"
                        ? "IPv4 address, CIDR (x.x.x.x/x), or range (x.x.x.x-x.x.x.x)"
                        : "IPv6 address, CIDR (xxxx:xxxx::/x), or range"
                      }
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="destAddressInvert"
                    checked={destAddressInvert}
                    onCheckedChange={(checked) => setDestAddressInvert(checked as boolean)}
                  />
                  <Label htmlFor="destAddressInvert" className="cursor-pointer font-normal">
                    Invert match (match everything except this address)
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destAddressMask">Address Mask (optional)</Label>
                  <Input
                    id="destAddressMask"
                    value={destAddressMask}
                    onChange={(e) => setDestAddressMask(e.target.value)}
                    placeholder={protocol === "ipv4" ? "255.255.255.0" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional netmask for address matching
                  </p>
                </div>
              </div>
            )}

            {/* FQDN Mode */}
            {destMode === "fqdn" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="destFqdn">Destination FQDN</Label>
                  <Input
                    id="destFqdn"
                    value={destFqdn}
                    onChange={(e) => setDestFqdn(e.target.value)}
                    placeholder="example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Fully qualified domain name to match
                  </p>
                </div>
              </div>
            )}

            {/* Group Mode */}
            {destMode === "group" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="destGroupType">Group Type</Label>
                    <Select value={destGroupType} onValueChange={setDestGroupType}>
                      <SelectTrigger id="destGroupType">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="address-group">Address Group</SelectItem>
                        <SelectItem value="network-group">Network Group</SelectItem>
                        <SelectItem value="domain-group">Domain Group</SelectItem>
                        <SelectItem value="mac-group">MAC Group</SelectItem>
                        {capabilities?.features.remote_group?.supported && (
                          <SelectItem value="remote-group">Remote Group</SelectItem>
                        )}
                        {capabilities?.features.dynamic_address_group?.supported && (
                          <SelectItem value="dynamic-address-group">Dynamic Address Group</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="destGroupName">Group Name</Label>
                    {destGroupType === "dynamic-address-group" ? (
                      <Input
                        id="destGroupName"
                        value={destGroupName}
                        onChange={(e) => setDestGroupName(e.target.value)}
                        placeholder="Dynamic group name"
                      />
                    ) : (
                    <Select
                      value={destGroupName}
                      onValueChange={setDestGroupName}
                      disabled={!destGroupType}
                    >
                      <SelectTrigger id="destGroupName">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {destGroupType === "address-group" &&
                          addressGroups.map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                        {destGroupType === "network-group" &&
                          networkGroups.map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                        {destGroupType === "domain-group" &&
                          groups.filter((g) => g.type === "domain-group").map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                        {destGroupType === "mac-group" &&
                          groups.filter((g) => g.type === "mac-group").map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                        {destGroupType === "remote-group" &&
                          groups.filter((g) => g.type === "remote-group").map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="destGroupInvert" checked={destGroupInvert} onCheckedChange={(c) => setDestGroupInvert(!!c)} />
                  <Label htmlFor="destGroupInvert" className="cursor-pointer font-normal text-sm">
                    Invert (match packets NOT in this group)
                  </Label>
                </div>
              </div>
            )}

            {/* GeoIP Mode */}
            {destMode === "geoip" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <CountryMultiSelect
                  id="destGeoipCountry"
                  label="Destination GeoIP Countries"
                  value={destGeoipCountry}
                  onChange={setDestGeoipCountry}
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="destGeoipInverse"
                    checked={destGeoipInverse}
                    onCheckedChange={(checked) => setDestGeoipInverse(checked as boolean)}
                  />
                  <Label htmlFor="destGeoipInverse" className="text-sm font-normal cursor-pointer">
                    Exclude countries (inverse match)
                  </Label>
                </div>
              </div>
            )}

            {/* MAC Address Mode */}
            {destMode === "mac" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="destMacAddress">Destination MAC Address</Label>
                  <Input
                    id="destMacAddress"
                    value={destMacAddress}
                    onChange={(e) => setDestMacAddress(e.target.value)}
                    placeholder="aa:bb:cc:dd:ee:ff"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: aa:bb:cc:dd:ee:ff
                  </p>
                </div>
              </div>
            )}

            {/* Port Selection (available for all modes) */}
            <div className="space-y-3 pt-4 border-t">
              <Label>Destination Port</Label>
              <RadioGroup value={destPortMode} onValueChange={(value: "any" | "port" | "group") => setDestPortMode(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="edit-dest-port-any-mode" />
                  <Label htmlFor="edit-dest-port-any-mode" className="cursor-pointer font-normal">
                    Any (no port restriction)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="port" id="edit-dest-port-mode" />
                  <Label htmlFor="edit-dest-port-mode" className="cursor-pointer font-normal">
                    Port Number/Range
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="group" id="edit-dest-port-group-mode" />
                  <Label htmlFor="edit-dest-port-group-mode" className="cursor-pointer font-normal">
                    Port Group
                  </Label>
                </div>
              </RadioGroup>

              {destPortMode === "port" && (
                <div className="pl-6 border-l-2 border-primary/20 space-y-2">
                  <Input
                    id="destPort"
                    value={destPort}
                    onChange={(e) => {
                      setDestPort(e.target.value);
                      setDestPortError(null);
                    }}
                    placeholder="443,https,8080-8090"
                    className={destPortError ? "border-destructive" : ""}
                  />
                  {destPortError ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {destPortError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Port number, range, service name, or comma-separated list (e.g., 443,https,8080-8090)
                    </p>
                  )}
                </div>
              )}

              {destPortMode === "group" && (
                <div className="pl-6 border-l-2 border-primary/20 space-y-2">
                  <Select value={destPortGroup} onValueChange={setDestPortGroup}>
                    <SelectTrigger id="destPortGroup">
                      <SelectValue placeholder="Select port group" />
                    </SelectTrigger>
                    <SelectContent>
                      {portGroups.map((g) => (
                        <SelectItem key={g.name} value={g.name}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="destPortGroupInvert" checked={destPortGroupInvert} onCheckedChange={(c) => setDestPortGroupInvert(!!c)} />
                    <Label htmlFor="destPortGroupInvert" className="cursor-pointer font-normal text-sm">
                      Invert (match packets NOT in this group)
                    </Label>
                  </div>
                </div>
              )}

              {(destPortMode === "port" || destPortMode === "group") && (
                <p className="text-xs text-muted-foreground">
                  Port specification requires TCP/UDP protocol
                </p>
              )}
            </div>
          </TabsContent>

          {/* State Tab */}
          <TabsContent value="state" className="space-y-4">
            <div className="space-y-4">
              <Label>Connection State Matching</Label>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stateEstablished"
                    checked={stateEstablished}
                    onCheckedChange={(checked) => setStateEstablished(checked as boolean)}
                  />
                  <Label htmlFor="stateEstablished" className="cursor-pointer">
                    Established
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stateNew"
                    checked={stateNew}
                    onCheckedChange={(checked) => setStateNew(checked as boolean)}
                  />
                  <Label htmlFor="stateNew" className="cursor-pointer">
                    New
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stateRelated"
                    checked={stateRelated}
                    onCheckedChange={(checked) => setStateRelated(checked as boolean)}
                  />
                  <Label htmlFor="stateRelated" className="cursor-pointer">
                    Related
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stateInvalid"
                    checked={stateInvalid}
                    onCheckedChange={(checked) => setStateInvalid(checked as boolean)}
                  />
                  <Label htmlFor="stateInvalid" className="cursor-pointer">
                    Invalid
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inboundInterface">Inbound Interface</Label>
              <InterfaceSelect
                value={inboundInterface}
                onValueChange={setInboundInterface}
                id="inboundInterface"
                interfaces={interfaces.map((i) => ({ name: i.name, type: "", description: i.description ?? null }))}
                noneOption={{ label: "Any", value: "any" }}
                placeholder="Any interface"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outboundInterface">Outbound Interface</Label>
              <InterfaceSelect
                value={outboundInterface}
                onValueChange={setOutboundInterface}
                id="outboundInterface"
                interfaces={interfaces.map((i) => ({ name: i.name, type: "", description: i.description ?? null }))}
                noneOption={{ label: "Any", value: "any" }}
                placeholder="Any interface"
              />
            </div>

            {/* IPsec Matching */}
            {capabilities?.features.ipsec_matching?.supported && (
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-semibold">IPsec Matching</Label>
                {capabilities?.features.ipsec_directional?.supported ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ipsecInbound">Inbound</Label>
                      <Select value={ipsecInbound} onValueChange={(v: "none" | "match-ipsec" | "match-none") => setIpsecInbound(v)}>
                        <SelectTrigger id="ipsecInbound">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No match</SelectItem>
                          <SelectItem value="match-ipsec">Match IPsec</SelectItem>
                          <SelectItem value="match-none">Match non-IPsec</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ipsecOutbound">Outbound</Label>
                      <Select value={ipsecOutbound} onValueChange={(v: "none" | "match-ipsec" | "match-none") => setIpsecOutbound(v)}>
                        <SelectTrigger id="ipsecOutbound">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No match</SelectItem>
                          <SelectItem value="match-ipsec">Match IPsec</SelectItem>
                          <SelectItem value="match-none">Match non-IPsec</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <RadioGroup value={ipsecMode} onValueChange={(v: "none" | "match-ipsec" | "match-none") => setIpsecMode(v)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="ipsec-none" />
                        <Label htmlFor="ipsec-none" className="cursor-pointer font-normal">No IPsec match</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="match-ipsec" id="ipsec-match" />
                        <Label htmlFor="ipsec-match" className="cursor-pointer font-normal">Match IPsec traffic</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="match-none" id="ipsec-match-none" />
                        <Label htmlFor="ipsec-match-none" className="cursor-pointer font-normal">Match non-IPsec traffic</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Matching Tab */}
          <TabsContent value="matching" className="space-y-4">
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="connection">
                <AccordionTrigger>
                  Connection Mark / Status
                  {(connectionMark || connectionStatusNat || conntrackHelper) && <Badge variant="secondary" className="ml-2">Set</Badge>}
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="connectionMark">Connection Mark</Label>
                      <Input id="connectionMark" value={connectionMark} onChange={(e) => setConnectionMark(e.target.value)} placeholder="e.g. 100" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="connectionStatusNat">Connection Status NAT</Label>
                      <Select value={connectionStatusNat || "__none__"} onValueChange={(v) => setConnectionStatusNat(v === "__none__" ? "" : v)}>
                        <SelectTrigger id="connectionStatusNat"><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Any</SelectItem>
                          <SelectItem value="destination">Destination NAT</SelectItem>
                          <SelectItem value="source">Source NAT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conntrackHelper">Conntrack Helper</Label>
                    <Input id="conntrackHelper" value={conntrackHelper} onChange={(e) => setConntrackHelper(e.target.value)} placeholder="e.g. ftp, h323, pptp, sip, tftp" />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="dscp">
                <AccordionTrigger>
                  DSCP Matching
                  {(dscpMatch || dscpExclude) && <Badge variant="secondary" className="ml-2">Set</Badge>}
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dscpMatch">DSCP Match</Label>
                      <Input id="dscpMatch" value={dscpMatch} onChange={(e) => setDscpMatch(e.target.value)} placeholder="0-63 or CS0-CS7, AF11-AF43, EF" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dscpExclude">DSCP Exclude</Label>
                      <Input id="dscpExclude" value={dscpExclude} onChange={(e) => setDscpExclude(e.target.value)} placeholder="0-63 or CS0-CS7, AF11-AF43, EF" />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="fragment">
                <AccordionTrigger>
                  Fragment Matching
                  {(fragmentMatchFrag || fragmentMatchNonFrag) && <Badge variant="secondary" className="ml-2">Set</Badge>}
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="fragmentMatchFrag" checked={fragmentMatchFrag} onCheckedChange={(c) => setFragmentMatchFrag(!!c)} />
                    <Label htmlFor="fragmentMatchFrag" className="cursor-pointer font-normal">Match fragmented packets</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="fragmentMatchNonFrag" checked={fragmentMatchNonFrag} onCheckedChange={(c) => setFragmentMatchNonFrag(!!c)} />
                    <Label htmlFor="fragmentMatchNonFrag" className="cursor-pointer font-normal">Match non-fragmented packets</Label>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {capabilities?.features.gre_matching?.supported && (
                <AccordionItem value="gre">
                  <AccordionTrigger>
                    GRE Matching (1.5+)
                    {(greKey || greVersion || greInnerProto) && <Badge variant="secondary" className="ml-2">Set</Badge>}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="greKey">GRE Key</Label>
                        <Input id="greKey" value={greKey} onChange={(e) => setGreKey(e.target.value)} placeholder="Key value" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="greVersion">GRE Version</Label>
                        <Select value={greVersion || "__none__"} onValueChange={(v) => setGreVersion(v === "__none__" ? "" : v)}>
                          <SelectTrigger id="greVersion"><SelectValue placeholder="Any" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Any</SelectItem>
                            <SelectItem value="0">GREv0</SelectItem>
                            <SelectItem value="1">GREv1</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="greInnerProto">Inner Protocol</Label>
                        <Input id="greInnerProto" value={greInnerProto} onChange={(e) => setGreInnerProto(e.target.value)} placeholder="Protocol number" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>GRE Flags</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {["checksum", "key", "sequence"].map((flag) => (
                          <div key={flag} className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox id={`gre-flag-${flag}`} checked={!!greFlags[flag]} onCheckedChange={(c) => setGreFlags(prev => ({ ...prev, [flag]: !!c, [`${flag}_unset`]: false }))} />
                              <Label htmlFor={`gre-flag-${flag}`} className="cursor-pointer font-normal capitalize">{flag} set</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id={`gre-flag-${flag}-unset`} checked={!!greFlags[`${flag}_unset`]} onCheckedChange={(c) => setGreFlags(prev => ({ ...prev, [`${flag}_unset`]: !!c, [flag]: false }))} />
                              <Label htmlFor={`gre-flag-${flag}-unset`} className="cursor-pointer font-normal capitalize">{flag} unset</Label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              <AccordionItem value="mark-packet">
                <AccordionTrigger>
                  Mark / Packet Length / Type
                  {(markMatch || packetLength || packetLengthExclude || packetType) && <Badge variant="secondary" className="ml-2">Set</Badge>}
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="markMatch">Mark Match</Label>
                      <Input id="markMatch" value={markMatch} onChange={(e) => setMarkMatch(e.target.value)} placeholder="e.g. 100" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="packetType">Packet Type</Label>
                      <Select value={packetType || "__none__"} onValueChange={(v) => setPacketType(v === "__none__" ? "" : v)}>
                        <SelectTrigger id="packetType"><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Any</SelectItem>
                          <SelectItem value="broadcast">Broadcast</SelectItem>
                          <SelectItem value="host">Host</SelectItem>
                          <SelectItem value="multicast">Multicast</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="packetLength">Packet Length</Label>
                      <Input id="packetLength" value={packetLength} onChange={(e) => setPacketLength(e.target.value)} placeholder="e.g. 128 or 64-1500" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="packetLengthExclude">Packet Length Exclude</Label>
                      <Input id="packetLengthExclude" value={packetLengthExclude} onChange={(e) => setPacketLengthExclude(e.target.value)} placeholder="e.g. 1500" />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tcp-ttl">
                <AccordionTrigger>
                  TCP MSS / TTL Match
                  {(tcpMssMatch || ttlEq || ttlGt || ttlLt) && <Badge variant="secondary" className="ml-2">Set</Badge>}
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="tcpMssMatch">TCP MSS Match</Label>
                    <Input id="tcpMssMatch" value={tcpMssMatch} onChange={(e) => setTcpMssMatch(e.target.value)} placeholder="e.g. 500-1460" />
                    <p className="text-xs text-muted-foreground">Match TCP MSS value or range</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ttlEq">TTL Equal</Label>
                      <Input id="ttlEq" value={ttlEq} onChange={(e) => setTtlEq(e.target.value)} placeholder="0-255" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ttlGt">TTL Greater Than</Label>
                      <Input id="ttlGt" value={ttlGt} onChange={(e) => setTtlGt(e.target.value)} placeholder="0-255" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ttlLt">TTL Less Than</Label>
                      <Input id="ttlLt" value={ttlLt} onChange={(e) => setTtlLt(e.target.value)} placeholder="0-255" />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Limits & Time Tab */}
          <TabsContent value="limits" className="space-y-4">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Rate Limiting</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="limitRate">Rate</Label>
                  <Input id="limitRate" value={limitRate} onChange={(e) => setLimitRate(e.target.value)} placeholder="e.g. 10/second, 100/minute" />
                  <p className="text-xs text-muted-foreground">Format: number/unit (second, minute, hour, day)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limitBurst">Burst</Label>
                  <Input id="limitBurst" value={limitBurst} onChange={(e) => setLimitBurst(e.target.value)} placeholder="e.g. 20" />
                  <p className="text-xs text-muted-foreground">Maximum burst before rate limiting kicks in</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">Recent Connection Tracking</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recentCount">Count</Label>
                  <Input id="recentCount" value={recentCount} onChange={(e) => setRecentCount(e.target.value)} placeholder="e.g. 5" />
                  <p className="text-xs text-muted-foreground">Number of recent connections to match</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recentTime">Time (seconds)</Label>
                  <Input id="recentTime" value={recentTime} onChange={(e) => setRecentTime(e.target.value)} placeholder="e.g. 60" />
                  <p className="text-xs text-muted-foreground">Time window in seconds</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">Time-Based Rules</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeStartdate">Start Date</Label>
                  <Input id="timeStartdate" type="date" value={timeStartdate} onChange={(e) => setTimeStartdate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeStopdate">Stop Date</Label>
                  <Input id="timeStopdate" type="date" value={timeStopdate} onChange={(e) => setTimeStopdate(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeStarttime">Start Time</Label>
                  <Input id="timeStarttime" type="time" value={timeStarttime} onChange={(e) => setTimeStarttime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeStoptime">Stop Time</Label>
                  <Input id="timeStoptime" type="time" value={timeStoptime} onChange={(e) => setTimeStoptime(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeWeekdays">Weekdays</Label>
                <Input id="timeWeekdays" value={timeWeekdays} onChange={(e) => setTimeWeekdays(e.target.value)} placeholder="Monday,Tuesday,Wednesday" />
                <p className="text-xs text-muted-foreground">Comma-separated days: Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday</p>
              </div>
            </div>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">TCP Flags</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Set individual TCP flag matching rules (requires TCP protocol only)
                </p>
              </div>
              {ruleProtocol !== "tcp" && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    TCP flags can only be used with TCP protocol (not TCP & UDP). Set the protocol to TCP in the Basic tab to enable TCP flags.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {availableTcpFlags.map((flag) => (
                  <div key={flag} className="space-y-2">
                    <Label htmlFor={`tcp-${flag}`} className="uppercase font-medium text-sm">
                      {flag}
                    </Label>
                    <Select
                      value={tcpFlags[flag]}
                      onValueChange={(value: "disabled" | "enabled" | "not") => {
                        // Auto-switch to TCP protocol when enabling a flag
                        if (value !== "disabled" && ruleProtocol !== "tcp") {
                          setRuleProtocol("tcp");
                        }
                        updateTcpFlag(flag, value);
                      }}
                      disabled={ruleProtocol !== "tcp"}
                    >
                      <SelectTrigger id={`tcp-${flag}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <SelectItem value="enabled">Match Set</SelectItem>
                        <SelectItem value="not">Match NOT Set</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <Label htmlFor="icmpTypeName" className="text-base font-semibold">ICMP Type</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Select ICMP type name to match (requires ICMP protocol)
                </p>
              </div>
              {ruleProtocol !== "icmp" && ruleProtocol !== "ipv6-icmp" && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    ICMP type can only be used with ICMP protocol. Set the protocol to ICMP in the Basic tab to enable ICMP type.
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Select
                  key={icmpTypeName || "empty"}
                  value={icmpTypeName || undefined}
                  onValueChange={(value) => {
                    // Auto-switch to ICMP protocol when selecting a type
                    if (value && ruleProtocol !== "icmp" && ruleProtocol !== "ipv6-icmp") {
                      setRuleProtocol("icmp");
                    }
                    setIcmpTypeName(value);
                  }}
                  disabled={ruleProtocol !== "icmp" && ruleProtocol !== "ipv6-icmp"}
                >
                  <SelectTrigger id="icmpTypeName" className="flex-1">
                    <SelectValue placeholder="Select ICMP type..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {icmpTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {icmpTypeName && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      setIcmpTypeName("");
                    }}
                    disabled={ruleProtocol !== "icmp" && ruleProtocol !== "ipv6-icmp"}
                    className="shrink-0"
                    title="Clear ICMP type"
                  >
                    ×
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <Label>Packet Modifications</Label>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dscp">DSCP</Label>
                  <Input
                    id="dscp"
                    value={dscp}
                    onChange={(e) => setDscp(e.target.value)}
                    placeholder="0-63"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mark">Mark</Label>
                  <Input
                    id="mark"
                    value={mark}
                    onChange={(e) => setMark(e.target.value)}
                    placeholder="Packet mark"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ttl">TTL</Label>
                  <Input
                    id="ttl"
                    value={ttl}
                    onChange={(e) => setTtl(e.target.value)}
                    placeholder="0-255"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="modSetConnectionMark">Set Connection Mark</Label>
                  <Input id="modSetConnectionMark" value={modSetConnectionMark} onChange={(e) => setModSetConnectionMark(e.target.value)} placeholder="Mark value" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modSetTcpMss">Set TCP MSS</Label>
                  <Input id="modSetTcpMss" value={modSetTcpMss} onChange={(e) => setModSetTcpMss(e.target.value)} placeholder="MSS value" />
                </div>
              </div>
            </div>

            {/* Log Options (shown when log is enabled) */}
            {log && (
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-semibold">Log Options</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="logOptionsGroup">Log Group</Label>
                    <Input id="logOptionsGroup" value={logOptionsGroup} onChange={(e) => setLogOptionsGroup(e.target.value)} placeholder="Group number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logOptionsLevel">Log Level</Label>
                    <Select value={logOptionsLevel || "__none__"} onValueChange={(v) => setLogOptionsLevel(v === "__none__" ? "" : v)}>
                      <SelectTrigger id="logOptionsLevel"><SelectValue placeholder="Default" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Default</SelectItem>
                        <SelectItem value="emerg">Emergency</SelectItem>
                        <SelectItem value="alert">Alert</SelectItem>
                        <SelectItem value="crit">Critical</SelectItem>
                        <SelectItem value="err">Error</SelectItem>
                        <SelectItem value="warn">Warning</SelectItem>
                        <SelectItem value="notice">Notice</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="debug">Debug</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="logOptionsQueueThreshold">Queue Threshold</Label>
                    <Input id="logOptionsQueueThreshold" value={logOptionsQueueThreshold} onChange={(e) => setLogOptionsQueueThreshold(e.target.value)} placeholder="Threshold" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logOptionsSnapshotLength">Snapshot Length</Label>
                    <Input id="logOptionsSnapshotLength" value={logOptionsSnapshotLength} onChange={(e) => setLogOptionsSnapshotLength(e.target.value)} placeholder="Length" />
                  </div>
                </div>
              </div>
            )}

            {/* Queue Config (shown when action is queue) */}
            {action === "queue" && (
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-semibold">Queue Configuration</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="queueNumber">Queue Number</Label>
                    <Input id="queueNumber" value={queueNumber} onChange={(e) => setQueueNumber(e.target.value)} placeholder="0-65535" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="queueOptions">Queue Options</Label>
                    <Select value={queueOptions || "__none__"} onValueChange={(v) => setQueueOptions(v === "__none__" ? "" : v)}>
                      <SelectTrigger id="queueOptions"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        <SelectItem value="bypass">Bypass</SelectItem>
                        <SelectItem value="fanout">Fanout</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Synproxy Config (shown when action is synproxy) */}
            {action === "synproxy" && (
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-semibold">Synproxy Configuration</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="synproxyTcpMss">TCP MSS</Label>
                    <Input id="synproxyTcpMss" value={synproxyTcpMss} onChange={(e) => setSynproxyTcpMss(e.target.value)} placeholder="MSS value" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="synproxyTcpWindowScale">TCP Window Scale</Label>
                    <Input id="synproxyTcpWindowScale" value={synproxyTcpWindowScale} onChange={(e) => setSynproxyTcpWindowScale(e.target.value)} placeholder="Window scale" />
                  </div>
                </div>
              </div>
            )}

            {/* Add Address to Group */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">Add Address to Group</Label>
              <p className="text-xs text-muted-foreground">Dynamically add source/destination addresses to firewall groups</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addAddrToGroupSrcGroup">Source Address Group</Label>
                  <Input id="addAddrToGroupSrcGroup" value={addAddrToGroupSrcGroup} onChange={(e) => setAddAddrToGroupSrcGroup(e.target.value)} placeholder="Group name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addAddrToGroupSrcTimeout">Source Timeout</Label>
                  <Input id="addAddrToGroupSrcTimeout" value={addAddrToGroupSrcTimeout} onChange={(e) => setAddAddrToGroupSrcTimeout(e.target.value)} placeholder="e.g. 300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addAddrToGroupDstGroup">Destination Address Group</Label>
                  <Input id="addAddrToGroupDstGroup" value={addAddrToGroupDstGroup} onChange={(e) => setAddAddrToGroupDstGroup(e.target.value)} placeholder="Group name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addAddrToGroupDstTimeout">Destination Timeout</Label>
                  <Input id="addAddrToGroupDstTimeout" value={addAddrToGroupDstTimeout} onChange={(e) => setAddAddrToGroupDstTimeout(e.target.value)} placeholder="e.g. 300" />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Rule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
