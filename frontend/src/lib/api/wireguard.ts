import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface WireGuardPeer {
  name: string;
  public_key?: string | null;
  preshared_key?: string | null; // Will be "***" if set
  allowed_ips: string[];
  address?: string | null; // Endpoint IP address
  port?: string | null; // Endpoint port
  persistent_keepalive?: string | null;
  description?: string | null;
  disabled?: boolean;
  host_name?: string | null; // Endpoint hostname (alternative to address)
}

export interface WireGuardInterface {
  name: string;
  description?: string | null;
  addresses: string[];
  port?: string | null;
  private_key?: string | null; // Will be "***" if set
  mtu?: string | null;
  fwmark?: string | null;
  per_client_thread: boolean;
  disabled?: boolean;
  peers: WireGuardPeer[];
  peer_count: number;
}

export interface WireGuardConfigResponse {
  interfaces: WireGuardInterface[];
  total: number;
}

export interface WireGuardCapabilities {
  version: string;
  features: {
    wireguard: { supported: boolean; description: string };
    key_generation: { supported: boolean; description: string };
    per_client_thread: { supported: boolean; description: string };
  };
  version_notes: {
    full_support: boolean;
  };
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, any>;
  error?: string | null;
}

export interface WireGuardBatchOperation {
  op: string;
  value?: string;
}

export interface KeypairResult {
  private_key?: string | null;
  public_key?: string | null;
  raw_output?: string;
}

export interface PSKResult {
  preshared_key?: string;
}

export interface PeerStatus {
  public_key: string;
  latest_handshake: string | null;
  latest_handshake_seconds: number | null;
  transfer_rx: string | null;
  transfer_tx: string | null;
  transfer?: string;
  endpoint: string | null;
}

export interface InterfaceStatusResponse {
  interface: string;
  peers: Record<string, PeerStatus>;
  raw_output?: string;
}

// Connection status based on handshake time
export type ConnectionStatus = "connected" | "idle" | "never";

// Helper to determine connection status from handshake seconds
export function getConnectionStatus(handshakeSeconds: number | null): ConnectionStatus {
  if (handshakeSeconds === null) {
    return "never";
  }
  // Connected if handshake within last 3 minutes (180 seconds)
  if (handshakeSeconds <= 180) {
    return "connected";
  }
  return "idle";
}

// ============================================================================
// API Service
// ============================================================================

class WireGuardService {
  /**
   * Get WireGuard capabilities based on VyOS version
   */
  async getCapabilities(): Promise<WireGuardCapabilities> {
    return apiClient.get<WireGuardCapabilities>("/vyos/vpn/wireguard/capabilities");
  }

  /**
   * Get all WireGuard configurations
   */
  async getConfig(refresh: boolean = false): Promise<WireGuardConfigResponse> {
    return apiClient.get<WireGuardConfigResponse>("/vyos/vpn/wireguard/config", {
      refresh: refresh.toString(),
    });
  }

  /**
   * Refresh the cached configuration
   */
  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  // ==========================================================================
  // Interface Operations
  // ==========================================================================

  /**
   * Execute interface batch operations
   */
  async interfaceBatch(
    interfaceName: string,
    operations: WireGuardBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/vpn/wireguard/interface/batch", {
      interface: interfaceName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  /**
   * Create a new WireGuard interface
   */
  async createInterface(config: {
    name: string;
    description?: string;
    addresses?: string[];
    port?: string;
    private_key?: string;
    mtu?: string;
    per_client_thread?: boolean;
  }): Promise<VyOSResponse> {
    const operations: WireGuardBatchOperation[] = [];

    // Create the interface
    operations.push({ op: "create_interface" });

    // Set optional fields
    if (config.description) {
      operations.push({ op: "set_interface_description", value: config.description });
    }
    if (config.addresses) {
      for (const addr of config.addresses) {
        operations.push({ op: "set_interface_address", value: addr });
      }
    }
    if (config.port) {
      operations.push({ op: "set_interface_port", value: config.port });
    }
    if (config.private_key) {
      operations.push({ op: "set_interface_private_key", value: config.private_key });
    }
    if (config.mtu) {
      operations.push({ op: "set_interface_mtu", value: config.mtu });
    }
    if (config.per_client_thread) {
      operations.push({ op: "set_interface_per_client_thread" });
    }

    return this.interfaceBatch(config.name, operations);
  }

  /**
   * Update a WireGuard interface
   */
  async updateInterface(
    name: string,
    currentConfig: WireGuardInterface,
    newConfig: {
      description?: string | null;
      addresses?: string[];
      port?: string | null;
      private_key?: string | null;
      mtu?: string | null;
      per_client_thread?: boolean;
      disabled?: boolean;
    }
  ): Promise<VyOSResponse> {
    const operations: WireGuardBatchOperation[] = [];

    // Handle description
    if (newConfig.description !== undefined) {
      if (newConfig.description) {
        operations.push({ op: "set_interface_description", value: newConfig.description });
      } else if (currentConfig.description) {
        operations.push({ op: "delete_interface_description" });
      }
    }

    // Handle addresses (delete old, add new)
    if (newConfig.addresses !== undefined) {
      // Delete old addresses
      for (const addr of currentConfig.addresses) {
        operations.push({ op: "delete_interface_address", value: addr });
      }
      // Add new addresses
      for (const addr of newConfig.addresses) {
        operations.push({ op: "set_interface_address", value: addr });
      }
    }

    // Handle port
    if (newConfig.port !== undefined) {
      if (newConfig.port) {
        operations.push({ op: "set_interface_port", value: newConfig.port });
      } else if (currentConfig.port) {
        operations.push({ op: "delete_interface_port" });
      }
    }

    // Handle private key
    if (newConfig.private_key !== undefined && newConfig.private_key !== "***") {
      if (newConfig.private_key) {
        operations.push({ op: "set_interface_private_key", value: newConfig.private_key });
      } else {
        operations.push({ op: "delete_interface_private_key" });
      }
    }

    // Handle MTU
    if (newConfig.mtu !== undefined) {
      if (newConfig.mtu) {
        operations.push({ op: "set_interface_mtu", value: newConfig.mtu });
      } else if (currentConfig.mtu) {
        operations.push({ op: "delete_interface_mtu" });
      }
    }

    // Handle per_client_thread
    if (newConfig.per_client_thread !== undefined) {
      if (newConfig.per_client_thread && !currentConfig.per_client_thread) {
        operations.push({ op: "set_interface_per_client_thread" });
      } else if (!newConfig.per_client_thread && currentConfig.per_client_thread) {
        operations.push({ op: "delete_interface_per_client_thread" });
      }
    }

    // Handle disabled
    if (newConfig.disabled !== undefined) {
      if (newConfig.disabled && !currentConfig.disabled) {
        operations.push({ op: "set_interface_disable" });
      } else if (!newConfig.disabled && currentConfig.disabled) {
        operations.push({ op: "delete_interface_disable" });
      }
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.interfaceBatch(name, operations);
  }

  /**
   * Delete a WireGuard interface
   */
  async deleteInterface(name: string): Promise<VyOSResponse> {
    const operations: WireGuardBatchOperation[] = [{ op: "delete_interface" }];
    return this.interfaceBatch(name, operations);
  }

  // ==========================================================================
  // Peer Operations
  // ==========================================================================

  /**
   * Execute peer batch operations
   */
  async peerBatch(
    interfaceName: string,
    peerName: string,
    operations: WireGuardBatchOperation[]
  ): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/vpn/wireguard/peer/batch", {
      interface: interfaceName,
      peer: peerName,
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  /**
   * Create a new peer
   */
  async createPeer(
    interfaceName: string,
    config: {
      name: string;
      public_key: string;
      allowed_ips: string[];
      preshared_key?: string;
      address?: string;
      port?: string;
      persistent_keepalive?: string;
      description?: string;
      disabled?: boolean;
      host_name?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: WireGuardBatchOperation[] = [];

    // Create the peer
    operations.push({ op: "create_peer" });

    // Required: public key
    operations.push({ op: "set_peer_public_key", value: config.public_key });

    // Required: allowed IPs
    for (const ip of config.allowed_ips) {
      operations.push({ op: "set_peer_allowed_ips", value: ip });
    }

    // Optional fields
    if (config.preshared_key) {
      operations.push({ op: "set_peer_preshared_key", value: config.preshared_key });
    }
    if (config.address) {
      operations.push({ op: "set_peer_address", value: config.address });
    }
    if (config.port) {
      operations.push({ op: "set_peer_port", value: config.port });
    }
    if (config.persistent_keepalive) {
      operations.push({ op: "set_peer_persistent_keepalive", value: config.persistent_keepalive });
    }
    if (config.description) {
      operations.push({ op: "set_peer_description", value: config.description });
    }
    if (config.disabled) {
      operations.push({ op: "set_peer_disable" });
    }
    if (config.host_name) {
      operations.push({ op: "set_peer_host_name", value: config.host_name });
    }

    return this.peerBatch(interfaceName, config.name, operations);
  }

  /**
   * Update a peer
   */
  async updatePeer(
    interfaceName: string,
    peerName: string,
    currentConfig: WireGuardPeer,
    newConfig: {
      public_key?: string;
      allowed_ips?: string[];
      preshared_key?: string | null;
      address?: string | null;
      port?: string | null;
      persistent_keepalive?: string | null;
      description?: string | null;
      disabled?: boolean;
      host_name?: string | null;
    }
  ): Promise<VyOSResponse> {
    const operations: WireGuardBatchOperation[] = [];

    // Handle public key
    if (newConfig.public_key !== undefined && newConfig.public_key !== currentConfig.public_key) {
      operations.push({ op: "set_peer_public_key", value: newConfig.public_key });
    }

    // Handle allowed IPs (delete old, add new)
    if (newConfig.allowed_ips !== undefined) {
      // Delete all old allowed IPs
      operations.push({ op: "delete_all_peer_allowed_ips" });
      // Add new allowed IPs
      for (const ip of newConfig.allowed_ips) {
        operations.push({ op: "set_peer_allowed_ips", value: ip });
      }
    }

    // Handle preshared key
    if (newConfig.preshared_key !== undefined && newConfig.preshared_key !== "***") {
      if (newConfig.preshared_key) {
        operations.push({ op: "set_peer_preshared_key", value: newConfig.preshared_key });
      } else {
        operations.push({ op: "delete_peer_preshared_key" });
      }
    }

    // Handle address
    if (newConfig.address !== undefined) {
      if (newConfig.address) {
        operations.push({ op: "set_peer_address", value: newConfig.address });
      } else if (currentConfig.address) {
        operations.push({ op: "delete_peer_address" });
      }
    }

    // Handle port
    if (newConfig.port !== undefined) {
      if (newConfig.port) {
        operations.push({ op: "set_peer_port", value: newConfig.port });
      } else if (currentConfig.port) {
        operations.push({ op: "delete_peer_port" });
      }
    }

    // Handle persistent keepalive
    if (newConfig.persistent_keepalive !== undefined) {
      if (newConfig.persistent_keepalive) {
        operations.push({ op: "set_peer_persistent_keepalive", value: newConfig.persistent_keepalive });
      } else if (currentConfig.persistent_keepalive) {
        operations.push({ op: "delete_peer_persistent_keepalive" });
      }
    }

    // Handle description
    if (newConfig.description !== undefined) {
      if (newConfig.description) {
        operations.push({ op: "set_peer_description", value: newConfig.description });
      } else if (currentConfig.description) {
        operations.push({ op: "delete_peer_description" });
      }
    }

    // Handle disabled
    if (newConfig.disabled !== undefined) {
      if (newConfig.disabled && !currentConfig.disabled) {
        operations.push({ op: "set_peer_disable" });
      } else if (!newConfig.disabled && currentConfig.disabled) {
        operations.push({ op: "delete_peer_disable" });
      }
    }

    // Handle host_name
    if (newConfig.host_name !== undefined) {
      if (newConfig.host_name) {
        operations.push({ op: "set_peer_host_name", value: newConfig.host_name });
      } else if (currentConfig.host_name) {
        operations.push({ op: "delete_peer_host_name" });
      }
    }

    if (operations.length === 0) {
      return { success: true, data: { message: "No changes" } };
    }

    return this.peerBatch(interfaceName, peerName, operations);
  }

  /**
   * Delete a peer
   */
  async deletePeer(interfaceName: string, peerName: string): Promise<VyOSResponse> {
    const operations: WireGuardBatchOperation[] = [{ op: "delete_peer" }];
    return this.peerBatch(interfaceName, peerName, operations);
  }

  // ==========================================================================
  // Key Generation (uses pyvyos generate)
  // ==========================================================================

  /**
   * Generate a new WireGuard keypair
   */
  async generateKeypair(): Promise<KeypairResult> {
    const response = await apiClient.post<VyOSResponse>("/vyos/vpn/wireguard/generate-keypair", {});
    return response.data as KeypairResult;
  }

  /**
   * Generate a preshared key
   */
  async generatePSK(): Promise<PSKResult> {
    const response = await apiClient.post<VyOSResponse>("/vyos/vpn/wireguard/generate-psk", {});
    return response.data as PSKResult;
  }

  /**
   * Get the public key for a WireGuard interface
   */
  async getInterfacePublicKey(interfaceName: string): Promise<{ interface: string; public_key: string } | null> {
    try {
      const response = await apiClient.get<VyOSResponse>(
        `/vyos/vpn/wireguard/interface/${encodeURIComponent(interfaceName)}/public-key`
      );
      if (response.success && response.data) {
        return response.data as { interface: string; public_key: string };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get runtime status for a WireGuard interface (handshake times, transfer stats)
   */
  async getInterfaceStatus(interfaceName: string): Promise<InterfaceStatusResponse | null> {
    try {
      const response = await apiClient.get<VyOSResponse>(
        `/vyos/vpn/wireguard/interface/${encodeURIComponent(interfaceName)}/status`
      );
      if (response.success && response.data) {
        return response.data as InterfaceStatusResponse;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const wireguardService = new WireGuardService();
