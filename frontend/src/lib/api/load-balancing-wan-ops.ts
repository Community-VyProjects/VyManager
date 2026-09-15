import type { BatchOperation, WANRule } from "./load-balancing";

export interface WANGlobalsSettings {
  disable_source_nat: boolean;
  enable_local_traffic: boolean;
  flush_connections: boolean;
  sticky_inbound: boolean;
  hook: string | null;
}

type WANGroup = NonNullable<NonNullable<WANRule["source"]>["group"]>;

function appendLimitOps(ops: BatchOperation[], limit: WANRule["limit"]): void {
  if (!limit) return;
  if (limit.burst) ops.push({ op: "set_wan_rule_limit_burst", value: limit.burst });
  if (limit.period) ops.push({ op: "set_wan_rule_limit_period", value: limit.period });
  if (limit.rate) ops.push({ op: "set_wan_rule_limit_rate", value: limit.rate });
  if (limit.threshold) ops.push({ op: "set_wan_rule_limit_threshold", value: limit.threshold });
}

function appendGroupOps(
  ops: BatchOperation[],
  side: "source" | "destination",
  group: WANGroup | null | undefined,
): void {
  if (!group) return;
  if (group.address_group)
    ops.push({ op: `set_wan_rule_${side}_group_address`, value: group.address_group });
  if (group.network_group)
    ops.push({ op: `set_wan_rule_${side}_group_network`, value: group.network_group });
  if (group.domain_group)
    ops.push({ op: `set_wan_rule_${side}_group_domain`, value: group.domain_group });
  if (group.port_group)
    ops.push({ op: `set_wan_rule_${side}_group_port`, value: group.port_group });
}

function groupJson(group: WANGroup | null | undefined): string {
  return JSON.stringify(group ?? null);
}

export function buildWanRuleCreateOps(rule: WANRule): BatchOperation[] {
  const ops: BatchOperation[] = [{ op: "create_wan_rule" }];

  if (rule.description)
    ops.push({ op: "set_wan_rule_description", value: rule.description });
  if (rule.inbound_interface)
    ops.push({ op: "set_wan_rule_inbound_interface", value: rule.inbound_interface });
  if (rule.protocol)
    ops.push({ op: "set_wan_rule_protocol", value: rule.protocol });
  if (rule.failover)
    ops.push({ op: "set_wan_rule_failover" });
  if (rule.per_packet_balancing)
    ops.push({ op: "set_wan_rule_per_packet_balancing" });
  if (rule.exclude)
    ops.push({ op: "set_wan_rule_exclude" });

  for (const iface of rule.interfaces) {
    ops.push({ op: "set_wan_rule_interface", value: iface.interface });
    if (iface.weight)
      ops.push({ op: "set_wan_rule_interface_weight", value: `${iface.interface}|${iface.weight}` });
  }

  if (rule.source?.address)
    ops.push({ op: "set_wan_rule_source_address", value: rule.source.address });
  if (rule.source?.port)
    ops.push({ op: "set_wan_rule_source_port", value: rule.source.port });
  if (rule.destination?.address)
    ops.push({ op: "set_wan_rule_destination_address", value: rule.destination.address });
  if (rule.destination?.port)
    ops.push({ op: "set_wan_rule_destination_port", value: rule.destination.port });

  appendLimitOps(ops, rule.limit);
  appendGroupOps(ops, "source", rule.source?.group);
  appendGroupOps(ops, "destination", rule.destination?.group);

  return ops;
}

export function buildWanRuleUpdateOps(original: WANRule, updated: WANRule): BatchOperation[] {
  const ops: BatchOperation[] = [];

  if (updated.description !== original.description) {
    if (updated.description)
      ops.push({ op: "set_wan_rule_description", value: updated.description });
    else
      ops.push({ op: "delete_wan_rule_description" });
  }

  if (updated.inbound_interface !== original.inbound_interface && updated.inbound_interface)
    ops.push({ op: "set_wan_rule_inbound_interface", value: updated.inbound_interface });

  if (updated.protocol !== original.protocol) {
    if (updated.protocol)
      ops.push({ op: "set_wan_rule_protocol", value: updated.protocol });
    else
      ops.push({ op: "delete_wan_rule_protocol" });
  }

  if (updated.failover !== original.failover) {
    if (updated.failover)
      ops.push({ op: "set_wan_rule_failover" });
    else
      ops.push({ op: "delete_wan_rule_failover" });
  }

  if (updated.per_packet_balancing !== original.per_packet_balancing) {
    if (updated.per_packet_balancing)
      ops.push({ op: "set_wan_rule_per_packet_balancing" });
    else
      ops.push({ op: "delete_wan_rule_per_packet_balancing" });
  }

  for (const iface of original.interfaces)
    ops.push({ op: "delete_wan_rule_interface", value: iface.interface });
  for (const iface of updated.interfaces) {
    ops.push({ op: "set_wan_rule_interface", value: iface.interface });
    if (iface.weight)
      ops.push({ op: "set_wan_rule_interface_weight", value: `${iface.interface}|${iface.weight}` });
  }

  if (updated.source?.address !== original.source?.address) {
    if (updated.source?.address)
      ops.push({ op: "set_wan_rule_source_address", value: updated.source.address });
  }
  if (updated.destination?.address !== original.destination?.address) {
    if (updated.destination?.address)
      ops.push({ op: "set_wan_rule_destination_address", value: updated.destination.address });
  }

  if (JSON.stringify(updated.limit ?? null) !== JSON.stringify(original.limit ?? null)) {
    ops.push({ op: "delete_wan_rule_limit" });
    appendLimitOps(ops, updated.limit);
  }

  if (groupJson(updated.source?.group) !== groupJson(original.source?.group)) {
    ops.push({ op: "delete_wan_rule_source_group" });
    appendGroupOps(ops, "source", updated.source?.group);
  }
  if (groupJson(updated.destination?.group) !== groupJson(original.destination?.group)) {
    ops.push({ op: "delete_wan_rule_destination_group" });
    appendGroupOps(ops, "destination", updated.destination?.group);
  }

  return ops;
}

export function buildWanGlobalsOps(settings: WANGlobalsSettings): BatchOperation[] {
  const ops: BatchOperation[] = [];

  if (settings.disable_source_nat)
    ops.push({ op: "set_wan_disable_source_nat" });
  else
    ops.push({ op: "delete_wan_disable_source_nat" });

  if (settings.enable_local_traffic)
    ops.push({ op: "set_wan_enable_local_traffic" });
  else
    ops.push({ op: "delete_wan_enable_local_traffic" });

  if (settings.flush_connections)
    ops.push({ op: "set_wan_flush_connections" });
  else
    ops.push({ op: "delete_wan_flush_connections" });

  if (settings.sticky_inbound)
    ops.push({ op: "set_wan_sticky_connections_inbound" });
  else
    ops.push({ op: "delete_wan_sticky_connections_inbound" });

  if (settings.hook)
    ops.push({ op: "set_wan_hook", value: settings.hook });
  else
    ops.push({ op: "delete_wan_hook" });

  return ops;
}
