"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { firewallGroupsService } from "@/lib/api/firewall-groups";
import {
  bridgeFirewallService,
  type BridgeCapabilities,
  type BridgeRule,
  type InterfaceOption,
} from "@/lib/api/firewall-bridge";
import {
  firewallActionSupported,
  firewallFeatureSupported,
} from "@/lib/api/firewall-capability-gates";

interface BridgeRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chain: string;
  capabilities: BridgeCapabilities | null;
  existingRuleNumbers: number[];
  onSuccess: () => void;
  existing?: BridgeRule | null;
}

// Rate limit units
const RATE_UNITS = [
  { value: "second" },
  { value: "minute" },
  { value: "hour" },
  { value: "day" },
] as const;

// Weekday options - VyOS requires full names
const WEEKDAYS = [
  { value: "Monday" },
  { value: "Tuesday" },
  { value: "Wednesday" },
  { value: "Thursday" },
  { value: "Friday" },
  { value: "Saturday" },
  { value: "Sunday" },
] as const;

const parseRateLimit = (rate: string | null | undefined): { value: string; unit: string } => {
  if (!rate) return { value: "", unit: "minute" };
  const match = rate.match(/^(\d+)\/(second|minute|hour|day)$/);
  if (match) {
    return { value: match[1], unit: match[2] };
  }
  return { value: rate, unit: "minute" };
};

const parseAddress = (addr: string | null | undefined): { address: string; negate: boolean } => {
  if (!addr) return { address: "", negate: false };
  if (addr.startsWith("!")) {
    return { address: addr.slice(1), negate: true };
  }
  return { address: addr, negate: false };
};

const parseWeekdays = (days: string | null | undefined): string[] => {
  if (!days) return [];
  return days.split(",").map((d) => d.trim()).filter(Boolean);
};

const splitFlags = (value: string | null | undefined): string[] =>
  (value || "").split(",").map((item) => item.trim()).filter(Boolean);

const parseTimeForInput = (time: string | null | undefined): string => {
  if (!time) return "";
  const match = time.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : time;
};

export function BridgeRuleModal({
  open,
  onOpenChange,
  chain,
  capabilities,
  existingRuleNumbers,
  onSuccess,
  existing,
}: BridgeRuleModalProps) {
  const t = useTranslations("firewallBridge");
  const tc = useTranslations("common");
  const isEdit = !!existing;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceOption[]>([]);
  const [interfaceGroups, setInterfaceGroups] = useState<string[]>([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadInterfaces();
    firewallGroupsService.getConfig()
      .then((config) => setInterfaceGroups(config.interface_groups.map((group) => group.name)))
      .catch(() => setInterfaceGroups([]));
    if (existing) {
      populateForm(existing);
    } else {
      resetForm();
    }
  }, [open, existing]);

  const loadInterfaces = async () => {
    setLoadingInterfaces(true);
    try {
      const response = await bridgeFirewallService.getInterfaces();
      setAvailableInterfaces(response.interfaces);
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    } finally {
      setLoadingInterfaces(false);
    }
  };

  // Calculate next rule number (start at 100, increment by 1)
  const getNextRuleNumber = (): number => {
    if (existingRuleNumbers.length === 0) {
      return 100;
    }
    const maxRule = Math.max(...existingRuleNumbers);
    return maxRule + 1;
  };

  // Form state - Basic
  const [action, setAction] = useState("accept");
  const [description, setDescription] = useState("");
  const [log, setLog] = useState(false);
  const [disabled, setDisabled] = useState(false);

  // Source/Destination MAC
  const [sourceMac, setSourceMac] = useState("");
  const [destinationMac, setDestinationMac] = useState("");

  // Source/Destination IP (1.5+) - with negation
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceAddressNegate, setSourceAddressNegate] = useState(false);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationAddressNegate, setDestinationAddressNegate] = useState(false);
  const [sourcePort, setSourcePort] = useState("");
  const [destinationPort, setDestinationPort] = useState("");

  // VLAN
  const [vlanId, setVlanId] = useState("");
  const [vlanPriority, setVlanPriorityValue] = useState("");

  // Interface
  const [inboundInterface, setInboundInterface] = useState("");
  const [outboundInterface, setOutboundInterface] = useState("");
  const [inboundInterfaceGroup, setInboundInterfaceGroup] = useState("");
  const [outboundInterfaceGroup, setOutboundInterfaceGroup] = useState("");

  // Protocol (1.5+)
  const [protocol, setProtocol] = useState("");

  // Ethernet Type (1.5+)
  const [ethernetType, setEthernetType] = useState("");
  const [vlanEthernetType, setVlanEthernetType] = useState("");

  // Jump target
  const [jumpTarget, setJumpTarget] = useState("");

  // Queue (1.5+)
  const [queue, setQueue] = useState("");

  // ICMP (1.5+)
  const [icmpType, setIcmpType] = useState("");
  const [icmpCode, setIcmpCode] = useState("");
  const [icmpTypeName, setIcmpTypeName] = useState("");

  // TCP (1.5+). Names come from capabilities, not a hardcoded subset.
  const [tcpFlags, setTcpFlags] = useState<string[]>([]);
  const [tcpFlagsNot, setTcpFlagsNot] = useState<string[]>([]);
  const [tcpMss, setTcpMss] = useState("");

  // Match leaves the client already emits
  const [mark, setMark] = useState("");
  const [connectionMark, setConnectionMark] = useState("");
  const [dscp, setDscp] = useState("");
  const [dscpExclude, setDscpExclude] = useState("");
  const [packetType, setPacketType] = useState("");
  const [packetLength, setPacketLength] = useState("");
  const [ttlEq, setTtlEq] = useState("");
  const [ttlGt, setTtlGt] = useState("");
  const [ttlLt, setTtlLt] = useState("");
  const [hopEq, setHopEq] = useState("");
  const [hopGt, setHopGt] = useState("");
  const [hopLt, setHopLt] = useState("");
  const [fragmentFrag, setFragmentFrag] = useState(false);
  const [fragmentNonFrag, setFragmentNonFrag] = useState(false);
  const [ipsecIn, setIpsecIn] = useState(false);
  const [ipsecOut, setIpsecOut] = useState(false);
  const [ipsecNoneIn, setIpsecNoneIn] = useState(false);
  const [ipsecNoneOut, setIpsecNoneOut] = useState(false);
  const [logLevel, setLogLevel] = useState("");
  const [logGroup, setLogGroup] = useState("");

  // Rate limiting (1.5+) - split into number and unit
  const [limitRateValue, setLimitRateValue] = useState("");
  const [limitRateUnit, setLimitRateUnit] = useState("minute");
  const [limitBurst, setLimitBurst] = useState("");

  // Time-based (1.5+)
  const [timeStarttime, setTimeStarttime] = useState("");
  const [timeStoptime, setTimeStoptime] = useState("");
  const [timeStartdate, setTimeStartdate] = useState("");
  const [timeStopdate, setTimeStopdate] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);

  // Packet modifications (1.5+)
  const [modifyDscp, setModifyDscp] = useState("");
  const [modifyMark, setModifyMark] = useState("");
  const [modifyTcpMss, setModifyTcpMss] = useState("");
  const [setConnectionMarkValue, setSetConnectionMarkValue] = useState("");
  const [setTtl, setSetTtl] = useState("");
  const [setHopLimit, setSetHopLimit] = useState("");

  const showIpPorts =
    firewallFeatureSupported(capabilities, "ip_matching") ||
    firewallFeatureSupported(capabilities, "port_matching");
  const showProtocol = firewallFeatureSupported(capabilities, "protocol_matching");
  const showAdvanced =
    firewallFeatureSupported(capabilities, "rate_limiting") ||
    firewallFeatureSupported(capabilities, "time_based") ||
    firewallFeatureSupported(capabilities, "packet_modifications") ||
    firewallFeatureSupported(capabilities, "mark_matching") ||
    firewallFeatureSupported(capabilities, "dscp_matching") ||
    firewallFeatureSupported(capabilities, "packet_type") ||
    firewallFeatureSupported(capabilities, "fragment_matching") ||
    firewallFeatureSupported(capabilities, "ipsec_matching") ||
    firewallFeatureSupported(capabilities, "ttl_matching");
  const showEthernetType = firewallFeatureSupported(capabilities, "ethernet_type_matching");
  const showRuleDescription = firewallFeatureSupported(capabilities, "rule_description");
  const showLogOptions = firewallFeatureSupported(capabilities, "log_options");
  const showTcp = firewallFeatureSupported(capabilities, "tcp_flags");
  const showMark = firewallFeatureSupported(capabilities, "mark_matching");
  const showDscp = firewallFeatureSupported(capabilities, "dscp_matching");
  const showPacket = firewallFeatureSupported(capabilities, "packet_type");
  const showPacketLength = firewallFeatureSupported(capabilities, "packet_length");
  const showFragment = firewallFeatureSupported(capabilities, "fragment_matching");
  const showIpsec = firewallFeatureSupported(capabilities, "ipsec_matching");
  const showTtl = firewallFeatureSupported(capabilities, "ttl_matching");
  const showTime = firewallFeatureSupported(capabilities, "time_based");
  const showMods = firewallFeatureSupported(capabilities, "packet_modifications");

  const resetForm = () => {
    setAction("accept");
    setDescription("");
    setLog(false);
    setDisabled(false);
    setSourceMac("");
    setDestinationMac("");
    setSourceAddress("");
    setSourceAddressNegate(false);
    setDestinationAddress("");
    setDestinationAddressNegate(false);
    setSourcePort("");
    setDestinationPort("");
    setVlanId("");
    setVlanPriorityValue("");
    setInboundInterface("");
    setOutboundInterface("");
    setInboundInterfaceGroup("");
    setOutboundInterfaceGroup("");
    setProtocol("");
    setEthernetType("");
    setVlanEthernetType("");
    setJumpTarget("");
    setQueue("");
    setIcmpType("");
    setIcmpCode("");
    setIcmpTypeName("");
    setTcpFlags([]);
    setTcpFlagsNot([]);
    setTcpMss("");
    setMark("");
    setConnectionMark("");
    setDscp("");
    setDscpExclude("");
    setPacketType("");
    setPacketLength("");
    setTtlEq("");
    setTtlGt("");
    setTtlLt("");
    setHopEq("");
    setHopGt("");
    setHopLt("");
    setFragmentFrag(false);
    setFragmentNonFrag(false);
    setIpsecIn(false);
    setIpsecOut(false);
    setIpsecNoneIn(false);
    setIpsecNoneOut(false);
    setLogLevel("");
    setLogGroup("");
    setLimitRateValue("");
    setLimitRateUnit("minute");
    setLimitBurst("");
    setTimeStarttime("");
    setTimeStoptime("");
    setTimeStartdate("");
    setTimeStopdate("");
    setSelectedWeekdays([]);
    setModifyDscp("");
    setModifyMark("");
    setModifyTcpMss("");
    setSetConnectionMarkValue("");
    setSetTtl("");
    setSetHopLimit("");
    setError(null);
  };

  const populateForm = (rule: BridgeRule) => {
    const newSourceAddr = parseAddress(rule.source_address);
    const newDestAddr = parseAddress(rule.destination_address);
    const newRate = parseRateLimit(rule.limit_rate);
    const newWeekdays = parseWeekdays(rule.time_weekdays);

    setAction(rule.action || "accept");
    setDescription(rule.description || "");
    setLog(rule.log);
    setDisabled(rule.disabled);
    setSourceMac(rule.source_mac || "");
    setDestinationMac(rule.destination_mac || "");
    setSourceAddress(newSourceAddr.address);
    setSourceAddressNegate(newSourceAddr.negate);
    setDestinationAddress(newDestAddr.address);
    setDestinationAddressNegate(newDestAddr.negate);
    setSourcePort(rule.source_port || "");
    setDestinationPort(rule.destination_port || "");
    setVlanId(rule.vlan_id || "");
    setVlanPriorityValue(rule.vlan_priority || "");
    setInboundInterface(rule.inbound_interface || "");
    setOutboundInterface(rule.outbound_interface || "");
    setInboundInterfaceGroup(rule.inbound_interface_group || "");
    setOutboundInterfaceGroup(rule.outbound_interface_group || "");
    setProtocol(rule.protocol || "");
    setEthernetType(rule.ethernet_type || "");
    setVlanEthernetType(rule.vlan_ethernet_type || "");
    setJumpTarget(rule.jump_target || "");
    setQueue(rule.queue || "");
    setIcmpType((rule.protocol === "icmpv6" ? rule.icmpv6_type : rule.icmp_type) || "");
    setIcmpCode((rule.protocol === "icmpv6" ? rule.icmpv6_code : rule.icmp_code) || "");
    setIcmpTypeName((rule.protocol === "icmpv6" ? rule.icmpv6_type_name : rule.icmp_type_name) || "");
    setTcpFlags(splitFlags(rule.tcp_flags));
    setTcpFlagsNot(splitFlags(rule.tcp_flags_not));
    setTcpMss(rule.tcp_mss || "");
    setMark(rule.mark || "");
    setConnectionMark(rule.connection_mark || "");
    setDscp(rule.dscp || "");
    setDscpExclude(rule.dscp_exclude || "");
    setPacketType(rule.packet_type || "");
    setPacketLength(rule.packet_length || "");
    setTtlEq(rule.ttl_eq || "");
    setTtlGt(rule.ttl_gt || "");
    setTtlLt(rule.ttl_lt || "");
    setHopEq(rule.hop_limit_eq || "");
    setHopGt(rule.hop_limit_gt || "");
    setHopLt(rule.hop_limit_lt || "");
    setFragmentFrag(rule.fragment_match_frag || false);
    setFragmentNonFrag(rule.fragment_match_non_frag || false);
    setIpsecIn(rule.ipsec_match_ipsec_in || false);
    setIpsecOut(rule.ipsec_match_ipsec_out || false);
    setIpsecNoneIn(rule.ipsec_match_none_in || false);
    setIpsecNoneOut(rule.ipsec_match_none_out || false);
    setLogLevel(rule.log_options_level || "");
    setLogGroup(rule.log_options_group || "");
    setLimitRateValue(newRate.value);
    setLimitRateUnit(newRate.unit);
    setLimitBurst(rule.limit_burst || "");
    setTimeStarttime(parseTimeForInput(rule.time_starttime));
    setTimeStoptime(parseTimeForInput(rule.time_stoptime));
    setTimeStartdate(rule.time_startdate || "");
    setTimeStopdate(rule.time_stopdate || "");
    setSelectedWeekdays(newWeekdays);
    setModifyDscp(rule.set_dscp || "");
    setModifyMark(rule.set_mark || "");
    setModifyTcpMss(rule.set_tcp_mss || "");
    setSetConnectionMarkValue(rule.set_connection_mark || "");
    setSetTtl(rule.set_ttl || "");
    setSetHopLimit(rule.set_hop_limit || "");
    setError(null);
  };

  // Toggle weekday selection
  const toggleWeekday = (day: string) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Build limit_rate string from value and unit
  const buildLimitRate = (): string | null => {
    if (!limitRateValue) return null;
    return `${limitRateValue}/${limitRateUnit}`;
  };

  // Build time string from input (add seconds if needed)
  const buildTimeString = (time: string): string | null => {
    if (!time) return null;
    // If format is HH:MM, append :00 for seconds
    if (time.length === 5) {
      return `${time}:00`;
    }
    return time;
  };

  // Build weekdays string
  const buildWeekdays = (): string | null => {
    if (selectedWeekdays.length === 0) return null;
    return selectedWeekdays.join(",");
  };

  // Build address with negation
  const buildAddress = (addr: string, negate: boolean): string | null => {
    if (!addr) return null;
    return negate ? `!${addr}` : addr;
  };

  const submitUpdate = async () => {
    if (!existing) return;
    setSaving(true);
    setError(null);

    try {
      const response = await bridgeFirewallService.updateRule(chain, existing.rule_number, existing, {
        action,
        description: description || null,
        log,
        disabled,
        source_mac: sourceMac || null,
        destination_mac: destinationMac || null,
        source_address: buildAddress(sourceAddress, sourceAddressNegate),
        destination_address: buildAddress(destinationAddress, destinationAddressNegate),
        source_port: sourcePort || null,
        destination_port: destinationPort || null,
        vlan_id: vlanId || null,
        vlan_priority: vlanPriority || null,
        vlan_ethernet_type: vlanEthernetType || null,
        inbound_interface: inboundInterface || null,
        inbound_interface_group: inboundInterfaceGroup || null,
        outbound_interface: outboundInterface || null,
        outbound_interface_group: outboundInterfaceGroup || null,
        protocol: protocol || null,
        ethernet_type: ethernetType || null,
        jump_target: jumpTarget || null,
        queue: queue || null,
        icmp_type: protocol === "icmp" ? icmpType || null : null,
        icmp_code: protocol === "icmp" ? icmpCode || null : null,
        icmp_type_name: protocol === "icmp" ? icmpTypeName || null : null,
        icmpv6_type: protocol === "icmpv6" ? icmpType || null : null,
        icmpv6_code: protocol === "icmpv6" ? icmpCode || null : null,
        icmpv6_type_name: protocol === "icmpv6" ? icmpTypeName || null : null,
        tcp_flags: protocol === "tcp" || protocol === "tcp_udp" ? tcpFlags.join(",") : "",
        tcp_flags_not: protocol === "tcp" || protocol === "tcp_udp" ? tcpFlagsNot.join(",") : "",
        tcp_mss: protocol === "tcp" || protocol === "tcp_udp" ? tcpMss || null : null,
        mark: mark || null,
        connection_mark: connectionMark || null,
        dscp: dscp || null,
        dscp_exclude: dscpExclude || null,
        packet_type: packetType || null,
        packet_length: packetLength || null,
        ttl_eq: ttlEq || null,
        ttl_gt: ttlGt || null,
        ttl_lt: ttlLt || null,
        hop_limit_eq: hopEq || null,
        hop_limit_gt: hopGt || null,
        hop_limit_lt: hopLt || null,
        fragment_match_frag: fragmentFrag,
        fragment_match_non_frag: fragmentNonFrag,
        ipsec_match_ipsec_in: ipsecIn,
        ipsec_match_ipsec_out: ipsecOut,
        ipsec_match_none_in: ipsecNoneIn,
        ipsec_match_none_out: ipsecNoneOut,
        log_options_level: logLevel || null,
        log_options_group: logGroup || null,
        limit_rate: buildLimitRate(),
        limit_burst: limitBurst || null,
        time_startdate: timeStartdate || null,
        time_stopdate: timeStopdate || null,
        time_starttime: buildTimeString(timeStarttime),
        time_stoptime: buildTimeString(timeStoptime),
        time_weekdays: buildWeekdays(),
        set_dscp: modifyDscp || null,
        set_mark: modifyMark || null,
        set_connection_mark: setConnectionMarkValue || null,
        set_ttl: setTtl || null,
        set_hop_limit: setHopLimit || null,
        set_tcp_mss: modifyTcpMss || null,
      });

      if (response.success) {
        onSuccess();
      } else {
        setError(response.error || t("ruleModal.updateFailed"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ruleModal.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (isEdit) {
      await submitUpdate();
      return;
    }

    const ruleNum = getNextRuleNumber();

    setSaving(true);
    setError(null);
    const tcpOn = protocol === "tcp" || protocol === "tcp_udp";

    try {
      const response = await bridgeFirewallService.createRule(chain, ruleNum, {
        action,
        description: description || undefined,
        log,
        disabled,
        source_mac: sourceMac || undefined,
        destination_mac: destinationMac || undefined,
        source_address: buildAddress(sourceAddress, sourceAddressNegate) || undefined,
        destination_address: buildAddress(destinationAddress, destinationAddressNegate) || undefined,
        source_port: sourcePort || undefined,
        destination_port: destinationPort || undefined,
        vlan_id: vlanId || undefined,
        vlan_priority: vlanPriority || undefined,
        vlan_ethernet_type: vlanEthernetType || undefined,
        inbound_interface: inboundInterface || undefined,
        inbound_interface_group: inboundInterfaceGroup || undefined,
        outbound_interface: outboundInterface || undefined,
        outbound_interface_group: outboundInterfaceGroup || undefined,
        protocol: protocol || undefined,
        ethernet_type: ethernetType || undefined,
        jump_target: jumpTarget || undefined,
        queue: queue || undefined,
        icmp_type: protocol === "icmp" ? icmpType || undefined : undefined,
        icmp_code: protocol === "icmp" ? icmpCode || undefined : undefined,
        icmp_type_name: protocol === "icmp" ? icmpTypeName || undefined : undefined,
        icmpv6_type: protocol === "icmpv6" ? icmpType || undefined : undefined,
        icmpv6_code: protocol === "icmpv6" ? icmpCode || undefined : undefined,
        icmpv6_type_name: protocol === "icmpv6" ? icmpTypeName || undefined : undefined,
        tcp_flags: tcpOn && tcpFlags.length > 0 ? tcpFlags.join(",") : undefined,
        tcp_flags_not: tcpOn && tcpFlagsNot.length > 0 ? tcpFlagsNot.join(",") : undefined,
        tcp_mss: tcpOn ? tcpMss || undefined : undefined,
        mark: mark || undefined,
        connection_mark: connectionMark || undefined,
        dscp: dscp || undefined,
        dscp_exclude: dscpExclude || undefined,
        packet_type: packetType || undefined,
        packet_length: packetLength || undefined,
        ttl_eq: ttlEq || undefined,
        ttl_gt: ttlGt || undefined,
        ttl_lt: ttlLt || undefined,
        hop_limit_eq: hopEq || undefined,
        hop_limit_gt: hopGt || undefined,
        hop_limit_lt: hopLt || undefined,
        fragment_match_frag: fragmentFrag || undefined,
        fragment_match_non_frag: fragmentNonFrag || undefined,
        ipsec_match_ipsec_in: ipsecIn || undefined,
        ipsec_match_ipsec_out: ipsecOut || undefined,
        ipsec_match_none_in: ipsecNoneIn || undefined,
        ipsec_match_none_out: ipsecNoneOut || undefined,
        log_options_level: logLevel || undefined,
        log_options_group: logGroup || undefined,
        limit_rate: buildLimitRate() || undefined,
        limit_burst: limitBurst || undefined,
        time_startdate: timeStartdate || undefined,
        time_stopdate: timeStopdate || undefined,
        time_starttime: buildTimeString(timeStarttime) || undefined,
        time_stoptime: buildTimeString(timeStoptime) || undefined,
        time_weekdays: buildWeekdays() || undefined,
        set_dscp: modifyDscp || undefined,
        set_mark: modifyMark || undefined,
        set_connection_mark: setConnectionMarkValue || undefined,
        set_ttl: setTtl || undefined,
        set_hop_limit: setHopLimit || undefined,
        set_tcp_mss: modifyTcpMss || undefined,
      });

      if (response.success) {
        resetForm();
        onSuccess();
      } else {
        setError(response.error || t("ruleModal.createFailed"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ruleModal.createFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("ruleModal.editTitle") : t("ruleModal.createTitle")}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("ruleModal.editDescription", { number: String(existing.rule_number), chain })
              : t("ruleModal.createDescription", { chain })}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="w-full flex-wrap h-auto">
            <TabsTrigger value="basic" className="flex-1">{t("ruleModal.tabs.basic")}</TabsTrigger>
            <TabsTrigger value="match" className="flex-1">{t("ruleModal.tabs.match")}</TabsTrigger>
            {showIpPorts && <TabsTrigger value="ip" className="flex-1">{t("ruleModal.tabs.ipPorts")}</TabsTrigger>}
            {showProtocol && <TabsTrigger value="protocol" className="flex-1">{t("ruleModal.tabs.protocol")}</TabsTrigger>}
            {showAdvanced && <TabsTrigger value="advanced" className="flex-1">{t("ruleModal.tabs.advanced")}</TabsTrigger>}
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="bg-muted/50 rounded-md px-3 py-2 mb-2">
              <p className="text-sm text-muted-foreground">
                {isEdit ? (
                  <>
                    {t.rich("ruleModal.editingRule", {
                      number: String(existing.rule_number),
                      num: (chunks) => <span className="font-mono font-semibold text-foreground">{chunks}</span>,
                    })}
                    <span className="sr-only">{t("ruleModal.ruleNumberFixed")}</span>
                  </>
                ) : (
                  <>
                    {t.rich("ruleModal.willBeCreatedAs", {
                      number: String(getNextRuleNumber()),
                      num: (chunks) => <span className="font-mono font-semibold text-foreground">{chunks}</span>,
                    })}
                  </>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">{t("ruleModal.actionRequired")}</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accept">{t("actionOptions.accept")}</SelectItem>
                  <SelectItem value="drop">{t("actionOptions.drop")}</SelectItem>
                  {firewallActionSupported(capabilities, "continue", chain) && (
                    <SelectItem value="continue">{t("actionOptions.continue")}</SelectItem>
                  )}
                  {firewallActionSupported(capabilities, "jump", chain) && (
                    <SelectItem value="jump">{t("actionOptions.jump")}</SelectItem>
                  )}
                  {firewallActionSupported(capabilities, "return", chain) && (
                    <SelectItem value="return">{t("actionOptions.return")}</SelectItem>
                  )}
                  {firewallActionSupported(capabilities, "queue", chain) && (
                    <SelectItem value="queue">{t("actionOptions.queue")}</SelectItem>
                  )}
                  {firewallActionSupported(capabilities, "notrack", chain) && (
                    <SelectItem value="notrack">{t("actionOptions.notrack")}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {action === "jump" && (
              <div className="space-y-2">
                <Label htmlFor="jumpTarget">{t("ruleModal.jumpTarget")}</Label>
                <Input
                  id="jumpTarget"
                  placeholder={t("ruleModal.jumpTargetPlaceholder")}
                  value={jumpTarget}
                  onChange={(e) => setJumpTarget(e.target.value)}
                />
              </div>
            )}

            {action === "queue" && firewallActionSupported(capabilities, "queue", chain) && (
              <div className="space-y-2">
                <Label htmlFor="queue">{t("ruleModal.queueNumber")}</Label>
                <Input
                  id="queue"
                  placeholder={t("ruleModal.queuePlaceholder")}
                  value={queue}
                  onChange={(e) => setQueue(e.target.value)}
                />
              </div>
            )}

            {showRuleDescription && (
              <div className="space-y-2">
                <Label htmlFor="description">{tc("description")}</Label>
                <Input
                  id="description"
                  placeholder={t("ruleModal.descriptionPlaceholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="log"
                  checked={log}
                  onCheckedChange={(c) => setLog(c === true)}
                />
                <Label htmlFor="log" className="font-normal">{t("ruleModal.enableLogging")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="disabled"
                  checked={disabled}
                  onCheckedChange={(c) => setDisabled(c === true)}
                />
                <Label htmlFor="disabled" className="font-normal">{isEdit ? tc("disabled") : t("ruleModal.createDisabled")}</Label>
              </div>
            </div>

            {showLogOptions && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logLevel">{t("ruleModal.logLevel")}</Label>
                  <Select value={logLevel || "_any_"} onValueChange={(v) => setLogLevel(v === "_any_" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder={t("any")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_any_">{t("any")}</SelectItem>
                      {(logLevel && !(capabilities?.log_level_values ?? []).includes(logLevel)
                        ? [logLevel, ...(capabilities?.log_level_values ?? [])]
                        : capabilities?.log_level_values ?? []
                      ).map((level) => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logGroup">{t("ruleModal.logGroup")}</Label>
                  <Input id="logGroup" value={logGroup} onChange={(e) => setLogGroup(e.target.value)} />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Match Tab - Layer 2 matching */}
          <TabsContent value="match" className="space-y-4 mt-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">{t("ruleModal.macAddress")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sourceMac">{t("ruleModal.sourceMac")}</Label>
                  <Input
                    id="sourceMac"
                    placeholder={t("ruleModal.macPlaceholder")}
                    value={sourceMac}
                    onChange={(e) => setSourceMac(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destinationMac">{t("ruleModal.destinationMac")}</Label>
                  <Input
                    id="destinationMac"
                    placeholder={t("ruleModal.macPlaceholder")}
                    value={destinationMac}
                    onChange={(e) => setDestinationMac(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">{t("ruleModal.vlan")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vlanId">{t("ruleModal.vlanId")}</Label>
                  <Input
                    id="vlanId"
                    type="number"
                    placeholder="1-4094"
                    value={vlanId}
                    onChange={(e) => setVlanId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vlanPriority">{t("ruleModal.vlanPriority")}</Label>
                  <Input
                    id="vlanPriority"
                    type="number"
                    placeholder="0-7"
                    value={vlanPriority}
                    onChange={(e) => setVlanPriorityValue(e.target.value)}
                  />
                </div>
                {showEthernetType && (
                  <div className="space-y-2">
                    <Label htmlFor="vlanEthernetType">{t("ruleModal.vlanEthernetType")}</Label>
                    <Select value={vlanEthernetType || "_any_"} onValueChange={(v) => setVlanEthernetType(v === "_any_" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder={t("any")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_any_">{t("any")}</SelectItem>
                        {(vlanEthernetType && !(capabilities?.ethernet_type_values ?? []).includes(vlanEthernetType)
                          ? [vlanEthernetType, ...(capabilities?.ethernet_type_values ?? [])]
                          : capabilities?.ethernet_type_values ?? []
                        ).map((value) => (
                          <SelectItem key={value} value={value}>{value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">{t("ruleModal.interface")}</h4>
              {loadingInterfaces ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{t("ruleModal.loadingInterfaces")}</span>
                </div>
              ) : (
                <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inboundInterface">{t("ruleModal.inboundInterface")}</Label>
                    <InterfaceSelect
                      value={inboundInterface || "_none_"}
                      onValueChange={(v) => setInboundInterface(v === "_none_" ? "" : v)}
                      interfaces={availableInterfaces.map((i) => ({ name: i.name, type: "", description: i.description ?? null }))}
                      noneOption={{ label: tc("none"), value: "_none_" }}
                      placeholder={tc("none")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="outboundInterface">{t("ruleModal.outboundInterface")}</Label>
                    <InterfaceSelect
                      value={outboundInterface || "_none_"}
                      onValueChange={(v) => setOutboundInterface(v === "_none_" ? "" : v)}
                      interfaces={availableInterfaces.map((i) => ({ name: i.name, type: "", description: i.description ?? null }))}
                      noneOption={{ label: tc("none"), value: "_none_" }}
                      placeholder={tc("none")}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inboundInterfaceGroup">{t("ruleModal.inboundInterfaceGroup")}</Label>
                    <Select value={inboundInterfaceGroup || "_any_"} onValueChange={(v) => setInboundInterfaceGroup(v === "_any_" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder={t("any")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_any_">{t("any")}</SelectItem>
                        {(inboundInterfaceGroup && !interfaceGroups.includes(inboundInterfaceGroup)
                          ? [inboundInterfaceGroup, ...interfaceGroups]
                          : interfaceGroups
                        ).map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="outboundInterfaceGroup">{t("ruleModal.outboundInterfaceGroup")}</Label>
                    <Select value={outboundInterfaceGroup || "_any_"} onValueChange={(v) => setOutboundInterfaceGroup(v === "_any_" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder={t("any")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_any_">{t("any")}</SelectItem>
                        {(outboundInterfaceGroup && !interfaceGroups.includes(outboundInterfaceGroup)
                          ? [outboundInterfaceGroup, ...interfaceGroups]
                          : interfaceGroups
                        ).map((name) => (
                          <SelectItem key={`out-${name}`} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                </>
              )}
            </div>

            {showEthernetType && (
              <div className="space-y-2">
                <Label htmlFor="ethernetType">{t("ruleModal.ethernetType")}</Label>
                <Select value={ethernetType || "_any_"} onValueChange={(v) => setEthernetType(v === "_any_" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("any")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_any_">{t("any")}</SelectItem>
                    {(ethernetType && !(capabilities?.ethernet_type_values ?? []).includes(ethernetType)
                      ? [ethernetType, ...(capabilities?.ethernet_type_values ?? [])]
                      : capabilities?.ethernet_type_values ?? []
                    ).map((value) => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>

          {showIpPorts && (
            <TabsContent value="ip" className="space-y-4 mt-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">{t("ruleModal.source")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sourceAddress">{t("ruleModal.ipAddressNetwork")}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sourceAddress"
                        placeholder={t("ruleModal.ipPlaceholder")}
                        value={sourceAddress}
                        onChange={(e) => setSourceAddress(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Checkbox
                        id="sourceAddressNegate"
                        checked={sourceAddressNegate}
                        onCheckedChange={(c) => setSourceAddressNegate(c === true)}
                      />
                      <Label htmlFor="sourceAddressNegate" className="text-xs font-normal text-muted-foreground">
                        {t("ruleModal.negate")}
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sourcePort">{t("ruleModal.ports")}</Label>
                    <Input
                      id="sourcePort"
                      placeholder={t("ruleModal.portPlaceholder")}
                      value={sourcePort}
                      onChange={(e) => setSourcePort(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">{t("ruleModal.destination")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="destinationAddress">{t("ruleModal.ipAddressNetwork")}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="destinationAddress"
                        placeholder={t("ruleModal.ipPlaceholder")}
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Checkbox
                        id="destinationAddressNegate"
                        checked={destinationAddressNegate}
                        onCheckedChange={(c) => setDestinationAddressNegate(c === true)}
                      />
                      <Label htmlFor="destinationAddressNegate" className="text-xs font-normal text-muted-foreground">
                        {t("ruleModal.negate")}
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destinationPort">{t("ruleModal.ports")}</Label>
                    <Input
                      id="destinationPort"
                      placeholder={t("ruleModal.portPlaceholder")}
                      value={destinationPort}
                      onChange={(e) => setDestinationPort(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

          {showProtocol && (
            <TabsContent value="protocol" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="protocol">{t("ruleModal.protocol")}</Label>
                <Select value={protocol || "_any_"} onValueChange={(v) => setProtocol(v === "_any_" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("any")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_any_">{t("any")}</SelectItem>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                    <SelectItem value="icmp">ICMP</SelectItem>
                    <SelectItem value="icmpv6">ICMPv6</SelectItem>
                    <SelectItem value="tcp_udp">TCP+UDP</SelectItem>
                    <SelectItem value="gre">GRE</SelectItem>
                    <SelectItem value="esp">ESP</SelectItem>
                    <SelectItem value="ah">AH</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showTcp && (protocol === "tcp" || protocol === "tcp_udp") && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("ruleModal.tcpFlags")}</Label>
                    <div className="flex flex-wrap gap-4">
                      {(capabilities?.tcp_flag_names ?? []).map((flag) => (
                        <div key={flag} className="flex items-center gap-2">
                          <Checkbox
                            id={`tcp-${flag}`}
                            checked={tcpFlags.includes(flag)}
                            onCheckedChange={(checked) => setTcpFlags((prev) => checked === true ? (prev.includes(flag) ? prev : [...prev, flag]) : prev.filter((item) => item !== flag))}
                          />
                          <Label htmlFor={`tcp-${flag}`} className="font-normal">{flag}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("ruleModal.tcpFlagsNot")}</Label>
                    <div className="flex flex-wrap gap-4">
                      {(capabilities?.tcp_flag_names ?? []).map((flag) => (
                        <div key={`not-${flag}`} className="flex items-center gap-2">
                          <Checkbox
                            id={`tcp-not-${flag}`}
                            checked={tcpFlagsNot.includes(flag)}
                            onCheckedChange={(checked) => setTcpFlagsNot((prev) => checked === true ? (prev.includes(flag) ? prev : [...prev, flag]) : prev.filter((item) => item !== flag))}
                          />
                          <Label htmlFor={`tcp-not-${flag}`} className="font-normal">{flag}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tcpMss">{t("ruleModal.tcpMss")}</Label>
                    <Input id="tcpMss" value={tcpMss} onChange={(e) => setTcpMss(e.target.value)} />
                  </div>
                </div>
              )}

              {(protocol === "icmp" || protocol === "icmpv6") && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="icmpTypeName">{t("ruleModal.icmpTypeName")}</Label>
                    <Select value={icmpTypeName || "_any_"} onValueChange={(v) => setIcmpTypeName(v === "_any_" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("any")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_any_">{t("any")}</SelectItem>
                        {((protocol === "icmpv6" ? capabilities?.icmpv6_type_names : capabilities?.icmp_type_names) ?? [])
                          .concat(icmpTypeName && !((protocol === "icmpv6" ? capabilities?.icmpv6_type_names : capabilities?.icmp_type_names) ?? []).includes(icmpTypeName) ? [icmpTypeName] : [])
                          .filter((value, index, list) => list.indexOf(value) === index)
                          .map((value) => (
                            <SelectItem key={value} value={value}>{value}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="icmpType">{t("ruleModal.icmpTypeNumeric")}</Label>
                      <Input
                        id="icmpType"
                        type="number"
                        placeholder="0-255"
                        value={icmpType}
                        onChange={(e) => setIcmpType(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="icmpCode">{t("ruleModal.icmpCode")}</Label>
                      <Input
                        id="icmpCode"
                        type="number"
                        placeholder="0-255"
                        value={icmpCode}
                        onChange={(e) => setIcmpCode(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          )}

          {showAdvanced && (
            <TabsContent value="advanced" className="space-y-4 mt-4">
              {(showMark || showDscp || showPacket || showPacketLength || showTtl || showFragment || showIpsec) && (
                <div className="grid grid-cols-2 gap-4">
                  {showMark && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="mark">{t("ruleModal.mark")}</Label>
                        <Input id="mark" value={mark} onChange={(e) => setMark(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="connectionMark">{t("ruleModal.connectionMark")}</Label>
                        <Input id="connectionMark" value={connectionMark} onChange={(e) => setConnectionMark(e.target.value)} />
                      </div>
                    </>
                  )}
                  {showDscp && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="dscp">{t("ruleModal.dscp")}</Label>
                        <Input id="dscp" value={dscp} onChange={(e) => setDscp(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dscpExclude">{t("ruleModal.dscpExclude")}</Label>
                        <Input id="dscpExclude" value={dscpExclude} onChange={(e) => setDscpExclude(e.target.value)} />
                      </div>
                    </>
                  )}
                  {showPacket && (
                    <div className="space-y-2">
                      <Label htmlFor="packetType">{t("ruleModal.packetType")}</Label>
                      <Select value={packetType || "_any_"} onValueChange={(v) => setPacketType(v === "_any_" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder={t("any")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_any_">{t("any")}</SelectItem>
                          {(packetType && !(capabilities?.packet_type_values ?? []).includes(packetType)
                            ? [packetType, ...(capabilities?.packet_type_values ?? [])]
                            : capabilities?.packet_type_values ?? []
                          ).map((value) => (
                            <SelectItem key={value} value={value}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {showPacketLength && (
                    <div className="space-y-2">
                      <Label htmlFor="packetLength">{t("ruleModal.packetLength")}</Label>
                      <Input id="packetLength" value={packetLength} onChange={(e) => setPacketLength(e.target.value)} />
                    </div>
                  )}
                  {showTtl && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="ttlEq">{t("ruleModal.ttlEq")}</Label>
                        <Input id="ttlEq" value={ttlEq} onChange={(e) => setTtlEq(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ttlGt">{t("ruleModal.ttlGt")}</Label>
                        <Input id="ttlGt" value={ttlGt} onChange={(e) => setTtlGt(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ttlLt">{t("ruleModal.ttlLt")}</Label>
                        <Input id="ttlLt" value={ttlLt} onChange={(e) => setTtlLt(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hopEq">{t("ruleModal.hopEq")}</Label>
                        <Input id="hopEq" value={hopEq} onChange={(e) => setHopEq(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hopGt">{t("ruleModal.hopGt")}</Label>
                        <Input id="hopGt" value={hopGt} onChange={(e) => setHopGt(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hopLt">{t("ruleModal.hopLt")}</Label>
                        <Input id="hopLt" value={hopLt} onChange={(e) => setHopLt(e.target.value)} />
                      </div>
                    </>
                  )}
                  {showFragment && (
                    <>
                      <div className="flex items-center gap-2">
                        <Checkbox id="fragmentFrag" checked={fragmentFrag} onCheckedChange={(c) => setFragmentFrag(c === true)} />
                        <Label htmlFor="fragmentFrag" className="font-normal">{t("ruleModal.fragmentFrag")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="fragmentNonFrag" checked={fragmentNonFrag} onCheckedChange={(c) => setFragmentNonFrag(c === true)} />
                        <Label htmlFor="fragmentNonFrag" className="font-normal">{t("ruleModal.fragmentNonFrag")}</Label>
                      </div>
                    </>
                  )}
                  {showIpsec && (
                    <>
                      <div className="flex items-center gap-2">
                        <Checkbox id="ipsecIn" checked={ipsecIn} onCheckedChange={(c) => setIpsecIn(c === true)} />
                        <Label htmlFor="ipsecIn" className="font-normal">{t("ruleModal.ipsecIn")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="ipsecOut" checked={ipsecOut} onCheckedChange={(c) => setIpsecOut(c === true)} />
                        <Label htmlFor="ipsecOut" className="font-normal">{t("ruleModal.ipsecOut")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="ipsecNoneIn" checked={ipsecNoneIn} onCheckedChange={(c) => setIpsecNoneIn(c === true)} />
                        <Label htmlFor="ipsecNoneIn" className="font-normal">{t("ruleModal.ipsecNoneIn")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="ipsecNoneOut" checked={ipsecNoneOut} onCheckedChange={(c) => setIpsecNoneOut(c === true)} />
                        <Label htmlFor="ipsecNoneOut" className="font-normal">{t("ruleModal.ipsecNoneOut")}</Label>
                      </div>
                    </>
                  )}
                </div>
              )}
              {/* Rate Limiting */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">{t("ruleModal.rateLimiting")}</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="limitRate">{t("ruleModal.rateLimit")}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="limitRateValue"
                        type="number"
                        placeholder={t("ruleModal.numberPlaceholder")}
                        min="1"
                        value={limitRateValue}
                        onChange={(e) => setLimitRateValue(e.target.value)}
                        className="flex-1"
                      />
                      <Select value={limitRateUnit} onValueChange={setLimitRateUnit}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RATE_UNITS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {t(`ruleModal.rateUnits.${unit.value}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="limitBurst">{t("ruleModal.burstSize")}</Label>
                    <Input
                      id="limitBurst"
                      type="number"
                      placeholder="5"
                      min="1"
                      value={limitBurst}
                      onChange={(e) => setLimitBurst(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Time-based Rules */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">{t("ruleModal.timeBasedRules")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeStarttime">{t("ruleModal.startTime")}</Label>
                    <Input
                      id="timeStarttime"
                      type="time"
                      value={timeStarttime}
                      onChange={(e) => setTimeStarttime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeStoptime">{t("ruleModal.stopTime")}</Label>
                    <Input
                      id="timeStoptime"
                      type="time"
                      value={timeStoptime}
                      onChange={(e) => setTimeStoptime(e.target.value)}
                    />
                  </div>
                  {showTime && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="timeStartdate">{t("ruleModal.startDate")}</Label>
                        <Input id="timeStartdate" type="date" value={timeStartdate} onChange={(e) => setTimeStartdate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timeStopdate">{t("ruleModal.stopDate")}</Label>
                        <Input id="timeStopdate" type="date" value={timeStopdate} onChange={(e) => setTimeStopdate(e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t("ruleModal.activeDays")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={selectedWeekdays.includes(day.value) ? "default" : "outline"}
                        size="sm"
                        className="w-12"
                        onClick={() => toggleWeekday(day.value)}
                      >
                        {t(`ruleModal.weekdays.${day.value}`)}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedWeekdays.length === 0
                      ? t("ruleModal.noDaysSelected")
                      : selectedWeekdays.length === 7
                        ? t("ruleModal.activeEveryDay")
                        : t("ruleModal.activeOn", { days: selectedWeekdays.join(", ") })}
                  </p>
                </div>
              </div>

              {/* Packet Modifications */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">{t("ruleModal.packetModifications")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="modifyDscp">{t("ruleModal.setDscp")}</Label>
                    <Input
                      id="modifyDscp"
                      type="number"
                      placeholder="0-63"
                      min="0"
                      max="63"
                      value={modifyDscp}
                      onChange={(e) => setModifyDscp(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modifyMark">{t("ruleModal.setMark")}</Label>
                    <Input
                      id="modifyMark"
                      placeholder={t("ruleModal.markPlaceholder")}
                      value={modifyMark}
                      onChange={(e) => setModifyMark(e.target.value)}
                    />
                  </div>
                  {showMods && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="setConnectionMark">{t("ruleModal.setConnectionMark")}</Label>
                        <Input id="setConnectionMark" value={setConnectionMarkValue} onChange={(e) => setSetConnectionMarkValue(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="setTtl">{t("ruleModal.setTtl")}</Label>
                        <Input id="setTtl" value={setTtl} onChange={(e) => setSetTtl(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="setHopLimit">{t("ruleModal.setHopLimit")}</Label>
                        <Input id="setHopLimit" value={setHopLimit} onChange={(e) => setSetHopLimit(e.target.value)} />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="modifyTcpMss">{t("ruleModal.setTcpMss")}</Label>
                    <Select
                      value={modifyTcpMss || "_none_"}
                      onValueChange={(v) => setModifyTcpMss(v === "_none_" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={tc("none")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">{tc("none")}</SelectItem>
                        <SelectItem value="clamp-mss-to-pmtu">{t("ruleModal.mssClamp")}</SelectItem>
                        <SelectItem value="1460">{t("ruleModal.mss1460")}</SelectItem>
                        <SelectItem value="1440">1440 (PPPoE)</SelectItem>
                        <SelectItem value="1400">{t("ruleModal.mss1400")}</SelectItem>
                        <SelectItem value="1360">{t("ruleModal.mss1360")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                {isEdit ? tc("saving") : tc("creating")}
              </>
            ) : isEdit ? (
              tc("saveChanges")
            ) : (
              t("ruleModal.createRule")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
