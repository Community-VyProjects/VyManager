import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface BfdInterval {
  echo_interval: number | null;
  multiplier: number | null;
  receive: number | null;
  transmit: number | null;
}

export interface BfdSource {
  address: string | null;
  interface: string | null;
}

export interface BfdPeer {
  address: string;
  echo_mode: boolean;
  interval: BfdInterval;
  minimum_ttl: number | null;
  multihop: boolean;
  passive: boolean;
  profile: string | null;
  shutdown: boolean;
  source: BfdSource;
  vrf: string | null;
}

export interface BfdProfile {
  name: string;
  echo_mode: boolean;
  interval: BfdInterval;
  minimum_ttl: number | null;
  passive: boolean;
  shutdown: boolean;
}

export interface BfdConfig {
  peers: BfdPeer[];
  profiles: BfdProfile[];
}

export interface BfdCapabilities {
  version: string;
  features: {
    peers: { supported: boolean; description: string };
    profiles: { supported: boolean; description: string };
    echo_mode: { supported: boolean; description: string };
    multihop: { supported: boolean; description: string };
    vrf: { supported: boolean; description: string };
  };
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  instance_name?: string;
  instance_id?: string;
}

export interface BfdBatchOperation {
  op: string;
  value?: string;
}

export interface BfdBatchRequest {
  operations: BfdBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

class BfdService {
  async getCapabilities(): Promise<BfdCapabilities> {
    return apiClient.get<BfdCapabilities>("/vyos/bfd/capabilities");
  }

  async getConfig(refresh = false): Promise<BfdConfig> {
    return apiClient.get<BfdConfig>("/vyos/bfd/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  async batchConfigure(request: BfdBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/bfd/batch", request);
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // Peer Operations
  // ==========================================================================

  async createPeer(peer: BfdPeer): Promise<VyOSResponse> {
    const operations: BfdBatchOperation[] = [
      { op: "set_peer", value: peer.address },
    ];

    if (peer.echo_mode) {
      operations.push({ op: "set_peer_echo_mode", value: peer.address });
    }
    if (peer.interval.echo_interval != null) {
      operations.push({ op: "set_peer_interval_echo_interval", value: `${peer.address},${peer.interval.echo_interval}` });
    }
    if (peer.interval.multiplier != null) {
      operations.push({ op: "set_peer_interval_multiplier", value: `${peer.address},${peer.interval.multiplier}` });
    }
    if (peer.interval.receive != null) {
      operations.push({ op: "set_peer_interval_receive", value: `${peer.address},${peer.interval.receive}` });
    }
    if (peer.interval.transmit != null) {
      operations.push({ op: "set_peer_interval_transmit", value: `${peer.address},${peer.interval.transmit}` });
    }
    if (peer.minimum_ttl != null) {
      operations.push({ op: "set_peer_minimum_ttl", value: `${peer.address},${peer.minimum_ttl}` });
    }
    if (peer.multihop) {
      operations.push({ op: "set_peer_multihop", value: peer.address });
    }
    if (peer.passive) {
      operations.push({ op: "set_peer_passive", value: peer.address });
    }
    if (peer.profile) {
      operations.push({ op: "set_peer_profile", value: `${peer.address},${peer.profile}` });
    }
    if (peer.shutdown) {
      operations.push({ op: "set_peer_shutdown", value: peer.address });
    }
    if (peer.source.address) {
      operations.push({ op: "set_peer_source_address", value: `${peer.address},${peer.source.address}` });
    }
    if (peer.source.interface) {
      operations.push({ op: "set_peer_source_interface", value: `${peer.address},${peer.source.interface}` });
    }
    if (peer.vrf) {
      operations.push({ op: "set_peer_vrf", value: `${peer.address},${peer.vrf}` });
    }

    return this.batchConfigure({ operations });
  }

  async updatePeer(original: BfdPeer, updated: BfdPeer): Promise<VyOSResponse> {
    const operations: BfdBatchOperation[] = [];
    const addr = original.address;

    // Echo mode
    if (updated.echo_mode !== original.echo_mode) {
      operations.push({
        op: updated.echo_mode ? "set_peer_echo_mode" : "delete_peer_echo_mode",
        value: addr,
      });
    }

    // Interval echo_interval
    if (updated.interval.echo_interval !== original.interval.echo_interval) {
      if (updated.interval.echo_interval != null) {
        operations.push({ op: "set_peer_interval_echo_interval", value: `${addr},${updated.interval.echo_interval}` });
      } else {
        operations.push({ op: "delete_peer_interval_echo_interval", value: addr });
      }
    }

    // Interval multiplier
    if (updated.interval.multiplier !== original.interval.multiplier) {
      if (updated.interval.multiplier != null) {
        operations.push({ op: "set_peer_interval_multiplier", value: `${addr},${updated.interval.multiplier}` });
      } else {
        operations.push({ op: "delete_peer_interval_multiplier", value: addr });
      }
    }

    // Interval receive
    if (updated.interval.receive !== original.interval.receive) {
      if (updated.interval.receive != null) {
        operations.push({ op: "set_peer_interval_receive", value: `${addr},${updated.interval.receive}` });
      } else {
        operations.push({ op: "delete_peer_interval_receive", value: addr });
      }
    }

    // Interval transmit
    if (updated.interval.transmit !== original.interval.transmit) {
      if (updated.interval.transmit != null) {
        operations.push({ op: "set_peer_interval_transmit", value: `${addr},${updated.interval.transmit}` });
      } else {
        operations.push({ op: "delete_peer_interval_transmit", value: addr });
      }
    }

    // Minimum TTL
    if (updated.minimum_ttl !== original.minimum_ttl) {
      if (updated.minimum_ttl != null) {
        operations.push({ op: "set_peer_minimum_ttl", value: `${addr},${updated.minimum_ttl}` });
      } else {
        operations.push({ op: "delete_peer_minimum_ttl", value: addr });
      }
    }

    // Multihop
    if (updated.multihop !== original.multihop) {
      operations.push({
        op: updated.multihop ? "set_peer_multihop" : "delete_peer_multihop",
        value: addr,
      });
    }

    // Passive
    if (updated.passive !== original.passive) {
      operations.push({
        op: updated.passive ? "set_peer_passive" : "delete_peer_passive",
        value: addr,
      });
    }

    // Profile
    if (updated.profile !== original.profile) {
      if (updated.profile) {
        operations.push({ op: "set_peer_profile", value: `${addr},${updated.profile}` });
      } else {
        operations.push({ op: "delete_peer_profile", value: addr });
      }
    }

    // Shutdown
    if (updated.shutdown !== original.shutdown) {
      operations.push({
        op: updated.shutdown ? "set_peer_shutdown" : "delete_peer_shutdown",
        value: addr,
      });
    }

    // Source address
    if (updated.source.address !== original.source.address) {
      if (updated.source.address) {
        operations.push({ op: "set_peer_source_address", value: `${addr},${updated.source.address}` });
      } else {
        operations.push({ op: "delete_peer_source_address", value: addr });
      }
    }

    // Source interface
    if (updated.source.interface !== original.source.interface) {
      if (updated.source.interface) {
        operations.push({ op: "set_peer_source_interface", value: `${addr},${updated.source.interface}` });
      } else {
        operations.push({ op: "delete_peer_source_interface", value: addr });
      }
    }

    // VRF
    if (updated.vrf !== original.vrf) {
      if (updated.vrf) {
        operations.push({ op: "set_peer_vrf", value: `${addr},${updated.vrf}` });
      } else {
        operations.push({ op: "delete_peer_vrf", value: addr });
      }
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations });
  }

  async deletePeer(address: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "delete_peer", value: address }],
    });
  }

  // ==========================================================================
  // Profile Operations
  // ==========================================================================

  async createProfile(profile: BfdProfile): Promise<VyOSResponse> {
    const operations: BfdBatchOperation[] = [
      { op: "set_profile", value: profile.name },
    ];

    if (profile.echo_mode) {
      operations.push({ op: "set_profile_echo_mode", value: profile.name });
    }
    if (profile.interval.echo_interval != null) {
      operations.push({ op: "set_profile_interval_echo_interval", value: `${profile.name},${profile.interval.echo_interval}` });
    }
    if (profile.interval.multiplier != null) {
      operations.push({ op: "set_profile_interval_multiplier", value: `${profile.name},${profile.interval.multiplier}` });
    }
    if (profile.interval.receive != null) {
      operations.push({ op: "set_profile_interval_receive", value: `${profile.name},${profile.interval.receive}` });
    }
    if (profile.interval.transmit != null) {
      operations.push({ op: "set_profile_interval_transmit", value: `${profile.name},${profile.interval.transmit}` });
    }
    if (profile.minimum_ttl != null) {
      operations.push({ op: "set_profile_minimum_ttl", value: `${profile.name},${profile.minimum_ttl}` });
    }
    if (profile.passive) {
      operations.push({ op: "set_profile_passive", value: profile.name });
    }
    if (profile.shutdown) {
      operations.push({ op: "set_profile_shutdown", value: profile.name });
    }

    return this.batchConfigure({ operations });
  }

  async updateProfile(original: BfdProfile, updated: BfdProfile): Promise<VyOSResponse> {
    const operations: BfdBatchOperation[] = [];
    const name = original.name;

    // Echo mode
    if (updated.echo_mode !== original.echo_mode) {
      operations.push({
        op: updated.echo_mode ? "set_profile_echo_mode" : "delete_profile_echo_mode",
        value: name,
      });
    }

    // Interval echo_interval
    if (updated.interval.echo_interval !== original.interval.echo_interval) {
      if (updated.interval.echo_interval != null) {
        operations.push({ op: "set_profile_interval_echo_interval", value: `${name},${updated.interval.echo_interval}` });
      } else {
        operations.push({ op: "delete_profile_interval_echo_interval", value: name });
      }
    }

    // Interval multiplier
    if (updated.interval.multiplier !== original.interval.multiplier) {
      if (updated.interval.multiplier != null) {
        operations.push({ op: "set_profile_interval_multiplier", value: `${name},${updated.interval.multiplier}` });
      } else {
        operations.push({ op: "delete_profile_interval_multiplier", value: name });
      }
    }

    // Interval receive
    if (updated.interval.receive !== original.interval.receive) {
      if (updated.interval.receive != null) {
        operations.push({ op: "set_profile_interval_receive", value: `${name},${updated.interval.receive}` });
      } else {
        operations.push({ op: "delete_profile_interval_receive", value: name });
      }
    }

    // Interval transmit
    if (updated.interval.transmit !== original.interval.transmit) {
      if (updated.interval.transmit != null) {
        operations.push({ op: "set_profile_interval_transmit", value: `${name},${updated.interval.transmit}` });
      } else {
        operations.push({ op: "delete_profile_interval_transmit", value: name });
      }
    }

    // Minimum TTL
    if (updated.minimum_ttl !== original.minimum_ttl) {
      if (updated.minimum_ttl != null) {
        operations.push({ op: "set_profile_minimum_ttl", value: `${name},${updated.minimum_ttl}` });
      } else {
        operations.push({ op: "delete_profile_minimum_ttl", value: name });
      }
    }

    // Passive
    if (updated.passive !== original.passive) {
      operations.push({
        op: updated.passive ? "set_profile_passive" : "delete_profile_passive",
        value: name,
      });
    }

    // Shutdown
    if (updated.shutdown !== original.shutdown) {
      operations.push({
        op: updated.shutdown ? "set_profile_shutdown" : "delete_profile_shutdown",
        value: name,
      });
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.batchConfigure({ operations });
  }

  async deleteProfile(name: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      operations: [{ op: "delete_profile", value: name }],
    });
  }
}

export const bfdService = new BfdService();
