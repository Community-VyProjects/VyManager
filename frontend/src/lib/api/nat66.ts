import { apiClient } from "./client";

// ==================== Type Definitions ====================

export interface NAT66RuleGroup {
  address_group?: string | null;
  domain_group?: string | null;
  mac_group?: string | null;
  network_group?: string | null;
  port_group?: string | null;
}

export interface NAT66RuleSource {
  address?: string | null;
  prefix?: string | null;
  port?: string | null;
  group?: NAT66RuleGroup | null;
}

export interface NAT66RuleDestination {
  address?: string | null;
  prefix?: string | null;
  port?: string | null;
  group?: NAT66RuleGroup | null;
}

export interface NAT66RuleTranslation {
  address?: string | null;
  port?: string | null;
}

export interface NAT66SourceRule {
  rule_number: number;
  description?: string | null;
  disable: boolean;
  exclude: boolean;
  log: boolean;
  protocol?: string | null;
  outbound_interface?: string | null;
  source?: NAT66RuleSource | null;
  destination?: NAT66RuleDestination | null;
  translation?: NAT66RuleTranslation | null;
}

export interface NAT66DestinationRule {
  rule_number: number;
  description?: string | null;
  disable: boolean;
  exclude: boolean;
  log: boolean;
  protocol?: string | null;
  inbound_interface?: string | null;
  source?: NAT66RuleSource | null;
  destination?: NAT66RuleDestination | null;
  translation?: NAT66RuleTranslation | null;
}

export interface NAT66ConfigResponse {
  source_rules: NAT66SourceRule[];
  destination_rules: NAT66DestinationRule[];
  total: number;
}

export interface NAT66Capabilities {
  version: string;
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  supported: boolean;
  features: Record<string, { supported: boolean; description: string }>;
  operations: Record<string, string[]>;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface NAT66BatchOperation {
  op: string;
  value?: string | null;
}

interface ReorderRuleItem {
  old_number: number;
  new_number: number;
  rule_data: Record<string, unknown>;
}

// ==================== Service ====================

class NAT66Service {
  async getCapabilities(): Promise<NAT66Capabilities> {
    return apiClient.get<NAT66Capabilities>("/vyos/nat66/capabilities");
  }

  async getConfig(refresh = false): Promise<NAT66ConfigResponse> {
    return apiClient.get<NAT66ConfigResponse>("/vyos/nat66/config", {
      refresh: refresh.toString(),
    });
  }

  async batchConfigure(
    ruleNumber: number,
    ruleType: "source" | "destination",
    operations: NAT66BatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/nat66/batch", {
      rule_number: ruleNumber,
      rule_type: ruleType,
      operations,
    });
    if (!result.success) {
      throw new Error(result.error || "Operation failed");
    }
    return result;
  }

  async reorderRules(
    ruleType: "source" | "destination",
    rules: ReorderRuleItem[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/nat66/reorder", {
      rule_type: ruleType,
      rules,
    });
    if (!result.success) {
      throw new Error(result.error || "Reorder failed");
    }
    return result;
  }

  // ==================== Source Rule Helpers ====================

  async createSourceRule(config: {
    ruleNumber: number;
    description?: string;
    sourcePrefix?: string;
    sourcePort?: string;
    destinationPrefix?: string;
    destinationPort?: string;
    outboundInterface?: string;
    protocol?: string;
    translationAddress?: string;
    translationPort?: string;
    exclude?: boolean;
    log?: boolean;
    disable?: boolean;
  }): Promise<VyOSResponse> {
    const operations: NAT66BatchOperation[] = [{ op: "set_source_rule" }];
    if (config.description) {
      operations.push({ op: "set_source_rule_description", value: config.description });
    }
    if (config.protocol) {
      operations.push({ op: "set_source_rule_protocol", value: config.protocol });
    }
    if (config.outboundInterface) {
      operations.push({ op: "set_source_rule_outbound_interface_name", value: config.outboundInterface });
    }
    if (config.sourcePrefix) {
      operations.push({ op: "set_source_rule_source_prefix", value: config.sourcePrefix });
    }
    if (config.sourcePort) {
      operations.push({ op: "set_source_rule_source_port", value: config.sourcePort });
    }
    if (config.destinationPrefix) {
      operations.push({ op: "set_source_rule_destination_prefix", value: config.destinationPrefix });
    }
    if (config.destinationPort) {
      operations.push({ op: "set_source_rule_destination_port", value: config.destinationPort });
    }
    if (config.translationAddress) {
      operations.push({ op: "set_source_rule_translation_address", value: config.translationAddress });
    }
    if (config.translationPort) {
      operations.push({ op: "set_source_rule_translation_port", value: config.translationPort });
    }
    if (config.exclude) {
      operations.push({ op: "set_source_rule_exclude" });
    }
    if (config.log) {
      operations.push({ op: "set_source_rule_log" });
    }
    if (config.disable) {
      operations.push({ op: "set_source_rule_disable" });
    }
    return this.batchConfigure(config.ruleNumber, "source", operations);
  }

  async updateSourceRule(
    ruleNumber: number,
    current: NAT66SourceRule,
    updated: {
      description?: string;
      sourcePrefix?: string;
      sourcePort?: string;
      destinationPrefix?: string;
      destinationPort?: string;
      outboundInterface?: string;
      protocol?: string;
      translationAddress?: string;
      translationPort?: string;
      exclude?: boolean;
      log?: boolean;
      disable?: boolean;
    }
  ): Promise<VyOSResponse> {
    const operations: NAT66BatchOperation[] = [];

    if (updated.description !== undefined) {
      if (updated.description) {
        operations.push({ op: "set_source_rule_description", value: updated.description });
      } else if (current.description) {
        operations.push({ op: "delete_source_rule_description" });
      }
    }
    if (updated.protocol !== undefined) {
      if (updated.protocol) {
        operations.push({ op: "set_source_rule_protocol", value: updated.protocol });
      } else if (current.protocol) {
        operations.push({ op: "delete_source_rule_protocol" });
      }
    }
    if (updated.outboundInterface !== undefined) {
      if (updated.outboundInterface) {
        operations.push({ op: "set_source_rule_outbound_interface_name", value: updated.outboundInterface });
      } else if (current.outbound_interface) {
        operations.push({ op: "delete_source_rule_outbound_interface_name" });
      }
    }
    if (updated.sourcePrefix !== undefined) {
      if (updated.sourcePrefix) {
        operations.push({ op: "set_source_rule_source_prefix", value: updated.sourcePrefix });
      } else if (current.source?.prefix) {
        operations.push({ op: "delete_source_rule_source_prefix" });
      }
    }
    if (updated.sourcePort !== undefined) {
      if (updated.sourcePort) {
        operations.push({ op: "set_source_rule_source_port", value: updated.sourcePort });
      } else if (current.source?.port) {
        operations.push({ op: "delete_source_rule_source_port" });
      }
    }
    if (updated.destinationPrefix !== undefined) {
      if (updated.destinationPrefix) {
        operations.push({ op: "set_source_rule_destination_prefix", value: updated.destinationPrefix });
      } else if (current.destination?.prefix) {
        operations.push({ op: "delete_source_rule_destination_prefix" });
      }
    }
    if (updated.destinationPort !== undefined) {
      if (updated.destinationPort) {
        operations.push({ op: "set_source_rule_destination_port", value: updated.destinationPort });
      } else if (current.destination?.port) {
        operations.push({ op: "delete_source_rule_destination_port" });
      }
    }
    if (updated.translationAddress !== undefined) {
      if (updated.translationAddress) {
        operations.push({ op: "set_source_rule_translation_address", value: updated.translationAddress });
      } else if (current.translation?.address) {
        operations.push({ op: "delete_source_rule_translation_address" });
      }
    }
    if (updated.translationPort !== undefined) {
      if (updated.translationPort) {
        operations.push({ op: "set_source_rule_translation_port", value: updated.translationPort });
      } else if (current.translation?.port) {
        operations.push({ op: "delete_source_rule_translation_port" });
      }
    }
    if (updated.exclude !== undefined) {
      if (updated.exclude && !current.exclude) {
        operations.push({ op: "set_source_rule_exclude" });
      } else if (!updated.exclude && current.exclude) {
        operations.push({ op: "delete_source_rule_exclude" });
      }
    }
    if (updated.log !== undefined) {
      if (updated.log && !current.log) {
        operations.push({ op: "set_source_rule_log" });
      } else if (!updated.log && current.log) {
        operations.push({ op: "delete_source_rule_log" });
      }
    }
    if (updated.disable !== undefined) {
      if (updated.disable && !current.disable) {
        operations.push({ op: "set_source_rule_disable" });
      } else if (!updated.disable && current.disable) {
        operations.push({ op: "delete_source_rule_disable" });
      }
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batchConfigure(ruleNumber, "source", operations);
  }

  async deleteSourceRule(ruleNumber: number): Promise<VyOSResponse> {
    return this.batchConfigure(ruleNumber, "source", [{ op: "delete_source_rule" }]);
  }

  async toggleSourceRuleDisable(ruleNumber: number, currentlyDisabled: boolean): Promise<VyOSResponse> {
    const op = currentlyDisabled ? "delete_source_rule_disable" : "set_source_rule_disable";
    return this.batchConfigure(ruleNumber, "source", [{ op }]);
  }

  // ==================== Destination Rule Helpers ====================

  async createDestinationRule(config: {
    ruleNumber: number;
    description?: string;
    sourceAddress?: string;
    sourcePort?: string;
    destinationAddress?: string;
    destinationPort?: string;
    inboundInterface?: string;
    protocol?: string;
    translationAddress?: string;
    translationPort?: string;
    exclude?: boolean;
    log?: boolean;
    disable?: boolean;
  }): Promise<VyOSResponse> {
    const operations: NAT66BatchOperation[] = [{ op: "set_destination_rule" }];
    if (config.description) {
      operations.push({ op: "set_destination_rule_description", value: config.description });
    }
    if (config.protocol) {
      operations.push({ op: "set_destination_rule_protocol", value: config.protocol });
    }
    if (config.inboundInterface) {
      operations.push({ op: "set_destination_rule_inbound_interface_name", value: config.inboundInterface });
    }
    if (config.sourceAddress) {
      operations.push({ op: "set_destination_rule_source_address", value: config.sourceAddress });
    }
    if (config.sourcePort) {
      operations.push({ op: "set_destination_rule_source_port", value: config.sourcePort });
    }
    if (config.destinationAddress) {
      operations.push({ op: "set_destination_rule_destination_address", value: config.destinationAddress });
    }
    if (config.destinationPort) {
      operations.push({ op: "set_destination_rule_destination_port", value: config.destinationPort });
    }
    if (config.translationAddress) {
      operations.push({ op: "set_destination_rule_translation_address", value: config.translationAddress });
    }
    if (config.translationPort) {
      operations.push({ op: "set_destination_rule_translation_port", value: config.translationPort });
    }
    if (config.exclude) {
      operations.push({ op: "set_destination_rule_exclude" });
    }
    if (config.log) {
      operations.push({ op: "set_destination_rule_log" });
    }
    if (config.disable) {
      operations.push({ op: "set_destination_rule_disable" });
    }
    return this.batchConfigure(config.ruleNumber, "destination", operations);
  }

  async updateDestinationRule(
    ruleNumber: number,
    current: NAT66DestinationRule,
    updated: {
      description?: string;
      sourceAddress?: string;
      sourcePort?: string;
      destinationAddress?: string;
      destinationPort?: string;
      inboundInterface?: string;
      protocol?: string;
      translationAddress?: string;
      translationPort?: string;
      exclude?: boolean;
      log?: boolean;
      disable?: boolean;
    }
  ): Promise<VyOSResponse> {
    const operations: NAT66BatchOperation[] = [];

    if (updated.description !== undefined) {
      if (updated.description) {
        operations.push({ op: "set_destination_rule_description", value: updated.description });
      } else if (current.description) {
        operations.push({ op: "delete_destination_rule_description" });
      }
    }
    if (updated.protocol !== undefined) {
      if (updated.protocol) {
        operations.push({ op: "set_destination_rule_protocol", value: updated.protocol });
      } else if (current.protocol) {
        operations.push({ op: "delete_destination_rule_protocol" });
      }
    }
    if (updated.inboundInterface !== undefined) {
      if (updated.inboundInterface) {
        operations.push({ op: "set_destination_rule_inbound_interface_name", value: updated.inboundInterface });
      } else if (current.inbound_interface) {
        operations.push({ op: "delete_destination_rule_inbound_interface_name" });
      }
    }
    if (updated.sourceAddress !== undefined) {
      if (updated.sourceAddress) {
        operations.push({ op: "set_destination_rule_source_address", value: updated.sourceAddress });
      } else if (current.source?.address) {
        operations.push({ op: "delete_destination_rule_source_address" });
      }
    }
    if (updated.sourcePort !== undefined) {
      if (updated.sourcePort) {
        operations.push({ op: "set_destination_rule_source_port", value: updated.sourcePort });
      } else if (current.source?.port) {
        operations.push({ op: "delete_destination_rule_source_port" });
      }
    }
    if (updated.destinationAddress !== undefined) {
      if (updated.destinationAddress) {
        operations.push({ op: "set_destination_rule_destination_address", value: updated.destinationAddress });
      } else if (current.destination?.address) {
        operations.push({ op: "delete_destination_rule_destination_address" });
      }
    }
    if (updated.destinationPort !== undefined) {
      if (updated.destinationPort) {
        operations.push({ op: "set_destination_rule_destination_port", value: updated.destinationPort });
      } else if (current.destination?.port) {
        operations.push({ op: "delete_destination_rule_destination_port" });
      }
    }
    if (updated.translationAddress !== undefined) {
      if (updated.translationAddress) {
        operations.push({ op: "set_destination_rule_translation_address", value: updated.translationAddress });
      } else if (current.translation?.address) {
        operations.push({ op: "delete_destination_rule_translation_address" });
      }
    }
    if (updated.translationPort !== undefined) {
      if (updated.translationPort) {
        operations.push({ op: "set_destination_rule_translation_port", value: updated.translationPort });
      } else if (current.translation?.port) {
        operations.push({ op: "delete_destination_rule_translation_port" });
      }
    }
    if (updated.exclude !== undefined) {
      if (updated.exclude && !current.exclude) {
        operations.push({ op: "set_destination_rule_exclude" });
      } else if (!updated.exclude && current.exclude) {
        operations.push({ op: "delete_destination_rule_exclude" });
      }
    }
    if (updated.log !== undefined) {
      if (updated.log && !current.log) {
        operations.push({ op: "set_destination_rule_log" });
      } else if (!updated.log && current.log) {
        operations.push({ op: "delete_destination_rule_log" });
      }
    }
    if (updated.disable !== undefined) {
      if (updated.disable && !current.disable) {
        operations.push({ op: "set_destination_rule_disable" });
      } else if (!updated.disable && current.disable) {
        operations.push({ op: "delete_destination_rule_disable" });
      }
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batchConfigure(ruleNumber, "destination", operations);
  }

  async deleteDestinationRule(ruleNumber: number): Promise<VyOSResponse> {
    return this.batchConfigure(ruleNumber, "destination", [{ op: "delete_destination_rule" }]);
  }

  async toggleDestinationRuleDisable(ruleNumber: number, currentlyDisabled: boolean): Promise<VyOSResponse> {
    const op = currentlyDisabled ? "delete_destination_rule_disable" : "set_destination_rule_disable";
    return this.batchConfigure(ruleNumber, "destination", [{ op }]);
  }

  // ==================== Delete + Compact ====================

  async deleteAndCompactSourceRules(ruleNumber: number): Promise<VyOSResponse> {
    await this.deleteSourceRule(ruleNumber);
    const config = await this.getConfig(true);
    const remaining = config.source_rules;
    if (remaining.length === 0) {
      return { success: true, data: { message: "All source rules deleted" } };
    }
    const reorderItems = remaining.map((rule, i) => ({
      old_number: rule.rule_number,
      new_number: 100 + i,
      rule_data: this.flattenSourceRule(rule),
    }));
    const needsReorder = reorderItems.some((item) => item.old_number !== item.new_number);
    if (!needsReorder) {
      return { success: true, data: { message: "Rule deleted, no compaction needed" } };
    }
    return this.reorderRules("source", reorderItems);
  }

  async deleteAndCompactDestinationRules(ruleNumber: number): Promise<VyOSResponse> {
    await this.deleteDestinationRule(ruleNumber);
    const config = await this.getConfig(true);
    const remaining = config.destination_rules;
    if (remaining.length === 0) {
      return { success: true, data: { message: "All destination rules deleted" } };
    }
    const reorderItems = remaining.map((rule, i) => ({
      old_number: rule.rule_number,
      new_number: 100 + i,
      rule_data: this.flattenDestinationRule(rule),
    }));
    const needsReorder = reorderItems.some((item) => item.old_number !== item.new_number);
    if (!needsReorder) {
      return { success: true, data: { message: "Rule deleted, no compaction needed" } };
    }
    return this.reorderRules("destination", reorderItems);
  }

  flattenSourceRule(rule: NAT66SourceRule): Record<string, unknown> {
    return {
      description: rule.description || undefined,
      disable: rule.disable,
      exclude: rule.exclude,
      log: rule.log,
      protocol: rule.protocol || undefined,
      outbound_interface: rule.outbound_interface || undefined,
      source_prefix: rule.source?.prefix || undefined,
      source_port: rule.source?.port || undefined,
      destination_prefix: rule.destination?.prefix || undefined,
      destination_port: rule.destination?.port || undefined,
      translation_address: rule.translation?.address || undefined,
      translation_port: rule.translation?.port || undefined,
    };
  }

  flattenDestinationRule(rule: NAT66DestinationRule): Record<string, unknown> {
    return {
      description: rule.description || undefined,
      disable: rule.disable,
      exclude: rule.exclude,
      log: rule.log,
      protocol: rule.protocol || undefined,
      inbound_interface: rule.inbound_interface || undefined,
      source_address: rule.source?.address || undefined,
      source_port: rule.source?.port || undefined,
      destination_address: rule.destination?.address || undefined,
      destination_port: rule.destination?.port || undefined,
      translation_address: rule.translation?.address || undefined,
      translation_port: rule.translation?.port || undefined,
    };
  }
}

export const nat66Service = new NAT66Service();
