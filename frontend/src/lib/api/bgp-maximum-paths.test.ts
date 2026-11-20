import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bgpService } from "./bgp";

describe("bgp saveMaximumPaths", () => {
  it("sets a changed leaf and deletes only the cleared leaf", async () => {
    const sent: unknown[] = [];
    const service = Object.create(bgpService) as typeof bgpService;
    service.batchConfigure = async (request) => {
      sent.push(request.operations);
      return { success: true };
    };
    await service.saveMaximumPaths("ipv4-unicast", 4, 8, 6, null);
    assert.deepEqual(sent, [[
      { op: "set_af_maximum_paths_ebgp", value: "ipv4-unicast,6" },
      { op: "delete_af_maximum_paths_ibgp", value: "ipv4-unicast" },
    ]]);
  });

  it("does not emit when both leaves are unchanged, including a blank keep", async () => {
    let calls = 0;
    const service = Object.create(bgpService) as typeof bgpService;
    service.batchConfigure = async () => {
      calls += 1;
      return { success: true };
    };
    const kept = await service.saveMaximumPaths("ipv6-unicast", 2, null, 2, null);
    assert.equal(kept.success, true);
    assert.equal(calls, 0);
  });

  it("deletes the parent when both loaded leaves are cleared", async () => {
    const sent: unknown[] = [];
    const service = Object.create(bgpService) as typeof bgpService;
    service.batchConfigure = async (request) => {
      sent.push(request.operations);
      return { success: true };
    };
    await service.saveMaximumPaths("ipv4-unicast", 4, 8, null, null);
    assert.deepEqual(sent, [[
      { op: "delete_af_maximum_paths", value: "ipv4-unicast" },
    ]]);
  });

  it("deletes the parent when the only loaded leaf is cleared", async () => {
    const sent: unknown[] = [];
    const service = Object.create(bgpService) as typeof bgpService;
    service.batchConfigure = async (request) => {
      sent.push(request.operations);
      return { success: true };
    };
    await service.saveMaximumPaths("ipv6-unicast", null, 8, null, null);
    assert.deepEqual(sent, [[
      { op: "delete_af_maximum_paths", value: "ipv6-unicast" },
    ]]);
  });

  it("leaf-deletes one side when the sibling remains", async () => {
    const sent: unknown[] = [];
    const service = Object.create(bgpService) as typeof bgpService;
    service.batchConfigure = async (request) => {
      sent.push(request.operations);
      return { success: true };
    };
    await service.saveMaximumPaths("ipv4-unicast", 4, 8, null, 8);
    assert.deepEqual(sent, [[
      { op: "delete_af_maximum_paths_ebgp", value: "ipv4-unicast" },
    ]]);
  });

  it("sets both leaves from unset", async () => {
    const sent: unknown[] = [];
    const service = Object.create(bgpService) as typeof bgpService;
    service.batchConfigure = async (request) => {
      sent.push(request.operations);
      return { success: true };
    };
    await service.saveMaximumPaths("ipv4-labeled-unicast", null, null, 1, 256);
    assert.deepEqual(sent, [[
      { op: "set_af_maximum_paths_ebgp", value: "ipv4-labeled-unicast,1" },
      { op: "set_af_maximum_paths_ibgp", value: "ipv4-labeled-unicast,256" },
    ]]);
  });
});
