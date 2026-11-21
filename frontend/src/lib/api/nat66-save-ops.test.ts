import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRuleCreateOps,
  buildRuleUpdateOps,
  emptySide,
  nat66RuleProblem,
  sideFields,
  type NAT66RuleFields,
} from "./nat66-save-ops";
import {
  nat66Service,
  type NAT66BatchOperation,
  type NAT66DestinationRule,
  type NAT66SourceRule,
} from "./nat66";

const GROUP_TYPES = ["address-group", "domain-group", "mac-group", "network-group", "port-group"];

const SOURCE_RULE: NAT66SourceRule = {
  rule_number: 100,
  description: "v6 out",
  disable: false,
  exclude: false,
  log: true,
  protocol: "tcp",
  outbound_interface: "eth0",
  source: { address: null, prefix: "fd00::/64", port: "80", group: { mac_group: "T-MAC" } },
  destination: { address: null, prefix: null, port: null, group: { network_group: "T-N6", port_group: "T-WEB" } },
  translation: { address: "masquerade", port: null },
};

const DESTINATION_RULE: NAT66DestinationRule = {
  rule_number: 7,
  description: null,
  disable: true,
  exclude: false,
  log: false,
  protocol: null,
  inbound_interface: "eth1",
  source: null,
  destination: { address: "2001:db8::2", prefix: null, port: null, group: null },
  translation: { address: "fd00::10", port: null },
};

function sourceFields(rule: NAT66SourceRule, groupTypes = GROUP_TYPES): NAT66RuleFields {
  return {
    description: rule.description ?? "",
    protocol: rule.protocol ?? "",
    interfaceName: rule.outbound_interface ?? "",
    source: sideFields(rule.source, "prefix", groupTypes),
    destination: sideFields(rule.destination, "prefix", groupTypes),
    translationAddress: rule.translation?.address ?? "",
    translationPort: rule.translation?.port ?? "",
    disable: rule.disable,
    exclude: rule.exclude,
    log: rule.log,
  };
}

function destinationFields(rule: NAT66DestinationRule, groupTypes = GROUP_TYPES): NAT66RuleFields {
  return {
    description: rule.description ?? "",
    protocol: rule.protocol ?? "",
    interfaceName: rule.inbound_interface ?? "",
    source: sideFields(rule.source, "address", groupTypes),
    destination: sideFields(rule.destination, "address", groupTypes),
    translationAddress: rule.translation?.address ?? "",
    translationPort: rule.translation?.port ?? "",
    disable: rule.disable,
    exclude: rule.exclude,
    log: rule.log,
  };
}

type Sent = Array<[number, string, NAT66BatchOperation[]]>;

function stubbed(): { service: typeof nat66Service; sent: Sent } {
  const sent: Sent = [];
  const service = Object.create(nat66Service) as typeof nat66Service;
  service.batchConfigure = async (ruleNumber, ruleType, operations) => {
    sent.push([ruleNumber, ruleType, operations]);
    return { success: true };
  };
  return { service, sent };
}

describe("nat66RuleProblem", () => {
  it("requires a translation address unless the rule excludes", () => {
    const fields = { ...sourceFields(SOURCE_RULE), translationAddress: "  " };
    assert.equal(nat66RuleProblem(fields), "translationRequired");
    assert.equal(nat66RuleProblem({ ...fields, exclude: true }), null);
    const destination = { ...destinationFields(DESTINATION_RULE), translationAddress: "" };
    assert.equal(nat66RuleProblem(destination), "translationRequired");
    assert.equal(nat66RuleProblem({ ...destination, exclude: true }), null);
    assert.equal(nat66RuleProblem(sourceFields(SOURCE_RULE)), null);
  });

  it("allows one address, network or domain group per side", () => {
    const fields = sourceFields(SOURCE_RULE);
    const two = { ...fields, destination: { ...fields.destination, groups: { ...fields.destination.groups, "address-group": "T-A6" } } };
    assert.equal(nat66RuleProblem(two), "oneAddressGroup");
    const withMac = { ...fields, source: { ...fields.source, groups: { ...fields.source.groups, "address-group": "T-A6" } } };
    assert.equal(nat66RuleProblem(withMac), null);
  });
});

describe("rule ops", () => {
  it("sends nothing for an untouched or whitespace-only edit", () => {
    assert.deepEqual(buildRuleUpdateOps("source", SOURCE_RULE, sourceFields(SOURCE_RULE), GROUP_TYPES), []);
    const padded = sourceFields(SOURCE_RULE);
    padded.description = " v6 out ";
    padded.source = { ...padded.source, match: " fd00::/64 ", groups: { ...padded.source.groups, "mac-group": " T-MAC " } };
    assert.deepEqual(buildRuleUpdateOps("source", SOURCE_RULE, padded, GROUP_TYPES), []);
    assert.deepEqual(
      buildRuleUpdateOps("destination", DESTINATION_RULE, destinationFields(DESTINATION_RULE), GROUP_TYPES),
      [],
    );
  });

  it("sets changed leaves trimmed and deletes cleared ones, groups as type:name", () => {
    const fields = sourceFields(SOURCE_RULE);
    fields.description = "";
    fields.interfaceName = " eth2 ";
    fields.source = { ...fields.source, match: "", groups: { ...fields.source.groups, "mac-group": "", "address-group": "T-A6" } };
    fields.destination = { ...fields.destination, groups: { ...fields.destination.groups, "network-group": "" } };
    fields.translationAddress = "fd00::1";
    fields.translationPort = " 8080 ";
    assert.deepEqual(buildRuleUpdateOps("source", SOURCE_RULE, fields, GROUP_TYPES), [
      { op: "delete_source_rule_description" },
      { op: "set_source_rule_outbound_interface_name", value: "eth2" },
      { op: "delete_source_rule_source_prefix" },
      { op: "set_source_rule_source_group", value: "address-group:T-A6" },
      { op: "delete_source_rule_source_group", value: "mac-group" },
      { op: "delete_source_rule_destination_group", value: "network-group" },
      { op: "set_source_rule_translation_address", value: "fd00::1" },
      { op: "set_source_rule_translation_port", value: "8080" },
    ]);
  });

  it("deletes ports and the port group when the protocol has no ports", () => {
    const fields = { ...sourceFields(SOURCE_RULE), protocol: "" };
    assert.deepEqual(buildRuleUpdateOps("source", SOURCE_RULE, fields, GROUP_TYPES), [
      { op: "delete_source_rule_protocol" },
      { op: "delete_source_rule_source_port" },
      { op: "delete_source_rule_destination_group", value: "port-group" },
    ]);
  });

  it("leaves groups alone when the device has no group types", () => {
    const fields = sourceFields(SOURCE_RULE, []);
    assert.deepEqual(buildRuleUpdateOps("source", SOURCE_RULE, fields, []), []);
    assert.deepEqual(buildRuleUpdateOps("source", SOURCE_RULE, fields, GROUP_TYPES), []);
  });

  it("uses address leaves and the inbound interface on destination rules", () => {
    const fields = destinationFields(DESTINATION_RULE);
    fields.interfaceName = "";
    fields.source = { ...fields.source, match: "2001:db8::1" };
    fields.destination = { ...fields.destination, match: "" };
    fields.disable = false;
    assert.deepEqual(buildRuleUpdateOps("destination", DESTINATION_RULE, fields, GROUP_TYPES), [
      { op: "delete_destination_rule_inbound_interface_name" },
      { op: "set_destination_rule_source_address", value: "2001:db8::1" },
      { op: "delete_destination_rule_destination_address" },
      { op: "delete_destination_rule_disable" },
    ]);
  });

  it("creates the rule with only the filled leaves", () => {
    const fields: NAT66RuleFields = {
      description: " ",
      protocol: "udp",
      interfaceName: "eth0",
      source: emptySide(GROUP_TYPES),
      destination: { ...emptySide(GROUP_TYPES), port: "53", groups: { ...emptySide(GROUP_TYPES).groups, "domain-group": "T-D" } },
      translationAddress: "masquerade",
      translationPort: "",
      disable: false,
      exclude: false,
      log: true,
    };
    assert.deepEqual(buildRuleCreateOps("source", fields, GROUP_TYPES), [
      { op: "set_source_rule" },
      { op: "set_source_rule_protocol", value: "udp" },
      { op: "set_source_rule_outbound_interface_name", value: "eth0" },
      { op: "set_source_rule_destination_port", value: "53" },
      { op: "set_source_rule_destination_group", value: "domain-group:T-D" },
      { op: "set_source_rule_translation_address", value: "masquerade" },
      { op: "set_source_rule_log" },
    ]);
  });
});

describe("service", () => {
  it("posts the emitted ops for create and update and skips an empty update", async () => {
    const { service, sent } = stubbed();
    await service.createRule("destination", 9, destinationFields(DESTINATION_RULE), GROUP_TYPES);
    await service.updateRule("source", SOURCE_RULE, sourceFields(SOURCE_RULE), GROUP_TYPES);
    await service.updateRule("source", SOURCE_RULE, { ...sourceFields(SOURCE_RULE), log: false }, GROUP_TYPES);
    assert.deepEqual(sent[0][0], 9);
    assert.equal(sent[0][1], "destination");
    assert.deepEqual(sent[0][2][0], { op: "set_destination_rule" });
    assert.equal(sent.length, 3);
    assert.deepEqual(sent[1][2], []);
    assert.deepEqual(sent[2], [100, "source", [{ op: "delete_source_rule_log" }]]);
  });

  it("re-sends every remaining rule in full when deleting and compacting", async () => {
    const service = Object.create(nat66Service) as typeof nat66Service;
    let posted: unknown = null;
    service.getConfig = async () => ({
      source_rules: [SOURCE_RULE, { ...SOURCE_RULE, rule_number: 105 }],
      destination_rules: [],
      total: 2,
    });
    service.reorderRules = async (ruleType, rules) => {
      posted = { ruleType, rules };
      return { success: true };
    };
    await service.deleteAndCompactRules("source", 100);
    const data = {
      description: SOURCE_RULE.description,
      disable: SOURCE_RULE.disable,
      exclude: SOURCE_RULE.exclude,
      log: SOURCE_RULE.log,
      protocol: SOURCE_RULE.protocol,
      source: SOURCE_RULE.source,
      destination: SOURCE_RULE.destination,
      translation: SOURCE_RULE.translation,
      outbound_interface: SOURCE_RULE.outbound_interface,
    };
    assert.deepEqual(posted, {
      ruleType: "source",
      rules: [
        { old_number: 100, new_number: null, rule_data: null },
        { old_number: 105, new_number: 100, rule_data: data },
      ],
    });
  });
});
