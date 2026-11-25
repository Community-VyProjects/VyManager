import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isIpv6Prefix,
  ospfv3AreaOps,
  ospfv3AreaProblem,
  ospfv3DefaultInformationOps,
  ospfv3DefaultInformationProblem,
  ospfv3DeleteOps,
  ospfv3DistanceOps,
  ospfv3DistanceProblem,
  ospfv3GracefulRestartOps,
  ospfv3GracefulRestartProblem,
  ospfv3Int,
  ospfv3InterfaceOps,
  ospfv3InterfaceProblem,
  ospfv3ParametersOps,
  ospfv3ParametersProblem,
  ospfv3RangeMode,
  ospfv3RedistributeOps,
  ospfv3RedistributeProblem,
} from "./ospfv3-save-ops";
import { apiClient } from "./client";
import {
  ospfv3Service,
  type Ospfv3Area,
  type Ospfv3BatchOperation,
  type Ospfv3Capabilities,
  type Ospfv3Config,
  type Ospfv3GracefulRestart,
  type Ospfv3Interface,
} from "./ospfv3";

// The builder RANGES table as GET /capabilities serves it.
const CAPS: Pick<Ospfv3Capabilities, "ranges"> = {
  ranges: {
    area_id: { min: 0, max: 4294967295 },
    reference_bandwidth: { min: 1, max: 4294967 },
    metric: { min: 0, max: 16777214 },
    metric_type: { min: 1, max: 2 },
    distance: { min: 1, max: 255 },
    grace_period: { min: 5, max: 1800 },
    supported_grace_time: { min: 10, max: 1800 },
    cost: { min: 1, max: 65535 },
    dead_interval: { min: 1, max: 65535 },
    hello_interval: { min: 1, max: 65535 },
    ifmtu: { min: 1, max: 65535 },
    retransmit_interval: { min: 1, max: 65535 },
    transmit_delay: { min: 1, max: 65535 },
    instance_id: { min: 0, max: 255 },
    priority: { min: 0, max: 255 },
  },
};

function iface(partial: Partial<Ospfv3Interface> = {}): Ospfv3Interface {
  return { name: "eth0", passive: false, bfd: false, mtu_ignore: false, ...partial };
}

function area(partial: Partial<Ospfv3Area> = {}): Ospfv3Area {
  return {
    area_id: "1",
    area_type: null,
    area_type_no_summary: false,
    nssa_default_information_originate: false,
    ranges: [],
    ...partial,
  };
}

function gr(partial: Partial<Ospfv3GracefulRestart> = {}, helper: Partial<Ospfv3GracefulRestart["helper"]> = {}) {
  return {
    enabled: true,
    ...partial,
    helper: { enable: false, router_ids: [], lsa_check_disable: false, planned_only: false, ...helper },
  } as Ospfv3GracefulRestart;
}

function config(partial: Partial<Ospfv3Config> = {}): Ospfv3Config {
  return {
    configured: true,
    parameters: {},
    areas: [],
    interfaces: [],
    redistribute: [],
    default_information: { enabled: false, always: false },
    distance: { ospfv3: {} },
    graceful_restart: gr({ enabled: false }),
    log_adjacency_changes_detail: false,
    ...partial,
  };
}

describe("global parameters", () => {
  const loaded = config({
    parameters: { router_id: "192.0.2.1" },
    log_adjacency_changes: true,
    log_adjacency_changes_detail: true,
    auto_cost_reference_bandwidth: 1000,
  });
  const draft = {
    router_id: "192.0.2.1",
    log_adjacency_changes: true,
    log_adjacency_changes_detail: true,
    auto_cost_reference_bandwidth: 1000,
  };

  it("sends nothing for an unchanged form", () => {
    assert.deepEqual(ospfv3ParametersOps(loaded, draft), []);
  });

  it("sends the leaf delete for each cleared leaf", () => {
    assert.deepEqual(ospfv3ParametersOps(loaded, {
      router_id: "", log_adjacency_changes: true, log_adjacency_changes_detail: false,
      auto_cost_reference_bandwidth: null,
    }), [
      { op: "delete_router_id" },
      { op: "delete_log_adjacency_changes_detail" },
      { op: "delete_auto_cost_reference_bandwidth" },
    ]);
    assert.deepEqual(ospfv3ParametersOps(loaded, { ...draft, log_adjacency_changes: false }), [
      { op: "delete_log_adjacency_changes" },
    ]);
  });

  it("sets new leaves from an empty config", () => {
    assert.deepEqual(ospfv3ParametersOps(config(), draft), [
      { op: "set_router_id", value: "192.0.2.1" },
      { op: "set_log_adjacency_changes" },
      { op: "set_log_adjacency_changes_detail" },
      { op: "set_auto_cost_reference_bandwidth", value: "1000" },
    ]);
  });

  it("checks the router ID and the served reference-bandwidth range", () => {
    assert.equal(ospfv3ParametersProblem(draft, CAPS), null);
    assert.deepEqual(ospfv3ParametersProblem({ ...draft, router_id: "2001:db8::1" }, CAPS), { key: "routerIdInvalid" });
    assert.deepEqual(ospfv3ParametersProblem({ ...draft, auto_cost_reference_bandwidth: 4294968 }, CAPS), {
      key: "referenceBandwidthRange", min: 1, max: 4294967,
    });
    assert.deepEqual(ospfv3ParametersProblem({ ...draft, auto_cost_reference_bandwidth: ospfv3Int("1e3") }, CAPS)?.key,
      "referenceBandwidthRange");
  });
});

describe("default information", () => {
  const loaded = { enabled: true, always: true, metric: 10, metric_type: 2, route_map: "RM" };

  it("sends nothing for an unchanged form and a leaf delete per cleared leaf", () => {
    assert.deepEqual(ospfv3DefaultInformationOps(loaded, { ...loaded }), []);
    assert.deepEqual(ospfv3DefaultInformationOps(loaded, {
      enabled: true, always: false, metric: null, metric_type: null, route_map: "",
    }), [
      { op: "delete_default_information_originate_always" },
      { op: "delete_default_information_originate_metric" },
      { op: "delete_default_information_originate_metric_type" },
      { op: "delete_default_information_originate_route_map" },
    ]);
  });

  it("deletes originate when disabled and sets it when enabled", () => {
    assert.deepEqual(ospfv3DefaultInformationOps(loaded, { ...loaded, enabled: false }), [
      { op: "delete_default_information_originate" },
    ]);
    assert.deepEqual(ospfv3DefaultInformationOps({ enabled: false, always: false }, loaded), [
      { op: "set_default_information_originate" },
      { op: "set_default_information_originate_always" },
      { op: "set_default_information_originate_metric", value: "10" },
      { op: "set_default_information_originate_metric_type", value: "2" },
      { op: "set_default_information_originate_route_map", value: "RM" },
    ]);
  });

  it("checks metric and metric-type against the served ranges", () => {
    assert.equal(ospfv3DefaultInformationProblem(loaded, CAPS), null);
    assert.deepEqual(ospfv3DefaultInformationProblem({ ...loaded, metric: 16777215 }, CAPS), {
      key: "metricRange", min: 0, max: 16777214,
    });
    assert.equal(ospfv3DefaultInformationProblem({ ...loaded, metric_type: 3 }, CAPS)?.key, "metricTypeRange");
    assert.equal(ospfv3DefaultInformationProblem({ ...loaded, enabled: false, metric: 99999999 }, CAPS), null);
  });
});

describe("distance", () => {
  const loaded = { global_value: 110, ospfv3: { external: 120, inter_area: 115, intra_area: 105 } };

  it("sends nothing unchanged, a leaf delete per cleared leaf, and the node delete when all are cleared", () => {
    assert.deepEqual(ospfv3DistanceOps(loaded, structuredClone(loaded)), []);
    assert.deepEqual(ospfv3DistanceOps(loaded, { global_value: null, ospfv3: { external: 120, inter_area: null, intra_area: 105 } }), [
      { op: "delete_distance_global" },
      { op: "delete_distance_ospfv3_inter_area" },
    ]);
    assert.deepEqual(ospfv3DistanceOps(loaded, { global_value: 110, ospfv3: {} }), [{ op: "delete_distance_ospfv3" }]);
    assert.deepEqual(ospfv3DistanceOps({ ospfv3: {} }, loaded), [
      { op: "set_distance_global", value: "110" },
      { op: "set_distance_ospfv3_external", value: "120" },
      { op: "set_distance_ospfv3_inter_area", value: "115" },
      { op: "set_distance_ospfv3_intra_area", value: "105" },
    ]);
  });

  it("clearing every ospfv3 child sends only the node delete (the lab rejects deleting the last child)", () => {
    const ops = ospfv3DistanceOps(loaded, { global_value: 110, ospfv3: { external: null, inter_area: null, intra_area: null } });
    assert.deepEqual(ops, [{ op: "delete_distance_ospfv3" }]);
  });

  it("checks 1-255", () => {
    assert.equal(ospfv3DistanceProblem(loaded, CAPS), null);
    assert.deepEqual(ospfv3DistanceProblem({ ospfv3: { intra_area: 0 } }, CAPS), { key: "distanceRange", min: 1, max: 255 });
  });
});

describe("graceful restart", () => {
  const loaded = gr({ grace_period: 120 }, {
    enable: true, router_ids: ["192.0.2.1", "192.0.2.2"], lsa_check_disable: true, planned_only: true,
    supported_grace_time: 300,
  });

  it("sends nothing unchanged", () => {
    assert.deepEqual(ospfv3GracefulRestartOps(loaded, structuredClone(loaded)), []);
  });

  it("diffs the multi router-id without touching helper enable", () => {
    const updated = structuredClone(loaded);
    updated.helper.router_ids = ["192.0.2.2", "192.0.2.3"];
    assert.deepEqual(ospfv3GracefulRestartOps(loaded, updated), [
      { op: "delete_graceful_restart_helper_enable_router_id", value: "192.0.2.1" },
      { op: "set_graceful_restart_helper_enable_router_id", value: "192.0.2.3" },
    ]);
  });

  it("sends a leaf delete per cleared leaf", () => {
    assert.deepEqual(ospfv3GracefulRestartOps(loaded, gr({}, { enable: false, planned_only: true })), [
      { op: "delete_graceful_restart_grace_period" },
      { op: "delete_graceful_restart_helper_enable" },
      { op: "delete_graceful_restart_helper_lsa_check_disable" },
      { op: "delete_graceful_restart_helper_supported_grace_time" },
    ]);
  });

  it("deletes the helper when it is emptied and graceful-restart when disabled", () => {
    assert.deepEqual(ospfv3GracefulRestartOps(loaded, gr({ grace_period: 120 })), [
      { op: "delete_graceful_restart_helper" },
    ]);
    assert.deepEqual(ospfv3GracefulRestartOps(loaded, gr({ enabled: false })), [{ op: "delete_graceful_restart" }]);
  });

  it("sets every leaf on a new graceful-restart", () => {
    assert.deepEqual(ospfv3GracefulRestartOps(gr({ enabled: false }), loaded), [
      { op: "set_graceful_restart" },
      { op: "set_graceful_restart_grace_period", value: "120" },
      { op: "set_graceful_restart_helper_enable" },
      { op: "set_graceful_restart_helper_enable_router_id", value: "192.0.2.1" },
      { op: "set_graceful_restart_helper_enable_router_id", value: "192.0.2.2" },
      { op: "set_graceful_restart_helper_lsa_check_disable" },
      { op: "set_graceful_restart_helper_planned_only" },
      { op: "set_graceful_restart_helper_supported_grace_time", value: "300" },
    ]);
  });

  it("checks grace times and router IDs", () => {
    assert.equal(ospfv3GracefulRestartProblem(loaded, CAPS), null);
    assert.deepEqual(ospfv3GracefulRestartProblem(gr({ grace_period: 4 }), CAPS), {
      key: "gracePeriodRange", min: 5, max: 1800,
    });
    assert.equal(ospfv3GracefulRestartProblem(gr({}, { supported_grace_time: 9 }), CAPS)?.key, "supportedGraceTimeRange");
    assert.equal(ospfv3GracefulRestartProblem(gr({}, { enable: true, router_ids: ["1.2.3"] }), CAPS)?.key,
      "helperRouterIdInvalid");
    assert.equal(ospfv3GracefulRestartProblem(gr({}, { enable: true, router_ids: ["1.2.3.4", "1.2.3.4"] }), CAPS)?.key,
      "helperRouterIdDuplicate");
  });
});

describe("areas", () => {
  const nssa = area({
    area_type: "nssa",
    area_type_no_summary: true,
    nssa_default_information_originate: true,
    ranges: [{ prefix: "2001:db8::/32", advertise: true, not_advertise: false }],
    export_list: "OUT",
    import_list: "IN",
  });

  it("sends nothing for an unchanged form", () => {
    assert.deepEqual(ospfv3AreaOps(nssa, structuredClone(nssa)), []);
  });

  it("creates an area with every leaf", () => {
    assert.deepEqual(ospfv3AreaOps(null, nssa), [
      { op: "set_area", value: "1" },
      { op: "set_area_type_nssa", value: "1" },
      { op: "set_area_type_nssa_no_summary", value: "1" },
      { op: "set_area_type_nssa_default_information_originate", value: "1" },
      { op: "set_area_range", value: "1,2001:db8::/32" },
      { op: "set_area_range_advertise", value: "1,2001:db8::/32" },
      { op: "set_area_export_list", value: "1,OUT" },
      { op: "set_area_import_list", value: "1,IN" },
    ]);
  });

  it("sends a leaf delete per cleared leaf and never deletes the area or range", () => {
    const ops = ospfv3AreaOps(nssa, area({
      area_type: "nssa",
      ranges: [{ prefix: "2001:db8::/32", advertise: false, not_advertise: false }],
    }));
    assert.deepEqual(ops, [
      { op: "delete_area_type_nssa_no_summary", value: "1" },
      { op: "delete_area_type_nssa_default_information_originate", value: "1" },
      { op: "delete_area_range_advertise", value: "1,2001:db8::/32" },
      { op: "delete_area_export_list", value: "1" },
      { op: "delete_area_import_list", value: "1" },
    ]);
  });

  it("switches range mode with the old leaf delete first", () => {
    const ops = ospfv3AreaOps(nssa, {
      ...nssa,
      ranges: [{ prefix: "2001:db8::/32", advertise: false, not_advertise: true }],
    });
    assert.deepEqual(ops, [
      { op: "delete_area_range_advertise", value: "1,2001:db8::/32" },
      { op: "set_area_range_not_advertise", value: "1,2001:db8::/32" },
    ]);
  });

  it("changes area-type with delete_area_type then the new type ops", () => {
    assert.deepEqual(ospfv3AreaOps(nssa, { ...nssa, area_type: "stub", nssa_default_information_originate: false }), [
      { op: "delete_area_type", value: "1" },
      { op: "set_area_type_stub", value: "1" },
      { op: "set_area_type_stub_no_summary", value: "1" },
    ]);
  });

  it("switching to normal only deletes the area-type", () => {
    assert.deepEqual(ospfv3AreaOps(nssa, { ...nssa, area_type: null, area_type_no_summary: false,
      nssa_default_information_originate: false }), [{ op: "delete_area_type", value: "1" }]);
    const ops = ospfv3AreaOps(null, area());
    assert.deepEqual(ops, [{ op: "set_area", value: "1" }]);
    assert.ok(!ops.some((o) => o.op.includes("normal") || o.op.includes("default_cost")));
  });

  it("deletes a removed range only", () => {
    assert.deepEqual(ospfv3AreaOps(nssa, { ...nssa, ranges: [] }), [
      { op: "delete_area_range", value: "1,2001:db8::/32" },
    ]);
  });

  it("checks area ID, prefixes and duplicates", () => {
    assert.equal(ospfv3AreaProblem(nssa, CAPS), null);
    assert.equal(ospfv3AreaProblem(area({ area_id: "0.0.0.1" }), CAPS), null);
    assert.equal(ospfv3AreaProblem(area({ area_id: "" }), CAPS)?.key, "areaIdRequired");
    assert.equal(ospfv3AreaProblem(area({ area_id: "4294967296" }), CAPS)?.key, "areaIdInvalid");
    assert.equal(ospfv3AreaProblem(area({ area_id: "backbone" }), CAPS)?.key, "areaIdInvalid");
    assert.equal(ospfv3AreaProblem(area(), CAPS, { existingIds: ["1"] })?.key, "areaIdExists");
    assert.equal(ospfv3AreaProblem(area({ ranges: [{ prefix: "10.0.0.0/8", advertise: false, not_advertise: false }] }), CAPS)?.key,
      "rangePrefixInvalid");
    assert.equal(ospfv3AreaProblem(area({ ranges: [
      { prefix: "2001:db8::/32", advertise: false, not_advertise: false },
      { prefix: "2001:db8::/32", advertise: true, not_advertise: false },
    ] }), CAPS)?.key, "rangeDuplicate");
  });

  it("reads the range mode", () => {
    assert.equal(ospfv3RangeMode({ advertise: true, not_advertise: false }), "advertise");
    assert.equal(ospfv3RangeMode({ advertise: false, not_advertise: true }), "not-advertise");
    assert.equal(ospfv3RangeMode({ advertise: false, not_advertise: false }), "");
    assert.ok(isIpv6Prefix("2001:db8::/32"));
    assert.ok(!isIpv6Prefix("2001:db8::"));
    assert.ok(!isIpv6Prefix("2001:db8::/129"));
  });

  it("rejects a range prefix with host bits set, as the lab does", () => {
    assert.ok(!isIpv6Prefix("2001:db8::1/48"));
    assert.ok(isIpv6Prefix("2001:db8::/48"));
    assert.ok(isIpv6Prefix("::/0"));
    assert.ok(isIpv6Prefix("2001:db8:0:1::/64"));
    assert.ok(!isIpv6Prefix("2001:db8:0:1::/63"));
    assert.ok(isIpv6Prefix("2001:db8:0:1:0:0:0:1/128"));
    assert.ok(!isIpv6Prefix("1::2::3/64"));
    assert.ok(!isIpv6Prefix("1:2:3:4:5:6:7:8:9/64"));
    assert.ok(!isIpv6Prefix("12345::/16"));
    assert.equal(ospfv3AreaProblem(area({ ranges: [{ prefix: "2001:db8::1/48", advertise: false, not_advertise: false }] }), CAPS)?.key,
      "rangePrefixInvalid");
  });
});

describe("interfaces", () => {
  const full = iface({
    area: "0", cost: 10, priority: 1, hello_interval: 10, dead_interval: 40, retransmit_interval: 5,
    transmit_delay: 1, network: "point-to-point", passive: true, bfd: true, bfd_profile: "fast",
    mtu_ignore: true, ifmtu: 1400, instance_id: 0,
  });

  it("sends nothing for an unchanged form", () => {
    assert.deepEqual(ospfv3InterfaceOps(full, { ...full }), []);
  });

  it("creates an interface with every leaf", () => {
    assert.deepEqual(ospfv3InterfaceOps(null, full), [
      { op: "set_interface", value: "eth0" },
      { op: "set_interface_area", value: "eth0,0" },
      { op: "set_interface_cost", value: "eth0,10" },
      { op: "set_interface_priority", value: "eth0,1" },
      { op: "set_interface_hello_interval", value: "eth0,10" },
      { op: "set_interface_dead_interval", value: "eth0,40" },
      { op: "set_interface_retransmit_interval", value: "eth0,5" },
      { op: "set_interface_transmit_delay", value: "eth0,1" },
      { op: "set_interface_network", value: "eth0,point-to-point" },
      { op: "set_interface_ifmtu", value: "eth0,1400" },
      { op: "set_interface_instance_id", value: "eth0,0" },
      { op: "set_interface_passive", value: "eth0" },
      { op: "set_interface_bfd", value: "eth0" },
      { op: "set_interface_bfd_profile", value: "eth0,fast" },
      { op: "set_interface_mtu_ignore", value: "eth0" },
    ]);
  });

  it("sends a leaf delete per cleared leaf and never deletes the interface", () => {
    assert.deepEqual(ospfv3InterfaceOps(full, iface({ bfd: true })), [
      { op: "delete_interface_area", value: "eth0" },
      { op: "delete_interface_cost", value: "eth0" },
      { op: "delete_interface_priority", value: "eth0" },
      { op: "delete_interface_hello_interval", value: "eth0" },
      { op: "delete_interface_dead_interval", value: "eth0" },
      { op: "delete_interface_retransmit_interval", value: "eth0" },
      { op: "delete_interface_transmit_delay", value: "eth0" },
      { op: "delete_interface_network", value: "eth0" },
      { op: "delete_interface_ifmtu", value: "eth0" },
      { op: "delete_interface_instance_id", value: "eth0" },
      { op: "delete_interface_passive", value: "eth0" },
      { op: "delete_interface_bfd_profile", value: "eth0" },
      { op: "delete_interface_mtu_ignore", value: "eth0" },
    ]);
    assert.deepEqual(ospfv3InterfaceOps(full, { ...full, bfd: false, bfd_profile: null }), [
      { op: "delete_interface_bfd", value: "eth0" },
    ]);
  });

  it("checks served ranges and the area format", () => {
    assert.equal(ospfv3InterfaceProblem(full, CAPS), null);
    assert.equal(ospfv3InterfaceProblem(iface({ name: "" }), CAPS)?.key, "interfaceRequired");
    assert.equal(ospfv3InterfaceProblem(iface({ area: "x" }), CAPS)?.key, "interfaceAreaInvalid");
    assert.deepEqual(ospfv3InterfaceProblem(iface({ cost: 0 }), CAPS), { key: "costRange", min: 1, max: 65535 });
    assert.deepEqual(ospfv3InterfaceProblem(iface({ priority: 256 }), CAPS), { key: "priorityRange", min: 0, max: 255 });
    assert.equal(ospfv3InterfaceProblem(iface({ hello_interval: 0 }), CAPS)?.key, "helloIntervalRange");
    assert.equal(ospfv3InterfaceProblem(iface({ dead_interval: 70000 }), CAPS)?.key, "deadIntervalRange");
    assert.equal(ospfv3InterfaceProblem(iface({ retransmit_interval: 0 }), CAPS)?.key, "retransmitIntervalRange");
    assert.equal(ospfv3InterfaceProblem(iface({ transmit_delay: 0 }), CAPS)?.key, "transmitDelayRange");
    assert.equal(ospfv3InterfaceProblem(iface({ ifmtu: 0 }), CAPS)?.key, "ifmtuRange");
    assert.equal(ospfv3InterfaceProblem(iface({ instance_id: NaN }), CAPS)?.key, "instanceIdRange");
  });
});

describe("redistribute", () => {
  const loaded = { protocol: "connected", metric: "10", metric_type: "2", route_map: "RM" };

  it("sends nothing unchanged, a leaf delete per cleared leaf, never the protocol delete", () => {
    assert.deepEqual(ospfv3RedistributeOps(loaded, { ...loaded }), []);
    assert.deepEqual(ospfv3RedistributeOps(loaded, { protocol: "connected" }), [
      { op: "delete_redistribute_metric", value: "connected" },
      { op: "delete_redistribute_metric_type", value: "connected" },
      { op: "delete_redistribute_route_map", value: "connected" },
    ]);
    assert.deepEqual(ospfv3RedistributeOps(null, loaded), [
      { op: "set_redistribute", value: "connected" },
      { op: "set_redistribute_metric", value: "connected,10" },
      { op: "set_redistribute_metric_type", value: "connected,2" },
      { op: "set_redistribute_route_map", value: "connected,RM" },
    ]);
  });

  it("checks protocol and metric", () => {
    assert.equal(ospfv3RedistributeProblem(loaded, CAPS), null);
    assert.equal(ospfv3RedistributeProblem({ protocol: "" }, CAPS)?.key, "protocolRequired");
    assert.equal(ospfv3RedistributeProblem({ ...loaded, metric: "16777215" }, CAPS)?.key, "metricRange");
  });
});

describe("deletes", () => {
  it("names each tag object", () => {
    assert.deepEqual(ospfv3DeleteOps.area("1"), [{ op: "delete_area", value: "1" }]);
    assert.deepEqual(ospfv3DeleteOps.interface("eth0"), [{ op: "delete_interface", value: "eth0" }]);
    assert.deepEqual(ospfv3DeleteOps.redistribute("bgp"), [{ op: "delete_redistribute", value: "bgp" }]);
    assert.deepEqual(ospfv3DeleteOps.all(), [{ op: "delete_ospfv3" }]);
  });
});

describe("service", () => {
  function stub() {
    const sent: Ospfv3BatchOperation[][] = [];
    const service = Object.create(ospfv3Service) as typeof ospfv3Service;
    service.batchConfigure = async (ops: Ospfv3BatchOperation[]) => {
      if (ops.length) sent.push(ops);
      return { success: true };
    };
    return { service, sent };
  }

  it("updateAdvanced sends distance and graceful restart in one batch", async () => {
    const { service, sent } = stub();
    const original = config({ distance: { global_value: 110, ospfv3: {} } });
    await service.updateAdvanced(original, {
      distance: { global_value: null, ospfv3: {} },
      gracefulRestart: gr({ grace_period: 60 }),
    });
    assert.deepEqual(sent, [[
      { op: "delete_distance_global" },
      { op: "set_graceful_restart" },
      { op: "set_graceful_restart_grace_period", value: "60" },
    ]]);
  });

  it("an unchanged area sends nothing", async () => {
    const { service, sent } = stub();
    await service.updateArea(area(), area());
    assert.deepEqual(sent, []);
  });
});

describe("batchConfigure", () => {
  it("throws the device error on success:false and skips an empty batch", async () => {
    const posts: unknown[] = [];
    const original = apiClient.post;
    apiClient.post = (async (endpoint: string, body?: unknown) => {
      posts.push([endpoint, body]);
      return { success: false, error: "Commit failed" };
    }) as typeof apiClient.post;
    try {
      assert.deepEqual(await ospfv3Service.batchConfigure([]), { success: true, data: null });
      assert.equal(posts.length, 0);
      await assert.rejects(ospfv3Service.batchConfigure([{ op: "delete_ospfv3" }]), { message: "Commit failed" });
      assert.deepEqual(posts, [["/vyos/ospfv3/batch", { operations: [{ op: "delete_ospfv3" }] }]]);
    } finally {
      apiClient.post = original;
    }
  });
});
