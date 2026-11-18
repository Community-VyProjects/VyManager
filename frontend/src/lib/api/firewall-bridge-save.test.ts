import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bridgeFirewallService, type BridgeRule } from "./firewall-bridge";

describe("bridge updateRule flag diff", () => {
  it("sets added flags, deletes removed flags, and ignores padding", async () => {
    const sent: unknown[] = [];
    const service = Object.create(bridgeFirewallService) as typeof bridgeFirewallService;
    service.batchConfigure = async (request) => {
      sent.push(request.operations);
      return { success: true };
    };
    const current = { rule_number: 10, tcp_flags: "syn, ack", tcp_flags_not: "fin" } as BridgeRule;
    await service.updateRule("forward", 10, current, {
      tcp_flags: "syn, psh",
      tcp_flags_not: " fin ",
    });
    assert.deepEqual(sent, [[
      { op: "delete_rule_tcp_flags", value: "ack" },
      { op: "set_rule_tcp_flags", value: "psh" },
    ]]);
  });

  it("deletes every flag when the protocol change sends an empty list", async () => {
    const sent: unknown[] = [];
    const service = Object.create(bridgeFirewallService) as typeof bridgeFirewallService;
    service.batchConfigure = async (request) => {
      sent.push(request.operations);
      return { success: true };
    };
    const current = { rule_number: 10, tcp_flags: "syn", tcp_flags_not: "rst" } as BridgeRule;
    await service.updateRule("forward", 10, current, { tcp_flags: "", tcp_flags_not: "" });
    assert.deepEqual(sent, [[
      { op: "delete_rule_tcp_flags", value: "syn" },
      { op: "delete_rule_tcp_flags_not", value: "rst" },
    ]]);
  });
});

describe("bridge updateRule multi leaves", () => {
  it("deletes the old value and sets the new one", async () => {
    const sent: unknown[] = [];
    const service = Object.create(bridgeFirewallService) as typeof bridgeFirewallService;
    service.batchConfigure = async (request) => {
      sent.push(request.operations);
      return { success: true };
    };
    const current = { rule_number: 10, dscp: "10", packet_length: "100" } as BridgeRule;
    await service.updateRule("forward", 10, current, { dscp: "20", packet_length: "" });
    assert.deepEqual(sent, [[
      { op: "delete_rule_dscp", value: "10" },
      { op: "set_rule_dscp", value: "20" },
      { op: "delete_rule_packet_length", value: "100" },
    ]]);
  });
});
