"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AlertCircle, ArrowRight, ChevronDown, RefreshCw, Trash2 } from "lucide-react";
import {
  firewallIPv4Service,
  type FirewallRule,
  type FirewallCapabilitiesResponse,
} from "@/lib/api/firewall-ipv4";
import { firewallIPv6Service } from "@/lib/api/firewall-ipv6";
import { firewallSeparatorsService } from "@/lib/api/firewall-separators";
import { firewallGroupsService, type FirewallGroup } from "@/lib/api/firewall-groups";
import { flowtablesService, type Flowtable } from "@/lib/api/firewall-flowtables";
import { CountryMultiSelect } from "../CountryMultiSelect";
import {
  getIPAddressError,
  getMACAddressError,
  getPortError,
} from "@/lib/validators/firewall";
import type { FirewallZone } from "@/lib/api/types/firewall-zones";
import { resolveChainName } from "@/lib/api/firewall-zones";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface ZoneRulePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  mode: "create" | "edit";
  rule?: FirewallRule;
  cloneRule?: FirewallRule;
  /** Pre-filled when a specific zone pair is selected in the matrix */
  sourceZone?: string;
  destZone?: string;
  chainName?: string;
  ipVersion: "ipv4" | "ipv6";
  zones: FirewallZone[];
  /** Rules currently in the target chain (for next-rule-number calculation) */
  existingRules: FirewallRule[];
  /** Callback to get fresh chain rules (used after zone selection in create mode) */
  getChainRules: (chainName: string, ipVersion: "ipv4" | "ipv6") => FirewallRule[];
  capabilities?: FirewallCapabilitiesResponse | null;
  canEdit: boolean;
}

type SrcMode = "any" | "address" | "group" | "geoip" | "mac" | "fqdn";
type DstMode = "any" | "address" | "group" | "geoip" | "fqdn" | "mac";
type PortMode = "any" | "port" | "group";

const TCP_FLAGS = ["syn", "ack", "fin", "rst", "psh", "urg", "ecn", "cwr"] as const;

const IPV4_PROTOCOLS = [
  "all", "tcp", "udp", "tcp_udp", "icmp", "icmpv6", "igmp", "esp", "ah",
  "gre", "pim", "ospf", "sctp", "bgp", "rsvp",
];

const IPV6_PROTOCOLS = [
  "all", "tcp", "udp", "tcp_udp", "icmpv6", "ipv6-icmp", "esp", "ah", "gre",
  "sctp", "bgp", "ospf",
];

const ICMP_TYPES_V4 = [
  "any", "echo-reply", "destination-unreachable", "source-quench",
  "redirect", "echo-request", "router-advertisement", "router-solicitation",
  "time-exceeded", "parameter-problem", "timestamp-request",
  "timestamp-reply", "address-mask-request", "address-mask-reply",
];

const ICMP_TYPES_V6 = [
  "any", "destination-unreachable", "packet-too-big", "time-exceeded",
  "parameter-problem", "echo-request", "echo-reply",
  "multicast-listener-query", "multicast-listener-report",
  "multicast-listener-done", "router-solicitation", "router-advertisement",
  "neighbor-solicitation", "neighbor-advertisement",
];

// ============================================================================
// Helpers
// ============================================================================

function getNextRuleNumber(rules: FirewallRule[]): number {
  if (rules.length === 0) return 10;
  return Math.max(...rules.map((r) => r.rule_number)) + 1;
}

// ============================================================================
// Component
// ============================================================================

export function ZoneRulePanel({
  open,
  onOpenChange,
  onSuccess,
  mode,
  rule,
  cloneRule,
  sourceZone,
  destZone,
  chainName: chainNameProp,
  ipVersion,
  zones,
  existingRules,
  getChainRules,
  capabilities,
  canEdit,
}: ZoneRulePanelProps) {
  const t = useTranslations("firewallZones");
  const tc = useTranslations("common");
  // Zone pair selection (only used in create mode when no pair pre-selected)
  const [selectedSrc, setSelectedSrc] = useState(sourceZone ?? "");
  const [selectedDst, setSelectedDst] = useState(destZone ?? "");

  // Resolved chain (from prop or derived from zone selection)
  const resolvedChain = chainNameProp
    ?? resolveChainName(selectedSrc, selectedDst, ipVersion, zones);

  // Current rules in the target chain (for rule number calculation)
  const [chainRules, setChainRules] = useState<FirewallRule[]>(existingRules);

  // ── Basic fields ──────────────────────────────────────────────────────────
  const [action, setAction] = useState("accept");
  const [jumpTarget, setJumpTarget] = useState("");
  const [offloadTarget, setOffloadTarget] = useState("");
  const [ruleProtocol, setRuleProtocol] = useState("all");
  const [protocolInvert, setProtocolInvert] = useState(false);
  const [description, setDescription] = useState("");
  const [log, setLog] = useState(false);
  const [disable, setDisable] = useState(false);

  // ── Source ────────────────────────────────────────────────────────────────
  const [srcMode, setSrcMode] = useState<SrcMode>("any");
  const [srcAddress, setSrcAddress] = useState("");
  const [srcAddressInvert, setSrcAddressInvert] = useState(false);
  const [srcAddressError, setSrcAddressError] = useState<string | null>(null);
  const [srcGroupType, setSrcGroupType] = useState("address-group");
  const [srcGroupName, setSrcGroupName] = useState("");
  const [srcGroupInvert, setSrcGroupInvert] = useState(false);
  const [srcGeoip, setSrcGeoip] = useState<string[]>([]);
  const [srcGeoipInverse, setSrcGeoipInverse] = useState(false);
  const [srcMac, setSrcMac] = useState("");
  const [srcMacError, setSrcMacError] = useState<string | null>(null);
  const [srcPortMode, setSrcPortMode] = useState<PortMode>("any");
  const [srcPort, setSrcPort] = useState("");
  const [srcPortGroup, setSrcPortGroup] = useState("");
  const [srcPortGroupInvert, setSrcPortGroupInvert] = useState(false);
  const [srcPortError, setSrcPortError] = useState<string | null>(null);

  // ── Destination ───────────────────────────────────────────────────────────
  const [dstMode, setDstMode] = useState<DstMode>("any");
  const [dstAddress, setDstAddress] = useState("");
  const [dstAddressInvert, setDstAddressInvert] = useState(false);
  const [dstAddressError, setDstAddressError] = useState<string | null>(null);
  const [dstGroupType, setDstGroupType] = useState("address-group");
  const [dstGroupName, setDstGroupName] = useState("");
  const [dstGroupInvert, setDstGroupInvert] = useState(false);
  const [dstGeoip, setDstGeoip] = useState<string[]>([]);
  const [dstGeoipInverse, setDstGeoipInverse] = useState(false);
  const [dstPortMode, setDstPortMode] = useState<PortMode>("any");
  const [dstPort, setDstPort] = useState("");
  const [dstPortGroup, setDstPortGroup] = useState("");
  const [dstPortGroupInvert, setDstPortGroupInvert] = useState(false);
  const [dstPortError, setDstPortError] = useState<string | null>(null);

  // ── State matching ────────────────────────────────────────────────────────
  const [stateEstablished, setStateEstablished] = useState(false);
  const [stateNew, setStateNew] = useState(false);
  const [stateRelated, setStateRelated] = useState(false);
  const [stateInvalid, setStateInvalid] = useState(false);

  // ── Advanced ──────────────────────────────────────────────────────────────
  const [tcpFlags, setTcpFlags] = useState<Record<string, "disabled" | "enabled" | "not">>(
    Object.fromEntries(TCP_FLAGS.map((f) => [f, "disabled"]))
  );
  const [icmpTypeName, setIcmpTypeName] = useState("");
  const [dscp, setDscp] = useState("");
  const [mark, setMark] = useState("");
  const [ttl, setTtl] = useState("");

  // ── Source/Dest extras ───────────────────────────────────────────────────
  const [srcFqdn, setSrcFqdn] = useState("");
  const [srcAddressMask, setSrcAddressMask] = useState("");
  const [dstFqdn, setDstFqdn] = useState("");
  const [dstAddressMask, setDstAddressMask] = useState("");
  const [dstMacAddress, setDstMacAddress] = useState("");

  // ── Matching ─────────────────────────────────────────────────────────────
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

  // ── Limits & Time ────────────────────────────────────────────────────────
  const [limitRate, setLimitRate] = useState("");
  const [limitBurst, setLimitBurst] = useState("");
  const [recentCount, setRecentCount] = useState("");
  const [recentTime, setRecentTime] = useState("");
  const [timeStartdate, setTimeStartdate] = useState("");
  const [timeStarttime, setTimeStarttime] = useState("");
  const [timeStopdate, setTimeStopdate] = useState("");
  const [timeStoptime, setTimeStoptime] = useState("");
  const [timeWeekdays, setTimeWeekdays] = useState("");

  // ── Actions & Modifications ──────────────────────────────────────────────
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

  // ── Collapsible section state ────────────────────────────────────────────
  const [matchingOpen, setMatchingOpen] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  // ── Auxiliary data ────────────────────────────────────────────────────────
  const [groups, setGroups] = useState<FirewallGroup[]>([]);
  const [customChains, setCustomChains] = useState<string[]>([]);
  const [flowtables, setFlowtables] = useState<Flowtable[]>([]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Protocol auto-adjustment when ports are used ──────────────────────────
  useEffect(() => {
    const hasPort = srcPort.trim() || dstPort.trim() || srcPortGroup.trim() || dstPortGroup.trim();
    const portOk = ["tcp", "udp", "tcp_udp"].includes(ruleProtocol);
    if (hasPort && !portOk) setRuleProtocol("tcp_udp");
  }, [srcPort, dstPort, srcPortGroup, dstPortGroup, ruleProtocol]);

  // ── Load auxiliary data & rule data when panel opens ─────────────────────
  const resetForm = useCallback(() => {
    setAction("accept");
    setJumpTarget("");
    setOffloadTarget("");
    setRuleProtocol("all");
    setProtocolInvert(false);
    setDescription("");
    setLog(false);
    setDisable(false);
    setSrcMode("any");
    setSrcAddress("");
    setSrcAddressInvert(false);
    setSrcAddressError(null);
    setSrcGroupType("address-group");
    setSrcGroupName("");
    setSrcGroupInvert(false);
    setSrcGeoip([]);
    setSrcGeoipInverse(false);
    setSrcMac("");
    setSrcMacError(null);
    setSrcPortMode("any");
    setSrcPort("");
    setSrcPortGroup("");
    setSrcPortGroupInvert(false);
    setSrcPortError(null);
    setDstMode("any");
    setDstAddress("");
    setDstAddressInvert(false);
    setDstAddressError(null);
    setDstGroupType("address-group");
    setDstGroupName("");
    setDstGroupInvert(false);
    setDstGeoip([]);
    setDstGeoipInverse(false);
    setDstPortMode("any");
    setDstPort("");
    setDstPortGroup("");
    setDstPortGroupInvert(false);
    setDstPortError(null);
    setStateEstablished(false);
    setStateNew(false);
    setStateRelated(false);
    setStateInvalid(false);
    setTcpFlags(Object.fromEntries(TCP_FLAGS.map((f) => [f, "disabled"])));
    setIcmpTypeName("");
    setDscp("");
    setMark("");
    setTtl("");
    // Source/Dest extras
    setSrcFqdn("");
    setSrcAddressMask("");
    setDstFqdn("");
    setDstAddressMask("");
    setDstMacAddress("");
    // Matching
    setConnectionMark("");
    setConnectionStatusNat("");
    setConntrackHelper("");
    setDscpMatch("");
    setDscpExclude("");
    setFragmentMatchFrag(false);
    setFragmentMatchNonFrag(false);
    setGreKey("");
    setGreVersion("");
    setGreInnerProto("");
    setGreFlags({});
    setIpsecMode("none");
    setIpsecInbound("none");
    setIpsecOutbound("none");
    setMarkMatch("");
    setPacketLength("");
    setPacketLengthExclude("");
    setPacketType("");
    setTcpMssMatch("");
    setTtlEq("");
    setTtlGt("");
    setTtlLt("");
    // Limits & Time
    setLimitRate("");
    setLimitBurst("");
    setRecentCount("");
    setRecentTime("");
    setTimeStartdate("");
    setTimeStarttime("");
    setTimeStopdate("");
    setTimeStoptime("");
    setTimeWeekdays("");
    // Actions
    setLogOptionsGroup("");
    setLogOptionsLevel("");
    setLogOptionsQueueThreshold("");
    setLogOptionsSnapshotLength("");
    setQueueNumber("");
    setQueueOptions("");
    setSynproxyTcpMss("");
    setSynproxyTcpWindowScale("");
    setModSetConnectionMark("");
    setModSetTcpMss("");
    setAddAddrToGroupSrcGroup("");
    setAddAddrToGroupSrcTimeout("");
    setAddAddrToGroupDstGroup("");
    setAddAddrToGroupDstTimeout("");
    // Collapsibles
    setMatchingOpen(false);
    setLimitsOpen(false);
    setActionsOpen(false);
    setError(null);
    setConfirmingDelete(false);
  }, []);

  const loadRuleData = useCallback((r: FirewallRule) => {
    // Basic
    setAction(r.action ?? "accept");
    setJumpTarget(r.jump_target ?? "");
    setOffloadTarget(r.offload_target ?? "");
    const proto = r.protocol ?? "";
    if (proto.startsWith("!")) {
      setRuleProtocol(proto.substring(1));
      setProtocolInvert(true);
    } else {
      setRuleProtocol(proto || "all");
      setProtocolInvert(false);
    }
    setDescription(r.description ?? "");
    setLog(r.log);
    setDisable(r.disable);

    // Source
    const src = r.source;
    // Non-port group entries determine the source match mode
    const srcNonPortGroup = src?.group
      ? Object.entries(src.group).filter(([k]) => k !== "port-group")
      : [];
    if (r.source_fqdn) {
      setSrcMode("fqdn");
      setSrcFqdn(r.source_fqdn);
    } else if (!src || (!src.address && srcNonPortGroup.length === 0 && !src.geoip && !src.mac_address)) {
      setSrcMode("any");
    } else if (src.mac_address) {
      setSrcMode("mac");
      setSrcMac(src.mac_address);
    } else if (src.geoip) {
      setSrcMode("geoip");
      setSrcGeoip(src.geoip.country_code ?? []);
      setSrcGeoipInverse(src.geoip.inverse_match ?? false);
    } else if (srcNonPortGroup.length > 0) {
      setSrcMode("group");
      const [groupType, rawGroupName] = srcNonPortGroup[0];
      setSrcGroupType(groupType ?? "address-group");
      if (rawGroupName?.startsWith("!")) {
        setSrcGroupName(rawGroupName.substring(1));
        setSrcGroupInvert(true);
      } else {
        setSrcGroupName(rawGroupName ?? "");
        setSrcGroupInvert(false);
      }
    } else if (src.address) {
      setSrcMode("address");
      const addr = src.address;
      if (addr.startsWith("!")) {
        setSrcAddress(addr.substring(1));
        setSrcAddressInvert(true);
      } else {
        setSrcAddress(addr);
        setSrcAddressInvert(false);
      }
    }
    if (src?.port) {
      setSrcPortMode("port");
      setSrcPort(src.port);
    } else if (src?.group?.["port-group"]) {
      setSrcPortMode("group");
      const rawPortGroup = src.group["port-group"];
      if (rawPortGroup.startsWith("!")) {
        setSrcPortGroup(rawPortGroup.substring(1));
        setSrcPortGroupInvert(true);
      } else {
        setSrcPortGroup(rawPortGroup);
        setSrcPortGroupInvert(false);
      }
    } else {
      setSrcPortMode("any");
    }
    if (r.source_address_mask) {
      setSrcAddressMask(r.source_address_mask);
    }

    // Destination
    const dst = r.destination;
    // Non-port group entries determine the destination match mode
    const dstNonPortGroup = dst?.group
      ? Object.entries(dst.group).filter(([k]) => k !== "port-group")
      : [];
    if (r.destination_fqdn) {
      setDstMode("fqdn");
      setDstFqdn(r.destination_fqdn);
    } else if (r.destination_mac_address) {
      setDstMode("mac");
      setDstMacAddress(r.destination_mac_address);
    } else if (!dst || (!dst.address && dstNonPortGroup.length === 0 && !dst.geoip)) {
      setDstMode("any");
    } else if (dst.geoip) {
      setDstMode("geoip");
      setDstGeoip(dst.geoip.country_code ?? []);
      setDstGeoipInverse(dst.geoip.inverse_match ?? false);
    } else if (dstNonPortGroup.length > 0) {
      setDstMode("group");
      const [groupType, rawGroupName] = dstNonPortGroup[0];
      setDstGroupType(groupType ?? "address-group");
      if (rawGroupName?.startsWith("!")) {
        setDstGroupName(rawGroupName.substring(1));
        setDstGroupInvert(true);
      } else {
        setDstGroupName(rawGroupName ?? "");
        setDstGroupInvert(false);
      }
    } else if (dst.address) {
      setDstMode("address");
      const addr = dst.address;
      if (addr.startsWith("!")) {
        setDstAddress(addr.substring(1));
        setDstAddressInvert(true);
      } else {
        setDstAddress(addr);
        setDstAddressInvert(false);
      }
    }
    if (dst?.port) {
      setDstPortMode("port");
      setDstPort(dst.port);
    } else if (dst?.group?.["port-group"]) {
      setDstPortMode("group");
      const rawPortGroup = dst.group["port-group"];
      if (rawPortGroup.startsWith("!")) {
        setDstPortGroup(rawPortGroup.substring(1));
        setDstPortGroupInvert(true);
      } else {
        setDstPortGroup(rawPortGroup);
        setDstPortGroupInvert(false);
      }
    } else {
      setDstPortMode("any");
    }
    if (r.destination_address_mask) {
      setDstAddressMask(r.destination_address_mask);
    }

    // State
    setStateEstablished(r.state?.established ?? false);
    setStateNew(r.state?.new ?? false);
    setStateRelated(r.state?.related ?? false);
    setStateInvalid(r.state?.invalid ?? false);

    // Advanced
    if (r.tcp_flags && typeof r.tcp_flags === "object" && !Array.isArray(r.tcp_flags)) {
      setTcpFlags({ ...Object.fromEntries(TCP_FLAGS.map((f) => [f, "disabled"])), ...(r.tcp_flags as Record<string, "disabled" | "enabled" | "not">) });
    }
    setIcmpTypeName(r.icmp_type_name ?? "");
    setDscp(r.packet_mods?.dscp ?? "");
    setMark(r.packet_mods?.mark ?? "");
    setTtl(r.packet_mods?.ttl ?? "");

    // Matching
    setConnectionMark(r.connection_mark || "");
    setConnectionStatusNat(r.connection_status?.nat || "");
    setConntrackHelper(r.conntrack_helper || "");
    setDscpMatch(r.dscp_match || "");
    setDscpExclude(r.dscp_exclude || "");
    setFragmentMatchFrag(r.fragment?.match_frag || false);
    setFragmentMatchNonFrag(r.fragment?.match_non_frag || false);
    setGreKey(r.gre?.key || "");
    setGreVersion(r.gre?.version || "");
    setGreInnerProto(r.gre?.inner_proto || "");
    const newGreFlags: Record<string, boolean> = {};
    if (r.gre?.flags_checksum) newGreFlags.checksum = true;
    if (r.gre?.flags_checksum_unset) newGreFlags.checksum_unset = true;
    if (r.gre?.flags_key) newGreFlags.key = true;
    if (r.gre?.flags_key_unset) newGreFlags.key_unset = true;
    if (r.gre?.flags_sequence) newGreFlags.sequence = true;
    if (r.gre?.flags_sequence_unset) newGreFlags.sequence_unset = true;
    setGreFlags(newGreFlags);
    if (r.ipsec) {
      if (r.ipsec.match_ipsec_in) setIpsecInbound("match-ipsec");
      else if (r.ipsec.match_none_in) setIpsecInbound("match-none");
      if (r.ipsec.match_ipsec_out) setIpsecOutbound("match-ipsec");
      else if (r.ipsec.match_none_out) setIpsecOutbound("match-none");
      if (r.ipsec.match_ipsec) setIpsecMode("match-ipsec");
      else if (r.ipsec.match_none) setIpsecMode("match-none");
    }
    setMarkMatch(r.mark_match || "");
    setPacketLength(r.packet_length || "");
    setPacketLengthExclude(r.packet_length_exclude || "");
    setPacketType(r.packet_type || "");
    setTcpMssMatch(r.tcp_mss || "");
    setTtlEq(r.ttl_match?.eq || "");
    setTtlGt(r.ttl_match?.gt || "");
    setTtlLt(r.ttl_match?.lt || "");

    // Limits & Time
    setLimitRate(r.limit?.rate || "");
    setLimitBurst(r.limit?.burst || "");
    setRecentCount(r.recent?.count || "");
    setRecentTime(r.recent?.time || "");
    setTimeStartdate(r.time?.startdate || "");
    setTimeStarttime(r.time?.starttime || "");
    setTimeStopdate(r.time?.stopdate || "");
    setTimeStoptime(r.time?.stoptime || "");
    setTimeWeekdays(r.time?.weekdays || "");

    // Actions
    setLogOptionsGroup(r.log_options?.group || "");
    setLogOptionsLevel(r.log_options?.level || "");
    setLogOptionsQueueThreshold(r.log_options?.queue_threshold || "");
    setLogOptionsSnapshotLength(r.log_options?.snapshot_length || "");
    setQueueNumber(r.queue_number || "");
    setQueueOptions(r.queue_options || "");
    setSynproxyTcpMss(r.synproxy_config?.tcp_mss || "");
    setSynproxyTcpWindowScale(r.synproxy_config?.tcp_window_scale || "");
    setModSetConnectionMark(r.set_connection_mark || "");
    setModSetTcpMss(r.set_tcp_mss || "");
    setAddAddrToGroupSrcGroup(r.add_address_to_group?.source_address_group || "");
    setAddAddrToGroupSrcTimeout(r.add_address_to_group?.source_timeout || "");
    setAddAddrToGroupDstGroup(r.add_address_to_group?.destination_address_group || "");
    setAddAddrToGroupDstTimeout(r.add_address_to_group?.destination_timeout || "");
  }, []);

  useEffect(() => {
    if (!open) return;

    // Sync zone selection with props each time the panel opens
    setSelectedSrc(sourceZone ?? "");
    setSelectedDst(destZone ?? "");

    if (mode === "edit" && rule) {
      loadRuleData(rule);
    } else if (mode === "create" && cloneRule) {
      resetForm();
      loadRuleData(cloneRule);
    } else {
      resetForm();
    }

    // Load auxiliary data
    const loadGroups = async () => {
      try {
        const cfg = await firewallGroupsService.getConfig(true);
        const allGroups = [
          ...cfg.address_groups,
          ...cfg.ipv6_address_groups,
          ...cfg.network_groups,
          ...cfg.ipv6_network_groups,
          ...cfg.port_groups,
          ...cfg.mac_groups,
          ...cfg.domain_groups,
          ...cfg.remote_groups,
        ];
        setGroups(allGroups);
      } catch { /* non-fatal */ }
    };
    const loadCustomChains = async () => {
      try {
        const svc = ipVersion === "ipv4" ? firewallIPv4Service : firewallIPv6Service;
        const cfg = await svc.getConfig();
        setCustomChains(cfg.custom_chains.map((c) => c.name));
      } catch { /* non-fatal */ }
    };
    const loadFlowtables = async () => {
      try {
        const cfg = await flowtablesService.getConfig();
        setFlowtables(cfg.flowtables);
      } catch { /* non-fatal */ }
    };

    loadGroups();
    loadCustomChains();
    loadFlowtables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Update chainRules when resolved chain changes
  useEffect(() => {
    if (resolvedChain) {
      setChainRules(getChainRules(resolvedChain, ipVersion));
    }
  }, [resolvedChain, ipVersion, getChainRules]);

  // ── Group filtering by protocol ───────────────────────────────────────────
  const isV6 = ipVersion === "ipv6";
  const addrGroups = groups.filter((g) => g.type === (isV6 ? "ipv6-address-group" : "address-group"));
  const netGroups = groups.filter((g) => g.type === (isV6 ? "ipv6-network-group" : "network-group"));
  const domainGroups = groups.filter((g) => g.type === "domain-group");
  const portGroups = groups.filter((g) => g.type === "port-group");
  const macGroups = groups.filter((g) => g.type === "mac-group");
  const remoteGroups = groups.filter((g) => g.type === "remote-group");

  const groupsByType = (type: string): FirewallGroup[] => {
    switch (type) {
      case "address-group": case "ipv6-address-group": return addrGroups;
      case "network-group": case "ipv6-network-group": return netGroups;
      case "domain-group": return domainGroups;
      case "mac-group": return macGroups;
      case "remote-group": return remoteGroups;
      case "port-group": return portGroups;
      default: return [];
    }
  };

  const nonLocalZones = zones.filter((z) => !z.local_zone);
  const protocols = isV6 ? IPV6_PROTOCOLS : IPV4_PROTOCOLS;
  const icmpTypes = isV6 ? ICMP_TYPES_V6 : ICMP_TYPES_V4;

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!resolvedChain) {
      setError(t("rulePanel.selectZonesError"));
      return;
    }

    // Validation
    setSrcAddressError(null);
    setDstAddressError(null);
    setSrcMacError(null);
    setSrcPortError(null);
    setDstPortError(null);

    let hasError = false;
    if (srcMode === "address" && srcAddress.trim()) {
      const e = getIPAddressError(srcAddress.trim(), ipVersion);
      if (e) { setSrcAddressError(e); hasError = true; }
    }
    if (dstMode === "address" && dstAddress.trim()) {
      const e = getIPAddressError(dstAddress.trim(), ipVersion);
      if (e) { setDstAddressError(e); hasError = true; }
    }
    if (srcMode === "mac" && srcMac.trim()) {
      const e = getMACAddressError(srcMac.trim());
      if (e) { setSrcMacError(e); hasError = true; }
    }
    if (srcPortMode === "port" && srcPort.trim()) {
      const e = getPortError(srcPort.trim());
      if (e) { setSrcPortError(e); hasError = true; }
    }
    if (dstPortMode === "port" && dstPort.trim()) {
      const e = getPortError(dstPort.trim());
      if (e) { setDstPortError(e); hasError = true; }
    }
    if (hasError) return;

    setLoading(true);
    setError(null);

    try {
      const service = ipVersion === "ipv4" ? firewallIPv4Service : firewallIPv6Service;
      const config: Partial<FirewallRule> = { action };

      if (description.trim()) config.description = description.trim();
      if (ruleProtocol && ruleProtocol !== "all") {
        config.protocol = protocolInvert ? `!${ruleProtocol}` : ruleProtocol;
      }
      config.log = log;
      config.disable = disable;
      if (action === "jump" && jumpTarget) config.jump_target = jumpTarget;
      if (action === "offload" && offloadTarget) config.offload_target = offloadTarget;

      // Source FQDN (set at top level)
      if (srcMode === "fqdn" && srcFqdn.trim()) {
        config.source_fqdn = srcFqdn.trim();
      } else if (mode === "edit" && rule?.source_fqdn) {
        config.source_fqdn = null;
      }

      // Source — always set (empty object = "any", triggers delete in updateRule)
      const hasSrc = srcMode !== "any" || srcPortMode !== "any";
      config.source = {};
      if (hasSrc) {
        if (srcMode === "address" && srcAddress.trim()) {
          config.source.address = srcAddressInvert ? `!${srcAddress.trim()}` : srcAddress.trim();
        } else if (srcMode === "group" && srcGroupName) {
          config.source.group = { [srcGroupType]: srcGroupInvert ? `!${srcGroupName}` : srcGroupName };
        } else if (srcMode === "geoip" && srcGeoip.length > 0) {
          config.source.geoip = { country_code: srcGeoip, inverse_match: srcGeoipInverse };
        } else if (srcMode === "mac" && srcMac.trim()) {
          config.source.mac_address = srcMac.trim();
        }
        if (srcPortMode === "port" && srcPort.trim()) {
          config.source.port = srcPort.trim();
        } else if (srcPortMode === "group" && srcPortGroup) {
          config.source = { ...config.source, group: { ...(config.source.group ?? {}), "port-group": srcPortGroupInvert ? `!${srcPortGroup}` : srcPortGroup } };
        }
      }
      if (srcMode === "address" && srcAddressMask.trim()) {
        config.source_address_mask = srcAddressMask.trim();
      } else if (mode === "edit" && rule?.source_address_mask) {
        config.source_address_mask = null;
      }

      // Destination FQDN (set at top level)
      if (dstMode === "fqdn" && dstFqdn.trim()) {
        config.destination_fqdn = dstFqdn.trim();
      } else if (mode === "edit" && rule?.destination_fqdn) {
        config.destination_fqdn = null;
      }
      // Destination MAC address (set at top level)
      if (dstMode === "mac" && dstMacAddress.trim()) {
        config.destination_mac_address = dstMacAddress.trim();
      } else if (mode === "edit" && rule?.destination_mac_address) {
        config.destination_mac_address = null;
      }

      // Destination — always set (empty object = "any", triggers delete in updateRule)
      const hasDst = dstMode !== "any" || dstPortMode !== "any";
      config.destination = {};
      if (hasDst) {
        if (dstMode === "address" && dstAddress.trim()) {
          config.destination.address = dstAddressInvert ? `!${dstAddress.trim()}` : dstAddress.trim();
        } else if (dstMode === "group" && dstGroupName) {
          config.destination.group = { [dstGroupType]: dstGroupInvert ? `!${dstGroupName}` : dstGroupName };
        } else if (dstMode === "geoip" && dstGeoip.length > 0) {
          config.destination.geoip = { country_code: dstGeoip, inverse_match: dstGeoipInverse };
        }
        if (dstPortMode === "port" && dstPort.trim()) {
          config.destination.port = dstPort.trim();
        } else if (dstPortMode === "group" && dstPortGroup) {
          config.destination = { ...config.destination, group: { ...(config.destination.group ?? {}), "port-group": dstPortGroupInvert ? `!${dstPortGroup}` : dstPortGroup } };
        }
      }
      if (dstMode === "address" && dstAddressMask.trim()) {
        config.destination_address_mask = dstAddressMask.trim();
      } else if (mode === "edit" && rule?.destination_address_mask) {
        config.destination_address_mask = null;
      }

      // State
      if (stateEstablished || stateNew || stateRelated || stateInvalid) {
        config.state = {
          established: stateEstablished || undefined,
          new: stateNew || undefined,
          related: stateRelated || undefined,
          invalid: stateInvalid || undefined,
        };
      }

      // Packet mods
      if (dscp || mark || ttl) {
        config.packet_mods = {};
        if (dscp) config.packet_mods.dscp = dscp;
        if (mark) config.packet_mods.mark = mark;
        if (ttl) config.packet_mods.ttl = ttl;
      }

      // TCP flags
      const activeTcpFlags = Object.fromEntries(
        Object.entries(tcpFlags).filter(([, s]) => s !== "disabled")
      );
      if (Object.keys(activeTcpFlags).length > 0) config.tcp_flags = activeTcpFlags;

      if (icmpTypeName && icmpTypeName !== "any") config.icmp_type_name = icmpTypeName;

      // Matching fields
      if (connectionMark.trim()) config.connection_mark = connectionMark.trim();
      if (connectionStatusNat) config.connection_status = { nat: connectionStatusNat };
      if (conntrackHelper.trim()) config.conntrack_helper = conntrackHelper.trim();
      if (dscpMatch.trim()) config.dscp_match = dscpMatch.trim();
      if (dscpExclude.trim()) config.dscp_exclude = dscpExclude.trim();
      if (fragmentMatchFrag || fragmentMatchNonFrag) {
        config.fragment = {
          match_frag: fragmentMatchFrag || undefined,
          match_non_frag: fragmentMatchNonFrag || undefined,
        };
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
      }
      const hasIpsec = ipsecMode !== "none" || ipsecInbound !== "none" || ipsecOutbound !== "none";
      if (hasIpsec) {
        config.ipsec = {};
        if (ipsecMode === "match-ipsec") config.ipsec.match_ipsec = true;
        if (ipsecMode === "match-none") config.ipsec.match_none = true;
        if (ipsecInbound === "match-ipsec") config.ipsec.match_ipsec_in = true;
        if (ipsecInbound === "match-none") config.ipsec.match_none_in = true;
        if (ipsecOutbound === "match-ipsec") config.ipsec.match_ipsec_out = true;
        if (ipsecOutbound === "match-none") config.ipsec.match_none_out = true;
      }
      if (markMatch.trim()) config.mark_match = markMatch.trim();
      if (packetLength.trim()) config.packet_length = packetLength.trim();
      if (packetLengthExclude.trim()) config.packet_length_exclude = packetLengthExclude.trim();
      if (packetType) config.packet_type = packetType;
      if (tcpMssMatch.trim()) config.tcp_mss = tcpMssMatch.trim();
      if (ttlEq || ttlGt || ttlLt) {
        config.ttl_match = {};
        if (ttlEq) config.ttl_match.eq = ttlEq;
        if (ttlGt) config.ttl_match.gt = ttlGt;
        if (ttlLt) config.ttl_match.lt = ttlLt;
      }

      // Limits & Time
      if (limitRate || limitBurst) {
        config.limit = {};
        if (limitRate) config.limit.rate = limitRate;
        if (limitBurst) config.limit.burst = limitBurst;
      }
      if (recentCount || recentTime) {
        config.recent = {};
        if (recentCount) config.recent.count = recentCount;
        if (recentTime) config.recent.time = recentTime;
      }
      if (timeStartdate || timeStarttime || timeStopdate || timeStoptime || timeWeekdays) {
        config.time = {};
        if (timeStartdate) config.time.startdate = timeStartdate;
        if (timeStarttime) config.time.starttime = timeStarttime;
        if (timeStopdate) config.time.stopdate = timeStopdate;
        if (timeStoptime) config.time.stoptime = timeStoptime;
        if (timeWeekdays) config.time.weekdays = timeWeekdays;
      }

      // Actions / modifications
      if (logOptionsGroup || logOptionsLevel || logOptionsQueueThreshold || logOptionsSnapshotLength) {
        config.log_options = {};
        if (logOptionsGroup) config.log_options.group = logOptionsGroup;
        if (logOptionsLevel) config.log_options.level = logOptionsLevel;
        if (logOptionsQueueThreshold) config.log_options.queue_threshold = logOptionsQueueThreshold;
        if (logOptionsSnapshotLength) config.log_options.snapshot_length = logOptionsSnapshotLength;
      }
      if (queueNumber) config.queue_number = queueNumber;
      if (queueOptions) config.queue_options = queueOptions;
      if (synproxyTcpMss || synproxyTcpWindowScale) {
        config.synproxy_config = {};
        if (synproxyTcpMss) config.synproxy_config.tcp_mss = synproxyTcpMss;
        if (synproxyTcpWindowScale) config.synproxy_config.tcp_window_scale = synproxyTcpWindowScale;
      }
      if (modSetConnectionMark) config.set_connection_mark = modSetConnectionMark;
      if (modSetTcpMss) config.set_tcp_mss = modSetTcpMss;
      if (addAddrToGroupSrcGroup || addAddrToGroupDstGroup) {
        config.add_address_to_group = {};
        if (addAddrToGroupSrcGroup) config.add_address_to_group.source_address_group = addAddrToGroupSrcGroup;
        if (addAddrToGroupSrcTimeout) config.add_address_to_group.source_timeout = addAddrToGroupSrcTimeout;
        if (addAddrToGroupDstGroup) config.add_address_to_group.destination_address_group = addAddrToGroupDstGroup;
        if (addAddrToGroupDstTimeout) config.add_address_to_group.destination_timeout = addAddrToGroupDstTimeout;
      }

      if (mode === "create") {
        const nextNum = getNextRuleNumber(chainRules);
        await service.createRule(resolvedChain, nextNum, true, config);
      } else if (mode === "edit" && rule) {
        await service.updateRule(resolvedChain, rule.rule_number, true, config, rule);
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("rulePanel.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ── Delete + compact handler ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!rule || !resolvedChain) return;
    setDeleteLoading(true);
    try {
      const service = ipVersion === "ipv4" ? firewallIPv4Service : firewallIPv6Service;

      // Delete + full compact in a SINGLE commit. The deleted rule is sent with
      // new_number=null (removed, not recreated); remaining rules renumber from 10
      // sequentially. Splitting this into two requests breaks under commit-confirm,
      // which only allows one un-confirmed change at a time.
      const remaining = chainRules
        .filter((r) => r.rule_number !== rule.rule_number)
        .sort((a, b) => a.rule_number - b.rule_number);

      const reorderItems = [
        { old_number: rule.rule_number, new_number: null, rule_data: rule },
        ...remaining.map((r, i) => ({
          old_number: r.rule_number,
          new_number: 10 + i,
          rule_data: r,
        })),
      ];

      await service.reorderRules({ chain: resolvedChain, is_custom_chain: true, rules: reorderItems });

      // Deleting compacts the chain's rule numbers, so re-anchor its separators
      // to the rules they sat above. The page reloads separators in onSuccess().
      await firewallSeparatorsService.applyRenumber(
        ipVersion,
        resolvedChain,
        reorderItems.map((it) => ({ old_number: it.old_number, new_number: it.new_number }))
      );

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("rulePanel.deleteFailed"));
    } finally {
      setDeleteLoading(false);
      setConfirmingDelete(false);
    }
  };

  // ── Address group type options ────────────────────────────────────────────
  const supportsRemoteGroup = capabilities?.features.remote_group?.supported ?? false;
  const supportsDynamicAddressGroup = capabilities?.features.dynamic_address_group?.supported ?? false;
  const addrGroupTypeOptions = isV6
    ? [
        { value: "ipv6-address-group", label: t("rulePanel.groupTypes.ipv6AddressGroup") },
        { value: "ipv6-network-group", label: t("rulePanel.groupTypes.ipv6NetworkGroup") },
        { value: "domain-group", label: t("rulePanel.groupTypes.domainGroup") },
        ...(supportsRemoteGroup ? [{ value: "remote-group", label: t("rulePanel.groupTypes.remoteGroup") }] : []),
        ...(supportsDynamicAddressGroup ? [{ value: "dynamic-address-group", label: t("rulePanel.groupTypes.dynamicAddressGroup") }] : []),
      ]
    : [
        { value: "address-group", label: t("rulePanel.groupTypes.addressGroup") },
        { value: "network-group", label: t("rulePanel.groupTypes.networkGroup") },
        { value: "domain-group", label: t("rulePanel.groupTypes.domainGroup") },
        { value: "mac-group", label: t("rulePanel.groupTypes.macGroup") },
        ...(supportsRemoteGroup ? [{ value: "remote-group", label: t("rulePanel.groupTypes.remoteGroup") }] : []),
        ...(supportsDynamicAddressGroup ? [{ value: "dynamic-address-group", label: t("rulePanel.groupTypes.dynamicAddressGroup") }] : []),
      ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[540px] p-0 flex flex-col overflow-hidden">
        {/* Sticky header */}
        <div className="px-6 py-4 border-b bg-background shrink-0">
          <SheetHeader>
            <SheetTitle className="text-base">
              {mode === "edit"
                ? t("rulePanel.editTitle", { number: String(rule?.rule_number) })
                : cloneRule
                  ? t("rulePanel.cloneTitle", { number: String(cloneRule.rule_number) })
                  : t("rulePanel.newTitle")}
            </SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Zone pair display */}
            {sourceZone && destZone ? (
              <>
                <Badge variant="outline" className="font-mono text-xs">{sourceZone}</Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="font-mono text-xs">{destZone}</Badge>
              </>
            ) : (
              mode === "create" && (
                <div className="flex items-center gap-2 w-full">
                  <Select value={selectedSrc} onValueChange={setSelectedSrc}>
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue placeholder={t("rulePanel.sourceZone")} />
                    </SelectTrigger>
                    <SelectContent>
                      {nonLocalZones.map((z) => (
                        <SelectItem key={z.name} value={z.name} className="text-xs font-mono">{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <Select value={selectedDst} onValueChange={setSelectedDst}>
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue placeholder={t("rulePanel.destZone")} />
                    </SelectTrigger>
                    <SelectContent>
                      {nonLocalZones.map((z) => (
                        <SelectItem key={z.name} value={z.name} className="text-xs font-mono">{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            )}
            {resolvedChain && (
              <Badge variant="secondary" className="font-mono text-xs">{resolvedChain}</Badge>
            )}
            {selectedSrc && selectedDst && !resolvedChain && (
              <p className="text-xs text-destructive">{t("rulePanel.noChain")}</p>
            )}

          </div>
        </div>

        {/* Scrollable body */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* ── BASIC ─────────────────────────────────────────────────── */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("zoneForm.basic")}</p>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {/* Action */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("table.action")}</Label>
                  <Select value={action} onValueChange={setAction} disabled={!canEdit}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["accept", "drop", "reject", "jump", "continue", "return", "offload", "queue", "synproxy"].map((a) => (
                        <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Jump target */}
                {action === "jump" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("rulePanel.jumpTarget")}</Label>
                    <Select value={jumpTarget} onValueChange={setJumpTarget} disabled={!canEdit}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={t("rulePanel.selectChain")} />
                      </SelectTrigger>
                      <SelectContent>
                        {customChains.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs font-mono">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Offload target */}
                {action === "offload" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("rulePanel.offloadTarget")}</Label>
                    <Select value={offloadTarget} onValueChange={setOffloadTarget} disabled={!canEdit}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={t("rulePanel.selectFlowtable")} />
                      </SelectTrigger>
                      <SelectContent>
                        {flowtables.map((ft) => (
                          <SelectItem key={ft.name} value={ft.name} className="text-xs font-mono">{ft.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Protocol */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("table.protocol")}</Label>
                  <div className="flex items-center gap-2">
                    <Select value={ruleProtocol} onValueChange={setRuleProtocol} disabled={!canEdit}>
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {protocols.map((p) => (
                          <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <Checkbox
                        checked={protocolInvert}
                        onCheckedChange={(c) => setProtocolInvert(!!c)}
                        disabled={!canEdit}
                        className="h-3.5 w-3.5"
                      />
                      {t("rulePanel.invert")}
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{tc("description")}</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("zoneForm.descriptionPlaceholder")}
                    className="h-8 text-xs"
                    disabled={!canEdit}
                  />
                </div>

                {/* Log + Disable */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={log} onCheckedChange={(c) => setLog(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                    {t("rulePanel.enableLogging")}
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={disable} onCheckedChange={(c) => setDisable(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                    {t("rulePanel.disableRule")}
                  </label>
                </div>
              </div>

              {/* ── SOURCE ────────────────────────────────────────────────── */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("table.source")}</p>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("rulePanel.sourceMatch")}</Label>
                  <RadioGroup
                    value={srcMode}
                    onValueChange={(v) => setSrcMode(v as SrcMode)}
                    className="flex flex-wrap gap-x-4 gap-y-1"
                    disabled={!canEdit}
                  >
                    {(["any", "address", "fqdn", "group", "geoip", "mac"] as SrcMode[]).map((m) => (
                      <label key={m} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <RadioGroupItem value={m} className="h-3.5 w-3.5" />
                        {m === "fqdn" ? "FQDN" : m === "mac" ? "Mac" : t(`rulePanel.modes.${m}`)}
                      </label>
                    ))}
                  </RadioGroup>

                  {srcMode === "address" && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Input
                          value={srcAddress}
                          onChange={(e) => setSrcAddress(e.target.value)}
                          placeholder={t("rulePanel.addressPlaceholder")}
                          className={cn("h-8 text-xs flex-1", srcAddressError && "border-destructive")}
                          disabled={!canEdit}
                        />
                        <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer">
                          <Checkbox checked={srcAddressInvert} onCheckedChange={(c) => setSrcAddressInvert(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                          {t("rulePanel.invert")}
                        </label>
                      </div>
                      {srcAddressError && <p className="text-xs text-destructive">{srcAddressError}</p>}
                      <Input
                        value={srcAddressMask}
                        onChange={(e) => setSrcAddressMask(e.target.value)}
                        placeholder={t("rulePanel.addressMaskPlaceholder")}
                        className="h-8 text-xs"
                        disabled={!canEdit}
                      />
                    </div>
                  )}

                  {srcMode === "fqdn" && (
                    <Input
                      value={srcFqdn}
                      onChange={(e) => setSrcFqdn(e.target.value)}
                      placeholder="example.com"
                      className="h-8 text-xs"
                      disabled={!canEdit}
                    />
                  )}

                  {srcMode === "group" && (
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <Select value={srcGroupType} onValueChange={(v) => { setSrcGroupType(v); setSrcGroupName(""); }} disabled={!canEdit}>
                          <SelectTrigger className="h-8 text-xs w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {addrGroupTypeOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {srcGroupType === "dynamic-address-group" ? (
                          <Input
                            value={srcGroupName}
                            onChange={(e) => setSrcGroupName(e.target.value)}
                            placeholder={t("rulePanel.dynamicGroupPlaceholder")}
                            className="h-8 text-xs flex-1"
                            disabled={!canEdit}
                          />
                        ) : (
                          <Select value={srcGroupName} onValueChange={setSrcGroupName} disabled={!canEdit}>
                            <SelectTrigger className="h-8 text-xs flex-1">
                              <SelectValue placeholder={t("rulePanel.selectGroup")} />
                            </SelectTrigger>
                            <SelectContent>
                              {groupsByType(srcGroupType).map((g) => (
                                <SelectItem key={g.name} value={g.name} className="text-xs font-mono">{g.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer">
                        <Checkbox checked={srcGroupInvert} onCheckedChange={(c) => setSrcGroupInvert(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                        {t("rulePanel.invertGroup")}
                      </label>
                    </div>
                  )}

                  {srcMode === "geoip" && (
                    <div className="space-y-1">
                      <CountryMultiSelect value={srcGeoip} onChange={setSrcGeoip} label={t("table.countries")} id="src-geoip" />
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={srcGeoipInverse} onCheckedChange={(c) => setSrcGeoipInverse(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                        {t("rulePanel.excludeCountries")}
                      </label>
                    </div>
                  )}

                  {srcMode === "mac" && (
                    <div className="space-y-1">
                      <Input
                        value={srcMac}
                        onChange={(e) => setSrcMac(e.target.value)}
                        placeholder="aa:bb:cc:dd:ee:ff"
                        className={cn("h-8 text-xs", srcMacError && "border-destructive")}
                        disabled={!canEdit}
                      />
                      {srcMacError && <p className="text-xs text-destructive">{srcMacError}</p>}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs">{t("rulePanel.sourcePort")}</Label>
                  <RadioGroup value={srcPortMode} onValueChange={(v) => setSrcPortMode(v as PortMode)} className="flex gap-4" disabled={!canEdit}>
                    {(["any", "port", "group"] as PortMode[]).map((m) => (
                      <label key={m} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <RadioGroupItem value={m} className="h-3.5 w-3.5" />
                        {t(`rulePanel.modes.${m}`)}
                      </label>
                    ))}
                  </RadioGroup>
                  {srcPortMode === "port" && (
                    <div className="space-y-1">
                      <Input value={srcPort} onChange={(e) => setSrcPort(e.target.value)} placeholder="80, 443, 8080-8090" className={cn("h-8 text-xs", srcPortError && "border-destructive")} disabled={!canEdit} />
                      {srcPortError && <p className="text-xs text-destructive">{srcPortError}</p>}
                    </div>
                  )}
                  {srcPortMode === "group" && (
                    <div className="space-y-1">
                      <Select value={srcPortGroup} onValueChange={setSrcPortGroup} disabled={!canEdit}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder={t("rulePanel.selectPortGroup")} />
                        </SelectTrigger>
                        <SelectContent>
                          {portGroups.map((g) => (
                            <SelectItem key={g.name} value={g.name} className="text-xs font-mono">{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer">
                        <Checkbox checked={srcPortGroupInvert} onCheckedChange={(c) => setSrcPortGroupInvert(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                        {t("rulePanel.invertGroup")}
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* ── DESTINATION ───────────────────────────────────────────── */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("table.destination")}</p>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("rulePanel.destinationMatch")}</Label>
                  <RadioGroup value={dstMode} onValueChange={(v) => setDstMode(v as DstMode)} className="flex flex-wrap gap-x-4 gap-y-1" disabled={!canEdit}>
                    {(["any", "address", "fqdn", "group", "geoip", "mac"] as DstMode[]).map((m) => (
                      <label key={m} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <RadioGroupItem value={m} className="h-3.5 w-3.5" />
                        {m === "fqdn" ? "FQDN" : m === "mac" ? "MAC" : t(`rulePanel.modes.${m}`)}
                      </label>
                    ))}
                  </RadioGroup>

                  {dstMode === "address" && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Input
                          value={dstAddress}
                          onChange={(e) => setDstAddress(e.target.value)}
                          placeholder={t("rulePanel.addressPlaceholder")}
                          className={cn("h-8 text-xs flex-1", dstAddressError && "border-destructive")}
                          disabled={!canEdit}
                        />
                        <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer">
                          <Checkbox checked={dstAddressInvert} onCheckedChange={(c) => setDstAddressInvert(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                          {t("rulePanel.invert")}
                        </label>
                      </div>
                      {dstAddressError && <p className="text-xs text-destructive">{dstAddressError}</p>}
                      <Input
                        value={dstAddressMask}
                        onChange={(e) => setDstAddressMask(e.target.value)}
                        placeholder={t("rulePanel.addressMaskPlaceholder")}
                        className="h-8 text-xs"
                        disabled={!canEdit}
                      />
                    </div>
                  )}

                  {dstMode === "fqdn" && (
                    <Input
                      value={dstFqdn}
                      onChange={(e) => setDstFqdn(e.target.value)}
                      placeholder="example.com"
                      className="h-8 text-xs"
                      disabled={!canEdit}
                    />
                  )}

                  {dstMode === "mac" && (
                    <Input
                      value={dstMacAddress}
                      onChange={(e) => setDstMacAddress(e.target.value)}
                      placeholder="aa:bb:cc:dd:ee:ff"
                      className="h-8 text-xs"
                      disabled={!canEdit}
                    />
                  )}

                  {dstMode === "group" && (
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <Select value={dstGroupType} onValueChange={(v) => { setDstGroupType(v); setDstGroupName(""); }} disabled={!canEdit}>
                          <SelectTrigger className="h-8 text-xs w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {addrGroupTypeOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {dstGroupType === "dynamic-address-group" ? (
                          <Input
                            value={dstGroupName}
                            onChange={(e) => setDstGroupName(e.target.value)}
                            placeholder={t("rulePanel.dynamicGroupPlaceholder")}
                            className="h-8 text-xs flex-1"
                            disabled={!canEdit}
                          />
                        ) : (
                          <Select value={dstGroupName} onValueChange={setDstGroupName} disabled={!canEdit}>
                            <SelectTrigger className="h-8 text-xs flex-1">
                              <SelectValue placeholder={t("rulePanel.selectGroup")} />
                            </SelectTrigger>
                            <SelectContent>
                              {groupsByType(dstGroupType).map((g) => (
                                <SelectItem key={g.name} value={g.name} className="text-xs font-mono">{g.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer">
                        <Checkbox checked={dstGroupInvert} onCheckedChange={(c) => setDstGroupInvert(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                        {t("rulePanel.invertGroup")}
                      </label>
                    </div>
                  )}

                  {dstMode === "geoip" && (
                    <div className="space-y-1">
                      <CountryMultiSelect value={dstGeoip} onChange={setDstGeoip} label={t("table.countries")} id="dst-geoip" />
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={dstGeoipInverse} onCheckedChange={(c) => setDstGeoipInverse(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                        {t("rulePanel.excludeCountries")}
                      </label>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs">{t("rulePanel.destinationPort")}</Label>
                  <RadioGroup value={dstPortMode} onValueChange={(v) => setDstPortMode(v as PortMode)} className="flex gap-4" disabled={!canEdit}>
                    {(["any", "port", "group"] as PortMode[]).map((m) => (
                      <label key={m} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <RadioGroupItem value={m} className="h-3.5 w-3.5" />
                        {t(`rulePanel.modes.${m}`)}
                      </label>
                    ))}
                  </RadioGroup>
                  {dstPortMode === "port" && (
                    <div className="space-y-1">
                      <Input value={dstPort} onChange={(e) => setDstPort(e.target.value)} placeholder="80, 443, 8080-8090" className={cn("h-8 text-xs", dstPortError && "border-destructive")} disabled={!canEdit} />
                      {dstPortError && <p className="text-xs text-destructive">{dstPortError}</p>}
                    </div>
                  )}
                  {dstPortMode === "group" && (
                    <div className="space-y-1">
                      <Select value={dstPortGroup} onValueChange={setDstPortGroup} disabled={!canEdit}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder={t("rulePanel.selectPortGroup")} />
                        </SelectTrigger>
                        <SelectContent>
                          {portGroups.map((g) => (
                            <SelectItem key={g.name} value={g.name} className="text-xs font-mono">{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer">
                        <Checkbox checked={dstPortGroupInvert} onCheckedChange={(c) => setDstPortGroupInvert(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                        {t("rulePanel.invertGroup")}
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* ── STATE ─────────────────────────────────────────────────── */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("rulePanel.state")}</p>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("rulePanel.connectionState")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "established", label: t("rulePanel.states.established"), val: stateEstablished, set: setStateEstablished },
                      { id: "new", label: t("rulePanel.states.new"), val: stateNew, set: setStateNew },
                      { id: "related", label: t("rulePanel.states.related"), val: stateRelated, set: setStateRelated },
                      { id: "invalid", label: t("rulePanel.states.invalid"), val: stateInvalid, set: setStateInvalid },
                    ].map(({ id, label, val, set }) => (
                      <label key={id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={val} onCheckedChange={(c) => set(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* IPsec Matching */}
                {capabilities?.features.ipsec_matching?.supported && (
                  <div className="space-y-2">
                    <Label className="text-xs">IPsec</Label>
                    {capabilities?.features.ipsec_directional?.supported ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{t("rulePanel.inbound")}</Label>
                          <Select value={ipsecInbound} onValueChange={(v: "none" | "match-ipsec" | "match-none") => setIpsecInbound(v)} disabled={!canEdit}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs">{t("rulePanel.ipsecNoMatch")}</SelectItem>
                              <SelectItem value="match-ipsec" className="text-xs">{t("rulePanel.ipsecMatch")}</SelectItem>
                              <SelectItem value="match-none" className="text-xs">{t("rulePanel.ipsecMatchNon")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{t("rulePanel.outbound")}</Label>
                          <Select value={ipsecOutbound} onValueChange={(v: "none" | "match-ipsec" | "match-none") => setIpsecOutbound(v)} disabled={!canEdit}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs">{t("rulePanel.ipsecNoMatch")}</SelectItem>
                              <SelectItem value="match-ipsec" className="text-xs">{t("rulePanel.ipsecMatch")}</SelectItem>
                              <SelectItem value="match-none" className="text-xs">{t("rulePanel.ipsecMatchNon")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <RadioGroup value={ipsecMode} onValueChange={(v: "none" | "match-ipsec" | "match-none") => setIpsecMode(v)} className="flex gap-4" disabled={!canEdit}>
                        {([
                          { value: "none", label: tc("none") },
                          { value: "match-ipsec", label: t("rulePanel.ipsecMatch") },
                          { value: "match-none", label: t("rulePanel.ipsecMatchNon") },
                        ] as const).map((o) => (
                          <label key={o.value} className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <RadioGroupItem value={o.value} className="h-3.5 w-3.5" />
                            {o.label}
                          </label>
                        ))}
                      </RadioGroup>
                    )}
                  </div>
                )}

              </div>

              {/* ── ADVANCED ──────────────────────────────────────────────── */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("rulePanel.advanced")}</p>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {/* TCP Flags */}
                <div className="space-y-2">
                  <Label className="text-xs">{t("rulePanel.tcpFlags")}</Label>
                  {ruleProtocol !== "tcp" && ruleProtocol !== "tcp_udp" && (
                    <p className="text-xs text-muted-foreground">{t("rulePanel.tcpFlagsHint")}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {TCP_FLAGS.map((flag) => (
                      <div key={flag} className="flex items-center gap-2">
                        <span className="text-xs font-mono w-8 uppercase">{flag}</span>
                        <Select
                          value={tcpFlags[flag]}
                          onValueChange={(v) => setTcpFlags((prev) => ({ ...prev, [flag]: v as "disabled" | "enabled" | "not" }))}
                          disabled={!canEdit || (ruleProtocol !== "tcp" && ruleProtocol !== "tcp_udp")}
                        >
                          <SelectTrigger className="h-7 text-xs flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="disabled" className="text-xs">{t("rulePanel.flagOff")}</SelectItem>
                            <SelectItem value="enabled" className="text-xs">{t("rulePanel.flagSet")}</SelectItem>
                            <SelectItem value="not" className="text-xs">{t("rulePanel.flagNotSet")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* ICMP Type */}
                <div className="space-y-2">
                  <Label className="text-xs">{t("rulePanel.icmpType")}</Label>
                  {!["icmp", "icmpv6", "ipv6-icmp"].includes(ruleProtocol) && (
                    <p className="text-xs text-muted-foreground">{t("rulePanel.icmpTypeHint")}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Select
                      value={icmpTypeName || "any"}
                      onValueChange={(v) => setIcmpTypeName(v === "any" ? "" : v)}
                      disabled={!canEdit || !["icmp", "icmpv6", "ipv6-icmp"].includes(ruleProtocol)}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {icmpTypes.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {icmpTypeName && (
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setIcmpTypeName("")} disabled={!canEdit}>
                        {t("rulePanel.clear")}
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Packet mods */}
                <div className="space-y-2">
                  <Label className="text-xs">{t("rulePanel.packetMods")}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "DSCP (0-63)", val: dscp, set: setDscp, ph: "0-63" },
                      { label: t("rulePanel.mark"), val: mark, set: setMark, ph: t("rulePanel.valuePlaceholder") },
                      { label: "TTL (0-255)", val: ttl, set: setTtl, ph: "0-255" },
                    ].map(({ label, val, set, ph }) => (
                      <div key={label} className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{label}</Label>
                        <Input value={val} onChange={(e) => set(e.target.value)} placeholder={ph} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── MATCHING OPTIONS (Collapsible) ───────────────────────── */}
              <Collapsible open={matchingOpen} onOpenChange={setMatchingOpen}>
                <CollapsibleTrigger className="flex items-center gap-3 w-full group">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("rulePanel.matchingOptions")}</p>
                  {(connectionMark || connectionStatusNat || conntrackHelper || dscpMatch || dscpExclude || fragmentMatchFrag || fragmentMatchNonFrag || greKey || greVersion || greInnerProto || markMatch || packetLength || packetLengthExclude || packetType || tcpMssMatch || ttlEq || ttlGt || ttlLt) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                  <div className="flex-1 h-px bg-border" />
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", matchingOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3">
                  {/* Connection Mark / Status */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t("rulePanel.connMarkStatus")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.connMark")}</Label>
                        <Input value={connectionMark} onChange={(e) => setConnectionMark(e.target.value)} placeholder={t("rulePanel.eg", { value: "100" })} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.connStatusNat")}</Label>
                        <Select value={connectionStatusNat || "__none__"} onValueChange={(v) => setConnectionStatusNat(v === "__none__" ? "" : v)} disabled={!canEdit}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t("table.any")} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-xs">{t("table.any")}</SelectItem>
                            <SelectItem value="destination" className="text-xs">{t("rulePanel.destinationNat")}</SelectItem>
                            <SelectItem value="source" className="text-xs">{t("rulePanel.sourceNat")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">{t("rulePanel.conntrackHelper")}</Label>
                      <Input value={conntrackHelper} onChange={(e) => setConntrackHelper(e.target.value)} placeholder={t("rulePanel.eg", { value: "ftp, h323, pptp, sip, tftp" })} className="h-8 text-xs" disabled={!canEdit} />
                    </div>
                  </div>

                  <Separator />

                  {/* DSCP Matching */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t("rulePanel.dscpMatching")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.dscpMatch")}</Label>
                        <Input value={dscpMatch} onChange={(e) => setDscpMatch(e.target.value)} placeholder={t("rulePanel.dscpPlaceholder")} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.dscpExclude")}</Label>
                        <Input value={dscpExclude} onChange={(e) => setDscpExclude(e.target.value)} placeholder={t("rulePanel.dscpPlaceholder")} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Fragment Matching */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t("rulePanel.fragmentMatching")}</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={fragmentMatchFrag} onCheckedChange={(c) => setFragmentMatchFrag(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                        {t("rulePanel.matchFragmented")}
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={fragmentMatchNonFrag} onCheckedChange={(c) => setFragmentMatchNonFrag(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                        {t("rulePanel.matchNonFragmented")}
                      </label>
                    </div>
                  </div>

                  {/* GRE Matching (capability-gated) */}
                  {capabilities?.features.gre_matching?.supported && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-xs">{t("rulePanel.greMatching")}</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">{t("rulePanel.greKey")}</Label>
                            <Input value={greKey} onChange={(e) => setGreKey(e.target.value)} placeholder={t("rulePanel.keyValue")} className="h-8 text-xs" disabled={!canEdit} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">{t("rulePanel.greVersion")}</Label>
                            <Select value={greVersion || "__none__"} onValueChange={(v) => setGreVersion(v === "__none__" ? "" : v)} disabled={!canEdit}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t("table.any")} /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__" className="text-xs">{t("table.any")}</SelectItem>
                                <SelectItem value="0" className="text-xs">GREv0</SelectItem>
                                <SelectItem value="1" className="text-xs">GREv1</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">{t("rulePanel.innerProtocol")}</Label>
                            <Input value={greInnerProto} onChange={(e) => setGreInnerProto(e.target.value)} placeholder={t("rulePanel.protocolNumber")} className="h-8 text-xs" disabled={!canEdit} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{t("rulePanel.greFlags")}</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {["checksum", "key", "sequence"].map((flag) => (
                              <div key={flag} className="space-y-1">
                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                  <Checkbox checked={!!greFlags[flag]} onCheckedChange={(c) => setGreFlags(prev => ({ ...prev, [flag]: !!c, [`${flag}_unset`]: false }))} disabled={!canEdit} className="h-3.5 w-3.5" />
                                  <span className="capitalize">{t("rulePanel.greFlagSet", { flag })}</span>
                                </label>
                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                  <Checkbox checked={!!greFlags[`${flag}_unset`]} onCheckedChange={(c) => setGreFlags(prev => ({ ...prev, [`${flag}_unset`]: !!c, [flag]: false }))} disabled={!canEdit} className="h-3.5 w-3.5" />
                                  <span className="capitalize">{t("rulePanel.greFlagUnset", { flag })}</span>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Mark / Packet Length / Type */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t("rulePanel.markLengthType")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.markMatch")}</Label>
                        <Input value={markMatch} onChange={(e) => setMarkMatch(e.target.value)} placeholder={t("rulePanel.eg", { value: "100" })} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.packetType")}</Label>
                        <Select value={packetType || "__none__"} onValueChange={(v) => setPacketType(v === "__none__" ? "" : v)} disabled={!canEdit}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t("table.any")} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-xs">{t("table.any")}</SelectItem>
                            <SelectItem value="broadcast" className="text-xs">{t("rulePanel.packetTypes.broadcast")}</SelectItem>
                            <SelectItem value="host" className="text-xs">{t("rulePanel.packetTypes.host")}</SelectItem>
                            <SelectItem value="multicast" className="text-xs">{t("rulePanel.packetTypes.multicast")}</SelectItem>
                            <SelectItem value="other" className="text-xs">{t("rulePanel.packetTypes.other")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.packetLength")}</Label>
                        <Input value={packetLength} onChange={(e) => setPacketLength(e.target.value)} placeholder={t("rulePanel.packetLengthPlaceholder")} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.packetLengthExclude")}</Label>
                        <Input value={packetLengthExclude} onChange={(e) => setPacketLengthExclude(e.target.value)} placeholder={t("rulePanel.eg", { value: "1500" })} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* TCP MSS / TTL Match */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t("rulePanel.mssTtlMatch")}</Label>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">{t("rulePanel.tcpMssMatch")}</Label>
                      <Input value={tcpMssMatch} onChange={(e) => setTcpMssMatch(e.target.value)} placeholder={t("rulePanel.eg", { value: "500-1460" })} className="h-8 text-xs" disabled={!canEdit} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.ttlEqual")}</Label>
                        <Input value={ttlEq} onChange={(e) => setTtlEq(e.target.value)} placeholder="0-255" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.ttlGreater")}</Label>
                        <Input value={ttlGt} onChange={(e) => setTtlGt(e.target.value)} placeholder="0-255" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.ttlLess")}</Label>
                        <Input value={ttlLt} onChange={(e) => setTtlLt(e.target.value)} placeholder="0-255" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* ── RATE LIMITS & TIME (Collapsible) ─────────────────────── */}
              <Collapsible open={limitsOpen} onOpenChange={setLimitsOpen}>
                <CollapsibleTrigger className="flex items-center gap-3 w-full group">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("rulePanel.limitsTime")}</p>
                  {(limitRate || limitBurst || recentCount || recentTime || timeStartdate || timeStarttime || timeStopdate || timeStoptime || timeWeekdays) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                  <div className="flex-1 h-px bg-border" />
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", limitsOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3">
                  {/* Rate Limiting */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t("rulePanel.rateLimiting")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.rate")}</Label>
                        <Input value={limitRate} onChange={(e) => setLimitRate(e.target.value)} placeholder={t("rulePanel.eg", { value: "10/second" })} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.burst")}</Label>
                        <Input value={limitBurst} onChange={(e) => setLimitBurst(e.target.value)} placeholder={t("rulePanel.eg", { value: "20" })} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Recent Connection Tracking */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t("rulePanel.recentTracking")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.count")}</Label>
                        <Input value={recentCount} onChange={(e) => setRecentCount(e.target.value)} placeholder={t("rulePanel.eg", { value: "5" })} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.timeSeconds")}</Label>
                        <Input value={recentTime} onChange={(e) => setRecentTime(e.target.value)} placeholder={t("rulePanel.eg", { value: "60" })} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Time-Based Rules */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t("rulePanel.timeBased")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.startDate")}</Label>
                        <Input type="date" value={timeStartdate} onChange={(e) => setTimeStartdate(e.target.value)} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.stopDate")}</Label>
                        <Input type="date" value={timeStopdate} onChange={(e) => setTimeStopdate(e.target.value)} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.startTime")}</Label>
                        <Input type="time" value={timeStarttime} onChange={(e) => setTimeStarttime(e.target.value)} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.stopTime")}</Label>
                        <Input type="time" value={timeStoptime} onChange={(e) => setTimeStoptime(e.target.value)} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">{t("rulePanel.weekdays")}</Label>
                      <Input value={timeWeekdays} onChange={(e) => setTimeWeekdays(e.target.value)} placeholder="Monday,Tuesday,Wednesday" className="h-8 text-xs" disabled={!canEdit} />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* ── ACTIONS & MODIFICATIONS (Collapsible) ────────────────── */}
              <Collapsible open={actionsOpen} onOpenChange={setActionsOpen}>
                <CollapsibleTrigger className="flex items-center gap-3 w-full group">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("rulePanel.actionsMods")}</p>
                  {(logOptionsGroup || logOptionsLevel || logOptionsQueueThreshold || logOptionsSnapshotLength || queueNumber || queueOptions || synproxyTcpMss || synproxyTcpWindowScale || modSetConnectionMark || modSetTcpMss || addAddrToGroupSrcGroup || addAddrToGroupDstGroup) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                  <div className="flex-1 h-px bg-border" />
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", actionsOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3">
                  {/* Log Options (when log is enabled) */}
                  {log && (
                    <div className="space-y-2">
                      <Label className="text-xs">{t("rulePanel.logOptions")}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{t("rulePanel.logGroup")}</Label>
                          <Input value={logOptionsGroup} onChange={(e) => setLogOptionsGroup(e.target.value)} placeholder={t("rulePanel.groupNumber")} className="h-8 text-xs" disabled={!canEdit} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{t("rulePanel.logLevel")}</Label>
                          <Select value={logOptionsLevel || "__none__"} onValueChange={(v) => setLogOptionsLevel(v === "__none__" ? "" : v)} disabled={!canEdit}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={tc("default")} /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs">{tc("default")}</SelectItem>
                              <SelectItem value="emerg" className="text-xs">{t("rulePanel.logLevels.emerg")}</SelectItem>
                              <SelectItem value="alert" className="text-xs">{t("rulePanel.logLevels.alert")}</SelectItem>
                              <SelectItem value="crit" className="text-xs">{t("rulePanel.logLevels.crit")}</SelectItem>
                              <SelectItem value="err" className="text-xs">{t("rulePanel.logLevels.err")}</SelectItem>
                              <SelectItem value="warn" className="text-xs">{t("rulePanel.logLevels.warn")}</SelectItem>
                              <SelectItem value="notice" className="text-xs">{t("rulePanel.logLevels.notice")}</SelectItem>
                              <SelectItem value="info" className="text-xs">{t("rulePanel.logLevels.info")}</SelectItem>
                              <SelectItem value="debug" className="text-xs">{t("rulePanel.logLevels.debug")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{t("rulePanel.queueThreshold")}</Label>
                          <Input value={logOptionsQueueThreshold} onChange={(e) => setLogOptionsQueueThreshold(e.target.value)} placeholder={t("rulePanel.threshold")} className="h-8 text-xs" disabled={!canEdit} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{t("rulePanel.snapshotLength")}</Label>
                          <Input value={logOptionsSnapshotLength} onChange={(e) => setLogOptionsSnapshotLength(e.target.value)} placeholder={t("rulePanel.length")} className="h-8 text-xs" disabled={!canEdit} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Queue Config (when action is queue) */}
                  {action === "queue" && (
                    <div className="space-y-2">
                      <Label className="text-xs">{t("rulePanel.queueConfig")}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{t("rulePanel.queueNumber")}</Label>
                          <Input value={queueNumber} onChange={(e) => setQueueNumber(e.target.value)} placeholder="0-65535" className="h-8 text-xs" disabled={!canEdit} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{t("rulePanel.queueOptions")}</Label>
                          <Select value={queueOptions || "__none__"} onValueChange={(v) => setQueueOptions(v === "__none__" ? "" : v)} disabled={!canEdit}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={tc("none")} /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs">{tc("none")}</SelectItem>
                              <SelectItem value="bypass" className="text-xs">{t("rulePanel.queueBypass")}</SelectItem>
                              <SelectItem value="fanout" className="text-xs">{t("rulePanel.queueFanout")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Synproxy Config (when action is synproxy) */}
                  {action === "synproxy" && (
                    <div className="space-y-2">
                      <Label className="text-xs">{t("rulePanel.synproxyConfig")}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">TCP MSS</Label>
                          <Input value={synproxyTcpMss} onChange={(e) => setSynproxyTcpMss(e.target.value)} placeholder={t("rulePanel.mssValue")} className="h-8 text-xs" disabled={!canEdit} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{t("rulePanel.tcpWindowScale")}</Label>
                          <Input value={synproxyTcpWindowScale} onChange={(e) => setSynproxyTcpWindowScale(e.target.value)} placeholder={t("rulePanel.windowScale")} className="h-8 text-xs" disabled={!canEdit} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Set Connection Mark / TCP MSS */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t("rulePanel.packetMods")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.setConnMark")}</Label>
                        <Input value={modSetConnectionMark} onChange={(e) => setModSetConnectionMark(e.target.value)} placeholder={t("rulePanel.markValue")} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.setTcpMss")}</Label>
                        <Input value={modSetTcpMss} onChange={(e) => setModSetTcpMss(e.target.value)} placeholder={t("rulePanel.mssValue")} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Add Address to Group */}
                  <div className="space-y-2">
                    <Label className="text-xs">{t("rulePanel.addToGroup")}</Label>
                    <p className="text-[11px] text-muted-foreground">{t("rulePanel.addToGroupHelp")}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.srcAddressGroup")}</Label>
                        <Input value={addAddrToGroupSrcGroup} onChange={(e) => setAddAddrToGroupSrcGroup(e.target.value)} placeholder={t("rulePanel.groupName")} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.srcTimeout")}</Label>
                        <Input value={addAddrToGroupSrcTimeout} onChange={(e) => setAddAddrToGroupSrcTimeout(e.target.value)} placeholder={t("rulePanel.eg", { value: "300" })} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.dstAddressGroup")}</Label>
                        <Input value={addAddrToGroupDstGroup} onChange={(e) => setAddAddrToGroupDstGroup(e.target.value)} placeholder={t("rulePanel.groupName")} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("rulePanel.dstTimeout")}</Label>
                        <Input value={addAddrToGroupDstTimeout} onChange={(e) => setAddAddrToGroupDstTimeout(e.target.value)} placeholder={t("rulePanel.eg", { value: "300" })} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </ScrollArea>

        {/* Sticky footer */}
        <div className="px-6 py-3 border-t bg-background shrink-0">
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-destructive flex-1">{t("rulePanel.deleteConfirm", { number: String(rule?.rule_number) })}</span>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConfirmingDelete(false)} disabled={deleteLoading}>
                {tc("cancel")}
              </Button>
              <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : t("editZone.confirmDelete")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {mode === "edit" && canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
                  {canEdit ? tc("cancel") : tc("close")}
                </Button>
                {canEdit && (
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleSubmit}
                    disabled={loading || !resolvedChain}
                  >
                    {loading && <RefreshCw className="h-3 w-3 animate-spin mr-1" />}
                    {mode === "create" ? t("rulePanel.createRule") : t("editZone.saveChanges")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
