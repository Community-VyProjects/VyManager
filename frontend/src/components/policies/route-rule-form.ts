/**
 * Draft, validation and submit logic for PBR route rules.
 *
 * Create sends the fields the operator filled in. Update diffs the draft
 * against the stored record so an unchanged rule sends nothing. The API
 * still rebuilds match/set when anything changed. The write target is the
 * stored rule number, never the draft.
 */

import {
  routeService,
  RouteService,
  type MatchConditions,
  type PolicyRouteRule,
  type SetActions,
} from "@/lib/api/route";
import type { VyOSResponse } from "@/lib/types/api";

export type AddressDomainType = "none" | "address" | "network" | "domain";
export type TableMode = "none" | "main" | "custom";
export type IpsecSelect = "none" | "match-ipsec" | "match-none";

export interface RouteRuleDraft {
  ruleNumber: number;
  description: string;
  disable: boolean;
  log: boolean;
  sourceAddress: string;
  sourceAddressInvert: boolean;
  destAddress: string;
  destAddressInvert: boolean;
  sourceMac: string;
  sourceMacInvert: boolean;
  destMac: string;
  destMacInvert: boolean;
  sourceGeoipCountry: string[];
  sourceGeoipInverse: boolean;
  destGeoipCountry: string[];
  destGeoipInverse: boolean;
  sourceAddressDomainType: AddressDomainType;
  sourceAddressDomainValue: string;
  sourceGroupInvert: boolean;
  sourceMacGroup: string;
  sourceMacGroupInvert: boolean;
  sourcePortGroup: string;
  sourcePortGroupInvert: boolean;
  destAddressDomainType: AddressDomainType;
  destAddressDomainValue: string;
  destGroupInvert: boolean;
  destMacGroup: string;
  destMacGroupInvert: boolean;
  destPortGroup: string;
  destPortGroupInvert: boolean;
  sourcePort: string;
  destPort: string;
  protocol: string;
  tcpFlags: string[];
  matchTcpMss: string;
  icmpType: string;
  icmpTypeName: string;
  icmpCode: string;
  icmpv6Type: string;
  icmpv6TypeName: string;
  icmpv6Code: string;
  fragment: boolean | null;
  packetType: string;
  packetLength: string;
  packetLengthExclude: string;
  dscp: string;
  dscpExclude: string;
  connectionState: string[];
  ipsec: boolean | null;
  ipsecInbound: IpsecSelect;
  ipsecOutbound: IpsecSelect;
  connectionMark: string;
  mark: string;
  ttlOperator: string;
  ttlValue: string;
  hopLimitOperator: string;
  hopLimitValue: string;
  monthdays: string;
  startDate: string;
  stopDate: string;
  startTime: string;
  stopTime: string;
  weekdays: string[];
  utc: boolean;
  limitBurst: string;
  limitRate: string;
  recentCount: string;
  recentTime: string;
  actionDrop: boolean;
  actionConnectionMark: string;
  actionDscp: string;
  actionMark: string;
  actionTableMode: TableMode;
  actionTable: string;
  actionTcpMss: string;
  actionVrf: string;
}

export const emptyRouteRuleDraft = (): RouteRuleDraft => ({
  ruleNumber: 100,
  description: "",
  disable: false,
  log: false,
  sourceAddress: "",
  sourceAddressInvert: false,
  destAddress: "",
  destAddressInvert: false,
  sourceMac: "",
  sourceMacInvert: false,
  destMac: "",
  destMacInvert: false,
  sourceGeoipCountry: [],
  sourceGeoipInverse: false,
  destGeoipCountry: [],
  destGeoipInverse: false,
  sourceAddressDomainType: "none",
  sourceAddressDomainValue: "",
  sourceGroupInvert: false,
  sourceMacGroup: "",
  sourceMacGroupInvert: false,
  sourcePortGroup: "",
  sourcePortGroupInvert: false,
  destAddressDomainType: "none",
  destAddressDomainValue: "",
  destGroupInvert: false,
  destMacGroup: "",
  destMacGroupInvert: false,
  destPortGroup: "",
  destPortGroupInvert: false,
  sourcePort: "",
  destPort: "",
  protocol: "",
  tcpFlags: [],
  matchTcpMss: "",
  icmpType: "",
  icmpTypeName: "",
  icmpCode: "",
  icmpv6Type: "",
  icmpv6TypeName: "",
  icmpv6Code: "",
  fragment: null,
  packetType: "",
  packetLength: "",
  packetLengthExclude: "",
  dscp: "",
  dscpExclude: "",
  connectionState: [],
  ipsec: null,
  ipsecInbound: "none",
  ipsecOutbound: "none",
  connectionMark: "",
  mark: "",
  ttlOperator: "",
  ttlValue: "",
  hopLimitOperator: "",
  hopLimitValue: "",
  monthdays: "",
  startDate: "",
  stopDate: "",
  startTime: "",
  stopTime: "",
  weekdays: [],
  utc: false,
  limitBurst: "",
  limitRate: "",
  recentCount: "",
  recentTime: "",
  actionDrop: false,
  actionConnectionMark: "",
  actionDscp: "",
  actionMark: "",
  actionTableMode: "none",
  actionTable: "",
  actionTcpMss: "",
  actionVrf: "",
});

const bang = (value: string, invert: boolean): string => (invert ? `!${value}` : value);

const parseGroup = (raw: string): { value: string; inverted: boolean } => {
  const inverted = raw.startsWith("!");
  return { value: inverted ? raw.slice(1) : raw, inverted };
};

export function routeRuleDraftFrom(rule: PolicyRouteRule): RouteRuleDraft {
  const draft = emptyRouteRuleDraft();
  const match = rule.match || {};
  const set = rule.set || {};
  draft.ruleNumber = rule.rule_number;
  draft.description = rule.description || "";
  draft.disable = rule.disable || false;
  draft.log = !!rule.log;

  const srcAddr = match.source_address || "";
  draft.sourceAddressInvert = srcAddr.startsWith("!");
  draft.sourceAddress = draft.sourceAddressInvert ? srcAddr.substring(1) : srcAddr;
  const dstAddr = match.destination_address || "";
  draft.destAddressInvert = dstAddr.startsWith("!");
  draft.destAddress = draft.destAddressInvert ? dstAddr.substring(1) : dstAddr;
  const srcMac = match.source_mac_address || "";
  draft.sourceMacInvert = srcMac.startsWith("!");
  draft.sourceMac = draft.sourceMacInvert ? srcMac.substring(1) : srcMac;
  const dstMac = match.destination_mac_address || "";
  draft.destMacInvert = dstMac.startsWith("!");
  draft.destMac = draft.destMacInvert ? dstMac.substring(1) : dstMac;

  if (match.source_group_address) {
    const g = parseGroup(match.source_group_address);
    draft.sourceAddressDomainType = "address";
    draft.sourceAddressDomainValue = g.value;
    draft.sourceGroupInvert = g.inverted;
  } else if (match.source_group_network) {
    const g = parseGroup(match.source_group_network);
    draft.sourceAddressDomainType = "network";
    draft.sourceAddressDomainValue = g.value;
    draft.sourceGroupInvert = g.inverted;
  } else if (match.source_group_domain) {
    const g = parseGroup(match.source_group_domain);
    draft.sourceAddressDomainType = "domain";
    draft.sourceAddressDomainValue = g.value;
    draft.sourceGroupInvert = g.inverted;
  }

  const srcMacRaw = match.source_group_mac || "";
  draft.sourceMacGroupInvert = srcMacRaw.startsWith("!");
  draft.sourceMacGroup = draft.sourceMacGroupInvert ? srcMacRaw.slice(1) : srcMacRaw;
  const srcPortRaw = match.source_group_port || "";
  draft.sourcePortGroupInvert = srcPortRaw.startsWith("!");
  draft.sourcePortGroup = draft.sourcePortGroupInvert ? srcPortRaw.slice(1) : srcPortRaw;

  if (match.destination_group_address) {
    const g = parseGroup(match.destination_group_address);
    draft.destAddressDomainType = "address";
    draft.destAddressDomainValue = g.value;
    draft.destGroupInvert = g.inverted;
  } else if (match.destination_group_network) {
    const g = parseGroup(match.destination_group_network);
    draft.destAddressDomainType = "network";
    draft.destAddressDomainValue = g.value;
    draft.destGroupInvert = g.inverted;
  } else if (match.destination_group_domain) {
    const g = parseGroup(match.destination_group_domain);
    draft.destAddressDomainType = "domain";
    draft.destAddressDomainValue = g.value;
    draft.destGroupInvert = g.inverted;
  }

  const dstMacRaw = match.destination_group_mac || "";
  draft.destMacGroupInvert = dstMacRaw.startsWith("!");
  draft.destMacGroup = draft.destMacGroupInvert ? dstMacRaw.slice(1) : dstMacRaw;
  const dstPortRaw = match.destination_group_port || "";
  draft.destPortGroupInvert = dstPortRaw.startsWith("!");
  draft.destPortGroup = draft.destPortGroupInvert ? dstPortRaw.slice(1) : dstPortRaw;

  draft.sourceGeoipCountry = [...(match.source_geoip?.country_code || [])];
  draft.sourceGeoipInverse = !!match.source_geoip?.inverse_match;
  draft.destGeoipCountry = [...(match.destination_geoip?.country_code || [])];
  draft.destGeoipInverse = !!match.destination_geoip?.inverse_match;
  draft.sourcePort = match.source_port || "";
  draft.destPort = match.destination_port || "";
  draft.protocol = match.protocol || "";
  draft.tcpFlags = [...(match.tcp_flags ?? [])];
  draft.matchTcpMss = match.tcp_mss || "";
  draft.icmpType = match.icmp_type || "";
  draft.icmpTypeName = match.icmp_type_name || "";
  draft.icmpCode = match.icmp_code || "";
  draft.icmpv6Type = match.icmpv6_type || "";
  draft.icmpv6TypeName = match.icmpv6_type_name || "";
  draft.icmpv6Code = match.icmpv6_code || "";
  if (match.fragment !== undefined && match.fragment !== null) {
    draft.fragment = match.fragment === "match-frag";
  }
  draft.packetType = match.packet_type || "";
  draft.packetLength = match.packet_length || "";
  draft.packetLengthExclude = match.packet_length_exclude || "";
  draft.dscp = match.dscp || "";
  draft.dscpExclude = match.dscp_exclude || "";
  draft.connectionState = match.state ? match.state.split(",") : [];
  if (match.ipsec !== undefined && match.ipsec !== null) {
    draft.ipsec = match.ipsec === "match-ipsec";
  }
  if (match.ipsec_in === "match-ipsec-in") draft.ipsecInbound = "match-ipsec";
  else if (match.ipsec_in === "match-none-in") draft.ipsecInbound = "match-none";
  if (match.ipsec_out === "match-ipsec-out") draft.ipsecOutbound = "match-ipsec";
  else if (match.ipsec_out === "match-none-out") draft.ipsecOutbound = "match-none";
  draft.connectionMark = match.connection_mark || "";
  draft.mark = match.mark || "";
  if (match.ttl_eq) { draft.ttlOperator = "eq"; draft.ttlValue = match.ttl_eq; }
  else if (match.ttl_gt) { draft.ttlOperator = "gt"; draft.ttlValue = match.ttl_gt; }
  else if (match.ttl_lt) { draft.ttlOperator = "lt"; draft.ttlValue = match.ttl_lt; }
  if (match.hop_limit_eq) { draft.hopLimitOperator = "eq"; draft.hopLimitValue = match.hop_limit_eq; }
  else if (match.hop_limit_gt) { draft.hopLimitOperator = "gt"; draft.hopLimitValue = match.hop_limit_gt; }
  else if (match.hop_limit_lt) { draft.hopLimitOperator = "lt"; draft.hopLimitValue = match.hop_limit_lt; }
  draft.monthdays = match.time_monthdays || "";
  draft.startDate = match.time_startdate || "";
  draft.stopDate = match.time_stopdate || "";
  draft.startTime = match.time_starttime || "";
  draft.stopTime = match.time_stoptime || "";
  draft.weekdays = match.time_weekdays ? match.time_weekdays.split(",") : [];
  draft.utc = match.time_utc || false;
  draft.limitBurst = match.limit_burst || "";
  draft.limitRate = match.limit_rate || "";
  draft.recentCount = match.recent_count || "";
  draft.recentTime = match.recent_time || "";
  draft.actionDrop = set.action_drop || false;
  draft.actionConnectionMark = set.connection_mark || "";
  draft.actionDscp = set.dscp || "";
  draft.actionMark = set.mark || "";
  if (set.table === "main") draft.actionTableMode = "main";
  else if (set.table) { draft.actionTableMode = "custom"; draft.actionTable = set.table; }
  draft.actionTcpMss = set.tcp_mss || "";
  draft.actionVrf = set.vrf || "";
  return draft;
}

export function matchFromDraft(
  draft: RouteRuleDraft,
  policyType: string,
  directional: boolean,
): Partial<MatchConditions> {
  const match: Partial<MatchConditions> = {};
  if (draft.sourceAddress) match.source_address = bang(draft.sourceAddress, draft.sourceAddressInvert);
  if (draft.destAddress) match.destination_address = bang(draft.destAddress, draft.destAddressInvert);
  if (draft.sourceMac) match.source_mac_address = bang(draft.sourceMac, draft.sourceMacInvert);
  if (draft.destMac) match.destination_mac_address = bang(draft.destMac, draft.destMacInvert);
  if (draft.sourceGeoipCountry.length > 0 || draft.sourceGeoipInverse) {
    match.source_geoip = {
      country_code: draft.sourceGeoipCountry.length > 0 ? draft.sourceGeoipCountry : undefined,
      inverse_match: draft.sourceGeoipInverse || undefined,
    };
  }
  if (draft.destGeoipCountry.length > 0 || draft.destGeoipInverse) {
    match.destination_geoip = {
      country_code: draft.destGeoipCountry.length > 0 ? draft.destGeoipCountry : undefined,
      inverse_match: draft.destGeoipInverse || undefined,
    };
  }
  if (draft.sourceAddressDomainType !== "none" && draft.sourceAddressDomainValue) {
    const srcGrpVal = bang(draft.sourceAddressDomainValue, draft.sourceGroupInvert);
    if (draft.sourceAddressDomainType === "address") match.source_group_address = srcGrpVal;
    else if (draft.sourceAddressDomainType === "network") match.source_group_network = srcGrpVal;
    else if (draft.sourceAddressDomainType === "domain") match.source_group_domain = srcGrpVal;
  }
  if (draft.sourceMacGroup) match.source_group_mac = bang(draft.sourceMacGroup, draft.sourceMacGroupInvert);
  if (draft.sourcePortGroup) match.source_group_port = bang(draft.sourcePortGroup, draft.sourcePortGroupInvert);
  if (draft.destAddressDomainType !== "none" && draft.destAddressDomainValue) {
    const dstGrpVal = bang(draft.destAddressDomainValue, draft.destGroupInvert);
    if (draft.destAddressDomainType === "address") match.destination_group_address = dstGrpVal;
    else if (draft.destAddressDomainType === "network") match.destination_group_network = dstGrpVal;
    else if (draft.destAddressDomainType === "domain") match.destination_group_domain = dstGrpVal;
  }
  if (draft.destMacGroup) match.destination_group_mac = bang(draft.destMacGroup, draft.destMacGroupInvert);
  if (draft.destPortGroup) match.destination_group_port = bang(draft.destPortGroup, draft.destPortGroupInvert);
  if (draft.sourcePort) match.source_port = draft.sourcePort;
  if (draft.destPort) match.destination_port = draft.destPort;
  if (draft.protocol && draft.protocol !== "all") match.protocol = draft.protocol;
  if (draft.tcpFlags.length > 0) match.tcp_flags = draft.tcpFlags;
  if (draft.matchTcpMss.trim()) match.tcp_mss = draft.matchTcpMss.trim();
  if (policyType === "route") {
    if (draft.icmpType) match.icmp_type = draft.icmpType;
    if (draft.icmpTypeName) match.icmp_type_name = draft.icmpTypeName;
    if (draft.icmpCode) match.icmp_code = draft.icmpCode;
  } else {
    if (draft.icmpv6Type) match.icmpv6_type = draft.icmpv6Type;
    if (draft.icmpv6TypeName) match.icmpv6_type_name = draft.icmpv6TypeName;
    if (draft.icmpv6Code) match.icmpv6_code = draft.icmpv6Code;
  }
  if (draft.fragment !== null) match.fragment = draft.fragment ? "match-frag" : "match-non-frag";
  if (draft.packetType) match.packet_type = draft.packetType;
  if (draft.packetLength) match.packet_length = draft.packetLength;
  if (draft.packetLengthExclude) match.packet_length_exclude = draft.packetLengthExclude;
  if (draft.dscp) match.dscp = draft.dscp;
  if (draft.dscpExclude) match.dscp_exclude = draft.dscpExclude;
  if (draft.connectionState.length > 0) match.state = draft.connectionState.join(",");
  if (directional) {
    if (draft.ipsecInbound === "match-ipsec") match.ipsec_in = "match-ipsec-in";
    else if (draft.ipsecInbound === "match-none") match.ipsec_in = "match-none-in";
    if (draft.ipsecOutbound === "match-ipsec") match.ipsec_out = "match-ipsec-out";
    else if (draft.ipsecOutbound === "match-none") match.ipsec_out = "match-none-out";
  } else if (draft.ipsec !== null) {
    match.ipsec = draft.ipsec ? "match-ipsec" : "match-none";
  }
  if (draft.connectionMark) match.connection_mark = draft.connectionMark;
  if (draft.mark) match.mark = draft.mark;
  if (policyType === "route" && draft.ttlOperator && draft.ttlValue) {
    if (draft.ttlOperator === "eq") match.ttl_eq = draft.ttlValue;
    else if (draft.ttlOperator === "gt") match.ttl_gt = draft.ttlValue;
    else if (draft.ttlOperator === "lt") match.ttl_lt = draft.ttlValue;
  } else if (policyType === "route6" && draft.hopLimitOperator && draft.hopLimitValue) {
    if (draft.hopLimitOperator === "eq") match.hop_limit_eq = draft.hopLimitValue;
    else if (draft.hopLimitOperator === "gt") match.hop_limit_gt = draft.hopLimitValue;
    else if (draft.hopLimitOperator === "lt") match.hop_limit_lt = draft.hopLimitValue;
  }
  if (draft.monthdays) match.time_monthdays = draft.monthdays;
  if (draft.startDate) match.time_startdate = draft.startDate;
  if (draft.stopDate) match.time_stopdate = draft.stopDate;
  if (draft.startTime) match.time_starttime = draft.startTime;
  if (draft.stopTime) match.time_stoptime = draft.stopTime;
  if (draft.weekdays.length > 0) match.time_weekdays = draft.weekdays.join(",");
  if (draft.utc) match.time_utc = true;
  if (draft.limitBurst) match.limit_burst = draft.limitBurst;
  if (draft.limitRate) match.limit_rate = draft.limitRate;
  if (draft.recentCount) match.recent_count = draft.recentCount;
  if (draft.recentTime) match.recent_time = draft.recentTime;
  return match;
}

export function setFromDraft(draft: RouteRuleDraft): Partial<SetActions> {
  const set: Partial<SetActions> = {};
  if (draft.actionDrop) set.action_drop = true;
  if (draft.actionConnectionMark) set.connection_mark = draft.actionConnectionMark;
  if (draft.actionDscp) set.dscp = draft.actionDscp;
  if (draft.actionMark) set.mark = draft.actionMark;
  if (draft.actionTableMode === "main") set.table = "main";
  else if (draft.actionTableMode === "custom" && draft.actionTable) set.table = draft.actionTable;
  if (draft.actionTcpMss) set.tcp_mss = draft.actionTcpMss;
  if (draft.actionVrf) set.vrf = draft.actionVrf;
  return set;
}

export function validateRouteRuleCreate(draft: RouteRuleDraft): string | null {
  if (!draft.ruleNumber) return "Rule number is required";
  return null;
}

export function validateRouteRuleEdit(): string | null {
  return null;
}

export function nextRuleNumber(rules: { rule_number: number }[]): number {
  if (rules.length === 0) return 100;
  return Math.max(...rules.map((r) => r.rule_number)) + 1;
}

const stable = (value: unknown): string => JSON.stringify(value ?? null);

export function routeRuleUnchanged(
  draft: RouteRuleDraft,
  current: PolicyRouteRule,
  policyType: string,
  directional: boolean,
): boolean {
  const fromStored = routeRuleDraftFrom(current);
  return (
    stable(matchFromDraft(draft, policyType, directional)) ===
      stable(matchFromDraft(fromStored, policyType, directional)) &&
    stable(setFromDraft(draft)) === stable(setFromDraft(fromStored)) &&
    draft.description.trim() === (current.description || "") &&
    !!draft.disable === !!current.disable &&
    !!draft.log === !!current.log
  );
}

export function submitRouteRuleCreate(
  policyType: string,
  policyName: string,
  draft: RouteRuleDraft,
  directional: boolean,
  service: RouteService = routeService,
): Promise<VyOSResponse> {
  const match = matchFromDraft(draft, policyType, directional);
  const set = setFromDraft(draft);
  return service.createRule(policyType, policyName, draft.ruleNumber, {
    description: draft.description.trim() || undefined,
    disable: draft.disable,
    log: draft.log ? "true" : undefined,
    match: Object.keys(match).length > 0 ? match : undefined,
    set: Object.keys(set).length > 0 ? set : undefined,
  });
}

export async function submitRouteRuleUpdate(
  policyType: string,
  policyName: string,
  current: PolicyRouteRule,
  draft: RouteRuleDraft,
  directional: boolean,
  service: RouteService = routeService,
): Promise<VyOSResponse | null> {
  if (routeRuleUnchanged(draft, current, policyType, directional)) return null;
  const match = matchFromDraft(draft, policyType, directional);
  const set = setFromDraft(draft);
  return service.updateRule(policyType, policyName, current.rule_number, {
    description: draft.description,
    disable: draft.disable,
    log: draft.log ? "true" : undefined,
    match: Object.keys(match).length > 0 ? match : undefined,
    set: Object.keys(set).length > 0 ? set : undefined,
    originalMatch: current.match,
  });
}
