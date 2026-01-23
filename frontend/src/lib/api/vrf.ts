/**
 * VRF API Service
 * Handles all VRF (Virtual Routing and Forwarding) related API operations for VyOS
 */

import { apiClient } from "./client";

// ============================================================================
// Response Types
// ============================================================================

export interface VRFNextHop {
  address: string;
  distance?: string;
  disable: boolean;
}

export interface VRFStaticRoute {
  network: string;
  next_hops: VRFNextHop[];
  blackhole: boolean;
  interfaces: string[];
}

export interface VRFBGPNeighbor {
  address: string;
  remote_as?: string;
}

export interface VRFBGPAddressFamily {
  name: string;
  redistribute: string[];
  import_vpn: boolean;
  export_vpn: boolean;
  import_vrfs: string[];
  rd_export?: string;
  route_target_import?: string;
  route_target_export?: string;
  route_target_both?: string;
}

export interface VRFBGP {
  system_as?: string;
  router_id?: string;
  neighbors: VRFBGPNeighbor[];
  address_families: VRFBGPAddressFamily[];
}

export interface VRFOSPFArea {
  id: string;
  networks: string[];
}

export interface VRFOSPF {
  areas: VRFOSPFArea[];
  redistribute: string[];
}

export interface VRF {
  name: string;
  table?: string;
  description?: string;
  disable: boolean;
  interfaces: string[];
  static_routes_ipv4: VRFStaticRoute[];
  static_routes_ipv6: VRFStaticRoute[];
  bgp?: VRFBGP;
  ospf?: VRFOSPF;
}

export interface VRFConfigResponse {
  configured: boolean;
  bind_to_all: boolean;
  vrfs: VRF[];
}

export interface VRFCapabilities {
  redistribute_protocols: { value: string; label: string }[];
  route_filter_protocols: { value: string; label: string }[];
  address_families: { value: string; label: string }[];
  table_range: { min: number; max: number };
  version: string;
}

export interface VRFRoutesResponse {
  success: boolean;
  vrf: string;
  data: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Request Types
// ============================================================================

export type VRFOperation =
  // VRF Instance Operations
  | { op: "create_vrf"; name: string; table: string | number }
  | { op: "delete_vrf"; name: string }
  | { op: "set_vrf_table"; name: string; value: string | number }
  | { op: "set_vrf_description"; name: string; value: string }
  | { op: "delete_vrf_description"; name: string }
  | { op: "disable_vrf"; name: string }
  | { op: "enable_vrf"; name: string }
  | { op: "enable_bind_to_all" }
  | { op: "disable_bind_to_all" }
  // Interface Operations
  | { op: "assign_interface_to_vrf"; name: string; interface: string }
  | { op: "remove_interface_from_vrf"; interface: string }
  // Static Route Operations
  | { op: "add_vrf_static_route"; name: string; network: string; next_hop: string; distance?: number }
  | { op: "delete_vrf_static_route"; name: string; network: string }
  | { op: "add_vrf_static_route_blackhole"; name: string; network: string }
  | { op: "add_vrf_static_route6"; name: string; network: string; next_hop: string }
  | { op: "delete_vrf_static_route6"; name: string; network: string }
  // BGP Operations
  | { op: "set_vrf_bgp_as"; name: string; value: string | number }
  | { op: "delete_vrf_bgp"; name: string }
  | { op: "set_vrf_bgp_router_id"; name: string; value: string }
  | { op: "add_vrf_bgp_neighbor"; name: string; neighbor: string; remote_as?: string | number }
  | { op: "delete_vrf_bgp_neighbor"; name: string; neighbor: string }
  | { op: "add_vrf_bgp_redistribute"; name: string; protocol: string; address_family?: string }
  | { op: "delete_vrf_bgp_redistribute"; name: string; protocol: string; address_family?: string }
  | { op: "set_vrf_bgp_import_vrf"; name: string; import_vrf: string; address_family?: string }
  | { op: "delete_vrf_bgp_import_vrf"; name: string; import_vrf: string; address_family?: string }
  | { op: "enable_vrf_bgp_import_vpn"; name: string; address_family?: string }
  | { op: "enable_vrf_bgp_export_vpn"; name: string; address_family?: string }
  | { op: "set_vrf_bgp_rd_export"; name: string; value: string; address_family?: string }
  | { op: "set_vrf_bgp_route_target"; name: string; value: string; direction?: "import" | "export" | "both"; address_family?: string }
  // OSPF Operations
  | { op: "set_vrf_ospf_area_network"; name: string; area: string; network: string }
  | { op: "delete_vrf_ospf_area_network"; name: string; area: string; network: string }
  | { op: "delete_vrf_ospf"; name: string }
  | { op: "add_vrf_ospf_redistribute"; name: string; protocol: string }
  | { op: "delete_vrf_ospf_redistribute"; name: string; protocol: string };

export interface VRFBatchRequest {
  operations: VRFOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// VRF Service
// ============================================================================

export class VRFService {
  /**
   * Get complete VRF configuration
   */
  async getConfig(): Promise<VRFConfigResponse> {
    return apiClient.get<VRFConfigResponse>("/vyos/vrf/config");
  }

  /**
   * Get VRF capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<VRFCapabilities> {
    return apiClient.get<VRFCapabilities>("/vyos/vrf/capabilities");
  }

  /**
   * Get the routing table for a specific VRF
   */
  async getVRFRoutes(vrfName: string): Promise<VRFRoutesResponse> {
    return apiClient.get<VRFRoutesResponse>(`/vyos/vrf/${vrfName}/routes`);
  }

  /**
   * Execute batch VRF operations
   */
  async batch(operations: VRFOperation[]): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/vrf/batch", { operations });
  }

  // ============================================================================
  // Helper Methods - VRF Instance
  // ============================================================================

  /**
   * Create a new VRF
   */
  async createVRF(name: string, table: number, description?: string): Promise<VyOSResponse> {
    const operations: VRFOperation[] = [
      { op: "create_vrf", name, table },
    ];
    if (description) {
      operations.push({ op: "set_vrf_description", name, value: description });
    }
    return this.batch(operations);
  }

  /**
   * Delete a VRF
   */
  async deleteVRF(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_vrf", name }]);
  }

  /**
   * Update VRF description
   */
  async setVRFDescription(name: string, description: string): Promise<VyOSResponse> {
    return this.batch([{ op: "set_vrf_description", name, value: description }]);
  }

  /**
   * Enable/disable a VRF
   */
  async setVRFEnabled(name: string, enabled: boolean): Promise<VyOSResponse> {
    return this.batch([{ op: enabled ? "enable_vrf" : "disable_vrf", name }]);
  }

  /**
   * Set bind-to-all global setting
   */
  async setBindToAll(enabled: boolean): Promise<VyOSResponse> {
    return this.batch([{ op: enabled ? "enable_bind_to_all" : "disable_bind_to_all" }]);
  }

  // ============================================================================
  // Helper Methods - Interface Assignment
  // ============================================================================

  /**
   * Assign an interface to a VRF
   */
  async assignInterface(vrfName: string, interfaceName: string): Promise<VyOSResponse> {
    return this.batch([{ op: "assign_interface_to_vrf", name: vrfName, interface: interfaceName }]);
  }

  /**
   * Remove an interface from its VRF
   */
  async removeInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.batch([{ op: "remove_interface_from_vrf", interface: interfaceName }]);
  }

  // ============================================================================
  // Helper Methods - Static Routes
  // ============================================================================

  /**
   * Add a static route to a VRF
   */
  async addStaticRoute(
    vrfName: string,
    network: string,
    nextHop: string,
    options?: { distance?: number; ipv6?: boolean }
  ): Promise<VyOSResponse> {
    if (options?.ipv6) {
      return this.batch([{ op: "add_vrf_static_route6", name: vrfName, network, next_hop: nextHop }]);
    }
    return this.batch([
      { op: "add_vrf_static_route", name: vrfName, network, next_hop: nextHop, distance: options?.distance },
    ]);
  }

  /**
   * Delete a static route from a VRF
   */
  async deleteStaticRoute(vrfName: string, network: string, ipv6?: boolean): Promise<VyOSResponse> {
    return this.batch([
      { op: ipv6 ? "delete_vrf_static_route6" : "delete_vrf_static_route", name: vrfName, network },
    ]);
  }

  /**
   * Add a blackhole route to a VRF
   */
  async addBlackholeRoute(vrfName: string, network: string): Promise<VyOSResponse> {
    return this.batch([{ op: "add_vrf_static_route_blackhole", name: vrfName, network }]);
  }

  // ============================================================================
  // Helper Methods - BGP
  // ============================================================================

  /**
   * Configure BGP in a VRF
   */
  async configureBGP(
    vrfName: string,
    asNumber: number,
    options?: { routerId?: string }
  ): Promise<VyOSResponse> {
    const operations: VRFOperation[] = [
      { op: "set_vrf_bgp_as", name: vrfName, value: asNumber },
    ];
    if (options?.routerId) {
      operations.push({ op: "set_vrf_bgp_router_id", name: vrfName, value: options.routerId });
    }
    return this.batch(operations);
  }

  /**
   * Delete BGP from a VRF
   */
  async deleteBGP(vrfName: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_vrf_bgp", name: vrfName }]);
  }

  /**
   * Add a BGP neighbor to a VRF
   */
  async addBGPNeighbor(
    vrfName: string,
    neighbor: string,
    remoteAs?: number
  ): Promise<VyOSResponse> {
    return this.batch([
      { op: "add_vrf_bgp_neighbor", name: vrfName, neighbor, remote_as: remoteAs },
    ]);
  }

  /**
   * Delete a BGP neighbor from a VRF
   */
  async deleteBGPNeighbor(vrfName: string, neighbor: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_vrf_bgp_neighbor", name: vrfName, neighbor }]);
  }

  /**
   * Configure route leaking from another VRF
   */
  async setRouteLeaking(
    vrfName: string,
    importVrf: string,
    addressFamily: string = "ipv4-unicast"
  ): Promise<VyOSResponse> {
    return this.batch([
      { op: "set_vrf_bgp_import_vrf", name: vrfName, import_vrf: importVrf, address_family: addressFamily },
    ]);
  }

  // ============================================================================
  // Helper Methods - OSPF
  // ============================================================================

  /**
   * Add OSPF area network to a VRF
   */
  async addOSPFAreaNetwork(vrfName: string, area: string, network: string): Promise<VyOSResponse> {
    return this.batch([{ op: "set_vrf_ospf_area_network", name: vrfName, area, network }]);
  }

  /**
   * Delete OSPF area network from a VRF
   */
  async deleteOSPFAreaNetwork(vrfName: string, area: string, network: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_vrf_ospf_area_network", name: vrfName, area, network }]);
  }

  /**
   * Delete OSPF from a VRF
   */
  async deleteOSPF(vrfName: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_vrf_ospf", name: vrfName }]);
  }
}

export const vrfService = new VRFService();
