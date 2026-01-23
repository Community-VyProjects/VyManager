/**
 * IS-IS Protocol API Service
 * Handles all IS-IS (Intermediate System to Intermediate System) related API operations
 */

import { apiClient } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface ISISInterface {
  name: string;
  passive: boolean;
  circuit_type?: string | null;  // level-1, level-2, level-1-2
  metric?: number | null;
  priority?: number | null;
  hello_interval?: number | null;
  hello_multiplier?: number | null;
  network?: string | null;  // point-to-point
  bfd: boolean;
}

export interface ISISRedistribution {
  level: string;
  protocol: string;
  route_map?: string | null;
  metric?: number | null;
}

export interface ISISSPFDelay {
  init_delay?: number | null;
  short_delay?: number | null;
  long_delay?: number | null;
  holddown?: number | null;
  time_to_learn?: number | null;
}

export interface ISISConfig {
  configured: boolean;
  net: string[];
  is_type?: string | null;
  interfaces: ISISInterface[];
  redistributions: ISISRedistribution[];
  dynamic_hostname: boolean;
  metric_style?: string | null;
  lsp_mtu?: number | null;
  lsp_gen_interval?: number | null;
  lsp_refresh_interval?: number | null;
  max_lsp_lifetime?: number | null;
  set_attached_bit: boolean;
  set_overload_bit: boolean;
  purge_originator: boolean;
  spf_delay?: ISISSPFDelay | null;
}

export interface ISISCapabilities {
  is_types: { value: string; label: string; description: string }[];
  circuit_types: { value: string; label: string }[];
  metric_styles: { value: string; label: string; description: string }[];
  redistribute_protocols: { value: string; label: string }[];
  levels: { value: string; label: string }[];
}

export interface ApiResponse {
  success: boolean;
  message: string;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class ISISService {
  /**
   * Get IS-IS configuration
   */
  async getConfig(): Promise<ISISConfig> {
    return apiClient.get<ISISConfig>("/vyos/protocols/isis/config");
  }

  /**
   * Get IS-IS capabilities
   */
  getCapabilities(): ISISCapabilities {
    return {
      is_types: [
        { value: "level-1", label: "Level 1", description: "Intra-area routing" },
        { value: "level-2", label: "Level 2", description: "Inter-area routing" },
        { value: "level-1-2", label: "Level 1-2", description: "Both intra and inter-area" },
      ],
      circuit_types: [
        { value: "level-1", label: "Level 1" },
        { value: "level-2", label: "Level 2" },
        { value: "level-1-2", label: "Level 1-2" },
      ],
      metric_styles: [
        { value: "narrow", label: "Narrow", description: "Original 6-bit metric" },
        { value: "wide", label: "Wide", description: "Extended 24-bit metric" },
        { value: "transition", label: "Transition", description: "Support both narrow and wide" },
      ],
      redistribute_protocols: [
        { value: "bgp", label: "BGP" },
        { value: "connected", label: "Connected" },
        { value: "kernel", label: "Kernel" },
        { value: "ospf", label: "OSPF" },
        { value: "static", label: "Static" },
      ],
      levels: [
        { value: "level-1", label: "Level 1" },
        { value: "level-2", label: "Level 2" },
      ],
    };
  }

  /**
   * Enable IS-IS
   */
  async enable(options: {
    net: string;
    isType?: string;
    dynamicHostname?: boolean;
    metricStyle?: string;
  }): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/isis/enable", {
      net: options.net,
      is_type: options.isType,
      dynamic_hostname: options.dynamicHostname ?? false,
      metric_style: options.metricStyle,
    });
  }

  /**
   * Disable IS-IS
   */
  async disable(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/isis/disable");
  }

  // =========================================================================
  // NET operations
  // =========================================================================

  async addNET(net: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/isis/net", { net });
  }

  async removeNET(net: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/isis/net/${encodeURIComponent(net)}`);
  }

  // =========================================================================
  // Interface operations
  // =========================================================================

  async configureInterface(
    interfaceName: string,
    options?: {
      passive?: boolean;
      circuitType?: string;
      metric?: number;
      priority?: number;
      helloInterval?: number;
      helloMultiplier?: number;
      network?: string;
      bfd?: boolean;
    }
  ): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/isis/interface", {
      interface: interfaceName,
      passive: options?.passive ?? false,
      circuit_type: options?.circuitType,
      metric: options?.metric,
      priority: options?.priority,
      hello_interval: options?.helloInterval,
      hello_multiplier: options?.helloMultiplier,
      network: options?.network,
      bfd: options?.bfd ?? false,
    });
  }

  async removeInterface(interfaceName: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/isis/interface/${encodeURIComponent(interfaceName)}`);
  }

  // =========================================================================
  // Redistribution operations
  // =========================================================================

  async addRedistribution(
    level: string,
    protocol: string,
    options?: { routeMap?: string; metric?: number }
  ): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/isis/redistribute", {
      level,
      protocol,
      route_map: options?.routeMap,
      metric: options?.metric,
    });
  }

  async removeRedistribution(level: string, protocol: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/vyos/protocols/isis/redistribute/${encodeURIComponent(level)}/${encodeURIComponent(protocol)}`);
  }

  // =========================================================================
  // IS Type operations
  // =========================================================================

  async setISType(isType: string): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>(`/vyos/protocols/isis/is-type/${encodeURIComponent(isType)}`, {});
  }

  // =========================================================================
  // Feature toggles
  // =========================================================================

  async enableDynamicHostname(): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/isis/dynamic-hostname", {});
  }

  async disableDynamicHostname(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/isis/dynamic-hostname");
  }

  async enableOverloadBit(): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>("/vyos/protocols/isis/set-overload-bit", {});
  }

  async disableOverloadBit(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/isis/set-overload-bit");
  }

  // =========================================================================
  // LSP operations
  // =========================================================================

  async setLSPParameters(params: {
    lspMtu?: number;
    lspGenInterval?: number;
    lspRefreshInterval?: number;
    maxLspLifetime?: number;
  }): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>("/vyos/protocols/isis/lsp-parameters", {
      lsp_mtu: params.lspMtu,
      lsp_gen_interval: params.lspGenInterval,
      lsp_refresh_interval: params.lspRefreshInterval,
      max_lsp_lifetime: params.maxLspLifetime,
    });
  }

  // =========================================================================
  // SPF Delay operations
  // =========================================================================

  async setSPFDelay(params: {
    initDelay?: number;
    shortDelay?: number;
    longDelay?: number;
    holddown?: number;
    timeToLearn?: number;
  }): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>("/vyos/protocols/isis/spf-delay", {
      init_delay: params.initDelay,
      short_delay: params.shortDelay,
      long_delay: params.longDelay,
      holddown: params.holddown,
      time_to_learn: params.timeToLearn,
    });
  }

  async resetSPFDelay(): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>("/vyos/protocols/isis/spf-delay");
  }
}

export const isisService = new ISISService();
