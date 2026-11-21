import { apiClient } from "./client";
import {
  arpSaveOps,
  deleteArpEntryOps,
  deleteMrouteOps,
  deleteNeighborProxyOps,
  deleteRoutingTableOps,
  deleteStaticRouteOps,
  mrouteSaveOps,
  neighborProxySaveOps,
  routeMapSaveOps,
  routingTableSaveOps,
  staticRouteSaveOps,
  type ArpFields,
  type MrouteFeatures,
  type MrouteFields,
  type NeighborProxyFields,
  type NeighborProxyKind,
  type RouteFamily,
  type RoutingTableFields,
  type StaticRouteFeatures,
  type StaticRouteFields,
} from "./static-routes-save-ops";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface NextHop {
  address: string;
  distance?: number | null;
  disable: boolean;
  vrf?: string | null;
  interface?: string | null;
  bfd_enable: boolean;
  bfd_profile?: string | null;
  bfd_multi_hop: boolean;
  bfd_multi_hop_source?: string | null;
  /** 1.4 only: profile of the multi-hop source. */
  bfd_multi_hop_source_profile?: string | null;
  segments?: string | null;
}

export interface InterfaceRoute {
  interface: string;
  distance?: number | null;
  disable: boolean;
  vrf?: string | null;
  segments?: string | null;
}

export interface StaticRoute {
  destination: string;
  description?: string | null;
  next_hops: NextHop[];
  interfaces: InterfaceRoute[];
  blackhole: boolean;
  blackhole_distance?: number | null;
  blackhole_tag?: number | null;
  reject: boolean;
  reject_distance?: number | null;
  reject_tag?: number | null;
  dhcp_interfaces: string[];
  route_type: RouteFamily;
}

export interface RoutingTable {
  table_id: number;
  description?: string | null;
  ipv4_routes: StaticRoute[];
  ipv6_routes: StaticRoute[];
}

export interface ArpEntry {
  ip_address: string;
  mac_address: string;
  description?: string | null;
}

export interface ArpInterface {
  interface: string;
  entries: ArpEntry[];
}

export interface MrouteNextHop {
  address: string;
  distance?: number | null;
  disable: boolean;
}

export interface MrouteInterface {
  interface: string;
  distance?: number | null;
  disable: boolean;
}

export interface MulticastRoute {
  prefix: string;
  next_hops: MrouteNextHop[];
  interfaces: MrouteInterface[];
  /** The node that holds the next-hops exists on the device. */
  next_hops_configured: boolean;
  /** The node that holds the interfaces exists on the device. */
  interfaces_configured: boolean;
}

export interface NeighborProxyArp {
  ip_address: string;
  interfaces: string[];
}

export interface NeighborProxyNd {
  ipv6_address: string;
  interfaces: string[];
}

export interface NeighborProxy {
  arp_entries: NeighborProxyArp[];
  nd_entries: NeighborProxyNd[];
}

export interface StaticRoutesConfig {
  ipv4_routes: StaticRoute[];
  ipv6_routes: StaticRoute[];
  routing_tables: RoutingTable[];
  route_map?: string | null;
  arp_interfaces: ArpInterface[];
  multicast_routes: MulticastRoute[];
  neighbor_proxy: NeighborProxy;
}

interface FeatureFlag {
  supported: boolean;
  description: string;
}

export interface StaticRoutesCapabilities {
  version: string;
  features: {
    route_ipv4_segments: FeatureFlag;
    next_hop_bfd_source_profile: FeatureFlag;
    multicast_mroute: FeatureFlag;
  };
  instance_name?: string;
  instance_id?: string;
}

export interface StaticRoutesBatchOperation {
  op: string;
  value?: string;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

/** Route leaves the capabilities say this device has. */
export function staticRouteFeatures(caps: StaticRoutesCapabilities | null): StaticRouteFeatures {
  return {
    ipv4Segments: caps?.features.route_ipv4_segments.supported ?? false,
    bfdSourceProfile: caps?.features.next_hop_bfd_source_profile.supported ?? false,
  };
}

export function mrouteFeatures(caps: StaticRoutesCapabilities | null): MrouteFeatures {
  return { mroute: caps?.features.multicast_mroute.supported ?? false };
}

// ============================================================================
// API Service
// ============================================================================

export class StaticRoutesService {
  async getCapabilities(): Promise<StaticRoutesCapabilities> {
    return apiClient.get<StaticRoutesCapabilities>("/vyos/static-routes/capabilities");
  }

  async getConfig(refresh: boolean = false): Promise<StaticRoutesConfig> {
    return apiClient.get<StaticRoutesConfig>("/vyos/static-routes/config", {
      refresh: refresh.toString(),
    });
  }

  async refreshConfig(): Promise<VyOSResponse> {
    return apiClient.post("/vyos/config/refresh");
  }

  /** One commit. Callers skip the request when there is nothing to send. */
  async batchConfigure(operations: StaticRoutesBatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/static-routes/batch", { operations });
    await this.refreshConfig();
    return result;
  }

  private async send(operations: StaticRoutesBatchOperation[]): Promise<VyOSResponse | null> {
    if (operations.length === 0) return null;
    return this.batchConfigure(operations);
  }

  /** Create (original null) or diff-save a global or routing-table route. */
  async saveRoute(
    tableId: number | null,
    family: RouteFamily,
    original: StaticRouteFields | null,
    updated: StaticRouteFields,
    features: StaticRouteFeatures,
  ): Promise<VyOSResponse | null> {
    const scope = tableId === null ? { kind: "global" as const } : { kind: "table" as const, tableId };
    return this.send(staticRouteSaveOps(scope, family, original, updated, features));
  }

  async deleteRoute(tableId: number | null, family: RouteFamily, destination: string): Promise<VyOSResponse> {
    const scope = tableId === null ? { kind: "global" as const } : { kind: "table" as const, tableId };
    return this.batchConfigure(deleteStaticRouteOps(scope, family, destination));
  }

  async saveRoutingTable(
    original: RoutingTableFields | null,
    updated: RoutingTableFields,
  ): Promise<VyOSResponse | null> {
    return this.send(routingTableSaveOps(original, updated));
  }

  async deleteRoutingTable(tableId: number): Promise<VyOSResponse> {
    return this.batchConfigure(deleteRoutingTableOps(tableId));
  }

  async saveRouteMap(before: string, after: string): Promise<VyOSResponse | null> {
    return this.send(routeMapSaveOps(before, after));
  }

  async saveArpEntry(original: ArpFields | null, updated: ArpFields): Promise<VyOSResponse | null> {
    return this.send(arpSaveOps(original, updated));
  }

  async deleteArpEntry(
    interfaceName: string,
    address: string,
    entriesOnInterface: number,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(deleteArpEntryOps(interfaceName, address, entriesOnInterface));
  }

  async saveMroute(
    original: MulticastRoute | null,
    updated: MrouteFields,
    features: MrouteFeatures,
  ): Promise<VyOSResponse | null> {
    return this.send(mrouteSaveOps(original, updated, features));
  }

  async deleteMroute(route: MulticastRoute, features: MrouteFeatures): Promise<VyOSResponse> {
    return this.batchConfigure(deleteMrouteOps(route, features));
  }

  async saveNeighborProxy(
    original: NeighborProxyFields | null,
    updated: NeighborProxyFields,
  ): Promise<VyOSResponse | null> {
    return this.send(neighborProxySaveOps(original, updated));
  }

  async deleteNeighborProxy(kind: NeighborProxyKind, address: string): Promise<VyOSResponse> {
    return this.batchConfigure(deleteNeighborProxyOps(kind, address));
  }
}

export const staticRoutesService = new StaticRoutesService();
