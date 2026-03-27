import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface NhrpMapEntry {
  tunnel_ip: string;
  nbma_address: string | null;
  cisco: boolean;
  register: boolean;
}

export interface NhrpDynamicMap {
  network: string;
  nbma_domain_name: string | null;
}

export interface NhrpNhsEntry {
  tunnel_ip: string;
  nbma_addresses: string[];
}

export interface NhrpShortcutTarget {
  target: string;
  holding_time: string | null;
}

export interface NhrpTunnel {
  name: string;
  authentication: string | null;
  holding_time: string | null;
  maps: NhrpMapEntry[];
  dynamic_maps: NhrpDynamicMap[];
  nhs_entries: NhrpNhsEntry[];
  multicast: string[];
  mtu: string | null;
  network_id: string | null;
  redirect: boolean;
  registration_no_unique: boolean;
  shortcut: boolean;
  non_caching: boolean;
  shortcut_destination: boolean;
  shortcut_targets: NhrpShortcutTarget[];
}

export interface NhrpConfig {
  enabled: boolean;
  tunnels: NhrpTunnel[];
}

export interface NhrpCapabilities {
  version: string;
  features: {
    nhrp: { supported: boolean; description: string };
    authentication: { supported: boolean; description: string };
    holding_time: { supported: boolean; description: string };
    map: { supported: boolean; description: string };
    map_cisco: { supported: boolean; description: string };
    map_register: { supported: boolean; description: string };
    dynamic_map: { supported: boolean; description: string };
    nhs: { supported: boolean; description: string };
    mtu: { supported: boolean; description: string };
    network_id: { supported: boolean; description: string };
    registration_no_unique: { supported: boolean; description: string };
    multicast: { supported: boolean; description: string };
    redirect: { supported: boolean; description: string };
    shortcut: { supported: boolean; description: string };
    non_caching: { supported: boolean; description: string };
    shortcut_destination: { supported: boolean; description: string };
    shortcut_target: { supported: boolean; description: string };
  };
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  instance_name?: string;
  instance_id?: string;
}

export interface NhrpBatchOperation {
  op: string;
  value?: string | null;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

class NhrpService {
  async getCapabilities(): Promise<NhrpCapabilities> {
    return apiClient.get<NhrpCapabilities>("/vyos/nhrp/capabilities");
  }

  async getConfig(refresh = false): Promise<NhrpConfig> {
    return apiClient.get<NhrpConfig>("/vyos/nhrp/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(ops: NhrpBatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/nhrp/batch", {
      operations: ops,
    });
    if (!result.success) {
      throw new Error(result.error || "NHRP operation failed");
    }
    return result;
  }

  // ==========================================================================
  // Tunnel Operations
  // ==========================================================================

  async createTunnel(
    name: string,
    settings: {
      authentication?: string;
      holding_time?: string;
      mtu?: string;
      network_id?: string;
      redirect?: boolean;
      shortcut?: boolean;
      non_caching?: boolean;
      shortcut_destination?: boolean;
      registration_no_unique?: boolean;
    }
  ): Promise<VyOSResponse> {
    const ops: NhrpBatchOperation[] = [{ op: "set_tunnel", value: name }];

    if (settings.authentication) {
      ops.push({ op: "set_authentication", value: `${name},${settings.authentication}` });
    }
    if (settings.holding_time) {
      ops.push({ op: "set_holding_time", value: `${name},${settings.holding_time}` });
    }
    if (settings.mtu) {
      ops.push({ op: "set_mtu", value: `${name},${settings.mtu}` });
    }
    if (settings.network_id) {
      ops.push({ op: "set_network_id", value: `${name},${settings.network_id}` });
    }
    if (settings.redirect) {
      ops.push({ op: "set_redirect", value: name });
    }
    if (settings.shortcut) {
      ops.push({ op: "set_shortcut", value: name });
    }
    if (settings.non_caching) {
      ops.push({ op: "set_non_caching", value: name });
    }
    if (settings.shortcut_destination) {
      ops.push({ op: "set_shortcut_destination", value: name });
    }
    if (settings.registration_no_unique) {
      ops.push({ op: "set_registration_no_unique", value: name });
    }

    return this.batch(ops);
  }

  async updateTunnelSettings(
    tunnel: string,
    current: NhrpTunnel,
    next: {
      authentication?: string;
      holding_time?: string;
      mtu?: string;
      network_id?: string;
      redirect?: boolean;
      shortcut?: boolean;
      non_caching?: boolean;
      shortcut_destination?: boolean;
      registration_no_unique?: boolean;
    }
  ): Promise<VyOSResponse> {
    const ops: NhrpBatchOperation[] = [];

    // Authentication
    const nextAuth = next.authentication || "";
    const curAuth = current.authentication || "";
    if (nextAuth !== curAuth) {
      if (nextAuth) {
        ops.push({ op: "set_authentication", value: `${tunnel},${nextAuth}` });
      } else {
        ops.push({ op: "delete_authentication", value: tunnel });
      }
    }

    // Holding time
    const nextHt = next.holding_time || "";
    const curHt = current.holding_time || "";
    if (nextHt !== curHt) {
      if (nextHt) {
        ops.push({ op: "set_holding_time", value: `${tunnel},${nextHt}` });
      } else {
        ops.push({ op: "delete_holding_time", value: tunnel });
      }
    }

    // MTU (1.5 only)
    const nextMtu = next.mtu || "";
    const curMtu = current.mtu || "";
    if (nextMtu !== curMtu) {
      if (nextMtu) {
        ops.push({ op: "set_mtu", value: `${tunnel},${nextMtu}` });
      } else {
        ops.push({ op: "delete_mtu", value: tunnel });
      }
    }

    // Network ID (1.5 only)
    const nextNid = next.network_id || "";
    const curNid = current.network_id || "";
    if (nextNid !== curNid) {
      if (nextNid) {
        ops.push({ op: "set_network_id", value: `${tunnel},${nextNid}` });
      } else {
        ops.push({ op: "delete_network_id", value: tunnel });
      }
    }

    // Boolean flags
    if (next.redirect !== current.redirect) {
      ops.push({ op: next.redirect ? "set_redirect" : "delete_redirect", value: tunnel });
    }
    if (next.shortcut !== current.shortcut) {
      ops.push({ op: next.shortcut ? "set_shortcut" : "delete_shortcut", value: tunnel });
    }
    if (next.non_caching !== current.non_caching) {
      ops.push({ op: next.non_caching ? "set_non_caching" : "delete_non_caching", value: tunnel });
    }
    if (next.shortcut_destination !== current.shortcut_destination) {
      ops.push({ op: next.shortcut_destination ? "set_shortcut_destination" : "delete_shortcut_destination", value: tunnel });
    }
    if (next.registration_no_unique !== current.registration_no_unique) {
      ops.push({ op: next.registration_no_unique ? "set_registration_no_unique" : "delete_registration_no_unique", value: tunnel });
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batch(ops);
  }

  async deleteTunnel(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_tunnel", value: name }]);
  }

  // ==========================================================================
  // Static Map Operations
  // ==========================================================================

  async createMap(
    tunnel: string,
    tunnelIp: string,
    nbma?: string,
    cisco?: boolean,
    register?: boolean
  ): Promise<VyOSResponse> {
    const ops: NhrpBatchOperation[] = [
      { op: "set_map", value: `${tunnel},${tunnelIp}` },
    ];
    if (nbma) {
      ops.push({ op: "set_map_nbma", value: `${tunnel},${tunnelIp},${nbma}` });
    }
    if (cisco) {
      ops.push({ op: "set_map_cisco", value: `${tunnel},${tunnelIp}` });
    }
    if (register) {
      ops.push({ op: "set_map_register", value: `${tunnel},${tunnelIp}` });
    }
    return this.batch(ops);
  }

  async updateMap(
    tunnel: string,
    tunnelIp: string,
    current: NhrpMapEntry,
    next: { nbma?: string; cisco?: boolean; register?: boolean }
  ): Promise<VyOSResponse> {
    const ops: NhrpBatchOperation[] = [];

    const nextNbma = next.nbma || "";
    const curNbma = current.nbma_address || "";
    if (nextNbma !== curNbma) {
      if (nextNbma) {
        ops.push({ op: "set_map_nbma", value: `${tunnel},${tunnelIp},${nextNbma}` });
      } else {
        ops.push({ op: "delete_map_nbma", value: `${tunnel},${tunnelIp}` });
      }
    }

    if (next.cisco !== current.cisco) {
      ops.push({ op: next.cisco ? "set_map_cisco" : "delete_map_cisco", value: `${tunnel},${tunnelIp}` });
    }
    if (next.register !== current.register) {
      ops.push({ op: next.register ? "set_map_register" : "delete_map_register", value: `${tunnel},${tunnelIp}` });
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batch(ops);
  }

  async deleteMap(tunnel: string, tunnelIp: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_map", value: `${tunnel},${tunnelIp}` }]);
  }

  // ==========================================================================
  // NHS Operations (VyOS 1.5 only)
  // ==========================================================================

  async createNhs(tunnel: string, tunnelIp: string, nbmaAddresses: string[]): Promise<VyOSResponse> {
    const ops: NhrpBatchOperation[] = [
      { op: "set_nhs", value: `${tunnel},${tunnelIp}` },
    ];
    for (const nbma of nbmaAddresses) {
      ops.push({ op: "set_nhs_nbma", value: `${tunnel},${tunnelIp},${nbma}` });
    }
    return this.batch(ops);
  }

  async updateNhs(
    tunnel: string,
    tunnelIp: string,
    currentNbma: string[],
    nextNbma: string[]
  ): Promise<VyOSResponse> {
    const ops: NhrpBatchOperation[] = [];

    // Remove old addresses not in new list
    for (const addr of currentNbma) {
      if (!nextNbma.includes(addr)) {
        ops.push({ op: "delete_nhs_nbma", value: `${tunnel},${tunnelIp},${addr}` });
      }
    }
    // Add new addresses
    for (const addr of nextNbma) {
      if (!currentNbma.includes(addr)) {
        ops.push({ op: "set_nhs_nbma", value: `${tunnel},${tunnelIp},${addr}` });
      }
    }

    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batch(ops);
  }

  async deleteNhs(tunnel: string, tunnelIp: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_nhs", value: `${tunnel},${tunnelIp}` }]);
  }

  // ==========================================================================
  // Dynamic Map Operations (VyOS 1.4 only)
  // ==========================================================================

  async createDynamicMap(tunnel: string, network: string, nbmaDomainName?: string): Promise<VyOSResponse> {
    const ops: NhrpBatchOperation[] = [
      { op: "set_dynamic_map", value: `${tunnel},${network}` },
    ];
    if (nbmaDomainName) {
      ops.push({ op: "set_dynamic_map_nbma_domain", value: `${tunnel},${network},${nbmaDomainName}` });
    }
    return this.batch(ops);
  }

  async updateDynamicMap(
    tunnel: string,
    network: string,
    currentDomain: string | null,
    nextDomain: string | null
  ): Promise<VyOSResponse> {
    const ops: NhrpBatchOperation[] = [];
    const cur = currentDomain || "";
    const nxt = nextDomain || "";
    if (nxt !== cur) {
      if (nxt) {
        ops.push({ op: "set_dynamic_map_nbma_domain", value: `${tunnel},${network},${nxt}` });
      } else {
        ops.push({ op: "delete_dynamic_map_nbma_domain", value: `${tunnel},${network}` });
      }
    }
    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batch(ops);
  }

  async deleteDynamicMap(tunnel: string, network: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_dynamic_map", value: `${tunnel},${network}` }]);
  }

  // ==========================================================================
  // Shortcut Target Operations (VyOS 1.4 only)
  // ==========================================================================

  async createShortcutTarget(tunnel: string, target: string, holdingTime?: string): Promise<VyOSResponse> {
    const ops: NhrpBatchOperation[] = [
      { op: "set_shortcut_target", value: `${tunnel},${target}` },
    ];
    if (holdingTime) {
      ops.push({ op: "set_shortcut_target_holding_time", value: `${tunnel},${target},${holdingTime}` });
    }
    return this.batch(ops);
  }

  async updateShortcutTarget(
    tunnel: string,
    target: string,
    currentHoldingTime: string | null,
    nextHoldingTime: string | null
  ): Promise<VyOSResponse> {
    const ops: NhrpBatchOperation[] = [];
    const cur = currentHoldingTime || "";
    const nxt = nextHoldingTime || "";
    if (nxt !== cur) {
      if (nxt) {
        ops.push({ op: "set_shortcut_target_holding_time", value: `${tunnel},${target},${nxt}` });
      } else {
        ops.push({ op: "delete_shortcut_target_holding_time", value: `${tunnel},${target}` });
      }
    }
    if (ops.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }
    return this.batch(ops);
  }

  async deleteShortcutTarget(tunnel: string, target: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_shortcut_target", value: `${tunnel},${target}` }]);
  }

  // ==========================================================================
  // Multicast Operations
  // ==========================================================================

  async addMulticast(tunnel: string, value: string): Promise<VyOSResponse> {
    return this.batch([{ op: "set_multicast", value: `${tunnel},${value}` }]);
  }

  async deleteMulticast(tunnel: string, value: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_multicast", value: `${tunnel},${value}` }]);
  }
}

export const nhrpService = new NhrpService();
