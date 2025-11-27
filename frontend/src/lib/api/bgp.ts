import { apiClient } from "./client";

// BGP best path selection parameters
export interface BGPBestpath {
  as_path_multipath_relax?: boolean;
  "compare-routerid"?: boolean;
}

// BGP capabilities
export interface BGPCapability {
  "extended-nexthop"?: Record<string, any> | null;
}

// BGP parameters
export interface BGPParameters {
  "router-id"?: string | null;
  bestpath?: BGPBestpath | null;
}

// BGP route redistribution configuration
export interface BGPRedistribute {
  connected?: Record<string, any> | null;
  static?: Record<string, any> | null;
  ospf?: Record<string, any> | null;
}

// BGP address family configuration
export interface BGPAddressFamily {
  redistribute?: BGPRedistribute | null;
  network?: Record<string, any> | null;
  "route-map"?: Record<string, string> | null;
  "soft-reconfiguration"?: Record<string, any> | null;
}

// BGP interface-based neighbor
export interface BGPInterfaceNeighbor {
  interface: string;
  "peer-group"?: string | null;
  v6only?: boolean;
  "remote-as"?: string | null;
}

// BGP IP-based neighbor
export interface BGPIPNeighbor {
  address: string;
  "remote-as": string;
  "peer-group"?: string | null;
  description?: string | null;
  "update-source"?: string | null;
  "address-family"?: Record<string, BGPAddressFamily> | null;
}

// BGP peer group configuration
export interface BGPPeerGroup {
  name: string;
  "remote-as"?: string | null;
  "address-family"?: Record<string, BGPAddressFamily> | null;
  capability?: BGPCapability | null;
  description?: string | null;
}

// Complete BGP configuration
export interface BGPConfig {
  "system-as"?: string | null;
  router_id?: string | null;
  parameters?: BGPParameters | null;
  interface_neighbors: Record<string, BGPInterfaceNeighbor>;
  ip_neighbors: Record<string, BGPIPNeighbor>;
  peer_groups: Record<string, BGPPeerGroup>;
  "address-family"?: Record<string, BGPAddressFamily> | null;
}

// Summary of a BGP neighbor for display
export interface BGPNeighborSummary {
  neighbor: string; // Neighbor identifier (interface or IP)
  neighbor_type: string; // Type: 'interface' or 'ip'
  remote_as?: string | null;
  peer_group?: string | null;
  description?: string | null;
}

class BGPService {
  /**
   * Get complete BGP configuration
   */
  async getConfig(): Promise<BGPConfig> {
    return apiClient.get<BGPConfig>("/routing/bgp/config");
  }

  /**
   * Get all BGP neighbors as a flat list
   */
  async getNeighbors(): Promise<BGPNeighborSummary[]> {
    return apiClient.get<BGPNeighborSummary[]>("/routing/bgp/neighbors");
  }
}

export const bgpService = new BGPService();
