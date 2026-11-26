import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { apiClient } from "./client";
import {
  routeMapService,
  type MatchConditions,
  type RouteMap,
  type RouteMapBatchRequest,
  type RouteMapCapabilities,
  type RouteMapRule,
  type SetActions,
} from "./route-map";
import {
  emptyRuleForm,
  mapCreateOps,
  mapDeleteOps,
  mapUpdateOps,
  routeMapProblem,
  routeMapRuleProblem,
  ruleDeleteOps,
  ruleFormFrom,
  ruleSaveOps,
  type RouteMapRuleForm,
} from "./route-map-save-ops";

// ----------------------------------------------------------------------------
// Fixtures (the backend's get_capabilities() for 1.4 and 1.5)
// ----------------------------------------------------------------------------

const feature = (supported: boolean) => ({ supported, description: "" });

function caps(v15: boolean): RouteMapCapabilities {
  const routeTypes = v15
    ? ["ead", "macip", "multicast", "es", "prefix", "1", "2", "3", "4", "5"]
    : ["macip", "multicast", "prefix"];
  const u32 = 4294967295;
  return {
    version: v15 ? "1.5-rolling-202511" : "1.4.3",
    features: {
      basic: feature(true),
      rules: feature(true),
      match_conditions: feature(true),
      match_rpki_extcommunity: feature(v15),
      match_source_peer: feature(v15),
      match_evpn: feature(true),
      set_actions: feature(true),
      bgp_attributes: feature(true),
      call_continue: feature(true),
      on_match: feature(true),
    },
    values: {
      rule_actions: ["permit", "deny"],
      origins: ["egp", "igp", "incomplete"],
      rpki_states: ["invalid", "notfound", "valid"],
      metric_types: ["type-1", "type-2"],
      protocols: ["babel", "bgp", "connected", "isis", "kernel", "ospf", "ospfv3", "rip", "ripng", "static", "table", "vnc"],
      nexthop_types: ["blackhole"],
      evpn_route_types: routeTypes,
      extcommunity_bandwidth_keywords: ["cumulative", "num-multipaths"],
      community_well_known: ["local-as", "no-advertise", "no-export", "graceful-shutdown", "blackhole", "no-peer"],
    },
    ranges: {
      rule: { min: 1, max: 65535 },
      continue: { min: 1, max: 65535 },
      on_match_goto: { min: 1, max: 65535 },
      match_local_preference: { min: 0, max: u32 },
      match_metric: { min: 1, max: 65535 },
      match_tag: { min: 1, max: 65535 },
      ip_prefix_len: { min: 0, max: 32 },
      ipv6_prefix_len: { min: 0, max: 128 },
      aggregator_as: { min: 1, max: u32 },
      as_number: { min: 1, max: u32 },
      as_path_prepend_last_as: { min: 1, max: 10 },
      distance: { min: 0, max: 255 },
      local_preference: { min: 0, max: u32 },
      weight: { min: 0, max: u32 },
      metric: { min: 0, max: u32 },
      tag: { min: 1, max: 65535 },
      extcommunity_bandwidth: { min: 1, max: 25600 },
      community_part: { min: 0, max: 65535 },
      large_community_part: { min: 0, max: u32 },
      extcommunity_asn: { min: 0, max: 65535 },
      extcommunity_asn_value: { min: 0, max: u32 },
      extcommunity_ip_value: { min: 0, max: 65535 },
      ip_access_list: { min: 0, max: u32 },
      evpn_vni: { min: 1, max: 16777214 },
      evpn_rd_asn4: { min: 65536, max: u32 },
      evpn_rd_asn4_value: { min: 0, max: 65535 },
      table: { min: 1, max: v15 ? u32 : 200 },
    },
    description_max_length: 255,
    as_path_prepend_exclusive: v15,
  };
}

const CAPS14 = caps(false);
const CAPS15 = caps(true);

const NO_MATCH: MatchConditions = {
  as_path: null,
  community_list: null,
  community_exact_match: false,
  extcommunity: null,
  large_community_list: null,
  local_preference: null,
  metric: null,
  origin: null,
  peer: null,
  rpki: null,
  rpki_extcommunity: null,
  source_peer: null,
  evpn_default_route: false,
  evpn_rd: null,
  evpn_route_type: null,
  evpn_vni: null,
  ip_address_access_list: null,
  ip_address_prefix_list: null,
  ip_address_prefix_len: null,
  ipv6_address_access_list: null,
  ipv6_address_prefix_list: null,
  ipv6_address_prefix_len: null,
  ip_nexthop_access_list: null,
  ip_nexthop_address: null,
  ip_nexthop_prefix_len: null,
  ip_nexthop_prefix_list: null,
  ip_nexthop_type: null,
  ipv6_nexthop_access_list: null,
  ipv6_nexthop_address: null,
  ipv6_nexthop_prefix_list: null,
  ipv6_nexthop_type: null,
  ip_route_source_access_list: null,
  ip_route_source_prefix_list: null,
  interface: null,
  protocol: null,
  source_vrf: null,
  tag: null,
};

const NO_SET: SetActions = {
  as_path_exclude: null,
  as_path_prepend: null,
  as_path_prepend_last_as: null,
  community_add_values: [],
  community_replace_values: [],
  community_delete: null,
  community_remove_all: false,
  large_community_add_values: [],
  large_community_replace_values: [],
  large_community_delete: null,
  large_community_remove_all: false,
  extcommunity_bandwidth: null,
  extcommunity_bandwidth_non_transitive: false,
  extcommunity_rt: [],
  extcommunity_soo: [],
  extcommunity_none: false,
  atomic_aggregate: false,
  aggregator_as: null,
  aggregator_ip: null,
  local_preference: null,
  origin: null,
  originator_id: null,
  weight: null,
  ip_nexthop: null,
  ip_nexthop_peer_address: false,
  ip_nexthop_unchanged: false,
  ipv6_nexthop_global: null,
  ipv6_nexthop_local: null,
  ipv6_nexthop_peer_address: false,
  ipv6_nexthop_prefer_global: false,
  l3vpn_nexthop_encapsulation_gre: false,
  evpn_gateway_ipv4: null,
  evpn_gateway_ipv6: null,
  distance: null,
  metric: null,
  metric_type: null,
  src: null,
  table: null,
  tag: null,
};

function rule(match: Partial<MatchConditions> = {}, set: Partial<SetActions> = {}, extra: Partial<RouteMapRule> = {}): RouteMapRule {
  return {
    rule_number: 10,
    description: null,
    action: "permit",
    call: null,
    continue_rule: null,
    on_match_goto: null,
    on_match_next: false,
    match: { ...NO_MATCH, ...match },
    set: { ...NO_SET, ...set },
    ...extra,
  };
}

const MAP: RouteMap = { name: "RM", description: "edge", rules: [rule()] };

function edit(original: RouteMapRule, change: Partial<RouteMapRuleForm>, c: RouteMapCapabilities = CAPS15) {
  return ruleSaveOps(original, { ...ruleFormFrom(original), ...change }, c);
}

function createForm(change: Partial<RouteMapRuleForm>): RouteMapRuleForm {
  return { ...emptyRuleForm("10", "permit"), ...change };
}

// ----------------------------------------------------------------------------
// Route-map ops
// ----------------------------------------------------------------------------

describe("route-map ops", () => {
  it("create sets the route-map and a trimmed description", () => {
    assert.deepEqual(mapCreateOps({ name: " RM ", description: " edge " }), [
      { op: "set_route_map" },
      { op: "set_route_map_description", value: "edge" },
    ]);
    assert.deepEqual(mapCreateOps({ name: "RM", description: "" }), [{ op: "set_route_map" }]);
  });

  it("edit changes, clears or keeps the description", () => {
    assert.deepEqual(mapUpdateOps(MAP, { name: "RM", description: "core" }), [
      { op: "set_route_map_description", value: "core" },
    ]);
    assert.deepEqual(mapUpdateOps(MAP, { name: "RM", description: " " }), [{ op: "delete_route_map_description" }]);
    assert.deepEqual(mapUpdateOps(MAP, { name: "RM", description: "edge " }), []);
  });

  it("deletes are plain batches", () => {
    assert.deepEqual(mapDeleteOps(), [{ op: "delete_route_map" }]);
    assert.deepEqual(ruleDeleteOps(), [{ op: "delete_rule" }]);
  });
});

// ----------------------------------------------------------------------------
// Rule ops
// ----------------------------------------------------------------------------

describe("rule ops", () => {
  it("create starts with set_rule and the required action, then each filled leaf", () => {
    assert.deepEqual(
      ruleSaveOps(null, createForm({ description: " corp ", match_as_path: "ASP", set_local_preference: "200" }), CAPS15),
      [
        { op: "set_rule" },
        { op: "set_rule_action", value: "permit" },
        { op: "set_rule_description", value: "corp" },
        { op: "set_match_as_path", value: "ASP" },
        { op: "set_local_preference", value: "200" },
      ],
    );
  });

  it("an untouched edit sends nothing, on both versions", () => {
    const loaded = rule(
      { as_path: "ASP", community_list: "CL", community_exact_match: true, ip_address_prefix_list: "PL", tag: 5, ipv6_nexthop_address: "2001:DB8::1" },
      {
        community_add_values: ["65000:1", "no-export"],
        extcommunity_rt: ["65000:100"],
        ip_nexthop_peer_address: true,
        ipv6_nexthop_global: "2001:db8::1",
        metric: "+10",
        as_path_prepend: "65001 65002",
      },
      { description: "corp", continue_rule: 20, on_match_next: true },
    );
    assert.deepEqual(ruleSaveOps(loaded, ruleFormFrom(loaded), CAPS14), []);
    assert.deepEqual(ruleSaveOps(loaded, ruleFormFrom(loaded), CAPS15), []);
  });

  it("an edit never deletes or recreates the rule, and keeps the action unless changed", () => {
    const ops = edit(rule(), { action: "deny", match_tag: "7" });
    assert.deepEqual(ops, [
      { op: "set_rule_action", value: "deny" },
      { op: "set_match_tag", value: "7" },
    ]);
  });

  it("a cleared leaf sends its value-leaf delete in the same batch as the sets", () => {
    const loaded = rule({ ip_address_prefix_list: "PL", ip_address_prefix_len: 24 }, { weight: 5 });
    assert.deepEqual(edit(loaded, { match_ip_address_prefix_len: "", set_weight: "", set_tag: "9" }), [
      { op: "delete_match_ip_address_prefix_len" },
      { op: "delete_set_weight" },
      { op: "set_tag", value: "9" },
    ]);
  });

  it("clearing every child of a node sends that node's delete while its parent keeps a sibling", () => {
    const loaded = rule(
      { community_list: "CL", community_exact_match: true, ip_nexthop_address: "192.0.2.1", ip_address_prefix_len: 24, evpn_rd: "65000:1", large_community_list: "LCL", tag: 5 },
      { aggregator_as: "65000", aggregator_ip: "192.0.2.1", l3vpn_nexthop_encapsulation_gre: true, evpn_gateway_ipv4: "192.0.2.9", tag: 5 },
    );
    assert.deepEqual(
      edit(loaded, {
        match_community_list: "",
        match_community_exact_match: false,
        match_ip_nexthop_address: "",
        match_evpn_rd: "",
        match_large_community_list: "",
        set_aggregator_as: "",
        set_aggregator_ip: "",
        set_l3vpn_nexthop_encapsulation_gre: false,
        set_evpn_gateway_ipv4: "",
      }).map((o) => o.op),
      [
        "delete_match_community",
        "delete_match_large_community",
        "delete_match_evpn",
        "delete_match_ip_nexthop",
        "delete_set_aggregator",
        "delete_set_l3vpn_nexthop",
        "delete_set_evpn",
      ],
    );
  });

  it("clearing one child of a parent keeps the parent: exact-match alone stays", () => {
    const loaded = rule({ community_list: "CL", community_exact_match: true });
    assert.deepEqual(edit(loaded, { match_community_list: "" }), [{ op: "delete_match_community_list" }]);
    assert.deepEqual(edit(loaded, { match_community_exact_match: false }), [
      { op: "delete_match_community_exact_match" },
    ]);
  });

  it("multi leaves set each added value and delete each removed value, never the node", () => {
    const loaded = rule({}, { community_add_values: ["65000:1", "65000:2"], extcommunity_soo: ["65000:9"] });
    assert.deepEqual(
      edit(loaded, {
        set_community_add: ["65000:2", " 65000:3 ", "65000:3"],
        set_extcommunity_rt: ["65000:100"],
      }),
      [
        { op: "delete_set_community_add", value: "65000:1" },
        { op: "set_community_add", value: "65000:3" },
        { op: "set_extcommunity_rt", value: "65000:100" },
      ],
    );
    assert.deepEqual(
      edit(rule({}, { large_community_replace_values: ["1:2:3"], extcommunity_rt: ["65000:1", "65000:2"] }), {
        set_large_community_replace: ["1:2:4"],
        set_extcommunity_rt: ["65000:2"],
      }),
      [
        { op: "delete_set_large_community_replace", value: "1:2:3" },
        { op: "set_large_community_replace", value: "1:2:4" },
        { op: "delete_set_extcommunity_rt", value: "65000:1" },
      ],
    );
  });

  it("community delete and large-community delete are single list names", () => {
    assert.deepEqual(edit(rule({}, { community_delete: "CL1" }), { set_community_delete: "CL2", set_large_community_delete: "LCL" }), [
      { op: "set_community_delete", value: "CL2" },
      { op: "set_large_community_delete", value: "LCL" },
    ]);
    assert.deepEqual(
      edit(rule({}, { community_delete: "CL1", community_add_values: ["65000:1"] }), { set_community_delete: "" }),
      [{ op: "delete_set_community_delete" }],
    );
  });

  it("set ip-next-hop is one leaf: a switch is one set, a clear is one delete", () => {
    const address = rule({}, { ip_nexthop: "192.0.2.1" });
    assert.equal(ruleFormFrom(address).set_ip_nexthop, "192.0.2.1");
    assert.deepEqual(edit(address, { set_ip_nexthop: "peer-address" }), [{ op: "set_ip_nexthop_peer_address" }]);
    assert.deepEqual(edit(address, { set_ip_nexthop: "unchanged" }), [{ op: "set_ip_nexthop_unchanged" }]);
    const peer = rule({}, { ip_nexthop_peer_address: true });
    assert.equal(ruleFormFrom(peer).set_ip_nexthop, "peer-address");
    assert.deepEqual(edit(peer, { set_ip_nexthop: "192.0.2.2" }), [{ op: "set_ip_nexthop", value: "192.0.2.2" }]);
    assert.deepEqual(edit(rule({}, { ip_nexthop_unchanged: true, tag: 5 }), { set_ip_nexthop: "" }), [
      { op: "delete_set_ip_nexthop" },
    ]);
  });

  it("IPv6 values compare compressed and lowercased, and send the typed text", () => {
    const loaded = rule({ ipv6_nexthop_address: "2001:DB8::1" }, { ipv6_nexthop_global: "2001:db8:0::1" });
    assert.deepEqual(edit(loaded, { match_ipv6_nexthop_address: "2001:db8::1", set_ipv6_nexthop_global: "2001:DB8::1" }), []);
    assert.deepEqual(edit(loaded, { set_ipv6_nexthop_global: "2001:db8::2" }), [
      { op: "set_ipv6_nexthop_global", value: "2001:db8::2" },
    ]);
  });

  it("the as-path value is one string of space-separated numbers", () => {
    assert.deepEqual(ruleSaveOps(null, createForm({ set_as_path_prepend: " 65001   65002 " }), CAPS15).slice(2), [
      { op: "set_as_path_prepend", value: "65001 65002" },
    ]);
  });

  it("1.5-only leaves are emitted only where the device has them", () => {
    const form = createForm({ match_rpki_extcommunity: "valid", match_source_peer: "192.0.2.1" });
    assert.deepEqual(ruleSaveOps(null, form, CAPS15).slice(2), [
      { op: "set_match_rpki_extcommunity", value: "valid" },
      { op: "set_match_source_peer", value: "192.0.2.1" },
    ]);
    assert.deepEqual(ruleSaveOps(null, form, CAPS14).slice(2), []);
    assert.deepEqual(ruleSaveOps(null, form, null).slice(2), []);
  });
});


// ----------------------------------------------------------------------------
// Container deletes: a child delete leaves its empty parent on the device at
// every level (lab), so the highest node the edit empties is deleted and
// nothing under it.
// ----------------------------------------------------------------------------

describe("container deletes", () => {
  const ops = (match: Partial<MatchConditions>, set: Partial<SetActions>, change: Partial<RouteMapRuleForm>, extra: Partial<RouteMapRule> = {}) =>
    edit(rule(match, set, extra), change).map((o) => (o.value === undefined ? o.op : `${o.op} ${o.value}`));

  it("rule level: the last match leaf, set leaf or on-match child deletes match, set or on-match", () => {
    assert.deepEqual(ops({ as_path: "ASP" }, {}, { match_as_path: "" }), ["delete_match"]);
    assert.deepEqual(ops({}, { weight: 5 }, { set_weight: "" }), ["delete_set"]);
    assert.deepEqual(ops({}, {}, { on_match_goto: "" }, { on_match_goto: 20 }), ["delete_rule_on_match"]);
    assert.deepEqual(ops({}, {}, { on_match_next: false }, { on_match_next: true }), ["delete_rule_on_match"]);
  });

  it("the highest emptied node wins: emptying match ip deletes it alone; emptying all of match deletes match", () => {
    const match = { ip_address_prefix_list: "PL", ip_address_prefix_len: 24, ip_nexthop_type: "blackhole", ipv6_address_prefix_list: "PL6" };
    const clearIp = { match_ip_address_prefix_list: "", match_ip_address_prefix_len: "", match_ip_nexthop_type: "" };
    assert.deepEqual(ops(match, {}, clearIp), ["delete_match_ip"]);
    assert.deepEqual(ops(match, {}, { ...clearIp, match_ipv6_address_prefix_list: "" }), ["delete_match"]);
    // The last set community value with nothing else under set: set itself.
    assert.deepEqual(ops({}, { community_add_values: ["65000:1"] }, { set_community_add: [] }), ["delete_set"]);
  });

  it("match children: each node is deleted when emptied while a match sibling remains", () => {
    const keep = { tag: 5 };
    const cases: [Partial<MatchConditions>, Partial<RouteMapRuleForm>, string][] = [
      [{ community_list: "CL" }, { match_community_list: "" }, "delete_match_community"],
      [{ community_exact_match: true }, { match_community_exact_match: false }, "delete_match_community"],
      [{ large_community_list: "LCL" }, { match_large_community_list: "" }, "delete_match_large_community"],
      [{ evpn_vni: 100, evpn_default_route: true }, { match_evpn_vni: "", match_evpn_default_route: false }, "delete_match_evpn"],
      [{ ip_route_source_prefix_list: "PL" }, { match_ip_route_source_prefix_list: "" }, "delete_match_ip"],
      [{ ipv6_nexthop_address: "2001:db8::1" }, { match_ipv6_nexthop_address: "" }, "delete_match_ipv6"],
    ];
    for (const [match, change, expected] of cases) {
      assert.deepEqual(ops({ ...match, ...keep }, {}, change), [expected], expected);
    }
  });

  it("match ip and ipv6 children: each node is deleted when emptied while a sibling under ip or ipv6 remains", () => {
    const cases: [Partial<MatchConditions>, Partial<RouteMapRuleForm>, string][] = [
      [{ ip_address_access_list: "500", ip_nexthop_type: "blackhole" }, { match_ip_address_access_list: "" }, "delete_match_ip_address"],
      [{ ip_nexthop_access_list: "2700", ip_address_prefix_len: 24 }, { match_ip_nexthop_access_list: "" }, "delete_match_ip_nexthop"],
      [{ ip_route_source_access_list: "1", ip_address_prefix_len: 24 }, { match_ip_route_source_access_list: "" }, "delete_match_ip_route_source"],
      [{ ipv6_address_prefix_len: 64, ipv6_nexthop_type: "blackhole" }, { match_ipv6_address_prefix_len: "" }, "delete_match_ipv6_address"],
      [{ ipv6_nexthop_prefix_list: "PL6", ipv6_address_prefix_len: 64 }, { match_ipv6_nexthop_prefix_list: "" }, "delete_match_ipv6_nexthop"],
    ];
    for (const [match, change, expected] of cases) {
      assert.deepEqual(ops(match, {}, change), [expected], expected);
    }
  });

  it("set children: each node is deleted when emptied while a set sibling remains", () => {
    const keep = { tag: 5 };
    const cases: [Partial<SetActions>, Partial<RouteMapRuleForm>, string][] = [
      [{ as_path_prepend: "65001", as_path_prepend_last_as: 2 }, { set_as_path_prepend: "", set_as_path_prepend_last_as: "" }, "delete_set_as_path"],
      [{ as_path_exclude: "all" }, { set_as_path_exclude: "" }, "delete_set_as_path"],
      [{ community_add_values: ["65000:1"] }, { set_community_add: [] }, "delete_set_community"],
      [{ community_remove_all: true }, { set_community_none: false }, "delete_set_community"],
      [{ large_community_replace_values: ["1:2:3"] }, { set_large_community_replace: [] }, "delete_set_large_community"],
      [{ extcommunity_rt: ["65000:1"], extcommunity_soo: ["65000:2"] }, { set_extcommunity_rt: [], set_extcommunity_soo: [] }, "delete_set_extcommunity"],
      [{ aggregator_as: "65000", aggregator_ip: "192.0.2.1" }, { set_aggregator_as: "", set_aggregator_ip: "" }, "delete_set_aggregator"],
      [{ ipv6_nexthop_prefer_global: true }, { set_ipv6_nexthop_prefer_global: false }, "delete_set_ipv6_nexthop"],
      [{ l3vpn_nexthop_encapsulation_gre: true }, { set_l3vpn_nexthop_encapsulation_gre: false }, "delete_set_l3vpn_nexthop"],
      [{ evpn_gateway_ipv6: "2001:db8::1" }, { set_evpn_gateway_ipv6: "" }, "delete_set_evpn"],
    ];
    for (const [set, change, expected] of cases) {
      assert.deepEqual(ops({}, { ...set, ...keep }, change), [expected], expected);
    }
  });

  it("a remaining sibling keeps the node: only the child, leaf or value is deleted", () => {
    assert.deepEqual(ops({ ip_address_prefix_list: "PL", ip_address_prefix_len: 24 }, {}, { match_ip_address_prefix_len: "" }), [
      "delete_match_ip_address_prefix_len",
    ]);
    assert.deepEqual(ops({}, {}, { on_match_goto: "" }, { on_match_goto: 20, on_match_next: true }), ["delete_rule_on_match_goto"]);
    assert.deepEqual(ops({}, { as_path_exclude: "65001", as_path_prepend: "65002" }, { set_as_path_exclude: "" }), [
      "delete_set_as_path_exclude",
    ]);
    assert.deepEqual(ops({}, { community_add_values: ["65000:1", "65000:2"] }, { set_community_add: ["65000:2"] }), [
      "delete_set_community_add 65000:1",
    ]);
    assert.deepEqual(ops({}, { community_add_values: ["65000:1"], community_delete: "CL" }, { set_community_add: [] }), [
      "delete_set_community_add 65000:1",
    ]);
    // Emptying a container and setting a sibling in one edit: only the container goes.
    assert.deepEqual(ops({ ip_address_prefix_list: "PL" }, {}, { match_ip_address_prefix_list: "", match_tag: "7" }), [
      "delete_match_ip",
      "set_match_tag 7",
    ]);
  });

  it("an empty container the device already holds (parsed as absent) gets no op; filling it only sets", () => {
    assert.deepEqual(ops({}, {}, {}), []);
    assert.deepEqual(ops({}, {}, { match_ip_address_prefix_len: "24" }), ["set_match_ip_address_prefix_len 24"]);
  });

  it("a leaf the device version lacks is never deleted, and still keeps its parent", () => {
    // Before capabilities load the 1.5-only leaves are gated; the stored value is left alone.
    const loaded = rule({ source_peer: "192.0.2.1", as_path: "ASP" });
    assert.deepEqual(ruleSaveOps(loaded, { ...ruleFormFrom(loaded), match_as_path: "" }, null), [
      { op: "delete_match_as_path" },
    ]);
  });
});
// ----------------------------------------------------------------------------
// Save checks
// ----------------------------------------------------------------------------

describe("rule save checks", () => {
  const check = (form: Partial<RouteMapRuleForm>, c: RouteMapCapabilities = CAPS15, existing: number[] = []) =>
    routeMapRuleProblem(null, createForm(form), c, existing);

  it("rule number: required, in the served range, not taken", () => {
    assert.equal(check({ rule_number: "" })?.key, "ruleNumberRequired");
    assert.deepEqual(check({ rule_number: "0" }), { key: "ruleNumberRange", rule: "0", min: 1, max: 65535, value: undefined });
    assert.equal(check({ rule_number: "1e1" })?.key, "ruleNumberRange");
    assert.equal(check({ rule_number: "010" })?.key, "ruleNumberRange");
    assert.equal(check({}, CAPS15, [10])?.key, "ruleNumberTaken");
    assert.equal(check({}), null);
  });

  it("every rule needs an action (lab verify)", () => {
    assert.deepEqual(check({ action: "" }), { key: "actionRequired", rule: "10" });
  });

  it("continue and on-match goto must name a later rule (lab)", () => {
    assert.equal(check({ continue_rule: "10" })?.key, "continueNotAfterRule");
    assert.equal(check({ on_match_goto: "5" })?.key, "onMatchGotoNotAfterRule");
    assert.equal(check({ on_match_goto: "70000" })?.key, "onMatchGotoRange");
    assert.equal(check({ continue_rule: "11", on_match_goto: "20", on_match_next: true }), null);
    // On edit the stored number is the rule.
    assert.equal(routeMapRuleProblem(rule({}, {}, { rule_number: 30 }), createForm({ continue_rule: "20" }), CAPS15, [30])?.rule, "30");
  });

  it("community none excludes add and replace; add excludes replace (lab)", () => {
    assert.equal(check({ set_community_none: true, set_community_add: ["65000:1"] })?.key, "communityNoneConflict");
    assert.equal(check({ set_community_none: true, set_community_replace: ["65000:1"] })?.key, "communityNoneConflict");
    assert.equal(check({ set_community_add: ["65000:1"], set_community_replace: ["65000:2"] })?.key, "communityAddReplaceConflict");
    assert.equal(check({ set_community_none: true, set_community_delete: "CL" }), null);
    assert.equal(check({ set_large_community_none: true, set_large_community_add: ["1:2:3"] })?.key, "largeCommunityNoneConflict");
    assert.equal(
      check({ set_large_community_add: ["1:2:3"], set_large_community_replace: ["1:2:4"] })?.key,
      "largeCommunityAddReplaceConflict",
    );
  });

  it("community values: AA:NN in range or a served well-known name (no internet)", () => {
    assert.equal(check({ set_community_add: ["65000:1", "no-export"] }), null);
    assert.deepEqual(check({ set_community_add: ["internet"] }), {
      key: "communityValueInvalid",
      rule: "10",
      value: "internet",
      min: 0,
      max: 65535,
    });
    assert.equal(check({ set_community_replace: ["65536:1"] })?.key, "communityValueInvalid");
    assert.equal(check({ set_large_community_add: ["1:2"] })?.key, "largeCommunityValueInvalid");
  });

  it("extcommunity none excludes rt, soo and bandwidth; non-transitive needs a bandwidth (lab)", () => {
    for (const change of [
      { set_extcommunity_rt: ["65000:1"] },
      { set_extcommunity_soo: ["192.0.2.1:5"] },
      { set_extcommunity_bandwidth: "100" },
    ]) {
      assert.equal(check({ set_extcommunity_none: true, ...change })?.key, "extcommunityNoneConflict");
    }
    assert.equal(check({ set_extcommunity_bandwidth_non_transitive: true })?.key, "bandwidthNonTransitiveNeedsBandwidth");
    assert.equal(check({ set_extcommunity_bandwidth: "cumulative", set_extcommunity_bandwidth_non_transitive: true }), null);
    assert.equal(check({ set_extcommunity_bandwidth: "25601" })?.key, "extcommunityBandwidthInvalid");
    // An out-of-range part is a range error naming that part, not a format error.
    assert.deepEqual(check({ set_extcommunity_rt: ["65536:1"] }), {
      key: "extcommunityRtRange",
      rule: "10",
      value: "65536",
      min: 0,
      max: 65535,
      args: { entry: "65536:1" },
    });
    assert.deepEqual(check({ set_extcommunity_soo: ["192.0.2.1:65536"] }), {
      key: "extcommunitySooRange",
      rule: "10",
      value: "65536",
      min: 0,
      max: 65535,
      args: { entry: "192.0.2.1:65536" },
    });
    assert.equal(check({ set_extcommunity_rt: ["65000:4294967296"] })?.key, "extcommunityRtRange");
    for (const bad of ["65000", "x:1", "65000:", "300.0.0.1:1", ":1"]) {
      assert.deepEqual(check({ set_extcommunity_rt: [bad] }), { key: "extcommunityRtInvalid", rule: "10", value: bad }, bad);
    }
    assert.equal(check({ set_extcommunity_soo: ["65000"] })?.key, "extcommunitySooInvalid");
    assert.equal(check({ set_extcommunity_rt: ["65000:4294967295"], set_extcommunity_soo: ["192.0.2.1:65535"] }), null);
  });

  it("as-path: one value of space-separated AS numbers; exclude also takes all", () => {
    assert.equal(check({ set_as_path_prepend: "65001,65002" })?.key, "asPathPrependInvalid");
    assert.equal(check({ set_as_path_exclude: "all" }), null);
    assert.equal(check({ set_as_path_exclude: "0" })?.key, "asPathExcludeInvalid");
    assert.equal(check({ set_as_path_prepend: "65001 65002" }), null);
  });

  it("prepend with prepend-last-as is rejected only where the device rejects it", () => {
    const form = { set_as_path_prepend: "65001", set_as_path_prepend_last_as: "2" };
    assert.equal(check(form, CAPS15)?.key, "asPathPrependWithLastAs");
    assert.equal(check(form, CAPS14), null);
  });

  it("ranges come from capabilities (set table differs by version)", () => {
    assert.deepEqual(check({ set_table: "201" }, CAPS14), { key: "tableRange", rule: "10", min: 1, max: 200, value: undefined });
    assert.equal(check({ set_table: "201" }, CAPS15), null);
    assert.equal(check({ match_metric: "0" })?.key, "matchMetricRange");
    assert.equal(check({ set_distance: "256" })?.key, "distanceRange");
    assert.equal(check({ match_evpn_vni: "16777215" })?.key, "evpnVniRange");
  });

  it("match evpn rd takes ASN:NN, ASN4:NN or IPv4:NN with each part in its served range", () => {
    for (const ok of ["0:4294967295", "65535:0", "65536:65535", "4294967295:0", "192.0.2.1:65535"]) {
      assert.equal(check({ match_evpn_rd: ok }), null, ok);
    }
    for (const bad of ["65536:65536", "4294967296:1", "192.0.2.1:65536", "65000", "65000:01", "rd:1", "192.0.2:1"]) {
      const problem = check({ match_evpn_rd: bad });
      assert.equal(problem?.key, "evpnRdInvalid", bad);
      assert.deepEqual(problem?.args, {
        asnMin: 0,
        asnMax: 65535,
        asnValueMin: 0,
        asnValueMax: 4294967295,
        asn4Min: 65536,
        asn4Max: 4294967295,
        asn4ValueMin: 0,
        asn4ValueMax: 65535,
        ipValueMin: 0,
        ipValueMax: 65535,
      });
    }
  });

  it("addresses match the builder; any access-list number is taken", () => {
    assert.equal(check({ match_peer: "2001:db8::1" }), null);
    assert.equal(check({ match_peer: "eth0" })?.key, "matchPeerInvalid");
    assert.equal(check({ set_ip_nexthop: "010.0.0.1" })?.key, "ipNexthopInvalid");
    assert.equal(check({ set_ip_nexthop: "peer-address" }), null);
    assert.equal(check({ set_originator_id: "2001:db8::1" })?.key, "originatorIdInvalid");
    // Any configured IPv4 access-list number (a u32 tag), also outside the val_help ranges (lab).
    assert.equal(check({ match_ip_address_access_list: "500", match_ip_nexthop_access_list: "2700", match_ip_route_source_access_list: "1300" }), null);
    assert.equal(check({ set_metric: "-rtt" }), null);
    assert.equal(check({ set_metric: "+x" })?.key, "metricInvalid");
  });
});

describe("route-map save checks", () => {
  it("name: required, lab tag syntax, exact taken check", () => {
    assert.equal(routeMapProblem({ name: " ", description: "" }, [], CAPS15)?.key, "nameRequired");
    assert.equal(routeMapProblem({ name: ".RM", description: "" }, [], CAPS15)?.key, "nameInvalid");
    assert.equal(routeMapProblem({ name: "RM é", description: "" }, [], CAPS15)?.key, "nameInvalid");
    assert.equal(routeMapProblem({ name: "RM", description: "" }, ["RM"], CAPS15)?.key, "nameTaken");
    assert.equal(routeMapProblem({ name: "rm-1.a+b", description: "" }, ["RM"], CAPS15), null);
  });

  it("description: one line, at most the served length", () => {
    assert.deepEqual(routeMapProblem({ name: "RM", description: "a\nb" }, null, CAPS15), { key: "descriptionTooLong", max: 255 });
    assert.equal(routeMapProblem({ name: "RM", description: "x".repeat(256) }, null, CAPS15)?.key, "descriptionTooLong");
  });
});

// ----------------------------------------------------------------------------
// Client
// ----------------------------------------------------------------------------

type Post = (path: string, body?: unknown) => Promise<unknown>;

function stubPost(result: unknown): { calls: [string, unknown][]; restore: () => void } {
  const calls: [string, unknown][] = [];
  const client = apiClient as unknown as { post: Post };
  const original = client.post;
  client.post = async (path: string, body?: unknown) => {
    calls.push([path, body]);
    return result;
  };
  return { calls, restore: () => (client.post = original) };
}

describe("client", () => {
  it("only posts the batch: no config refresh after a commit (#1600)", async () => {
    const stub = stubPost({ success: true });
    try {
      await routeMapService.saveRule("RM", 10, null, createForm({}), CAPS15);
      assert.deepEqual(stub.calls, [
        [
          "/vyos/route-map/batch",
          { name: "RM", rule_number: 10, operations: [{ op: "set_rule" }, { op: "set_rule_action", value: "permit" }] },
        ],
      ]);
    } finally {
      stub.restore();
    }
  });

  it("route-map ops go without a rule number", async () => {
    const stub = stubPost({ success: true });
    try {
      await routeMapService.createRouteMap({ name: " RM ", description: "edge" });
      await routeMapService.updateRouteMap(MAP, { name: "RM", description: "" });
      await routeMapService.deleteRouteMap(MAP);
      assert.deepEqual(
        stub.calls.map(([, body]) => body),
        [
          { name: "RM", operations: [{ op: "set_route_map" }, { op: "set_route_map_description", value: "edge" }] },
          { name: "RM", operations: [{ op: "delete_route_map_description" }] },
          { name: "RM", operations: [{ op: "delete_route_map" }] },
        ],
      );
      for (const [, body] of stub.calls) assert.equal("rule_number" in (body as RouteMapBatchRequest), false);
    } finally {
      stub.restore();
    }
  });

  it("an unchanged edit makes no request", async () => {
    const stub = stubPost({ success: true });
    try {
      const loaded = rule({ as_path: "ASP" });
      assert.deepEqual(await routeMapService.saveRule("RM", 10, loaded, ruleFormFrom(loaded), CAPS15), { success: true });
      assert.equal(stub.calls.length, 0);
    } finally {
      stub.restore();
    }
  });

  it("a failed commit throws the device error; delete-rule is a plain batch", async () => {
    const stub = stubPost({ success: false, data: null, error: "Commit failed" });
    try {
      await assert.rejects(routeMapService.deleteRule("RM", 10), { message: "Commit failed" });
      assert.deepEqual(stub.calls[0][1], { name: "RM", rule_number: 10, operations: [{ op: "delete_rule" }] });
    } finally {
      stub.restore();
    }
  });

  it("a failed commit with no error throws an empty message", async () => {
    const stub = stubPost({ success: false });
    try {
      await assert.rejects(routeMapService.deleteRouteMap(MAP), { message: "" });
    } finally {
      stub.restore();
    }
  });

  it("reorder sends every rule number in the new order and throws a failed commit", async () => {
    const stub = stubPost({ success: false, error: "Commit failed" });
    try {
      await assert.rejects(routeMapService.reorderRules("RM", [20, 10]), { message: "Commit failed" });
      assert.deepEqual(stub.calls, [["/vyos/route-map/reorder", { name: "RM", rule_numbers: [20, 10] }]]);
    } finally {
      stub.restore();
    }
  });
});
