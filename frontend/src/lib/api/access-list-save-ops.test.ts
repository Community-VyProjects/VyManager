import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accessListProblem,
  accessListRuleProblem,
  emptyRuleForm,
  isExtendedList,
  listCreateOps,
  listDeleteOps,
  listUpdateOps,
  normalizeRuleForm,
  ruleDeleteOps,
  ruleFormFrom,
  ruleSaveOps,
  type AccessListRuleForm,
} from "./access-list-save-ops";
import {
  accessListService,
  type AccessList,
  type AccessListBatchRequest,
  type AccessListCapabilitiesResponse,
  type AccessListRule,
} from "./access-list";
import { apiClient } from "./client";

const CAPS: AccessListCapabilitiesResponse = {
  version: "1.5",
  features: { ipv4_access_lists: { supported: true }, ipv6_access_lists: { supported: true } },
  values: { rule_actions: ["permit", "deny"] },
  ranges: { rule: { min: 1, max: 65535 }, ipv4_list: { min: 0, max: 4294967295 } },
  extended_ranges: [
    { min: 100, max: 199 },
    { min: 2000, max: 2699 },
  ],
  description_max_length: 255,
};

function rule(over: Partial<AccessListRule> = {}): AccessListRule {
  return {
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
  };
}

const V4 = rule({ description: "corp", source_host: "10.0.0.1", destination_any: true });
const V6 = rule({ source_network: "2001:db8::/32", source_exact_match: true });
const LIST: AccessList = { number: "1", list_type: "ipv4", description: "corp lists", rules: [V4] };

function form(over: Partial<AccessListRuleForm> = {}): AccessListRuleForm {
  return { ...emptyRuleForm("20", "permit"), ...over };
}

const ops = (list: { op: string }[]) => list.map((o) => o.op);

// ----------------------------------------------------------------------------
// Emits
// ----------------------------------------------------------------------------

describe("list ops", () => {
  it("create sends the list and a set description", () => {
    assert.deepEqual(listCreateOps({ name: " 100 ", description: " d " }), [
      { op: "create_access_list" },
      { op: "set_access_list_description", value: "d" },
    ]);
    assert.deepEqual(listCreateOps({ name: "ACL6", description: "" }), [{ op: "create_access_list" }]);
  });

  it("an unchanged edit sends nothing", () => {
    assert.deepEqual(listUpdateOps(LIST, { name: "1", description: "corp lists " }), []);
  });

  it("a changed description is one set; a cleared one is its leaf delete", () => {
    assert.deepEqual(listUpdateOps(LIST, { name: "1", description: "new" }), [
      { op: "set_access_list_description", value: "new" },
    ]);
    assert.deepEqual(listUpdateOps(LIST, { name: "1", description: "  " }), [{ op: "delete_access_list_description" }]);
  });

  it("delete is the list delete; rule delete is the rule delete", () => {
    assert.deepEqual(listDeleteOps(), [{ op: "delete_access_list" }]);
    assert.deepEqual(ruleDeleteOps(), [{ op: "delete_rule" }]);
  });
});

describe("ipv4 rule ops", () => {
  it("create sends every chosen leaf after the rule node, trimmed", () => {
    const f = form({
      description: " web ",
      source: "network",
      source_network: " 10.0.0.0 ",
      source_inverse_mask: "0.0.0.255 ",
      destination: "host",
      destination_host: " 192.0.2.1",
    });
    assert.deepEqual(ruleSaveOps("ipv4", null, f), [
      { op: "create_rule" },
      { op: "set_rule_action", value: "permit" },
      { op: "set_rule_description", value: "web" },
      { op: "set_rule_source_network", value: "10.0.0.0" },
      { op: "set_rule_source_inverse_mask", value: "0.0.0.255" },
      { op: "set_rule_destination_host", value: "192.0.2.1" },
    ]);
  });

  it("create sends only the chosen leaves: hidden text of other choices is dropped", () => {
    const f = form({ source: "any", source_host: "10.0.0.1", destination: "none", destination_host: "10.0.0.2" });
    assert.deepEqual(ruleSaveOps("ipv4", null, f), [
      { op: "create_rule" },
      { op: "set_rule_action", value: "permit" },
      { op: "set_rule_source_any" },
    ]);
  });

  it("an unchanged edit sends nothing, even padded", () => {
    const f = ruleFormFrom(V4);
    assert.deepEqual(ruleSaveOps("ipv4", V4, f), []);
    assert.deepEqual(ruleSaveOps("ipv4", V4, { ...f, source_host: ` ${f.source_host} `, description: "corp " }), []);
  });

  it("an edit never deletes and recreates the rule; action is replaced with a set", () => {
    assert.deepEqual(ruleSaveOps("ipv4", V4, { ...ruleFormFrom(V4), action: "deny", source_host: "10.0.0.9" }), [
      { op: "set_rule_action", value: "deny" },
      { op: "set_rule_source_host", value: "10.0.0.9" },
    ]);
  });

  it("a cleared description is its leaf delete", () => {
    assert.deepEqual(ruleSaveOps("ipv4", V4, { ...ruleFormFrom(V4), description: " " }), [
      { op: "delete_rule_description" },
    ]);
  });

  it("a source switch sets the new leaf and deletes the old in one batch", () => {
    assert.deepEqual(ops(ruleSaveOps("ipv4", V4, { ...ruleFormFrom(V4), source: "any" })), [
      "set_rule_source_any",
      "delete_rule_source_host",
    ]);
    assert.deepEqual(
      ruleSaveOps("ipv4", V4, { ...ruleFormFrom(V4), source: "network", source_network: "10.0.0.0", source_inverse_mask: "0.0.0.255" }),
      [
        { op: "delete_rule_source_host" },
        { op: "set_rule_source_network", value: "10.0.0.0" },
        { op: "set_rule_source_inverse_mask", value: "0.0.0.255" },
      ],
    );
    const net = rule({ source_network: "10.0.0.0", source_inverse_mask: "0.0.0.255", destination_any: true });
    assert.deepEqual(ops(ruleSaveOps("ipv4", net, { ...ruleFormFrom(net), source: "host", source_host: "10.0.0.1" })), [
      "set_rule_source_host",
      "delete_rule_source_network",
      "delete_rule_source_inverse_mask",
    ]);
  });

  it("a rule holding any beside a network: saving with the derived any choice deletes the hidden network", () => {
    const both = rule({ source_any: true, source_network: "10.0.0.0", source_inverse_mask: "0.0.0.255" });
    const f = ruleFormFrom(both);
    assert.equal(f.source, "any");
    assert.deepEqual(ruleSaveOps("ipv4", both, f), [
      { op: "delete_rule_source_network" },
      { op: "delete_rule_source_inverse_mask" },
    ]);
    const anyHost = rule({ source_any: true, source_host: "10.0.0.1" });
    assert.deepEqual(ruleSaveOps("ipv4", anyHost, ruleFormFrom(anyHost)), [{ op: "delete_rule_source_host" }]);
  });

  it("a changed inverse mask is one set", () => {
    const net = rule({ source_network: "10.0.0.0", source_inverse_mask: "0.0.0.255" });
    assert.deepEqual(ruleSaveOps("ipv4", net, { ...ruleFormFrom(net), source_inverse_mask: "0.0.255.255" }), [
      { op: "set_rule_source_inverse_mask", value: "0.0.255.255" },
    ]);
  });

  it("destination: every choice to every other", () => {
    const anyDst = V4;
    const hostDst = rule({ source_any: true, destination_host: "10.0.0.2" });
    const netDst = rule({ source_any: true, destination_network: "10.1.0.0", destination_inverse_mask: "0.0.255.255" });
    const noDst = rule({ source_any: true });
    const to = (r: AccessListRule, over: Partial<AccessListRuleForm>) => ops(ruleSaveOps("ipv4", r, { ...ruleFormFrom(r), ...over }));

    assert.deepEqual(to(anyDst, { destination: "host", destination_host: "10.0.0.2" }), [
      "delete_rule_destination_any",
      "set_rule_destination_host",
    ]);
    assert.deepEqual(to(anyDst, { destination: "network", destination_network: "10.1.0.0", destination_inverse_mask: "0.0.255.255" }), [
      "delete_rule_destination_any",
      "set_rule_destination_network",
      "set_rule_destination_inverse_mask",
    ]);
    assert.deepEqual(to(hostDst, { destination: "any" }), ["set_rule_destination_any", "delete_rule_destination_host"]);
    assert.deepEqual(to(netDst, { destination: "host", destination_host: "10.0.0.3" }), [
      "set_rule_destination_host",
      "delete_rule_destination_network",
      "delete_rule_destination_inverse_mask",
    ]);
    assert.deepEqual(to(netDst, { destination_inverse_mask: "0.0.0.255" }), ["set_rule_destination_inverse_mask"]);
    for (const r of [anyDst, hostDst, netDst]) {
      assert.deepEqual(to(r, { destination: "none" }), ["delete_rule_destination"], JSON.stringify(r));
    }
    assert.deepEqual(to(noDst, { destination: "any" }), ["set_rule_destination_any"]);
    assert.deepEqual(to(noDst, { destination: "none" }), []);
    assert.equal(ruleFormFrom(noDst).destination, "none");
  });
});

describe("ipv6 rule ops", () => {
  it("create offers only the IPv6 leaves: never host, inverse-mask or destination (#1079)", () => {
    const f = form({
      source: "network",
      source_network: "2001:db8::/32",
      source_exact_match: true,
      source_host: "10.0.0.1",
      source_inverse_mask: "0.0.0.255",
      destination: "host",
      destination_host: "10.0.0.2",
    });
    assert.deepEqual(ruleSaveOps("ipv6", null, f), [
      { op: "create_rule" },
      { op: "set_rule_action", value: "permit" },
      { op: "set_rule_source_network", value: "2001:db8::/32" },
      { op: "set_rule_source_exact_match" },
    ]);
    assert.deepEqual(ops(ruleSaveOps("ipv6", null, form({ source: "host", source_host: "10.0.0.1" }))), [
      "create_rule",
      "set_rule_action",
    ]);
  });

  it("exact-match goes only with a network: leaving network deletes it", () => {
    assert.deepEqual(ops(ruleSaveOps("ipv6", null, form({ source: "any", source_exact_match: true }))), [
      "create_rule",
      "set_rule_action",
      "set_rule_source_any",
    ]);
    assert.deepEqual(ops(ruleSaveOps("ipv6", V6, { ...ruleFormFrom(V6), source: "any" })), [
      "set_rule_source_any",
      "delete_rule_source_network",
      "delete_rule_source_exact_match",
    ]);
    assert.deepEqual(ops(ruleSaveOps("ipv6", V6, { ...ruleFormFrom(V6), source_exact_match: false })), [
      "delete_rule_source_exact_match",
    ]);
  });

  it("any to network sets the network and deletes any", () => {
    const anyRule = rule({ source_any: true });
    assert.deepEqual(
      ruleSaveOps("ipv6", anyRule, { ...ruleFormFrom(anyRule), source: "network", source_network: "2001:db8::/48" }),
      [{ op: "delete_rule_source_any" }, { op: "set_rule_source_network", value: "2001:db8::/48" }],
    );
  });

  it("an unchanged edit sends nothing; IPv6 text is compared lowercased and compressed", () => {
    assert.deepEqual(ruleSaveOps("ipv6", V6, ruleFormFrom(V6)), []);
    assert.deepEqual(ruleSaveOps("ipv6", V6, { ...ruleFormFrom(V6), source_network: "2001:DB8:0::/32 " }), []);
    assert.deepEqual(ruleSaveOps("ipv6", V6, { ...ruleFormFrom(V6), source_network: "2001:db9::/32" }), [
      { op: "set_rule_source_network", value: "2001:db9::/32" },
    ]);
  });

  it("any beside a network: the derived any choice deletes the hidden network", () => {
    const both = rule({ source_any: true, source_network: "2001:db8::/32" });
    assert.deepEqual(ruleSaveOps("ipv6", both, ruleFormFrom(both)), [{ op: "delete_rule_source_network" }]);
  });

  it("the normalizer forces IPv6 forms onto IPv6 leaves", () => {
    const n = normalizeRuleForm("ipv6", form({ destination: "host", destination_host: "1.1.1.1", source_inverse_mask: "x" }));
    assert.equal(n.destination, "none");
    assert.equal(n.destination_host, "");
    assert.equal(n.source_inverse_mask, "");
  });
});

// ----------------------------------------------------------------------------
// Save checks
// ----------------------------------------------------------------------------

describe("rule save checks", () => {
  const check = (
    f: AccessListRuleForm,
    listType: "ipv4" | "ipv6" = "ipv4",
    extended = false,
    original: AccessListRule | null = null,
  ) => accessListRuleProblem(listType, extended, original, f, CAPS, [V4]);

  it("accepts a valid rule of each family", () => {
    assert.equal(check(form()), null);
    assert.equal(check(form({ destination: "none" })), null);
    assert.equal(check(form({ source: "network", source_network: "2001:db8::/32", source_exact_match: true }), "ipv6"), null);
  });

  it("rule number: required, strict digits, served range, free", () => {
    assert.deepEqual(check(form({ rule_number: "" })), { key: "ruleNumberRequired" });
    for (const n of ["0", "65536", "1.5", "+5", "1e2", "\u0663", "-1"]) {
      assert.deepEqual(check(form({ rule_number: n })), { key: "ruleNumberRange", min: 1, max: 65535 }, n);
    }
    assert.deepEqual(check(form({ rule_number: "10" })), { key: "ruleNumberTaken" });
    assert.equal(check(form({ rule_number: "65535" })), null);
  });

  it("rule number range falls back to the lab range when caps are absent", () => {
    assert.deepEqual(accessListRuleProblem("ipv4", false, null, form({ rule_number: "70000" }), null, []), {
      key: "ruleNumberRange",
      min: 1,
      max: 65535,
    });
  });

  it("edit does not recheck the locked rule number", () => {
    assert.equal(check(ruleFormFrom(V4), "ipv4", false, V4), null);
  });

  it("action is required and from the served list", () => {
    assert.deepEqual(check(form({ action: "" })), { key: "actionRequired" });
    assert.deepEqual(check(form({ action: "accept" })), { key: "actionInvalid" });
  });

  it("description is one line within the served length", () => {
    assert.deepEqual(check(form({ description: "x".repeat(256) })), { key: "descriptionTooLong", max: 255 });
    assert.deepEqual(check(form({ description: "a\nb" })), { key: "descriptionTooLong", max: 255 });
    assert.equal(check(form({ description: "x".repeat(255) })), null);
  });

  it("source is required and from the family's choices", () => {
    assert.deepEqual(check(form({ source: "" })), { key: "sourceRequired" });
    assert.deepEqual(check(form({ source: "host", source_host: "10.0.0.1" }), "ipv6"), { key: "sourceRequired" });
  });

  it("IPv4 host, network and inverse-mask are strict IPv4 addresses (no CIDR, no leading zeros)", () => {
    for (const bad of ["", "10.0.0", "010.0.0.1", "10.0.0.256", "10.0.0.0/24"]) {
      assert.deepEqual(check(form({ source: "host", source_host: bad })), { key: "sourceHostInvalid" }, bad);
      assert.deepEqual(
        check(form({ source: "network", source_network: bad, source_inverse_mask: "0.0.0.255" })),
        { key: "sourceNetworkInvalid" },
        bad,
      );
      assert.deepEqual(
        check(form({ source: "network", source_network: "10.0.0.0", source_inverse_mask: bad })),
        { key: "sourceInverseMaskInvalid" },
        bad,
      );
      assert.deepEqual(check(form({ destination: "host", destination_host: bad })), { key: "destinationHostInvalid" }, bad);
      assert.deepEqual(
        check(form({ destination: "network", destination_network: bad, destination_inverse_mask: "0.0.0.255" })),
        { key: "destinationNetworkInvalid" },
        bad,
      );
      assert.deepEqual(
        check(form({ destination: "network", destination_network: "10.0.0.0", destination_inverse_mask: bad })),
        { key: "destinationInverseMaskInvalid" },
        bad,
      );
    }
  });

  it("IPv6 network: no host bits, zone index, dotted tail or leading-zero length", () => {
    for (const bad of ["", "2001:db8::1/32", "fe80::%eth0/64", "2001:db8::/129", "::ffff:10.0.0.0/104", "2001:db8::/032", "10.0.0.0/8", "2001:db8::"]) {
      assert.deepEqual(
        check(form({ source: "network", source_network: bad }), "ipv6"),
        { key: "sourceNetworkInvalidIpv6" },
        bad,
      );
    }
    assert.equal(check(form({ source: "network", source_network: "::ffff:a00:0/104" }), "ipv6"), null);
  });

  it("an extended list requires a destination; a standard one does not", () => {
    assert.deepEqual(check(form({ destination: "none" }), "ipv4", true), { key: "destinationRequired" });
    assert.equal(check(form({ destination: "none" }), "ipv4", false), null);
    assert.equal(check(form({ destination: "any" }), "ipv4", true), null);
  });

  it("extended lists come from the served ranges, with the lab ranges as fallback", () => {
    for (const n of ["100", "199", "2000", "2699"]) assert.equal(isExtendedList(CAPS, "ipv4", n), true, n);
    for (const n of ["0", "99", "200", "1999", "2700", "abc"]) assert.equal(isExtendedList(CAPS, "ipv4", n), false, n);
    assert.equal(isExtendedList(null, "ipv4", "150"), true);
    assert.equal(isExtendedList(CAPS, "ipv6", "150"), false);
    assert.equal(isExtendedList({ ...CAPS, extended_ranges: [{ min: 5, max: 6 }] }, "ipv4", "5"), true);
  });
});

describe("list save checks", () => {
  it("IPv4 number: ASCII digits within the served u32 range", () => {
    assert.deepEqual(accessListProblem("ipv4", { name: " ", description: "" }, [], CAPS), { key: "nameRequired" });
    for (const name of ["ACL", "1.5", "-1", "4294967296", "\u0661", "1 2", "12345678901"]) {
      assert.deepEqual(
        accessListProblem("ipv4", { name, description: "" }, [], CAPS),
        { key: "numberInvalid", min: 0, max: 4294967295 },
        name,
      );
    }
    for (const name of ["0", "1", "99", "300", "1999", "2699", "4294967295"]) {
      assert.equal(accessListProblem("ipv4", { name, description: "" }, [], CAPS), null, name);
    }
  });

  it("a configured list number or name is taken", () => {
    assert.deepEqual(accessListProblem("ipv4", { name: " 1 ", description: "" }, ["1"], CAPS), { key: "nameTaken" });
    assert.deepEqual(accessListProblem("ipv4", { name: "01", description: "" }, ["1"], CAPS), { key: "nameTaken" });
    assert.deepEqual(accessListProblem("ipv6", { name: "ACL6", description: "" }, ["ACL6"], CAPS), { key: "nameTaken" });
    assert.equal(accessListProblem("ipv6", { name: "acl6", description: "" }, ["ACL6"], CAPS), null);
  });

  it("IPv6 name: free text without whitespace", () => {
    assert.deepEqual(accessListProblem("ipv6", { name: "MY ACL", description: "" }, [], CAPS), { key: "nameInvalid" });
    assert.deepEqual(accessListProblem("ipv6", { name: "", description: "" }, [], CAPS), { key: "nameRequired" });
    for (const name of ["ACL.6", "a:b", "访问", "x_y-z"]) {
      assert.equal(accessListProblem("ipv6", { name, description: "" }, [], CAPS), null, name);
    }
  });

  it("edit skips the name and checks the description", () => {
    assert.equal(accessListProblem("ipv4", { name: "1", description: "d" }, null, CAPS), null);
    assert.deepEqual(accessListProblem("ipv4", { name: "1", description: "x".repeat(256) }, null, CAPS), {
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
  it("only posts the batch: no config refresh after a commit (#1600)", async () => {
    const stub = stubPost({ success: true });
    try {
      await accessListService.saveRule("ipv6", "ACL6", 5, null, form({ source: "network", source_network: "2001:db8::/32" }));
      assert.equal(stub.calls.length, 1);
      const [path, body] = stub.calls[0];
      assert.equal(path, "/vyos/access-list/batch");
      assert.equal((body as AccessListBatchRequest).rule_number, 5);
      assert.equal((body as AccessListBatchRequest).list_type, "ipv6");
      assert.equal((body as AccessListBatchRequest).name, "ACL6");
    } finally {
      stub.restore();
    }
  });

  it("an unchanged edit makes no request", async () => {
    const stub = stubPost({ success: true });
    try {
      const result = await accessListService.saveRule("ipv4", "1", 10, V4, ruleFormFrom(V4));
      assert.deepEqual(result, { success: true });
      assert.equal(stub.calls.length, 0);
    } finally {
      stub.restore();
    }
  });

  it("a failed commit throws the device error", async () => {
    const stub = stubPost({ success: false, error: "access-list 1 still in use" });
    try {
      await assert.rejects(accessListService.deleteAccessList(LIST), { message: "access-list 1 still in use" });
      assert.deepEqual(stub.calls[0][1], { list_type: "ipv4", name: "1", operations: [{ op: "delete_access_list" }] });
    } finally {
      stub.restore();
    }
  });

  it("a failed commit with no error throws an empty message", async () => {
    const stub = stubPost({ success: false });
    try {
      await assert.rejects(accessListService.deleteRule("ipv4", "1", 10), { message: "" });
      assert.deepEqual(stub.calls[0][1], { list_type: "ipv4", name: "1", rule_number: 10, operations: [{ op: "delete_rule" }] });
    } finally {
      stub.restore();
    }
  });

  it("a failed reorder throws the device error, and sends every rule number", async () => {
    const stub = stubPost({ success: false, error: "Commit failed" });
    try {
      await assert.rejects(accessListService.reorderRules("ipv4", "1", [20, 10]), { message: "Commit failed" });
      assert.deepEqual(stub.calls, [["/vyos/access-list/reorder", { list_type: "ipv4", name: "1", rule_numbers: [20, 10] }]]);
    } finally {
      stub.restore();
    }
  });

  it("list create and update post the trimmed name and the diff, with no rule number", async () => {
    const stub = stubPost({ success: true });
    try {
      await accessListService.createAccessList("ipv4", { name: " 100 ", description: "" });
      await accessListService.updateAccessList(LIST, { name: "1", description: "" });
      assert.deepEqual(stub.calls.map(([, body]) => body), [
        { list_type: "ipv4", name: "100", operations: [{ op: "create_access_list" }] },
        { list_type: "ipv4", name: "1", operations: [{ op: "delete_access_list_description" }] },
      ]);
    } finally {
      stub.restore();
    }
  });

  it("a padded edit through the service emits the exact ops", async () => {
    const stub = stubPost({ success: true });
    try {
      await accessListService.saveRule("ipv4", "1", 10, V4, {
        ...ruleFormFrom(V4),
        description: "  ",
        source: "network",
        source_network: " 10.0.0.0 ",
        source_inverse_mask: " 0.0.0.255",
        destination: "none",
      });
      assert.deepEqual((stub.calls[0][1] as AccessListBatchRequest).operations, [
        { op: "delete_rule_description" },
        { op: "delete_rule_source_host" },
        { op: "set_rule_source_network", value: "10.0.0.0" },
        { op: "set_rule_source_inverse_mask", value: "0.0.0.255" },
        { op: "delete_rule_destination" },
      ]);
    } finally {
      stub.restore();
    }
  });
});
