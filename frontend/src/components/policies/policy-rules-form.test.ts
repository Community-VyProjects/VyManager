import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AsPathListService,
  type AsPathListBatchRequest,
  type AsPathListRule,
} from "@/lib/api/as-path-list";
import {
  PolicyListService,
  type PolicyListBatchRequest,
} from "@/lib/api/policy-list";
import {
  LocalRouteService,
  type LocalRouteBatchRequest,
  type LocalRouteRule,
} from "@/lib/api/local-route";
import type { AccessListCapabilitiesResponse, AccessListRule } from "@/lib/api/access-list";
import type { VyOSResponse } from "@/lib/types/api";
import type { PrefixListCapabilitiesResponse, PrefixListRule } from "@/lib/api/prefix-list";
import { familyLabel, geLeBounds, sectionTarget, suggestedRuleNumber } from "./prefix-list-rule-form";
import {
  emptyRegexListRuleDraft,
  regexListRuleDraftFrom,
  submitAsPathRuleCreate,
  submitAsPathRuleUpdate,
  validateRegexListRule,
} from "./policy-list-rule-form";
import {
  emptyLocalRouteDraft,
  localRouteDraftFrom,
  submitLocalRouteCreate,
  submitLocalRouteUpdate,
  validateLocalRoute,
} from "./local-route-form";
import { endpointParts, suggestedRuleNumber as suggestedAccessRuleNumber } from "./access-list-rule-form";

class RecordingAsPath extends AsPathListService {
  calls: AsPathListBatchRequest[] = [];
  async batchConfigure(request: AsPathListBatchRequest): Promise<VyOSResponse> {
    this.calls.push(request);
    return { success: true };
  }
}

class RecordingPolicy extends PolicyListService {
  calls: PolicyListBatchRequest[] = [];
  async batchConfigure(request: PolicyListBatchRequest): Promise<VyOSResponse> {
    this.calls.push(request);
    return { success: true };
  }
}

class RecordingLocal extends LocalRouteService {
  calls: LocalRouteBatchRequest[] = [];
  async batchConfigure(request: LocalRouteBatchRequest): Promise<VyOSResponse> {
    this.calls.push(request);
    return { success: true };
  }
}

const storedAsPath: AsPathListRule = {
  rule_number: 10,
  description: "corp",
  action: "permit",
  regex: "^65000_",
};

const storedLocal: LocalRouteRule = {
  rule_number: 10,
  source: "10.0.0.0/8",
  destination: null,
  inbound_interface: "eth0",
  fwmark: null,
  protocol: null,
  source_port: null,
  destination_port: null,
  table: "main",
  vrf: null,
};

describe("as-path list rule create", () => {
  it("rejects a missing regex", () => {
    assert.equal(validateRegexListRule(emptyRegexListRuleDraft()), "regexRequired");
  });

  it("emits only the fields the operator filled in", async () => {
    const service = new RecordingAsPath();
    const draft = emptyRegexListRuleDraft();
    draft.ruleNumber = 10;
    draft.regex = "^65000_";
    draft.description = "corp";
    await submitAsPathRuleCreate("ASP", draft, service);
    assert.equal(service.calls.length, 1);
    assert.deepEqual(service.calls[0], {
      name: "ASP",
      rule_number: 10,
      operations: [
        { op: "set_rule" },
        { op: "set_rule_description", value: "corp" },
        { op: "set_rule_action", value: "permit" },
        { op: "set_rule_regex", value: "^65000_" },
      ],
    });
  });
});

describe("as-path list rule update", () => {
  it("sends nothing when the operator changed nothing", async () => {
    const service = new RecordingAsPath();
    const result = await submitAsPathRuleUpdate(
      "ASP",
      storedAsPath,
      regexListRuleDraftFrom(storedAsPath),
      service,
    );
    assert.equal(result, null);
    assert.equal(service.calls.length, 0);
  });

  it("deletes a cleared description", async () => {
    const service = new RecordingAsPath();
    const draft = regexListRuleDraftFrom(storedAsPath);
    draft.description = "";
    await submitAsPathRuleUpdate("ASP", storedAsPath, draft, service);
    assert.equal(service.calls.length, 1);
    assert.deepEqual(service.calls[0].operations, [{ op: "delete_rule_description" }]);
  });

  it("does not emit a delete for an already-empty description", async () => {
    const service = new RecordingAsPath();
    const current = { ...storedAsPath, description: null };
    const result = await submitAsPathRuleUpdate(
      "ASP",
      current,
      regexListRuleDraftFrom(current),
      service,
    );
    assert.equal(result, null);
    assert.equal(service.calls.length, 0);
  });

  it("writes the stored rule number when the draft number was altered", async () => {
    const service = new RecordingAsPath();
    const draft = regexListRuleDraftFrom(storedAsPath);
    draft.ruleNumber = 999;
    draft.description = "new";
    await submitAsPathRuleUpdate("ASP", storedAsPath, draft, service);
    assert.equal(service.calls[0].rule_number, 10);
  });
});

describe("community list rule create uses the policy-list service", () => {
  it("emits set_rule on the community-list batch", async () => {
    const service = new RecordingPolicy("community-list");
    const draft = emptyRegexListRuleDraft();
    draft.ruleNumber = 5;
    draft.regex = "_65000:";
    const { submitCommunityRuleCreate } = await import("./policy-list-rule-form");
    await submitCommunityRuleCreate("CL", draft, service);
    assert.deepEqual(service.calls[0].operations[0], { op: "set_rule" });
    assert.equal(service.calls[0].name, "CL");
  });
});

describe("local route create", () => {
  it("rejects a table route with no match", () => {
    const draft = emptyLocalRouteDraft();
    draft.table = "main";
    assert.deepEqual(validateLocalRoute(draft, "ipv4"), { key: "matchRequired" });
  });

  it("maps __none__ to an omitted interface", async () => {
    const service = new RecordingLocal();
    const draft = emptyLocalRouteDraft();
    draft.ruleNumber = 10;
    draft.source = "10.0.0.0/8";
    draft.table = "main";
    draft.inboundInterface = "__none__";
    await submitLocalRouteCreate(draft, "ipv4", service);
    assert.equal(service.calls.length, 1);
    assert.deepEqual(service.calls[0].operations, [
      { op: "set_local_route_rule" },
      { op: "set_local_route_rule_source", value: "10.0.0.0/8" },
      { op: "set_local_route_rule_set_table", value: "main" },
    ]);
  });
});

describe("local route update", () => {
  it("sends nothing when the operator changed nothing", async () => {
    const service = new RecordingLocal();
    const result = await submitLocalRouteUpdate(
      storedLocal,
      localRouteDraftFrom(storedLocal),
      "ipv4",
      service,
    );
    assert.equal(result, null);
    assert.equal(service.calls.length, 0);
  });

  it("deletes a cleared source", async () => {
    const service = new RecordingLocal();
    const draft = localRouteDraftFrom(storedLocal);
    draft.source = "";
    await submitLocalRouteUpdate(storedLocal, draft, "ipv4", service);
    assert.ok(service.calls[0].operations.some((op) => op.op === "delete_local_route_rule_source"));
  });
});

describe("prefix-list form helpers", () => {
  const caps = {
    ranges: {
      rule: { min: 1, max: 65535 },
      prefix_length_ipv4: { min: 0, max: 32 },
      prefix_length_ipv6: { min: 0, max: 128 },
    },
  } as PrefixListCapabilitiesResponse;
  const rule = (n: number): PrefixListRule => ({
    rule_number: n, action: "permit", description: null, prefix: "10.0.0.0/8", ge: null, le: null,
  });

  it("a ?section= request switches type, waits for a reorder save, or does nothing", () => {
    assert.equal(sectionTarget("ipv6", "ipv4", false), "ipv6");
    assert.equal(sectionTarget("ipv4", "ipv6", false), "ipv4");
    assert.equal(sectionTarget("ipv6", "ipv4", true), "wait");
    assert.equal(sectionTarget("ipv6", "ipv6", false), null);
    assert.equal(sectionTarget("ipv6", "ipv6", true), null);
    assert.equal(sectionTarget(null, "ipv4", false), null);
    assert.equal(sectionTarget("route", "ipv4", true), null);
  });

  it("family label", () => {
    assert.equal(familyLabel("ipv4"), "IPv4");
    assert.equal(familyLabel("ipv6"), "IPv6");
  });

  it("suggests a free rule number inside the served range", () => {
    assert.equal(suggestedRuleNumber([], caps), "100");
    assert.equal(suggestedRuleNumber([rule(10), rule(20)], caps), "21");
    assert.equal(suggestedRuleNumber([rule(65535)], caps), "1");
    assert.equal(suggestedRuleNumber([rule(5)], null), "6");
  });

  it("ge/le bounds start at the typed prefix length", () => {
    assert.deepEqual(geLeBounds("ipv4", "10.0.0.0/16", caps), { min: 16, max: 32 });
    assert.deepEqual(geLeBounds("ipv6", "", caps), { min: 0, max: 128 });
    assert.deepEqual(geLeBounds("ipv4", "10.0.0.0", null), { min: undefined, max: undefined });
  });
});

describe("access-list form helpers", () => {
  const caps = { ranges: { rule: { min: 1, max: 65535 }, ipv4_list: { min: 0, max: 4294967295 } } } as AccessListCapabilitiesResponse;
  const rule = (over: Partial<AccessListRule> = {}): AccessListRule => ({
    rule_number: 10,
    action: "permit",
    description: null,
    source_any: false,
    source_host: null,
    source_network: null,
    source_inverse_mask: null,
    source_exact_match: false,
    destination_any: false,
    destination_host: null,
    destination_network: null,
    destination_inverse_mask: null,
    ...over,
  });

  it("suggests a free rule number inside the served range, with the lab range when caps are absent", () => {
    assert.equal(suggestedAccessRuleNumber([], caps), "100");
    assert.equal(suggestedAccessRuleNumber([rule({ rule_number: 10 }), rule({ rule_number: 20 })], caps), "21");
    assert.equal(suggestedAccessRuleNumber([rule({ rule_number: 65535 })], caps), "1");
    assert.equal(suggestedAccessRuleNumber([rule({ rule_number: 65535 })], null), "1");
  });

  it("shows every endpoint leaf the device holds", () => {
    assert.deepEqual(endpointParts(rule({ source_any: true, source_network: "10.0.0.0", source_inverse_mask: "0.0.0.255" }), "source"), [
      { key: "any" },
      { key: "networkMask", address: "10.0.0.0", mask: "0.0.0.255" },
    ]);
    assert.deepEqual(endpointParts(rule({ source_network: "2001:db8::/32", source_exact_match: true }), "source"), [
      { key: "network", address: "2001:db8::/32" },
      { key: "exactMatch" },
    ]);
    assert.deepEqual(endpointParts(rule({ destination_host: "10.0.0.1" }), "destination"), [
      { key: "host", address: "10.0.0.1" },
    ]);
    assert.deepEqual(endpointParts(rule(), "destination"), []);
  });
});
