/**
 * OpenVPN API Service
 * Handles all OpenVPN related API operations
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface OpenVPNClient {
  name: string;
  ip?: string;
  subnet?: string;
  disable: boolean;
}

export interface OpenVPNServer {
  subnet?: string;
  clients: OpenVPNClient[];
  name_servers: string[];
  domain_name?: string;
  push_routes: string[];
  max_connections?: string;
  topology?: string;
  redirect_gateway: boolean;
  mfa_totp: boolean;
}

export interface OpenVPNTLS {
  ca_certificate?: string;
  certificate?: string;
  dh_params?: string;
  crl_file?: string;
  auth_key?: string;
  crypt_key?: string;
  role?: string;
}

export interface OpenVPNAuth {
  username?: string;
  password: boolean;
}

export interface OpenVPNKeepAlive {
  failure_count?: string;
  interval?: string;
}

export interface OpenVPNInterface {
  name: string;
  mode?: string;
  description?: string;
  disable: boolean;
  protocol?: string;
  device_type?: string;
  local_address?: string;
  remote_address?: string;
  local_host?: string;
  local_port?: string;
  remote_hosts: string[];
  remote_port?: string;
  encryption?: string;
  hash?: string;
  shared_secret_key?: string;
  server?: OpenVPNServer;
  tls?: OpenVPNTLS;
  authentication?: OpenVPNAuth;
  keep_alive?: OpenVPNKeepAlive;
  persistent_tunnel: boolean;
  replace_default_route: boolean;
  openvpn_options: string[];
  mtu?: string;
}

export interface OpenVPNConfig {
  configured: boolean;
  interfaces: OpenVPNInterface[];
  total: number;
  by_mode: Record<string, number>;
}

export interface OpenVPNCapabilities {
  modes: { value: string; label: string; description: string }[];
  protocols: { value: string; label: string; description: string }[];
  device_types: { value: string; label: string; description: string }[];
  encryptions: { value: string; label: string; description: string }[];
  hashes: { value: string; label: string; description: string }[];
  topologies: { value: string; label: string; description: string }[];
  tls_roles: { value: string; label: string; description: string }[];
  default_port: number;
  version: string;
}

export interface OpenVPNOperation {
  op: string;
  value?: string | number;
  client?: string;
  ip?: string;
  subnet?: string;
  interval?: number;
  failure?: number;
}

export interface OpenVPNBatchRequest {
  interface: string;
  operations: OpenVPNOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class OpenVPNService {
  /**
   * Get OpenVPN configuration
   */
  async getConfig(): Promise<OpenVPNConfig> {
    return apiClient.get<OpenVPNConfig>("/vyos/openvpn/config");
  }

  /**
   * Get OpenVPN capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<OpenVPNCapabilities> {
    return apiClient.get<OpenVPNCapabilities>("/vyos/openvpn/capabilities");
  }

  /**
   * Get OpenVPN status
   */
  async getStatus(): Promise<{ success: boolean; data: Record<string, unknown> }> {
    return apiClient.get("/vyos/openvpn/status");
  }

  /**
   * Get interface status
   */
  async getInterfaceStatus(interfaceName: string): Promise<{ success: boolean; interface: string; data: Record<string, unknown> }> {
    const encodedName = encodeURIComponent(interfaceName);
    return apiClient.get("/vyos/openvpn/interfaces/" + encodedName + "/status");
  }

  /**
   * Configure OpenVPN using batch operations
   */
  async configureBatch(request: OpenVPNBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/openvpn/batch", request);
  }

  // =========================================================================
  // Server Mode Helper Methods
  // =========================================================================

  /**
   * Create an OpenVPN server
   */
  async createServer(
    interfaceName: string,
    subnet: string,
    options?: {
      port?: number;
      protocol?: string;
      encryption?: string;
      hash?: string;
      topology?: string;
      caCertificate?: string;
      certificate?: string;
      dhParams?: string;
      description?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: OpenVPNOperation[] = [
      { op: "create" },
      { op: "set_mode", value: "server" },
      { op: "set_server_subnet", value: subnet },
    ];

    if (options?.port) {
      operations.push({ op: "set_local_port", value: options.port });
    }

    if (options?.protocol) {
      operations.push({ op: "set_protocol", value: options.protocol });
    }

    if (options?.encryption) {
      operations.push({ op: "set_encryption", value: options.encryption });
    }

    if (options?.hash) {
      operations.push({ op: "set_hash", value: options.hash });
    }

    if (options?.topology) {
      operations.push({ op: "set_topology", value: options.topology });
    }

    if (options?.caCertificate) {
      operations.push({ op: "set_tls_ca_certificate", value: options.caCertificate });
    }

    if (options?.certificate) {
      operations.push({ op: "set_tls_certificate", value: options.certificate });
    }

    if (options?.dhParams) {
      operations.push({ op: "set_tls_dh_params", value: options.dhParams });
    }

    if (options?.description) {
      operations.push({ op: "set_description", value: options.description });
    }

    return this.configureBatch({ interface: interfaceName, operations });
  }

  /**
   * Add a client to the server
   */
  async addServerClient(
    interfaceName: string,
    clientName: string,
    options?: {
      ip?: string;
      subnet?: string;
    }
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: interfaceName,
      operations: [{
        op: "add_server_client",
        client: clientName,
        ip: options?.ip,
        subnet: options?.subnet,
      }],
    });
  }

  /**
   * Remove a client from the server
   */
  async removeServerClient(interfaceName: string, clientName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: interfaceName,
      operations: [{ op: "delete_server_client", client: clientName }],
    });
  }

  /**
   * Add a push route
   */
  async addPushRoute(interfaceName: string, route: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: interfaceName,
      operations: [{ op: "add_push_route", value: route }],
    });
  }

  /**
   * Remove a push route
   */
  async removePushRoute(interfaceName: string, route: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: interfaceName,
      operations: [{ op: "delete_push_route", value: route }],
    });
  }

  /**
   * Add a DNS server to push to clients
   */
  async addNameServer(interfaceName: string, nameServer: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: interfaceName,
      operations: [{ op: "add_name_server", value: nameServer }],
    });
  }

  // =========================================================================
  // Site-to-Site Helper Methods
  // =========================================================================

  /**
   * Create a site-to-site OpenVPN tunnel
   */
  async createSiteToSite(
    interfaceName: string,
    options: {
      localAddress: string;
      remoteAddress: string;
      remoteHost: string;
      sharedSecretKey?: string;
      port?: number;
      protocol?: string;
      description?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: OpenVPNOperation[] = [
      { op: "create" },
      { op: "set_mode", value: "site-to-site" },
      { op: "set_local_address", value: options.localAddress },
      { op: "set_remote_address", value: options.remoteAddress },
      { op: "set_remote_host", value: options.remoteHost },
    ];

    if (options.sharedSecretKey) {
      operations.push({ op: "set_shared_secret_key", value: options.sharedSecretKey });
    }

    if (options.port) {
      operations.push({ op: "set_remote_port", value: options.port });
    }

    if (options.protocol) {
      operations.push({ op: "set_protocol", value: options.protocol });
    }

    if (options.description) {
      operations.push({ op: "set_description", value: options.description });
    }

    return this.configureBatch({ interface: interfaceName, operations });
  }

  // =========================================================================
  // Client Mode Helper Methods
  // =========================================================================

  /**
   * Create an OpenVPN client
   */
  async createClient(
    interfaceName: string,
    remoteHost: string,
    options?: {
      port?: number;
      protocol?: string;
      caCertificate?: string;
      certificate?: string;
      username?: string;
      password?: string;
      description?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: OpenVPNOperation[] = [
      { op: "create" },
      { op: "set_mode", value: "client" },
      { op: "set_remote_host", value: remoteHost },
    ];

    if (options?.port) {
      operations.push({ op: "set_remote_port", value: options.port });
    }

    if (options?.protocol) {
      operations.push({ op: "set_protocol", value: options.protocol });
    }

    if (options?.caCertificate) {
      operations.push({ op: "set_tls_ca_certificate", value: options.caCertificate });
    }

    if (options?.certificate) {
      operations.push({ op: "set_tls_certificate", value: options.certificate });
    }

    if (options?.username) {
      operations.push({ op: "set_auth_username", value: options.username });
    }

    if (options?.password) {
      operations.push({ op: "set_auth_password", value: options.password });
    }

    if (options?.description) {
      operations.push({ op: "set_description", value: options.description });
    }

    return this.configureBatch({ interface: interfaceName, operations });
  }

  // =========================================================================
  // Common Helper Methods
  // =========================================================================

  /**
   * Delete an OpenVPN interface
   */
  async deleteInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: interfaceName,
      operations: [{ op: "delete" }],
    });
  }

  /**
   * Disable an OpenVPN interface
   */
  async disableInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: interfaceName,
      operations: [{ op: "disable" }],
    });
  }

  /**
   * Enable an OpenVPN interface
   */
  async enableInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: interfaceName,
      operations: [{ op: "enable" }],
    });
  }

  /**
   * Set encryption cipher
   */
  async setEncryption(interfaceName: string, cipher: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: interfaceName,
      operations: [{ op: "set_encryption", value: cipher }],
    });
  }

  /**
   * Set hash algorithm
   */
  async setHash(interfaceName: string, hash: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: interfaceName,
      operations: [{ op: "set_hash", value: hash }],
    });
  }

  /**
   * Configure TLS certificates
   */
  async configureTLS(
    interfaceName: string,
    options: {
      caCertificate?: string;
      certificate?: string;
      dhParams?: string;
      authKey?: string;
      cryptKey?: string;
      role?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: OpenVPNOperation[] = [];

    if (options.caCertificate) {
      operations.push({ op: "set_tls_ca_certificate", value: options.caCertificate });
    }

    if (options.certificate) {
      operations.push({ op: "set_tls_certificate", value: options.certificate });
    }

    if (options.dhParams) {
      operations.push({ op: "set_tls_dh_params", value: options.dhParams });
    }

    if (options.authKey) {
      operations.push({ op: "set_tls_auth_key", value: options.authKey });
    }

    if (options.cryptKey) {
      operations.push({ op: "set_tls_crypt_key", value: options.cryptKey });
    }

    if (options.role) {
      operations.push({ op: "set_tls_role", value: options.role });
    }

    return this.configureBatch({ interface: interfaceName, operations });
  }

  /**
   * Set keepalive parameters
   */
  async setKeepAlive(interfaceName: string, interval: number, failure: number): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: interfaceName,
      operations: [{ op: "set_keep_alive", interval, failure }],
    });
  }

  /**
   * Enable persistent tunnel
   */
  async enablePersistentTunnel(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: interfaceName,
      operations: [{ op: "enable_persistent_tunnel" }],
    });
  }

  /**
   * Disable persistent tunnel
   */
  async disablePersistentTunnel(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      interface: interfaceName,
      operations: [{ op: "disable_persistent_tunnel" }],
    });
  }
}

export const openvpnService = new OpenVPNService();
