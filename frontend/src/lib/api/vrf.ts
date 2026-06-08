/**
 * VRF API Service
 * Handles all VRF (Virtual Routing and Forwarding) related API operations for VyOS.
 * Supports full protocol subtree management: static routes, RPKI, failover,
 * OSPF, OSPFv3, IS-IS, BGP, DHCP server, DHCPv6 server.
 */

import { apiClient } from "./client";

// ============================================================================
// Core VRF Types
// ============================================================================

export interface VrfIpProtocolRouteMap {
  protocol: string;
  route_map: string;
}

export interface VrfIpSettings {
  disable_forwarding: boolean;
  nht_no_resolve_via_default: boolean;
  protocol_route_maps: VrfIpProtocolRouteMap[];
}

// ============================================================================
// Static Routes Types
// ============================================================================

export interface VrfStaticRouteBfd {
  profile: string | null;
  multi_hop_source: string | null;
}

export interface VrfStaticRouteNextHop {
  address: string;
  disable: boolean;
  distance: number | null;
  interface: string | null;
  vrf: string | null;
  bfd: VrfStaticRouteBfd | null;
  segments: string | null;
}

export interface VrfStaticRouteInterface {
  name: string;
  disable: boolean;
  distance: number | null;
  vrf: string | null;
  segments: string | null;
}

export interface VrfStaticRouteBlackhole {
  distance: number | null;
  tag: number | null;
}

export interface VrfStaticRoute {
  destination: string;
  description: string | null;
  dhcp_interface: string | null;
  next_hops: VrfStaticRouteNextHop[];
  interfaces: VrfStaticRouteInterface[];
  blackhole: VrfStaticRouteBlackhole | null;
  reject: VrfStaticRouteBlackhole | null;
}

export interface VrfStaticConfig {
  routes: VrfStaticRoute[];
  routes6: VrfStaticRoute[];
}

// ============================================================================
// RPKI Types
// ============================================================================

export interface VrfRpkiCacheSsh {
  key: string | null;
  username: string | null;
}

export interface VrfRpkiCache {
  name: string;
  port: number | null;
  preference: number | null;
  source_address: string | null;
  ssh: VrfRpkiCacheSsh | null;
}

export interface VrfRpkiConfig {
  caches: VrfRpkiCache[];
  expire_interval: number | null;
  polling_period: number | null;
  retry_interval: number | null;
  raw_config?: Record<string, unknown> | null;
}

// ============================================================================
// Failover Types
// ============================================================================

export interface VrfFailoverCheckTarget {
  address: string;
  interface: string | null;
  vrf: string | null;
}

export interface VrfFailoverCheck {
  policy: string | null;
  port: number | null;
  targets: VrfFailoverCheckTarget[];
  timeout: number | null;
  type: string | null;
}

export interface VrfFailoverNextHop {
  address: string;
  check: VrfFailoverCheck | null;
  interface: string | null;
  metric: number | null;
  onlink: boolean;
}

export interface VrfFailoverDhcpInterface {
  name: string;
  check: VrfFailoverCheck | null;
  interface: string | null;
  metric: number | null;
  onlink: boolean;
}

export interface VrfFailoverRoute {
  destination: string;
  next_hops: VrfFailoverNextHop[];
  dhcp_interfaces: VrfFailoverDhcpInterface[];
}

export interface VrfFailoverConfig {
  routes: VrfFailoverRoute[];
  raw_config?: Record<string, unknown> | null;
}

// ============================================================================
// Protocol Summary Types (OSPF, OSPFv3, ISIS, BGP)
// ============================================================================

export interface VrfOspfSummary {
  configured: boolean;
  router_id: string | null;
  areas: string[];
  interfaces: string[];
  redistribute: string[];
  raw_config: Record<string, unknown> | null;
}

export interface VrfOspfv3Summary {
  configured: boolean;
  router_id: string | null;
  areas: string[];
  interfaces: string[];
  redistribute: string[];
  raw_config: Record<string, unknown> | null;
}

export interface VrfIsisSummary {
  configured: boolean;
  net: string | null;
  interfaces: string[];
  redistribute_ipv4: string[];
  redistribute_ipv6: string[];
  raw_config: Record<string, unknown> | null;
}

export interface VrfBgpSummary {
  configured: boolean;
  system_as: number | null;
  router_id: string | null;
  neighbors: string[];
  peer_groups: string[];
  address_families: string[];
  raw_config: Record<string, unknown> | null;
}

// ============================================================================
// DHCP / DHCPv6 Types
// ============================================================================

export interface VrfDhcpSubnetSummary {
  prefix: string;
  default_router: string | null;
  ranges: number;
  static_mappings: number;
}

export interface VrfDhcpNetworkSummary {
  name: string;
  description: string | null;
  disabled: boolean;
  subnets: VrfDhcpSubnetSummary[];
}

export interface VrfDhcpConfig {
  configured: boolean;
  disabled: boolean;
  shared_networks: VrfDhcpNetworkSummary[];
  raw_config: Record<string, unknown> | null;
}

export interface VrfDhcpv6SubnetSummary {
  prefix: string;
  ranges: number;
  static_mappings: number;
}

export interface VrfDhcpv6NetworkSummary {
  name: string;
  description: string | null;
  disabled: boolean;
  subnets: VrfDhcpv6SubnetSummary[];
}

export interface VrfDhcpv6Config {
  configured: boolean;
  disabled: boolean;
  shared_networks: VrfDhcpv6NetworkSummary[];
  raw_config: Record<string, unknown> | null;
}

// ============================================================================
// VRF Instance
// ============================================================================

export interface VrfInstance {
  name: string;
  description: string | null;
  disabled: boolean;
  table: number | null;
  vni: number | null;
  ip: VrfIpSettings;
  ipv6: VrfIpSettings;
  protocols: string[];
  services: string[];
  static: VrfStaticConfig | null;
  rpki: VrfRpkiConfig | null;
  failover: VrfFailoverConfig | null;
  ospf: VrfOspfSummary | null;
  ospfv3: VrfOspfv3Summary | null;
  isis: VrfIsisSummary | null;
  bgp: VrfBgpSummary | null;
  dhcp: VrfDhcpConfig | null;
  dhcpv6: VrfDhcpv6Config | null;
}

export interface VrfConfig {
  bind_to_all: boolean;
  instances: VrfInstance[];
}

// ============================================================================
// Capabilities
// ============================================================================

export interface VrfFeatureFlag {
  supported: boolean;
  description: string;
}

export interface VrfCapabilities {
  version: string;
  features: {
    vrf_instances: VrfFeatureFlag;
    bind_to_all: VrfFeatureFlag;
    vni: VrfFeatureFlag;
    ip_settings: VrfFeatureFlag;
    ipv6_settings: VrfFeatureFlag;
    protocol_route_maps: VrfFeatureFlag;
    static_routes: VrfFeatureFlag;
    rpki: VrfFeatureFlag;
    failover: VrfFeatureFlag;
    ospf: VrfFeatureFlag;
    ospfv3: VrfFeatureFlag;
    isis: VrfFeatureFlag;
    bgp: VrfFeatureFlag;
    dhcp_server: VrfFeatureFlag;
    dhcpv6_server: VrfFeatureFlag;
    static_route_ipv4_segments: VrfFeatureFlag;
    ospf_retransmit_window: VrfFeatureFlag;
    ospf_redistribute_nhrp: VrfFeatureFlag;
    isis_fast_reroute: VrfFeatureFlag;
    bgp_redistribute_nhrp: VrfFeatureFlag;
  };
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
  };
  instance_name?: string;
  instance_id?: string;
}

// ============================================================================
// Batch Operations
// ============================================================================

export interface VrfBatchOperation {
  op: string;
  value?: string;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

class VrfService {
  async getCapabilities(): Promise<VrfCapabilities> {
    return apiClient.get<VrfCapabilities>("/vyos/vrf/capabilities");
  }

  async getConfig(refresh = false): Promise<VrfConfig> {
    return apiClient.get<VrfConfig>("/vyos/vrf/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/config/refresh");
  }

  async batchConfigure(operations: VrfBatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/vrf/batch", {
      operations,
    });
    await this.refreshConfig();
    return result;
  }

  // ==========================================================================
  // VRF Instance CRUD
  // ==========================================================================

  async createVrf(
    name: string,
    config: { table: string; description?: string; vni?: string; disabled?: boolean }
  ): Promise<VyOSResponse> {
    const ops: VrfBatchOperation[] = [
      { op: "set_vrf", value: name },
      { op: "set_vrf_table", value: `${name},${config.table}` },
    ];
    if (config.description) {
      ops.push({ op: "set_vrf_description", value: `${name},${config.description}` });
    }
    if (config.vni) {
      ops.push({ op: "set_vrf_vni", value: `${name},${config.vni}` });
    }
    if (config.disabled) {
      ops.push({ op: "set_vrf_disable", value: name });
    }
    return this.batchConfigure(ops);
  }

  async deleteVrf(name: string): Promise<VyOSResponse> {
    return this.batchConfigure([{ op: "delete_vrf", value: name }]);
  }

  async updateVrfSettings(
    name: string,
    current: VrfInstance,
    updates: {
      description?: string | null;
      table?: string;
      vni?: string | null;
      disabled?: boolean;
      ip_disable_forwarding?: boolean;
      ip_nht_no_resolve?: boolean;
      ipv6_disable_forwarding?: boolean;
      ipv6_nht_no_resolve?: boolean;
    }
  ): Promise<VyOSResponse> {
    const ops: VrfBatchOperation[] = [];

    // Description
    if (updates.description !== undefined) {
      if (updates.description) {
        ops.push({ op: "set_vrf_description", value: `${name},${updates.description}` });
      } else if (current.description) {
        ops.push({ op: "delete_vrf_description", value: name });
      }
    }

    // Table
    if (updates.table !== undefined && updates.table !== current.table?.toString()) {
      ops.push({ op: "set_vrf_table", value: `${name},${updates.table}` });
    }

    // VNI
    if (updates.vni !== undefined) {
      if (updates.vni) {
        ops.push({ op: "set_vrf_vni", value: `${name},${updates.vni}` });
      } else if (current.vni) {
        ops.push({ op: "delete_vrf_vni", value: name });
      }
    }

    // Disable
    if (updates.disabled !== undefined && updates.disabled !== current.disabled) {
      ops.push({
        op: updates.disabled ? "set_vrf_disable" : "delete_vrf_disable",
        value: name,
      });
    }

    // IP settings
    if (updates.ip_disable_forwarding !== undefined && updates.ip_disable_forwarding !== current.ip.disable_forwarding) {
      ops.push({
        op: updates.ip_disable_forwarding ? "set_vrf_ip_disable_forwarding" : "delete_vrf_ip_disable_forwarding",
        value: name,
      });
    }
    if (updates.ip_nht_no_resolve !== undefined && updates.ip_nht_no_resolve !== current.ip.nht_no_resolve_via_default) {
      ops.push({
        op: updates.ip_nht_no_resolve ? "set_vrf_ip_nht_no_resolve_via_default" : "delete_vrf_ip_nht_no_resolve_via_default",
        value: name,
      });
    }

    // IPv6 settings
    if (updates.ipv6_disable_forwarding !== undefined && updates.ipv6_disable_forwarding !== current.ipv6.disable_forwarding) {
      ops.push({
        op: updates.ipv6_disable_forwarding ? "set_vrf_ipv6_disable_forwarding" : "delete_vrf_ipv6_disable_forwarding",
        value: name,
      });
    }
    if (updates.ipv6_nht_no_resolve !== undefined && updates.ipv6_nht_no_resolve !== current.ipv6.nht_no_resolve_via_default) {
      ops.push({
        op: updates.ipv6_nht_no_resolve ? "set_vrf_ipv6_nht_no_resolve_via_default" : "delete_vrf_ipv6_nht_no_resolve_via_default",
        value: name,
      });
    }

    if (ops.length === 0) return { success: true };
    return this.batchConfigure(ops);
  }

  // ==========================================================================
  // Bind to All
  // ==========================================================================

  async setBindToAll(enabled: boolean): Promise<VyOSResponse> {
    return this.batchConfigure([
      { op: enabled ? "set_bind_to_all" : "delete_bind_to_all" },
    ]);
  }

  // ==========================================================================
  // IP Protocol Route Maps
  // ==========================================================================

  async setIpProtocolRouteMap(
    vrfName: string,
    family: "ip" | "ipv6",
    protocol: string,
    routeMap: string
  ): Promise<VyOSResponse> {
    const op = family === "ip" ? "set_vrf_ip_protocol_route_map" : "set_vrf_ipv6_protocol_route_map";
    return this.batchConfigure([
      { op, value: `${vrfName},${protocol},${routeMap}` },
    ]);
  }

  async deleteIpProtocolRouteMap(
    vrfName: string,
    family: "ip" | "ipv6",
    protocol: string
  ): Promise<VyOSResponse> {
    const op = family === "ip" ? "delete_vrf_ip_protocol_route_map" : "delete_vrf_ipv6_protocol_route_map";
    return this.batchConfigure([
      { op, value: `${vrfName},${protocol}` },
    ]);
  }

  // ==========================================================================
  // Static Route Operations
  // ==========================================================================

  async deleteStaticRoute(
    vrfName: string,
    destination: string,
    family: "route" | "route6"
  ): Promise<VyOSResponse> {
    return this.batchConfigure([
      { op: family === "route" ? "delete_vrf_static_route" : "delete_vrf_static_route6", value: `${vrfName},${destination}` },
    ]);
  }

  async createStaticRoute(
    vrfName: string,
    route: {
      destination: string;
      family: "route" | "route6";
      description?: string;
      next_hops?: Array<{ address: string; distance?: string; interface?: string; vrf?: string }>;
      interfaces?: Array<{ name: string; distance?: string; vrf?: string }>;
      blackhole?: { distance?: string; tag?: string };
      reject?: { distance?: string; tag?: string };
    }
  ): Promise<VyOSResponse> {
    const ops: VrfBatchOperation[] = [];
    const prefix = route.family === "route" ? "set_vrf_static_route" : "set_vrf_static_route6";
    const dest = route.destination;

    // Create route node
    ops.push({ op: prefix, value: `${vrfName},${dest}` });

    if (route.description) {
      ops.push({ op: `${prefix}_description`, value: `${vrfName},${dest},${route.description}` });
    }

    // Next-hops
    for (const nh of route.next_hops ?? []) {
      ops.push({ op: `${prefix}_next_hop`, value: `${vrfName},${dest},${nh.address}` });
      if (nh.distance) {
        ops.push({ op: `${prefix}_next_hop_distance`, value: `${vrfName},${dest},${nh.address},${nh.distance}` });
      }
      if (nh.interface) {
        ops.push({ op: `${prefix}_next_hop_interface`, value: `${vrfName},${dest},${nh.address},${nh.interface}` });
      }
      if (nh.vrf) {
        ops.push({ op: `${prefix}_next_hop_vrf`, value: `${vrfName},${dest},${nh.address},${nh.vrf}` });
      }
    }

    // Interface routes
    for (const iface of route.interfaces ?? []) {
      ops.push({ op: `${prefix}_interface`, value: `${vrfName},${dest},${iface.name}` });
      if (iface.distance) {
        ops.push({ op: `${prefix}_interface_distance`, value: `${vrfName},${dest},${iface.name},${iface.distance}` });
      }
      if (iface.vrf) {
        ops.push({ op: `${prefix}_interface_vrf`, value: `${vrfName},${dest},${iface.name},${iface.vrf}` });
      }
    }

    // Blackhole
    if (route.blackhole) {
      ops.push({ op: `${prefix}_blackhole`, value: `${vrfName},${dest}` });
      if (route.blackhole.distance) {
        ops.push({ op: `${prefix}_blackhole_distance`, value: `${vrfName},${dest},${route.blackhole.distance}` });
      }
      if (route.blackhole.tag) {
        ops.push({ op: `${prefix}_blackhole_tag`, value: `${vrfName},${dest},${route.blackhole.tag}` });
      }
    }

    // Reject
    if (route.reject) {
      ops.push({ op: `${prefix}_reject`, value: `${vrfName},${dest}` });
      if (route.reject.distance) {
        ops.push({ op: `${prefix}_reject_distance`, value: `${vrfName},${dest},${route.reject.distance}` });
      }
      if (route.reject.tag) {
        ops.push({ op: `${prefix}_reject_tag`, value: `${vrfName},${dest},${route.reject.tag}` });
      }
    }

    return this.batchConfigure(ops);
  }
}

export const vrfService = new VrfService();
