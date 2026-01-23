/**
 * QoS API Service
 * Handles all QoS (Quality of Service) / Traffic Policy related API operations for VyOS
 */

import { apiClient } from "./client";

// ============================================================================
// Response Types
// ============================================================================

export interface MatchRule {
  name: string;
  description?: string;
  interface?: string;
  mark?: string;
  vif?: string;
  ip?: {
    dscp?: string;
    protocol?: string;
    source_address?: string;
    source_port?: string;
    destination_address?: string;
    destination_port?: string;
  };
  ipv6?: {
    dscp?: string;
    protocol?: string;
    source_address?: string;
    destination_address?: string;
  };
  ether?: {
    protocol?: string;
    source?: string;
    destination?: string;
  };
}

export interface ShaperClass {
  id: string;
  bandwidth?: string;
  ceiling?: string;
  priority?: string;
  burst?: string;
  queue_type?: string;
  set_dscp?: string;
  matches: MatchRule[];
}

export interface LimiterClass {
  id: string;
  bandwidth?: string;
  burst?: string;
  priority?: string;
  matches: MatchRule[];
}

export interface RandomDetectPrecedence {
  id: string;
  average_packet?: string;
  mark_probability?: string;
  minimum_threshold?: string;
  maximum_threshold?: string;
  queue_limit?: string;
}

export interface QoSPolicy {
  name: string;
  type: string;
  description?: string;
  bandwidth?: string;
  classes: Record<string, unknown>[];
  default: Record<string, unknown>;
  // Type-specific fields
  burst?: string;
  latency?: string;
  codel_quantum?: string;
  flows?: string;
  interval?: string;
  queue_limit?: string;
  target?: string;
  flow_isolation?: string;
  rtt?: string;
  delay?: string;
  loss?: string;
  corruption?: string;
  reordering?: string;
  hash_interval?: string;
  precedences?: RandomDetectPrecedence[];
}

export interface InterfaceBinding {
  interface: string;
  egress?: string;
  ingress?: string;
}

export interface QoSConfigResponse {
  configured: boolean;
  policies: QoSPolicy[];
  interface_bindings: InterfaceBinding[];
}

export interface QoSCapabilities {
  policy_types: { value: string; label: string; description: string }[];
  queue_types: { value: string; label: string }[];
  dscp_values: { value: string; label: string }[];
  flow_isolation_modes: { value: string; label: string }[];
  protocols: { value: string; label: string }[];
  bandwidth_units: string[];
  version: string;
}

// ============================================================================
// Request Types
// ============================================================================

export type QoSOperation =
  // Shaper Operations
  | { op: "create_shaper"; name: string; bandwidth: string; description?: string }
  | { op: "delete_shaper"; name: string }
  | {
      op: "add_shaper_class";
      name: string;
      class_id: string;
      bandwidth?: string;
      ceiling?: string;
      priority?: number;
      burst?: string;
      queue_type?: string;
      set_dscp?: string;
    }
  | { op: "delete_shaper_class"; name: string; class_id: string }
  | {
      op: "set_shaper_default";
      name: string;
      bandwidth?: string;
      ceiling?: string;
      queue_type?: string;
    }
  | {
      op: "add_shaper_class_match";
      name: string;
      class_id: string;
      match_name: string;
      ip_source?: string;
      ip_destination?: string;
      ip_dscp?: string;
      ip_protocol?: string;
      ip_source_port?: string;
      ip_destination_port?: string;
    }
  | { op: "delete_shaper_class_match"; name: string; class_id: string; match_name: string }
  // Rate-Control Operations
  | {
      op: "create_rate_control";
      name: string;
      bandwidth: string;
      burst?: string;
      latency?: string;
      description?: string;
    }
  | { op: "delete_rate_control"; name: string }
  // Limiter Operations
  | {
      op: "create_limiter";
      name: string;
      description?: string;
      default_bandwidth?: string;
      default_burst?: string;
    }
  | { op: "delete_limiter"; name: string }
  | {
      op: "add_limiter_class";
      name: string;
      class_id: string;
      bandwidth?: string;
      burst?: string;
      priority?: number;
    }
  | { op: "delete_limiter_class"; name: string; class_id: string }
  // FQ-CoDel Operations
  | {
      op: "create_fq_codel";
      name: string;
      quantum?: string;
      flows?: string;
      interval?: string;
      queue_limit?: string;
      target?: string;
      description?: string;
    }
  | { op: "delete_fq_codel"; name: string }
  // CAKE Operations
  | {
      op: "create_cake";
      name: string;
      bandwidth: string;
      flow_isolation?: string;
      rtt?: string;
      description?: string;
    }
  | { op: "delete_cake"; name: string }
  // Priority Queue Operations
  | { op: "create_priority_queue"; name: string; description?: string }
  | { op: "delete_priority_queue"; name: string }
  | {
      op: "add_priority_queue_class";
      name: string;
      class_id: string;
      queue_type?: string;
      queue_limit?: string;
    }
  // Network Emulator Operations
  | {
      op: "create_network_emulator";
      name: string;
      bandwidth: string;
      delay?: string;
      loss?: string;
      corruption?: string;
      reordering?: string;
      queue_limit?: string;
      description?: string;
    }
  | { op: "delete_network_emulator"; name: string }
  // Drop-Tail Operations
  | { op: "create_drop_tail"; name: string; queue_limit?: string; description?: string }
  | { op: "delete_drop_tail"; name: string }
  // Fair-Queue Operations
  | { op: "create_fair_queue"; name: string; hash_interval?: string; queue_limit?: string; description?: string }
  | { op: "delete_fair_queue"; name: string }
  // Round-Robin Operations
  | { op: "create_round_robin"; name: string; description?: string }
  | { op: "delete_round_robin"; name: string }
  | {
      op: "add_round_robin_class";
      name: string;
      class_id: string;
      quantum?: string;
      queue_limit?: string;
      queue_type?: string;
    }
  // Random-Detect Operations
  | { op: "create_random_detect"; name: string; bandwidth: string; description?: string }
  | { op: "delete_random_detect"; name: string }
  | {
      op: "add_random_detect_precedence";
      name: string;
      precedence: number;
      average_packet?: string;
      min_threshold?: string;
      max_threshold?: string;
      mark_probability?: string;
    }
  // Interface Binding Operations
  | { op: "bind_interface_egress"; interface: string; policy: string }
  | { op: "unbind_interface_egress"; interface: string }
  | { op: "bind_interface_ingress"; interface: string; policy: string }
  | { op: "unbind_interface_ingress"; interface: string };

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// QoS Service
// ============================================================================

export class QoSService {
  /**
   * Get complete QoS configuration
   */
  async getConfig(): Promise<QoSConfigResponse> {
    return apiClient.get<QoSConfigResponse>("/vyos/qos/config");
  }

  /**
   * Get QoS capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<QoSCapabilities> {
    return apiClient.get<QoSCapabilities>("/vyos/qos/capabilities");
  }

  /**
   * Execute batch QoS operations
   */
  async batch(operations: QoSOperation[]): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/qos/batch", { operations });
  }

  // ============================================================================
  // Helper Methods - Shaper
  // ============================================================================

  /**
   * Create a shaper policy
   */
  async createShaper(
    name: string,
    bandwidth: string,
    options?: { description?: string }
  ): Promise<VyOSResponse> {
    return this.batch([
      { op: "create_shaper", name, bandwidth, description: options?.description },
    ]);
  }

  /**
   * Delete a shaper policy
   */
  async deleteShaper(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_shaper", name }]);
  }

  /**
   * Add a class to a shaper policy
   */
  async addShaperClass(
    policyName: string,
    classId: string,
    options: {
      bandwidth?: string;
      ceiling?: string;
      priority?: number;
      burst?: string;
      queue_type?: string;
      set_dscp?: string;
    }
  ): Promise<VyOSResponse> {
    return this.batch([
      {
        op: "add_shaper_class",
        name: policyName,
        class_id: classId,
        ...options,
      },
    ]);
  }

  // ============================================================================
  // Helper Methods - Rate-Control
  // ============================================================================

  /**
   * Create a rate-control policy
   */
  async createRateControl(
    name: string,
    bandwidth: string,
    options?: { burst?: string; latency?: string; description?: string }
  ): Promise<VyOSResponse> {
    return this.batch([
      { op: "create_rate_control", name, bandwidth, ...options },
    ]);
  }

  /**
   * Delete a rate-control policy
   */
  async deleteRateControl(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_rate_control", name }]);
  }

  // ============================================================================
  // Helper Methods - CAKE
  // ============================================================================

  /**
   * Create a CAKE policy
   */
  async createCake(
    name: string,
    bandwidth: string,
    options?: { flow_isolation?: string; rtt?: string; description?: string }
  ): Promise<VyOSResponse> {
    return this.batch([{ op: "create_cake", name, bandwidth, ...options }]);
  }

  /**
   * Delete a CAKE policy
   */
  async deleteCake(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_cake", name }]);
  }

  // ============================================================================
  // Helper Methods - Network Emulator
  // ============================================================================

  /**
   * Create a network emulator policy
   */
  async createNetworkEmulator(
    name: string,
    bandwidth: string,
    options?: {
      delay?: string;
      loss?: string;
      corruption?: string;
      reordering?: string;
      description?: string;
    }
  ): Promise<VyOSResponse> {
    return this.batch([
      { op: "create_network_emulator", name, bandwidth, ...options },
    ]);
  }

  /**
   * Delete a network emulator policy
   */
  async deleteNetworkEmulator(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_network_emulator", name }]);
  }

  // ============================================================================
  // Helper Methods - Interface Binding
  // ============================================================================

  /**
   * Bind a policy to interface egress
   */
  async bindEgress(interfaceName: string, policyName: string): Promise<VyOSResponse> {
    return this.batch([
      { op: "bind_interface_egress", interface: interfaceName, policy: policyName },
    ]);
  }

  /**
   * Unbind egress policy from interface
   */
  async unbindEgress(interfaceName: string): Promise<VyOSResponse> {
    return this.batch([{ op: "unbind_interface_egress", interface: interfaceName }]);
  }

  /**
   * Bind a policy to interface ingress
   */
  async bindIngress(interfaceName: string, policyName: string): Promise<VyOSResponse> {
    return this.batch([
      { op: "bind_interface_ingress", interface: interfaceName, policy: policyName },
    ]);
  }

  /**
   * Unbind ingress policy from interface
   */
  async unbindIngress(interfaceName: string): Promise<VyOSResponse> {
    return this.batch([{ op: "unbind_interface_ingress", interface: interfaceName }]);
  }

  // ============================================================================
  // Helper Methods - Delete Any Policy
  // ============================================================================

  /**
   * Delete a policy by type and name
   */
  async deletePolicy(policyType: string, name: string): Promise<VyOSResponse> {
    const opMap: Record<string, QoSOperation["op"]> = {
      shaper: "delete_shaper",
      "rate-control": "delete_rate_control",
      limiter: "delete_limiter",
      "fq-codel": "delete_fq_codel",
      cake: "delete_cake",
      "priority-queue": "delete_priority_queue",
      "network-emulator": "delete_network_emulator",
      "drop-tail": "delete_drop_tail",
      "fair-queue": "delete_fair_queue",
      "round-robin": "delete_round_robin",
      "random-detect": "delete_random_detect",
    };

    const op = opMap[policyType];
    if (!op) {
      throw new Error(`Unknown policy type: ${policyType}`);
    }

    return this.batch([{ op, name } as QoSOperation]);
  }
}

export const qosService = new QoSService();
