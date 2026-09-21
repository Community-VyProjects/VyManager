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
import {
  PrefixListService,
  type PrefixListBatchRequest,
  type PrefixListRule,
} from "@/lib/api/prefix-list";
import {
  AccessListService,
  type AccessListBatchRequest,
  type AccessListRule,
} from "@/lib/api/access-list";
import {
  RouteService,
  type PolicyRouteRule,
  type RouteBatchRequest,
} from "@/lib/api/route";
import {
  RouteMapService,
  type RouteMapBatchRequest,
  type RouteMapRule,
} from "@/lib/api/route-map";
import type { VyOSResponse } from "@/lib/types/api";
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
import {
  emptyPrefixListRuleDraft,
  prefixListRuleDraftFrom,
  submitPrefixListUpdate,
  validatePrefixListRule,
} from "./prefix-list-rule-form";
import {
  emptyAccessListRuleDraft,
  submitAccessListCreate,
  submitAccessListUpdate,
  validateAccessListRule,
} from "./access-list-rule-form";
import {
  emptyRouteRuleDraft,
  routeRuleDraftFrom,
  submitRouteRuleCreate,
  submitRouteRuleUpdate,
  validateRouteRuleCreate,
} from "./route-rule-form";
import {
  emptyRouteMapRuleDraft,
  routeMapRuleDraftFrom,
  submitRouteMapCreate,
  submitRouteMapUpdate,
} from "./route-map-rule-form";

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

class RecordingPrefix extends PrefixListService {
  calls: PrefixListBatchRequest[] = [];
  async batchConfigure(request: PrefixListBatchRequest): Promise<VyOSResponse> {
    this.calls.push(request);
    return { success: true };
  }
}

class RecordingAccess extends AccessListService {
  calls: AccessListBatchRequest[] = [];
  async batchConfigure(request: AccessListBatchRequest): Promise<VyOSResponse> {
    this.calls.push(request);
    return { success: true };
  }
}

class RecordingRoute extends RouteService {
  calls: RouteBatchRequest[] = [];
  async batchConfigure(request: RouteBatchRequest): Promise<VyOSResponse> {
    this.calls.push(request);
    return { success: true };
  }
}

class RecordingRouteMap extends RouteMapService {
  calls: RouteMapBatchRequest[] = [];
  async batchConfigure(request: RouteMapBatchRequest): Promise<VyOSResponse> {
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

const storedPrefix: PrefixListRule = {
  rule_number: 10,
  action: "permit",
  description: "corp",
  prefix: "10.0.0.0/8",
  ge: 16,
  le: null,
};

const storedAccess: AccessListRule = {
  rule_number: 10,
  action: "permit",
  description: "corp",
  source_type: "host",
  source_address: "10.0.0.1",
  source_mask: null,
  destination_type: "any",
  destination_address: null,
  destination_mask: null,
};

const storedRoute: PolicyRouteRule = {
  rule_number: 10,
  description: "corp",
  disable: false,
  log: null,
  match: { source_address: "10.0.0.1" },
  set: { table: "main" },
};

const storedMap: RouteMapRule = {
  rule_number: 10,
  description: "corp",
  action: "permit",
  call: null,
  continue_rule: null,
  on_match_goto: null,
  on_match_next: false,
  match: { as_path: "ASP" },
  set: { local_preference: 100 },
};

describe("as-path list rule create", () => {
  it("rejects a missing regex", () => {
    assert.equal(validateRegexListRule(emptyRegexListRuleDraft()), "Regex pattern is required");
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
    assert.match(validateLocalRoute(draft, "ipv4") ?? "", /matching criterion/);
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

describe("prefix-list rule", () => {
  it("rejects a missing prefix", () => {
    assert.equal(
      validatePrefixListRule(emptyPrefixListRuleDraft(), "ipv4"),
      "Please enter a prefix in CIDR notation",
    );
  });

  it("deletes a cleared ge on update", async () => {
    const service = new RecordingPrefix();
    const draft = prefixListRuleDraftFrom(storedPrefix);
    draft.ge = "";
    await submitPrefixListUpdate("PL", "ipv4", storedPrefix, draft, service);
    assert.ok(service.calls[0].operations.some((op) => op.op === "delete_rule_ge"));
  });

  it("sends nothing when nothing changed", async () => {
    const service = new RecordingPrefix();
    const result = await submitPrefixListUpdate(
      "PL",
      "ipv4",
      storedPrefix,
      prefixListRuleDraftFrom(storedPrefix),
      service,
    );
    assert.equal(result, null);
    assert.equal(service.calls.length, 0);
  });
});

describe("access-list rule", () => {
  it("rejects a host source with no address", () => {
    const draft = emptyAccessListRuleDraft();
    draft.sourceType = "host";
    assert.equal(
      validateAccessListRule(draft, "ipv4"),
      "Please enter a source address for host type",
    );
  });

  it("maps network to inverse-mask on create", async () => {
    const service = new RecordingAccess();
    const draft = emptyAccessListRuleDraft();
    draft.ruleNumber = 10;
    draft.sourceType = "network";
    draft.sourceAddress = "10.0.0.0";
    draft.sourceMask = "0.255.255.255";
    await submitAccessListCreate("1", "ipv4", draft, service);
    assert.ok(
      service.calls[0].operations.some(
        (op) => op.op === "set_rule_source_inverse_mask" && op.value === "10.0.0.0",
      ),
    );
  });

  it("sends nothing when nothing changed", async () => {
    const service = new RecordingAccess();
    const { accessListRuleDraftFrom } = await import("./access-list-rule-form");
    const result = await submitAccessListUpdate(
      "1",
      "ipv4",
      storedAccess,
      accessListRuleDraftFrom(storedAccess, "ipv4"),
      service,
    );
    assert.equal(result, null);
    assert.equal(service.calls.length, 0);
  });
});

describe("route rule create", () => {
  it("rejects a missing rule number", () => {
    const draft = emptyRouteRuleDraft();
    draft.ruleNumber = 0;
    assert.equal(validateRouteRuleCreate(draft), "Rule number is required");
  });

  it("emits only filled match and set fields", async () => {
    const service = new RecordingRoute();
    const draft = emptyRouteRuleDraft();
    draft.ruleNumber = 10;
    draft.description = "corp";
    draft.sourceAddress = "10.0.0.1";
    draft.actionTableMode = "main";
    await submitRouteRuleCreate("route", "FOO", draft, false, service);
    assert.deepEqual(service.calls[0].operations, [
      { op: "create_rule" },
      { op: "set_rule_description", value: "corp" },
      { op: "set_match_source_address", value: "10.0.0.1" },
      { op: "set_table", value: "main" },
    ]);
  });
});

describe("route rule update", () => {
  it("sends nothing when the operator changed nothing", async () => {
    const service = new RecordingRoute();
    const result = await submitRouteRuleUpdate(
      "route",
      "FOO",
      storedRoute,
      routeRuleDraftFrom(storedRoute),
      false,
      service,
    );
    assert.equal(result, null);
    assert.equal(service.calls.length, 0);
  });

  it("deletes a cleared description", async () => {
    const service = new RecordingRoute();
    const draft = routeRuleDraftFrom(storedRoute);
    draft.description = "";
    await submitRouteRuleUpdate("route", "FOO", storedRoute, draft, false, service);
    assert.ok(service.calls[0].operations.some((op) => op.op === "delete_rule_description"));
  });

  it("writes the stored rule number when the draft number was altered", async () => {
    const service = new RecordingRoute();
    const draft = routeRuleDraftFrom(storedRoute);
    draft.ruleNumber = 999;
    draft.description = "new";
    await submitRouteRuleUpdate("route", "FOO", storedRoute, draft, false, service);
    assert.equal(service.calls[0].rule_number, 10);
  });
});

describe("route-map rule", () => {
  it("emits only filled fields on create", async () => {
    const service = new RecordingRouteMap();
    const draft = emptyRouteMapRuleDraft();
    draft.ruleNumber = 10;
    draft.description = "corp";
    draft.match = { as_path: "ASP" };
    await submitRouteMapCreate("RM", draft, service);
    assert.equal(service.calls[0].name, "RM");
    assert.ok(service.calls[0].operations.some((op) => op.op === "set_rule"));
    assert.ok(service.calls[0].operations.some((op) => op.op === "set_rule_description" && op.value === "corp"));
  });

  it("sends nothing when the operator changed nothing", async () => {
    const service = new RecordingRouteMap();
    const result = await submitRouteMapUpdate(
      "RM",
      storedMap,
      routeMapRuleDraftFrom(storedMap),
      service,
    );
    assert.equal(result, null);
    assert.equal(service.calls.length, 0);
  });

  it("writes the stored rule number when the draft number was altered", async () => {
    const service = new RecordingRouteMap();
    const draft = routeMapRuleDraftFrom(storedMap);
    draft.ruleNumber = 999;
    draft.description = "new";
    await submitRouteMapUpdate("RM", storedMap, draft, service);
    assert.equal(service.calls[0].rule_number, 10);
  });
});
