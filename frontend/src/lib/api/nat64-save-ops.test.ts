import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPoolCreateOps,
  buildPoolUpdateOps,
  buildRuleCreateOps,
  buildRuleUpdateOps,
  nat64PoolProblem,
  nat64RuleProblem,
  type NAT64PoolFields,
  type NAT64RuleFields,
} from "./nat64-save-ops";
import {
  nat64Service,
  type NAT64BatchOperation,
  type NAT64SourceRule,
  type NAT64TranslationPool,
} from "./nat64";

const RULE: NAT64SourceRule = {
  rule_number: 100,
  description: "v6 to v4",
  disable: false,
  match_mark: "10",
  source_prefix: "64:ff9b::/96",
  translation_pools: [],
};

const POOL: NAT64TranslationPool = {
  pool_number: 1,
  address: "203.0.113.0/24",
  description: "pool one",
  disable: false,
  port: "10000-20000",
  protocol: { tcp: true, udp: false, icmp: false },
};

function ruleFields(rule: NAT64SourceRule): NAT64RuleFields {
  return {
    description: rule.description ?? "",
    sourcePrefix: rule.source_prefix ?? "",
    matchMark: rule.match_mark ?? "",
    disable: rule.disable,
  };
}

function poolFields(pool: NAT64TranslationPool): NAT64PoolFields {
  return {
    address: pool.address ?? "",
    description: pool.description ?? "",
    port: pool.port ?? "",
    protocol: pool.protocol ?? { tcp: false, udp: false, icmp: false },
    disable: pool.disable,
  };
}

type Sent = Array<[number, NAT64BatchOperation[], number | undefined]>;

function stubbed(): { service: typeof nat64Service; sent: Sent } {
  const sent: Sent = [];
  const service = Object.create(nat64Service) as typeof nat64Service;
  service.batchConfigure = async (ruleNumber, operations, poolNumber) => {
    sent.push([ruleNumber, operations, poolNumber]);
    return { success: true };
  };
  return { service, sent };
}

describe("nat64RuleProblem", () => {
  it("requires a source prefix the lab commit needs", () => {
    assert.equal(nat64RuleProblem({ ...ruleFields(RULE), sourcePrefix: "  " }), "sourcePrefixRequired");
    assert.equal(nat64RuleProblem(ruleFields(RULE)), null);
  });

  it("bounds match mark to the lab val_help range", () => {
    for (const mark of ["0", "010", "2147483648", "1.5", "-1", "a"]) {
      assert.equal(nat64RuleProblem({ ...ruleFields(RULE), matchMark: mark }), "matchMarkRange", mark);
    }
    for (const mark of ["", "1", " 2147483647 "]) {
      assert.equal(nat64RuleProblem({ ...ruleFields(RULE), matchMark: mark }), null, mark);
    }
  });
});

describe("nat64PoolProblem", () => {
  it("requires the address and port the lab commit needs", () => {
    assert.equal(nat64PoolProblem({ ...poolFields(POOL), address: " " }), "addressRequired");
    assert.equal(nat64PoolProblem({ ...poolFields(POOL), port: "" }), "portRequired");
    assert.equal(nat64PoolProblem(poolFields(POOL)), null);
  });
});

describe("rule ops", () => {
  it("sends nothing for an untouched or whitespace-only edit", () => {
    assert.deepEqual(buildRuleUpdateOps(RULE, ruleFields(RULE)), []);
    assert.deepEqual(
      buildRuleUpdateOps(RULE, { ...ruleFields(RULE), description: " v6 to v4 ", matchMark: "10 " }),
      [],
    );
  });

  it("sets changed leaves trimmed and deletes cleared optional leaves", () => {
    assert.deepEqual(
      buildRuleUpdateOps(RULE, {
        description: "",
        sourcePrefix: " 2001:db8::/96 ",
        matchMark: "",
        disable: true,
      }),
      [
        { op: "delete_source_rule_description" },
        { op: "set_source_rule_source_prefix", value: "2001:db8::/96" },
        { op: "delete_source_rule_match_mark" },
        { op: "set_source_rule_disable" },
      ],
    );
  });

  it("never deletes the required source prefix", () => {
    const ops = buildRuleUpdateOps(RULE, { ...ruleFields(RULE), sourcePrefix: "" });
    assert.ok(!ops.some((op) => op.op === "delete_source_rule_source_prefix"));
  });

  it("creates the rule with only the filled leaves", () => {
    assert.deepEqual(
      buildRuleCreateOps({ description: " ", sourcePrefix: "64:ff9b::/96", matchMark: "", disable: false }),
      [{ op: "set_source_rule" }, { op: "set_source_rule_source_prefix", value: "64:ff9b::/96" }],
    );
  });

  it("enables a disabled rule", () => {
    assert.deepEqual(
      buildRuleUpdateOps({ ...RULE, disable: true }, ruleFields(RULE)),
      [{ op: "delete_source_rule_disable" }],
    );
  });
});

describe("pool ops", () => {
  it("sends nothing for an untouched edit", () => {
    assert.deepEqual(buildPoolUpdateOps(POOL, poolFields(POOL)), []);
  });

  it("emits every changed leaf and protocol flag", () => {
    assert.deepEqual(
      buildPoolUpdateOps(POOL, {
        address: "198.51.100.0/24",
        description: "",
        port: "20001-30000",
        protocol: { tcp: false, udp: true, icmp: true },
        disable: true,
      }),
      [
        { op: "set_source_rule_translation_pool_address", value: "198.51.100.0/24" },
        { op: "delete_source_rule_translation_pool_description" },
        { op: "set_source_rule_translation_pool_port", value: "20001-30000" },
        { op: "delete_source_rule_translation_pool_protocol_tcp" },
        { op: "set_source_rule_translation_pool_protocol_udp" },
        { op: "set_source_rule_translation_pool_protocol_icmp" },
        { op: "set_source_rule_translation_pool_disable" },
      ],
    );
  });

  it("never deletes the required address or port", () => {
    const ops = buildPoolUpdateOps(POOL, { ...poolFields(POOL), address: "", port: " " });
    assert.deepEqual(ops, []);
  });

  it("reads a pool with no protocol node as no flags", () => {
    assert.deepEqual(
      buildPoolUpdateOps({ ...POOL, protocol: null }, { ...poolFields(POOL), protocol: { tcp: true, udp: false, icmp: false } }),
      [{ op: "set_source_rule_translation_pool_protocol_tcp" }],
    );
  });

  it("creates the pool with its leaves", () => {
    assert.deepEqual(buildPoolCreateOps(poolFields(POOL)), [
      { op: "set_source_rule_translation_pool" },
      { op: "set_source_rule_translation_pool_address", value: "203.0.113.0/24" },
      { op: "set_source_rule_translation_pool_description", value: "pool one" },
      { op: "set_source_rule_translation_pool_port", value: "10000-20000" },
      { op: "set_source_rule_translation_pool_protocol_tcp" },
    ]);
  });
});

describe("nat64Service", () => {
  it("posts rule and pool saves under the right rule and pool numbers", async () => {
    const { service, sent } = stubbed();
    await service.updateRule(RULE, { ...ruleFields(RULE), description: "new" });
    await service.createPool(100, 2, poolFields(POOL));
    await service.updatePool(100, POOL, { ...poolFields(POOL), disable: true });
    assert.deepEqual(sent, [
      [100, [{ op: "set_source_rule_description", value: "new" }], undefined],
      [100, buildPoolCreateOps(poolFields(POOL)), 2],
      [100, [{ op: "set_source_rule_translation_pool_disable" }], 1],
    ]);
  });

  it("throws the device error of a rejected commit as an ApiError", async () => {
    const { apiClient } = await import("./client");
    const original = apiClient.post;
    apiClient.post = (async () => ({ success: false, error: "Commit failed" })) as typeof apiClient.post;
    try {
      await assert.rejects(
        nat64Service.toggleRuleDisable(100, false),
        (err: unknown) => !(err instanceof Error) && (err as { message: string }).message === "Commit failed",
      );
      apiClient.post = (async () => ({ success: false })) as typeof apiClient.post;
      await assert.rejects(
        nat64Service.reorderRules([]),
        (err: unknown) => (err as { message: string }).message === "",
      );
    } finally {
      apiClient.post = original;
    }
  });

  it("does not post an empty batch", async () => {
    const { apiClient } = await import("./client");
    const original = apiClient.post;
    let posts = 0;
    apiClient.post = (async () => {
      posts += 1;
      return { success: true };
    }) as typeof apiClient.post;
    try {
      await nat64Service.updateRule(RULE, ruleFields(RULE));
      assert.equal(posts, 0);
    } finally {
      apiClient.post = original;
    }
  });
});
