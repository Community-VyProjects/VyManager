import { apiClient } from "./client";
import type { ApiError } from "../types/api";
import {
  ospfv3AreaOps,
  ospfv3DefaultInformationOps,
  ospfv3DeleteOps,
  ospfv3DistanceOps,
  ospfv3GracefulRestartOps,
  ospfv3InterfaceOps,
  ospfv3ParametersOps,
  ospfv3RedistributeOps,
  type Ospfv3ParametersDraft,
} from "./ospfv3-save-ops";

// ============================================================================
// TypeScript Interfaces (matching backend Pydantic models)
// ============================================================================

export interface Ospfv3Parameters {
  router_id?: string | null;
}

export interface Ospfv3AreaRange {
  prefix: string;
  advertise: boolean;
  not_advertise: boolean;
}

export interface Ospfv3Area {
  area_id: string;
  /** stub or nssa; null is a normal area (no area-type node). */
  area_type?: string | null;
  area_type_no_summary: boolean;
  nssa_default_information_originate: boolean;
  ranges: Ospfv3AreaRange[];
  export_list?: string | null;
  import_list?: string | null;
}

export interface Ospfv3Interface {
  name: string;
  area?: string | null;
  cost?: number | null;
  priority?: number | null;
  hello_interval?: number | null;
  dead_interval?: number | null;
  retransmit_interval?: number | null;
  transmit_delay?: number | null;
  network?: string | null;
  passive: boolean;
  bfd: boolean;
  bfd_profile?: string | null;
  mtu_ignore: boolean;
  ifmtu?: number | null;
  instance_id?: number | null;
}

export interface Ospfv3Redistribute {
  protocol: string;
  metric?: string | null;
  metric_type?: string | null;
  route_map?: string | null;
}

export interface Ospfv3DefaultInformation {
  enabled: boolean;
  always: boolean;
  metric?: number | null;
  metric_type?: number | null;
  route_map?: string | null;
}

export interface Ospfv3DistanceOspfv3 {
  external?: number | null;
  inter_area?: number | null;
  intra_area?: number | null;
}

export interface Ospfv3Distance {
  global_value?: number | null;
  ospfv3: Ospfv3DistanceOspfv3;
}

export interface Ospfv3GracefulRestartHelper {
  enable: boolean;
  router_ids: string[];
  lsa_check_disable: boolean;
  planned_only: boolean;
  supported_grace_time?: number | null;
}

export interface Ospfv3GracefulRestart {
  enabled: boolean;
  grace_period?: number | null;
  helper: Ospfv3GracefulRestartHelper;
}

export interface Ospfv3Config {
  configured: boolean;
  parameters: Ospfv3Parameters;
  areas: Ospfv3Area[];
  interfaces: Ospfv3Interface[];
  redistribute: Ospfv3Redistribute[];
  default_information: Ospfv3DefaultInformation;
  distance: Ospfv3Distance;
  graceful_restart: Ospfv3GracefulRestart;
  auto_cost_reference_bandwidth?: number | null;
  log_adjacency_changes?: boolean | null;
  log_adjacency_changes_detail: boolean;
}

/** Keys of the builder RANGES table (lab syntax bounds). */
export type Ospfv3RangeKey =
  | "area_id"
  | "reference_bandwidth"
  | "metric"
  | "metric_type"
  | "distance"
  | "grace_period"
  | "supported_grace_time"
  | "cost"
  | "dead_interval"
  | "hello_interval"
  | "ifmtu"
  | "retransmit_interval"
  | "transmit_delay"
  | "instance_id"
  | "priority";

interface Ospfv3Feature {
  supported: boolean;
  description: string;
}

export interface Ospfv3Capabilities {
  version: string;
  features: {
    areas: Ospfv3Feature & { area_types: string[] };
    interfaces: Ospfv3Feature & { network_types: string[] };
    redistribute: Ospfv3Feature & { protocols: string[]; metric_types: string[] };
    default_information: Ospfv3Feature & { metric_types: string[] };
    graceful_restart: Ospfv3Feature;
    distance: Ospfv3Feature;
    auto_cost: Ospfv3Feature;
  };
  ranges: Partial<Record<Ospfv3RangeKey, { min: number; max: number }>>;
  instance_name?: string;
  instance_id?: string;
}

export interface Ospfv3BatchOperation {
  op: string;
  value?: string;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

const NO_CHANGES: VyOSResponse = { success: true, data: null };

// ============================================================================
// API Service. Op building lives in ospfv3-save-ops.ts; this only posts.
// ============================================================================

class Ospfv3Service {
  async getCapabilities(): Promise<Ospfv3Capabilities> {
    return apiClient.get<Ospfv3Capabilities>("/vyos/ospfv3/capabilities");
  }

  async getConfig(refresh = false): Promise<Ospfv3Config> {
    return apiClient.get<Ospfv3Config>("/vyos/ospfv3/config", {
      refresh: refresh.toString(),
    });
  }

  /** POST one batch. An unchanged form sends nothing. */
  async batchConfigure(operations: Ospfv3BatchOperation[]): Promise<VyOSResponse> {
    if (operations.length === 0) return NO_CHANGES;
    const result = await apiClient.post<VyOSResponse>("/vyos/ospfv3/batch", { operations });
    if (!result.success) {
      const error: ApiError = { message: result.error || "" };
      throw error;
    }
    return result;
  }

  async createArea(area: Ospfv3Area): Promise<VyOSResponse> {
    return this.batchConfigure(ospfv3AreaOps(null, area));
  }

  async updateArea(original: Ospfv3Area, updated: Ospfv3Area): Promise<VyOSResponse> {
    return this.batchConfigure(ospfv3AreaOps(original, updated));
  }

  async deleteArea(areaId: string): Promise<VyOSResponse> {
    return this.batchConfigure(ospfv3DeleteOps.area(areaId));
  }

  async createInterface(iface: Ospfv3Interface): Promise<VyOSResponse> {
    return this.batchConfigure(ospfv3InterfaceOps(null, iface));
  }

  async updateInterface(original: Ospfv3Interface, updated: Ospfv3Interface): Promise<VyOSResponse> {
    return this.batchConfigure(ospfv3InterfaceOps(original, updated));
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batchConfigure(ospfv3DeleteOps.interface(name));
  }

  async addRedistribute(entry: Ospfv3Redistribute): Promise<VyOSResponse> {
    return this.batchConfigure(ospfv3RedistributeOps(null, entry));
  }

  async updateRedistribute(original: Ospfv3Redistribute, updated: Ospfv3Redistribute): Promise<VyOSResponse> {
    return this.batchConfigure(ospfv3RedistributeOps(original, updated));
  }

  async removeRedistribute(protocol: string): Promise<VyOSResponse> {
    return this.batchConfigure(ospfv3DeleteOps.redistribute(protocol));
  }

  async updateParameters(original: Ospfv3Config, updated: Ospfv3ParametersDraft): Promise<VyOSResponse> {
    return this.batchConfigure(ospfv3ParametersOps(original, updated));
  }

  async updateDefaultInformation(
    original: Ospfv3DefaultInformation,
    updated: Ospfv3DefaultInformation,
  ): Promise<VyOSResponse> {
    return this.batchConfigure(ospfv3DefaultInformationOps(original, updated));
  }

  /** Distance and graceful restart in one commit. */
  async updateAdvanced(
    original: Ospfv3Config,
    updated: { distance: Ospfv3Distance; gracefulRestart: Ospfv3GracefulRestart },
  ): Promise<VyOSResponse> {
    return this.batchConfigure([
      ...ospfv3DistanceOps(original.distance, updated.distance),
      ...ospfv3GracefulRestartOps(original.graceful_restart, updated.gracefulRestart),
    ]);
  }

  async deleteOspfv3(): Promise<VyOSResponse> {
    return this.batchConfigure(ospfv3DeleteOps.all());
  }
}

export const ospfv3Service = new Ospfv3Service();
