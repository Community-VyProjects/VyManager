/**
 * OSPF Protocol API Service
 * Handles all OSPF (Open Shortest Path First) related API operations
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface OSPFAreaRange {
  prefix: string;
  cost?: string;
  not_advertise: boolean;
}

export interface OSPFArea {
  id: string;
  type: string;
  networks: string[];
  ranges: OSPFAreaRange[];
  virtual_links: string[];
}

export interface OSPFAuthentication {
  type: string;
  key_id?: string[];
}

export interface OSPFInterface {
  name: string;
  area?: string;
  cost?: string;
  priority?: string;
  hello_interval?: string;
  dead_interval?: string;
  retransmit_interval?: string;
  transmit_delay?: string;
  network?: string;
  passive: boolean;
  mtu_ignore: boolean;
  bfd: boolean;
  authentication?: OSPFAuthentication;
}

export interface OSPFRedistribution {
  protocol: string;
  route_map?: string;
  metric?: string;
  metric_type?: string;
}

export interface OSPFPassiveInterfaces {
  default: boolean;
  interfaces: string[];
}

export interface OSPFDefaultInformation {
  originate: boolean;
  always: boolean;
  metric?: string;
  metric_type?: string;
  route_map?: string;
}

export interface OSPFConfig {
  configured: boolean;
  router_id?: string;
  abr_type?: string;
  rfc1583_compatibility: boolean;
  opaque_lsa: boolean;
  areas: OSPFArea[];
  interfaces: OSPFInterface[];
  redistributions: OSPFRedistribution[];
  passive_interfaces: OSPFPassiveInterfaces;
  default_information: OSPFDefaultInformation;
}

export interface OSPFCapabilities {
  area_types: { value: string; label: string; description: string }[];
  network_types: { value: string; label: string; description: string }[];
  redistribute_protocols: { value: string; label: string; description: string }[];
  default_timers: { hello_interval: number; dead_interval: number; retransmit_interval: number };
  version: string;
}

export interface OSPFOperation {
  op: string;
  value?: string | number;
  area?: string;
  network?: string;
  prefix?: string;
  interface?: string;
  protocol?: string;
  router_id?: string;
  hello?: number;
  dead?: number;
  retransmit?: number;
  transmit_delay?: number;
  no_summary?: boolean;
  default_cost?: number;
  not_advertise?: boolean;
  cost?: number;
  route_map?: string;
  metric?: number;
  metric_type?: number;
  always?: boolean;
  delay?: number;
  initial_holdtime?: number;
  max_holdtime?: number;
}

export interface OSPFBatchRequest {
  operations: OSPFOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class OSPFService {
  /**
   * Get OSPF configuration
   */
  async getConfig(): Promise<OSPFConfig> {
    return apiClient.get<OSPFConfig>("/vyos/ospf/config");
  }

  /**
   * Get OSPF capabilities for the connected VyOS version
   */
  async getCapabilities(): Promise<OSPFCapabilities> {
    return apiClient.get<OSPFCapabilities>("/vyos/ospf/capabilities");
  }

  /**
   * Get OSPF neighbor states
   */
  async getNeighbors(): Promise<{ success: boolean; data: Record<string, unknown> }> {
    return apiClient.get("/vyos/ospf/neighbors");
  }

  /**
   * Get OSPF database summary
   */
  async getDatabase(): Promise<{ success: boolean; data: Record<string, unknown> }> {
    return apiClient.get("/vyos/ospf/database");
  }

  /**
   * Configure OSPF using batch operations
   */
  async configureBatch(request: OSPFBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/ospf/batch", request);
  }

  // =========================================================================
  // Helper methods for common operations
  // =========================================================================

  /**
   * Initialize OSPF with router ID
   */
  async initializeOSPF(routerId: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_router_id", value: routerId }],
    });
  }

  /**
   * Add network to an area
   */
  async addAreaNetwork(area: string, network: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "add_area_network", area, network }],
    });
  }

  /**
   * Remove network from an area
   */
  async removeAreaNetwork(area: string, network: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_area_network", area, network }],
    });
  }

  /**
   * Set area type
   */
  async setAreaType(
    area: string,
    type: "stub" | "nssa" | "normal",
    options?: { noSummary?: boolean; defaultCost?: number }
  ): Promise<VyOSResponse> {
    const op =
      type === "stub"
        ? "set_area_type_stub"
        : type === "nssa"
        ? "set_area_type_nssa"
        : "set_area_type_normal";

    return this.configureBatch({
      operations: [{
        op,
        area,
        no_summary: options?.noSummary,
        default_cost: options?.defaultCost,
      }],
    });
  }

  /**
   * Add interface to OSPF
   */
  async addInterface(
    interfaceName: string,
    area?: string,
    options?: {
      cost?: number;
      priority?: number;
      networkType?: string;
      passive?: boolean;
    }
  ): Promise<VyOSResponse> {
    const operations: OSPFOperation[] = [
      { op: "add_interface", interface: interfaceName, area },
    ];

    if (options?.cost !== undefined) {
      operations.push({ op: "set_interface_cost", interface: interfaceName, value: options.cost });
    }

    if (options?.priority !== undefined) {
      operations.push({ op: "set_interface_priority", interface: interfaceName, value: options.priority });
    }

    if (options?.networkType) {
      operations.push({ op: "set_interface_network", interface: interfaceName, value: options.networkType });
    }

    if (options?.passive) {
      operations.push({ op: "enable_interface_passive", interface: interfaceName });
    }

    return this.configureBatch({ operations });
  }

  /**
   * Remove interface from OSPF
   */
  async removeInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_interface", interface: interfaceName }],
    });
  }

  /**
   * Set interface cost
   */
  async setInterfaceCost(interfaceName: string, cost: number): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "set_interface_cost", interface: interfaceName, value: cost }],
    });
  }

  /**
   * Set interface timers
   */
  async setInterfaceTimers(
    interfaceName: string,
    options: {
      helloInterval?: number;
      deadInterval?: number;
      retransmitInterval?: number;
      transmitDelay?: number;
    }
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{
        op: "set_interface_timers",
        interface: interfaceName,
        hello: options.helloInterval,
        dead: options.deadInterval,
        retransmit: options.retransmitInterval,
        transmit_delay: options.transmitDelay,
      }],
    });
  }

  /**
   * Enable interface passive mode
   */
  async enableInterfacePassive(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "enable_interface_passive", interface: interfaceName }],
    });
  }

  /**
   * Disable interface passive mode
   */
  async disableInterfacePassive(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "disable_interface_passive", interface: interfaceName }],
    });
  }

  /**
   * Enable BFD for interface
   */
  async enableInterfaceBFD(interfaceName: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "enable_interface_bfd", interface: interfaceName }],
    });
  }

  /**
   * Add redistribution
   */
  async addRedistribution(
    protocol: string,
    options?: {
      routeMap?: string;
      metric?: number;
      metricType?: number;
    }
  ): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{
        op: "add_redistribute",
        protocol,
        route_map: options?.routeMap,
        metric: options?.metric,
        metric_type: options?.metricType,
      }],
    });
  }

  /**
   * Remove redistribution
   */
  async removeRedistribution(protocol: string): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_redistribute", protocol }],
    });
  }

  /**
   * Enable default information originate
   */
  async enableDefaultOriginate(options?: {
    always?: boolean;
    metric?: number;
    metricType?: number;
    routeMap?: string;
  }): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{
        op: "enable_default_originate",
        always: options?.always,
        metric: options?.metric,
        metric_type: options?.metricType,
        route_map: options?.routeMap,
      }],
    });
  }

  /**
   * Disable default information originate
   */
  async disableDefaultOriginate(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "disable_default_originate" }],
    });
  }

  /**
   * Delete entire OSPF configuration
   */
  async deleteOSPF(): Promise<VyOSResponse> {
    return this.configureBatch({
      operations: [{ op: "delete_ospf" }],
    });
  }
}

export const ospfService = new OSPFService();
