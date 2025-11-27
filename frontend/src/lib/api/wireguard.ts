import { apiClient } from "./client";

// WireGuard peer configuration
export interface WireGuardPeer {
  peer_id: string;
  address?: string | null; // Peer endpoint address
  "allowed-ips": string[]; // Allowed IP addresses/networks
  port?: string | null; // Peer port
  "public-key"?: string | null; // Peer public key
  "preshared-key"?: string | null; // Preshared key (hidden)
  "persistent-keepalive"?: string | null; // Keepalive interval
}

// WireGuard interface configuration
export interface WireGuardInterface {
  interface_name: string; // Interface name (e.g., wg01)
  address?: string[] | null; // Interface IP addresses
  description?: string | null;
  port?: string | null; // Listen port
  "private-key"?: string | null; // Private key (hidden)
  peers: Record<string, WireGuardPeer>; // Configured peers
}

// Complete WireGuard configuration
export interface WireGuardConfig {
  interfaces: Record<string, WireGuardInterface>;
}

// Summary of a WireGuard interface
export interface WireGuardInterfaceSummary {
  interface_name: string;
  description?: string | null;
  port?: string | null;
  peer_count: number; // Number of configured peers
  addresses: string[]; // Interface addresses
}

class WireGuardService {
  /**
   * Get complete WireGuard VPN configuration
   */
  async getConfig(): Promise<WireGuardConfig> {
    return apiClient.get<WireGuardConfig>("/vpn/wireguard/config");
  }

  /**
   * Get all WireGuard interfaces as a flat list
   */
  async getInterfaces(): Promise<WireGuardInterfaceSummary[]> {
    return apiClient.get<WireGuardInterfaceSummary[]>("/vpn/wireguard/interfaces");
  }
}

export const wireguardService = new WireGuardService();
