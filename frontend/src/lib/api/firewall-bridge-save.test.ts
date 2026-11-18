import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bridgeFirewallService, type BridgeRule } from "./firewall-bridge";

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
