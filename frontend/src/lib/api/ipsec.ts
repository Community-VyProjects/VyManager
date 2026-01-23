/**
 * IPsec VPN API Service
 * Handles all IPsec VPN related API operations
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface IKEProposal {
  id: string;
  dh_group?: string;
  encryption?: string;
  hash?: string;
}

export interface DeadPeerDetection {
  action?: string;
  interval?: string;
  timeout?: string;
}

export interface IKEGroup {
  name: string;
  key_exchange?: string;
  lifetime?: string;
  proposals: IKEProposal[];
  dead_peer_detection?: DeadPeerDetection;
  close_action?: string;
  ikev2_reauth: boolean;
  mode?: string;
}

export interface ESPProposal {
  id: string;
  encryption?: string;
  hash?: string;
}

export interface ESPGroup {
  name: string;
  lifetime?: string;
  pfs?: string;
  mode: string;
  compression: boolean;
  proposals: ESPProposal[];
}

export interface PeerAuthentication {
  mode?: string;
  pre_shared_secret?: string;
  local_id?: string;
  remote_id?: string;
  x509?: {
    ca_certificate?: string;
    certificate?: string;
  };
}

export interface PeerTunnel {
  id: string;
  esp_group?: string;
  local_prefix?: string;
  remote_prefix?: string;
  protocol?: string;
  disable: boolean;
}

export interface PeerVTI {
  bind?: string;
  esp_group?: string;
}

export interface SiteToSitePeer {
  address: string;
  authentication?: PeerAuthentication;
  connection_type?: string;
  default_esp_group?: string;
  ike_group?: string;
  local_address?: string;
  description?: string;
  disable: boolean;
  dhcp_interface?: string;
  vti?: PeerVTI;
  tunnels: PeerTunnel[];
}

export interface IPsecOptions {
  disable_route_autoinstall: boolean;
  flexvpn: boolean;
  virtual_ips: string[];
}

export interface IPsecConfig {
  configured: boolean;
  ike_groups: IKEGroup[];
  esp_groups: ESPGroup[];
  peers: SiteToSitePeer[];
  interfaces: string[];
  options?: IPsecOptions;
}

export interface IPsecCapabilities {
  encryptions: { value: string; label: string; description: string }[];
  hashes: { value: string; label: string; description: string }[];
  dh_groups: { value: string; label: string; description: string }[];
  pfs_options: { value: string; label: string; description: string }[];
  key_exchanges: { value: string; label: string; description: string }[];
  connection_types: { value: string; label: string; description: string }[];
  dpd_actions: { value: string; label: string; description: string }[];
  auth_modes: { value: string; label: string; description: string }[];
  esp_modes: { value: string; label: string; description: string }[];
  default_lifetimes: { ike: number; esp: number };
  version: string;
}

export interface IPsecOperation {
  op: string;
  name?: string;
  value?: string | number;
  peer?: string;
  proposal?: string;
  tunnel?: string;
  interface?: string;
  dh_group?: string;
  encryption?: string;
  hash?: string;
  action?: string;
  interval?: number;
  timeout?: number;
  esp_group?: string;
  local_prefix?: string;
  remote_prefix?: string;
  protocol?: string;
  bind?: string;
}

export interface IPsecBatchRequest {
  operations: IPsecOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class IPsecService {
  /**
   * Get IPsec configuration
   */
  async getConfig(): Promise<IPsecConfig> {
    return apiClient.get<IPsecConfig>("/vyos/ipsec/config");
  }

  /**
   * Get IPsec capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<IPsecCapabilities> {
    return apiClient.get<IPsecCapabilities>("/vyos/ipsec/capabilities");
  }

  /**
   * Get IPsec tunnel status
   */
  async getStatus(): Promise<{ success: boolean; data: Record<string, unknown> }> {
    return apiClient.get("/vyos/ipsec/status");
  }

  /**
   * Get IPsec connections
   */
  async getConnections(): Promise<{ success: boolean; data: Record<string, unknown> }> {
    return apiClient.get("/vyos/ipsec/connections");
  }

  /**
   * Configure IPsec using batch operations
   */
  async configureBatch(request: IPsecBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/ipsec/batch", request);
  }

  // =========================================================================
  // IKE Group Helper Methods
  // =========================================================================

  /**
   * Create an IKE group
   */
  async createIKEGroup(
    name: string,
    options?: {
      keyExchange?: string;
      lifetime?: number;
      proposal?: {
        id: string;
        dhGroup?: string;
        encryption?: string;
        hash?: string;
      };
      dpd?: {
        action?: string;
        interval?: number;
        timeout?: number;
      };
    }
  ): Promise<VyOSResponse> {
    const operations: IPsecOperation[] = [{ op: "create_ike_group", name }];

    if (options?.keyExchange) {
      operations.push({ op: "set_ike_group_key_exchange", name, value: options.keyExchange });
    }

    if (options?.lifetime) {
      operations.push({ op: "set_ike_group_lifetime", name, value: options.lifetime });
    }

    if (options?.proposal) {
      operations.push({
        op: "add_ike_group_proposal",
        name,
        proposal: options.proposal.id,
        dh_group: options.proposal.dhGroup,
        encryption: options.proposal.encryption,
        hash: options.proposal.hash,
      });
    }

    if (options?.dpd) {
      operations.push({
        op: "set_ike_group_dpd",
        name,
        action: options.dpd.action,
        interval: options.dpd.interval,
        timeout: options.dpd.timeout,
      });
    }

    return this.configureBatch({ operations });
  }

  /**
   * Delete an IKE group
   */
  async deleteIKEGroup(name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_ike_group", name }],
    });
  }

  /**
   * Add a proposal to an IKE group
   */
  async addIKEProposal(
    groupName: string,
    proposalId: string,
    options: {
      dhGroup?: string;
      encryption?: string;
      hash?: string;
    }
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{
        op: "add_ike_group_proposal",
        name: groupName,
        proposal: proposalId,
        dh_group: options.dhGroup,
        encryption: options.encryption,
        hash: options.hash,
      }],
    });
  }

  // =========================================================================
  // ESP Group Helper Methods
  // =========================================================================

  /**
   * Create an ESP group
   */
  async createESPGroup(
    name: string,
    options?: {
      lifetime?: number;
      pfs?: string;
      mode?: string;
      proposal?: {
        id: string;
        encryption?: string;
        hash?: string;
      };
    }
  ): Promise<VyOSResponse> {
    const operations: IPsecOperation[] = [{ op: "create_esp_group", name }];

    if (options?.lifetime) {
      operations.push({ op: "set_esp_group_lifetime", name, value: options.lifetime });
    }

    if (options?.pfs) {
      operations.push({ op: "set_esp_group_pfs", name, value: options.pfs });
    }

    if (options?.mode) {
      operations.push({ op: "set_esp_group_mode", name, value: options.mode });
    }

    if (options?.proposal) {
      operations.push({
        op: "add_esp_group_proposal",
        name,
        proposal: options.proposal.id,
        encryption: options.proposal.encryption,
        hash: options.proposal.hash,
      });
    }

    return this.configureBatch({ operations });
  }

  /**
   * Delete an ESP group
   */
  async deleteESPGroup(name: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_esp_group", name }],
    });
  }

  /**
   * Add a proposal to an ESP group
   */
  async addESPProposal(
    groupName: string,
    proposalId: string,
    options: {
      encryption?: string;
      hash?: string;
    }
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{
        op: "add_esp_group_proposal",
        name: groupName,
        proposal: proposalId,
        encryption: options.encryption,
        hash: options.hash,
      }],
    });
  }

  // =========================================================================
  // Site-to-Site Peer Helper Methods
  // =========================================================================

  /**
   * Create a site-to-site peer
   */
  async createPeer(
    peerAddress: string,
    options: {
      ikeGroup: string;
      localAddress?: string;
      authMode?: string;
      preSharedKey?: string;
      localId?: string;
      remoteId?: string;
      connectionType?: string;
      defaultEspGroup?: string;
      description?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: IPsecOperation[] = [
      { op: "create_peer", peer: peerAddress },
      { op: "set_peer_ike_group", peer: peerAddress, value: options.ikeGroup },
    ];

    if (options.localAddress) {
      operations.push({ op: "set_peer_local_address", peer: peerAddress, value: options.localAddress });
    }

    if (options.authMode) {
      operations.push({ op: "set_peer_auth_mode", peer: peerAddress, value: options.authMode });
    }

    if (options.preSharedKey) {
      operations.push({ op: "set_peer_auth_psk", peer: peerAddress, value: options.preSharedKey });
    }

    if (options.localId) {
      operations.push({ op: "set_peer_auth_local_id", peer: peerAddress, value: options.localId });
    }

    if (options.remoteId) {
      operations.push({ op: "set_peer_auth_remote_id", peer: peerAddress, value: options.remoteId });
    }

    if (options.connectionType) {
      operations.push({ op: "set_peer_connection_type", peer: peerAddress, value: options.connectionType });
    }

    if (options.defaultEspGroup) {
      operations.push({ op: "set_peer_default_esp_group", peer: peerAddress, value: options.defaultEspGroup });
    }

    if (options.description) {
      operations.push({ op: "set_peer_description", peer: peerAddress, value: options.description });
    }

    return this.configureBatch({ operations });
  }

  /**
   * Delete a site-to-site peer
   */
  async deletePeer(peerAddress: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_peer", peer: peerAddress }],
    });
  }

  /**
   * Add a tunnel to a peer
   */
  async addPeerTunnel(
    peerAddress: string,
    tunnelId: string,
    options: {
      espGroup?: string;
      localPrefix?: string;
      remotePrefix?: string;
      protocol?: string;
    }
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{
        op: "add_peer_tunnel",
        peer: peerAddress,
        tunnel: tunnelId,
        esp_group: options.espGroup,
        local_prefix: options.localPrefix,
        remote_prefix: options.remotePrefix,
        protocol: options.protocol,
      }],
    });
  }

  /**
   * Delete a tunnel from a peer
   */
  async deletePeerTunnel(peerAddress: string, tunnelId: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_peer_tunnel", peer: peerAddress, tunnel: tunnelId }],
    });
  }

  /**
   * Disable a peer
   */
  async disablePeer(peerAddress: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "disable_peer", peer: peerAddress }],
    });
  }

  /**
   * Enable a peer
   */
  async enablePeer(peerAddress: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "enable_peer", peer: peerAddress }],
    });
  }

  /**
   * Configure VTI for a peer
   */
  async configurePeerVTI(
    peerAddress: string,
    vtiInterface: string,
    espGroup?: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{
        op: "set_peer_vti",
        peer: peerAddress,
        bind: vtiInterface,
        esp_group: espGroup,
      }],
    });
  }

  // =========================================================================
  // Interface Helper Methods
  // =========================================================================

  /**
   * Add an IPsec interface
   */
  async addInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_ipsec_interface", interface: interfaceName }],
    });
  }

  /**
   * Remove an IPsec interface
   */
  async removeInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_ipsec_interface", interface: interfaceName }],
    });
  }

  // =========================================================================
  // Quick Setup Helper
  // =========================================================================

  /**
   * Quick setup for a basic site-to-site VPN
   */
  async quickSetupSiteToSite(config: {
    peerAddress: string;
    localAddress: string;
    preSharedKey: string;
    localNetwork: string;
    remoteNetwork: string;
    ikeGroupName?: string;
    espGroupName?: string;
  }): Promise<VyOSResponse> {
    const ikeGroup = config.ikeGroupName || "IKE-DEFAULT";
    const espGroup = config.espGroupName || "ESP-DEFAULT";

    const operations: IPsecOperation[] = [
      // Create IKE group with modern defaults
      { op: "create_ike_group", name: ikeGroup },
      { op: "set_ike_group_key_exchange", name: ikeGroup, value: "ikev2" },
      { op: "set_ike_group_lifetime", name: ikeGroup, value: 28800 },
      {
        op: "add_ike_group_proposal",
        name: ikeGroup,
        proposal: "1",
        dh_group: "14",
        encryption: "aes256",
        hash: "sha256",
      },
      {
        op: "set_ike_group_dpd",
        name: ikeGroup,
        action: "restart",
        interval: 30,
        timeout: 120,
      },

      // Create ESP group
      { op: "create_esp_group", name: espGroup },
      { op: "set_esp_group_lifetime", name: espGroup, value: 3600 },
      { op: "set_esp_group_pfs", name: espGroup, value: "dh-group14" },
      {
        op: "add_esp_group_proposal",
        name: espGroup,
        proposal: "1",
        encryption: "aes256",
        hash: "sha256",
      },

      // Create peer
      { op: "create_peer", peer: config.peerAddress },
      { op: "set_peer_ike_group", peer: config.peerAddress, value: ikeGroup },
      { op: "set_peer_local_address", peer: config.peerAddress, value: config.localAddress },
      { op: "set_peer_auth_mode", peer: config.peerAddress, value: "pre-shared-secret" },
      { op: "set_peer_auth_psk", peer: config.peerAddress, value: config.preSharedKey },
      { op: "set_peer_connection_type", peer: config.peerAddress, value: "initiate" },

      // Add tunnel
      {
        op: "add_peer_tunnel",
        peer: config.peerAddress,
        tunnel: "1",
        esp_group: espGroup,
        local_prefix: config.localNetwork,
        remote_prefix: config.remoteNetwork,
      },
    ];

    return this.configureBatch({ operations });
  }
}

export const ipsecService = new IPsecService();
