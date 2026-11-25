import { apiClient } from "./client";
import type { ApiError } from "@/lib/types/api";
import { globalOptionsSaveOps, type GlobalOptionsDraft } from "./firewall-global-options-save-ops";

// ==================== Type Definitions ====================

export interface StatePolicyState {
  action: string | null;
  log: boolean;
  log_level: string | null;
}

export interface StatePolicy {
  established: StatePolicyState;
  invalid: StatePolicyState;
  related: StatePolicyState;
  /** 1.5 only. */
  offload_target: string | null;
}

/** 1.5 only. */
export interface BridgedTraffic {
  ipv4: boolean;
  ipv6: boolean;
  accept_invalid_ethernet_types: string[];
}

/** 1.5 only. The license key loads as the mask when one is stored. */
export interface GeoIPSettings {
  provider: string | null;
  maxmind_account_id: string | null;
  maxmind_license_key: string | null;
  maxmind_lite: boolean;
  source_address: string | null;
  vrf: string | null;
}

/** 1.5 only, in seconds. */
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

export interface FirewallGlobalOptionsConfig {
  configured: boolean;
  all_ping: string | null;
  broadcast_ping: string | null;
  directed_broadcast: string | null;
  ip_src_route: string | null;
  ipv6_src_route: string | null;
  receive_redirects: string | null;
  ipv6_receive_redirects: string | null;
  send_redirects: string | null;
  log_martians: string | null;
  source_validation: string | null;
  ipv6_source_validation: string | null;
  syn_cookies: string | null;
  twa_hazards_protection: string | null;
  resolver_cache: boolean;
  resolver_interval: number | null;
  state_policy: StatePolicy;
  bridged_traffic: BridgedTraffic;
  geoip: GeoIPSettings;
  timeouts: TimeoutSettings;
}

interface FeatureFlag {
  supported: boolean;
}

interface ValueFeature extends FeatureFlag {
  values: string[];
}

interface RangeFeature extends FeatureFlag {
  min: number;
  max: number;
}

export interface FirewallGlobalOptionsCapabilities {
  version: string;
  features: {
    all_ping: ValueFeature;
    broadcast_ping: ValueFeature;
    directed_broadcast: ValueFeature;
    ip_src_route: ValueFeature;
    ipv6_src_route: ValueFeature;
    receive_redirects: ValueFeature;
    ipv6_receive_redirects: ValueFeature;
    send_redirects: ValueFeature;
    log_martians: ValueFeature;
    source_validation: ValueFeature;
    ipv6_source_validation: ValueFeature;
    syn_cookies: ValueFeature;
    twa_hazards_protection: ValueFeature;
    resolver_cache: FeatureFlag;
    resolver_interval: RangeFeature;
    state_policy: FeatureFlag & { actions: string[]; log_levels: string[] };
    state_policy_offload: FeatureFlag;
    bridged_traffic: FeatureFlag & { ethernet_types: string[] };
    geoip: FeatureFlag & { providers: string[] };
    timeouts: RangeFeature;
  };
  instance_name?: string;
  instance_id?: string;
}

export interface GlobalOptionsBatchOperation {
  op: string;
  value?: string;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

const NO_CHANGES: VyOSResponse = { success: true };

// ==================== Firewall Global Options Service ====================

class FirewallGlobalOptionsService {
  async getCapabilities(): Promise<FirewallGlobalOptionsCapabilities> {
    return apiClient.get<FirewallGlobalOptionsCapabilities>("/vyos/firewall/global-options/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<FirewallGlobalOptionsConfig> {
    return apiClient.get<FirewallGlobalOptionsConfig>("/vyos/firewall/global-options/config", {
      refresh: refresh.toString(),
    });
  }

  /**
   * Commit one batch; a rejected commit throws its error as an ApiError. An
   * empty op list has nothing to send, so no POST is made.
   */
  async batchConfigure(operations: GlobalOptionsBatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/firewall/global-options/batch", { operations });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    return result;
  }

  /** Save the edited options: only the leaves the draft changed are sent. */
  async save(original: GlobalOptionsDraft, updated: GlobalOptionsDraft): Promise<VyOSResponse> {
    return this.batchConfigure(globalOptionsSaveOps(original, updated));
  }
}

export const firewallGlobalOptionsService = new FirewallGlobalOptionsService();
