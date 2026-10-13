import type {
  DestinationNATRule,
  SourceNATRule,
  StaticNATRule,
} from "./nat";

export type ReorderableNATRule = SourceNATRule | DestinationNATRule | StaticNATRule;
export type ReorderNATType = "source" | "destination" | "static";

export interface NATReorderItem {
  old_number: number;
  new_number: number;
  rule_data: Record<string, unknown>;
}

export function flattenSourceRule(rule: SourceNATRule): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (rule.description) data.description = rule.description;
  if (rule.source?.address) data.source_address = rule.source.address;
  if (rule.source?.fqdn) data.source_fqdn = rule.source.fqdn;
  if (rule.source?.port) data.source_port = rule.source.port;
  if (rule.source?.group) data.source_group = rule.source.group;
  if (rule.destination?.address) data.destination_address = rule.destination.address;
  if (rule.destination?.fqdn) data.destination_fqdn = rule.destination.fqdn;
  if (rule.destination?.port) data.destination_port = rule.destination.port;
  if (rule.destination?.group) data.destination_group = rule.destination.group;
  if (rule.outbound_interface) {
    const key = Object.keys(rule.outbound_interface)[0];
    if (key === "name") data.outbound_interface_name = rule.outbound_interface[key];
    else if (key === "group") data.outbound_interface_group = rule.outbound_interface[key];
  }
  if (rule.protocol) data.protocol = rule.protocol;
  if (rule.packet_type) data.packet_type = rule.packet_type;
  if (rule.translation?.address) data.translation_address = rule.translation.address;
  if (rule.translation?.port) data.translation_port = rule.translation.port;
  if (rule.translation?.options?.address_mapping) data.translation_options_address_mapping = rule.translation.options.address_mapping;
  if (rule.translation?.options?.port_mapping) data.translation_options_port_mapping = rule.translation.options.port_mapping;
  if (rule.load_balance?.hash) data.load_balance_hash = rule.load_balance.hash;
  if (rule.load_balance?.backends?.length) data.load_balance_backends = rule.load_balance.backends;
  if (rule.disable) data.disable = true;
  if (rule.exclude) data.exclude = true;
  if (rule.log) data.log = true;
  return data;
}

export function flattenDestinationRule(rule: DestinationNATRule): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (rule.description) data.description = rule.description;
  if (rule.source?.address) data.source_address = rule.source.address;
  if (rule.source?.fqdn) data.source_fqdn = rule.source.fqdn;
  if (rule.source?.port) data.source_port = rule.source.port;
  if (rule.source?.group) data.source_group = rule.source.group;
  if (rule.destination?.address) data.destination_address = rule.destination.address;
  if (rule.destination?.fqdn) data.destination_fqdn = rule.destination.fqdn;
  if (rule.destination?.port) data.destination_port = rule.destination.port;
  if (rule.destination?.group) data.destination_group = rule.destination.group;
  if (rule.inbound_interface) {
    const key = Object.keys(rule.inbound_interface)[0];
    if (key === "name") data.inbound_interface_name = rule.inbound_interface[key];
    else if (key === "group") data.inbound_interface_group = rule.inbound_interface[key];
  }
  if (rule.protocol) data.protocol = rule.protocol;
  if (rule.packet_type) data.packet_type = rule.packet_type;
  if (rule.translation?.address) data.translation_address = rule.translation.address;
  if (rule.translation?.port) data.translation_port = rule.translation.port;
  if (rule.translation?.options?.address_mapping) data.translation_options_address_mapping = rule.translation.options.address_mapping;
  if (rule.translation?.options?.port_mapping) data.translation_options_port_mapping = rule.translation.options.port_mapping;
  if (rule.translation?.redirect?.port) data.translation_redirect_port = rule.translation.redirect.port;
  if (rule.load_balance?.hash) data.load_balance_hash = rule.load_balance.hash;
  if (rule.load_balance?.backends?.length) data.load_balance_backends = rule.load_balance.backends;
  if (rule.disable) data.disable = true;
  if (rule.exclude) data.exclude = true;
  if (rule.log) data.log = true;
  return data;
}

export function flattenStaticRule(rule: StaticNATRule): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (rule.description) data.description = rule.description;
  if (rule.destination?.address) data.destination_address = rule.destination.address;
  if (rule.inbound_interface) data.inbound_interface = rule.inbound_interface;
  if (rule.translation?.address) data.translation_address = rule.translation.address;
  if (rule.log) data.log = true;
  return data;
}

function ruleData(natType: ReorderNATType, rule: ReorderableNATRule): Record<string, unknown> {
  if (natType === "source") return flattenSourceRule(rule as SourceNATRule);
  if (natType === "destination") return flattenDestinationRule(rule as DestinationNATRule);
  return flattenStaticRule(rule as StaticNATRule);
}

/** Drag-save payload. Callers must not build a second field list. */
export function buildNatReorderItems(
  natType: ReorderNATType,
  orderedRules: ReorderableNATRule[],
  newNumbers: number[],
): NATReorderItem[] {
  return orderedRules.map((rule, i) => ({
    old_number: rule.rule_number,
    new_number: newNumbers[i],
    rule_data: ruleData(natType, rule),
  }));
}
