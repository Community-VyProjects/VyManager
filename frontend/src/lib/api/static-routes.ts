import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface NextHop {
  address: string;
  distance?: number | null;
  disable: boolean;
  vrf?: string | null;
  bfd_enable: boolean;
  bfd_profile?: string | null;
  segments?: string | null;  // SRv6 segments (IPv6 only)
}

export interface InterfaceRoute {
  interface: string;
  distance?: number | null;
  disable: boolean;
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
  dhcp_interface?: string | null;
  route_type: "ipv4" | "ipv6";
}

export interface RoutingTable {
  table_id: number;
  description?: string | null;
  ipv4_routes: StaticRoute[];
  ipv6_routes: StaticRoute[];
}

export interface StaticRoutesConfig {
  ipv4_routes: StaticRoute[];
  ipv6_routes: StaticRoute[];
  routing_tables: RoutingTable[];
  route_map?: string | null;
}

export interface StaticRoutesCapabilities {
  version: string;
  features: {
    ipv4_routes: { supported: boolean; description: string };
    ipv6_routes: { supported: boolean; description: string };
    routing_tables: { supported: boolean; description: string };
    blackhole_routes: { supported: boolean; description: string };
    interface_routes: { supported: boolean; description: string };
    next_hop_bfd: { supported: boolean; description: string };
    next_hop_vrf: { supported: boolean; description: string };
    multicast_routes_1_4: { supported: boolean; description: string };
    mroute_1_5: { supported: boolean; description: string };
    dhcp_interface_1_4: { supported: boolean; description: string };
    route_map: { supported: boolean; description: string };
    arp: { supported: boolean; description: string };
    neighbor_proxy: { supported: boolean; description: string };
  };
  version_notes: {
    multicast_command: string;
    bfd_available: boolean;
    vrf_available: boolean;
  };
  device_name?: string;
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

    // DHCP interface (1.4 only, IPv4 only)
    if (config.dhcp_interface !== undefined && route_type === "ipv4") {
      if (config.dhcp_interface) {
        operations.push({
          op: "set_ipv4_route_dhcp_interface",
          value: config.dhcp_interface
        });
      } else {
        operations.push({ op: "delete_ipv4_route_dhcp_interface" });
      }
    }

    return this.batchConfigure({
      destination,
      route_type,
      operations
    });
  }
}

export const staticRoutesService = new StaticRoutesService();
