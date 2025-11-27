import { apiClient } from "./client";

// IPsec encryption/hash proposal
export interface IPsecProposal {
  proposal_id: string;
  encryption?: string | null; // Encryption algorithm (e.g., aes256)
  hash?: string | null; // Hash algorithm (e.g., sha256)
  "dh-group"?: string | null; // Diffie-Hellman group
  prf?: string | null; // Pseudorandom function
}

// Dead peer detection configuration
export interface DeadPeerDetection {
  action?: string | null; // Action on dead peer (restart, clear, hold)
  interval?: string | null; // DPD interval in seconds
  timeout?: string | null; // DPD timeout in seconds
}

// IKE (Internet Key Exchange) group configuration
export interface IKEGroup {
  name: string;
  "key-exchange"?: string | null; // IKE version (ikev1, ikev2)
  lifetime?: string | null; // SA lifetime in seconds
  "dead-peer-detection"?: DeadPeerDetection | null;
  "ikev2-reauth"?: Record<string, any> | null;
  proposals: Record<string, IPsecProposal>;
}

// ESP (Encapsulating Security Payload) group configuration
export interface ESPGroup {
  name: string;
  lifetime?: string | null; // SA lifetime in seconds
  mode?: string | null; // ESP mode (tunnel, transport)
  pfs?: string | null; // Perfect Forward Secrecy DH group
  proposals: Record<string, IPsecProposal>;
}

// Virtual Tunnel Interface binding
export interface VTIBinding {
  bind?: string | null; // Interface to bind (e.g., 'dum31')
  "esp-group"?: string | null; // ESP group to use
}

// Site-to-site peer authentication
export interface PeerAuthentication {
  mode?: string | null; // Authentication mode (e.g., 'pre-shared-secret')
  "local-id"?: string | null;
  "remote-id"?: string | null;
}

// Site-to-site IPsec peer
export interface SiteToSitePeer {
  peer_id: string;
  description?: string | null;
  authentication?: PeerAuthentication | null;
  "connection-type"?: string | null; // Connection type (initiate, respond)
  "ike-group"?: string | null;
  "ikev2-reauth"?: string | null;
  "local-address"?: string | null;
  "remote-address"?: string | null;
  vti?: VTIBinding | null;
  tunnels?: Record<string, Record<string, any>> | null; // Legacy tunnel configurations
}

// Pre-Shared Key authentication
export interface PSKAuthentication {
  psk_id: string;
  ids: string[];
  secret?: string | null; // PSK secret (not exposed in read operations)
}

// Complete IPsec VPN configuration
export interface IPsecConfig {
  "ike-group": Record<string, IKEGroup>;
  "esp-group": Record<string, ESPGroup>;
  "site-to-site": Record<string, SiteToSitePeer>;
  psk_secrets: Record<string, PSKAuthentication>;
}

// Summary of an IPsec peer
export interface PeerSummary {
  peer_id: string;
  description?: string | null;
  local_address?: string | null;
  remote_address?: string | null;
  ike_group?: string | null;
  connection_type?: string | null;
  vti_interface?: string | null;
}

class IPsecService {
  /**
   * Get complete IPsec VPN configuration
   */
  async getConfig(): Promise<IPsecConfig> {
    return apiClient.get<IPsecConfig>("/vpn/ipsec/config");
  }

  /**
   * Get all IPsec site-to-site peers as a flat list
   */
  async getPeers(): Promise<PeerSummary[]> {
    return apiClient.get<PeerSummary[]>("/vpn/ipsec/peers");
  }
}

export const ipsecService = new IPsecService();
