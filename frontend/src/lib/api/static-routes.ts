import { apiClient } from "./client";

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
  segments?: string | null;  // SRv6 segments (IPv6 only)
}

export interface InterfaceRoute {
  interface: string;
  distance?: number | null;
  disable: boolean;
  vrf?: string | null;
  segments?: string | null;  // SRv6 segments (IPv6 only)
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
  route_type: "ipv4" | "ipv6";
}

export interface RoutingTable {
  table_id: number;
  description?: string | null;
  ipv4_routes: StaticRoute[];
  ipv6_routes: StaticRoute[];
}

// ============================================================================
// Static ARP Interfaces
// ============================================================================

export interface ArpEntry {
  ip_address: string;
  mac_address: string;
  description?: string | null;
}

export interface ArpInterface {
  interface: string;
  entries: ArpEntry[];
}

// ============================================================================
// Multicast Route Interfaces
// ============================================================================

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
}

// ============================================================================
// Neighbor Proxy Interfaces
// ============================================================================

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

// ============================================================================
// Complete Configuration Interface
// ============================================================================

export interface StaticRoutesConfig {
  ipv4_routes: StaticRoute[];
  ipv6_routes: StaticRoute[];
  routing_tables: RoutingTable[];
  route_map?: string | null;
  arp_interfaces: ArpInterface[];
  multicast_routes: MulticastRoute[];
  neighbor_proxy: NeighborProxy;
}

export interface StaticRoutesCapabilities {
  version: string;
  features: {
    ipv4_routes: { supported: boolean; description: string };
    ipv6_routes: { supported: boolean; description: string };
    routing_tables: { supported: boolean; description: string };
    blackhole_routes: { supported: boolean; description: string };
    reject_routes: { supported: boolean; description: string };
    interface_routes: { supported: boolean; description: string };
    next_hop_bfd: { supported: boolean; description: string };
    next_hop_vrf: { supported: boolean; description: string };
    multicast_routes: { supported: boolean; description: string };
    multicast_route_disable: { supported: boolean; description: string };
    dhcp_interface: { supported: boolean; description: string };
    segments_ipv6: { supported: boolean; description: string };
    route_map: { supported: boolean; description: string };
    arp: { supported: boolean; description: string };
    neighbor_proxy: { supported: boolean; description: string };
  };
  version_info: {
    is_1_4: boolean;
    is_1_5: boolean;
    multicast_command: string;
    multicast_interface_key: string;
    multicast_interface_value_key: string;
  };
  instance_name?: string;
  instance_id?: string;
}

export interface StaticRoutesBatchOperation {
  op: string;
  value?: string;
}

export interface StaticRoutesBatchRequest {
  destination: string;
  route_type: "ipv4" | "ipv6";
  table_id?: number;
  operations: StaticRoutesBatchOperation[];
}

export interface ArpBatchRequest {
  interface: string;
  ip_address?: string;
  operations: StaticRoutesBatchOperation[];
}

export interface MrouteBatchRequest {
  prefix: string;
  operations: StaticRoutesBatchOperation[];
}

export interface NeighborProxyBatchRequest {
  address: string;
  proxy_type: "arp" | "nd";
  operations: StaticRoutesBatchOperation[];
}

export interface RoutingTableBatchRequest {
  table_id: number;
  operations: StaticRoutesBatchOperation[];
}

export interface TableRouteBatchRequest {
  table_id: number;
  destination: string;
  route_type: "ipv4" | "ipv6";
  operations: StaticRoutesBatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// API Service
// ============================================================================

class StaticRoutesService {
  /**
   * Get capabilities based on VyOS version
   */
  async getCapabilities(): Promise<StaticRoutesCapabilities> {
    return apiClient.get<StaticRoutesCapabilities>("/vyos/static-routes/capabilities");
  }

  /**
   * Get all static routes configuration
   */
  async getConfig(refresh: boolean = false): Promise<StaticRoutesConfig> {
    return apiClient.get<StaticRoutesConfig>("/vyos/static-routes/config", {
      refresh: refresh.toString(),
    });
  }

  /**
   * Refresh the cached configuration
   */
  async refreshConfig(): Promise<any> {
    return apiClient.post("/vyos/config/refresh");
  }

  /**
   * Execute batch operations
   */
  async batchConfigure(request: StaticRoutesBatchRequest): Promise<any> {
    const result = await apiClient.post("/vyos/static-routes/batch", request);
    await this.refreshConfig();
    return result;
  }

  /**
   * Delete a static route
   */
  async deleteRoute(
    route_type: "ipv4" | "ipv6",
    destination: string,
    table_id?: number
  ): Promise<any> {
    const operations: StaticRoutesBatchOperation[] = [];

    // Add delete operation based on route type
    if (route_type === "ipv4") {
      operations.push({ op: "delete_ipv4_route" });
    } else {
      operations.push({ op: "delete_ipv6_route" });
    }

    return this.batchConfigure({
      destination,
      route_type,
      table_id,
      operations,
    });
  }

  /**
   * Set route-map for static routes
   */
  async setRouteMap(route_map_name: string): Promise<any> {
    const result = await apiClient.post(
      "/vyos/static-routes/route-map",
      { route_map_name }
    );
    await this.refreshConfig();
    return result;
  }

  /**
   * Delete route-map for static routes
   */
  async deleteRouteMap(): Promise<any> {
    const result = await apiClient.delete("/vyos/static-routes/route-map");
    await this.refreshConfig();
    return result;
  }

  /**
   * Helper: Create a new IPv4 route
   */
  async createIPv4Route(destination: string, config: Partial<StaticRoute>): Promise<any> {
    const operations: StaticRoutesBatchOperation[] = [];

    // Create the route
    operations.push({ op: "set_ipv4_route" });

    // Add description
    if (config.description) {
      operations.push({
        op: "set_ipv4_route_description",
        value: config.description,
      });
    }

    // Add next-hops
    if (config.next_hops && config.next_hops.length > 0) {
      for (const nh of config.next_hops) {
        operations.push({
          op: "set_ipv4_route_next_hop",
          value: nh.address,
        });

        if (nh.distance) {
          operations.push({
            op: "set_ipv4_route_next_hop_distance",
            value: `${nh.address},${nh.distance}`,
          });
        }

        if (nh.disable) {
          operations.push({
            op: "set_ipv4_route_next_hop_disable",
            value: nh.address,
          });
        }
      }
    }

    // Add interface routes
    if (config.interfaces && config.interfaces.length > 0) {
      for (const iface of config.interfaces) {
        operations.push({
          op: "set_ipv4_route_interface",
          value: iface.interface,
        });

        if (iface.distance) {
          operations.push({
            op: "set_ipv4_route_interface_distance",
            value: `${iface.interface},${iface.distance}`,
          });
        }

        if (iface.disable) {
          operations.push({
            op: "set_ipv4_route_interface_disable",
            value: iface.interface,
          });
        }
      }
    }

    // Add blackhole
    if (config.blackhole) {
      operations.push({ op: "set_ipv4_route_blackhole" });

      if (config.blackhole_distance) {
        operations.push({
          op: "set_ipv4_route_blackhole_distance",
          value: config.blackhole_distance.toString(),
        });
      }

      if (config.blackhole_tag) {
        operations.push({
          op: "set_ipv4_route_blackhole_tag",
          value: config.blackhole_tag.toString(),
        });
      }
    }

    // Add reject
    if (config.reject) {
      operations.push({ op: "set_ipv4_route_reject" });

      if (config.reject_distance) {
        operations.push({
          op: "set_ipv4_route_reject_distance",
          value: config.reject_distance.toString(),
        });
      }

      if (config.reject_tag) {
        operations.push({
          op: "set_ipv4_route_reject_tag",
          value: config.reject_tag.toString(),
        });
      }
    }

    return this.batchConfigure({
      destination,
      route_type: "ipv4",
      operations,
    });
  }

  /**
   * Helper: Create a new IPv6 route
   */
  async createIPv6Route(destination: string, config: Partial<StaticRoute>): Promise<any> {
    const operations: StaticRoutesBatchOperation[] = [];

    // Create the route
    operations.push({ op: "set_ipv6_route" });

    // Add description
    if (config.description) {
      operations.push({
        op: "set_ipv6_route_description",
        value: config.description,
      });
    }

    // Add next-hops
    if (config.next_hops && config.next_hops.length > 0) {
      for (const nh of config.next_hops) {
        operations.push({
          op: "set_ipv6_route_next_hop",
          value: nh.address,
        });

        if (nh.distance) {
          operations.push({
            op: "set_ipv6_route_next_hop_distance",
            value: `${nh.address},${nh.distance}`,
          });
        }
      }
    }

    // Add interface routes
    if (config.interfaces && config.interfaces.length > 0) {
      for (const iface of config.interfaces) {
        operations.push({
          op: "set_ipv6_route_interface",
          value: iface.interface,
        });

        if (iface.distance) {
          operations.push({
            op: "set_ipv6_route_interface_distance",
            value: `${iface.interface},${iface.distance}`,
          });
        }

        if (iface.disable) {
          operations.push({
            op: "set_ipv6_route_interface_disable",
            value: iface.interface,
          });
        }
      }
    }

    // Add blackhole
    if (config.blackhole) {
      operations.push({ op: "set_ipv6_route_blackhole" });

      if (config.blackhole_distance) {
        operations.push({
          op: "set_ipv6_route_blackhole_distance",
          value: config.blackhole_distance.toString(),
        });
      }

      if (config.blackhole_tag) {
        operations.push({
          op: "set_ipv6_route_blackhole_tag",
          value: config.blackhole_tag.toString(),
        });
      }
    }

    // Add reject
    if (config.reject) {
      operations.push({ op: "set_ipv6_route_reject" });

      if (config.reject_distance) {
        operations.push({
          op: "set_ipv6_route_reject_distance",
          value: config.reject_distance.toString(),
        });
      }

      if (config.reject_tag) {
        operations.push({
          op: "set_ipv6_route_reject_tag",
          value: config.reject_tag.toString(),
        });
      }
    }

    return this.batchConfigure({
      destination,
      route_type: "ipv6",
      operations,
    });
  }

  /**
   * Helper: Update an existing route
   */
  async updateRoute(
    destination: string,
    route_type: "ipv4" | "ipv6",
    originalRoute: StaticRoute,
    config: Partial<StaticRoute>
  ): Promise<any> {
    const operations: StaticRoutesBatchOperation[] = [];

    // Description
    if (config.description !== undefined) {
      if (config.description) {
        operations.push({
          op: route_type === "ipv4" ? "set_ipv4_route_description" : "set_ipv6_route_description",
          value: config.description
        });
      } else {
        operations.push({
          op: route_type === "ipv4" ? "delete_ipv4_route_description" : "delete_ipv6_route_description"
        });
      }
    }

    // Next-hops - delete old, then set new (CRITICAL: must delete first to avoid leaving old values)
    if (config.next_hops !== undefined) {
      // Delete all existing next-hops first
      if (originalRoute.next_hops && originalRoute.next_hops.length > 0) {
        for (const oldNh of originalRoute.next_hops) {
          operations.push({
            op: route_type === "ipv4" ? "delete_ipv4_route_next_hop" : "delete_ipv6_route_next_hop",
            value: oldNh.address
          });
        }
      }

      // Now set the new next-hops
      for (const nh of config.next_hops) {
        operations.push({
          op: route_type === "ipv4" ? "set_ipv4_route_next_hop" : "set_ipv6_route_next_hop",
          value: nh.address
        });

        if (nh.distance) {
          operations.push({
            op: route_type === "ipv4" ? "set_ipv4_route_next_hop_distance" : "set_ipv6_route_next_hop_distance",
            value: `${nh.address},${nh.distance}`
          });
        }

        if (nh.disable) {
          operations.push({
            op: route_type === "ipv4" ? "set_ipv4_route_next_hop_disable" : "set_ipv6_route_next_hop_disable",
            value: nh.address
          });
        }

        if (nh.vrf) {
          operations.push({
            op: route_type === "ipv4" ? "set_ipv4_route_next_hop_vrf" : "set_ipv6_route_next_hop_vrf",
            value: `${nh.address},${nh.vrf}`
          });
        }

        if (nh.bfd_enable) {
          operations.push({
            op: route_type === "ipv4" ? "set_ipv4_route_next_hop_bfd" : "set_ipv6_route_next_hop_bfd",
            value: nh.address
          });

          if (nh.bfd_profile) {
            operations.push({
              op: route_type === "ipv4" ? "set_ipv4_route_next_hop_bfd_profile" : "set_ipv6_route_next_hop_bfd_profile",
              value: `${nh.address},${nh.bfd_profile}`
            });
          }
        }
      }
    }

    // Interfaces - delete old, then set new (CRITICAL: must delete first to avoid leaving old values)
    if (config.interfaces !== undefined) {
      // Delete all existing interfaces first
      if (originalRoute.interfaces && originalRoute.interfaces.length > 0) {
        for (const oldIface of originalRoute.interfaces) {
          operations.push({
            op: route_type === "ipv4" ? "delete_ipv4_route_interface" : "delete_ipv6_route_interface",
            value: oldIface.interface
          });
        }
      }

      // Now set the new interfaces
      for (const iface of config.interfaces) {
        operations.push({
          op: route_type === "ipv4" ? "set_ipv4_route_interface" : "set_ipv6_route_interface",
          value: iface.interface
        });

        if (iface.distance) {
          operations.push({
            op: route_type === "ipv4" ? "set_ipv4_route_interface_distance" : "set_ipv6_route_interface_distance",
            value: `${iface.interface},${iface.distance}`
          });
        }

        if (iface.disable) {
          operations.push({
            op: route_type === "ipv4" ? "set_ipv4_route_interface_disable" : "set_ipv6_route_interface_disable",
            value: iface.interface
          });
        }
      }
    }

    // Blackhole
    if (config.blackhole !== undefined) {
      if (config.blackhole) {
        operations.push({ op: route_type === "ipv4" ? "set_ipv4_route_blackhole" : "set_ipv6_route_blackhole" });

        if (config.blackhole_distance) {
          operations.push({
            op: route_type === "ipv4" ? "set_ipv4_route_blackhole_distance" : "set_ipv6_route_blackhole_distance",
            value: config.blackhole_distance.toString()
          });
        }
      } else {
        operations.push({ op: route_type === "ipv4" ? "delete_ipv4_route_blackhole" : "delete_ipv6_route_blackhole" });
      }
    }

    // DHCP interfaces (1.4 only, IPv4 only)
    if (config.dhcp_interfaces !== undefined && route_type === "ipv4") {
      // Delete existing DHCP interfaces first
      if (originalRoute.dhcp_interfaces && originalRoute.dhcp_interfaces.length > 0) {
        for (const oldIface of originalRoute.dhcp_interfaces) {
          operations.push({
            op: "delete_ipv4_route_dhcp_interface",
            value: oldIface
          });
        }
      }

      // Add new DHCP interfaces
      for (const iface of config.dhcp_interfaces) {
        operations.push({
          op: "set_ipv4_route_dhcp_interface",
          value: iface
        });
      }
    }

    return this.batchConfigure({
      destination,
      route_type,
      operations
    });
  }

  // ==========================================================================
  // Static ARP Operations
  // ==========================================================================

  /**
   * Execute ARP batch operations
   */
  async arpBatchConfigure(request: ArpBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/static-routes/arp/batch", request);
    await this.refreshConfig();
    return result;
  }

  /**
   * Create a static ARP entry
   */
  async createArpEntry(
    interfaceName: string,
    ipAddress: string,
    macAddress: string,
    description?: string
  ): Promise<VyOSResponse> {
    const operations: StaticRoutesBatchOperation[] = [
      { op: "set_arp_entry", value: macAddress }
    ];

    if (description) {
      operations.push({ op: "set_arp_entry_description", value: description });
    }

    return this.arpBatchConfigure({
      interface: interfaceName,
      ip_address: ipAddress,
      operations
    });
  }

  /**
   * Delete a static ARP entry
   */
  async deleteArpEntry(interfaceName: string, ipAddress: string): Promise<VyOSResponse> {
    return this.arpBatchConfigure({
      interface: interfaceName,
      ip_address: ipAddress,
      operations: [{ op: "delete_arp_entry" }]
    });
  }

  // ==========================================================================
  // Multicast Route Operations
  // ==========================================================================

  /**
   * Execute multicast route batch operations
   */
  async mrouteBatchConfigure(request: MrouteBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/static-routes/mroute/batch", request);
    await this.refreshConfig();
    return result;
  }

  /**
   * Create a multicast route
   */
  async createMroute(prefix: string, config: Partial<MulticastRoute>): Promise<VyOSResponse> {
    const operations: StaticRoutesBatchOperation[] = [
      { op: "set_mroute" }
    ];

    // Add next-hops
    if (config.next_hops) {
      for (const nh of config.next_hops) {
        operations.push({ op: "set_mroute_next_hop", value: nh.address });

        if (nh.distance) {
          operations.push({
            op: "set_mroute_next_hop_distance",
            value: `${nh.address},${nh.distance}`
          });
        }

        if (nh.disable) {
          operations.push({ op: "set_mroute_next_hop_disable", value: nh.address });
        }
      }
    }

    // Add interfaces
    if (config.interfaces) {
      for (const iface of config.interfaces) {
        operations.push({ op: "set_mroute_interface", value: iface.interface });

        if (iface.distance) {
          operations.push({
            op: "set_mroute_interface_distance",
            value: `${iface.interface},${iface.distance}`
          });
        }

        if (iface.disable) {
          operations.push({ op: "set_mroute_interface_disable", value: iface.interface });
        }
      }
    }

    return this.mrouteBatchConfigure({ prefix, operations });
  }

  /**
   * Delete a multicast route
   */
  async deleteMroute(prefix: string): Promise<VyOSResponse> {
    return this.mrouteBatchConfigure({
      prefix,
      operations: [{ op: "delete_mroute" }]
    });
  }

  // ==========================================================================
  // Neighbor Proxy Operations
  // ==========================================================================

  /**
   * Execute neighbor proxy batch operations
   */
  async neighborProxyBatchConfigure(request: NeighborProxyBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/static-routes/neighbor-proxy/batch", request);
    await this.refreshConfig();
    return result;
  }

  /**
   * Create a neighbor proxy ARP entry
   */
  async createNeighborProxyArp(ipAddress: string, interfaces: string[]): Promise<VyOSResponse> {
    const operations: StaticRoutesBatchOperation[] = [];

    for (const iface of interfaces) {
      operations.push({ op: "set_neighbor_proxy_arp", value: iface });
    }

    return this.neighborProxyBatchConfigure({
      address: ipAddress,
      proxy_type: "arp",
      operations
    });
  }

  /**
   * Delete a neighbor proxy ARP entry
   */
  async deleteNeighborProxyArp(ipAddress: string): Promise<VyOSResponse> {
    return this.neighborProxyBatchConfigure({
      address: ipAddress,
      proxy_type: "arp",
      operations: [{ op: "delete_neighbor_proxy_arp" }]
    });
  }

  /**
   * Create a neighbor proxy ND (IPv6) entry
   */
  async createNeighborProxyNd(ipv6Address: string, interfaces: string[]): Promise<VyOSResponse> {
    const operations: StaticRoutesBatchOperation[] = [];

    for (const iface of interfaces) {
      operations.push({ op: "set_neighbor_proxy_nd", value: iface });
    }

    return this.neighborProxyBatchConfigure({
      address: ipv6Address,
      proxy_type: "nd",
      operations
    });
  }

  /**
   * Delete a neighbor proxy ND entry
   */
  async deleteNeighborProxyNd(ipv6Address: string): Promise<VyOSResponse> {
    return this.neighborProxyBatchConfigure({
      address: ipv6Address,
      proxy_type: "nd",
      operations: [{ op: "delete_neighbor_proxy_nd" }]
    });
  }

  // ==========================================================================
  // Routing Table Operations
  // ==========================================================================

  /**
   * Execute routing table batch operations
   */
  async tableBatchConfigure(request: RoutingTableBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/static-routes/table/batch", request);
    await this.refreshConfig();
    return result;
  }

  /**
   * Create a routing table
   */
  async createRoutingTable(tableId: number, description?: string): Promise<VyOSResponse> {
    const operations: StaticRoutesBatchOperation[] = [
      { op: "set_table" }
    ];

    if (description) {
      operations.push({ op: "set_table_description", value: description });
    }

    return this.tableBatchConfigure({
      table_id: tableId,
      operations
    });
  }

  /**
   * Delete a routing table
   */
  async deleteRoutingTable(tableId: number): Promise<VyOSResponse> {
    return this.tableBatchConfigure({
      table_id: tableId,
      operations: [{ op: "delete_table" }]
    });
  }

  /**
   * Update routing table description
   */
  async updateRoutingTableDescription(tableId: number, description: string): Promise<VyOSResponse> {
    return this.tableBatchConfigure({
      table_id: tableId,
      operations: [{ op: "set_table_description", value: description }]
    });
  }

  // ==========================================================================
  // Table Route Operations
  // ==========================================================================

  /**
   * Execute table route batch operations
   */
  async tableRouteBatchConfigure(request: TableRouteBatchRequest): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/static-routes/table/route/batch", request);
    await this.refreshConfig();
    return result;
  }

  /**
   * Create a route in a routing table
   */
  async createTableRoute(
    tableId: number,
    destination: string,
    routeType: "ipv4" | "ipv6",
    config: Partial<StaticRoute>
  ): Promise<VyOSResponse> {
    const operations: StaticRoutesBatchOperation[] = [];
    const prefix = routeType === "ipv4" ? "set_table_ipv4_route" : "set_table_ipv6_route";

    // Create the route
    operations.push({ op: prefix });

    // Add description
    if (config.description) {
      operations.push({
        op: `${prefix}_description`,
        value: config.description,
      });
    }

    // Add next-hops
    if (config.next_hops && config.next_hops.length > 0) {
      for (const nh of config.next_hops) {
        operations.push({
          op: `${prefix}_next_hop`,
          value: nh.address,
        });

        if (nh.distance) {
          operations.push({
            op: `${prefix}_next_hop_distance`,
            value: `${nh.address},${nh.distance}`,
          });
        }

        if (nh.disable) {
          operations.push({
            op: `${prefix}_next_hop_disable`,
            value: nh.address,
          });
        }
      }
    }

    // Add interface routes
    if (config.interfaces && config.interfaces.length > 0) {
      for (const iface of config.interfaces) {
        operations.push({
          op: `${prefix}_interface`,
          value: iface.interface,
        });

        if (iface.distance) {
          operations.push({
            op: `${prefix}_interface_distance`,
            value: `${iface.interface},${iface.distance}`,
          });
        }

        if (iface.disable) {
          operations.push({
            op: `${prefix}_interface_disable`,
            value: iface.interface,
          });
        }
      }
    }

    // Add blackhole
    if (config.blackhole) {
      operations.push({ op: `${prefix}_blackhole` });

      if (config.blackhole_distance) {
        operations.push({
          op: `${prefix}_blackhole_distance`,
          value: config.blackhole_distance.toString(),
        });
      }

      if (config.blackhole_tag) {
        operations.push({
          op: `${prefix}_blackhole_tag`,
          value: config.blackhole_tag.toString(),
        });
      }
    }

    // Add reject
    if (config.reject) {
      operations.push({ op: `${prefix}_reject` });

      if (config.reject_distance) {
        operations.push({
          op: `${prefix}_reject_distance`,
          value: config.reject_distance.toString(),
        });
      }
    }

    return this.tableRouteBatchConfigure({
      table_id: tableId,
      destination,
      route_type: routeType,
      operations,
    });
  }

  /**
   * Delete a route from a routing table
   */
  async deleteTableRoute(
    tableId: number,
    destination: string,
    routeType: "ipv4" | "ipv6"
  ): Promise<VyOSResponse> {
    const op = routeType === "ipv4" ? "delete_table_ipv4_route" : "delete_table_ipv6_route";
    return this.tableRouteBatchConfigure({
      table_id: tableId,
      destination,
      route_type: routeType,
      operations: [{ op }],
    });
  }
}

export const staticRoutesService = new StaticRoutesService();
