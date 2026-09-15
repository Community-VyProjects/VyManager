import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWanGlobalsOps,
  buildWanRuleCreateOps,
  buildWanRuleUpdateOps,
} from "./load-balancing-wan-ops";
import type { WANRule } from "./load-balancing";

function baseRule(overrides: Partial<WANRule> = {}): WANRule {
  return {
    rule_id: "10",
    description: null,
    inbound_interface: "eth0",
    exclude: false,
    failover: false,
    per_packet_balancing: false,
    protocol: null,
    interfaces: [{ interface: "eth1", weight: "1" }],
    limit: null,
    source: null,
    destination: null,
    ...overrides,
  };
}

describe("buildWanRuleCreateOps", () => {
  it("emits limit and group leaves that createWANRule used to drop", () => {
    const ops = buildWanRuleCreateOps(baseRule({
      limit: { burst: "10", period: "5", rate: "100", threshold: "20" },
      source: {
        address: null,
        port: null,
        group: {
          address_group: "LAN",
          network_group: null,
          domain_group: null,
          port_group: "WEB",
        },
      },
      destination: {
        address: null,
        port: null,
        group: {
          address_group: null,
          network_group: "NETS",
          domain_group: "DOMS",
          port_group: null,
        },
      },
    }));
    assert.deepEqual(
      ops.filter((op) => op.op.includes("limit") || op.op.includes("group")),
      [
        { op: "set_wan_rule_limit_burst", value: "10" },
        { op: "set_wan_rule_limit_period", value: "5" },
        { op: "set_wan_rule_limit_rate", value: "100" },
        { op: "set_wan_rule_limit_threshold", value: "20" },
        { op: "set_wan_rule_source_group_address", value: "LAN" },
        { op: "set_wan_rule_source_group_port", value: "WEB" },
        { op: "set_wan_rule_destination_group_network", value: "NETS" },
        { op: "set_wan_rule_destination_group_domain", value: "DOMS" },
      ],
    );
  });

  it("omits limit and group ops when those fields are empty", () => {
    const ops = buildWanRuleCreateOps(baseRule());
    assert.equal(ops.some((op) => op.op.includes("limit") || op.op.includes("group")), false);
  });
});

describe("buildWanRuleUpdateOps", () => {
  it("replaces limit by deleting the container then setting filled leaves", () => {
    const ops = buildWanRuleUpdateOps(
      baseRule({ limit: { burst: "1", period: null, rate: null, threshold: null } }),
      baseRule({ limit: { burst: "2", period: null, rate: null, threshold: null } }),
    );
    const limitOps = ops.filter((op) => op.op.includes("limit"));
    assert.deepEqual(limitOps, [
      { op: "delete_wan_rule_limit" },
      { op: "set_wan_rule_limit_burst", value: "2" },
    ]);
  });

  it("clears source groups without touching destination groups", () => {
    const original = baseRule({
      source: {
        address: null,
        port: null,
        group: { address_group: "LAN", network_group: null, domain_group: null, port_group: null },
      },
      destination: {
        address: null,
        port: null,
        group: { address_group: "WAN", network_group: null, domain_group: null, port_group: null },
      },
    });
    const updated = baseRule({
      source: null,
      destination: original.destination,
    });
    const ops = buildWanRuleUpdateOps(original, updated);
    assert.deepEqual(ops.filter((op) => op.op.includes("group")), [
      { op: "delete_wan_rule_source_group" },
    ]);
  });
});

describe("buildWanGlobalsOps", () => {
  it("emits set_wan_hook when a hook path is set", () => {
    const ops = buildWanGlobalsOps({
      disable_source_nat: false,
      enable_local_traffic: false,
      flush_connections: false,
      sticky_inbound: false,
      hook: "/config/scripts/wan-lb",
    });
    assert.deepEqual(ops.filter((op) => op.op.includes("hook")), [
      { op: "set_wan_hook", value: "/config/scripts/wan-lb" },
    ]);
  });

  it("emits delete_wan_hook when the hook is cleared", () => {
    const ops = buildWanGlobalsOps({
      disable_source_nat: false,
      enable_local_traffic: false,
      flush_connections: false,
      sticky_inbound: false,
      hook: null,
    });
    assert.deepEqual(ops.filter((op) => op.op.includes("hook")), [
      { op: "delete_wan_hook" },
    ]);
  });
});
