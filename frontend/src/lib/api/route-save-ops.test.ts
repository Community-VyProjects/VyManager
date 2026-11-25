import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyRuleForm,
  policyCreateOps,
  policyFormFrom,
  policyProblem,
  policyUpdateOps,
  ruleFormFrom,
  routeRuleProblem,
  ruleSaveOps,
  type RouteRuleForm,
} from "./route-save-ops";
import {
  routeService,
  type MatchConditions,
  type PolicyRoute,
  type PolicyRouteRule,
  type RouteBatchRequest,
  type RouteCapabilitiesResponse,
} from "./route";
import { apiClient } from "./client";

const RANGES = {
  rule: { min: 1, max: 999999 },
  ttl: { min: 0, max: 255 },
  icmp_code: { min: 0, max: 255 },
  icmp_type: { min: 0, max: 255 },
  packet_length: { min: 1, max: 65535 },
  dscp: { min: 0, max: 63 },
  mark: { min: 0, max: 2147483647 },
  connection_mark: { min: 0, max: 2147483647 },
  limit_burst: { min: 0, max: 4294967295 },
  limit_rate: { min: 0, max: 4294967295 },
  recent_count: { min: 1, max: 255 },
  recent_time: { min: 0, max: 4294967295 },
  tcp_mss: { min: 1, max: 16384 },
  geoip_asn: { min: 1, max: 4294967294 },
  set_connection_mark: { min: 0, max: 2147483647 },
  set_dscp: { min: 0, max: 63 },
  set_mark: { min: 1, max: 2147483647 },
  set_table: { min: 1, max: 200 },
  set_tcp_mss: { min: 500, max: 1460 },
};

const VALUES = {
  rule_actions: ["accept", "reject", "return", "drop"],
  packet_types: ["broadcast", "host", "multicast", "other"],
  states: ["established", "invalid", "new", "related"],
  fragments: ["match-frag", "match-non-frag"],
  weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  tcp_flags: ["ack", "cwr", "ecn", "fin", "psh", "rst", "syn", "urg"],
  compare_ops: ["eq", "gt", "lt"],
  protocols: ["all", "tcp_udp", "icmpv6", "icmp", "tcp", "udp"],
  icmp_type_names: ["echo-reply", "echo-request"],
  icmpv6_types: ["echo-request", "packet-too-big"],
};

const CAPS14: RouteCapabilitiesResponse = {
  version: "1.4",
  features: {
    ipv4_policy_route: { supported: true },
    ipv6_policy_route: { supported: true },
    geoip_matching: { supported: false, country_codes: [] },
    tcp_mss_matching: { supported: false },
    vrf_routing: { supported: false },
    ipsec_matching: { supported: true, values: ["match-ipsec", "match-none"] },
    limit_rate: { supported: true, units: [] },
  },
  values: VALUES,
  ranges: RANGES,
  description_max_length: 255,
};

const CAPS15: RouteCapabilitiesResponse = {
  ...CAPS14,
  version: "1.5",
  features: {
    ipv4_policy_route: { supported: true },
    ipv6_policy_route: { supported: true },
    geoip_matching: { supported: true, country_codes: ["de", "fr", "us"] },
    tcp_mss_matching: { supported: true },
    vrf_routing: { supported: true },
    ipsec_matching: { supported: true, values: ["match-ipsec-in", "match-ipsec-out", "match-none-in", "match-none-out"] },
    limit_rate: { supported: true, units: ["second", "minute", "hour", "day"] },
  },
};

function emptyMatch(): MatchConditions {
  const geoip = () => ({ country_code: [], asn: [], inverse_match: false });
  return {
    connection_mark: [],
    destination_address: null,
    destination_geoip: geoip(),
    destination_group_address: null,
    destination_group_domain: null,
    destination_group_mac: null,
    destination_group_network: null,
    destination_group_port: null,
    destination_port: null,
    dscp: [],
    dscp_exclude: [],
    fragment: [],
    hop_limit_eq: null,
    hop_limit_gt: null,
    hop_limit_lt: null,
    icmp_code: null,
    icmp_type: null,
    icmp_type_name: null,
    icmpv6_type: null,
    ipsec: [],
    limit_burst: null,
    limit_rate: null,
    mark: null,
    packet_length: [],
    packet_length_exclude: [],
    packet_type: null,
    protocol: null,
    recent_count: null,
    recent_time: null,
    source_address: null,
    source_geoip: geoip(),
    source_group_address: null,
    source_group_domain: null,
    source_group_mac: null,
    source_group_network: null,
    source_group_port: null,
    source_mac_address: null,
    source_port: null,
    state: [],
    tcp_flags: [],
    tcp_flags_not: [],
    tcp_mss: null,
    time_monthdays: null,
    time_startdate: null,
    time_starttime: null,
    time_stopdate: null,
    time_stoptime: null,
    time_utc: false,
    time_weekdays: null,
    ttl_eq: null,
    ttl_gt: null,
    ttl_lt: null,
  };
}

function bareRule(n = 10): PolicyRouteRule {
  return {
    rule_number: n,
    description: null,
    disable: false,
    log: false,
    action: null,
    match: emptyMatch(),
    set: { connection_mark: null, dscp: null, mark: null, table: null, tcp_mss: null, vrf: null },
  };
}

/** Every leaf the family has on 1.5, filled (as the lab would parse it). */
function fullRule(family: "route" | "route6"): PolicyRouteRule {
  const rule = bareRule();
  rule.description = "corp";
  rule.disable = true;
  rule.log = true;
  rule.action = "accept";
  const m = rule.match;
  m.source_address = "10.0.0.0/8";
  m.source_mac_address = "00:11:22:33:44:55";
  m.source_port = "80";
  m.source_group_address = "SRC-ADDR";
  m.source_group_mac = "SRC-MAC";
  m.source_group_port = "SRC-PORT";
  m.source_geoip = { country_code: ["de"], asn: ["64512"], inverse_match: true };
  m.destination_address = "192.0.2.0/24";
  m.destination_port = "443";
  m.destination_group_network = "DST-NET";
  m.destination_group_mac = "DST-MAC";
  m.destination_group_port = "DST-PORT";
  m.destination_geoip = { country_code: ["fr"], asn: ["64513"], inverse_match: true };
  m.protocol = "tcp";
  m.tcp_flags = ["syn", "ack"];
  m.tcp_flags_not = ["rst"];
  m.tcp_mss = "1400";
  if (family === "route") {
    m.icmp_code = "0";
    m.icmp_type = "8";
    m.icmp_type_name = "echo-request";
    m.ttl_eq = "64";
    m.ttl_gt = "1";
    m.ttl_lt = "128";
  } else {
    m.icmpv6_type = "echo-request";
    m.hop_limit_eq = "64";
    m.hop_limit_gt = "1";
    m.hop_limit_lt = "128";
  }
  m.fragment = ["match-frag"];
  m.ipsec = ["match-ipsec-in"];
  m.packet_type = "host";
  m.packet_length = ["64"];
  m.packet_length_exclude = ["1500"];
  m.dscp = ["10"];
  m.dscp_exclude = ["11"];
  m.state = ["established"];
  m.mark = "5";
  m.connection_mark = ["7"];
  m.time_monthdays = "1,15";
  m.time_startdate = "2026-01-01";
  m.time_starttime = "08:00:00";
  m.time_stopdate = "2026-12-31";
  m.time_stoptime = "18:00:00";
  m.time_weekdays = "Monday,Tuesday";
  m.time_utc = true;
  m.limit_burst = "5";
  m.limit_rate = "10/second";
  m.recent_count = "3";
  m.recent_time = "60";
  rule.set = { connection_mark: "1", dscp: "2", mark: "3", table: "100", tcp_mss: "1400", vrf: "BLUE" };
  return rule;
}

/** The form of a full rule minus the leaves the screen cannot set (recent). */
function fullForm(family: "route" | "route6"): RouteRuleForm {
  const form = ruleFormFrom(fullRule(family));
  form.recent_count = "";
  form.recent_time = "";
  return form;
}

function emptied(rule: PolicyRouteRule): RouteRuleForm {
  return emptyRuleForm(String(rule.rule_number));
}

function names(ops: { op: string }[]): string[] {
  return ops.map((o) => o.op);
}

describe("ruleSaveOps create", () => {
  it("emits create_rule and every filled leaf for route on 1.5", () => {
    const ops = ruleSaveOps("route", null, fullForm("route"), CAPS15);
    assert.deepEqual(ops, [
      { op: "create_rule" },
      { op: "set_rule_description", value: "corp" },
      { op: "set_rule_disable" },
      { op: "set_rule_log" },
      { op: "set_rule_action", value: "accept" },
      { op: "set_match_source_address", value: "10.0.0.0/8" },
      { op: "set_match_source_mac_address", value: "00:11:22:33:44:55" },
      { op: "set_match_source_port", value: "80" },
      { op: "set_match_source_group_address", value: "SRC-ADDR" },
      { op: "set_match_source_group_mac", value: "SRC-MAC" },
      { op: "set_match_source_group_port", value: "SRC-PORT" },
      { op: "set_match_source_geoip_country_code", value: "de" },
      { op: "set_match_source_geoip_asn", value: "64512" },
      { op: "set_match_source_geoip_inverse" },
      { op: "set_match_destination_address", value: "192.0.2.0/24" },
      { op: "set_match_destination_port", value: "443" },
      { op: "set_match_destination_group_mac", value: "DST-MAC" },
      { op: "set_match_destination_group_network", value: "DST-NET" },
      { op: "set_match_destination_group_port", value: "DST-PORT" },
      { op: "set_match_destination_geoip_country_code", value: "fr" },
      { op: "set_match_destination_geoip_asn", value: "64513" },
      { op: "set_match_destination_geoip_inverse" },
      { op: "set_match_protocol", value: "tcp" },
      { op: "set_match_tcp_flag", value: "syn" },
      { op: "set_match_tcp_flag", value: "ack" },
      { op: "set_match_tcp_flag_not", value: "rst" },
      { op: "set_match_tcp_mss", value: "1400" },
      { op: "set_match_icmp_code", value: "0" },
      { op: "set_match_icmp_type", value: "8" },
      { op: "set_match_icmp_type_name", value: "echo-request" },
      { op: "set_match_ttl", value: "eq|64" },
      { op: "set_match_ttl", value: "gt|1" },
      { op: "set_match_ttl", value: "lt|128" },
      { op: "set_match_fragment", value: "match-frag" },
      { op: "set_match_ipsec", value: "match-ipsec-in" },
      { op: "set_match_packet_type", value: "host" },
      { op: "set_match_packet_length", value: "64" },
      { op: "set_match_packet_length_exclude", value: "1500" },
      { op: "set_match_dscp", value: "10" },
      { op: "set_match_dscp_exclude", value: "11" },
      { op: "set_match_state", value: "established" },
      { op: "set_match_mark", value: "5" },
      { op: "set_match_connection_mark", value: "7" },
      { op: "set_match_time_monthdays", value: "1,15" },
      { op: "set_match_time_startdate", value: "2026-01-01" },
      { op: "set_match_time_starttime", value: "08:00:00" },
      { op: "set_match_time_stopdate", value: "2026-12-31" },
      { op: "set_match_time_stoptime", value: "18:00:00" },
      { op: "set_match_time_weekdays", value: "Monday,Tuesday" },
      { op: "set_match_time_utc" },
      { op: "set_match_limit_burst", value: "5" },
      { op: "set_match_limit_rate", value: "10/second" },
      { op: "set_connection_mark", value: "1" },
      { op: "set_dscp", value: "2" },
      { op: "set_mark", value: "3" },
      { op: "set_table", value: "100" },
      { op: "set_tcp_mss", value: "1400" },
      { op: "set_vrf", value: "BLUE" },
    ]);
  });

  it("emits the route6 family leaves and none of route's", () => {
    const ops = ruleSaveOps("route6", null, fullForm("route6"), CAPS15);
    const n = names(ops);
    assert.ok(ops.some((o) => o.op === "set_match_icmpv6_type" && o.value === "echo-request"));
    assert.deepEqual(
      ops.filter((o) => o.op === "set_match_hop_limit").map((o) => o.value),
      ["eq|64", "gt|1", "lt|128"],
    );
    for (const op of ["set_match_icmp_code", "set_match_icmp_type", "set_match_icmp_type_name", "set_match_ttl"]) {
      assert.ok(!n.includes(op), op);
    }
  });

  it("drops the 1.5-only leaves and the limit rate on 1.4", () => {
    const n = names(ruleSaveOps("route", null, fullForm("route"), CAPS14));
    for (const op of [
      "set_match_source_geoip_country_code",
      "set_match_source_geoip_asn",
      "set_match_source_geoip_inverse",
      "set_match_destination_geoip_country_code",
      "set_match_tcp_mss",
      "set_vrf",
      "set_match_limit_rate",
    ]) {
      assert.ok(!n.includes(op), op);
    }
    assert.ok(n.includes("set_match_limit_burst"));
  });

  it("emits only create_rule for an empty rule, and only the action when only that is set", () => {
    assert.deepEqual(ruleSaveOps("route", null, emptyRuleForm("5"), CAPS15), [{ op: "create_rule" }]);
    const form = emptyRuleForm("5");
    form.action = "drop";
    assert.deepEqual(ruleSaveOps("route", null, form, CAPS15), [
      { op: "create_rule" },
      { op: "set_rule_action", value: "drop" },
    ]);
  });

  it("trims padded values and skips blank ones", () => {
    const form = emptyRuleForm(" 7 ");
    form.description = "  corp  ";
    form.source_address = " 10.0.0.1 ";
    form.destination_port = "   ";
    form.state = [" new ", "", "new", "  "];
    form.time_weekdays = ["Tuesday", "Monday", " Monday "];
    form.source_geoip_country_code = [" DE ", "de"];
    form.set_table = " main ";
    assert.deepEqual(ruleSaveOps("route", null, form, CAPS15), [
      { op: "create_rule" },
      { op: "set_rule_description", value: "corp" },
      { op: "set_match_source_address", value: "10.0.0.1" },
      { op: "set_match_source_geoip_country_code", value: "de" },
      { op: "set_match_state", value: "new" },
      { op: "set_match_time_weekdays", value: "Monday,Tuesday" },
      { op: "set_table", value: "main" },
    ]);
  });
});

describe("ruleSaveOps edit", () => {
  it("sends nothing for an unchanged rule", () => {
    for (const family of ["route", "route6"] as const) {
      for (const caps of [CAPS14, CAPS15]) {
        const rule = fullRule(family);
        assert.deepEqual(ruleSaveOps(family, rule, ruleFormFrom(rule), caps), []);
      }
    }
  });

  it("emptying a full route rule emits one delete per CLI node", () => {
    const rule = fullRule("route");
    assert.deepEqual(ruleSaveOps("route", rule, emptied(rule), CAPS15), [
      { op: "delete_rule_description" },
      { op: "delete_rule_disable" },
      { op: "delete_rule_log" },
      { op: "delete_rule_action" },
      { op: "delete_match_source" },
      { op: "delete_match_destination" },
      { op: "delete_match_protocol" },
      { op: "delete_match_tcp" },
      { op: "delete_match_icmp" },
      { op: "delete_match_ttl_node" },
      { op: "delete_match_fragment_node" },
      { op: "delete_match_ipsec_node" },
      { op: "delete_match_packet_type" },
      { op: "delete_match_packet_length", value: "64" },
      { op: "delete_match_packet_length_exclude", value: "1500" },
      { op: "delete_match_dscp", value: "10" },
      { op: "delete_match_dscp_exclude", value: "11" },
      { op: "delete_match_state", value: "established" },
      { op: "delete_match_mark" },
      { op: "delete_match_connection_mark", value: "7" },
      { op: "delete_match_time" },
      { op: "delete_match_limit" },
      { op: "delete_match_recent" },
      { op: "delete_set" },
    ]);
  });

  it("emptying a full route6 rule deletes the icmpv6 and hop-limit nodes", () => {
    const rule = fullRule("route6");
    const n = names(ruleSaveOps("route6", rule, emptied(rule), CAPS15));
    assert.ok(n.includes("delete_match_icmpv6"));
    assert.ok(!n.includes("delete_match_icmpv6_type"));
    assert.ok(n.includes("delete_match_hop_limit_node"));
    assert.ok(!n.includes("delete_match_icmp"));
    assert.ok(!n.includes("delete_match_ttl_node"));
  });

  it("clearing every single leaf while a sibling stays emits each leaf delete", () => {
    const rule = fullRule("route");
    const form = ruleFormFrom(rule);
    // Keep one leaf per node so no node becomes empty.
    for (const key of [
      "source_mac_address",
      "source_port",
      "source_group_address",
      "source_group_mac",
      "destination_address",
      "destination_group_network",
      "destination_group_mac",
      "icmp_code",
      "icmp_type",
      "ttl_eq",
      "ttl_gt",
      "time_monthdays",
      "time_startdate",
      "time_starttime",
      "time_stopdate",
      "limit_rate",
      "set_connection_mark",
      "set_dscp",
      "set_mark",
      "set_table",
      "set_vrf",
    ] as const) {
      form[key] = "";
    }
    form.time_weekdays = [];
    form.time_utc = false;
    form.source_geoip_asn = [];
    form.source_geoip_inverse = false;
    form.destination_geoip_country_code = [];
    form.tcp_flags_not = [];
    form.tcp_flags = ["syn"];
    form.set_tcp_mss = "1400";
    assert.deepEqual(ruleSaveOps("route", rule, form, CAPS15), [
      { op: "delete_match_source_mac_address" },
      { op: "delete_match_source_port" },
      { op: "delete_match_source_group_address" },
      { op: "delete_match_source_group_mac" },
      { op: "delete_match_source_geoip_asn", value: "64512" },
      { op: "delete_match_source_geoip_inverse" },
      { op: "delete_match_destination_address" },
      { op: "delete_match_destination_group_mac" },
      { op: "delete_match_destination_group_network" },
      { op: "delete_match_destination_geoip_country_code", value: "fr" },
      { op: "delete_match_tcp_flag", value: "ack" },
      { op: "delete_match_tcp_flags_not" },
      { op: "delete_match_icmp_code" },
      { op: "delete_match_icmp_type" },
      { op: "delete_match_ttl", value: "eq" },
      { op: "delete_match_ttl", value: "gt" },
      { op: "delete_match_time_monthdays" },
      { op: "delete_match_time_startdate" },
      { op: "delete_match_time_starttime" },
      { op: "delete_match_time_stopdate" },
      { op: "delete_match_time_weekdays" },
      { op: "delete_match_time_utc" },
      { op: "delete_match_limit_rate" },
      { op: "delete_connection_mark" },
      { op: "delete_dscp" },
      { op: "delete_mark" },
      { op: "delete_table" },
      { op: "delete_vrf" },
    ]);
  });

  it("clears the remaining single leaves of other nodes", () => {
    const rule = fullRule("route6");
    const form = ruleFormFrom(rule);
    form.source_address = "";
    form.source_group_port = "";
    form.destination_port = "";
    form.destination_group_port = "";
    form.tcp_mss = "";
    form.hop_limit_lt = "";
    form.time_stoptime = "";
    form.limit_burst = "";
    form.set_tcp_mss = "";
    form.icmpv6_type = "packet-too-big";
    assert.deepEqual(ruleSaveOps("route6", rule, form, CAPS15), [
      { op: "delete_match_source_address" },
      { op: "delete_match_source_group_port" },
      { op: "delete_match_destination_port" },
      { op: "delete_match_destination_group_port" },
      { op: "delete_match_tcp_mss" },
      { op: "set_match_icmpv6_type", value: "packet-too-big" },
      { op: "delete_match_hop_limit", value: "lt" },
      { op: "delete_match_time_stoptime" },
      { op: "delete_match_limit_burst" },
      { op: "delete_tcp_mss" },
    ]);
  });

  it("clears group, geoip and tcp flag nodes as a whole when the side keeps other leaves", () => {
    const rule = fullRule("route");
    const form = ruleFormFrom(rule);
    form.source_group_address = "";
    form.source_group_mac = "";
    form.source_group_port = "";
    form.source_port = "";
    form.source_geoip_country_code = [];
    form.source_geoip_asn = [];
    form.source_geoip_inverse = false;
    form.destination_group_network = "";
    form.destination_group_mac = "";
    form.destination_group_port = "";
    form.destination_port = "";
    form.destination_geoip_country_code = [];
    form.destination_geoip_asn = [];
    form.destination_geoip_inverse = false;
    form.tcp_flags = [];
    form.tcp_flags_not = [];
    form.set_tcp_mss = "";
    assert.deepEqual(ruleSaveOps("route", rule, form, CAPS15), [
      { op: "delete_match_source_port" },
      { op: "delete_match_source_group" },
      { op: "delete_match_source_geoip" },
      { op: "delete_match_destination_port" },
      { op: "delete_match_destination_group" },
      { op: "delete_match_destination_geoip" },
      { op: "delete_match_tcp_flags" },
      { op: "delete_tcp_mss" },
    ]);
  });

  it("changing a single leaf is one set, never a delete then set", () => {
    const rule = fullRule("route");
    const form = ruleFormFrom(rule);
    form.source_address = "10.1.0.0/16";
    form.ttl_eq = "32";
    form.set_table = "main";
    form.limit_rate = "5/minute";
    form.time_weekdays = ["Friday", "Monday"];
    assert.deepEqual(ruleSaveOps("route", rule, form, CAPS15), [
      { op: "set_match_source_address", value: "10.1.0.0/16" },
      { op: "set_match_ttl", value: "eq|32" },
      { op: "set_match_time_weekdays", value: "Monday,Friday" },
      { op: "set_match_limit_rate", value: "5/minute" },
      { op: "set_table", value: "main" },
    ]);
  });

  it("each multi leaf deletes only removed values and sets only added ones", () => {
    const rule = fullRule("route");
    const form = ruleFormFrom(rule);
    form.source_geoip_country_code = ["us"];
    form.destination_geoip_asn = ["64513", "64514"];
    form.tcp_flags = ["syn", "fin"];
    form.tcp_flags_not = ["rst", "urg"];
    form.fragment = ["match-frag", "match-non-frag"];
    form.ipsec = ["match-none-out"];
    form.packet_length = ["64", "128"];
    form.packet_length_exclude = ["9000"];
    form.dscp = ["12"];
    form.dscp_exclude = ["11", "13"];
    form.state = ["new"];
    form.connection_mark = ["7", "8"];
    assert.deepEqual(ruleSaveOps("route", rule, form, CAPS15), [
      { op: "delete_match_source_geoip_country_code", value: "de" },
      { op: "set_match_source_geoip_country_code", value: "us" },
      { op: "set_match_destination_geoip_asn", value: "64514" },
      { op: "delete_match_tcp_flag", value: "ack" },
      { op: "set_match_tcp_flag", value: "fin" },
      { op: "set_match_tcp_flag_not", value: "urg" },
      { op: "set_match_fragment", value: "match-non-frag" },
      { op: "delete_match_ipsec", value: "match-ipsec-in" },
      { op: "set_match_ipsec", value: "match-none-out" },
      { op: "set_match_packet_length", value: "128" },
      { op: "delete_match_packet_length_exclude", value: "1500" },
      { op: "set_match_packet_length_exclude", value: "9000" },
      { op: "delete_match_dscp", value: "10" },
      { op: "set_match_dscp", value: "12" },
      { op: "set_match_dscp_exclude", value: "13" },
      { op: "delete_match_state", value: "established" },
      { op: "set_match_state", value: "new" },
      { op: "set_match_connection_mark", value: "8" },
    ]);
  });

  it("removes the recent node only as a whole; recent leaves are never set", () => {
    const rule = fullRule("route");
    const keep = ruleFormFrom(rule);
    keep.recent_count = "9";
    assert.deepEqual(ruleSaveOps("route", rule, keep, CAPS15), []);
    const cleared = ruleFormFrom(rule);
    cleared.recent_count = "";
    cleared.recent_time = "";
    assert.deepEqual(ruleSaveOps("route", rule, cleared, CAPS15), [{ op: "delete_match_recent" }]);
  });

  it("clears a 1.4 limit rate but never sets one", () => {
    const rule = bareRule();
    rule.match.limit_rate = "10";
    rule.match.limit_burst = "5";
    const form = ruleFormFrom(rule);
    form.limit_rate = "";
    assert.deepEqual(ruleSaveOps("route", rule, form, CAPS14), [{ op: "delete_match_limit_rate" }]);
    const set = ruleFormFrom(bareRule());
    set.limit_rate = "10";
    assert.deepEqual(ruleSaveOps("route", bareRule(), set, CAPS14), []);
  });

  it("an edit never emits create_rule and ignores a changed rule number", () => {
    const rule = fullRule("route");
    const form = ruleFormFrom(rule);
    form.rule_number = "999";
    assert.deepEqual(ruleSaveOps("route", rule, form, CAPS15), []);
  });
});

describe("routeRuleProblem", () => {
  const problem = (form: RouteRuleForm, caps = CAPS15, family: "route" | "route6" = "route", existing: number[] = []) =>
    routeRuleProblem(family, null, form, caps, existing);
  const key = (...args: Parameters<typeof problem>) => problem(...args)?.key ?? null;
  const base = () => emptyRuleForm("10");

  it("accepts a full tcp rule of each family and an empty one", () => {
    const route = fullForm("route");
    route.icmp_code = "";
    route.icmp_type = "";
    route.icmp_type_name = "";
    assert.equal(key(route), null);
    const route6 = fullForm("route6");
    route6.icmpv6_type = "";
    assert.equal(key(route6, CAPS15, "route6"), null);
    assert.equal(key(base()), null);
  });

  it("checks the rule number on create", () => {
    assert.equal(key(emptyRuleForm(" ")), "ruleNumberRequired");
    for (const value of ["0", "1000000", "1.5", "1e2", "-1"]) {
      assert.deepEqual(problem(emptyRuleForm(value)), { key: "ruleNumberRange", min: 1, max: 999999, value: undefined });
    }
    assert.equal(key(emptyRuleForm(" 10 "), CAPS15, "route", [10]), "ruleNumberTaken");
    assert.equal(key(emptyRuleForm("11"), CAPS15, "route", [10]), null);
    assert.equal(routeRuleProblem("route", bareRule(10), emptyRuleForm("10"), CAPS15, [10]), null);
  });

  it("bounds the description", () => {
    const f = base();
    f.description = "x".repeat(256);
    assert.deepEqual(problem(f), { key: "descriptionTooLong", max: 255 });
    f.description = ` ${"x".repeat(255)} `;
    assert.equal(key(f), null);
  });

  it("lab 1: tcp flags, tcp flags not and tcp mss need protocol tcp", () => {
    for (const set of [
      (f: RouteRuleForm) => { f.tcp_flags = ["syn"]; },
      (f: RouteRuleForm) => { f.tcp_flags_not = ["rst"]; },
      (f: RouteRuleForm) => { f.tcp_mss = "1400"; },
    ]) {
      const f = base();
      set(f);
      f.protocol = "udp";
      assert.equal(key(f), "tcpNeedsProtocolTcp");
      f.protocol = " tcp ";
      assert.equal(key(f), null);
    }
    const f = base();
    f.tcp_mss = "1400";
    assert.equal(key(f, CAPS14), null, "tcp mss is not sent on 1.4");
  });

  it("lab 2: set tcp-mss needs tcp flags syn", () => {
    const f = base();
    f.protocol = "tcp";
    f.set_tcp_mss = "1400";
    assert.equal(key(f), "setTcpMssNeedsSyn");
    f.tcp_flags = ["ack"];
    assert.equal(key(f), "setTcpMssNeedsSyn");
    f.tcp_flags = ["syn"];
    assert.equal(key(f), null);
    f.protocol = "";
    assert.equal(key(f), "tcpNeedsProtocolTcp");
  });

  it("lab 3: a port or port group needs a protocol", () => {
    for (const field of ["source_port", "destination_port", "source_group_port", "destination_group_port"] as const) {
      const f = base();
      f[field] = "80";
      assert.equal(key(f), "portNeedsProtocol", field);
      f.protocol = "udp";
      assert.equal(key(f), null, field);
    }
  });

  it("lab 4: icmp leaves need protocol icmp, icmpv6 type needs icmpv6", () => {
    for (const field of ["icmp_code", "icmp_type", "icmp_type_name"] as const) {
      const f = base();
      f[field] = field === "icmp_type_name" ? "echo-request" : "8";
      f.protocol = "tcp";
      assert.equal(key(f), "icmpNeedsProtocolIcmp");
      f.protocol = "icmp";
      assert.equal(key(f), null);
    }
    const f = base();
    f.icmpv6_type = "echo-request";
    for (const protocol of ["ipv6-icmp", "58", ""]) {
      f.protocol = protocol;
      assert.equal(key(f, CAPS15, "route6"), "icmpv6NeedsProtocolIcmpv6", protocol);
    }
    f.protocol = "icmpv6";
    assert.equal(key(f, CAPS15, "route6"), null);
  });

  it("lab 5: one of address, domain and network group per side; mac and port combine", () => {
    const f = base();
    f.source_group_address = "A";
    f.source_group_network = "N";
    assert.equal(key(f), "sourceGroupConflict");
    f.source_group_network = "";
    f.source_group_domain = "D";
    assert.equal(key(f), "sourceGroupConflict");
    const d = base();
    d.destination_group_network = "N";
    d.destination_group_domain = "D";
    assert.equal(key(d), "destinationGroupConflict");
    const ok = base();
    ok.source_address = "10.0.0.0/8";
    ok.source_group_address = "A";
    ok.source_group_mac = "M";
    ok.source_group_port = "P";
    ok.protocol = "tcp";
    assert.equal(key(ok), null);
  });

  it("lab 6: a tcp flag cannot be both set and negated", () => {
    const f = base();
    f.protocol = "tcp";
    f.tcp_flags = ["syn", "ack"];
    f.tcp_flags_not = [" ack "];
    assert.deepEqual(problem(f), { key: "tcpFlagConflict", value: "ack" });
  });

  it("lab 7: weekdays must be full names from the capability list", () => {
    const f = base();
    f.time_weekdays = ["Mon"];
    assert.deepEqual(problem(f), { key: "weekdayInvalid", value: "Mon" });
    f.time_weekdays = ["Sunday", "Monday"];
    assert.equal(key(f), null);
  });

  it("lab 8: limit rate is <n>/<unit> on 1.5 and cannot be set on 1.4", () => {
    const f = base();
    f.limit_rate = "10";
    assert.equal(key(f, CAPS14), "limitRateUnsupported");
    for (const bad of ["10", "10/week", "x/second", "10/second/1", "4294967296/second"]) {
      f.limit_rate = bad;
      assert.equal(key(f), "limitRateInvalid", bad);
    }
    f.limit_rate = " 10/second ";
    assert.equal(key(f), null);
    const burst = base();
    burst.limit_burst = "5";
    assert.equal(key(burst, CAPS14), null);
  });

  it("checks every capability range with {min}/{max}", () => {
    const cases: [(f: RouteRuleForm) => void, string, number, number, "route" | "route6"][] = [
      [(f) => { f.protocol = "icmp"; f.icmp_code = "256"; }, "icmpCodeRange", 0, 255, "route"],
      [(f) => { f.protocol = "icmp"; f.icmp_type = "x"; }, "icmpTypeRange", 0, 255, "route"],
      [(f) => { f.ttl_gt = "256"; }, "ttlRange", 0, 255, "route"],
      [(f) => { f.hop_limit_lt = "1.5"; }, "hopLimitRange", 0, 255, "route6"],
      [(f) => { f.protocol = "tcp"; f.tcp_mss = "16385"; }, "tcpMssRange", 1, 16384, "route"],
      [(f) => { f.packet_length_exclude = ["0"]; }, "packetLengthRange", 1, 65535, "route"],
      [(f) => { f.dscp = ["64"]; }, "dscpRange", 0, 63, "route"],
      [(f) => { f.mark = "2147483648"; }, "markRange", 0, 2147483647, "route"],
      [(f) => { f.connection_mark = ["x"]; }, "connectionMarkRange", 0, 2147483647, "route"],
      [(f) => { f.limit_burst = "-1"; }, "limitBurstRange", 0, 4294967295, "route"],
      [(f) => { f.source_geoip_asn = ["0"]; }, "geoipAsnRange", 1, 4294967294, "route"],
      [(f) => { f.set_connection_mark = "2147483648"; }, "setConnectionMarkRange", 0, 2147483647, "route"],
      [(f) => { f.set_dscp = "64"; }, "setDscpRange", 0, 63, "route"],
      [(f) => { f.set_mark = "0"; }, "setMarkRange", 1, 2147483647, "route"],
      [(f) => { f.set_table = "201"; }, "setTableRange", 1, 200, "route"],
      [(f) => { f.protocol = "tcp"; f.tcp_flags = ["syn"]; f.set_tcp_mss = "499"; }, "setTcpMssRange", 500, 1460, "route"],
    ];
    for (const [edit, expected, min, max, family] of cases) {
      const f = base();
      edit(f);
      const issue = problem(f, CAPS15, family);
      assert.equal(issue?.key, expected);
      assert.equal(issue?.min, min, expected);
      assert.equal(issue?.max, max, expected);
    }
    const ranges = base();
    ranges.packet_length = ["64-128", "1500"];
    ranges.dscp = ["0-10"];
    ranges.mark = "!5";
    ranges.set_table = "main";
    assert.equal(key(ranges), null);
    ranges.dscp = ["10-0"];
    assert.equal(key(ranges), "dscpRange");
  });

  it("lab: mark takes a number, a range, !n and !A-B", () => {
    for (const value of ["5", "5-10", "!5", "!5-10"]) {
      const f = base();
      f.mark = value;
      assert.equal(key(f), null, value);
    }
    for (const value of ["!!5", "!", "10-5", "x"]) {
      const f = base();
      f.mark = value;
      assert.equal(key(f), "markRange", value);
    }
  });

  it("lab: dscp, packet length and match tcp mss reject a leading !", () => {
    const cases: [(f: RouteRuleForm, v: string) => void, string][] = [
      [(f, v) => { f.dscp = [v]; }, "dscp"],
      [(f, v) => { f.dscp_exclude = [v]; }, "dscp_exclude"],
      [(f, v) => { f.packet_length = [v]; }, "packet_length"],
      [(f, v) => { f.packet_length_exclude = [v]; }, "packet_length_exclude"],
      [(f, v) => { f.protocol = "tcp"; f.tcp_mss = v; }, "tcp_mss"],
    ];
    for (const [edit, label] of cases) {
      for (const value of ["!10", "!10-20"]) {
        const f = base();
        edit(f, value);
        assert.deepEqual(problem(f), { key: "negationNotAllowed", value }, `${label} ${value}`);
      }
      for (const value of ["10", "10-20"]) {
        const f = base();
        edit(f, value);
        assert.equal(key(f), null, `${label} ${value}`);
      }
    }
    const v14 = base();
    v14.tcp_mss = "!10";
    assert.equal(key(v14, CAPS14), null, "tcp mss is not sent on 1.4");
  });

  it("lab: match connection-mark is a plain number only", () => {
    for (const value of ["5-10", "!5", "x"]) {
      const f = base();
      f.connection_mark = [value];
      assert.deepEqual(problem(f), { key: "connectionMarkRange", min: 0, max: 2147483647, value }, value);
    }
    const f = base();
    f.connection_mark = ["5", "2147483647"];
    assert.equal(key(f), null);
  });

  it("rejects a geoip country the capability list lacks", () => {
    const f = base();
    f.destination_geoip_country_code = ["XX"];
    assert.deepEqual(problem(f), { key: "geoipCountryUnknown", value: "xx" });
    f.destination_geoip_country_code = [" US "];
    assert.equal(key(f), null);
  });
});

describe("policy ops", () => {
  const policy = (): PolicyRoute => ({
    name: "PBR",
    policy_type: "route",
    description: "old",
    default_log: true,
    interfaces: ["eth0", "eth1"],
    rules: [],
  });

  it("creates with every filled leaf", () => {
    assert.deepEqual(
      policyCreateOps({ name: " PBR ", description: " d ", default_log: true, interfaces: ["eth0", " eth0 ", "eth1"] }),
      [
        { op: "create_policy" },
        { op: "set_policy_description", value: "d" },
        { op: "set_policy_default_log" },
        { op: "set_interface_policy", value: "eth0" },
        { op: "set_interface_policy", value: "eth1" },
      ],
    );
    assert.deepEqual(policyCreateOps({ name: "P", description: "  ", default_log: false, interfaces: [] }), [
      { op: "create_policy" },
    ]);
  });

  it("updates only what changed", () => {
    assert.deepEqual(policyUpdateOps(policy(), policyFormFrom(policy())), []);
    assert.deepEqual(policyUpdateOps(policy(), { name: "PBR", description: "", default_log: false, interfaces: [] }), [
      { op: "delete_policy_description" },
      { op: "delete_policy_default_log" },
      { op: "delete_interface_policy", value: "eth0" },
      { op: "delete_interface_policy", value: "eth1" },
    ]);
    assert.deepEqual(
      policyUpdateOps(policy(), { name: "PBR", description: "new", default_log: true, interfaces: ["eth1", "eth2"] }),
      [
        { op: "set_policy_description", value: "new" },
        { op: "delete_interface_policy", value: "eth0" },
        { op: "set_interface_policy", value: "eth2" },
      ],
    );
  });

  it("checks the name and description", () => {
    const form = (name: string, description = "") => ({ name, description, default_log: false, interfaces: [] });
    assert.equal(policyProblem(form("  "), [], CAPS15)?.key, "nameRequired");
    assert.equal(policyProblem(form("a b"), [], CAPS15)?.key, "nameInvalid");
    assert.equal(policyProblem(form(" PBR "), ["PBR"], CAPS15)?.key, "nameTaken");
    assert.equal(policyProblem(form("pbr"), ["PBR"], CAPS15), null);
    assert.deepEqual(policyProblem(form("P", "x".repeat(256)), null, CAPS15), { key: "descriptionTooLong", max: 255 });
    assert.equal(policyProblem(form(""), null, CAPS15), null);
  });
});

describe("routeService", () => {
  function stubbed() {
    const posted: RouteBatchRequest[] = [];
    const service = Object.create(routeService) as typeof routeService;
    service.batchConfigure = async (request: RouteBatchRequest) => {
      posted.push(request);
      return { success: true };
    };
    return { service, posted };
  }

  it("posts policy ops without a rule number and rule ops with one", async () => {
    const { service, posted } = stubbed();
    const policy: PolicyRoute = {
      name: "PBR",
      policy_type: "route6",
      description: null,
      default_log: false,
      interfaces: [],
      rules: [],
    };
    await service.createPolicy("route", { name: " NEW ", description: "", default_log: false, interfaces: [] });
    await service.updatePolicy(policy, { name: "x", description: "d", default_log: false, interfaces: [] });
    await service.deletePolicy(policy);
    const form = emptyRuleForm(" 20 ");
    form.action = "drop";
    await service.saveRule("route", "PBR", null, form, CAPS15);
    const stored = bareRule(10);
    const edit = ruleFormFrom(stored);
    edit.rule_number = "99";
    edit.description = "d";
    await service.saveRule("route6", "PBR", stored, edit, CAPS15);
    await service.deleteRule("route", "PBR", 10);
    assert.deepEqual(posted, [
      { policy_type: "route", name: "NEW", operations: [{ op: "create_policy" }] },
      { policy_type: "route6", name: "PBR", operations: [{ op: "set_policy_description", value: "d" }] },
      { policy_type: "route6", name: "PBR", operations: [{ op: "delete_policy" }] },
      {
        policy_type: "route",
        name: "PBR",
        rule_number: 20,
        operations: [{ op: "create_rule" }, { op: "set_rule_action", value: "drop" }],
      },
      {
        policy_type: "route6",
        name: "PBR",
        rule_number: 10,
        operations: [{ op: "set_rule_description", value: "d" }],
      },
      { policy_type: "route", name: "PBR", rule_number: 10, operations: [{ op: "delete_rule" }] },
    ]);
  });
});

describe("batchConfigure and reorder", () => {
  async function withPost(reply: { success: boolean; error?: string }, run: (posts: unknown[]) => Promise<void>) {
    const posts: unknown[] = [];
    const original = apiClient.post;
    apiClient.post = (async (endpoint: string, body?: unknown) => {
      posts.push([endpoint, body]);
      return reply;
    }) as typeof apiClient.post;
    try {
      await run(posts);
    } finally {
      apiClient.post = original;
    }
  }

  it("makes no POST for an unchanged edit", async () => {
    await withPost({ success: true }, async (posts) => {
      const rule = fullRule("route");
      assert.deepEqual(await routeService.saveRule("route", "PBR", rule, ruleFormFrom(rule), CAPS15), { success: true });
      assert.deepEqual(posts, []);
    });
  });

  it("throws the device error on a rejected commit", async () => {
    await withPost({ success: false, error: "Commit failed" }, async (posts) => {
      await assert.rejects(routeService.deleteRule("route", "PBR", 10), { message: "Commit failed" });
      assert.deepEqual(posts, [
        ["/vyos/route/batch", { policy_type: "route", name: "PBR", rule_number: 10, operations: [{ op: "delete_rule" }] }],
      ]);
    });
    await withPost({ success: false }, async () => {
      await assert.rejects(routeService.deleteRule("route", "PBR", 10), { message: "" });
    });
  });

  it("reorder posts every rule number and throws on a rejected commit", async () => {
    await withPost({ success: true }, async (posts) => {
      await routeService.reorderRules("route", "PBR", [20, 10, 30]);
      assert.deepEqual(posts, [
        ["/vyos/route/reorder", { policy_type: "route", policy_name: "PBR", rule_numbers: [20, 10, 30] }],
      ]);
    });
    await withPost({ success: false, error: "bad" }, async () => {
      await assert.rejects(routeService.reorderRules("route", "PBR", [1]), { message: "bad" });
    });
  });
});
