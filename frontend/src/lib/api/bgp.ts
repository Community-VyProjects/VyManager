/**
 * BGP Protocol API Service
 * Handles all BGP (Border Gateway Protocol) related API operations
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface BGPTimers {
  holdtime?: string;
  keepalive?: string;
}

export interface BGPBFD {
  enabled: boolean;
  check_control_plane_failure: boolean;
}

export interface BGPNeighbor {
  address: string;
  remote_as?: string;
  description?: string;
  shutdown: boolean;
  update_source?: string;
  ebgp_multihop?: string;
  password?: string;
  passive: boolean;
  disable_connected_check: boolean;
  peer_group?: string;
  timers?: BGPTimers;
  bfd?: BGPBFD;
}

export interface BGPPeerGroup {
  name: string;
  remote_as?: string;
  description?: string;
  update_source?: string;
  ebgp_multihop?: string;
  passive: boolean;
}

export interface BGPNetwork {
  prefix: string;
  route_map?: string;
}

export interface BGPRedistribution {
  protocol: string;
  route_map?: string;
  metric?: string;
}

export interface BGPAggregate {
  prefix: string;
  summary_only: boolean;
  as_set: boolean;
}

export interface BGPAddressFamilyNeighbor {
  address: string;
  route_map_import?: string;
  route_map_export?: string;
  prefix_list_import?: string;
  prefix_list_export?: string;
  soft_reconfiguration_inbound: boolean;
  maximum_prefix?: string;
  default_originate: boolean;
  route_reflector_client: boolean;
  next_hop_self: boolean;
  remove_private_as: boolean;
  as_override: boolean;
}

export interface BGPAddressFamily {
  networks: BGPNetwork[];
  redistributions: BGPRedistribution[];
  aggregates: BGPAggregate[];
  neighbors: BGPAddressFamilyNeighbor[];
}

export interface BGPConfig {
  configured: boolean;
  asn?: string;
  router_id?: string;
  log_neighbor_changes: boolean;
  no_fast_external_failover: boolean;
  neighbors: BGPNeighbor[];
  peer_groups: BGPPeerGroup[];
  address_families: Record<string, BGPAddressFamily>;
}

export interface BGPCapabilities {
  address_families: { value: string; label: string; description: string }[];
  redistribute_protocols: { value: string; label: string; description: string }[];
  default_timers: { holdtime: number; keepalive: number };
  ebgp_multihop_max: number;
  version: string;
}

export interface BGPOperation {
  op: string;
  value?: string | number;
  neighbor?: string;
  remote_as?: string;
  family?: string;
  network?: string;
  protocol?: string;
  group?: string;
  holdtime?: number;
  keepalive?: number;
  route_map?: string;
  metric?: number;
  prefix?: string;
  summary_only?: boolean;
  as_set?: boolean;
}

export interface BGPBatchRequest {
  asn: string;
  operations: BGPOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// BGP Status Types (Real-time Monitoring)
// ============================================================================

export interface BGPNeighborStatus {
  neighbor: string;
  remote_as: string;
  msg_rcvd: number;
  msg_sent: number;
  up_down: string;
  state: string; // Established, Active, Idle, Connect, OpenSent, OpenConfirm
  pfx_rcvd: number;
  description?: string;
}

export interface BGPStatusResponse {
  local_as?: string;
  router_id?: string;
  total_neighbors: number;
  established_count: number;
  neighbors: BGPNeighborStatus[];
  raw_output?: string;
}

export interface BGPRoute {
  network: string;
  next_hop: string;
  metric?: string;
  local_pref?: string;
  weight?: string;
  as_path: string;
  origin: string; // i=IGP, e=EGP, ?=incomplete
  best: boolean;
  valid: boolean;
}

export interface BGPRoutesResponse {
  total_routes: number;
  best_routes: number;
  routes: BGPRoute[];
  raw_output?: string;
}

// ============================================================================
// Service
// ============================================================================

class BGPService {
  /**
   * Get BGP configuration
   */
  async getConfig(): Promise<BGPConfig> {
    return apiClient.get<BGPConfig>("/vyos/bgp/config");
  }

  /**
   * Get BGP capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<BGPCapabilities> {
    return apiClient.get<BGPCapabilities>("/vyos/bgp/capabilities");
  }

  /**
   * Get BGP summary (neighbor states)
   */
  async getSummary(): Promise<{ success: boolean; data: Record<string, unknown> }> {
    return apiClient.get("/vyos/bgp/summary");
  }

  /**
   * Get routes from a specific neighbor
   */
  async getNeighborRoutes(neighbor: string): Promise<{ success: boolean; neighbor: string; data: Record<string, unknown> }> {
    return apiClient.get(`/vyos/bgp/neighbors/${encodeURIComponent(neighbor)}/routes`);
  }

  /**
   * Get parsed BGP neighbor status for real-time monitoring
   * Returns structured data with neighbor states, message counters, uptime, and prefix counts
   */
  async getStatus(): Promise<BGPStatusResponse> {
    return apiClient.get<BGPStatusResponse>("/vyos/bgp/status");
  }

  /**
   * Get parsed BGP routing table
   * Returns structured routes with network prefixes, next hops, AS paths, and best path indicators
   * @param family - Address family: 'ipv4' or 'ipv6' (default: 'ipv4')
   */
  async getRoutes(family: "ipv4" | "ipv6" = "ipv4"): Promise<BGPRoutesResponse> {
    return apiClient.get<BGPRoutesResponse>(`/vyos/bgp/routes?family=${family}`);
  }

  /**
   * Configure BGP using batch operations
   */
  async configureBatch(request: BGPBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/bgp/batch", request);
  }

  // =========================================================================
  // Helper methods for common operations
  // =========================================================================

  /**
   * Initialize BGP with ASN and router ID
   */
  async initializeBGP(
    asn: string,
    options: {
      routerId?: string;
      logNeighborChanges?: boolean;
    }
  ): Promise<VyOSResponse> {
    const operations: BGPOperation[] = [];

    if (options.routerId) {
      operations.push({ op: "set_router_id", value: options.routerId });
    }

    if (options.logNeighborChanges) {
      operations.push({ op: "enable_log_neighbor_changes" });
    }

    return this.configureBatch({ asn, operations });
  }

  /**
   * Add a BGP neighbor
   */
  async addNeighbor(
    asn: string,
    neighbor: string,
    remoteAs: string,
    options?: {
      description?: string;
      updateSource?: string;
      ebgpMultihop?: number;
      password?: string;
      peerGroup?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: BGPOperation[] = [
      { op: "add_neighbor", neighbor, remote_as: remoteAs },
    ];

    if (options?.description) {
      operations.push({ op: "set_neighbor_description", neighbor, value: options.description });
    }

    if (options?.updateSource) {
      operations.push({ op: "set_neighbor_update_source", neighbor, value: options.updateSource });
    }

    if (options?.ebgpMultihop) {
      operations.push({ op: "set_neighbor_ebgp_multihop", neighbor, value: options.ebgpMultihop });
    }

    if (options?.password) {
      operations.push({ op: "set_neighbor_password", neighbor, value: options.password });
    }

    if (options?.peerGroup) {
      operations.push({ op: "set_neighbor_peer_group", neighbor, value: options.peerGroup });
    }

    return this.configureBatch({ asn, operations });
  }

  /**
   * Remove a BGP neighbor
   */
  async removeNeighbor(asn: string, neighbor: string): Promise<VyOSResponse> {
    return this.configureBatch({
      asn,
      operations: [{ op: "delete_neighbor", neighbor }],
    });
  }

  /**
   * Shutdown a BGP neighbor
   */
  async shutdownNeighbor(asn: string, neighbor: string): Promise<VyOSResponse> {
    return this.configureBatch({
      asn,
      operations: [{ op: "shutdown_neighbor", neighbor }],
    });
  }

  /**
   * Enable a BGP neighbor
   */
  async enableNeighbor(asn: string, neighbor: string): Promise<VyOSResponse> {
    return this.configureBatch({
      asn,
      operations: [{ op: "enable_neighbor", neighbor }],
    });
  }

  /**
   * Advertise a network
   */
  async addNetwork(
    asn: string,
    family: string,
    network: string,
    routeMap?: string
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      asn,
      operations: [{ op: "add_network", family, network, route_map: routeMap }],
    });
  }

  /**
   * Remove an advertised network
   */
  async removeNetwork(asn: string, family: string, network: string): Promise<VyOSResponse> {
    return this.configureBatch({
      asn,
      operations: [{ op: "delete_network", family, network }],
    });
  }

  /**
   * Add redistribution
   */
  async addRedistribution(
    asn: string,
    family: string,
    protocol: string,
    options?: {
      routeMap?: string;
      metric?: number;
    }
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      asn,
      operations: [{
        op: "add_redistribute",
        family,
        protocol,
        route_map: options?.routeMap,
        metric: options?.metric,
      }],
    });
  }

  /**
   * Remove redistribution
   */
  async removeRedistribution(asn: string, family: string, protocol: string): Promise<VyOSResponse> {
    return this.configureBatch({
      asn,
      operations: [{ op: "delete_redistribute", family, protocol }],
    });
  }

  /**
   * Enable BFD for a neighbor
   */
  async enableNeighborBFD(asn: string, neighbor: string): Promise<VyOSResponse> {
    return this.configureBatch({
      asn,
      operations: [{ op: "enable_neighbor_bfd", neighbor }],
    });
  }

  /**
   * Set neighbor timers
   */
  async setNeighborTimers(
    asn: string,
    neighbor: string,
    holdtime: number,
    keepalive: number
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      asn,
      operations: [{ op: "set_neighbor_timers", neighbor, holdtime, keepalive }],
    });
  }

  /**
   * Add a peer group
   */
  async addPeerGroup(
    asn: string,
    group: string,
    remoteAs?: string,
    description?: string
  ): Promise<VyOSResponse> {
    const operations: BGPOperation[] = [
      { op: "add_peer_group", group, remote_as: remoteAs },
    ];

    if (description) {
      operations.push({ op: "set_peer_group_description", group, value: description });
    }

    return this.configureBatch({ asn, operations });
  }

  /**
   * Remove a peer group
   */
  async removePeerGroup(asn: string, group: string): Promise<VyOSResponse> {
    return this.configureBatch({
      asn,
      operations: [{ op: "delete_peer_group", group }],
    });
  }

  /**
   * Enable next-hop-self for a neighbor in an address family
   */
  async enableNextHopSelf(asn: string, family: string, neighbor: string): Promise<VyOSResponse> {
    return this.configureBatch({
      asn,
      operations: [{ op: "enable_af_neighbor_next_hop_self", family, neighbor }],
    });
  }

  /**
   * Enable route reflector client for a neighbor
   */
  async enableRouteReflectorClient(asn: string, family: string, neighbor: string): Promise<VyOSResponse> {
    return this.configureBatch({
      asn,
      operations: [{ op: "enable_af_neighbor_rr_client", family, neighbor }],
    });
  }

  /**
   * Set route maps for a neighbor
   */
  async setNeighborRouteMaps(
    asn: string,
    family: string,
    neighbor: string,
    options: {
      importMap?: string;
      exportMap?: string;
    }
  ): Promise<VyOSResponse> {
    const operations: BGPOperation[] = [];

    if (options.importMap) {
      operations.push({ op: "set_af_neighbor_route_map_in", family, neighbor, value: options.importMap });
    }

    if (options.exportMap) {
      operations.push({ op: "set_af_neighbor_route_map_out", family, neighbor, value: options.exportMap });
    }

    return this.configureBatch({ asn, operations });
  }

  /**
   * Delete entire BGP configuration
   */
  async deleteBGP(asn: string): Promise<VyOSResponse> {
    return this.configureBatch({
      asn,
      operations: [{ op: "delete_bgp" }],
    });
  }
}

export const bgpService = new BGPService();
