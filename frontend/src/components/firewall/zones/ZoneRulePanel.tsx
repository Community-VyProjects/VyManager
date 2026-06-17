"use client";

import { useState, useEffect, useCallback } from "react";

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
      setError("Select source and destination zones to determine the firewall chain.");
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
      setError(err instanceof Error ? err.message : "Failed to save rule");
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

      // Step 1: delete just the rule (bypass the service's auto-renumber)
      await service.batchConfigure({
        chain: resolvedChain,
        rule_number: rule.rule_number,
        is_custom_chain: true,
        operations: [{ op: "delete_custom_chain_rule" }],
      });

      // Step 2: full compact — renumber remaining rules from 10 sequentially
      const remaining = chainRules
        .filter((r) => r.rule_number !== rule.rule_number)
        .sort((a, b) => a.rule_number - b.rule_number);

      if (remaining.length > 0) {
        const reorderItems = remaining.map((r, i) => ({
          old_number: r.rule_number,
          new_number: 10 + i,
          rule_data: r,
        }));
        const needsCompact = reorderItems.some((x) => x.old_number !== x.new_number);
        if (needsCompact) {
          await service.reorderRules({ chain: resolvedChain, is_custom_chain: true, rules: reorderItems });
        }
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rule");
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
        { value: "ipv6-address-group", label: "IPv6 Address Group" },
        { value: "ipv6-network-group", label: "IPv6 Network Group" },
        { value: "domain-group", label: "Domain Group" },
        ...(supportsRemoteGroup ? [{ value: "remote-group", label: "Remote Group" }] : []),
        ...(supportsDynamicAddressGroup ? [{ value: "dynamic-address-group", label: "Dynamic Address Group" }] : []),
      ]
    : [
        { value: "address-group", label: "Address Group" },
        { value: "network-group", label: "Network Group" },
        { value: "domain-group", label: "Domain Group" },
        { value: "mac-group", label: "MAC Group" },
        ...(supportsRemoteGroup ? [{ value: "remote-group", label: "Remote Group" }] : []),
        ...(supportsDynamicAddressGroup ? [{ value: "dynamic-address-group", label: "Dynamic Address Group" }] : []),
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
                ? `Edit Rule #${rule?.rule_number}`
                : cloneRule
                  ? `Clone Rule ${cloneRule.rule_number}`
                  : "New Firewall Rule"}
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
                      <SelectValue placeholder="Source zone" />
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
                      <SelectValue placeholder="Dest zone" />
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
              <p className="text-xs text-destructive">No chain found for this zone pair</p>
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
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Basic</p>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {/* Action */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Action</Label>
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
                    <Label className="text-xs">Jump Target</Label>
                    <Select value={jumpTarget} onValueChange={setJumpTarget} disabled={!canEdit}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select chain" />
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
                    <Label className="text-xs">Offload Target (Flowtable)</Label>
                    <Select value={offloadTarget} onValueChange={setOffloadTarget} disabled={!canEdit}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select flowtable" />
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
                  <Label className="text-xs">Protocol</Label>
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
                      Invert
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                    className="h-8 text-xs"
                    disabled={!canEdit}
                  />
                </div>

                {/* Log + Disable */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={log} onCheckedChange={(c) => setLog(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                    Enable logging
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={disable} onCheckedChange={(c) => setDisable(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                    Disable rule
                  </label>
                </div>
              </div>

              {/* ── SOURCE ────────────────────────────────────────────────── */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Source</p>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Source Match</Label>
                  <RadioGroup
                    value={srcMode}
                    onValueChange={(v) => setSrcMode(v as SrcMode)}
                    className="flex flex-wrap gap-x-4 gap-y-1"
                    disabled={!canEdit}
                  >
                    {(["any", "address", "fqdn", "group", "geoip", "mac"] as SrcMode[]).map((m) => (
                      <label key={m} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <RadioGroupItem value={m} className="h-3.5 w-3.5" />
                        {m === "fqdn" ? "FQDN" : m.charAt(0).toUpperCase() + m.slice(1)}
                      </label>
                    ))}
                  </RadioGroup>

                  {srcMode === "address" && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Input
                          value={srcAddress}
                          onChange={(e) => setSrcAddress(e.target.value)}
                          placeholder="IP / CIDR / range"
                          className={cn("h-8 text-xs flex-1", srcAddressError && "border-destructive")}
                          disabled={!canEdit}
                        />
                        <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer">
                          <Checkbox checked={srcAddressInvert} onCheckedChange={(c) => setSrcAddressInvert(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                          Invert
                        </label>
                      </div>
                      {srcAddressError && <p className="text-xs text-destructive">{srcAddressError}</p>}
                      <Input
                        value={srcAddressMask}
                        onChange={(e) => setSrcAddressMask(e.target.value)}
                        placeholder="Address mask (optional)"
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
                            placeholder="Dynamic group name"
                            className="h-8 text-xs flex-1"
                            disabled={!canEdit}
                          />
                        ) : (
                          <Select value={srcGroupName} onValueChange={setSrcGroupName} disabled={!canEdit}>
                            <SelectTrigger className="h-8 text-xs flex-1">
                              <SelectValue placeholder="Select group" />
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
                        Invert (match packets NOT in this group)
                      </label>
                    </div>
                  )}

                  {srcMode === "geoip" && (
                    <div className="space-y-1">
                      <CountryMultiSelect value={srcGeoip} onChange={setSrcGeoip} label="Countries" id="src-geoip" />
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={srcGeoipInverse} onCheckedChange={(c) => setSrcGeoipInverse(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                        Exclude selected countries
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
                  <Label className="text-xs">Source Port</Label>
                  <RadioGroup value={srcPortMode} onValueChange={(v) => setSrcPortMode(v as PortMode)} className="flex gap-4" disabled={!canEdit}>
                    {(["any", "port", "group"] as PortMode[]).map((m) => (
                      <label key={m} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <RadioGroupItem value={m} className="h-3.5 w-3.5" />
                        {m.charAt(0).toUpperCase() + m.slice(1)}
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
                          <SelectValue placeholder="Select port group" />
                        </SelectTrigger>
                        <SelectContent>
                          {portGroups.map((g) => (
                            <SelectItem key={g.name} value={g.name} className="text-xs font-mono">{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer">
                        <Checkbox checked={srcPortGroupInvert} onCheckedChange={(c) => setSrcPortGroupInvert(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                        Invert (match packets NOT in this group)
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* ── DESTINATION ───────────────────────────────────────────── */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Destination</p>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Destination Match</Label>
                  <RadioGroup value={dstMode} onValueChange={(v) => setDstMode(v as DstMode)} className="flex flex-wrap gap-x-4 gap-y-1" disabled={!canEdit}>
                    {(["any", "address", "fqdn", "group", "geoip", "mac"] as DstMode[]).map((m) => (
                      <label key={m} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <RadioGroupItem value={m} className="h-3.5 w-3.5" />
                        {m === "fqdn" ? "FQDN" : m === "mac" ? "MAC" : m.charAt(0).toUpperCase() + m.slice(1)}
                      </label>
                    ))}
                  </RadioGroup>

                  {dstMode === "address" && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Input
                          value={dstAddress}
                          onChange={(e) => setDstAddress(e.target.value)}
                          placeholder="IP / CIDR / range"
                          className={cn("h-8 text-xs flex-1", dstAddressError && "border-destructive")}
                          disabled={!canEdit}
                        />
                        <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer">
                          <Checkbox checked={dstAddressInvert} onCheckedChange={(c) => setDstAddressInvert(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                          Invert
                        </label>
                      </div>
                      {dstAddressError && <p className="text-xs text-destructive">{dstAddressError}</p>}
                      <Input
                        value={dstAddressMask}
                        onChange={(e) => setDstAddressMask(e.target.value)}
                        placeholder="Address mask (optional)"
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
                            placeholder="Dynamic group name"
                            className="h-8 text-xs flex-1"
                            disabled={!canEdit}
                          />
                        ) : (
                          <Select value={dstGroupName} onValueChange={setDstGroupName} disabled={!canEdit}>
                            <SelectTrigger className="h-8 text-xs flex-1">
                              <SelectValue placeholder="Select group" />
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
                        Invert (match packets NOT in this group)
                      </label>
                    </div>
                  )}

                  {dstMode === "geoip" && (
                    <div className="space-y-1">
                      <CountryMultiSelect value={dstGeoip} onChange={setDstGeoip} label="Countries" id="dst-geoip" />
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={dstGeoipInverse} onCheckedChange={(c) => setDstGeoipInverse(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                        Exclude selected countries
                      </label>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs">Destination Port</Label>
                  <RadioGroup value={dstPortMode} onValueChange={(v) => setDstPortMode(v as PortMode)} className="flex gap-4" disabled={!canEdit}>
                    {(["any", "port", "group"] as PortMode[]).map((m) => (
                      <label key={m} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <RadioGroupItem value={m} className="h-3.5 w-3.5" />
                        {m.charAt(0).toUpperCase() + m.slice(1)}
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
                          <SelectValue placeholder="Select port group" />
                        </SelectTrigger>
                        <SelectContent>
                          {portGroups.map((g) => (
                            <SelectItem key={g.name} value={g.name} className="text-xs font-mono">{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer">
                        <Checkbox checked={dstPortGroupInvert} onCheckedChange={(c) => setDstPortGroupInvert(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                        Invert (match packets NOT in this group)
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* ── STATE ─────────────────────────────────────────────────── */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">State</p>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Connection State</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "established", label: "Established", val: stateEstablished, set: setStateEstablished },
                      { id: "new", label: "New", val: stateNew, set: setStateNew },
                      { id: "related", label: "Related", val: stateRelated, set: setStateRelated },
                      { id: "invalid", label: "Invalid", val: stateInvalid, set: setStateInvalid },
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
                          <Label className="text-[11px] text-muted-foreground">Inbound</Label>
                          <Select value={ipsecInbound} onValueChange={(v: "none" | "match-ipsec" | "match-none") => setIpsecInbound(v)} disabled={!canEdit}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs">No match</SelectItem>
                              <SelectItem value="match-ipsec" className="text-xs">Match IPsec</SelectItem>
                              <SelectItem value="match-none" className="text-xs">Match non-IPsec</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Outbound</Label>
                          <Select value={ipsecOutbound} onValueChange={(v: "none" | "match-ipsec" | "match-none") => setIpsecOutbound(v)} disabled={!canEdit}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs">No match</SelectItem>
                              <SelectItem value="match-ipsec" className="text-xs">Match IPsec</SelectItem>
                              <SelectItem value="match-none" className="text-xs">Match non-IPsec</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <RadioGroup value={ipsecMode} onValueChange={(v: "none" | "match-ipsec" | "match-none") => setIpsecMode(v)} className="flex gap-4" disabled={!canEdit}>
                        {([
                          { value: "none", label: "None" },
                          { value: "match-ipsec", label: "Match IPsec" },
                          { value: "match-none", label: "Match non-IPsec" },
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
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Advanced</p>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {/* TCP Flags */}
                <div className="space-y-2">
                  <Label className="text-xs">TCP Flags</Label>
                  {ruleProtocol !== "tcp" && ruleProtocol !== "tcp_udp" && (
                    <p className="text-xs text-muted-foreground">Set protocol to TCP to configure flags.</p>
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
                            <SelectItem value="disabled" className="text-xs">Off</SelectItem>
                            <SelectItem value="enabled" className="text-xs">Match Set</SelectItem>
                            <SelectItem value="not" className="text-xs">Match NOT Set</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* ICMP Type */}
                <div className="space-y-2">
                  <Label className="text-xs">ICMP Type</Label>
                  {!["icmp", "icmpv6", "ipv6-icmp"].includes(ruleProtocol) && (
                    <p className="text-xs text-muted-foreground">Set protocol to ICMP to configure type.</p>
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
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Packet mods */}
                <div className="space-y-2">
                  <Label className="text-xs">Packet Modifications</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "DSCP (0-63)", val: dscp, set: setDscp, ph: "0-63" },
                      { label: "Mark", val: mark, set: setMark, ph: "value" },
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
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Matching Options</p>
                  {(connectionMark || connectionStatusNat || conntrackHelper || dscpMatch || dscpExclude || fragmentMatchFrag || fragmentMatchNonFrag || greKey || greVersion || greInnerProto || markMatch || packetLength || packetLengthExclude || packetType || tcpMssMatch || ttlEq || ttlGt || ttlLt) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                  <div className="flex-1 h-px bg-border" />
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", matchingOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3">
                  {/* Connection Mark / Status */}
                  <div className="space-y-2">
                    <Label className="text-xs">Connection Mark / Status</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Connection Mark</Label>
                        <Input value={connectionMark} onChange={(e) => setConnectionMark(e.target.value)} placeholder="e.g. 100" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Connection Status NAT</Label>
                        <Select value={connectionStatusNat || "__none__"} onValueChange={(v) => setConnectionStatusNat(v === "__none__" ? "" : v)} disabled={!canEdit}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-xs">Any</SelectItem>
                            <SelectItem value="destination" className="text-xs">Destination NAT</SelectItem>
                            <SelectItem value="source" className="text-xs">Source NAT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Conntrack Helper</Label>
                      <Input value={conntrackHelper} onChange={(e) => setConntrackHelper(e.target.value)} placeholder="e.g. ftp, h323, pptp, sip, tftp" className="h-8 text-xs" disabled={!canEdit} />
                    </div>
                  </div>

                  <Separator />

                  {/* DSCP Matching */}
                  <div className="space-y-2">
                    <Label className="text-xs">DSCP Matching</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">DSCP Match</Label>
                        <Input value={dscpMatch} onChange={(e) => setDscpMatch(e.target.value)} placeholder="0-63 or CS0-CS7, AF11-AF43, EF" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">DSCP Exclude</Label>
                        <Input value={dscpExclude} onChange={(e) => setDscpExclude(e.target.value)} placeholder="0-63 or CS0-CS7, AF11-AF43, EF" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Fragment Matching */}
                  <div className="space-y-2">
                    <Label className="text-xs">Fragment Matching</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={fragmentMatchFrag} onCheckedChange={(c) => setFragmentMatchFrag(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                        Match fragmented
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={fragmentMatchNonFrag} onCheckedChange={(c) => setFragmentMatchNonFrag(!!c)} disabled={!canEdit} className="h-3.5 w-3.5" />
                        Match non-fragmented
                      </label>
                    </div>
                  </div>

                  {/* GRE Matching (capability-gated) */}
                  {capabilities?.features.gre_matching?.supported && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-xs">GRE Matching (1.5+)</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">GRE Key</Label>
                            <Input value={greKey} onChange={(e) => setGreKey(e.target.value)} placeholder="Key value" className="h-8 text-xs" disabled={!canEdit} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">GRE Version</Label>
                            <Select value={greVersion || "__none__"} onValueChange={(v) => setGreVersion(v === "__none__" ? "" : v)} disabled={!canEdit}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__" className="text-xs">Any</SelectItem>
                                <SelectItem value="0" className="text-xs">GREv0</SelectItem>
                                <SelectItem value="1" className="text-xs">GREv1</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Inner Protocol</Label>
                            <Input value={greInnerProto} onChange={(e) => setGreInnerProto(e.target.value)} placeholder="Protocol number" className="h-8 text-xs" disabled={!canEdit} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">GRE Flags</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {["checksum", "key", "sequence"].map((flag) => (
                              <div key={flag} className="space-y-1">
                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                  <Checkbox checked={!!greFlags[flag]} onCheckedChange={(c) => setGreFlags(prev => ({ ...prev, [flag]: !!c, [`${flag}_unset`]: false }))} disabled={!canEdit} className="h-3.5 w-3.5" />
                                  <span className="capitalize">{flag} set</span>
                                </label>
                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                  <Checkbox checked={!!greFlags[`${flag}_unset`]} onCheckedChange={(c) => setGreFlags(prev => ({ ...prev, [`${flag}_unset`]: !!c, [flag]: false }))} disabled={!canEdit} className="h-3.5 w-3.5" />
                                  <span className="capitalize">{flag} unset</span>
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
                    <Label className="text-xs">Mark / Packet Length / Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Mark Match</Label>
                        <Input value={markMatch} onChange={(e) => setMarkMatch(e.target.value)} placeholder="e.g. 100" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Packet Type</Label>
                        <Select value={packetType || "__none__"} onValueChange={(v) => setPacketType(v === "__none__" ? "" : v)} disabled={!canEdit}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-xs">Any</SelectItem>
                            <SelectItem value="broadcast" className="text-xs">Broadcast</SelectItem>
                            <SelectItem value="host" className="text-xs">Host</SelectItem>
                            <SelectItem value="multicast" className="text-xs">Multicast</SelectItem>
                            <SelectItem value="other" className="text-xs">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Packet Length</Label>
                        <Input value={packetLength} onChange={(e) => setPacketLength(e.target.value)} placeholder="e.g. 128 or 64-1500" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Packet Length Exclude</Label>
                        <Input value={packetLengthExclude} onChange={(e) => setPacketLengthExclude(e.target.value)} placeholder="e.g. 1500" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* TCP MSS / TTL Match */}
                  <div className="space-y-2">
                    <Label className="text-xs">TCP MSS / TTL Match</Label>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">TCP MSS Match</Label>
                      <Input value={tcpMssMatch} onChange={(e) => setTcpMssMatch(e.target.value)} placeholder="e.g. 500-1460" className="h-8 text-xs" disabled={!canEdit} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">TTL Equal</Label>
                        <Input value={ttlEq} onChange={(e) => setTtlEq(e.target.value)} placeholder="0-255" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">TTL Greater Than</Label>
                        <Input value={ttlGt} onChange={(e) => setTtlGt(e.target.value)} placeholder="0-255" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">TTL Less Than</Label>
                        <Input value={ttlLt} onChange={(e) => setTtlLt(e.target.value)} placeholder="0-255" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* ── RATE LIMITS & TIME (Collapsible) ─────────────────────── */}
              <Collapsible open={limitsOpen} onOpenChange={setLimitsOpen}>
                <CollapsibleTrigger className="flex items-center gap-3 w-full group">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rate Limits & Time</p>
                  {(limitRate || limitBurst || recentCount || recentTime || timeStartdate || timeStarttime || timeStopdate || timeStoptime || timeWeekdays) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                  <div className="flex-1 h-px bg-border" />
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", limitsOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3">
                  {/* Rate Limiting */}
                  <div className="space-y-2">
                    <Label className="text-xs">Rate Limiting</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Rate</Label>
                        <Input value={limitRate} onChange={(e) => setLimitRate(e.target.value)} placeholder="e.g. 10/second" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Burst</Label>
                        <Input value={limitBurst} onChange={(e) => setLimitBurst(e.target.value)} placeholder="e.g. 20" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Recent Connection Tracking */}
                  <div className="space-y-2">
                    <Label className="text-xs">Recent Connection Tracking</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Count</Label>
                        <Input value={recentCount} onChange={(e) => setRecentCount(e.target.value)} placeholder="e.g. 5" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Time (seconds)</Label>
                        <Input value={recentTime} onChange={(e) => setRecentTime(e.target.value)} placeholder="e.g. 60" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Time-Based Rules */}
                  <div className="space-y-2">
                    <Label className="text-xs">Time-Based Rules</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Start Date</Label>
                        <Input type="date" value={timeStartdate} onChange={(e) => setTimeStartdate(e.target.value)} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Stop Date</Label>
                        <Input type="date" value={timeStopdate} onChange={(e) => setTimeStopdate(e.target.value)} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Start Time</Label>
                        <Input type="time" value={timeStarttime} onChange={(e) => setTimeStarttime(e.target.value)} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Stop Time</Label>
                        <Input type="time" value={timeStoptime} onChange={(e) => setTimeStoptime(e.target.value)} className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Weekdays</Label>
                      <Input value={timeWeekdays} onChange={(e) => setTimeWeekdays(e.target.value)} placeholder="Monday,Tuesday,Wednesday" className="h-8 text-xs" disabled={!canEdit} />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* ── ACTIONS & MODIFICATIONS (Collapsible) ────────────────── */}
              <Collapsible open={actionsOpen} onOpenChange={setActionsOpen}>
                <CollapsibleTrigger className="flex items-center gap-3 w-full group">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions & Modifications</p>
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
                      <Label className="text-xs">Log Options</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Log Group</Label>
                          <Input value={logOptionsGroup} onChange={(e) => setLogOptionsGroup(e.target.value)} placeholder="Group number" className="h-8 text-xs" disabled={!canEdit} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Log Level</Label>
                          <Select value={logOptionsLevel || "__none__"} onValueChange={(v) => setLogOptionsLevel(v === "__none__" ? "" : v)} disabled={!canEdit}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Default" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs">Default</SelectItem>
                              <SelectItem value="emerg" className="text-xs">Emergency</SelectItem>
                              <SelectItem value="alert" className="text-xs">Alert</SelectItem>
                              <SelectItem value="crit" className="text-xs">Critical</SelectItem>
                              <SelectItem value="err" className="text-xs">Error</SelectItem>
                              <SelectItem value="warn" className="text-xs">Warning</SelectItem>
                              <SelectItem value="notice" className="text-xs">Notice</SelectItem>
                              <SelectItem value="info" className="text-xs">Info</SelectItem>
                              <SelectItem value="debug" className="text-xs">Debug</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Queue Threshold</Label>
                          <Input value={logOptionsQueueThreshold} onChange={(e) => setLogOptionsQueueThreshold(e.target.value)} placeholder="Threshold" className="h-8 text-xs" disabled={!canEdit} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Snapshot Length</Label>
                          <Input value={logOptionsSnapshotLength} onChange={(e) => setLogOptionsSnapshotLength(e.target.value)} placeholder="Length" className="h-8 text-xs" disabled={!canEdit} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Queue Config (when action is queue) */}
                  {action === "queue" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Queue Configuration</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Queue Number</Label>
                          <Input value={queueNumber} onChange={(e) => setQueueNumber(e.target.value)} placeholder="0-65535" className="h-8 text-xs" disabled={!canEdit} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Queue Options</Label>
                          <Select value={queueOptions || "__none__"} onValueChange={(v) => setQueueOptions(v === "__none__" ? "" : v)} disabled={!canEdit}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs">None</SelectItem>
                              <SelectItem value="bypass" className="text-xs">Bypass</SelectItem>
                              <SelectItem value="fanout" className="text-xs">Fanout</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Synproxy Config (when action is synproxy) */}
                  {action === "synproxy" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Synproxy Configuration</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">TCP MSS</Label>
                          <Input value={synproxyTcpMss} onChange={(e) => setSynproxyTcpMss(e.target.value)} placeholder="MSS value" className="h-8 text-xs" disabled={!canEdit} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">TCP Window Scale</Label>
                          <Input value={synproxyTcpWindowScale} onChange={(e) => setSynproxyTcpWindowScale(e.target.value)} placeholder="Window scale" className="h-8 text-xs" disabled={!canEdit} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Set Connection Mark / TCP MSS */}
                  <div className="space-y-2">
                    <Label className="text-xs">Packet Modifications</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Set Connection Mark</Label>
                        <Input value={modSetConnectionMark} onChange={(e) => setModSetConnectionMark(e.target.value)} placeholder="Mark value" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Set TCP MSS</Label>
                        <Input value={modSetTcpMss} onChange={(e) => setModSetTcpMss(e.target.value)} placeholder="MSS value" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Add Address to Group */}
                  <div className="space-y-2">
                    <Label className="text-xs">Add Address to Group</Label>
                    <p className="text-[11px] text-muted-foreground">Dynamically add source/destination addresses to firewall groups</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Source Address Group</Label>
                        <Input value={addAddrToGroupSrcGroup} onChange={(e) => setAddAddrToGroupSrcGroup(e.target.value)} placeholder="Group name" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Source Timeout</Label>
                        <Input value={addAddrToGroupSrcTimeout} onChange={(e) => setAddAddrToGroupSrcTimeout(e.target.value)} placeholder="e.g. 300" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Dest Address Group</Label>
                        <Input value={addAddrToGroupDstGroup} onChange={(e) => setAddAddrToGroupDstGroup(e.target.value)} placeholder="Group name" className="h-8 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Dest Timeout</Label>
                        <Input value={addAddrToGroupDstTimeout} onChange={(e) => setAddAddrToGroupDstTimeout(e.target.value)} placeholder="e.g. 300" className="h-8 text-xs" disabled={!canEdit} />
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
              <span className="text-xs text-destructive flex-1">Delete rule #{rule?.rule_number}?</span>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConfirmingDelete(false)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Confirm Delete"}
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
                  {canEdit ? "Cancel" : "Close"}
                </Button>
                {canEdit && (
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleSubmit}
                    disabled={loading || !resolvedChain}
                  >
                    {loading && <RefreshCw className="h-3 w-3 animate-spin mr-1" />}
                    {mode === "create" ? "Create Rule" : "Save Changes"}
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
