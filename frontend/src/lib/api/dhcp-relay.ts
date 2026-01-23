/**
 * DHCP Relay Service API
 * Handles all DHCP relay related API operations (DHCPv4 and DHCPv6)
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface RelayOptions {
  hop_count?: string;
  max_size?: string;
  relay_agents_packets?: string;
}

export interface DHCPRelayConfig {
  configured: boolean;
  servers: string[];
  interfaces: string[];
  listen_interfaces: string[];
  upstream_interfaces: string[];
  relay_options?: RelayOptions;
}

export interface DHCPv6InterfaceEntry {
  interface: string;
  address?: string;
}

export interface DHCPv6RelayConfig {
  configured: boolean;
  listen_interfaces: DHCPv6InterfaceEntry[];
  upstream_interfaces: DHCPv6InterfaceEntry[];
  max_hop_count?: string;
  use_interface_id_option: boolean;
}

export interface DHCPRelayFullConfig {
  dhcp_relay: DHCPRelayConfig;
  dhcpv6_relay: DHCPv6RelayConfig;
}

export interface DHCPRelayCapabilities {
  relay_agents_packets_options: { value: string; label: string; description: string }[];
  defaults: {
    hop_count: number;
    max_size: number;
    dhcpv6_max_hop_count: number;
  };
  limits: {
    hop_count_max: number;
    max_size_max: number;
    dhcpv6_max_hop_count_max: number;
  };
  version: string;
}

export interface DHCPRelayOperation {
  op: string;
  server?: string;
  interface?: string;
  value?: string | number;
  action?: string;
  address?: string;
}

export interface DHCPRelayBatchRequest {
  operations: DHCPRelayOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class DHCPRelayService {
  /**
   * Get DHCP relay configuration (both v4 and v6)
   */
  async getConfig(): Promise<DHCPRelayFullConfig> {
    return apiClient.get<DHCPRelayFullConfig>("/vyos/dhcp-relay/config");
  }

  /**
   * Get DHCP relay capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<DHCPRelayCapabilities> {
    return apiClient.get<DHCPRelayCapabilities>("/vyos/dhcp-relay/capabilities");
  }

  /**
   * Configure DHCP relay using batch operations
   */
  async configureBatch(request: DHCPRelayBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/dhcp-relay/batch", request);
  }

  // =========================================================================
  // DHCPv4 Relay Helper Methods
  // =========================================================================

  /**
   * Add a DHCP server
   */
  async addServer(server: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_server", server }],
    });
  }

  /**
   * Remove a DHCP server
   */
  async removeServer(server: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_server", server }],
    });
  }

  /**
   * Add a relay interface
   */
  async addInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_interface", interface: interfaceName }],
    });
  }

  /**
   * Remove a relay interface
   */
  async removeInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_interface", interface: interfaceName }],
    });
  }

  /**
   * Add a listen interface
   */
  async addListenInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_listen_interface", interface: interfaceName }],
    });
  }

  /**
   * Remove a listen interface
   */
  async removeListenInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_listen_interface", interface: interfaceName }],
    });
  }

  /**
   * Add an upstream interface
   */
  async addUpstreamInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_upstream_interface", interface: interfaceName }],
    });
  }

  /**
   * Remove an upstream interface
   */
  async removeUpstreamInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_upstream_interface", interface: interfaceName }],
    });
  }

  /**
   * Set hop count limit
   */
  async setHopCount(value: number): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_hop_count", value }],
    });
  }

  /**
   * Set max packet size
   */
  async setMaxSize(value: number): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_max_size", value }],
    });
  }

  /**
   * Set relay agents packets handling
   */
  async setRelayAgentsPackets(action: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_relay_agents_packets", action }],
    });
  }

  /**
   * Delete entire DHCP relay configuration
   */
  async deleteDHCPRelay(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_dhcp_relay" }],
    });
  }

  // =========================================================================
  // DHCPv6 Relay Helper Methods
  // =========================================================================

  /**
   * Add a DHCPv6 listen interface
   */
  async addV6ListenInterface(interfaceName: string, address?: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_v6_listen_interface", interface: interfaceName, address }],
    });
  }

  /**
   * Remove a DHCPv6 listen interface
   */
  async removeV6ListenInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_v6_listen_interface", interface: interfaceName }],
    });
  }

  /**
   * Add a DHCPv6 upstream interface
   */
  async addV6UpstreamInterface(interfaceName: string, address?: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_v6_upstream_interface", interface: interfaceName, address }],
    });
  }

  /**
   * Remove a DHCPv6 upstream interface
   */
  async removeV6UpstreamInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_v6_upstream_interface", interface: interfaceName }],
    });
  }

  /**
   * Set DHCPv6 max hop count
   */
  async setV6MaxHopCount(value: number): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_v6_max_hop_count", value }],
    });
  }

  /**
   * Enable use-interface-id-option
   */
  async enableV6InterfaceIdOption(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "enable_v6_interface_id_option" }],
    });
  }

  /**
   * Disable use-interface-id-option
   */
  async disableV6InterfaceIdOption(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "disable_v6_interface_id_option" }],
    });
  }

  /**
   * Delete entire DHCPv6 relay configuration
   */
  async deleteDHCPv6Relay(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_dhcpv6_relay" }],
    });
  }

  // =========================================================================
  // Quick Setup Helper
  // =========================================================================

  /**
   * Quick setup for DHCP relay
   */
  async quickSetup(config: {
    servers: string[];
    interfaces: string[];
    hopCount?: number;
    maxSize?: number;
  }): Promise<VyOSResponse> {
    const operations: DHCPRelayOperation[] = [];

    // Add servers
    for (const server of config.servers) {
      operations.push({ op: "add_server", server });
    }

    // Add interfaces
    for (const iface of config.interfaces) {
      operations.push({ op: "add_interface", interface: iface });
    }

    // Set hop count
    if (config.hopCount) {
      operations.push({ op: "set_hop_count", value: config.hopCount });
    }

    // Set max size
    if (config.maxSize) {
      operations.push({ op: "set_max_size", value: config.maxSize });
    }

    return this.configureBatch({ operations });
  }
}

export const dhcpRelayService = new DHCPRelayService();
