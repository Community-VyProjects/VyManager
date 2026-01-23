/**
 * SSH Service API
 * Handles all SSH service related API operations
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface AccessControlEntry {
  users: string[];
  groups: string[];
}

export interface AccessControl {
  allow: AccessControlEntry;
  deny: AccessControlEntry;
}

export interface DynamicProtection {
  enabled: boolean;
  allow_from: string[];
  block_time?: string;
  detect_time?: string;
  threshold?: string;
}

export interface SSHConfig {
  configured: boolean;
  port?: string;
  listen_addresses: string[];
  disable: boolean;
  access_control: AccessControl;
  disable_password_authentication: boolean;
  disable_host_validation: boolean;
  ciphers: string[];
  key_exchanges: string[];
  macs: string[];
  client_keepalive_interval?: string;
  loglevel?: string;
  dynamic_protection?: DynamicProtection;
  vrf?: string;
}

export interface SSHCapabilities {
  ciphers: { value: string; label: string; description: string }[];
  key_exchanges: { value: string; label: string; description: string }[];
  macs: { value: string; label: string; description: string }[];
  log_levels: { value: string; label: string; description: string }[];
  defaults: {
    port: number;
    client_keepalive_interval: number;
  };
  dynamic_protection_defaults: {
    block_time: number;
    detect_time: number;
    threshold: number;
  };
  version: string;
}

export interface SSHOperation {
  op: string;
  port?: string | number;
  address?: string;
  user?: string;
  group?: string;
  cipher?: string;
  kex?: string;
  mac?: string;
  value?: string | number;
  level?: string;
  network?: string;
  vrf?: string;
}

export interface SSHBatchRequest {
  operations: SSHOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class SSHService {
  /**
   * Get SSH configuration
   */
  async getConfig(): Promise<SSHConfig> {
    return apiClient.get<SSHConfig>("/vyos/ssh/config");
  }

  /**
   * Get SSH capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<SSHCapabilities> {
    return apiClient.get<SSHCapabilities>("/vyos/ssh/capabilities");
  }

  /**
   * Configure SSH using batch operations
   */
  async configureBatch(request: SSHBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/ssh/batch", request);
  }

  // =========================================================================
  // Basic Helper Methods
  // =========================================================================

  /**
   * Set SSH port
   */
  async setPort(port: number): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_port", port }],
    });
  }

  /**
   * Add a listen address
   */
  async addListenAddress(address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_listen_address", address }],
    });
  }

  /**
   * Remove a listen address
   */
  async removeListenAddress(address: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_listen_address", address }],
    });
  }

  /**
   * Enable SSH service
   */
  async enable(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "enable_ssh" }],
    });
  }

  /**
   * Disable SSH service
   */
  async disable(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "disable_ssh" }],
    });
  }

  // =========================================================================
  // Access Control Helper Methods
  // =========================================================================

  /**
   * Allow a user
   */
  async allowUser(user: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "allow_user", user }],
    });
  }

  /**
   * Deny a user
   */
  async denyUser(user: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "deny_user", user }],
    });
  }

  /**
   * Allow a group
   */
  async allowGroup(group: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "allow_group", group }],
    });
  }

  /**
   * Deny a group
   */
  async denyGroup(group: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "deny_group", group }],
    });
  }

  // =========================================================================
  // Authentication Helper Methods
  // =========================================================================

  /**
   * Disable password authentication (key-only)
   */
  async disablePasswordAuth(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "disable_password_auth" }],
    });
  }

  /**
   * Enable password authentication
   */
  async enablePasswordAuth(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "enable_password_auth" }],
    });
  }

  // =========================================================================
  // Cipher & MAC Helper Methods
  // =========================================================================

  /**
   * Add a cipher
   */
  async addCipher(cipher: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_cipher", cipher }],
    });
  }

  /**
   * Remove a cipher
   */
  async removeCipher(cipher: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_cipher", cipher }],
    });
  }

  /**
   * Add a key exchange algorithm
   */
  async addKeyExchange(kex: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_key_exchange", kex }],
    });
  }

  /**
   * Remove a key exchange algorithm
   */
  async removeKeyExchange(kex: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_key_exchange", kex }],
    });
  }

  /**
   * Add a MAC algorithm
   */
  async addMAC(mac: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_mac", mac }],
    });
  }

  /**
   * Remove a MAC algorithm
   */
  async removeMAC(mac: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_mac", mac }],
    });
  }

  // =========================================================================
  // Dynamic Protection Helper Methods
  // =========================================================================

  /**
   * Enable dynamic protection (brute force protection)
   */
  async enableDynamicProtection(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "enable_dynamic_protection" }],
    });
  }

  /**
   * Disable dynamic protection
   */
  async disableDynamicProtection(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "disable_dynamic_protection" }],
    });
  }

  /**
   * Configure dynamic protection
   */
  async configureDynamicProtection(options: {
    blockTime?: number;
    detectTime?: number;
    threshold?: number;
    allowFrom?: string[];
  }): Promise<VyOSResponse> {
    const operations: SSHOperation[] = [{ op: "enable_dynamic_protection" }];

    if (options.blockTime) {
      operations.push({ op: "set_dp_block_time", value: options.blockTime });
    }

    if (options.detectTime) {
      operations.push({ op: "set_dp_detect_time", value: options.detectTime });
    }

    if (options.threshold) {
      operations.push({ op: "set_dp_threshold", value: options.threshold });
    }

    if (options.allowFrom) {
      for (const network of options.allowFrom) {
        operations.push({ op: "add_dp_allow_from", network });
      }
    }

    return this.configureBatch({ operations });
  }

  // =========================================================================
  // Quick Setup Helper
  // =========================================================================

  /**
   * Quick setup for SSH service with security best practices
   */
  async quickSetup(config: {
    port?: number;
    listenAddresses?: string[];
    disablePasswordAuth?: boolean;
    enableDynamicProtection?: boolean;
    allowUsers?: string[];
    ciphers?: string[];
  }): Promise<VyOSResponse> {
    const operations: SSHOperation[] = [];

    // Set port
    if (config.port) {
      operations.push({ op: "set_port", port: config.port });
    }

    // Add listen addresses
    if (config.listenAddresses) {
      for (const address of config.listenAddresses) {
        operations.push({ op: "add_listen_address", address });
      }
    }

    // Disable password auth (key-only)
    if (config.disablePasswordAuth) {
      operations.push({ op: "disable_password_auth" });
    }

    // Enable dynamic protection
    if (config.enableDynamicProtection) {
      operations.push({ op: "enable_dynamic_protection" });
    }

    // Allow specific users
    if (config.allowUsers) {
      for (const user of config.allowUsers) {
        operations.push({ op: "allow_user", user });
      }
    }

    // Set ciphers
    if (config.ciphers) {
      for (const cipher of config.ciphers) {
        operations.push({ op: "add_cipher", cipher });
      }
    }

    return this.configureBatch({ operations });
  }
}

export const sshService = new SSHService();
