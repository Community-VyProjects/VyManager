import { apiClient } from "./client";
import { ApiError } from "@/lib/types/api";

// ==================== Type Definitions ====================

export interface StatePolicy {
  action: string | null;  // accept, drop, reject
  log: boolean;
  log_level: string | null;  // emerg, alert, crit, err, warn, notice, info, debug
}

export interface TimeoutSettings {
  icmp: number | null;
  other: number | null;
  tcp_close: number | null;
  tcp_close_wait: number | null;
  tcp_established: number | null;
  tcp_fin_wait: number | null;
  tcp_last_ack: number | null;
  tcp_syn_recv: number | null;
  tcp_syn_sent: number | null;
  tcp_time_wait: number | null;
  udp_other: number | null;
  udp_stream: number | null;
}

export interface BridgedTraffic {
  ipv4: boolean;
  ipv6: boolean;
}

export interface FirewallGlobalOptionsConfig {
  // Basic options
  all_ping: string | null;  // enable, disable
  broadcast_ping: string | null;  // enable, disable

  // Source routing
  ip_src_route: string | null;  // enable, disable
  ipv6_src_route: string | null;  // enable, disable

  // ICMP redirects
  receive_redirects: string | null;  // enable, disable
  ipv6_receive_redirects: string | null;  // enable, disable
  send_redirects: string | null;  // enable, disable

  // Security options
  log_martians: string | null;  // enable, disable
  source_validation: string | null;  // strict, loose, disable
  syn_cookies: string | null;  // enable, disable
  twa_hazards_protection: string | null;  // enable, disable

  // State policies
  state_policy_established: StatePolicy | null;
  state_policy_invalid: StatePolicy | null;
  state_policy_related: StatePolicy | null;

  // VyOS 1.5+ features
  bridged_traffic: BridgedTraffic | null;
  timeouts: TimeoutSettings | null;
}

export interface FirewallGlobalOptionsConfigResponse {
  config: FirewallGlobalOptionsConfig;
  has_config: boolean;
}

export interface FirewallGlobalOptionsCapabilities {
  version: string;
  features: {
    basic_options: {
      supported: boolean;
      description: string;
    };
    source_routing: {
      supported: boolean;
      description: string;
    };
    redirects: {
      supported: boolean;
      description: string;
    };
    security_options: {
      supported: boolean;
      description: string;
    };
    state_policies: {
      supported: boolean;
      description: string;
    };
    bridged_traffic: {
      supported: boolean;
      description: string;
    };
    timeouts: {
      supported: boolean;
      description: string;
    };
  };
  version_notes: {
    is_v15_or_later: boolean;
    bridged_traffic_available: boolean;
    timeouts_available: boolean;
  };
  instance_name?: string;
  instance_id?: string;
}

export interface GlobalOptionsBatchOperation {
  op: string;
  value?: string | null;
}

export interface GlobalOptionsBatchRequest {
  operations: GlobalOptionsBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ==================== Firewall Global Options Service ====================

class FirewallGlobalOptionsService {
  /**
   * Get firewall global options capabilities based on VyOS version
   */
  async getCapabilities(): Promise<FirewallGlobalOptionsCapabilities> {
    return apiClient.get<FirewallGlobalOptionsCapabilities>("/vyos/firewall/global-options/capabilities");
  }

  /**
   * Get complete firewall global options configuration
   */
  async getConfig(refresh: boolean = false): Promise<FirewallGlobalOptionsConfigResponse> {
    const endpoint = refresh
      ? "/vyos/firewall/global-options/config?refresh=true"
      : "/vyos/firewall/global-options/config";
    return apiClient.get<FirewallGlobalOptionsConfigResponse>(endpoint);
  }

  /**
   * Execute batch operations
   */
  async batchConfigure(request: GlobalOptionsBatchRequest): Promise<VyOSResponse> {
    try {
      const response = await apiClient.post<VyOSResponse>("/vyos/firewall/global-options/batch", request);
      return response;
    } catch (error) {
      const errorMessage = ((error as ApiError).details as { detail?: string })?.detail || (error as ApiError).message || "Unknown error";
      throw new Error(errorMessage);
    }
  }

  /**
   * Update firewall global options with the provided configuration
   */
  async updateConfig(config: Partial<FirewallGlobalOptionsConfig>): Promise<VyOSResponse> {
    try {
      const response = await apiClient.post<VyOSResponse>("/vyos/firewall/global-options/update", config);
      return response;
    } catch (error) {
      const errorMessage = ((error as ApiError).details as { detail?: string })?.detail || (error as ApiError).message || "Unknown error";
      throw new Error(errorMessage);
    }
  }

  /**
   * Refresh configuration cache
   */
  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh", {});
  }

  // ==================== Helper Methods ====================

  /**
   * Set all-ping option
   */
  async setAllPing(value: "enable" | "disable"): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "set_all_ping", value }]
    });
  }

  /**
   * Set broadcast-ping option
   */
  async setBroadcastPing(value: "enable" | "disable"): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "set_broadcast_ping", value }]
    });
  }

  /**
   * Set IP source routing option
   */
  async setIpSrcRoute(value: "enable" | "disable"): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "set_ip_src_route", value }]
    });
  }

  /**
   * Set IPv6 source routing option
   */
  async setIpv6SrcRoute(value: "enable" | "disable"): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "set_ipv6_src_route", value }]
    });
  }

  /**
   * Set receive-redirects option
   */
  async setReceiveRedirects(value: "enable" | "disable"): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "set_receive_redirects", value }]
    });
  }

  /**
   * Set send-redirects option
   */
  async setSendRedirects(value: "enable" | "disable"): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "set_send_redirects", value }]
    });
  }

  /**
   * Set log-martians option
   */
  async setLogMartians(value: "enable" | "disable"): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "set_log_martians", value }]
    });
  }

  /**
   * Set source-validation option
   */
  async setSourceValidation(value: "strict" | "loose" | "disable"): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "set_source_validation", value }]
    });
  }

  /**
   * Set syn-cookies option
   */
  async setSynCookies(value: "enable" | "disable"): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "set_syn_cookies", value }]
    });
  }

  /**
   * Set twa-hazards-protection option
   */
  async setTwaHazardsProtection(value: "enable" | "disable"): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "set_twa_hazards_protection", value }]
    });
  }

  /**
   * Configure state policy for established connections
   */
  async setStatePolicyEstablished(
    action: "accept" | "drop" | "reject",
    log: boolean = false,
    logLevel?: string
  ): Promise<VyOSResponse> {
    const operations: GlobalOptionsBatchOperation[] = [
      { op: "set_state_policy_established_action", value: action }
    ];
    if (log) {
      operations.push({ op: "set_state_policy_established_log" });
    }
    if (logLevel) {
      operations.push({ op: "set_state_policy_established_log_level", value: logLevel });
    }
    return this.batchConfigure({ operations });
  }

  /**
   * Configure state policy for invalid connections
   */
  async setStatePolicyInvalid(
    action: "accept" | "drop" | "reject",
    log: boolean = false,
    logLevel?: string
  ): Promise<VyOSResponse> {
    const operations: GlobalOptionsBatchOperation[] = [
      { op: "set_state_policy_invalid_action", value: action }
    ];
    if (log) {
      operations.push({ op: "set_state_policy_invalid_log" });
    }
    if (logLevel) {
      operations.push({ op: "set_state_policy_invalid_log_level", value: logLevel });
    }
    return this.batchConfigure({ operations });
  }

  /**
   * Configure state policy for related connections
   */
  async setStatePolicyRelated(
    action: "accept" | "drop" | "reject",
    log: boolean = false,
    logLevel?: string
  ): Promise<VyOSResponse> {
    const operations: GlobalOptionsBatchOperation[] = [
      { op: "set_state_policy_related_action", value: action }
    ];
    if (log) {
      operations.push({ op: "set_state_policy_related_log" });
    }
    if (logLevel) {
      operations.push({ op: "set_state_policy_related_log_level", value: logLevel });
    }
    return this.batchConfigure({ operations });
  }

  /**
   * Delete state policy for established connections
   */
  async deleteStatePolicyEstablished(): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "delete_state_policy_established" }]
    });
  }

  /**
   * Delete state policy for invalid connections
   */
  async deleteStatePolicyInvalid(): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "delete_state_policy_invalid" }]
    });
  }

  /**
   * Delete state policy for related connections
   */
  async deleteStatePolicyRelated(): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "delete_state_policy_related" }]
    });
  }

  /**
   * Enable bridged traffic for IPv4 (VyOS 1.5+)
   */
  async setBridgedTrafficIPv4(enable: boolean): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{
        op: enable ? "set_apply_to_bridged_traffic_ipv4" : "delete_apply_to_bridged_traffic_ipv4"
      }]
    });
  }

  /**
   * Enable bridged traffic for IPv6 (VyOS 1.5+)
   */
  async setBridgedTrafficIPv6(enable: boolean): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{
        op: enable ? "set_apply_to_bridged_traffic_ipv6" : "delete_apply_to_bridged_traffic_ipv6"
      }]
    });
  }

  /**
   * Set TCP timeout for established connections (VyOS 1.5+)
   */
  async setTimeoutTcpEstablished(seconds: number): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "set_timeout_tcp_established", value: seconds.toString() }]
    });
  }

  /**
   * Delete all global options
   */
  async deleteAllOptions(): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "delete_all" }]
    });
  }
}

export const firewallGlobalOptionsService = new FirewallGlobalOptionsService();
