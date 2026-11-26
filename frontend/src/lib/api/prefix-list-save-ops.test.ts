import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyRuleForm,
  listCreateOps,
  listDeleteOps,
  listUpdateOps,
  prefixListProblem,
  prefixLengthOf,
  prefixListRuleProblem,
  prefixValid,
  reorderMoveCount,
  ruleDeleteOps,
  ruleFormFrom,
  ruleSaveOps,
  type PrefixListRuleForm,
} from "./prefix-list-save-ops";
import {
  prefixListService,
  type PrefixList,
  type PrefixListBatchRequest,
  type PrefixListCapabilitiesResponse,
  type PrefixListRule,
} from "./prefix-list";
import { apiClient } from "./client";

const CAPS: PrefixListCapabilitiesResponse = {
  version: "1.5",
  features: { ipv4_prefix_lists: { supported: true }, ipv6_prefix_lists: { supported: true } },
  values: { rule_actions: ["permit", "deny"] },
  ranges: {
    rule: { min: 1, max: 65535 },
    prefix_length_ipv4: { min: 0, max: 32 },
    prefix_length_ipv6: { min: 0, max: 128 },
  },
  description_max_length: 255,
};

const RULE: PrefixListRule = {
  rule_number: 10,
  action: "permit",
  description: "corp",
  prefix: "10.0.0.0/8",
  ge: 16,
  le: 24,
};

const LIST: PrefixList = { name: "PL", list_type: "ipv4", description: "corp lists", rules: [RULE] };

function form(over: Partial<PrefixListRuleForm> = {}): PrefixListRuleForm {
  return { ...emptyRuleForm("20"), action: "permit", prefix: "192.0.2.0/24", ...over };
}

// ----------------------------------------------------------------------------
// Emits
// ----------------------------------------------------------------------------

describe("list ops", () => {
  it("create sends the list and a set description", () => {
    assert.deepEqual(listCreateOps({ name: " PL ", description: " d " }), [
      { op: "create_prefix_list" },
      { op: "set_prefix_list_description", value: "d" },
    ]);
    assert.deepEqual(listCreateOps({ name: "PL", description: "" }), [{ op: "create_prefix_list" }]);
  });

  it("an unchanged edit sends nothing", () => {
    assert.deepEqual(listUpdateOps(LIST, { name: "PL", description: "corp lists " }), []);
  });

  it("a changed description is one set; a cleared one is its leaf delete", () => {
    assert.deepEqual(listUpdateOps(LIST, { name: "PL", description: "new" }), [
      { op: "set_prefix_list_description", value: "new" },
    ]);
    assert.deepEqual(listUpdateOps(LIST, { name: "PL", description: "  " }), [{ op: "delete_prefix_list_description" }]);
  });

  it("delete is the list delete", () => {
    assert.deepEqual(listDeleteOps(), [{ op: "delete_prefix_list" }]);
  });
});

describe("rule ops", () => {
  it("create sends every filled leaf after the rule node", () => {
    assert.deepEqual(ruleSaveOps(null, form({ description: " web ", ge: "25", le: "32" })), [
      { op: "create_rule" },
      { op: "set_rule_action", value: "permit" },
      { op: "set_rule_description", value: "web" },
      { op: "set_rule_prefix", value: "192.0.2.0/24" },
      { op: "set_rule_ge", value: "25" },
      { op: "set_rule_le", value: "32" },
    ]);
  });

  it("create skips the empty optional leaves", () => {
    assert.deepEqual(ruleSaveOps(null, form()), [
      { op: "create_rule" },
      { op: "set_rule_action", value: "permit" },
      { op: "set_rule_prefix", value: "192.0.2.0/24" },
    ]);
  });

  it("an unchanged edit sends nothing, even padded", () => {
    const f = ruleFormFrom(RULE);
    assert.deepEqual(ruleSaveOps(RULE, f), []);
    assert.deepEqual(ruleSaveOps(RULE, { ...f, prefix: ` ${f.prefix} `, ge: "16 " }), []);
  });

  it("an edit never deletes and recreates the rule", () => {
    const ops = ruleSaveOps(RULE, { ...ruleFormFrom(RULE), action: "deny", prefix: "10.1.0.0/16" });
    assert.deepEqual(ops, [
      { op: "set_rule_action", value: "deny" },
      { op: "set_rule_prefix", value: "10.1.0.0/16" },
    ]);
  });

  it("cleared leaves send their leaf deletes", () => {
    const ops = ruleSaveOps(RULE, { ...ruleFormFrom(RULE), description: "", ge: "", le: "" });
    assert.deepEqual(ops, [{ op: "delete_rule_description" }, { op: "delete_rule_ge" }, { op: "delete_rule_le" }]);
  });

  it("a changed ge is one set", () => {
    assert.deepEqual(ruleSaveOps(RULE, { ...ruleFormFrom(RULE), ge: "20" }), [{ op: "set_rule_ge", value: "20" }]);
  });

  it("delete is the rule delete", () => {
    assert.deepEqual(ruleDeleteOps(), [{ op: "delete_rule" }]);
  });
});

// ----------------------------------------------------------------------------
// Save checks
// ----------------------------------------------------------------------------

describe("rule save checks", () => {
  const check = (f: PrefixListRuleForm, listType: "ipv4" | "ipv6" = "ipv4", original: PrefixListRule | null = null) =>
    prefixListRuleProblem(listType, original, f, CAPS, [RULE]);

  it("accepts a valid rule", () => {
    assert.equal(check(form()), null);
    assert.equal(check(form({ prefix: "2001:db8::/32", ge: "48", le: "128" }), "ipv6"), null);
  });

  it("rule number: required, strict digits, served range, free", () => {
    assert.deepEqual(check(form({ rule_number: "" })), { key: "ruleNumberRequired" });
    for (const n of ["0", "65536", "1.5", "+5", "1e2", "\u0663"]) {
      assert.deepEqual(check(form({ rule_number: n })), { key: "ruleNumberRange", min: 1, max: 65535 }, n);
    }
    assert.deepEqual(check(form({ rule_number: "10" })), { key: "ruleNumberTaken" });
    assert.equal(check(form({ rule_number: "65535" })), null);
  });

  it("edit does not recheck the locked rule number", () => {
    assert.equal(check({ ...ruleFormFrom(RULE) }, "ipv4", RULE), null);
  });

  it("action is required and from the served list", () => {
    assert.deepEqual(check(form({ action: "" })), { key: "actionRequired" });
    assert.deepEqual(check(form({ action: "accept" })), { key: "actionInvalid" });
  });

  it("description length", () => {
    assert.deepEqual(check(form({ description: "x".repeat(256) })), { key: "descriptionTooLong", max: 255 });
    assert.equal(check(form({ description: "x".repeat(255) })), null);
  });

  it("prefix: required, family, host bits, zone index", () => {
    assert.deepEqual(check(form({ prefix: " " })), { key: "prefixRequired" });
    for (const p of ["10.0.0.1/8", "10.0.0.0", "10.0.0.0/33", "010.0.0.0/8", "10.0.0.0/08", "2001:db8::/32"]) {
      assert.deepEqual(check(form({ prefix: p })), { key: "prefixInvalidIpv4" }, p);
    }
    for (const p of [
      "2001:db8::1/32",
      "fe80::%eth0/64",
      "2001:db8::/129",
      "10.0.0.0/8",
      "::ffff:10.0.0.0/104",
      "64:ff9b::10.0.0.0/120",
    ]) {
      assert.deepEqual(check(form({ prefix: p }), "ipv6"), { key: "prefixInvalidIpv6" }, p);
    }
  });

  it("ge / le use the served range of the family with strict digits", () => {
    assert.deepEqual(check(form({ ge: "33" })), { key: "geRange", min: 0, max: 32 });
    assert.deepEqual(check(form({ le: "-1" })), { key: "leRange", min: 0, max: 32 });
    assert.deepEqual(check(form({ ge: "2.5" })), { key: "geRange", min: 0, max: 32 });
    assert.deepEqual(check(form({ prefix: "2001:db8::/32", le: "129" }), "ipv6"), { key: "leRange", min: 0, max: 128 });
    assert.equal(check(form({ prefix: "2001:db8::/32", le: "64" }), "ipv6"), null);
  });

  it("ge >= length, le >= length, ge <= le; equal is allowed", () => {
    assert.deepEqual(check(form({ prefix: "10.0.0.0/16", ge: "8" })), { key: "geBelowLength", length: 16 });
    assert.deepEqual(check(form({ prefix: "10.0.0.0/16", le: "15" })), { key: "leBelowLength", length: 16 });
    assert.deepEqual(check(form({ prefix: "10.0.0.0/16", ge: "25", le: "24" })), { key: "geAboveLe" });
    assert.equal(check(form({ prefix: "10.0.0.0/16", ge: "16" })), null);
    assert.equal(check(form({ prefix: "10.0.0.0/16", le: "16" })), null);
    assert.equal(check(form({ prefix: "10.0.0.0/16", ge: "24", le: "24" })), null);
  });
});

describe("duplicate rule save check", () => {
  const V6: PrefixListRule = { rule_number: 5, action: "permit", description: null, prefix: "2001:db8::/32", ge: 48, le: null };
  const same = { rule_number: "20", action: "permit", description: "corp", prefix: "10.0.0.0/8", ge: "16", le: "24" };

  it("a rule equal to another rule of the list is keyed with that rule", () => {
    assert.deepEqual(prefixListRuleProblem("ipv4", null, same, CAPS, [RULE]), { key: "ruleDuplicate", rule: 10 });
  });

  it("compares after normalization: trim, numeric ge/le", () => {
    const padded = { ...same, description: " corp ", prefix: " 10.0.0.0/8 ", ge: "016", le: "24 " };
    assert.deepEqual(prefixListRuleProblem("ipv4", null, padded, CAPS, [RULE]), { key: "ruleDuplicate", rule: 10 });
  });

  it("IPv6 prefix text is lowercased and compressed", () => {
    for (const prefix of ["2001:DB8::/32", "2001:db8:0:0::/32", "2001:0db8:0000:0000:0000:0000:0000:0000/32"]) {
      const f = { rule_number: "6", action: "permit", description: "", prefix, ge: "48", le: "" };
      assert.deepEqual(prefixListRuleProblem("ipv6", null, f, CAPS, [V6]), { key: "ruleDuplicate", rule: 5 }, prefix);
    }
  });

  it("any differing leaf is not a duplicate", () => {
    for (const over of [{ action: "deny" }, { description: "" }, { prefix: "10.0.0.0/9" }, { ge: "17" }, { le: "" }]) {
      assert.equal(prefixListRuleProblem("ipv4", null, { ...same, ...over }, CAPS, [RULE]), null, JSON.stringify(over));
    }
  });

  it("an edit is not compared with itself, but is with the others", () => {
    assert.equal(prefixListRuleProblem("ipv4", RULE, ruleFormFrom(RULE), CAPS, [RULE]), null);
    const other: PrefixListRule = { ...RULE, rule_number: 30, action: "deny" };
    const edited = { ...ruleFormFrom(other), action: "permit" };
    assert.deepEqual(prefixListRuleProblem("ipv4", other, edited, CAPS, [RULE, other]), { key: "ruleDuplicate", rule: 10 });
  });
});

describe("prefix helpers", () => {
  it("an IPv6 prefix with a dotted IPv4 tail is rejected; the hex form is valid", () => {
    assert.equal(prefixValid("ipv6", "::ffff:10.0.0.0/104"), false);
    assert.equal(prefixValid("ipv6", "64:ff9b::10.0.0.0/120"), false);
    assert.equal(prefixValid("ipv6", "::ffff:a00:0/104"), true);
    assert.equal(prefixValid("ipv4", "10.0.0.0/8"), true);
  });

  it("prefixLengthOf reads the length or null", () => {
    assert.equal(prefixLengthOf(" 10.0.0.0/16 "), 16);
    assert.equal(prefixLengthOf("2001:db8::/128"), 128);
    assert.equal(prefixLengthOf("10.0.0.0"), null);
  });
});

describe("reorder move count", () => {
  it("counts only rules off their sorted slot", () => {
    assert.equal(reorderMoveCount([10, 20, 30]), 0);
    assert.equal(reorderMoveCount([20, 10, 30]), 2);
    assert.equal(reorderMoveCount([30, 10, 20]), 3);
    assert.equal(reorderMoveCount([10, 30, 20, 40]), 2);
    assert.equal(reorderMoveCount([]), 0);
  });
});

describe("list save checks", () => {
  it("create checks the name against the family's lists", () => {
    assert.deepEqual(prefixListProblem({ name: " ", description: "" }, [], CAPS), { key: "nameRequired" });
    for (const name of ["PL.1", "PL 1", "PL/1"]) {
      assert.deepEqual(prefixListProblem({ name, description: "" }, [], CAPS), { key: "nameInvalid" }, name);
    }
    assert.deepEqual(prefixListProblem({ name: "PL", description: "" }, ["PL"], CAPS), { key: "nameTaken" });
    assert.equal(prefixListProblem({ name: "a-B_9", description: "" }, ["PL"], CAPS), null);
  });

  it("edit skips the name and checks the description", () => {
    assert.equal(prefixListProblem({ name: "PL", description: "d" }, null, CAPS), null);
    assert.deepEqual(prefixListProblem({ name: "PL", description: "x".repeat(256) }, null, CAPS), {
      key: "descriptionTooLong",
      max: 255,
    });
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
  it("only posts the batch: no config refresh after a commit", async () => {
    const stub = stubPost({ success: true });
    try {
      await prefixListService.saveRule("ipv6", "PL6", 5, null, form({ prefix: "2001:db8::/32" }));
      assert.equal(stub.calls.length, 1);
      const [path, body] = stub.calls[0];
      assert.equal(path, "/vyos/prefix-list/batch");
      assert.deepEqual((body as PrefixListBatchRequest).rule_number, 5);
      assert.deepEqual((body as PrefixListBatchRequest).list_type, "ipv6");
    } finally {
      stub.restore();
    }
  });

  it("an unchanged edit makes no request", async () => {
    const stub = stubPost({ success: true });
    try {
      const result = await prefixListService.saveRule("ipv4", "PL", 10, RULE, ruleFormFrom(RULE));
      assert.deepEqual(result, { success: true });
      assert.equal(stub.calls.length, 0);
    } finally {
      stub.restore();
    }
  });

  it("a failed commit throws the device error", async () => {
    const stub = stubPost({ success: false, error: "prefix-list PL still in use" });
    try {
      await assert.rejects(prefixListService.deletePrefixList(LIST), { message: "prefix-list PL still in use" });
    } finally {
      stub.restore();
    }
  });

  it("a failed commit with no error throws an empty message", async () => {
    const stub = stubPost({ success: false });
    try {
      await assert.rejects(prefixListService.deleteRule("ipv4", "PL", 10), { message: "" });
    } finally {
      stub.restore();
    }
  });

  it("a failed reorder throws the device error", async () => {
    const stub = stubPost({ success: false, error: "Commit failed" });
    try {
      await assert.rejects(prefixListService.reorderRules("ipv4", "PL", [20, 10]), { message: "Commit failed" });
      assert.deepEqual(stub.calls[0], [
        "/vyos/prefix-list/reorder",
        { list_type: "ipv4", name: "PL", rule_numbers: [20, 10] },
      ]);
    } finally {
      stub.restore();
    }
  });

  it("list create and update post the trimmed name and the diff", async () => {
    const stub = stubPost({ success: true });
    try {
      await prefixListService.createPrefixList("ipv4", { name: " NEW ", description: "" });
      await prefixListService.updatePrefixList(LIST, { name: "PL", description: "" });
      assert.deepEqual(stub.calls.map(([, body]) => body), [
        { list_type: "ipv4", name: "NEW", operations: [{ op: "create_prefix_list" }] },
        { list_type: "ipv4", name: "PL", operations: [{ op: "delete_prefix_list_description" }] },
      ]);
    } finally {
      stub.restore();
    }
  });
});
